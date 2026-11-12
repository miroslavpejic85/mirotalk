'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const scriptPath = path.join(root, 'scripts/extract-ui-lang.js');
const langPath = path.join(root, 'public/lang');

// Runs the extractor against an in-memory file map (no disk writes).
function runExtractor(files) {
    vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), {
        __dirname: path.dirname(scriptPath),
        console: { log() {} },
        require(name) {
            if (name === 'path') return path;
            assert.equal(name, 'fs');
            return {
                existsSync: (file) => files.has(file),
                readFileSync(file) {
                    assert.ok(files.has(file), `Unexpected read: ${file}`);
                    return files.get(file);
                },
                readdirSync: (dir) =>
                    [...files.keys()].filter((file) => path.dirname(file) === dir).map((file) => path.basename(file)),
                mkdirSync() {},
                writeFileSync: (file, content) => files.set(file, content),
            };
        },
    });
}

describe('UI language extraction', () => {
    it('extracts both conditional toast branches and preserves existing translations', () => {
        const locked = 'The whiteboard is locked. The participants cannot interact with it.';
        const unlocked = 'The whiteboard is unlocked. The participants can interact with it.';
        const files = new Map([
            [
                path.join(root, 'public/views/client.html'),
                '<script src="../js/i18n.js"></script><script src="../js/client.js"></script>',
            ],
            [path.join(root, 'public/js/i18n.js'), ''],
            [
                path.join(root, 'public/js/client.js'),
                `userLog('switch', wbIsLock
                    ? 'The whiteboard is locked. \\n The participants cannot interact with it.'
                    : 'The whiteboard is unlocked. \\n The participants can interact with it.');`,
            ],
            [path.join(langPath, 'en.json'), '{}'],
            [path.join(langPath, 'it.json'), JSON.stringify({ toasts: { [locked]: 'La lavagna è bloccata.' } })],
        ]);
        runExtractor(files);
        const english = JSON.parse(files.get(path.join(langPath, 'en.json')));
        const italian = JSON.parse(files.get(path.join(langPath, 'it.json')));
        assert.deepEqual(english.toasts, { [locked]: locked, [unlocked]: unlocked });
        assert.deepEqual(italian.toasts, { [locked]: 'La lavagna è bloccata.', [unlocked]: unlocked });
    });

    it('scans scripts and markup of every page that loads i18n.js (login, waiting room)', () => {
        const views = path.join(root, 'public/views');
        const js = path.join(root, 'public/js');
        const files = new Map([
            [path.join(views, 'client.html'), '<script defer src="../js/i18n.js"></script>'],
            [
                path.join(views, 'login.html'),
                '<script defer src="../js/i18n.js"></script><script defer src="../js/login.js"></script>' +
                    '<input placeholder="Username" /><div>&copy; 2026 MiroTalk</div>',
            ],
            [
                path.join(views, 'waitingRoom.html'),
                '<script defer src="../js/waitingRoom.js"></script><script defer src="../js/i18n.js"></script>',
            ],
            [path.join(views, 'landing.html'), '<script defer src="../js/landing.js"></script><p>Landing only</p>'],
            [path.join(js, 'i18n.js'), ''],
            [path.join(js, 'landing.js'), "el.textContent = 'Landing script';"],
            [
                path.join(js, 'login.js'),
                `showLoginError('Room not allowed for this user');
                popup('success', window.i18n?.t('Room link copied to clipboard', 'toasts') || 'x');`,
            ],
            [
                path.join(js, 'waitingRoom.js'),
                `statusEl.textContent = getWaitingRoomBrand('waitingRoomReady', 'Room is ready! Joining...');
                setTranslatedAttribute(btn, 'title', 'Pause music', 'buttons');
                setTranslatedAttribute(btn, 'title', waitingAudio.muted ? 'Unmute' : 'Mute', 'buttons');`,
            ],
            [path.join(langPath, 'en.json'), '{}'],
        ]);
        runExtractor(files);
        const english = JSON.parse(files.get(path.join(langPath, 'en.json')));
        assert.equal(english.labels['Room not allowed for this user'], 'Room not allowed for this user');
        assert.equal(english.labels['Room is ready! Joining...'], 'Room is ready! Joining...');
        assert.equal(english.labels.Username, 'Username');
        assert.equal(english.toasts['Room link copied to clipboard'], 'Room link copied to clipboard');
        for (const label of ['Pause music', 'Unmute', 'Mute']) assert.equal(english.buttons[label], label);
        assert.ok(!Object.hasOwn(english.labels, '© 2026 MiroTalk'));
        assert.ok(!Object.hasOwn(english.labels, 'Landing only'));
        assert.ok(!Object.hasOwn(english.labels, 'Landing script'));
    });
});
