'use strict';

console.log(window.location);

const isTest = false; // Set to true for testing with mock data

const roomsDiv = document.getElementById('rooms');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refresh-btn');
const roomCountBadge = document.getElementById('roomCountBadge');
const statRooms = document.getElementById('statRooms');
const statPeers = document.getElementById('statPeers');

let allRooms = [];

searchInput.addEventListener('input', handleSearch);
refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');
    fetchRooms().finally(() => {
        setTimeout(() => refreshBtn.classList.remove('spinning'), 600);
    });
});

function setRoomsContent(html) {
    roomsDiv.innerHTML = html;
}

// Security: escape user-controlled strings before injecting into innerHTML.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"'`=\/]/g, (c) => {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '`': '&#96;',
            '=': '&#61;',
            '/': '&#47;',
        }[c];
    });
}

function getRoomsData(res) {
    return !isTest ? res.data.activeRooms || [] : mockRooms();
}

function mockRooms(roomCount = 1000) {
    return Array.from({ length: roomCount }, () => {
        const id = getUUID();
        return {
            id,
            peers: Math.floor(Math.random() * 10) + 1,
            join: `${window.location.origin}/${id}`,
        };
    });
}

function getUUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
}

function updateStats(rooms) {
    const totalPeers = rooms.reduce((sum, r) => sum + r.peers, 0);
    statRooms.textContent = rooms.length;
    statPeers.textContent = totalPeers;
    roomCountBadge.textContent = rooms.length === 1 ? '1 room' : `${rooms.length} rooms`;
}

async function fetchRooms() {
    setRoomsContent('<div class="empty"><i class="fa-solid fa-spinner fa-spin"></i>Loading rooms...</div>');
    try {
        const res = await axios.get('/api/v1/activeRooms');
        if (res.status !== 200) throw new Error('Failed to fetch active rooms');
        allRooms = getRoomsData(res);
        updateStats(allRooms);
        renderRooms(allRooms);
    } catch (err) {
        const errorMsg = err.response?.data?.error || err.message;
        setRoomsContent(`<div class="empty"><i class="fa-solid fa-circle-exclamation"></i>${errorMsg}</div>`);
        updateStats([]);
    }
}

function renderRooms(rooms) {
    if (!rooms.length) {
        setRoomsContent('<div class="empty"><i class="fa-solid fa-door-closed"></i>No active rooms found.</div>');
        return;
    }
    setRoomsContent(
        rooms
            .map((room) => {
                const id = escapeHtml(room.id);
                const peers = Number(room.peers) || 0;
                const join = escapeHtml(room.join);
                return `
            <div class="room-card">
                <div class="room-card-header">
                    <div class="room-title">
                        <i class="fa-solid fa-door-open"></i>${id}
                    </div>
                    <div class="peer-badge">
                        <i class="fa-solid fa-users"></i>
                        ${peers}
                    </div>
                </div>
                <div class="room-card-footer">
                    <div class="peer-status">
                        <span class="dot"></span>
                        ${peers} ${peers === 1 ? 'peer' : 'peers'} connected
                    </div>
                    <a href="${join}" class="join-btn" target="_blank" rel="noopener noreferrer">
                        <i class="fa-solid fa-arrow-right-to-bracket"></i> Join
                    </a>
                </div>
            </div>
        `;
            })
            .join('')
    );
}

function handleSearch() {
    const value = searchInput.value.trim().toLowerCase();
    const filtered = !value ? allRooms : allRooms.filter((room) => room.id.toLowerCase().includes(value));
    renderRooms(filtered);
}

fetchRooms();
