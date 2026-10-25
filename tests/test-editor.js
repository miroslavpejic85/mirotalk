'use strict';

// npx mocha tests/test-editor.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');

const source = fs.readFileSync(path.join(__dirname, '../public/js/editor.js'), 'utf8');
const clientHtml = fs.readFileSync(path.join(__dirname, '../public/views/client.html'), 'utf8');
const clientJs = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');

// Minimal plain-text Quill stand-in: enough to exercise the sync protocol.
class FakeQuill {
    constructor() {
        this.text = '\n';
        this.enabled = true;
        this.handlers = [];
        this.selection = null;
    }
    on(event, handler) {
        if (event === 'text-change') this.handlers.push(handler);
    }
    emit(ops, sourceName) {
        for (const handler of this.handlers) handler({ ops }, null, sourceName);
    }
    apply(ops) {
        let index = 0;
        let out = '';
        for (const op of ops) {
            if (op.retain) {
                out += this.text.slice(index, index + op.retain);
                index += op.retain;
            } else if (op.delete) {
                index += op.delete;
            } else if (typeof op.insert === 'string') {
                out += op.insert;
            }
        }
        this.text = out + this.text.slice(index);
        if (!this.text.endsWith('\n')) this.text += '\n';
    }
    getContents() {
        return { ops: [{ insert: this.text }] };
    }
    getLength() {
        return this.text.length;
    }
    getText() {
        return this.text;
    }
    enable(enabled = true) {
        this.enabled = enabled;
    }
    getSelection() {
        return this.selection;
    }
    setSelection(index) {
        this.selection = { index, length: 0 };
    }
    updateContents(ops, sourceName = 'api') {
        this.apply(ops);
        this.emit(ops, sourceName);
    }
    setContents(ops, sourceName = 'api') {
        const removed = this.text.length - 1;
        this.text = ops.map((op) => (typeof op.insert === 'string' ? op.insert : '')).join('') || '\n';
        if (!this.text.endsWith('\n')) this.text += '\n';
        this.emit([{ delete: removed }, { insert: this.text.slice(0, -1) }], sourceName);
    }
    type(index, text) {
        if (!this.enabled) return;
        const ops = index ? [{ retain: index }, { insert: text }] : [{ insert: text }];
        this.apply(ops);
        this.emit(ops, 'user');
    }
}

function loadRoomEditor(clock) {
    const context = vm.createContext({
        console,
        JSON,
        Math,
        Date: clock.Date,
        setTimeout: clock.setTimeout.bind(clock),
        clearTimeout: clock.clearTimeout.bind(clock),
    });
    vm.runInContext(`${source}\nthis.RoomEditor = RoomEditor;`, context);
    return context.RoomEditor;
}

// In-memory mesh: messages are queued and JSON round-tripped like a real data channel.
function createNetwork(RoomEditor, presenters = []) {
    const peers = new Map();
    const queue = [];
    const sent = [];
    const opened = [];

    function add(id) {
        const quill = new FakeQuill();
        const editor = new RoomEditor({
            quill,
            send: (payload, to) => {
                const targets = to ? [to] : [...peers.keys()].filter((peerId) => peerId !== id);
                for (const target of targets) {
                    const raw = JSON.stringify(payload);
                    sent.push({ from: id, to: target, raw });
                    queue.push({ from: id, to: target, raw });
                }
            },
            getMyPeerId: () => id,
            isPresenter: () => presenters.includes(id),
            isPeerPresenter: (peerId) => presenters.includes(peerId),
            onOpenRequest: (peerId) => opened.push({ id, peerId }),
        });
        peers.set(id, { editor, quill });
        return peers.get(id);
    }

    function flush() {
        while (queue.length) {
            const { from, to, raw } = queue.shift();
            peers.get(to)?.editor.handleMessage(from, JSON.parse(raw));
        }
    }

    return { add, flush, peers, sent, opened };
}

