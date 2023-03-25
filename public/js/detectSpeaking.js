'use strict';

/**
 * Start audio pitch detection
 * @param {object} stream media stream audio
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
 * @returns boolean
 */
function isAudioContextSupported() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (window.AudioContext) {
        return true;
    }
    return false;
}

/**
 * Create audio mixer
 * @param {object} audioContext audio context
 * @param {decimal} clipLevel optional
 * @param {decimal} averaging optional
 * @param {integer} clipLag optional
 * @returns
 */
function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
    const processor = audioContext.createScriptProcessor(512);
    processor.onaudioprocess = volumeAudioProcess;
    processor.clipping = false;
    processor.lastClip = 0;
    processor.volume = 0;
    processor.clipLevel = clipLevel || 0.98;
    processor.averaging = averaging || 0.95;
    processor.clipLag = clipLag || 750;

    // this will have no effect, since we don't copy the input to the output,
    // but works around a current Chrome bug.
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
 * @param {object} event audio volume event
 */
function volumeAudioProcess(event) {
    const buf = event.inputBuffer.getChannelData(0);
    const bufLength = buf.length;
    let sum = 0;
    let x;

    // Do a root-mean-square on the samples: sum up the squares...
    for (let i = 0; i < bufLength; i++) {
        x = buf[i];
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
    let final_volume = Math.round(this.volume * 100);
    if (myAudioStatus && final_volume > 5) {
        let config = {
            type: 'micVolume',
            peer_id: myPeerId,
            volume: final_volume,
        };
        handleMyVolume(config);
        sendToDataChannel(config);
    }
}
