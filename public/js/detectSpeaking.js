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

        // 创建并配置 AudioWorkletNode
        await audioContext.audioWorklet.addModule('volume-processor.js');
        const workletNode = new AudioWorkletNode(audioContext, 'volume-processor', {
            processorOptions: {
                threshold: 10,     // 音量阈值
                peerId: myPeerId,  // 你的 peer ID
                myAudioStatus: myAudioStatus, // 你的音频状态
            },
        });

        // 监听处理器发送的消息
        workletNode.port.onmessage = (event) => {
            const data = event.data;

            if (data.type === 'micVolume') {
                // 发送数据到 DataChannel
                sendToDataChannel(data);
                handleMyVolume(data); // 自定义处理函数
            } else if (data.type === 'volumeIndicator') {
                updateVolumeIndicator(data.volume); // 更新音量指示器
            }
        };

        // 连接音频图
        microphone.connect(workletNode);
        workletNode.connect(audioContext.destination);
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
