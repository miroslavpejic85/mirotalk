'use strict';

/**
 * Room background (browser-only, zero server cost).
 *
 * Each user can place an image behind the video grid. Nothing is sent to the server or to other peers:
 * - presets are bundled static images (public/images/room-background)
 * - uploads are downscaled on a canvas and kept in IndexedDB
 * - the selection (per room, or for all rooms) and the dim level live in localStorage
 */

const ROOM_BG_STORAGE_KEY = 'ROOM_BACKGROUND';
const ROOM_BG_DB_NAME = 'roomBackgroundDB';
const ROOM_BG_DB_STORE = 'images';
const ROOM_BG_MAX_SIDE = 1920;
const ROOM_BG_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ROOM_BG_MAX_ROOMS = 50;
const ROOM_BG_DEFAULT_DIM = 35;
const ROOM_BG_MAX_DIM = 80;
const ROOM_BG_PRESET_PATTERN = /^\.\.\/images\/room-background\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)$/i;
const ROOM_BG_CUSTOM_ID_PATTERN = /^custom-[A-Za-z0-9-]+$/;
const ROOM_BG_PRESETS = ['forest', 'beach', 'mountains', 'lake', 'aurora', 'abstract'].map(
    (name) => `../images/room-background/${name}.webp`
);

// Minimal IndexedDB blob store (room background uploads, camera background upload)
function createImageStore(dbName, storeName = 'images') {
    return {
        open() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(dbName, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        async run(mode, action) {
            const db = await this.open();
            try {
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction(storeName, mode);
                    const request = action(tx.objectStore(storeName));
                    tx.oncomplete = () => resolve(request?.result);
                    tx.onerror = () => reject(tx.error);
                    tx.onabort = () => reject(tx.error);
                });
            } finally {
                db.close();
            }
        },

        get(id) {
            return this.run('readonly', (store) => store.get(id));
        },

        put(id, blob) {
            return this.run('readwrite', (store) => store.put(blob, id));
        },

        remove(id) {
            return this.run('readwrite', (store) => store.delete(id));
        },

        keys() {
            return this.run('readonly', (store) => store.getAllKeys());
        },
    };
}

const roomBackgroundDB = createImageStore(ROOM_BG_DB_NAME, ROOM_BG_DB_STORE);

class RoomBackground {
    constructor({
        roomId,
        getPresets = () => ROOM_BG_PRESETS,
        storage = window.localStorage,
        db = roomBackgroundDB,
        userLog = () => {},
        doc = document,
    } = {}) {
        this.roomId = String(roomId || '');
        this.getPresets = getPresets;
        this.storage = storage;
        this.db = db;
        this.userLog = userLog;
        this.doc = doc;
        this.objectUrl = null;
        this.applyToken = 0;
        this.state = this.loadState();
        this.dom = {};
    }

    // ####################################################
    // STATE
    // ####################################################

    defaultState() {
        return { dim: ROOM_BG_DEFAULT_DIM, global: null, rooms: {} };
    }

    isValidSelection(selection) {
        if (!selection || typeof selection !== 'object') return false;
        if (selection.type === 'none') return true;
        if (selection.type === 'preset') return this.isValidPreset(selection.value);
        if (selection.type === 'custom') return ROOM_BG_CUSTOM_ID_PATTERN.test(selection.value || '');
        return false;
    }

    isValidPreset(value) {
        return typeof value === 'string' && ROOM_BG_PRESET_PATTERN.test(value);
    }

    clampDim(value) {
        const dim = Number(value);
        if (!Number.isFinite(dim)) return ROOM_BG_DEFAULT_DIM;
        return Math.min(ROOM_BG_MAX_DIM, Math.max(0, Math.round(dim)));
    }

    loadState() {
        const state = this.defaultState();
        try {
            const saved = JSON.parse(this.storage.getItem(ROOM_BG_STORAGE_KEY) || 'null');
            if (!saved || typeof saved !== 'object') return state;
            state.dim = this.clampDim(saved.dim);
            if (this.isValidSelection(saved.global)) {
                state.global = { type: saved.global.type, value: saved.global.value };
            }
            if (saved.rooms && typeof saved.rooms === 'object') {
                for (const [room, selection] of Object.entries(saved.rooms)) {
                    if (!this.isValidSelection(selection)) continue;
                    state.rooms[room] = {
                        type: selection.type,
                        value: selection.value,
                        ts: Number(selection.ts) || 0,
                    };
                }
            }
        } catch (error) {
            console.warn('Room background: invalid saved settings, resetting', error);
        }
        return state;
    }

