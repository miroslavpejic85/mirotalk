'use strict';

/**
 * Server-authoritative breakout rooms.
 *
 * A session belongs to a main room and owns a set of breakout rooms (regular rooms
 * with unguessable ids). Peers move between rooms by reloading the client on the
 * target room with a server-issued ticket, so the WebRTC mesh of each room stays
 * independent. Room ids never leave the server except inside a move order sent to
 * the peer being moved.
 */

const crypto = require('crypto');
const { cleanText } = require('./roomPolls');

const LIMITS = Object.freeze({
    MIN_ROOMS: 1,
    MAX_ROOMS: 20,
    MAX_NAME_LENGTH: 40,
    MAX_DURATION_MINUTES: 240,
    MAX_MESSAGE_LENGTH: 300,
});

// How long the main room state (lock, password, ...) survives after a session ends
// while the main room is empty, so the returning peers find it unchanged.
const ORPHAN_STATE_TTL_MS = 10 * 60 * 1000;

const sessions = new Map(); // mainRoom -> session
const breakoutRooms = new Map(); // breakoutRoomId -> mainRoom
const orphanStates = new Map(); // mainRoom -> { state, expiresAt }
const orphanTickets = new Map(); // mainRoom -> { sid, tickets, expiresAt } tickets back to an ended session's main room

