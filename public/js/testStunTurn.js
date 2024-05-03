'use strict';

const Ice = document.getElementById('ice');
const IP = document.getElementById('ip');
const Stun = document.getElementById('stun');
const Turn = document.getElementById('turn');
const Err = document.getElementById('err');

const qs = new URLSearchParams(window.location.search);

let iceServers = filterXSS(qs.get('iceServers'));

if (iceServers) {
    iceServers = JSON.parse(iceServers);
} else {
    // http://localhost:3000/test
    iceServers = [
        // Test some STUN server
        {
            urls: 'stun:stun.l.google.com:19302',
        },
        // Test some TURN server
        // https://www.metered.ca/tools/openrelay/
        {
            urls: 'turn:a.relay.metered.ca:443',
            username: 'e8dd65b92c62d3e36cafb807',
            credential: 'uWdWNmkhvyqTEswO',
        },
    ];
}

console.log('Check Ice Servers', iceServers);

// Print iceServers config
Ice.innerText = JSON.stringify(iceServers, null, 4);

// Test the connections
const pc = new RTCPeerConnection({
    iceServers,
});

pc.onicecandidate = (e) => {
    if (!e.candidate) return;

    console.log(e.candidate.candidate);

    // If a srflx candidate was found, notify that the STUN server works!
    if (e.candidate.type == 'srflx' || e.candidate.candidate.includes('srflx')) {
        let ip = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
        let address = e.candidate.address ? e.candidate.address : e.candidate.candidate.match(ip);
        IP.innerText = '🟢 Your Public IP Address is ' + address;
        Stun.innerText = '🟢 The STUN server is reachable!';
    }

    // If a relay candidate was found, notify that the TURN server works!
    if (e.candidate.type == 'relay' || e.candidate.candidate.includes('relay')) {
        Turn.innerText = '🟢 The TURN server is reachable!';
    }
};

// handle error
pc.onicecandidateerror = (e) => {
    console.error(e);
    Err.innerText = '⚠️ ' + e.errorText;
};

pc.createDataChannel('test');
pc.createOffer().then((offer) => pc.setLocalDescription(offer));
