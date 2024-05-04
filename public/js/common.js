'use strict';

// ####################################################################
// NEW CALL
// ####################################################################

const adjectives = [
    'small',
    'big',
    'large',
    'smelly',
    'new',
    'happy',
    'shiny',
    'old',
    'clean',
    'nice',
    'bad',
    'cool',
    'hot',
    'cold',
    'warm',
    'hungry',
    'slow',
    'fast',
    'red',
    'white',
    'black',
    'blue',
    'green',
    'basic',
    'strong',
    'cute',
    'poor',
    'nice',
    'huge',
    'rare',
    'lucky',
    'weak',
    'tall',
    'short',
    'tiny',
    'great',
    'long',
    'single',
    'rich',
    'young',
    'dirty',
    'fresh',
    'brown',
    'dark',
    'crazy',
    'sad',
    'loud',
    'brave',
    'calm',
    'silly',
    'smart',
];

const nouns = [
    'dog',
    'bat',
    'wrench',
    'apple',
    'pear',
    'ghost',
    'cat',
    'wolf',
    'squid',
    'goat',
    'snail',
    'hat',
    'sock',
    'plum',
    'bear',
    'snake',
    'turtle',
    'horse',
    'spoon',
    'fork',
    'spider',
    'tree',
    'chair',
    'table',
    'couch',
    'towel',
    'panda',
    'bread',
    'grape',
    'cake',
    'brick',
    'rat',
    'mouse',
    'bird',
    'oven',
    'phone',
    'photo',
    'frog',
    'bear',
    'camel',
    'sheep',
    'shark',
    'tiger',
    'zebra',
    'duck',
    'eagle',
    'fish',
    'kitten',
    'lobster',
    'monkey',
    'owl',
    'puppy',
    'pig',
    'rabbit',
    'fox',
    'whale',
    'beaver',
    'gorilla',
    'lizard',
    'parrot',
    'sloth',
    'swan',
];

let adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
let noun = nouns[Math.floor(Math.random() * nouns.length)];
let num = getRandomNumber(5);
noun = noun.charAt(0).toUpperCase() + noun.substring(1);
adjective = adjective.charAt(0).toUpperCase() + adjective.substring(1);

/**
 * Get random number
 * @param {integer} length of string
 * @returns {string} random number
 */
function getRandomNumber(length) {
    let result = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// Typing Effect

let i = 0;
let txt = num + adjective + noun;
let speed = 100;

/**
 * Set room name with typewriter effect
 */
function typeWriter() {
    if (i < txt.length) {
        roomName.value += txt.charAt(i);
        i++;
        setTimeout(typeWriter, speed);
    }
}

const roomName = document.getElementById('roomName');
if (roomName) {
    roomName.value = '';
    typeWriter();
}

// ####################################################################
// LANDING | NEW CALL
// ####################################################################

const lastRoomContainer = document.getElementById('lastRoomContainer');
const lastRoom = document.getElementById('lastRoom');
const lastRoomName = window.localStorage.lastRoom ? window.localStorage.lastRoom : '';
if (lastRoomContainer && lastRoom && lastRoomName) {
    lastRoomContainer.style.display = 'inline-flex';
    lastRoom.setAttribute('href', '/join/' + lastRoomName);
    lastRoom.innerText = lastRoomName;
}

const genRoomButton = document.getElementById('genRoomButton');
const joinRoomButton = document.getElementById('joinRoomButton');
const adultCnt = document.getElementById('adultCnt');

if (genRoomButton) {
    genRoomButton.onclick = (e) => {
        genRoom();
    };
}

if (joinRoomButton) {
    joinRoomButton.onclick = (e) => {
        joinRoom();
    };
}

if (adultCnt) {
    adultCnt.onclick = (e) => {
        adultContent();
    };
}

document.getElementById('roomName').onkeyup = (e) => {
    if (e.keyCode === 13) {
        e.preventDefault();
        joinRoom();
    }
};

function genRoom() {
    document.getElementById('roomName').value = getUUID4();
}

function getUUID4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
    );
}

function joinRoom() {
    const roomName = filterXSS(document.getElementById('roomName').value);
    if (roomName) {
        window.location.href = '/join/' + roomName;
        window.localStorage.lastRoom = roomName;
    } else {
        alert('Room name empty!\nPlease pick a room name.');
    }
}

function adultContent() {
    if (
        confirm(
            '18+ WARNING! ADULTS ONLY!\n\nExplicit material for viewing by adults 18 years of age or older. You must be at least 18 years old to access to this site!\n\nProceeding you are agree and confirm to have 18+ year.',
        )
    ) {
        window.open('https://luvlounge.ca', '_blank');
    }
}

// #########################################################
// PERMISSIONS
// #########################################################

const qs = new URLSearchParams(window.location.search);
const room_id = filterXSS(qs.get('room_id'));
const message = filterXSS(qs.get('message'));
const showMessage = document.getElementById('message');
console.log('Allow Camera or Audio', {
    room_id: room_id,
    message: message,
});
if (showMessage) showMessage.innerHTML = message;
