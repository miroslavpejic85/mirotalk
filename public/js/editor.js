'use strict';

/**
 * Shared room editor (lite) synced peer-to-peer over the existing RTC chat DataChannels.
 * The signaling server never sees the document: every peer keeps its own copy.
 *
 * Sync model:
 *  - 'delta'    live Quill deltas, applied in arrival order (low latency).
 *  - 'snapshot' full document sent after the local editor goes idle, stamped with a
 *               Lamport clock + peer id. Every peer keeps the highest stamp, so concurrent
 *               edits that diverged converge to the same document.
 *  - 'sync'     snapshot sent to a peer whose data channel just opened (late joiners).
 *  - 'lock'     presenter-only read-only mode for the other participants.
 *  - 'open'     presenter-only request to open the editor for everyone.
 * Payloads bigger than CHUNK_SIZE are split into 'chunk' messages and reassembled.
 */
class RoomEditor {
    static CHUNK_SIZE = 16000;
    static MAX_CHUNKS = 256;
    static CHUNK_TTL_MS = 30000;
    static MAX_OPS = 20000;
    static MAX_INSERT_LENGTH = 1000000;
    static SNAPSHOT_IDLE_MS = 1200;
    static SNAPSHOT_MAX_WAIT_MS = 5000;

    static TOOLBAR = [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
        [{ align: [] }],
        ['blockquote', 'code-block', 'link'],
        ['clean'],
    ];

    static FORMATS = [
        'header',
        'bold',
        'italic',
        'underline',
        'strike',
        'color',
        'background',
        'list',
        'align',
        'indent',
        'blockquote',
        'code-block',
        'code',
        'link',
        'script',
    ];

