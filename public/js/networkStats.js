'use strict';

/*
  Fully correct WebRTC network stats collector.
  - Supports audio + video
  - Correct RTT (remote-inbound-rtp)
  - Correct jitter (inbound-rtp)
  - Multi-peer aggregation
*/

const networkSent = document.getElementById('networkSent');
const networkReceived = document.getElementById('networkReceived');
const networkJitter = document.getElementById('networkJitter');
const networkPacketLost = document.getElementById('networkPacketLost');
const networkRtt = document.getElementById('networkRtt');

const statsInterval = 3000; // every 3 seconds

/**
 * Read network stats for a single RTCPeerConnection.
 * Works for both audio and video.
 */
async function getNetworkStats(pc) {
    let bytesSent = 0;
    let bytesReceived = 0;
    let packetsLost = 0;

    let jitterSum = 0;
    let jitterCount = 0;

    let rttSum = 0;
    let rttCount = 0;

    if (!pc) {
        return { bytesSent, bytesReceived, packetsLost, jitter: 0, rtt: 0 };
    }

    const stats = await pc.getStats();

    stats.forEach((report) => {
        // Outbound: Anything we send (audio/video)
        if (report.type === 'outbound-rtp') {
            bytesSent += report.bytesSent || 0;
        }

        // Inbound: Anything we receive (audio/video)
        if (report.type === 'inbound-rtp') {
            bytesReceived += report.bytesReceived || 0;
            packetsLost += report.packetsLost || 0;

            if (report.jitter !== undefined) {
                jitterSum += report.jitter;
                jitterCount++;
            }
        }

        // RTT only exists in remote-inbound-rtp
        if (report.type === 'remote-inbound-rtp') {
            if (report.roundTripTime !== undefined) {
                rttSum += report.roundTripTime;
                rttCount++;
            }
        }
    });

    return {
        bytesSent,
        bytesReceived,
        packetsLost,
        jitter: jitterCount ? jitterSum / jitterCount : 0,
        rtt: rttCount ? rttSum / rttCount : 0,
    };
}

/** Convert bytes to readable string */
function bytesToSize(bytes) {
    if (bytes === 0) return '0 b';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const sizes = ['b', 'Kb', 'Mb', 'Gb', 'Tb'];
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

/** Display into UI */
function showNetworkStats(stats) {
    networkSent.innerText = stats.bytesSent;
    networkReceived.innerText = stats.bytesReceived;
    networkJitter.innerText = stats.jitter.toFixed(3) + ' s';
    networkPacketLost.innerText = stats.packetsLost;
    networkRtt.innerText = stats.rtt.toFixed(3) + ' s';

    console.log('Network Stats:', stats);
}

/**
 * Aggregate all peer connections
 */
setInterval(async () => {
    let global = {
        bytesSent: 0,
        bytesReceived: 0,
        packetsLost: 0,
        jitter: 0,
        rtt: 0,
    };

    let jitterCount = 0;
    let rttCount = 0;

    for (const pc of Object.values(peerConnections)) {
        const s = await getNetworkStats(pc);

        global.bytesSent += s.bytesSent;
        global.bytesReceived += s.bytesReceived;
        global.packetsLost += s.packetsLost;

        if (s.jitter > 0) {
            global.jitter += s.jitter;
            jitterCount++;
        }

        if (s.rtt > 0) {
            global.rtt += s.rtt;
            rttCount++;
        }
    }

    if (jitterCount > 0) global.jitter /= jitterCount;
    if (rttCount > 0) global.rtt /= rttCount;

    showNetworkStats({
        bytesSent: bytesToSize(global.bytesSent),
        bytesReceived: bytesToSize(global.bytesReceived),
        packetsLost: global.packetsLost,
        jitter: global.jitter,
        rtt: global.rtt,
    });
}, statsInterval);
