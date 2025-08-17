'use strict';

console.log(window.location);

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginButton');
const joinRoomForm = document.getElementById('joinRoomForm');
const roomNameInput = document.getElementById('roomName');
const joinSelectRoomButton = document.getElementById('joinSelectRoomButton');
const randomRoomButton = document.getElementById('randomRoomButton');

usernameInput.onkeyup = (e) => {
    if (e.keyCode === 13) {
        e.preventDefault();
        login();
    }
};
passwordInput.onkeyup = (e) => {
    if (e.keyCode === 13) {
        e.preventDefault();
        login();
    }
};

loginBtn.onclick = (e) => {
    login();
};

function login() {
    const username = filterXSS(document.getElementById('username').value);
    const password = filterXSS(document.getElementById('password').value);

    // http://localhost:3000/join/?room=test
    // http://localhost:3000/join/?room=test&name=mirotalk&audio=0&video=0&screen=0&notify=0
    const qs = new URLSearchParams(window.location.search);
    const room = filterXSS(qs.get('room'));

    // http://localhost:3000/join/test
    const pathParts = window.location.pathname.split('/');
    const roomPath = pathParts[pathParts.length - 1];

    if (username && password) {
        axios
            .post('/login', {
                username: username,
                password: password,
            })
            .then(function (response) {
                console.log(response);

                // Store in session
                const token = response.data.message;
                window.sessionStorage.peer_token = token;

                if (room) {
                    window.location.href = '/join/' + window.location.search;
                    return;
                }
                if (roomPath && roomPath !== 'login') {
                    window.location.href = '/join/' + roomPath;
                    return;
                }
                if (token) {
                    // Show Join Room form when logged in and no room specified
                    showJoinRoomForm();
                    return;
                }

                // Fallback
                window.location.href = '/logged';
                return;
            })
            .catch(function (error) {
                console.error(error);
                popup('warning', 'Invalid credentials. Please try again.');
            });
        return;
    }
    if (!username && !password) {
        popup('warning', 'Username and Password required');
        return;
    }
    if (!username) {
        popup('warning', 'Username required');
        return;
    }
    if (!password) {
        popup('warning', 'Password required');
        return;
    }
}

function showJoinRoomForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.style.display = 'none';
    if (joinRoomForm) joinRoomForm.style.display = 'block';

    const doJoin = () => {
        const room = roomNameInput ? filterXSS(roomNameInput.value.trim()) : '';
        const name = filterXSS(document.getElementById('username').value).trim();
        if (!room) {
            popup('warning', 'Room Name required');
            return;
        }
        window.location.href =
            '/join/?room=' +
            encodeURIComponent(room) +
            '&name=' +
            encodeURIComponent(name) +
            '&token=' +
            encodeURIComponent(window.sessionStorage.peer_token);
    };

    if (roomNameInput) {
        roomNameInput.focus();
        roomNameInput.onkeyup = (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                doJoin();
            }
        };
    }
    if (randomRoomButton) {
        randomRoomButton.onclick = (e) => {
            e.preventDefault();
            if (roomNameInput) roomNameInput.value = getUUID4();
        };
    }
    if (joinSelectRoomButton) {
        joinSelectRoomButton.onclick = (e) => {
            e.preventDefault();
            doJoin();
        };
    }
}

function getUUID4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
}