    saveState() {
        const rooms = Object.entries(this.state.rooms).sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));
        this.state.rooms = Object.fromEntries(rooms.slice(0, ROOM_BG_MAX_ROOMS));
        try {
            this.storage.setItem(ROOM_BG_STORAGE_KEY, JSON.stringify(this.state));
        } catch (error) {
            console.warn('Room background: unable to save settings', error);
        }
    }

    hasRoomOverride() {
        return Object.prototype.hasOwnProperty.call(this.state.rooms, this.roomId);
    }

    isAllRooms() {
        return !this.hasRoomOverride() && !!this.state.global;
    }

    getSelection() {
        if (this.hasRoomOverride()) return this.state.rooms[this.roomId];
        return this.state.global || { type: 'none' };
    }

    setSelection(selection, allRooms = this.isAllRooms()) {
        const next = selection.type === 'none' ? { type: 'none' } : { type: selection.type, value: selection.value };
        if (allRooms) {
            this.state.global = next;
            this.state.rooms = {};
        } else {
            this.state.rooms[this.roomId] = { ...next, ts: Date.now() };
        }
        this.saveState();
    }

    referencedCustomIds() {
        const selections = [this.state.global, ...Object.values(this.state.rooms)];
        return new Set(selections.filter((s) => s?.type === 'custom').map((s) => s.value));
    }

    async pruneCustomImages() {
        try {
            const used = this.referencedCustomIds();
            const keys = await this.db.keys();
            await Promise.all(keys.filter((key) => !used.has(key)).map((key) => this.db.remove(key)));
        } catch (error) {
            console.warn('Room background: unable to clean stored images', error);
        }
    }

    // ####################################################
    // RENDER BACKGROUND
    // ####################################################

    ensureLayer() {
        let layer = this.doc.getElementById('roomBackgroundLayer');
        if (!layer) {
            layer = this.doc.createElement('div');
            layer.id = 'roomBackgroundLayer';
            layer.setAttribute('aria-hidden', 'true');
            this.doc.body.prepend(layer);
        }
        return layer;
    }

    applyDim() {
        this.doc.documentElement.style.setProperty('--room-bg-dim', String(this.state.dim / 100));
    }

    revokeObjectUrl() {
        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = null;
        }
    }

    async resolveUrl(selection) {
        if (selection.type === 'preset') return selection.value;
        if (selection.type !== 'custom') return null;
        const blob = await this.db.get(selection.value);
        if (!blob || typeof blob.type !== 'string' || !blob.type.startsWith('image/')) return null;
        return URL.createObjectURL(blob);
    }

    async apply() {
        const token = ++this.applyToken;
        const layer = this.ensureLayer();
        const selection = this.getSelection();
        this.applyDim();

        let url = null;
        try {
            url = await this.resolveUrl(selection);
        } catch (error) {
            console.warn('Room background: unable to load image', error);
        }
        if (token !== this.applyToken) {
            if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
            return;
        }

        this.revokeObjectUrl();
        if (url?.startsWith('blob:')) this.objectUrl = url;

        layer.style.backgroundImage = url ? `url("${url}")` : '';
        this.doc.body.classList.toggle('room-bg-active', !!url);
        this.updateUI();
    }

    // ####################################################
    // UPLOAD
    // ####################################################

    async loadImage(file) {
        if (typeof createImageBitmap === 'function') {
            try {
                return await createImageBitmap(file);
            } catch (error) {
                console.warn('Room background: createImageBitmap failed, falling back to <img>', error);
            }
        }
        const url = URL.createObjectURL(file);
        try {
            const img = new Image();
            img.src = url;
            await img.decode();
            return img;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    canvasToBlob(canvas, type, quality) {
        return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    }

    async downscale(file) {
        const source = await this.loadImage(file);
        const width = source.width || source.naturalWidth;
        const height = source.height || source.naturalHeight;
        if (!width || !height) throw new Error('Empty image');

        const scale = Math.min(1, ROOM_BG_MAX_SIDE / Math.max(width, height));
        const canvas = this.doc.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
        source.close?.();

        const webp = await this.canvasToBlob(canvas, 'image/webp', 0.82);
        if (webp?.type === 'image/webp') return webp;
        const jpeg = await this.canvasToBlob(canvas, 'image/jpeg', 0.85);
        if (!jpeg) throw new Error('Unable to encode image');
        return jpeg;
    }

    newCustomId() {
        const random =
            typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
        return `custom-${Date.now()}-${random}`.replace(/[^A-Za-z0-9-]/g, '');
    }

    async upload(file) {
        if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
            this.userLog('warning', 'Please choose an image file');
            return false;
        }
        if (file.size > ROOM_BG_MAX_UPLOAD_BYTES) {
            this.userLog('warning', 'The image is too large (max 25 MB)');
            return false;
        }
        try {
            const blob = await this.downscale(file);
            const id = this.newCustomId();
            await this.db.put(id, blob);
            this.setSelection({ type: 'custom', value: id });
            await this.apply();
            await this.pruneCustomImages();
            return true;
        } catch (error) {
            console.error('Room background: upload failed', error);
            this.userLog('error', 'Unable to use this image as room background');
            return false;
        }
    }

    // ####################################################
    // SETTINGS UI
    // ####################################################

    async select(selection) {
        this.setSelection(selection);
        await this.apply();
        await this.pruneCustomImages();
    }

    setDim(value) {
        this.state.dim = this.clampDim(value);
        this.applyDim();
        this.saveState();
        if (this.dom.dimValue) this.dom.dimValue.textContent = `${this.state.dim}%`;
    }

    setAllRooms(enabled) {
        const current = this.getSelection();
        if (enabled) {
            this.setSelection(current, true);
        } else {
            this.state.rooms[this.roomId] = { ...current, ts: Date.now() };
            this.state.global = null;
            this.saveState();
        }
        this.updateUI();
        this.pruneCustomImages();
    }

    label() {
        const i18n = globalThis.i18n;
        return typeof i18n?.t === 'function' ? i18n.t('Room background', 'labels') : 'Room background';
    }

    createPresetCard(url) {
        const card = this.doc.createElement('button');
        card.type = 'button';
        card.className = 'room-bg-card';
        card.dataset.bgType = 'preset';
        card.dataset.bgValue = url;
        card.setAttribute('aria-label', this.label());
        const img = this.doc.createElement('img');
        img.src = url;
        img.alt = '';
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
        card.appendChild(img);
        card.addEventListener('click', () => this.select({ type: 'preset', value: url }));
        return card;
    }

    renderPresets() {
        const grid = this.dom.grid;
        grid.querySelectorAll('.room-bg-card[data-bg-type="preset"]').forEach((card) => card.remove());
        const presets = [...new Set(this.getPresets() || [])].filter((url) => this.isValidPreset(url));
        presets.forEach((url) => grid.appendChild(this.createPresetCard(url)));
    }

    updateUI() {
        const { grid, customCard, dim, dimValue, allRooms } = this.dom;
        if (!grid) return;
        const selection = this.getSelection();

        if (customCard) {
            const isCustom = selection.type === 'custom' && !!this.objectUrl;
            customCard.classList.toggle('hidden', !isCustom);
            customCard.style.backgroundImage = isCustom ? `url("${this.objectUrl}")` : '';
        }

        grid.querySelectorAll('.room-bg-card').forEach((card) => {
            const type = card.dataset.bgType;
            const active =
                (type === 'none' && selection.type === 'none') ||
                (type === 'custom' && selection.type === 'custom') ||
                (type === 'preset' && selection.type === 'preset' && card.dataset.bgValue === selection.value);
            card.classList.toggle('active', active);
            card.setAttribute('aria-pressed', String(active));
        });

        if (dim) dim.value = String(this.state.dim);
        if (dimValue) dimValue.textContent = `${this.state.dim}%`;
        if (allRooms) allRooms.checked = this.isAllRooms();
    }

    bindUI() {
        const $ = (id) => this.doc.getElementById(id);
        this.dom = {
            grid: $('roomBackgroundGrid'),
            noneCard: $('roomBackgroundNone'),
            uploadCard: $('roomBackgroundUpload'),
            customCard: $('roomBackgroundCustom'),
            fileInput: $('roomBackgroundFile'),
            dim: $('roomBackgroundDim'),
            dimValue: $('roomBackgroundDimValue'),
            allRooms: $('roomBackgroundAllRooms'),
        };
        const { grid, noneCard, uploadCard, customCard, fileInput, dim, allRooms } = this.dom;
        if (!grid) return;

        customCard?.setAttribute('aria-label', this.label());

        this.renderPresets();

        noneCard?.addEventListener('click', () => this.select({ type: 'none' }));
        customCard?.addEventListener('click', () => {
            const selection = this.getSelection();
            if (selection.type === 'custom') this.select(selection);
        });
        uploadCard?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', async () => {
            const [file] = fileInput.files || [];
            fileInput.value = '';
            if (file) await this.upload(file);
        });
        grid.addEventListener('dragover', (event) => {
            event.preventDefault();
            grid.classList.add('drag-over');
        });
        grid.addEventListener('dragleave', () => grid.classList.remove('drag-over'));
        grid.addEventListener('drop', async (event) => {
            event.preventDefault();
            grid.classList.remove('drag-over');
            const [file] = event.dataTransfer?.files || [];
            if (file) await this.upload(file);
        });
        dim?.addEventListener('input', () => this.setDim(dim.value));
        allRooms?.addEventListener('change', () => this.setAllRooms(allRooms.checked));
    }

    async init() {
        this.bindUI();
        await this.apply();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RoomBackground, roomBackgroundDB, createImageStore, ROOM_BG_PRESETS };
}
