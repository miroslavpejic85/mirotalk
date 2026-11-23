'use strict';

// npx mocha tests/test-chatTimeFormat.js

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

function setup() {
    const html = read('public/views/client.html');
    const tpl = html.match(/<template id="tpl-msger-chat-message">[\s\S]*?<\/template>/)[0];
    const dom = new JSDOM(`<!doctype html><html><body>${tpl}<div id="chat"></div></body></html>`);
    const context = vm.createContext({ document: dom.window.document, Number, Date });
    vm.runInContext(
        `let chatTime12h = false;
        ${read('public/js/roomTemplate.js')}
        ${extractFunction('getFormatDate')}
        ${extractFunction('setChatTime12h')}
        this.api = { getFormatDate, setChatTime12h, renderRoomTemplate };`,
        context
    );
    return { document: dom.window.document, ...context.api };
}

describe('chat time format', () => {
    // 17:58:17 local time
    const date = new Date(2026, 10, 23, 17, 58, 17);

    it('formats 24-hour by default and 12-hour AM/PM when enabled', () => {
        const { getFormatDate, setChatTime12h } = setup();
        assert.equal(getFormatDate(date), '17:58:17');
        setChatTime12h(true);
        assert.match(getFormatDate(date), /^5:58:17\sPM$/);
        assert.match(getFormatDate(new Date(2026, 10, 23, 0, 5, 9)), /^12:05:09\sAM$/);
    });

    it('re-renders existing message times and keeps the edited badge', () => {
        const { document, getFormatDate, setChatTime12h, renderRoomTemplate } = setup();
        const chat = document.getElementById('chat');
        chat.innerHTML = renderRoomTemplate('tpl-msger-chat-message', {
            text: { senderName: 'Bishop', messageTime: getFormatDate(date) },
            attrs: { messageTs: date.getTime() },
        });
        const timeEl = chat.querySelector('.msg-info-time');
        const badge = document.createElement('span');
        badge.className = 'msg-edited-badge';
        timeEl.appendChild(badge);

        setChatTime12h(true);
        assert.match(chat.querySelector('.msg-time').textContent, /^5:58:17\sPM$/);
        assert.ok(timeEl.querySelector('.msg-edited-badge'), 'edited badge survives re-render');
        setChatTime12h(false);
        assert.equal(chat.querySelector('.msg-time').textContent, '17:58:17');
    });

    it('is configurable via CHAT_TIME_FORMAT and overridable per user', () => {
        assert.match(read('.env.template'), /^CHAT_TIME_FORMAT=24h/m);
        assert.match(
            read('app/src/config.template.js'),
            /chatTimeFormat: process\.env\.CHAT_TIME_FORMAT === '12h' \? '12h' : '24h'/
        );
        assert.match(client, /typeof lsSettings\.chat_time_12h === 'boolean'/);
        assert.match(client, /buttons\?\.chat\?\.chatTimeFormat === '12h'/);
        assert.match(read('public/views/client.html'), /id="msgerTime12h"/);
    });
});
