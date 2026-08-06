'use strict';

console.log(window.location);

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const loginBtn = document.getElementById('loginButton');
const joinRoomForm = document.getElementById('joinRoomForm');
const roomNameInput = document.getElementById('roomName');
const joinSelectRoomButton = document.getElementById('joinSelectRoomButton');
const randomRoomButton = document.getElementById('randomRoomButton');
const shareRoomButton = document.getElementById('shareRoomButton');

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

togglePassword.onclick = () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePassword.classList.toggle('fa-eye', !isPassword);
    togglePassword.classList.toggle('fa-eye-slash', isPassword);
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
                const status = error.response ? error.response.status : 0;
                const serverMsg = error.response && error.response.data ? error.response.data.message : '';
                if (status === 429 && serverMsg) {
                    showLoginError(serverMsg);
                } else {
                    showLoginError('Invalid credentials. Please try again.');
                }
            });
        return;
    }
    if (!username && !password) {
        highlightEmpty(usernameInput);
        highlightEmpty(passwordInput);
        showLoginError('Username and Password required');
        return;
    }
    if (!username) {
        highlightEmpty(usernameInput);
        showLoginError('Username required');
        return;
    }
    if (!password) {
        highlightEmpty(passwordInput);
        showLoginError('Password required');
        return;
    }
}

function highlightEmpty(input) {
    if (!input) return;
    input.classList.add('input-error');
    input.addEventListener(
        'input',
        function () {
            input.classList.remove('input-error');
            hideLoginError();
        },
        { once: true }
    );
    document.addEventListener(
        'mousedown',
        function (e) {
            if (e.target !== input) {
                input.classList.remove('input-error');
            }
        },
        { once: true }
    );
}

function showLoginError(msg) {
    let el = document.getElementById('loginError');
    if (!el) {
        el = document.createElement('p');
        el.id = 'loginError';
        el.className = 'login-error';
        const loginBtn = document.getElementById('loginButton');
        if (loginBtn) loginBtn.parentNode.insertBefore(el, loginBtn);
    }
    el.textContent = translateLoginText(msg);
    el.style.display = 'block';
}

// Translate a UI string via the native i18n layer when active (falls back to English).
function translateLoginText(text) {
    try {
        return window.i18n && typeof window.i18n.t === 'function' ? window.i18n.t(text, 'labels') : text;
    } catch (e) {
        return text;
    }
}

function hideLoginError() {
    const el = document.getElementById('loginError');
    if (el) el.style.display = 'none';
}

function showJoinRoomForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.style.display = 'none';
    if (joinRoomForm) joinRoomForm.style.display = 'block';

    const doJoin = () => {
        const room = roomNameInput ? filterXSS(roomNameInput.value.trim()) : '';
        const name = filterXSS(document.getElementById('username').value).trim();
        if (!room) {
            highlightEmpty(roomNameInput);
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
    if (shareRoomButton) {
        shareRoomButton.onclick = (e) => {
            e.preventDefault();
            const room = roomNameInput ? filterXSS(roomNameInput.value.trim()) : '';
            if (!room) {
                highlightEmpty(roomNameInput);
                return;
            }
            const shareUrl = window.location.origin + '/join/' + encodeURIComponent(room);
            if (navigator.share) {
                navigator.share({ title: 'MiroTalk Room', url: shareUrl }).catch(() => {});
            } else {
                navigator.clipboard
                    .writeText(shareUrl)
                    .then(() => {
                        popup('success', 'Room link copied to clipboard');
                    })
                    .catch(() => {
                        popup('error', 'Failed to copy link');
                    });
            }
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
