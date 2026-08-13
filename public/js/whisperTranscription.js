'use strict';

/**
 * MiroTalk P2P - Whisper (server-side) live transcription
 * =======================================================
 *
 * Optional live speech-to-text using an OpenAI-compatible Whisper endpoint.
 *
 * ARCHITECTURE (why Whisper is intentionally OUTSIDE the WebRTC media path):
 *
 *   Microphone
 *     ├──> existing WebRTC RTCPeerConnection ──> remote peer   (untouched, low latency)
 *     │
 *     └──> short audio segments ──> signaling server ──> Whisper API ──> text
 *                                                                   └──> WebRTC DataChannel ──> peers
 *
 * The microphone audio NEVER passes through Whisper before reaching the remote
 * peer. We only attach a *secondary* MediaRecorder to a copy of the existing
 * local microphone stream. The WebRTC audio track is never intercepted,
 * replaced, delayed or modified, so call latency does not depend on Whisper.
 *
 * The resulting transcript is:
 *   - displayed locally, and
 *   - (optionally) sent to the other peer(s) over the SAME WebRTC DataChannel
 *     already used by the Web Speech API captions (`type: 'speech'`), so we do
 *     not introduce a second messaging architecture.
 *
 * This module reuses globals defined in client.js (signalingSocket, roomId,
 * myPeerName, myPeerId, myPeerAvatar, localAudioMediaStream, sendToDataChannel,
 * handleSpeechTranscript, transcriptSendToAll, userLog, msgPopup, setColor,
 * elemDisplay, speechRecognition* elements). Scripts share global scope.
 */

// ---- Configuration (populated from server `serverInfo` on join) ----
let whisperServerEnabled = false; // does the server allow Whisper transcription?
let whisperSegmentMs = 3000; // length of each recorded audio segment (from config)

// ---- User toggle + runtime state ----
let whisperMode = false; // user chose Whisper instead of the Web Speech API
let whisperActive = false; // capture currently running
let whisperBusy = false; // a transcription request is in flight (backpressure)
let whisperStream = null; // secondary MediaStream used only for recording
let whisperRecorder = null; // current MediaRecorder instance
let whisperTimer = null; // segment stop timer
let whisperAudioContext = null; // for silence detection (VAD)
let whisperAnalyser = null;
let whisperLastErrorAt = 0; // throttle repeated error toasts
const whisperSilenceThreshold = 8; // 0-128 peak on the time-domain waveform; below this = silence

/**
 * Apply Whisper capability + segment length received from the server.
 * @param {object} cfg { enabled, segmentSeconds }
 */
function setWhisperServerConfig(cfg) {
    if (!cfg) return;
    whisperServerEnabled = !!cfg.enabled;
    if (cfg.segmentSeconds) whisperSegmentMs = Math.max(1000, cfg.segmentSeconds * 1000);
    console.log('Whisper server config', { enabled: whisperServerEnabled, segmentMs: whisperSegmentMs });
}

/**
 * Is server-side Whisper transcription available in this room?
 */
function isWhisperAvailable() {
    return whisperServerEnabled === true;
}

/**
 * Toggle between Web Speech API mode and server-side Whisper mode.
 * Cannot switch while a transcription is running.
 * @param {boolean} enabled
 * @returns {boolean} the resulting whisperMode value
 */
function setWhisperMode(enabled) {
    if (typeof recognitionRunning !== 'undefined' && recognitionRunning) {
        userLog('warning', 'Please stop the current transcription before changing mode', 'top-end');
        return whisperMode;
    }
    if (whisperActive) {
        userLog('warning', 'Please stop the current transcription before changing mode', 'top-end');
        return whisperMode;
    }
    whisperMode = enabled && isWhisperAvailable();
    updateTranscriptionSelectsVisibility();
    return whisperMode;
}

/**
 * The language/dialect selectors only configure the browser Web Speech API.
 * In Whisper mode (or when Web Speech is unavailable) they are irrelevant and
 * only crowd the footer, pushing the play/stop buttons out of place — so hide
 * them and keep just the transcription controls.
 */
function updateTranscriptionSelectsVisibility() {
    const webSpeechSupported = typeof speechRecognition !== 'undefined' && !!speechRecognition;
    const hide = whisperMode || !webSpeechSupported;
    const langEl = typeof recognitionLanguage !== 'undefined' ? recognitionLanguage : null;
    const dialectEl = typeof recognitionDialect !== 'undefined' ? recognitionDialect : null;
    if (langEl) langEl.classList.toggle('hidden', hide);
    if (dialectEl) dialectEl.classList.toggle('hidden', hide);
    // In Whisper mode the selects are hidden, so align the play/stop button right.
    if (typeof captionFooter !== 'undefined' && captionFooter) {
        captionFooter.classList.toggle('caption-inputarea-whisper', whisperMode);
    }
}

/**
 * Start Whisper capture. Uses the EXISTING local microphone stream as a
 * secondary input (never intercepts the WebRTC track).
 */
