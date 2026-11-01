'use strict';

/**
 * Room bans (server-authoritative): a banned peer cannot join the room again while the room is alive.
 * A ban matches the authenticated identity (strong) or the browser peer_uuid (best effort, a guest can
 * change it by clearing the browser storage). IP addresses are deliberately not used (shared NAT/VPN).
 * The state lives in memory, outside peers[room], and is cleared when the room is destroyed.
 */

const MAX_BANS_PER_ROOM = 500;
const MAX_VALUE_LENGTH = 254;

const bans = new Map(); // room_id -> { uuids: Set, identities: Set }

function normalize(value) {
    return typeof value === 'string' && value.length > 0 ? value.slice(0, MAX_VALUE_LENGTH) : null;
}

/**
 * Ban a peer from a room
 * @param {string} roomId
 * @param {object} target { peer_uuid, identity }
 * @returns {boolean} false when there is nothing to match the peer by, or the room reached the ban limit
 */
function ban(roomId, { peer_uuid, identity } = {}) {
    const uuid = normalize(peer_uuid);
    const user = normalize(identity);
    if (!uuid && !user) return false;

    if (!bans.has(roomId)) bans.set(roomId, { uuids: new Set(), identities: new Set() });
    const room = bans.get(roomId);
    if (room.uuids.size + room.identities.size >= MAX_BANS_PER_ROOM) return false;

    if (uuid) room.uuids.add(uuid);
    if (user) room.identities.add(user);
    return true;
}

/**
 * @param {string} roomId
 * @param {object} peer { peer_uuid, identity }
 * @returns {boolean}
 */
function isBanned(roomId, { peer_uuid, identity } = {}) {
    const room = bans.get(roomId);
    if (!room) return false;
    const uuid = normalize(peer_uuid);
    const user = normalize(identity);
    return (!!uuid && room.uuids.has(uuid)) || (!!user && room.identities.has(user));
}

function clear(roomId) {
    bans.delete(roomId);
}

function reset() {
    bans.clear();
}

module.exports = {
    ban,
    isBanned,
    clear,
    reset,
};
