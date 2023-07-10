'use strict';

/**
 * Start audio pitch detection
 * @param {MediaStream} stream - Media stream audio
 */
async function startPitchDetection(stream) {
    if (isAudioContextSupported()) {
        console.log('Start Pitch Detection for audio track', stream.getAudioTracks()[0]);
        pitchDetectionStatus = true;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        meter = createAudioMeter(audioContext);
        mediaStreamSource.connect(meter);
    }
}

/**
 * Check if audio context is supported
 * @returns {boolean}
 */
function isAudioContextSupported() {
    return !!window.AudioContext;
}

/**
 * Create audio meter
 * @param {AudioContext} audioContext - Audio context
 * @param {number} clipLevel - Optional
 * @param {number} averaging - Optional
 * @param {number} clipLag - Optional
 * @returns {ScriptProcessorNode}
 */
function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
    const processor = audioContext.createScriptProcessor(512);
    processor.onaudioprocess = (event) => volumeAudioProcess.call(processor, event);
    processor.clipping = false;
    processor.lastClip = 0;
    processor.volume = 0;
    processor.clipLevel = clipLevel || 0.98;
    processor.averaging = averaging || 0.95;
    processor.clipLag = clipLag || 750;

    // This will have no effect since we don't copy the input to the output,
    // but it works around a current Chrome bug.
    processor.connect(audioContext.destination);

    processor.checkClipping = function () {
        if (!this.clipping) {
            return false;
        }
        if (this.lastClip + this.clipLag < window.performance.now()) {
            this.clipping = false;
        }
        return this.clipping;
    };

    processor.shutdown = function () {
        this.disconnect();
        this.onaudioprocess = null;
    };

    return processor;
}

/**
 * Volume audio process
 * @param {AudioProcessingEvent} event - Audio volume event
 */
function volumeAudioProcess(event) {
    const buf = event.inputBuffer.getChannelData(0);
    const bufLength = buf.length;
    let sum = 0;

    // Do a root-mean-square on the samples: sum up the squares...
    for (const x of buf) {
        if (Math.abs(x) >= this.clipLevel) {
            this.clipping = true;
            this.lastClip = window.performance.now();
        }
        sum += x * x;
    }

    // ... then take the square root of the sum.
    const rms = Math.sqrt(sum / bufLength);

    // Now smooth this out with the averaging factor applied
    // to the previous sample - take the max here because we
    // want "fast attack, slow release."
    this.volume = Math.max(rms, this.volume * this.averaging);
    const finalVolume = Math.round(this.volume * 100);

    if (myAudioStatus && finalVolume > 5) {
        const config = {
            type: 'micVolume',
            peer_id: myPeerId,
            volume: finalVolume,
        };
        handleMyVolume(config);
        sendToDataChannel(config);
    }
}