function startWhisperTranscription() {
    if (!isWhisperAvailable()) {
        return userLog('warning', 'Whisper transcription is not enabled on this server', 'top-end');
    }
    if (whisperActive) return;

    // Prefer the microphone stream already created for the WebRTC call. Sharing
    // the same track means muting the mic (track.enabled = false) also stops
    // transcription capture, which is the expected privacy behavior.
    const reuseTracks =
        typeof localAudioMediaStream !== 'undefined' &&
        localAudioMediaStream &&
        localAudioMediaStream.getAudioTracks().length > 0;

    const streamPromise = reuseTracks
        ? Promise.resolve(new MediaStream(localAudioMediaStream.getAudioTracks()))
        : navigator.mediaDevices.getUserMedia({ audio: true });

    streamPromise
        .then((stream) => {
            whisperStream = stream;
            whisperActive = true;
            whisperSelectDisabled(true);
            whisperSetRunningUI(true);
            setupWhisperAnalyser(stream);
            userLog('toast', 'Whisper transcription started');
            recordWhisperSegment();
        })
        .catch((error) => {
            whisperActive = false;
            userLog('error', `Whisper microphone error: ${error.message}`, 'top-end', 6000);
            console.error('Whisper getUserMedia error', error);
        });
}

/**
 * Stop Whisper capture and release all audio/recording resources.
 * The WebRTC connection is left completely untouched.
 */
function stopWhisperTranscription() {
    whisperActive = false;
    if (whisperTimer) {
        clearTimeout(whisperTimer);
        whisperTimer = null;
    }
    try {
        if (whisperRecorder && whisperRecorder.state !== 'inactive') {
            whisperRecorder.stop();
        }
    } catch (error) {
        console.warn('Whisper recorder stop error', error);
    }
    whisperRecorder = null;

    // Only stop the tracks we own. When we reuse the WebRTC mic tracks we build
    // a wrapper MediaStream; stopping *that* stream's track would also kill the
    // call audio, so we must NOT stop shared tracks. We therefore only stop the
    // stream when it was created by our own getUserMedia call.
    if (whisperStream) {
        const sharedWithCall =
            typeof localAudioMediaStream !== 'undefined' &&
            localAudioMediaStream &&
            whisperStream.getAudioTracks().some((t) => localAudioMediaStream.getAudioTracks().includes(t));
        if (!sharedWithCall) {
            whisperStream.getTracks().forEach((track) => track.stop());
        }
        whisperStream = null;
    }

    if (whisperAudioContext) {
        try {
            whisperAudioContext.close();
        } catch (error) {
            console.warn('Whisper audio context close error', error);
        }
        whisperAudioContext = null;
        whisperAnalyser = null;
    }

    whisperSelectDisabled(false);
    whisperSetRunningUI(false);
    userLog('toast', 'Whisper transcription stopped');
}

/**
 * Set up an AnalyserNode used for lightweight client-side silence detection.
 * Silent segments are never sent to Whisper (saves latency, cost, GPU and
 * avoids hallucinated transcriptions on silence).
 * @param {MediaStream} stream
 */
function setupWhisperAnalyser(stream) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        whisperAudioContext = new AudioContext();
        const source = whisperAudioContext.createMediaStreamSource(stream);
        whisperAnalyser = whisperAudioContext.createAnalyser();
        whisperAnalyser.fftSize = 2048;
        source.connect(whisperAnalyser);
    } catch (error) {
        whisperAnalyser = null;
        console.warn('Whisper analyser setup error', error);
    }
}

/**
 * Peak amplitude (0-128) of the current audio frame; used for silence detection.
 */
function getWhisperPeakLevel() {
    if (!whisperAnalyser) return 128; // no analyser => don't drop anything
    const data = new Uint8Array(whisperAnalyser.fftSize);
    whisperAnalyser.getByteTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i] - 128);
        if (v > peak) peak = v;
    }
    return peak;
}

/**
 * Pick a MediaRecorder MIME type supported by the current browser.
 */
