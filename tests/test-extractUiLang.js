'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('UI language extraction', () => {
    it('extracts both conditional toast branches and preserves existing translations', () => {
        const root = path.join(__dirname, '..');
        const scriptPath = path.join(root, 'app/src/scripts/extract-ui-lang.js');
        const langPath = path.join(root, 'public/lang');
        const locked = 'The whiteboard is locked. The participants cannot interact with it.';
        const unlocked = 'The whiteboard is unlocked. The participants can interact with it.';
        const files = new Map([
            [path.join(root, 'public/views/client.html'), '<script src="../js/client.js"></script>'],
            [
                path.join(root, 'public/js/client.js'),
                `userLog('switch', wbIsLock
                    ? 'The whiteboard is locked. \\n The participants cannot interact with it.'
                    : 'The whiteboard is unlocked. \\n The participants can interact with it.');`,
            ],
            [path.join(langPath, 'en.json'), '{}'],
            [path.join(langPath, 'it.json'), JSON.stringify({ toasts: { [locked]: 'La lavagna è bloccata.' } })],
        ]);
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
                    readdirSync: () => ['en.json', 'it.json'],
                    mkdirSync() {},
                    writeFileSync: (file, content) => files.set(file, content),
                };
            },
        });
        const english = JSON.parse(files.get(path.join(langPath, 'en.json')));
        const italian = JSON.parse(files.get(path.join(langPath, 'it.json')));
        assert.deepEqual(english.toasts, { [locked]: locked, [unlocked]: unlocked });
        assert.deepEqual(italian.toasts, { [locked]: 'La lavagna è bloccata.', [unlocked]: unlocked });
    });
});
