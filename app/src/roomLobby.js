'use strict';

/**
 * Room lobby (server-authoritative): guests wait here until a presenter admits or rejects them.
 * The state lives outside peers[room] so it never reaches the clients with the peers list.
 * A socket waits in at most one lobby at a time.
 */

const MAX_NAME_LENGTH = 254;

const enabledRooms = new Set(); // room_id
const waiting = new Map(); // room_id -> Map(peer_id -> entry)
const peerRooms = new Map(); // peer_id -> room_id

function isEnabled(roomId) {
    return enabledRooms.has(roomId);
}

function setEnabled(roomId, enabled) {
    if (enabled) enabledRooms.add(roomId);
    else enabledRooms.delete(roomId);
}

/**
 * Put a peer in the room lobby, replacing any previous wait
 * @param {string} roomId
 * @param {string} peerId server-controlled socket.id
 * @param {object} entry { peer_name, peer_avatar, admit: async () => void }
 * @returns {string|null} previous room the peer was waiting for, if different
 */
function add(roomId, peerId, entry) {
    const previousRoom = removePeer(peerId);
    if (!waiting.has(roomId)) waiting.set(roomId, new Map());
    waiting.get(roomId).set(peerId, {
        peer_name: String(entry.peer_name ?? '').slice(0, MAX_NAME_LENGTH),
        peer_avatar: typeof entry.peer_avatar === 'string' ? entry.peer_avatar : '',
        joined_at: Date.now(),
        admit: entry.admit,
    });
    peerRooms.set(peerId, roomId);
    return previousRoom && previousRoom !== roomId ? previousRoom : null;
}

/**
 * @returns {object|null} the removed entry
 */
function remove(roomId, peerId) {
    const room = waiting.get(roomId);
    const entry = room?.get(peerId);
    if (!entry) return null;
    room.delete(peerId);
    if (room.size === 0) waiting.delete(roomId);
    peerRooms.delete(peerId);
    return entry;
}

/**
 * @returns {string|null} room the peer was waiting for
 */
function removePeer(peerId) {
    const roomId = peerRooms.get(peerId);
    if (roomId === undefined) return null;
    remove(roomId, peerId);
    return roomId;
}

function has(roomId, peerId) {
    return !!waiting.get(roomId)?.has(peerId);
}

function count(roomId) {
    return waiting.get(roomId)?.size || 0;
}

function ids(roomId) {
    return [...(waiting.get(roomId)?.keys() || [])];
}

/**
 * @returns {object[]} waiting peers { peer_id, peer_name, peer_avatar, joined_at } in arrival order
 */
function list(roomId) {
    return [...(waiting.get(roomId)?.entries() || [])].map(([peer_id, entry]) => ({
        peer_id,
        peer_name: entry.peer_name,
        peer_avatar: entry.peer_avatar,
        joined_at: entry.joined_at,
    }));
}

function reset() {
    enabledRooms.clear();
    waiting.clear();
    peerRooms.clear();
}

module.exports = {
    isEnabled,
    setEnabled,
    add,
    remove,
    removePeer,
    has,
    count,
    ids,
    list,
    reset,
};