function getWhisperMimeType() {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (const type of candidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
}

/**
 * Record ONE short segment, then (if it contains speech) send it to Whisper and
 * immediately start the next segment. Recording a fresh MediaRecorder per
 * segment produces standalone, independently-decodable audio files.
 *
 * Backlog prevention: we never queue overlapping requests. If a previous
 * request is still in flight when a segment finishes, we drop the new segment
 * rather than causing unbounded latency.
 */
function recordWhisperSegment() {
    if (!whisperActive || !whisperStream) return;

    const mimeType = getWhisperMimeType();
    let recorder;
    try {
        recorder = mimeType ? new MediaRecorder(whisperStream, { mimeType }) : new MediaRecorder(whisperStream);
    } catch (error) {
        stopWhisperTranscription();
        return userLog('error', `Whisper recording not supported: ${error.message}`, 'top-end', 6000);
    }

    whisperRecorder = recorder;
    const effectiveType = recorder.mimeType || mimeType || 'audio/webm';
    const chunks = [];
    let hasSpeech = false;

    recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    // Sample the mic level during the segment; only send if real speech was detected.
    const levelMonitor = setInterval(() => {
        if (getWhisperPeakLevel() > whisperSilenceThreshold) hasSpeech = true;
    }, 150);

    recorder.onstop = () => {
        clearInterval(levelMonitor);
        const blob = new Blob(chunks, { type: effectiveType });
        // Drop silent or tiny segments, skip if a request is already in flight, or the microphone is off.
        if (whisperActive && hasSpeech && blob.size > 1000 && !whisperBusy && myAudioStatus) {
            sendWhisperBlob(blob, effectiveType);
        }
        // Chain the next segment only while still active.
        if (whisperActive) recordWhisperSegment();
    };

    try {
        recorder.start();
    } catch (error) {
        clearInterval(levelMonitor);
        stopWhisperTranscription();
        return userLog('error', `Whisper recording error: ${error.message}`, 'top-end', 6000);
    }

    whisperTimer = setTimeout(() => {
        try {
            if (recorder.state !== 'inactive') recorder.stop();
        } catch (error) {
            console.warn('Whisper segment stop error', error);
        }
    }, whisperSegmentMs);
}

/**
 * Encode a recorded segment as base64 and ask the server to transcribe it.
 * The transcript is displayed locally and (optionally) shared with peers over
 * the existing WebRTC DataChannel. Whisper failures are non-blocking: the call
 * continues normally and the next segment is still attempted.
 * @param {Blob} blob
 * @param {string} mimeType
 */
function sendWhisperBlob(blob, mimeType) {
    whisperBusy = true;
    const reader = new FileReader();

    reader.onerror = () => {
        whisperBusy = false;
    };

    reader.onload = () => {
        // reader.result => "data:audio/webm;base64,AAAA..." keep only the base64 payload.
        const base64 = String(reader.result || '').split(',')[1];
        if (!base64) {
            whisperBusy = false;
            return;
        }

        // Language hint: empty => let the server / Whisper auto-detect.
        const language = '';

        signalingSocket
            .request('getWhisperTranscription', {
                room_id: roomId,
                audio: base64,
                mimeType,
                language,
            })
            .then((res) => {
                const text = res && res.text ? String(res.text).trim() : '';
                const detectedLanguage = (res && res.language) || '';
                if (text) {
                    // Reuse the existing transcript message shape (type: 'speech'),
                    // enriched with language + a translations placeholder so a
                    // translation layer can be added later without a new format.
                    const transcriptionData = {
                        type: 'speech',
                        room_id: roomId,
                        peer_id: typeof myPeerId !== 'undefined' ? myPeerId : undefined,
                        peer_name: myPeerName,
                        peer_avatar: typeof myPeerAvatar !== 'undefined' ? myPeerAvatar : undefined,
                        text_data: text,
                        language: detectedLanguage,
                        translations: {},
                        final: true,
                        time_stamp: new Date(),
                    };
                    // Display locally...
                    handleSpeechTranscript(transcriptionData);
                    // ...and share with peers over the existing DataChannel.
                    if (typeof transcriptSendToAll !== 'undefined' && transcriptSendToAll) {
                        sendToDataChannel(transcriptionData);
                    }
                }
            })
            .catch((err) => {
                // Non-blocking: surface a throttled status, keep the call running.
                const now = Date.now();
                if (now - whisperLastErrorAt > 8000) {
                    whisperLastErrorAt = now;
                    const message = typeof err === 'string' ? err : err && err.message ? err.message : 'Whisper error';
                    userLog('warning', `Transcription unavailable: ${message}`, 'top-end', 4000);
                }
                console.warn('Whisper transcription request failed', err);
            })
            .finally(() => {
                whisperBusy = false;
            });
    };

    reader.readAsDataURL(blob);
}

/**
 * Reflect Whisper capture state in the caption panel UI (mic icon + buttons).
 * @param {boolean} running
 */
function whisperSetRunningUI(running) {
    if (typeof speechRecognitionIcon !== 'undefined' && speechRecognitionIcon) {
        setColor(speechRecognitionIcon, running ? 'lime' : 'white');
    }
    if (typeof speechRecognitionStart !== 'undefined' && speechRecognitionStart) {
        elemDisplay(speechRecognitionStart, !running, 'block');
    }
    if (typeof speechRecognitionStop !== 'undefined' && speechRecognitionStop) {
        elemDisplay(speechRecognitionStop, running, 'block');
    }
}

/**
 * Disable the language/dialect selectors while Whisper is running (mirrors the
 * Web Speech API behavior).
 * @param {boolean} disabled
 */
function whisperSelectDisabled(disabled = false) {
    const langEl = typeof recognitionLanguage !== 'undefined' ? recognitionLanguage : null;
    const dialectEl = typeof recognitionDialect !== 'undefined' ? recognitionDialect : null;
    if (langEl) langEl.disabled = disabled;
    if (dialectEl) dialectEl.disabled = disabled;
}
