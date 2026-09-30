'use strict';

require('should');

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const iframeSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'iframe.js'), 'utf8');
const widgetSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'widget.js'), 'utf8');

describe('integration redirects', () => {
    it('accepts redirect events only from the iframe it created', () => {
        const listeners = {};
        let acknowledgment;
        const iframeWindow = {
            postMessage(data, origin) {
                acknowledgment = { data, origin };
            },
        };
        const iframe = {
            addEventListener() {},
            allow: '',
            contentWindow: iframeWindow,
            src: '',
            style: {},
        };

        class HTMLElement {
            constructor() {
                this.innerHTML = '';
            }

            appendChild() {}
        }

        const window = {
            addEventListener(type, listener) {
                listeners[type] = listener;
            },
            location: { href: 'https://host.example/app' },
        };
        const context = vm.createContext({
            console,
            document: { createElement: () => iframe },
            HTMLElement,
            URL,
            URLSearchParams,
            window,
        });
        vm.runInContext(iframeSource, context);
        const IframeApi = vm.runInContext('IframeApi', context);

        new IframeApi('meet.example', { parentNode: new HTMLElement() });
        const redirect = { type: 'mirotalk:redirect', url: 'https://host.example/done', id: 'request-1' };

        listeners.message({ data: redirect, origin: 'https://other.example', source: iframeWindow });
        window.location.href.should.equal('https://host.example/app');
        should(acknowledgment).equal(undefined);

        listeners.message({ data: redirect, origin: 'https://meet.example', source: iframeWindow });
        window.location.href.should.equal('https://host.example/done');
        acknowledgment.data.type.should.equal('mirotalk:redirect-ack');
        acknowledgment.data.id.should.equal('request-1');
        acknowledgment.origin.should.equal('https://meet.example');
    });

    it('marks widget meetings and accepts redirects only from their popup', () => {
        const listeners = {};
        let acknowledgment;
        const meetingWindow = {
            postMessage(data, origin) {
                acknowledgment = { data, origin };
            },
        };
        let openedUrl;
        const window = {
            addEventListener(type, listener) {
                listeners[type] = listener;
            },
            location: { href: 'https://host.example/app' },
            miroTalkWidgets: new Map(),
            open(url) {
                openedUrl = url;
                return meetingWindow;
            },
        };
        const context = vm.createContext({
            alert() {},
            console,
            document: { addEventListener() {} },
            URL,
            URLSearchParams,
            window,
        });
        vm.runInContext(widgetSource, context);
        const MiroTalkWidget = vm.runInContext('MiroTalkWidget', context);
        const widget = new MiroTalkWidget('meet.example', 'support', 'guest', { autoJoin: false });

        widget.openMeetingWindow({ audio: 1, video: 0 });
        openedUrl.should.containEql('mirotalk_widget=1');

        const redirect = { type: 'mirotalk:redirect', url: 'https://host.example/done', id: 'request-2' };
        listeners.message({ data: redirect, origin: 'https://meet.example', source: {} });
        window.location.href.should.equal('https://host.example/app');
        should(acknowledgment).equal(undefined);

        listeners.message({ data: redirect, origin: 'https://meet.example', source: meetingWindow });
        window.location.href.should.equal('https://host.example/done');
        acknowledgment.data.type.should.equal('mirotalk:redirect-ack');
        acknowledgment.data.id.should.equal('request-2');
        acknowledgment.origin.should.equal('https://meet.example');
    });
});
