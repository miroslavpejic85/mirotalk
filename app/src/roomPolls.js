'use strict';

/**
 * Server-authoritative room polls.
 *
 * The server keeps the single source of truth: one vote per voter (keyed by a
 * server-bound voter key, never by client-supplied ids), so duplicated or
 * spoofed votes cannot skew the results. Poll texts are stored as plain text
 * and must be rendered with textContent on the client.
 */

const crypto = require('crypto');
const he = require('he');

const LIMITS = Object.freeze({
    MAX_POLLS_PER_ROOM: 20,
    MIN_OPTIONS: 2,
    MAX_OPTIONS: 10,
    MAX_QUESTION_LENGTH: 300,
    MAX_OPTION_LENGTH: 120,
    MAX_NAME_LENGTH: 60,
});

const rooms = new Map(); // roomId -> Map(pollId -> poll)

// Control characters plus zero-width / bidi override characters that could spoof the rendered text
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF]/g;

/**
 * Normalize a plain-text value
 * @param {*} value
 * @param {number} max max length
 * @returns {string}
 */
function cleanText(value, max) {
    if (typeof value !== 'string') return '';
    return value.replace(UNSAFE_CHARS, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();
}

/**
 * Peer names are stored HTML-escaped by the server XSS filter: decode them back to plain text
 * @param {*} value
 * @returns {string}
 */
function cleanName(value) {
    return cleanText(typeof value === 'string' ? he.decode(value) : '', LIMITS.MAX_NAME_LENGTH) || 'Participant';
}

function getRoom(roomId, create = false) {
    let room = rooms.get(roomId);
    if (!room && create) {
        room = new Map();
        rooms.set(roomId, room);
    }
    return room;
}

/**
 * @param {string} roomId
 * @param {string} pollId
 * @returns {object|undefined} internal poll
 */
function get(roomId, pollId) {
    if (typeof pollId !== 'string') return undefined;
    return getRoom(roomId)?.get(pollId);
}

/**
 * @param {string} roomId
 * @returns {object[]} internal polls, oldest first
 */
function list(roomId) {
    const room = getRoom(roomId);
    return room ? [...room.values()] : [];
}

/**
 * Create a poll
 * @param {string} roomId
 * @param {object} data { question, options, anonymous }
 * @param {object} creator { key, name }
 * @returns {{ poll?: object, error?: string }}
 */
function create(roomId, data, creator) {
    if (!roomId || !creator?.key) return { error: 'Invalid request' };
    if (!data || typeof data !== 'object') return { error: 'Invalid request' };

    const question = cleanText(data.question, LIMITS.MAX_QUESTION_LENGTH);
    if (!question) return { error: 'The question is required' };

    if (!Array.isArray(data.options)) return { error: 'Invalid request' };
    const options = [];
    const seen = new Set();
    // Bound the work done on untrusted input before validating
    for (const raw of data.options.slice(0, LIMITS.MAX_OPTIONS * 2)) {
        const text = cleanText(raw, LIMITS.MAX_OPTION_LENGTH);
        const key = text.toLowerCase();
        if (!text || seen.has(key)) continue;
        seen.add(key);
        options.push(text);
    }
    if (options.length < LIMITS.MIN_OPTIONS) return { error: 'At least 2 different options are required' };
    if (options.length > LIMITS.MAX_OPTIONS) return { error: 'Too many options' };

    const room = getRoom(roomId, true);
    if (room.size >= LIMITS.MAX_POLLS_PER_ROOM) return { error: 'The maximum number of polls has been reached' };

    const poll = {
        id: crypto.randomUUID(),
        question,
        options,
        anonymous: data.anonymous === true,
        open: true,
        creatorKey: creator.key,
        creatorName: cleanName(creator.name),
        createdAt: Date.now(),
        votes: new Map(), // voterKey -> { option, name }
    };
    room.set(poll.id, poll);
    return { poll };
}

/**
 * Cast, change (option index) or retract (-1) a vote
 * @param {string} roomId
 * @param {string} pollId
 * @param {object} voter { key, name }
 * @param {number} option
 * @returns {{ poll?: object, error?: string }}
 */
function vote(roomId, pollId, voter, option) {
    const poll = get(roomId, pollId);
    if (!poll) return { error: 'Poll not found' };
    if (!poll.open) return { error: 'The poll is closed' };
    if (!voter?.key || !Number.isInteger(option) || option < -1 || option >= poll.options.length) {
        return { error: 'Invalid request' };
    }
    if (option === -1) {
        poll.votes.delete(voter.key);
    } else {
        poll.votes.set(voter.key, { option, name: cleanName(voter.name) });
    }
    return { poll };
}

/**
 * @param {string} roomId
 * @param {string} pollId
 * @returns {object|undefined} closed poll
 */
function close(roomId, pollId) {
    const poll = get(roomId, pollId);
    if (poll) poll.open = false;
    return poll;
}

/**
 * @param {string} roomId
 * @param {string} pollId
 * @returns {boolean} removed
 */
function remove(roomId, pollId) {
    const room = getRoom(roomId);
    if (!room || typeof pollId !== 'string') return false;
    const removed = room.delete(pollId);
    if (room.size === 0) rooms.delete(roomId);
    return removed;
}

/**
 * @param {object} poll internal poll
 * @param {string} key voter key
 * @returns {boolean}
 */
function isCreator(poll, key) {
    return !!poll && !!key && poll.creatorKey === key;
}

/**
 * Serialize a poll for one recipient: voter keys never leave the server.
 * @param {object} poll internal poll
 * @param {string} viewerKey recipient voter key
 * @returns {object}
 */
function toPublic(poll, viewerKey) {
    const options = poll.options.map((text) => ({ text, votes: 0, voters: [] }));
    for (const { option, name } of poll.votes.values()) {
        options[option].votes++;
        if (!poll.anonymous) options[option].voters.push(name);
    }
    if (poll.anonymous) options.forEach((option) => delete option.voters);
    const myVote = viewerKey ? poll.votes.get(viewerKey) : undefined;
    return {
        id: poll.id,
        question: poll.question,
        anonymous: poll.anonymous,
        open: poll.open,
        created_at: poll.createdAt,
        creator_name: poll.creatorName,
        is_mine: isCreator(poll, viewerKey),
        my_vote: myVote ? myVote.option : -1,
        total_votes: poll.votes.size,
        options,
    };
}

/**
 * Drop all polls of a room (room closed)
 * @param {string} roomId
 */
function clear(roomId) {
    rooms.delete(roomId);
}

function reset() {
    rooms.clear();
}

module.exports = {
    LIMITS,
    cleanText,
    cleanName,
    create,
    vote,
    close,
    remove,
    get,
    list,
    isCreator,
    toPublic,
    clear,
    reset,
};
