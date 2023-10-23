'use strict';

const bars = getSlALL('.volume-bar');

let scriptProcessor = null;

/**
 * Check if audio context is supported
 * @returns {boolean}
 */
function isAudioContextSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
}

/**
 * Start to handle microphone volume indicator
 * @param {MediaStream} stream Media stream audio
 */
async function getMicrophoneVolumeIndicator(stream) {
    if (isAudioContextSupported() && hasAudioTrack(stream)) {
        stopMicrophoneProcessing();
        console.log('Start microphone volume indicator for audio track', stream.getAudioTracks()[0]);
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const microphone = audioContext.createMediaStreamSource(stream);
        scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1);
        scriptProcessor.onaudioprocess = function (event) {
            const inputBuffer = event.inputBuffer.getChannelData(0);
            let sum = 0;
            for (let i = 0; i < inputBuffer.length; i++) {
                sum += inputBuffer[i] * inputBuffer[i];
            }
            const rms = Math.sqrt(sum / inputBuffer.length);
            const volume = Math.max(0, Math.min(1, rms * 10));
            const finalVolume = Math.round(volume * 100);
            if (myAudioStatus && finalVolume > 10) {
                const config = {
                    type: 'micVolume',
                    peer_id: myPeerId,
                    volume: finalVolume,
                };
                handleMyVolume(config);
                sendToDataChannel(config);
            }
            updateVolumeIndicator(volume);
        };
        microphone.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);
    } else {
        console.warn('Microphone volume indicator not supported for this browser');
    }
}

/**
 * Stop microphone processing
 */
function stopMicrophoneProcessing() {
    console.log('Stop microphone volume indicator');
    if (scriptProcessor) {
        scriptProcessor.disconnect();
        scriptProcessor = null;
    }
}

/**
 * Update volume indicator
 * @param {number} volume
 */
function updateVolumeIndicator(volume) {
    const activeBars = Math.ceil(volume * bars.length);
    bars.forEach((bar, index) => {
        bar.classList.toggle('active', index < activeBars);
    });
}
