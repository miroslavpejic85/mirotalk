// volume-processor.js
class VolumeProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.threshold = options.processorOptions.threshold || 10;
        this.peerId = options.processorOptions.peerId || '';
        this.myAudioStatus = options.processorOptions.myAudioStatus || false;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0][0]; // 获取输入音频数据
        let sum = 0;
        for (let i = 0; i < input.length; i++) {
            sum += input[i] * input[i];
        }
        const rms = Math.sqrt(sum / input.length);
        const volume = Math.max(0, Math.min(1, rms * 10));
        const finalVolume = Math.round(volume * 100);

        // 只有当音量超过阈值且状态为 true 时才发送数据
        if (this.myAudioStatus && finalVolume > this.threshold) {
            this.port.postMessage({
                type: 'micVolume',
                peer_id: this.peerId,
                volume: finalVolume,
            });
        }

        // 发送音量数据用于 UI 更新
        this.port.postMessage({
            type: 'volumeIndicator',
            volume: volume,
        });

        return true;
    }
}

registerProcessor('volume-processor', VolumeProcessor);