class IframeApi {
    static DEFAULT_OPTIONS = {
        room: 'default-room',
        name: 'guest',
        avatar: false,
        audio: false,
        video: false,
        screen: false,
        hide: false,
        notify: false,
        width: '100vw',
        height: '100vh',
        token: null,
        parentNode: null,
    };

    constructor(domain, options = {}) {
        if (!domain) {
            throw new Error('Domain is required');
        }

        this.domain = domain;
        this.options = { ...IframeApi.DEFAULT_OPTIONS, ...options };

        if (!this.isValidParentNode()) {
            throw new Error('Invalid parent node provided');
        }

        this.init();
    }

    init() {
        const params = this.buildParams();
        const iframe = this.createIframe(params);

        this.clearParentNode();
        this.appendIframeToParentNode(iframe);
    }

    isValidParentNode() {
        return this.options.parentNode instanceof HTMLElement;
    }

    buildParams() {
        const params = new URLSearchParams({
            room: this.options.room,
            name: this.options.name,
            avatar: this.options.avatar ? this.options.avatar : 0,
            audio: this.options.audio ? 1 : 0,
            video: this.options.video ? 1 : 0,
            screen: this.options.screen ? 1 : 0,
            hide: this.options.hide ? 1 : 0,
            notify: this.options.notify ? 1 : 0,
        });

        if (this.options.token) {
            params.append('token', this.options.token);
        }

        return params;
    }

    createIframe(params) {
        const protocol = this.domain.startsWith('localhost') ? 'http' : 'https';
        const url = new URL(`${protocol}://${this.domain}/join`);
        url.search = params.toString();

        const iframe = document.createElement('iframe');
        iframe.src = url.toString();
        iframe.allow =
            'camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write; web-share; autoplay';
        iframe.style.width = this.options.width;
        iframe.style.height = this.options.height;
        iframe.style.border = '0px';

        // Optional: Add event listeners for loading and error states
        iframe.addEventListener('load', () => console.log('Iframe loaded successfully'));
        iframe.addEventListener('error', () => console.error('Iframe failed to load'));

        return iframe;
    }

    clearParentNode() {
        this.options.parentNode.innerHTML = '';
    }

    appendIframeToParentNode(iframe) {
        this.options.parentNode.appendChild(iframe);
    }
}
