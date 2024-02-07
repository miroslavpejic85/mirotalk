'use-strict';

class LocalStorage {
    constructor() {
        this.MEDIA_TYPE = {
            audio: 'audio',
            video: 'video',
            speaker: 'speaker',
        };

        this.P2P_INIT_CONFIG = {
            audio: true,
            video: true,
        };

        this.P2P_SETTINGS = {
            share_on_join: true,
            show_chat_on_msg: true,
            speech_in_msg: false,
            mic_auto_gain_control: false,
            mic_echo_cancellations: true,
            mic_noise_suppression: true,
            mic_sample_rate: 0, // 0: 48000 Hz 1: 44100 Hz
            mic_sample_size: 0, // 0: 16 bits 1: 32 bits
            mic_channel_count: 0, // 0: 1(mono) 1: 2 (stereo)
            mic_latency: 50, // ms
            mic_volume: 100, // %
            video_fps: 1, // default 30fps
            screen_fps: 1, // default 30fps
            pitch_bar: true,
            sounds: true,
            video_obj_fit: 2, // cover
            theme: 0, // dark
            theme_color: '#000000', // custom theme color
            theme_custom: false, // keep custom theme
            buttons_bar: 0, // vertical
            pin_grid: 0, // vertical
        };

        this.DEVICES_COUNT = {
            audio: 0,
            speaker: 0,
            video: 0,
        };

        this.LOCAL_STORAGE_DEVICES = {
            audio: {
                count: 0,
                index: 0,
                select: null,
            },
            speaker: {
                count: 0,
                index: 0,
                select: null,
            },
            video: {
                count: 0,
                index: 0,
                select: null,
            },
        };
    }

    // ####################################################
    // SET LOCAL STORAGE
    // ####################################################

    setItemLocalStorage(key, value) {
        localStorage.setItem(key, value);
    }

    setObjectLocalStorage(name, object) {
        localStorage.setItem(name, JSON.stringify(object));
    }

    setSettings(settings) {
        this.P2P_SETTINGS = settings;
        this.setObjectLocalStorage('P2P_SETTINGS', this.P2P_SETTINGS);
    }

    setInitConfig(type, status) {
        switch (type) {
            case this.MEDIA_TYPE.audio:
                this.P2P_INIT_CONFIG.audio = status;
                break;
            case this.MEDIA_TYPE.video:
                this.P2P_INIT_CONFIG.video = status;
                break;
        }
        this.setObjectLocalStorage('P2P_INIT_CONFIG', this.P2P_INIT_CONFIG);
    }

    setLocalStorageDevices(type, index, select) {
        switch (type) {
            case this.MEDIA_TYPE.audio:
                this.LOCAL_STORAGE_DEVICES.audio.count = this.DEVICES_COUNT.audio;
                this.LOCAL_STORAGE_DEVICES.audio.index = index;
                this.LOCAL_STORAGE_DEVICES.audio.select = select;
                break;
            case this.MEDIA_TYPE.video:
                this.LOCAL_STORAGE_DEVICES.video.count = this.DEVICES_COUNT.video;
                this.LOCAL_STORAGE_DEVICES.video.index = index;
                this.LOCAL_STORAGE_DEVICES.video.select = select;
                break;
            case this.MEDIA_TYPE.speaker:
                this.LOCAL_STORAGE_DEVICES.speaker.count = this.DEVICES_COUNT.speaker;
                this.LOCAL_STORAGE_DEVICES.speaker.index = index;
                this.LOCAL_STORAGE_DEVICES.speaker.select = select;
                break;
            default:
                break;
        }
        this.setObjectLocalStorage('LOCAL_STORAGE_DEVICES', this.LOCAL_STORAGE_DEVICES);
    }

    // ####################################################
    // GET LOCAL STORAGE
    // ####################################################

    getInitConfig() {
        return this.getObjectLocalStorage('P2P_INIT_CONFIG');
    }

    getSettings() {
        return this.getObjectLocalStorage('P2P_SETTINGS');
    }

    getLocalStorageDevices() {
        return this.getObjectLocalStorage('LOCAL_STORAGE_DEVICES');
    }

    getItemLocalStorage(key) {
        localStorage.getItem(key);
    }

    getObjectLocalStorage(name) {
        return JSON.parse(localStorage.getItem(name));
    }
}
