'use strict';

// npx mocha tests/test-escapeJsString.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const checkXSS = require('../app/src/xss');

const client = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');

function extractFunction(name) {
    const start = client.search(new RegExp(`^(async )?function ${name}\\(`, 'm'));
    assert.notEqual(start, -1, `${name} not found`);
    const end = client.indexOf('\n}\n', start);
    return client.slice(start, end + 3);
}

describe('escapeJsString (inline onclick in a double-quoted HTML attribute)', () => {
    let escapeJsString;

    before(() => {
        const context = vm.createContext({});
        vm.runInContext(extractFunction('escapeJsString'), context);
        escapeJsString = context.escapeJsString;
    });

    // Mirrors the chat speech button markup built in appendMessage()
    function renderSpeechButton(name) {
        const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously' });
        const calls = [];
        dom.window.speechElementText = (...args) => calls.push(args);
        dom.window.document.body.insertAdjacentHTML(
            'beforeend',
            `<button id="b" onclick="speechElementText(false, '${escapeJsString(name)}', 'message-1')"></button>`
        );
        return { button: dom.window.document.getElementById('b'), calls };
    }

    const payloads = [
        '" onmouseover=alert(document.domain) style=position:fixed;inset:0;z-index:2147483647 x="',
        "X', alert(1), '",
        '\\" onclick=alert(1) x=\\"',
        '</button><img src=x onerror=alert(1)>',
        'a&quot; onfocus=alert(1) autofocus x=&quot;',
        'Line\nBreak\u2028Sep',
    ];

    payloads.forEach((payload) => {
        it(`should not break out of the attribute: ${JSON.stringify(payload)}`, () => {
            // Same path as a real peer name: server-side checkXSS first
            const name = checkXSS(payload);
            const { button, calls } = renderSpeechButton(name);

            assert.ok(button, 'button must be parsed');
            assert.deepEqual(
                button.getAttributeNames().sort(),
                ['id', 'onclick'],
                'no extra attributes must be injected'
            );
            assert.equal(button.parentElement.children.length, 1, 'no extra elements must be injected');

            button.click();
            assert.equal(calls.length, 1, 'onclick must run exactly the speech handler');
            assert.deepEqual(calls[0], [false, name, 'message-1'], 'the handler must receive the original name');
        });
    });
});
