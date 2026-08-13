'use strict';

/**
 * Whisper transcription helpers (pure, side-effect free) so the hallucination /
 * silence filtering and payload validation can be unit tested independently of
 * the Socket.IO server.
 *
 * Whisper is used ONLY as an asynchronous side-channel; none of this code sits
 * in the WebRTC media path.
 */

// Common phrases Whisper hallucinates on silent/near-silent audio.
// Stored normalized (lowercase, no spaces/punctuation) for robust matching.
const WHISPER_HALLUCINATIONS = new Set([
    'thanksforwatching',
    'thankyouforwatching',
    'thanksforwatchingandseeyouinthenextvideo',
    'thankyou',
    'thankyouverymuch',
    'pleasesubscribe',
    'pleasesubscribetomychannel',
    'subtitlesbytheamaraorgcommunity',
    'youtube',
    'bye',
    'byebye',
    'sotłumaczenienapisów',
]);

/**
 * Normalize Whisper text for hallucination comparison: lowercase, strip
 * everything that is not a letter or digit (spaces, punctuation, emoji).
 * @param {string} text
 * @returns {string}
 */
function normalizeWhisperText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Map an audio MIME type to a file extension for the transcription upload.
 * Falls back to 'webm' for unknown/unsupported types.
 * @param {string} mimeType
 * @returns {string}
 */
function resolveAudioExtension(mimeType) {
    const type = typeof mimeType === 'string' && mimeType.startsWith('audio/') ? mimeType : 'audio/webm';
    if (type.includes('mp4')) return 'mp4';
    if (type.includes('wav')) return 'wav';
    if (type.includes('mpeg')) return 'mp3';
    if (type.includes('ogg')) return 'ogg';
    return 'webm';
}

/**
 * Decode + validate the base64 audio payload sent by the browser.
 * @param {string} audio base64-encoded audio
 * @param {number} maxAudioBytes reject anything larger than this
 * @returns {Buffer}
 * @throws {Error} on invalid/empty/oversized payloads
 */
function decodeAudioPayload(audio, maxAudioBytes) {
    if (!audio || typeof audio !== 'string') {
        throw new Error('Invalid audio payload');
    }
    const buffer = Buffer.from(audio, 'base64');
    if (buffer.length === 0) {
        throw new Error('Empty audio payload');
    }
    if (maxAudioBytes && buffer.length > maxAudioBytes) {
        throw new Error('Audio segment too large');
    }
    return buffer;
}

/**
 * Apply hallucination + confidence/no-speech filtering to a Whisper result.
 * Returns '' when the text should be treated as silence.
 * @param {string} text raw transcript text
 * @param {Array<{no_speech_prob?: number, avg_logprob?: number}>} segments verbose_json segments
 * @returns {string}
 */
function filterTranscript(text, segments = []) {
    let out = typeof text === 'string' ? text.trim() : '';
    if (!out) return '';

    const normalized = normalizeWhisperText(out);
    // Punctuation-only output or a known hallucination phrase => silence.
    if (normalized === '' || WHISPER_HALLUCINATIONS.has(normalized)) {
        return '';
    }

    // Use the model's own confidence/no-speech signals when available.
    if (Array.isArray(segments) && segments.length) {
        const avgNoSpeech = segments.reduce((sum, s) => sum + (s.no_speech_prob || 0), 0) / segments.length;
        const avgLogprob = segments.reduce((sum, s) => sum + (s.avg_logprob || 0), 0) / segments.length;
        if (avgNoSpeech > 0.6 && avgLogprob < -0.4) {
            return '';
        }
    }

    return out;
}

module.exports = {
    WHISPER_HALLUCINATIONS,
    normalizeWhisperText,
    resolveAudioExtension,
    decodeAudioPayload,
    filterTranscript,
};
