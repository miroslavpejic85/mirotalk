'use strict';

// npx mocha tests/test-chatMessageActions.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const client = read('public/js/client.js');

function extractFunction(name) {
    const start = client.search(new RegExp(`^function ${name}\\(`, 'm'));
    assert.notEqual(start, -1, `${name} not found`);
    const end = client.indexOf('\n}\n', start);
    return client.slice(start, end + 3);
}

const GIF_URL = 'https://static.klipy.com/ii/abc/funny.webp';

function setup() {
    const html = read('public/views/client.html');
    const tpl = html.match(/<template id="tpl-msger-chat-message">[\s\S]*?<\/template>/)[0];
    const dom = new JSDOM(`<!doctype html><html><body>${tpl}<div id="msgerChat"></div></body></html>`);
    const { window } = dom;
    // jsdom has no layout, so it lacks innerText
    Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
        get() {
            return this.textContent;
        },
    });
    const copied = [];
    const spoken = [];
    const context = vm.createContext({
        document: window.document,
        URL,
        Date,
        Number,
        filterXSS: (s) => s,
        hljs: { highlightAll() {} },
        images: {},
        className: { trash: 'trash', edit: 'edit', copy: 'copy', speech: 'speech' },
        copyTextToClipboard: async (text) => (copied.push(text), true),
        msgPopup() {},
        speechMessage: (newMsg, from, msg) => spoken.push(msg),
    });
    vm.runInContext(
        `const CHAT_GPT_NAME = 'ChatGPT';
        const myPeerId = 'me';
        const isSpeechSynthesisSupported = true;
        const isMobileDevice = true;
        const msgerChat = document.getElementById('msgerChat');
        let chatMessagesId = 0;
        let chatMessages = [];
        const getId = (id) => document.getElementById(id);
        const getFormatDate = () => '12:00:00';
        const isValidAvatarURL = () => false;
        const normalizeChatMessageId = (id) => id || '';
        const escapeJsString = (s) => s;
        const processMessage = (s) => s;
        const streamMessage = (el, s) => (el.innerHTML = s);
        const filterMessagesByConversation = () => {};
        const refreshMessageGrouping = () => {};
        const toggleMsgerEmptyNotice = () => {};
        ${read('public/js/roomTemplate.js')}
        ${[
            'appendMessage',
            'copyToClipboard',
            'getChatImageOnlyUrl',
            'speechElementText',
            'isValidHttpURL',
            'isOwnSharedChatMessage',
        ]
            .map(extractFunction)
            .join('\n')}
        this.api = { appendMessage, copyToClipboard, speechElementText };`,
        context
    );
    const buttons = (n) =>
        [...window.document.querySelectorAll(`#msg-${n} button[id^="msg-"]`)].map((b) => b.id.split('-')[1]);
    return { ...context.api, buttons, copied, spoken };
}

describe('chat message actions', () => {
    it('hides Speech and Edit for image/GIF messages but keeps Copy (copies the URL)', async () => {
        const { appendMessage, copyToClipboard, speechElementText, buttons, copied, spoken } = setup();
        appendMessage('Me', '', 'right', `<img src="${GIF_URL}" width="200px">`, false, 'me_1', '', 'me');
        appendMessage('Me', '', 'right', 'hello there', false, 'me_2', '', 'me');

        assert.deepEqual(buttons(0), ['delete', 'copy', 'reaction']);
        assert.deepEqual(buttons(1), ['delete', 'edit', 'copy', 'reaction', 'speech']);

        copyToClipboard('message-0');
        copyToClipboard('message-1');
        await new Promise((r) => setImmediate(r));
        assert.deepEqual(copied, [GIF_URL, 'hello there']);

        speechElementText(false, 'Me', 'message-0');
        speechElementText(false, 'Me', 'message-1');
        assert.deepEqual(spoken, ['hello there']);
    });

    it('hides Speech for image messages in the ChatGPT chat', () => {
        const { appendMessage, buttons } = setup();
        appendMessage('Me', '', 'right', `<img src="${GIF_URL}">`, false, null, 'ChatGPT');
        appendMessage('ChatGPT', '', 'left', 'Hi, how can I help?', false, null, 'Me');
        assert.deepEqual(buttons(0), ['delete', 'copy', 'reaction']);
        assert.deepEqual(buttons(1), ['delete', 'copy', 'reaction', 'speech']);
    });
});