    static isBool = (v) => typeof v === 'boolean';
    static isColor = (v) => typeof v === 'string' && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{1,20})$/i.test(v);
    static isInt = (min, max) => (v) => Number.isInteger(v) && v >= min && v <= max;
    static isOneOf = (values) => (v) => values.includes(v);

    // Attribute whitelist applied to every remote op (null always allowed: it removes a format)
    static ATTRIBUTES = {
        bold: RoomEditor.isBool,
        italic: RoomEditor.isBool,
        underline: RoomEditor.isBool,
        strike: RoomEditor.isBool,
        code: RoomEditor.isBool,
        blockquote: RoomEditor.isBool,
        color: RoomEditor.isColor,
        background: RoomEditor.isColor,
        header: RoomEditor.isInt(1, 6),
        indent: RoomEditor.isInt(1, 8),
        list: RoomEditor.isOneOf(['ordered', 'bullet', 'checked', 'unchecked']),
        align: RoomEditor.isOneOf(['center', 'right', 'justify']),
        script: RoomEditor.isOneOf(['sub', 'super']),
        'code-block': (v) => v === true || (typeof v === 'string' && /^[a-z0-9+#-]{1,20}$/i.test(v)),
        link: (v) => typeof v === 'string' && v.length <= 2048 && /^(https?:\/\/|mailto:)/i.test(v.trim()),
    };

    /**
     * @param {object} options
     * @param {HTMLElement} [options.container] element hosting the Quill editor
     * @param {object} [options.quill] pre-built Quill-like instance (tests)
     * @param {function} options.send (payload, peerId?) => void, broadcast when peerId is omitted
     * @param {function} options.getMyPeerId () => string
     * @param {function} options.isPresenter () => boolean, local peer is presenter
     * @param {function} options.isPeerPresenter (peerId) => boolean
     * @param {function} [options.onLockChange] (locked, peerId, isLocal) => void
     * @param {function} [options.onOpenRequest] (peerId) => void
     */
    constructor(options) {
        this.send = options.send;
        this.getMyPeerId = options.getMyPeerId || (() => '');
        this.isPresenter = options.isPresenter || (() => false);
        this.isPeerPresenter = options.isPeerPresenter || (() => false);
        this.onLockChange = options.onLockChange || (() => {});
        this.onOpenRequest = options.onOpenRequest || (() => {});

        this.clock = 0;
        this.docClock = 0;
        this.docPeer = '';
        this.dirty = false;
        this.dirtySince = 0;
        this.snapshotTimer = null;
        this.locked = false;
        this.chunks = new Map();

        this.quill = options.quill || RoomEditor.createQuill(options.container);
        this.quill.on('text-change', (delta, oldDelta, source) => this.handleLocalChange(delta, source));
    }

    static isSupported() {
        return typeof window !== 'undefined' && typeof window.Quill === 'function';
    }

    static createQuill(container) {
        return new window.Quill(container, {
            theme: 'snow',
            placeholder: 'Write something together...',
            formats: RoomEditor.FORMATS,
            modules: { toolbar: RoomEditor.TOOLBAR },
        });
    }

    // ####################################################
    // LOCAL
    // ####################################################

    handleLocalChange(delta, source) {
        if (source !== 'user') return;
        if (this.isReadOnly()) return;
        if (!this.dirty) {
            this.dirty = true;
            this.dirtySince = Date.now();
        }
        this.transmit({ type: 'editor', action: 'delta', ops: delta.ops, clock: ++this.clock });
        this.scheduleSnapshot();
    }

    scheduleSnapshot() {
        clearTimeout(this.snapshotTimer);
        const elapsed = Date.now() - this.dirtySince;
        const wait = Math.max(0, Math.min(RoomEditor.SNAPSHOT_IDLE_MS, RoomEditor.SNAPSHOT_MAX_WAIT_MS - elapsed));
        this.snapshotTimer = setTimeout(() => this.sendSnapshot(), wait);
    }

    sendSnapshot() {
        clearTimeout(this.snapshotTimer);
        this.snapshotTimer = null;
        if (!this.dirty) return;
        this.dirty = false;
        this.docClock = ++this.clock;
        this.docPeer = String(this.getMyPeerId() || '');
        this.transmit({ type: 'editor', action: 'snapshot', ops: this.getOps(), clock: this.docClock });
    }

    setLocked(locked) {
        if (!this.isPresenter()) return;
        this.applyLock(!!locked, this.getMyPeerId(), true);
        this.transmit({ type: 'editor', action: 'lock', locked: this.locked });
    }

    openForEveryone() {
        if (!this.isPresenter()) return;
        this.transmit({ type: 'editor', action: 'open' });
    }

    clear() {
        if (this.isReadOnly()) return;
        this.quill.setContents([], 'user');
    }

    /**
     * A data channel towards peerId just opened: share the current document with the newcomer
     * @param {string} peerId
     */
    onPeerChannelOpen(peerId) {
        if (this.isEmpty() && !this.locked) return;
        this.transmit(
            {
                type: 'editor',
                action: 'sync',
                ops: this.getOps(),
                clock: this.docClock,
                docPeer: this.docPeer,
                locked: this.locked,
            },
            peerId
        );
    }

    removePeer(peerId) {
        for (const key of this.chunks.keys()) {
            if (key.startsWith(`${peerId}:`)) this.chunks.delete(key);
        }
    }

    // ####################################################
    // REMOTE
    // ####################################################

    /**
     * Handle a message received on the chat data channel
     * @param {string} peerId sender (known from the channel, never from the payload)
     * @param {object} data parsed message with type 'editor'
     */
    handleMessage(peerId, data) {
        if (!data || typeof data !== 'object' || typeof peerId !== 'string') return;
        switch (data.action) {
            case 'chunk':
                return this.handleChunk(peerId, data);
            case 'delta':
                return this.handleDelta(peerId, data);
            case 'snapshot':
                return this.handleSnapshot(peerId, data, false);
            case 'sync':
                return this.handleSnapshot(peerId, data, true);
            case 'lock':
                if (this.isPeerPresenter(peerId) && typeof data.locked === 'boolean') {
                    this.applyLock(data.locked, peerId, false);
                }
                return;
            case 'open':
                if (this.isPeerPresenter(peerId)) this.onOpenRequest(peerId);
                return;
            default:
                return;
        }
    }

    handleDelta(peerId, data) {
        const ops = RoomEditor.sanitizeOps(data.ops);
        const clock = RoomEditor.toClock(data.clock);
        if (!ops || clock === null) return;
        if (this.locked && !this.isPeerPresenter(peerId)) return;
        this.observeClock(clock);
        this.quill.updateContents(ops, 'api');
    }

    handleSnapshot(peerId, data, isSync) {
        const ops = RoomEditor.sanitizeOps(data.ops);
        const clock = RoomEditor.toClock(data.clock);
        if (!ops || clock === null) return;
        this.observeClock(clock);

        if (isSync && typeof data.locked === 'boolean' && this.isPeerPresenter(peerId)) {
            this.applyLock(data.locked, peerId, false);
        }
        if (!isSync && this.locked && !this.isPeerPresenter(peerId)) return;
        // Our pending snapshot will carry a higher clock and win everywhere
        if (this.dirty) return;

        const docPeer = isSync ? String(data.docPeer || '').slice(0, 100) : peerId;
        const pristine = this.docClock === 0 && this.docPeer === '';
        if (!this.isNewerStamp(clock, docPeer) && !(isSync && pristine)) return;

        this.docClock = clock;
        this.docPeer = docPeer;
        this.setContentsPreservingSelection(ops);
    }

    handleChunk(peerId, data) {
        const { id, index, total, data: piece } = data;
        if (typeof id !== 'string' || id.length > 64 || typeof piece !== 'string') return;
        if (!Number.isInteger(total) || total < 2 || total > RoomEditor.MAX_CHUNKS) return;
        if (!Number.isInteger(index) || index < 0 || index >= total) return;

        const now = Date.now();
        for (const [key, entry] of this.chunks) {
            if (now - entry.ts > RoomEditor.CHUNK_TTL_MS) this.chunks.delete(key);
        }

        const key = `${peerId}:${id}`;
        let entry = this.chunks.get(key);
        if (!entry) {
            entry = { total, parts: new Array(total), received: 0, ts: now };
            this.chunks.set(key, entry);
        }
        if (entry.total !== total || entry.parts[index] !== undefined) return;
        if (piece.length > RoomEditor.CHUNK_SIZE) return this.chunks.delete(key);
        entry.parts[index] = piece;
        entry.received++;
        if (entry.received < total) return;

        this.chunks.delete(key);
        let message;
        try {
            message = JSON.parse(entry.parts.join(''));
        } catch (err) {
            return;
        }
        if (message?.type !== 'editor' || message.action === 'chunk') return;
        this.handleMessage(peerId, message);
    }

    // ####################################################
    // HELPERS
    // ####################################################

    transmit(payload, peerId) {
        const json = JSON.stringify(payload);
        if (json.length <= RoomEditor.CHUNK_SIZE) return this.send(payload, peerId);

        const total = Math.ceil(json.length / RoomEditor.CHUNK_SIZE);
        if (total > RoomEditor.MAX_CHUNKS) {
            console.warn('RoomEditor: document too large to share', { size: json.length });
            return;
        }
        const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
        for (let index = 0; index < total; index++) {
            const data = json.slice(index * RoomEditor.CHUNK_SIZE, (index + 1) * RoomEditor.CHUNK_SIZE);
            this.send({ type: 'editor', action: 'chunk', id, index, total, data }, peerId);
        }
    }

    applyLock(locked, peerId, isLocal) {
        if (this.locked === locked) return;
        this.locked = locked;
        this.applyReadOnly();
        this.onLockChange(locked, peerId, isLocal);
    }

    applyReadOnly() {
        this.quill.enable(!this.isReadOnly());
    }

    isReadOnly() {
        return this.locked && !this.isPresenter();
    }

    observeClock(clock) {
        this.clock = Math.max(this.clock, clock);
    }

    isNewerStamp(clock, peerId) {
        return clock > this.docClock || (clock === this.docClock && peerId > this.docPeer);
    }

    setContentsPreservingSelection(ops) {
        if (JSON.stringify(this.getOps()) === JSON.stringify(ops)) return;
        const range = this.quill.getSelection();
        this.quill.setContents(ops, 'api');
        if (range) {
            const index = Math.max(0, Math.min(range.index, this.quill.getLength() - 1));
            this.quill.setSelection(index, 0, 'silent');
        }
    }

    getOps() {
        return this.quill.getContents().ops;
    }

    getText() {
        return this.quill.getText();
    }

    getHTML() {
        if (typeof this.quill.getSemanticHTML === 'function') return this.quill.getSemanticHTML();
        return this.quill.root ? this.quill.root.innerHTML : '';
    }

    isEmpty() {
        return this.quill.getLength() <= 1;
    }

    static toClock(value) {
        return Number.isSafeInteger(value) && value >= 0 ? value : null;
    }

    /**
     * Keep only text ops with whitelisted attributes; drop embeds (images, videos, ...)
     * so remote peers can't make us load arbitrary URLs.
     * @param {Array} ops Quill delta ops
     * @returns {Array|null} sanitized ops or null when invalid
     */
    static sanitizeOps(ops) {
        if (!Array.isArray(ops) || ops.length > RoomEditor.MAX_OPS) return null;
        const clean = [];
        for (const op of ops) {
            if (!op || typeof op !== 'object') return null;
            const next = {};
            if (typeof op.insert === 'string') {
                if (op.insert.length > RoomEditor.MAX_INSERT_LENGTH) return null;
                next.insert = op.insert;
            } else if (Number.isSafeInteger(op.retain) && op.retain > 0) {
                next.retain = op.retain;
            } else if (Number.isSafeInteger(op.delete) && op.delete > 0) {
                next.delete = op.delete;
            } else {
                return null;
            }
            if (next.delete === undefined && op.attributes && typeof op.attributes === 'object') {
                const attributes = {};
                for (const [name, value] of Object.entries(op.attributes)) {
                    const validate = Object.prototype.hasOwnProperty.call(RoomEditor.ATTRIBUTES, name)
                        ? RoomEditor.ATTRIBUTES[name]
                        : null;
                    if (validate && (value === null || validate(value))) attributes[name] = value;
                }
                if (Object.keys(attributes).length) next.attributes = attributes;
            }
            clean.push(next);
        }
        return clean;
    }
}
