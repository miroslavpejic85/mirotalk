'use strict';

// Minimal WebM duration fixer (no deps). Exposes: window.FixWebmDuration(blob, durationMs) -> Promise<Blob>
(function () {
    // IDs chosen to match the simple VINT reader below
    const ID = {
        Segment: 0x8538067,
        Info: 0x549a966,
        TimecodeScale: 0xad7b1,
        Duration: 0x489,
    };

    // Base element
    function WebmBase(name, type) {
        this.name = name || 'Unknown';
        this.type = type || 'Unknown';
    }
    WebmBase.prototype.updateBySource = function () {};
    WebmBase.prototype.setSource = function (source) {
        this.source = source;
        this.updateBySource();
    };
    WebmBase.prototype.updateByData = function () {};
    WebmBase.prototype.setData = function (data) {
        this.data = data;
        this.updateByData();
    };

    // Uint (stored as hex string)
    function WebmUint() {
        WebmBase.call(this, 'Uint', 'Uint');
    }
    WebmUint.prototype = Object.create(WebmBase.prototype);
    WebmUint.prototype.constructor = WebmUint;
    const padHex = (h) => (h.length % 2 === 1 ? '0' + h : h);
    WebmUint.prototype.updateBySource = function () {
        this.data = '';
        for (let i = 0; i < this.source.length; i++) this.data += padHex(this.source[i].toString(16));
    };
    WebmUint.prototype.updateByData = function () {
        const len = this.data.length / 2;
        this.source = new Uint8Array(len);
        for (let i = 0; i < len; i++) this.source[i] = parseInt(this.data.substr(i * 2, 2), 16);
    };
    WebmUint.prototype.getValue = function () {
        return parseInt(this.data, 16);
    };
    WebmUint.prototype.setValue = function (v) {
        this.setData(padHex(v.toString(16)));
    };

    // Float (4 or 8 bytes)
    function WebmFloat() {
        WebmBase.call(this, 'Float', 'Float');
    }
    WebmFloat.prototype = Object.create(WebmBase.prototype);
    WebmFloat.prototype.constructor = WebmFloat;
    WebmFloat.prototype._arrType = function () {
        return this.source && this.source.length === 4 ? Float32Array : Float64Array;
    };
    WebmFloat.prototype.updateBySource = function () {
        const bytes = this.source.slice().reverse();
        const T = this._arrType();
        this.data = new T(bytes.buffer)[0];
    };
    WebmFloat.prototype.updateByData = function () {
        const T = this._arrType();
        const fa = new T([this.data]);
        const bytes = new Uint8Array(fa.buffer);
        this.source = bytes.reverse();
    };
    WebmFloat.prototype.getValue = function () {
        return this.data;
    };
    WebmFloat.prototype.setValue = function (v) {
        this.setData(v);
    };

    // Container with VINT read/write
    function WebmContainer(name) {
        WebmBase.call(this, name || 'Container', 'Container');
    }
    WebmContainer.prototype = Object.create(WebmBase.prototype);
    WebmContainer.prototype.constructor = WebmContainer;
    WebmContainer.prototype.readByte = function () {
        return this.source[this.offset++];
    };
    WebmContainer.prototype.readVint = function () {
        const b0 = this.readByte();
        const bytes = 8 - b0.toString(2).length;
        let v = b0 - (1 << (7 - bytes));
        for (let i = 0; i < bytes; i++) {
            v = v * 256 + this.readByte();
        }
        return v;
    };
    WebmContainer.prototype.updateBySource = function () {
        this.data = [];
        for (this.offset = 0; this.offset < this.source.length; ) {
            const id = this.readVint();
            const len = this.readVint();
            const end = Math.min(this.offset + len, this.source.length);
            const bytes = this.source.slice(this.offset, end);

            let ctor = WebmBase;
            if (id === ID.Segment || id === ID.Info) ctor = WebmContainer;
            else if (id === ID.TimecodeScale) ctor = WebmUint;
            else if (id === ID.Duration) ctor = WebmFloat;

            const elem = new ctor();
            elem.setSource(bytes);
            this.data.push({ id, data: elem });
            this.offset = end;
        }
    };
    WebmContainer.prototype.writeVint = function (x, draft) {
        let bytes = 1,
            flag = 0x80;
        while (x >= flag && bytes < 8) {
            bytes++;
            flag *= 0x80;
        }
        if (!draft) {
            let val = flag + x;
            for (let i = bytes - 1; i >= 0; i--) {
                const c = val % 256;
                this.source[this.offset + i] = c;
                val = (val - c) / 256;
            }
        }
        this.offset += bytes;
    };
    WebmContainer.prototype.writeSections = function (draft) {
        this.offset = 0;
        for (const s of this.data) {
            const content = s.data.source;
            const len = content.length;
            this.writeVint(s.id, draft);
            this.writeVint(len, draft);
            if (!draft) this.source.set(content, this.offset);
            this.offset += len;
        }
        return this.offset;
    };
    WebmContainer.prototype.updateByData = function () {
        const len = this.writeSections(true);
        this.source = new Uint8Array(len);
        this.writeSections(false);
    };
    WebmContainer.prototype.getSectionById = function (id) {
        for (const s of this.data) if (s.id === id) return s.data;
        return null;
    };

    // File = top-level container
    function WebmFile(src) {
        WebmContainer.call(this, 'File');
        this.setSource(src);
    }
    WebmFile.prototype = Object.create(WebmContainer.prototype);
    WebmFile.prototype.constructor = WebmFile;
    WebmFile.prototype.toBlob = function (mime) {
        return new Blob([this.source.buffer], { type: mime || 'video/webm' });
    };
    WebmFile.prototype.fixDuration = function (durationMs) {
        const segment = this.getSectionById(ID.Segment);
        if (!segment) return false;
        const info = segment.getSectionById(ID.Info);
        if (!info) return false;
        let scale = info.getSectionById(ID.TimecodeScale);
        if (!scale) return false;
        // Ensure 1ms scale for a simple duration (ms) value
        scale.setValue(1000000);

        let dur = info.getSectionById(ID.Duration);
        if (dur) {
            if (dur.getValue() > 0) return false; // already valid
            dur.setValue(durationMs);
        } else {
            dur = new WebmFloat();
            dur.setValue(durationMs);
            info.data.push({ id: ID.Duration, data: dur });
        }
        // Rebuild buffers up the tree
        info.updateByData();
        segment.updateByData();
        this.updateByData();
        return true;
    };

    async function FixWebmDuration(blob, durationMs) {
        if (!blob || blob.type.indexOf('webm') === -1) return blob;
        try {
            const buf = await blob.arrayBuffer();
            const file = new WebmFile(new Uint8Array(buf));
            if (file.fixDuration(Math.max(0, Number(durationMs) || 0))) {
                return file.toBlob(blob.type);
            }
        } catch (_) {
            /* ignore, fallback to original */
        }
        return blob;
    }

    window.FixWebmDuration = FixWebmDuration;
})();
