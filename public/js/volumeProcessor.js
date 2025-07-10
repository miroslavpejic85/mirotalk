'use strict';
class VolumeProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.threshold = options.processorOptions.threshold || 10;
        this.peerId = options.processorOptions.peerId || '';
        this.myAudioStatus = options.processorOptions.myAudioStatus || false;
        this.silenceThreshold = options.processorOptions.silenceThreshold || 0.01;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];

        // Check if we have valid input
        if (!input || input.length === 0) {
            return true;
        }

        const inputData = input[0]; // Get input audio data

        // Check if inputData exists and has length
        if (!inputData || inputData.length === 0) {
            return true;
        }

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
        }

        const rms = Math.sqrt(sum / inputData.length);
        const volume = Math.max(0, Math.min(1, rms * 10));
        const finalVolume = Math.round(volume * 100);

        // Only send data when volume exceeds threshold and status is true
        if (this.myAudioStatus && finalVolume > this.threshold) {
            this.port.postMessage({
                type: 'micVolume',
                peer_id: this.peerId,
                volume: finalVolume,
            });
        }

        // Send volume data for UI updates
        if (volume > this.silenceThreshold) {
            this.port.postMessage({
                type: 'volumeIndicator',
                volume: volume,
            });
        }

        return true;
    }
}

registerProcessor('volume-processor', VolumeProcessor);
