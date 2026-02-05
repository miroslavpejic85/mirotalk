'use strict';

/**
 * Custom Room page: build /join URL from form settings.
 *
 * Query params used by client.js:
 * - room, name, avatar, audio, video, screen, chat, hide, notify, duration, token
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('customizeRoomForm');
    const errorEl = document.getElementById('crError');
    const statusEl = document.getElementById('crStatus');
    const previewEl = document.getElementById('crPreviewUrl');
    const copyBtn = document.getElementById('crCopy');
    const randomRoomBtn = document.getElementById('crRandomRoom');

    const roomEl = document.getElementById('room');
    const nameEl = document.getElementById('name');
    const avatarEl = document.getElementById('avatar');
    const tokenEl = document.getElementById('token');

    const durationEl = document.getElementById('duration');

    const audioEl = document.getElementById('audio');
    const videoEl = document.getElementById('video');
    const screenEl = document.getElementById('screen');
    const chatEl = document.getElementById('chat');
    const hideEl = document.getElementById('hide');
    const notifyEl = document.getElementById('notify');

    // Reasonable defaults (matches the screenshot: audio/video on, others off)
    if (audioEl) audioEl.checked = true;
    if (videoEl) videoEl.checked = true;

    const setError = (msg) => {
        if (!errorEl) return;
        if (!msg) {
            errorEl.hidden = true;
            errorEl.textContent = '';
            return;
        }
        errorEl.hidden = false;
        errorEl.textContent = msg;
    };

    const setStatus = (msg) => {
        if (!statusEl) return;
        statusEl.textContent = msg || '';
    };

    const safe = (value) => {
        const v = (value ?? '').toString().trim();
        return typeof window.filterXSS === 'function' ? window.filterXSS(v) : v;
    };

    const boolToFlag = (checked) => (checked ? '1' : '0');

    const uuidv4 = () => {
        // Prefer native implementation when available.
        if (typeof crypto?.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        // Fallback: RFC 4122 version 4 UUID using CSPRNG.
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    };

    const normalizeDuration = (raw) => {
        const value = safe(raw);
        if (!value) return 'unlimited';
        if (value.toLowerCase() === 'unlimited') return 'unlimited';
        // Accept HH:MM:SS format only
        const re = /^(\d{2}):(\d{2}):(\d{2})$/;
        if (!re.test(value)) {
            throw new Error('Duration must be HH:MM:SS (e.g. 00:30:00) or left empty for unlimited');
        }
        return value;
    };

    const buildJoinUrl = () => {
        const room = safe(roomEl?.value);
        if (!room) {
            throw new Error('Room name is required');
        }

        const name = safe(nameEl?.value) || 'random';
        const avatarRaw = safe(avatarEl?.value);
        const avatar = avatarRaw ? avatarRaw : '0';
        const token = safe(tokenEl?.value);
        const duration = normalizeDuration(durationEl?.value);

        const url = new URL('/join', window.location.origin);
        url.searchParams.set('room', room);
        url.searchParams.set('name', name);
        url.searchParams.set('avatar', avatar);

        url.searchParams.set('audio', boolToFlag(!!audioEl?.checked));
        url.searchParams.set('video', boolToFlag(!!videoEl?.checked));
        url.searchParams.set('screen', boolToFlag(!!screenEl?.checked));
        url.searchParams.set('chat', boolToFlag(!!chatEl?.checked));
        url.searchParams.set('hide', boolToFlag(!!hideEl?.checked));
        url.searchParams.set('notify', boolToFlag(!!notifyEl?.checked));

        url.searchParams.set('duration', duration);

        if (token) url.searchParams.set('token', token);

        return url;
    };

    const buildJoinUrlForPreview = () => {
        // For preview we do not hard-fail on empty room.
        const room = safe(roomEl?.value) || 'random';
        const url = new URL('/join', window.location.origin);
        if (!room) return url;
        try {
            return buildJoinUrl();
        } catch {
            return url;
        }
    };

    const updatePreview = () => {
        if (!previewEl) return;
        const url = buildJoinUrlForPreview();
        const room = safe(roomEl?.value);
        previewEl.value = room ? url.toString() : `${window.location.origin}/join?room=...`;
        if (copyBtn) copyBtn.disabled = !room;
    };

    const copyToClipboard = async (text) => {
        if (navigator.clipboard?.writeText && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }
        // Fallback
        const tmp = document.createElement('textarea');
        tmp.value = text;
        tmp.setAttribute('readonly', '');
        tmp.style.position = 'fixed';
        tmp.style.left = '-9999px';
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
    };

    if (!form) return;

    if (randomRoomBtn && roomEl) {
        randomRoomBtn.addEventListener('click', () => {
            setError('');
            setStatus('');
            roomEl.value = uuidv4();
            updatePreview();
            roomEl.focus();
        });
    }

    // Live preview
    updatePreview();

    const inputs = [roomEl, nameEl, avatarEl, tokenEl, audioEl, videoEl, screenEl, chatEl, hideEl, notifyEl];
    inputs.forEach((el) => {
        if (!el) return;
        el.addEventListener('input', updatePreview);
        el.addEventListener('change', updatePreview);
    });

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            setError('');
            setStatus('');
            try {
                const joinUrl = buildJoinUrl();
                await copyToClipboard(joinUrl.toString());
                setStatus('Link copied to clipboard.');
            } catch (err) {
                setError(err?.message || 'Unable to copy join URL');
            }
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        setError('');
        setStatus('');
        try {
            const joinUrl = buildJoinUrl();
            window.location.href = joinUrl.toString();
        } catch (err) {
            setError(err?.message || 'Unable to build join URL');
        }
    });
});
