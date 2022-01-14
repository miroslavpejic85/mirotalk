'use strict';

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
 */
let isWebkitSpeechRecognitionSupported = false;
let recognitionRunning = false;
let recognition;

if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onstart = function () {
        console.log('Start speech recognition');
        speechRecognitionStart.style.display = 'none';
        speechRecognitionStop.style.display = 'block';
    };

    // Detect the said words
    recognition.onresult = (e) => {
        let current = e.resultIndex;
        // Get a transcript of what was said.
        let transcript = e.results[current][0].transcript;
        config = {
            type: 'speech',
            room_id: roomId,
            peer_name: myPeerName,
            text_data: transcript,
            time_stamp: new Date(),
        };
        // save also my speech to text
        handleSpeechTranscript(config);

        if (thereIsPeerConnections()) {
            // Send speech transcript through RTC Data Channels
            for (let peer_id in chatDataChannels) {
                if (chatDataChannels[peer_id].readyState === 'open')
                    chatDataChannels[peer_id].send(JSON.stringify(config));
            }
        }
    };

    recognition.onerror = function (event) {
        console.warn('Speech recognition error', event.error);
    };

    recognition.onend = function () {
        console.log('Stop speech recognition');
        // if (recognitionRunning) recognition.start();
        speechRecognitionStop.style.display = 'none';
        speechRecognitionStart.style.display = 'block';
    };

    isWebkitSpeechRecognitionSupported = true;
    console.info('Browser supports webkitSpeechRecognition');
} else {
    console.warn(
        'This browser not supports webkitSpeechRecognition, check out supported browsers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API#browser_compatibility',
    );
}

//start or stop decider
function startSpeech(config) {
    if (isWebkitSpeechRecognitionSupported) {
        if (config) {
            try {
                recognitionRunning = true;
                recognition.start();
            } catch (error) {
                console.log('Start speech', error);
            }
        } else {
            recognitionRunning = false;
            recognition.stop();
        }
    } else {
        userLog('info', 'This browser not supports webkitSpeechRecognition');
    }
}
