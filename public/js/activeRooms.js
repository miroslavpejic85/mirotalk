'use strict';

console.log(window.location);

const isTest = false; // Set to true for testing with mock data

const roomsDiv = document.getElementById('rooms');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('search-btn');
const refreshBtn = document.getElementById('refresh-btn');

let allRooms = [];

searchBtn.addEventListener('click', handleSearch);
refreshBtn.addEventListener('click', fetchRooms);

function setRoomsContent(html) {
    roomsDiv.innerHTML = html;
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

async function fetchRooms() {
    setRoomsContent('<div class="empty">Loading...</div>');
    try {
        const res = await axios.get('/api/v1/activeRooms');
        if (res.status !== 200) throw new Error('Failed to fetch active rooms');
        allRooms = getRoomsData(res);
        renderRooms(allRooms);
    } catch (err) {
        const errorMsg = err.response?.data?.error || err.message;
        setRoomsContent(`<div class="empty">${errorMsg}</div>`);
    }
}

function renderRooms(rooms) {
    if (!rooms.length) {
        setRoomsContent('<div class="empty">No active rooms found.</div>');
        return;
    }
    setRoomsContent(
        rooms
            .map(
                (room) => `
            <div class="room-card">
                <div class="room-title">
                    <i class="fa-solid fa-door-open"></i>
                    ${room.id}
                </div>
                <div class="peer-count">
                    <i class="fa-solid fa-users"></i>
                    ${room.peers}
                </div>
                <div class="peer-label">${room.peers === 1 ? 'peer' : 'peers'}</div>
                <a href="${room.join}" class="join-btn" target="_blank">
                    <i class="fa-solid fa-sign-in-alt"></i> Join
                </a>
            </div>
        `
            )
            .join('')
    );
}

function handleSearch() {
    const value = searchInput.value.trim().toLowerCase();
    renderRooms(!value ? allRooms : allRooms.filter((room) => room.id.toLowerCase().includes(value)));
}

fetchRooms();