describe('shared editor over data channels', () => {
    let clock;
    let RoomEditor;

    beforeEach(() => {
        clock = sinon.useFakeTimers({ now: 1_000_000 });
        RoomEditor = loadRoomEditor(clock);
    });

    afterEach(() => clock.restore());

    it('propagates local typing to the other peers as deltas', () => {
        const net = createNetwork(RoomEditor);
        const a = net.add('a');
        const b = net.add('b');
        a.quill.type(0, 'Hello');
        net.flush();
        assert.equal(b.quill.getText(), 'Hello\n');
        assert.equal(JSON.parse(net.sent[0].raw).action, 'delta');
    });

    it('does not echo remote changes back to the network', () => {
        const net = createNetwork(RoomEditor);
        const a = net.add('a');
        net.add('b');
        a.quill.type(0, 'x');
        net.flush();
        assert.equal(net.sent.filter((message) => message.from === 'b').length, 0);
    });

    it('converges after concurrent edits once the idle snapshots are exchanged', () => {
        const net = createNetwork(RoomEditor);
        const a = net.add('a');
        const b = net.add('b');
        const c = net.add('c');
        a.quill.type(0, 'aaa');
        b.quill.type(0, 'bbb');
        net.flush();
        assert.notEqual(a.quill.getText(), b.quill.getText());

        clock.tick(RoomEditor.SNAPSHOT_IDLE_MS);
        net.flush();
        assert.equal(a.quill.getText(), b.quill.getText());
        assert.equal(b.quill.getText(), c.quill.getText());
        assert.ok(a.quill.getText().includes('aaa') && a.quill.getText().includes('bbb'));
    });

    it('sends a snapshot even while typing continuously', () => {
        const net = createNetwork(RoomEditor);
        const a = net.add('a');
        net.add('b');
        for (let i = 0; i < 10; i++) {
            a.quill.type(a.quill.getLength() - 1, 'x');
            clock.tick(600);
        }
        const actions = net.sent.map((message) => JSON.parse(message.raw).action);
        assert.ok(actions.includes('snapshot'));
    });

    it('syncs the document and the lock state to a late joiner', () => {
        const net = createNetwork(RoomEditor, ['a']);
        const a = net.add('a');
        net.add('b');
        a.quill.type(0, 'Agenda');
        clock.tick(RoomEditor.SNAPSHOT_IDLE_MS);
        a.editor.setLocked(true);
        net.flush();

        const c = net.add('c');
        a.editor.onPeerChannelOpen('c');
        net.peers.get('b').editor.onPeerChannelOpen('c');
        net.flush();
        assert.equal(c.quill.getText(), 'Agenda\n');
        assert.equal(c.editor.locked, true);
        assert.equal(c.quill.enabled, false);
    });

    it('does not send a sync for an empty, unlocked document', () => {
        const net = createNetwork(RoomEditor);
        const a = net.add('a');
        net.add('b');
        a.editor.onPeerChannelOpen('b');
        assert.equal(net.sent.length, 0);
    });

    it('lets only the presenter lock, edit while locked and open the editor for everyone', () => {
        const net = createNetwork(RoomEditor, ['p']);
        const p = net.add('p');
        const b = net.add('b');

        b.editor.setLocked(true);
        b.editor.openForEveryone();
        assert.equal(net.sent.length, 0);

        p.editor.setLocked(true);
        net.flush();
        assert.equal(b.editor.isReadOnly(), true);
        assert.equal(p.editor.isReadOnly(), false);

        // Forged messages from a non-presenter are ignored while locked
        p.editor.handleMessage('b', { type: 'editor', action: 'delta', ops: [{ insert: 'evil' }], clock: 99 });
        p.editor.handleMessage('b', { type: 'editor', action: 'lock', locked: false });
        p.editor.handleMessage('b', { type: 'editor', action: 'open' });
        assert.equal(p.quill.getText(), '\n');
        assert.equal(p.editor.locked, true);
        assert.equal(net.opened.length, 0);

        p.quill.type(0, 'Only me');
        p.editor.openForEveryone();
        net.flush();
        assert.equal(b.quill.getText(), 'Only me\n');
        assert.deepEqual(net.opened, [{ id: 'b', peerId: 'p' }]);
    });

    it('chunks large payloads and reassembles them on the receiver', () => {
        const net = createNetwork(RoomEditor);
        const a = net.add('a');
        const b = net.add('b');
        const big = 'lorem ipsum '.repeat(5000);
        a.quill.type(0, big);
        net.flush();
        assert.equal(b.quill.getText(), `${big}\n`);
        const chunks = net.sent.map((message) => JSON.parse(message.raw)).filter((m) => m.action === 'chunk');
        assert.ok(chunks.length > 1);
        assert.ok(chunks.every((chunk) => chunk.data.length <= RoomEditor.CHUNK_SIZE));
    });

    it('drops incomplete or malformed chunks', () => {
        const net = createNetwork(RoomEditor);
        const b = net.add('b');
        b.editor.handleMessage('a', { type: 'editor', action: 'chunk', id: 'x', index: 0, total: 2, data: '{"type"' });
        b.editor.handleMessage('a', { type: 'editor', action: 'chunk', id: 'x', index: 5, total: 2, data: '' });
        b.editor.handleMessage('a', { type: 'editor', action: 'chunk', id: 'y', index: 0, total: 9999, data: '' });
        assert.equal(b.editor.chunks.size, 1);
        clock.tick(RoomEditor.CHUNK_TTL_MS + 1);
        b.editor.handleMessage('a', { type: 'editor', action: 'chunk', id: 'z', index: 0, total: 2, data: '' });
        assert.equal(b.editor.chunks.has('a:x'), false);
        b.editor.removePeer('a');
        assert.equal(b.editor.chunks.size, 0);
    });

    it('sanitizes remote ops: no embeds, whitelisted attributes and safe links only', () => {
        assert.equal(RoomEditor.sanitizeOps([{ insert: { image: 'https://tracker.example/x.png' } }]), null);
        assert.equal(RoomEditor.sanitizeOps('nope'), null);
        assert.equal(RoomEditor.sanitizeOps([{ retain: -1 }]), null);

        const ops = RoomEditor.sanitizeOps([
            {
                insert: 'hi',
                attributes: {
                    bold: true,
                    onclick: 'alert(1)',
                    link: 'javascript:alert(1)',
                    color: 'red;background:url(x)',
                    __proto__: { polluted: true },
                },
            },
            { insert: 'site', attributes: { link: 'https://mirotalk.com', header: 2, italic: null } },
            { delete: 3, attributes: { bold: true } },
        ]);
        assert.deepEqual(JSON.parse(JSON.stringify(ops)), [
            { insert: 'hi', attributes: { bold: true } },
            { insert: 'site', attributes: { link: 'https://mirotalk.com', header: 2, italic: null } },
            { delete: 3 },
        ]);
    });

    it('is wired into the room UI and the chat data channel', () => {
        assert.match(clientHtml, /quill@2\.0\.3\/dist\/quill\.js/);
        assert.match(clientHtml, /src="\.\.\/js\/editor\.js"/);
        assert.match(clientHtml, /id="editorRoom"[^>]*/);
        assert.match(clientHtml, /class="editor-body notranslate" translate="no"/);
        assert.match(clientJs, /case 'editor':\s*roomEditor\?\.handleMessage\(peer_id, dataMessage\)/);
        assert.match(clientJs, /roomEditor\?\.onPeerChannelOpen\(peer_id\)/);
    });
});
