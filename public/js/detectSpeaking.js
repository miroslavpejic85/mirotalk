'use strict';

const bars = document.querySelectorAll('.volume-bar');

let audioContext = null;
let workletNode = null;

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
        try {
            // Clean up any existing resources first
            stopMicrophoneProcessing();

            console.log('Start microphone volume indicator for audio track', stream.getAudioTracks()[0]);
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const microphone = audioContext.createMediaStreamSource(stream);

            // Create and configure AudioWorkletNode
            await audioContext.audioWorklet.addModule('/js/volumeProcessor.js');
            workletNode = new AudioWorkletNode(audioContext, 'volume-processor', {
                processorOptions: {
                    threshold: 10, // Volume threshold
                    peerId: myPeerId, // Your peer ID
                    myAudioStatus: myAudioStatus, // Your audio status
                },
            });

            // Listen for messages from the processor
            workletNode.port.onmessage = (event) => {
                const data = event.data;

                if (data.type === 'micVolume') {
                    // Send data to DataChannel
                    sendToDataChannel(data);
                    handleMyVolume(data); // Custom handling function
                } else if (data.type === 'volumeIndicator') {
                    updateVolumeIndicator(data.volume); // Update volume indicator
                }
            };

            // Connect audio graph
            microphone.connect(workletNode);
            workletNode.connect(audioContext.destination);
        } catch (error) {
            console.error('Error initializing microphone volume indicator:', error);
            // Clean up on error
            stopMicrophoneProcessing();
        }
    } else {
        console.warn('Microphone volume indicator not supported for this browser');
    }
}

/**
 * Stop microphone processing
 */
function stopMicrophoneProcessing() {
    console.log('Stop microphone volume indicator');

    // Clean up workletNode
    if (workletNode) {
        try {
            workletNode.disconnect();
        } catch (error) {
            console.warn('Error disconnecting workletNode:', error);
        }
        workletNode = null;
    }

    // Clean up audioContext
    if (audioContext) {
        try {
            if (audioContext.state !== 'closed') {
                audioContext.close();
            }
        } catch (error) {
            console.warn('Error closing audioContext:', error);
        }
        audioContext = null;
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