function createRoomId(mainRoom, index) {
    return `${mainRoom}-breakout-${index + 1}-${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Open breakout rooms for a main room
 * @param {string} mainRoom
 * @param {object} data { rooms: string[], duration: minutes (0 = no limit), allow_return: boolean }
 * @param {number} [now]
 * @returns {{ session?: object, error?: string }}
 */
function create(mainRoom, data, now = Date.now()) {
    if (!mainRoom || typeof mainRoom !== 'string' || !data || typeof data !== 'object') {
        return { error: 'Invalid request' };
    }
    if (breakoutRooms.has(mainRoom)) return { error: 'Breakout rooms cannot be nested' };
    if (sessions.has(mainRoom)) return { error: 'Breakout rooms are already open' };
    if (!Array.isArray(data.rooms)) return { error: 'Invalid request' };
    if (data.rooms.length < LIMITS.MIN_ROOMS) return { error: 'At least 1 room is required' };
    if (data.rooms.length > LIMITS.MAX_ROOMS) return { error: 'Too many rooms' };

    const duration = data.duration === undefined ? 0 : Number(data.duration);
    if (!Number.isInteger(duration) || duration < 0 || duration > LIMITS.MAX_DURATION_MINUTES) {
        return { error: 'Invalid duration' };
    }

    const rooms = data.rooms.map((raw, index) => ({
        index,
        id: createRoomId(mainRoom, index),
        name: cleanText(raw, LIMITS.MAX_NAME_LENGTH) || `Room ${index + 1}`,
    }));

    const session = {
        id: crypto.randomUUID(),
        mainRoom,
        rooms,
        allowReturn: data.allow_return === true,
        createdAt: now,
        endsAt: duration > 0 ? now + duration * 60 * 1000 : 0,
        mainState: null,
        tickets: new Set(), // ids of the tickets that are still honored
        timers: new Map(),
        help: new Map(), // breakout room id -> { peer_name, at } pending help request
    };
    sessions.set(mainRoom, session);
    rooms.forEach((room) => breakoutRooms.set(room.id, mainRoom));
    orphanStates.delete(mainRoom);
    return { session };
}

/**
 * @param {string} mainRoom
 * @returns {object|undefined} session opened from this main room
 */
function get(mainRoom) {
    return typeof mainRoom === 'string' ? sessions.get(mainRoom) : undefined;
}

/**
 * @param {string} roomId main or breakout room
 * @returns {object|undefined} session the room belongs to
 */
function getByRoom(roomId) {
    if (typeof roomId !== 'string') return undefined;
    return sessions.get(roomId) || sessions.get(breakoutRooms.get(roomId));
}

function isSessionRoom(roomId) {
    return !!getByRoom(roomId);
}

function isBreakoutRoom(roomId) {
    return typeof roomId === 'string' && breakoutRooms.has(roomId);
}

/**
 * @param {object} session
 * @returns {string[]} main room first, then the breakout rooms
 */
function roomIds(session) {
    return session ? [session.mainRoom, ...session.rooms.map((room) => room.id)] : [];
}

function hasRoom(session, roomId) {
    return roomIds(session).includes(roomId);
}

/**
 * @param {object} session
 * @param {number} index -1 for the main room
 * @returns {{ index: number, id: string, name: string }|undefined}
 */
function getRoomByIndex(session, index) {
    if (!session || !Number.isInteger(index)) return undefined;
    if (index === -1) return { index: -1, id: session.mainRoom, name: '' };
    return session.rooms[index];
}

/**
 * @param {object} session
 * @param {string} roomId
 * @returns {{ index: number, id: string, name: string }|undefined}
 */
function getRoom(session, roomId) {
    if (!session) return undefined;
    if (roomId === session.mainRoom) return getRoomByIndex(session, -1);
    return session.rooms.find((room) => room.id === roomId);
}

/**
 * @param {*} value
 * @returns {string} plain-text broadcast message
 */
function cleanMessage(value) {
    return cleanText(value, LIMITS.MAX_MESSAGE_LENGTH);
}

function setTimer(session, name, ms, fn) {
    clearTimer(session, name);
    const timer = setTimeout(
        () => {
            session.timers.delete(name);
            fn();
        },
        Math.max(0, ms)
    );
    timer.unref?.();
    session.timers.set(name, timer);
}

function clearTimer(session, name) {
    const timer = session?.timers.get(name);
    if (timer) {
        clearTimeout(timer);
        session.timers.delete(name);
    }
}

/**
 * Keep the main room state while the main room is empty (everyone in a breakout room)
 * @param {string} mainRoom
 * @param {object} state
 */
function saveMainState(mainRoom, state) {
    const session = get(mainRoom);
    if (session) session.mainState = state && Object.keys(state).length > 0 ? state : null;
}

/**
 * Take back the saved main room state when the main room is opened again
 * @param {string} mainRoom
 * @param {number} [now]
 * @returns {object|null}
 */
function takeMainState(mainRoom, now = Date.now()) {
    const session = get(mainRoom);
    if (session) {
        const state = session.mainState;
        session.mainState = null;
        return state;
    }
    const orphan = orphanStates.get(mainRoom);
    orphanStates.delete(mainRoom);
    return orphan && orphan.expiresAt > now ? orphan.state : null;
}

function dropOrphanState(mainRoom) {
    orphanStates.delete(mainRoom);
}

/**
 * Remember an issued ticket so it can be honored (and revoked) later
 * @param {object} session
 * @param {string} ticketId
 */
function addTicket(session, ticketId) {
    if (session && ticketId) session.tickets.add(ticketId);
}

/**
 * Stop honoring tickets (peer kicked out, or moved again with a new ticket)
 * @param {Iterable<string>} ticketIds
 */
function revokeTickets(ticketIds) {
    for (const ticketId of ticketIds || []) {
        for (const session of sessions.values()) session.tickets.delete(ticketId);
        for (const orphan of orphanTickets.values()) orphan.tickets.delete(ticketId);
    }
}

/**
 * Is an issued ticket still honored for this room: while its session is open, or for a
 * short time after the session ended when it leads back to the main room.
 * @param {object} ticket { main, sid, room, jti }
 * @param {number} [now]
 * @returns {boolean}
 */
function isTicketValid({ main, sid, room, jti } = {}, now = Date.now()) {
    if (!jti) return false;
    const session = get(main);
    if (session && session.id === sid) return hasRoom(session, room) && session.tickets.has(jti);
    const orphan = orphanTickets.get(main);
    return room === main && !!orphan && orphan.sid === sid && orphan.expiresAt > now && orphan.tickets.has(jti);
}

/**
 * Record a help request from a breakout room (one pending request per room)
 * @param {string} roomId breakout room asking for help
 * @param {string} peerName plain-text name of the participant asking
 * @param {number} [now]
 * @returns {{ request?: object, pending?: boolean, error?: string }} pending: already requested
 */
function requestHelp(roomId, peerName, now = Date.now()) {
    const session = getByRoom(roomId);
    if (!session || !isBreakoutRoom(roomId)) return { error: 'Not allowed' };
    if (session.help.has(roomId)) return { request: session.help.get(roomId), pending: true };
    const request = { peer_name: peerName, at: now };
    session.help.set(roomId, request);
    return { request };
}

/**
 * @param {string} roomId
 * @returns {object|undefined} pending help request { peer_name, at } of a breakout room
 */
function getHelp(roomId) {
    return getByRoom(roomId)?.help.get(roomId);
}

/**
 * Drop the pending help request of a breakout room (a presenter came in, or the room emptied)
 * @param {string} roomId
 * @returns {boolean} a request was pending
 */
function clearHelp(roomId) {
    return getByRoom(roomId)?.help.delete(roomId) === true;
}

/**
 * Close a session
 * @param {string} mainRoom
 * @param {number} [now]
 * @returns {object|undefined} ended session
 */
function end(mainRoom, now = Date.now()) {
    const session = get(mainRoom);
    if (!session) return undefined;
    for (const name of [...session.timers.keys()]) clearTimer(session, name);
    session.rooms.forEach((room) => breakoutRooms.delete(room.id));
    sessions.delete(mainRoom);
    for (const [room, orphan] of orphanTickets) {
        if (orphan.expiresAt <= now) orphanTickets.delete(room);
    }
    orphanTickets.set(mainRoom, { sid: session.id, tickets: session.tickets, expiresAt: now + ORPHAN_STATE_TTL_MS });
    if (session.mainState) {
        orphanStates.set(mainRoom, { state: session.mainState, expiresAt: now + ORPHAN_STATE_TTL_MS });
    }
    return session;
}

function reset() {
    for (const mainRoom of [...sessions.keys()]) end(mainRoom);
    orphanStates.clear();
    orphanTickets.clear();
}

module.exports = {
    LIMITS,
    ORPHAN_STATE_TTL_MS,
    create,
    get,
    getByRoom,
    isSessionRoom,
    isBreakoutRoom,
    roomIds,
    hasRoom,
    getRoomByIndex,
    getRoom,
    cleanMessage,
    setTimer,
    clearTimer,
    saveMainState,
    takeMainState,
    dropOrphanState,
    addTicket,
    revokeTickets,
    isTicketValid,
    requestHelp,
    getHelp,
    clearHelp,
    end,
    reset,
};
