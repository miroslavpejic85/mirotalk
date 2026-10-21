'use strict';

/**
 * HOST_USERS parsing, shared with MiroTalk SFU. Two formats are accepted:
 *
 *   Compact: username:password:displayname:room1,room2|username2:password2:displayname2:*
 *            (users separated by '|', fields by ':', rooms by ','; displayname and rooms optional)
 *   JSON:    [{"username":"alice","password":"pw","displayname":"Alice","allowed_rooms":["room1"]}]
 *            (use JSON when a value contains ':', '|' or ',')
 *
 * allowed_rooms defaults to ['*'] (all rooms).
 */

function normalizeAllowedRooms(value) {
    if (value === undefined || value === null || value === '') return ['*'];
    const list = Array.isArray(value) ? value : String(value).split(',');
    const rooms = list.map((room) => String(room).trim()).filter(Boolean);
    return rooms.length ? rooms : ['*'];
}

function normalizeUser(user) {
    // Keep invalid entries as null so the server's startup validation rejects them
    if (!user || typeof user !== 'object' || Array.isArray(user)) return null;
    return {
        username: user.username === undefined || user.username === null ? '' : String(user.username),
        password: user.password === undefined || user.password === null ? '' : String(user.password),
        displayname: user.displayname === undefined || user.displayname === null ? '' : String(user.displayname).trim(),
        allowed_rooms: normalizeAllowedRooms(user.allowed_rooms),
    };
}

function parseCompact(value) {
    return value
        .split('|')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry, index) => {
            const fields = entry.split(':');
            if (fields.length < 2 || fields.length > 4) {
                // Never echo the entry: it contains a password
                throw new Error(
                    `HOST_USERS entry #${index + 1} is malformed: expected username:password[:displayname[:room1,room2]]. ` +
                        `Use the JSON format if a value contains ':' or '|'.`
                );
            }
            const [username, password, displayname, allowedRooms] = fields;
            return normalizeUser({ username, password, displayname, allowed_rooms: allowedRooms });
        });
}

function parseHostUsers(value) {
    if (Array.isArray(value)) return value.map(normalizeUser);
    if (typeof value !== 'string') return [];

    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
        let parsed;
        try {
            parsed = JSON.parse(trimmed);
        } catch {
            throw new Error('HOST_USERS is not valid JSON');
        }
        if (!Array.isArray(parsed)) throw new Error('HOST_USERS JSON must be an array');
        return parsed.map(normalizeUser);
    }

    return parseCompact(trimmed);
}

function isRoomAllowedForUser(user, room) {
    if (!user || !Array.isArray(user.allowed_rooms)) return false;
    return user.allowed_rooms.includes('*') || user.allowed_rooms.includes(String(room));
}

module.exports = { parseHostUsers, isRoomAllowedForUser };
