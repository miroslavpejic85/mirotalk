'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const commonSource = fs.readFileSync(path.join(__dirname, '../public/js/common.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');
const roomFunctions = ['getRoomId', 'getQueryParam', 'decodeRoomPath']
    .map((name) => clientSource.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))[0])
    .join('\n');

function setup(lastRoom = '') {
    const elements = {
        lastRoomContainer: { style: {} },
        lastRoom: {
            setAttribute(name, value) {
                this[name] = value;
            },
        },
    };
    const window = {
        location: { href: 'https://host/', search: '' },
        localStorage: { lastRoom },
    };
    const context = vm.createContext({
        window,
        document: { getElementById: (id) => elements[id] || null },
        filterXSS: (value) => value,
        URL,
        URLSearchParams,
        console: { log() {}, warn() {}, error() {} },
        myRoomId: {},
        getBreakoutTicketRoom: (room) => room,
    });
    vm.runInContext(commonSource, context);
    vm.runInContext(roomFunctions, context);
    return { context, elements, window };
}

function readRoom(context, window, href) {
    const url = new URL(href, 'https://host');
    window.location = { href: url.href, pathname: url.pathname, search: url.search };
    return vm.runInContext('getRoomId()', context);
}

describe('room names', () => {
    for (const room of ['abc%', 'abc%25', 'abc%20', 'abc#?', 'abc/def', 'café', 'a+b', 'plain-room']) {
        it(`preserves ${JSON.stringify(room)} from joining through settings, sharing and recent rooms`, () => {
            const { context, elements, window } = setup();
            // Add the input after initialization to avoid the random-name animation.
            elements.roomName = { value: room };
            vm.runInContext('joinRoom()', context);
            assert.equal(window.localStorage.lastRoom, room);

            assert.equal(readRoom(context, window, window.location.href), room);
            assert.equal(context.myRoomId.innerText, room, 'settings show the original name');
            assert.equal(window.localStorage.lastRoom, room, 'joining does not overwrite the name with URL encoding');

            const sharedPath = vm.runInContext('getJoinRoomPath(window.localStorage.lastRoom)', context);
            assert.equal(readRoom(context, window, sharedPath), room, 'shared links return to the same room');

            const recent = setup(window.localStorage.lastRoom);
            assert.equal(recent.elements.lastRoom.innerText, room);
            assert.equal(recent.elements.lastRoomContainer.style.display, '');
            assert.equal(
                readRoom(recent.context, recent.window, recent.elements.lastRoom.href),
                room,
                'recent-room links return to the same room'
            );
        });
    }

    it('keeps the /join/<room> path, encoding a literal percent sign', () => {
        const { context, elements, window } = setup();
        elements.roomName = { value: 'abc%' };
        vm.runInContext('joinRoom()', context);
        assert.equal(window.location.href, '/join/abc%25');
        assert.equal(vm.runInContext('getJoinRoomPath("abc%")', context), '/join/abc%25');
    });

    it('decodes encoded path room IDs to the original name', () => {
        const { context, window } = setup();
        assert.equal(readRoom(context, window, '/join/caf%C3%A9'), 'café');
        assert.equal(readRoom(context, window, '/join/abc%25'), 'abc%');
        assert.equal(readRoom(context, window, '/join/plain-room'), 'plain-room');
    });

    it('keeps malformed percent-encoded path room IDs as-is', () => {
        const { context, window } = setup();
        window.location = { href: 'https://host/join/abc%', pathname: '/join/abc%', search: '' };
        assert.equal(vm.runInContext('getRoomId()', context), 'abc%');
    });

    it('still reads ?room= links', () => {
        const { context, window } = setup();
        assert.equal(readRoom(context, window, '/join/?room=abc%25'), 'abc%');
    });

    it('normalizes whitespace before building a room link', () => {
        const { context, elements, window } = setup();
        elements.roomName = { value: '  abc %  ' };
        vm.runInContext('joinRoom()', context);
        assert.equal(readRoom(context, window, window.location.href), 'abc-%');
    });

    it('hides the recent-room section when no room is stored', () => {
        const { elements } = setup();
        assert.equal(elements.lastRoomContainer.style.display, 'none');
    });

    it('waiting room shows, checks and rejoins the original room name', async () => {
        const waitingSource = fs.readFileSync(path.join(__dirname, '../public/js/waitingRoom.js'), 'utf8');
        const elements = {};
        const element = (id) =>
            (elements[id] ??= { id, style: {}, classList: { add() {}, remove() {} }, textContent: '', href: '' });
        const posts = [];
        const timers = [];
        const window = {
            location: { pathname: '/join/abc%25', href: '' },
            sessionStorage: {},
        };
        const context = vm.createContext({
            window,
            document: { getElementById: element, hidden: false, addEventListener() {} },
            axios: {
                post: async (url, body) => {
                    posts.push({ url, body });
                    return { data: { message: true } };
                },
            },
            setTimeout: (fn, ms) => timers.push({ fn, ms }),
            setInterval: () => 0,
            Intl,
            Promise,
            console: { log() {}, warn() {}, error() {} },
        });
        vm.runInContext(waitingSource, context);
        await new Promise((resolve) => setImmediate(resolve));

        assert.equal(elements.waitingRoomNameText.textContent, 'abc%');
        assert.equal(elements.loginLink.href, '/login?room=abc%25');
        assert.equal(window.sessionStorage.roomID, 'abc%');
        assert.deepEqual(posts, [{ url: '/isRoomActive', body: { roomId: 'abc%' } }]);

        timers.find((t) => t.ms === 800).fn();
        assert.equal(window.location.href, '/join/abc%25', 'not double-encoded to abc%2525');
    });
});
