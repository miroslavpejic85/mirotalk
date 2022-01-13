let recordingStarted = false;
// initialize SpeechRecognition object
let recognition = new webkitSpeechRecognition();
recognition.maxAlternatives = 1;
recognition.continuous = true;
// Detect the said words
recognition.onresult = e => {
    let current = event.resultIndex;
    // Get a transcript of what was said.
    let transcript = event.results[current][0].transcript;
    // Add the current transcript with existing said values
    config = {
        room_id: roomId,
        peer_name: myPeerName,
        text_data: transcript,
        time_stamp: new Date()
    };
    sendToServer('speech_transcript', config); //sending data to signaling server for specific room
}

//start or stop decider
function start_stop_speech(config) {
    if (config) {
        try {
            // Start recognition
            recognition.start();
        } catch (error) {
            console.log(error);
        }
    } else {
        //stop recognition
        recognition.stop();
    }
}

navigator.getUserMedia({ audio: true }, startUserMedia, function(e) {
    __log('No live audio input: ' + e);
});