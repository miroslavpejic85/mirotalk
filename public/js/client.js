/*
 ██████ ██      ██ ███████ ███    ██ ████████ 
██      ██      ██ ██      ████   ██    ██    
██      ██      ██ █████   ██ ██  ██    ██    
██      ██      ██ ██      ██  ██ ██    ██    
 ██████ ███████ ██ ███████ ██   ████    ██   

MiroTalk Browser Client
Copyright (C) 2021 Miroslav Pejic <miroslav.pejic.85@gmail.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

*/

'use strict'; // https://www.w3schools.com/js/js_strict.asp

const isHttps = false; // must be the same to server.js isHttps
const signalingServerPort = 3000; // must be the same to server.js PORT
const signalingServer = getSignalingServer();
const roomId = getRoomId();
const peerInfo = getPeerInfo();
const peerLoockupUrl = 'https://extreme-ip-lookup.com/json/';
const avatarApiUrl = 'https://eu.ui-avatars.com/api';
const welcomeImg = '../images/image-placeholder.svg';
const shareUrlImg = '../images/image-placeholder.svg';
const leaveRoomImg = '../images/leave-room.png';
const confirmImg = '../images/image-placeholder.svg';
const fileSharingImg = '../images/image-placeholder.svg';
// nice free icon: https://www.iconfinder.com
const roomLockedImg = '../images/locked.png';
const camOffImg = '../images/cam-off.png';
const audioOffImg = '../images/audio-off.png';
const deleteImg = '../images/delete.png';
const youtubeImg = '../images/youtube.png';
const messageImg = '../images/message.png';
const kickedOutImg = '../images/leave-room.png';
const aboutImg = '../images/about.png';

const notifyBySound = true; // turn on - off sound notifications
const fileSharingInput = '*'; // allow all file extensions

const isWebRTCSupported = DetectRTC.isWebRTCSupported;
const isMobileDevice = DetectRTC.isMobileDevice;
const myBrowserName = DetectRTC.browser.name;

const wbImageInput = 'image/*';
const wbWidth = 800;
const wbHeight = 600;

// video cam - screen max frame rate
let videoMaxFrameRate = 30;
let screenMaxFrameRate = 30;

let leftChatAvatar;
let rightChatAvatar;

let callStartTime;
let callElapsedTime;
let recStartTime;
let recElapsedTime;
let mirotalkTheme = 'neon'; // neon - dark - forest - ghost ...
let mirotalkBtnsBar = 'vertical'; // vertical - horizontal
let swalBackground = 'rgba(0, 0, 0, 0.7)'; // black - #16171b - transparent ...
let peerGeo;
let peerConnection;
let myPeerName;
let useAudio = true;
let useVideo = true;
let camera = 'user';
let roomLocked = false;
let myVideoChange = false;
let myHandStatus = false;
let myVideoStatus = true;
let myAudioStatus = true;
let isScreenStreaming = false;
let isChatRoomVisible = false;
let isChatEmojiVisible = false;
let isButtonsVisible = false;
let isMySettingsVisible = false;
let isVideoOnFullScreen = false;
let isDocumentOnFullScreen = false;
let isWhiteboardFs = false;
let isVideoUrlPlayerOpen = false;
let isRecScreenSream = false;
let signalingSocket; // socket.io connection to our webserver
let localMediaStream; // my microphone / webcam
let remoteMediaStream; // peers microphone / webcam
let recScreenStream; // recorded screen stream
let remoteMediaControls = false; // enable - disable peers video player controls (default false)
let peerConnections = {}; // keep track of our peer connections, indexed by peer_id == socket.io id
let chatDataChannels = {}; // keep track of our peer chat data channels
let fileDataChannels = {}; // keep track of our peer file sharing data channels
let peerMediaElements = {}; // keep track of our peer <video> tags, indexed by peer_id
let chatMessages = []; // collect chat messages to save it later if want
let backupIceServers = [{ urls: 'stun:stun.l.google.com:19302' }]; // backup iceServers

let chatInputEmoji = {
    '<3': '\u2764\uFE0F',
    '</3': '\uD83D\uDC94',
    ':D': '\uD83D\uDE00',
    ':)': '\uD83D\uDE03',
    ';)': '\uD83D\uDE09',
    ':(': '\uD83D\uDE12',
    ':p': '\uD83D\uDE1B',
    ';p': '\uD83D\uDE1C',
    ":'(": '\uD83D\uDE22',
    ':+1:': '\uD83D\uDC4D',
}; // https://github.com/wooorm/gemoji/blob/main/support.md

let countTime;
// init audio-video
let initAudioBtn;
let initVideoBtn;
// buttons bar
let buttonsBar;
let shareRoomBtn;
let audioBtn;
let videoBtn;
let swapCameraBtn;
let screenShareBtn;
let recordStreamBtn;
let fullScreenBtn;
let chatRoomBtn;
let myHandBtn;
let whiteboardBtn;
let fileShareBtn;
let mySettingsBtn;
let aboutBtn;
let leaveRoomBtn;
// chat room elements
let msgerDraggable;
let msgerHeader;
let msgerTheme;
let msgerCPBtn;
let msgerClean;
let msgerSaveBtn;
let msgerClose;
let msgerChat;
let msgerEmojiBtn;
let msgerInput;
let msgerSendBtn;
// chat room connected peers
let msgerCP;
let msgerCPHeader;
let msgerCPCloseBtn;
let msgerCPList;
// chat room emoji picker
let msgerEmojiPicker;
let emojiPicker;
// my settings
let mySettings;
let mySettingsHeader;
let tabDevicesBtn;
let tabBandwidthBtn;
let tabRoomBtn;
let tabStylingBtn;
let mySettingsCloseBtn;
let myPeerNameSet;
let myPeerNameSetBtn;
let audioInputSelect;
let audioOutputSelect;
let videoSelect;
let videoQualitySelect;
let videoFpsSelect;
let screenFpsSelect;
let themeSelect;
let btnsBarSelect;
let selectors;
// my video element
let myVideo;
let myVideoWrap;
let myVideoAvatarImage;
// name && hand video audio status
let myVideoParagraph;
let myHandStatusIcon;
let myVideoStatusIcon;
let myAudioStatusIcon;
// record Media Stream
let mediaRecorder;
let recordedBlobs;
let isStreamRecording = false;
// whiteboard init
let whiteboard;
let whiteboardHeader;
let wbDrawingColorEl;
let wbBackgroundColorEl;
let whiteboardPencilBtn;
let whiteboardObjectBtn;
let whiteboardUndoBtn;
let whiteboardRedoBtn;
let whiteboardImgFileBtn;
let whiteboardImgUrlBtn;
let whiteboardTextBtn;
let whiteboardLineBtn;
let whiteboardRectBtn;
let whiteboardCircleBtn;
let whiteboardSaveBtn;
let whiteboardEraserBtn;
let whiteboardCleanBtn;
let whiteboardCloseBtn;
// whiteboard settings
let wbCanvas = null;
let wbIsDrawing = false;
let wbIsOpen = false;
let wbIsRedoing = false;
let wbIsEraser = false;
let wbPop = [];
// room actions btns
let muteEveryoneBtn;
let hideEveryoneBtn;
let lockUnlockRoomBtn;
// file transfer settings
let fileToSend;
let fileReader;
let receiveBuffer = [];
let receivedSize = 0;
let incomingFileInfo;
let incomingFileData;
let sendFileDiv;
let sendFileInfo;
let sendProgress;
let sendAbortBtn;
let sendInProgress = false;
// MTU 1kb to prevent drop.
// const chunkSize = 1024;
const chunkSize = 1024 * 16; // 16kb/s
// video URL player
let videoUrlCont;
let videoUrlHeader;
let videoUrlCloseBtn;
let videoUrlIframe;

/**
 * Load all Html elements by Id
 */
function getHtmlElementsById() {
    countTime = getId('countTime');
    // my video
    myVideo = getId('myVideo');
    myVideoWrap = getId('myVideoWrap');
    myVideoAvatarImage = getId('myVideoAvatarImage');
    // buttons Bar
    buttonsBar = getId('buttonsBar');
    shareRoomBtn = getId('shareRoomBtn');
    audioBtn = getId('audioBtn');
    videoBtn = getId('videoBtn');
    swapCameraBtn = getId('swapCameraBtn');
    screenShareBtn = getId('screenShareBtn');
    recordStreamBtn = getId('recordStreamBtn');
    fullScreenBtn = getId('fullScreenBtn');
    chatRoomBtn = getId('chatRoomBtn');
    whiteboardBtn = getId('whiteboardBtn');
    fileShareBtn = getId('fileShareBtn');
    myHandBtn = getId('myHandBtn');
    mySettingsBtn = getId('mySettingsBtn');
    aboutBtn = getId('aboutBtn');
    leaveRoomBtn = getId('leaveRoomBtn');
    // chat Room elements
    msgerDraggable = getId('msgerDraggable');
    msgerHeader = getId('msgerHeader');
    msgerTheme = getId('msgerTheme');
    msgerCPBtn = getId('msgerCPBtn');
    msgerClean = getId('msgerClean');
    msgerSaveBtn = getId('msgerSaveBtn');
    msgerClose = getId('msgerClose');
    msgerChat = getId('msgerChat');
    msgerEmojiBtn = getId('msgerEmojiBtn');
    msgerInput = getId('msgerInput');
    msgerSendBtn = getId('msgerSendBtn');
    // chat room connected peers
    msgerCP = getId('msgerCP');
    msgerCPHeader = getId('msgerCPHeader');
    msgerCPCloseBtn = getId('msgerCPCloseBtn');
    msgerCPList = getId('msgerCPList');
    // chat room emoji picker
    msgerEmojiPicker = getId('msgerEmojiPicker');
    emojiPicker = getSl('emoji-picker');
    // my settings
    mySettings = getId('mySettings');
    mySettingsHeader = getId('mySettingsHeader');
    tabDevicesBtn = getId('tabDevicesBtn');
    tabBandwidthBtn = getId('tabBandwidthBtn');
    tabRoomBtn = getId('tabRoomBtn');
    tabStylingBtn = getId('tabStylingBtn');
    mySettingsCloseBtn = getId('mySettingsCloseBtn');
    myPeerNameSet = getId('myPeerNameSet');
    myPeerNameSetBtn = getId('myPeerNameSetBtn');
    audioInputSelect = getId('audioSource');
    audioOutputSelect = getId('audioOutput');
    videoSelect = getId('videoSource');
    videoQualitySelect = getId('videoQuality');
    videoFpsSelect = getId('videoFps');
    screenFpsSelect = getId('screenFps');
    themeSelect = getId('mirotalkTheme');
    btnsBarSelect = getId('mirotalkBtnsBar');
    // my conference name, hand, video - audio status
    myVideoParagraph = getId('myVideoParagraph');
    myHandStatusIcon = getId('myHandStatusIcon');
    myVideoStatusIcon = getId('myVideoStatusIcon');
    myAudioStatusIcon = getId('myAudioStatusIcon');
    // my whiteboard
    whiteboard = getId('whiteboard');
    whiteboardHeader = getId('whiteboardHeader');
    wbDrawingColorEl = getId('wbDrawingColorEl');
    wbBackgroundColorEl = getId('wbBackgroundColorEl');
    whiteboardPencilBtn = getId('whiteboardPencilBtn');
    whiteboardObjectBtn = getId('whiteboardObjectBtn');
    whiteboardUndoBtn = getId('whiteboardUndoBtn');
    whiteboardRedoBtn = getId('whiteboardRedoBtn');
    whiteboardImgFileBtn = getId('whiteboardImgFileBtn');
    whiteboardImgUrlBtn = getId('whiteboardImgUrlBtn');
    whiteboardTextBtn = getId('whiteboardTextBtn');
    whiteboardLineBtn = getId('whiteboardLineBtn');
    whiteboardRectBtn = getId('whiteboardRectBtn');
    whiteboardCircleBtn = getId('whiteboardCircleBtn');
    whiteboardSaveBtn = getId('whiteboardSaveBtn');
    whiteboardEraserBtn = getId('whiteboardEraserBtn');
    whiteboardCleanBtn = getId('whiteboardCleanBtn');
    whiteboardCloseBtn = getId('whiteboardCloseBtn');
    // room actions buttons
    muteEveryoneBtn = getId('muteEveryoneBtn');
    hideEveryoneBtn = getId('hideEveryoneBtn');
    lockUnlockRoomBtn = getId('lockUnlockRoomBtn');
    // file send progress
    sendFileDiv = getId('sendFileDiv');
    sendFileInfo = getId('sendFileInfo');
    sendProgress = getId('sendProgress');
    sendAbortBtn = getId('sendAbortBtn');
    // video url player
    videoUrlCont = getId('videoUrlCont');
    videoUrlHeader = getId('videoUrlHeader');
    videoUrlCloseBtn = getId('videoUrlCloseBtn');
    videoUrlIframe = getId('videoUrlIframe');
}

/**
 * Using tippy aka very nice tooltip!
 * https://atomiks.github.io/tippyjs/
 */
function setButtonsTitle() {
    // not need for mobile
    if (isMobileDevice) return;

    // left buttons
    tippy(shareRoomBtn, {
        content: 'Invite people to join',
        placement: 'right-start',
    });
    tippy(audioBtn, {
        content: 'Click to audio OFF',
        placement: 'right-start',
    });
    tippy(videoBtn, {
        content: 'Click to video OFF',
        placement: 'right-start',
    });
    tippy(screenShareBtn, {
        content: 'START screen sharing',
        placement: 'right-start',
    });
    tippy(recordStreamBtn, {
        content: 'START recording',
        placement: 'right-start',
    });
    tippy(fullScreenBtn, {
        content: 'VIEW full screen',
        placement: 'right-start',
    });
    tippy(chatRoomBtn, {
        content: 'OPEN the chat',
        placement: 'right-start',
    });
    tippy(myHandBtn, {
        content: 'RAISE your hand',
        placement: 'right-start',
    });
    tippy(whiteboardBtn, {
        content: 'OPEN the whiteboard',
        placement: 'right-start',
    });
    tippy(fileShareBtn, {
        content: 'SHARE the file',
        placement: 'right-start',
    });
    tippy(mySettingsBtn, {
        content: 'Show settings',
        placement: 'right-start',
    });
    tippy(aboutBtn, {
        content: 'Show about',
        placement: 'right-start',
    });
    tippy(leaveRoomBtn, {
        content: 'Leave this room',
        placement: 'right-start',
    });

    // chat room buttons
    tippy(msgerTheme, {
        content: 'Ghost theme',
    });
    tippy(msgerCPBtn, {
        content: 'Private messages',
    });
    tippy(msgerClean, {
        content: 'Clean messages',
    });
    tippy(msgerSaveBtn, {
        content: 'Save messages',
    });
    tippy(msgerClose, {
        content: 'Close the chat',
    });
    tippy(msgerEmojiBtn, {
        content: 'Emoji',
    });
    tippy(msgerSendBtn, {
        content: 'Send',
    });

    // settings
    tippy(mySettingsCloseBtn, {
        content: 'Close settings',
    });
    tippy(myPeerNameSetBtn, {
        content: 'Change name',
    });

    // whiteboard btns
    tippy(wbDrawingColorEl, {
        content: 'DRAWING color',
        placement: 'bottom',
    });
    tippy(wbBackgroundColorEl, {
        content: 'BACKGROUND color',
        placement: 'bottom',
    });
    tippy(whiteboardPencilBtn, {
        content: 'DRAWING mode',
        placement: 'bottom',
    });
    tippy(whiteboardObjectBtn, {
        content: 'OBJECT mode',
        placement: 'bottom',
    });
    tippy(whiteboardUndoBtn, {
        content: 'UNDO the board',
        placement: 'bottom',
    });
    tippy(whiteboardRedoBtn, {
        content: 'REDO the board',
        placement: 'bottom',
    });
    tippy(whiteboardImgFileBtn, {
        content: 'ADD image from file',
        placement: 'bottom',
    });
    tippy(whiteboardImgUrlBtn, {
        content: 'ADD image from URL',
        placement: 'bottom',
    });
    tippy(whiteboardTextBtn, {
        content: 'ADD the text',
        placement: 'bottom',
    });
    tippy(whiteboardLineBtn, {
        content: 'ADD the line',
        placement: 'bottom',
    });
    tippy(whiteboardRectBtn, {
        content: 'ADD the rectangle',
        placement: 'bottom',
    });
    tippy(whiteboardCircleBtn, {
        content: 'ADD the circle',
        placement: 'bottom',
    });
    tippy(whiteboardSaveBtn, {
        content: 'SAVE the board',
        placement: 'bottom',
    });
    tippy(whiteboardEraserBtn, {
        content: 'ERASE the object',
        placement: 'bottom',
    });
    tippy(whiteboardCleanBtn, {
        content: 'CLEAN the board',
        placement: 'bottom',
    });
    tippy(whiteboardCloseBtn, {
        content: 'CLOSE the board',
        placement: 'bottom',
    });

    // room actions btn
    tippy(muteEveryoneBtn, {
        content: 'MUTE everyone except yourself',
        placement: 'top',
    });
    tippy(hideEveryoneBtn, {
        content: 'HIDE everyone except yourself',
        placement: 'top',
    });

    // Suspend File transfer btn
    tippy(sendAbortBtn, {
        content: 'ABORT file transfer',
        placement: 'right-start',
    });

    // video URL player
    tippy(videoUrlCloseBtn, {
        content: 'Close the videoPlayer',
    });
    tippy(msgerVideoUrlBtn, {
        content: 'Share YouTube video to all participants',
    });
}

/**
 * Get peer info using DetecRTC
 * https://github.com/muaz-khan/DetectRTC
 * @return Obj peer info
 */
function getPeerInfo() {
    return {
        detectRTCversion: DetectRTC.version,
        isWebRTCSupported: DetectRTC.isWebRTCSupported,
        isMobileDevice: DetectRTC.isMobileDevice,
        osName: DetectRTC.osName,
        osVersion: DetectRTC.osVersion,
        browserName: DetectRTC.browser.name,
        browserVersion: DetectRTC.browser.version,
    };
}

/**
 * Get approximative peer geolocation
 * @return json
 */
function getPeerGeoLocation() {
    fetch(peerLoockupUrl)
        .then((res) => res.json())
        .then((outJson) => {
            peerGeo = outJson;
        })
        .catch((err) => console.error(err));
}

/**
 * Get Signaling server URL
 * @return Signaling server URL
 */
function getSignalingServer() {
    if (isHttps) {
        return 'https://' + 'localhost' + ':' + signalingServerPort;
        // outside of localhost change it with YOUR-SERVER-DOMAIN
    }
    return (
        'http' +
        (location.hostname == 'localhost' ? '' : 's') +
        '://' +
        location.hostname +
        (location.hostname == 'localhost' ? ':' + signalingServerPort : '')
    );
}

/**
 * Generate random Room id
 * @return Room Id
 */
function getRoomId() {
    // skip /join/
    let roomId = location.pathname.substring(6);
    // if not specified room id, create one random
    if (roomId == '') {
        roomId = makeId(12);
        const newurl = signalingServer + '/join/' + roomId;
        window.history.pushState({ url: newurl }, roomId, newurl);
    }
    return roomId;
}

/**
 * Generate random Id
 * @param {*} length
 * @returns random id
 */
function makeId(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/**
 * Check if there is peer connections
 * @return true, false otherwise
 */
function thereIsPeerConnections() {
    if (Object.keys(peerConnections).length === 0) return false;
    return true;
}

/**
 * On body load Get started
 */
function initClientPeer() {
    setTheme(mirotalkTheme);

    if (!isWebRTCSupported) {
        userLog('error', 'This browser seems not supported WebRTC!');
        return;
    }

    console.log('Connecting to signaling server');
    signalingSocket = io(signalingServer);

    // on receiving data from signaling server...
    signalingSocket.on('connect', handleConnect);
    signalingSocket.on('roomIsLocked', handleRoomLocked);
    signalingSocket.on('roomStatus', handleRoomStatus);
    signalingSocket.on('addPeer', handleAddPeer);
    signalingSocket.on('sessionDescription', handleSessionDescription);
    signalingSocket.on('iceCandidate', handleIceCandidate);
    signalingSocket.on('peerName', handlePeerName);
    signalingSocket.on('peerStatus', handlePeerStatus);
    signalingSocket.on('peerAction', handlePeerAction);
    signalingSocket.on('wbCanvasToJson', handleJsonToWbCanvas);
    signalingSocket.on('whiteboardAction', handleWhiteboardAction);
    signalingSocket.on('kickOut', handleKickedOut);
    signalingSocket.on('fileInfo', handleFileInfo);
    signalingSocket.on('fileAbort', handleFileAbort);
    signalingSocket.on('videoPlayer', handleVideoPlayer);
    signalingSocket.on('disconnect', handleDisconnect);
    signalingSocket.on('removePeer', handleRemovePeer);
} // end [initClientPeer]

/**
 * Send async data to signaling server (server.js)
 * @param {*} msg msg to send to signaling server
 * @param {*} config JSON data to send to signaling server
 */
async function sendToServer(msg, config = {}) {
    await signalingSocket.emit(msg, config);
}

/**
 * Connected to Signaling Server. Once the user has given us access to their
 * microphone/cam, join the channel and start peering up
 */
function handleConnect() {
    console.log('Connected to signaling server');
    if (localMediaStream) joinToChannel();
    else
        setupLocalMedia(() => {
            whoAreYou();
        });
}

/**
 * set your name for the conference
 */
function whoAreYou() {
    playSound('newMessage');

    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: swalBackground,
        position: 'center',
        imageAlt: 'mirotalk-name',
        imageUrl: welcomeImg,
        title: 'Enter your name',
        input: 'text',
        html: `<br>
        <div style="overflow: hidden;">
            <button id="initAudioBtn" class="fas fa-microphone" onclick="handleAudio(event, true)"></button>
            <button id="initVideoBtn" class="fas fa-video" onclick="handleVideo(event, true)"></button>
        </div>`,
        confirmButtonText: `Join meeting`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
        inputValidator: (value) => {
            if (!value) return 'Please enter your name';

            document.body.style.backgroundImage = 'none';
            myVideoWrap.style.display = 'inline';
            logStreamSettingsInfo('localMediaStream', localMediaStream);
            attachMediaStream(myVideo, localMediaStream);
            resizeVideos();

            myPeerName = value;
            myVideoParagraph.innerHTML = myPeerName + ' (me)';
            setPeerAvatarImgName('myVideoAvatarImage', myPeerName);
            setPeerChatAvatarImgName('right', myPeerName);
            joinToChannel();
        },
    }).then(() => {
        welcomeUser();
    });

    if (isMobileDevice) return;

    initAudioBtn = getId('initAudioBtn');
    initVideoBtn = getId('initVideoBtn');

    tippy(initAudioBtn, {
        content: 'Click to audio OFF',
        placement: 'top',
    });
    tippy(initVideoBtn, {
        content: 'Click to video OFF',
        placement: 'top',
    });
}

/**
 * join to chennel and send some peer info
 */
function joinToChannel() {
    console.log('join to channel', roomId);
    sendToServer('join', {
        channel: roomId,
        peer_info: peerInfo,
        peer_geo: peerGeo,
        peer_name: myPeerName,
        peer_video: myVideoStatus,
        peer_audio: myAudioStatus,
        peer_hand: myHandStatus,
        peer_rec: isRecScreenSream,
    });
}

/**
 * welcome message
 */
function welcomeUser() {
    const myRoomUrl = window.location.href;
    playSound('newMessage');
    Swal.fire({
        background: swalBackground,
        position: 'center',
        title: '<strong>Welcome ' + myPeerName + '</strong>',
        imageAlt: 'mirotalk-welcome',
        imageUrl: welcomeImg,
        html:
            `
        <br/> 
        <p style="color:white;">Share this meeting invite others to join.</p>
        <p style="color:rgb(8, 189, 89);">` +
            myRoomUrl +
            `</p>`,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: `Copy meeting URL`,
        denyButtonText: `Email invite`,
        cancelButtonText: `Close`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        if (result.isConfirmed) {
            copyRoomURL();
        } else if (result.isDenied) {
            let message = {
                email: '',
                subject: 'Please join our MiroTalk Video Chat Meeting',
                body: 'Click to join: ' + myRoomUrl,
            };
            shareRoomByEmail(message);
        }
    });
}

/**
 * When we join a group, our signaling server will send out 'addPeer' events to each pair of users in the group (creating a fully-connected graph of users,
 * ie if there are 6 people in the channel you will connect directly to the other 5, so there will be a total of 15 connections in the network).
 *
 * @param {*} config
 */
function handleAddPeer(config) {
    // console.log("addPeer", JSON.stringify(config));

    let peer_id = config.peer_id;
    let peers = config.peers;
    let should_create_offer = config.should_create_offer;
    let iceServers = config.iceServers;

    if (peer_id in peerConnections) {
        // This could happen if the user joins multiple channels where the other peer is also in.
        console.log('Already connected to peer', peer_id);
        return;
    }

    if (!iceServers) iceServers = backupIceServers;
    console.log('iceServers', iceServers[0]);

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    peerConnection = new RTCPeerConnection({ iceServers: iceServers });
    peerConnections[peer_id] = peerConnection;

    msgerAddPeers(peers);
    handleOnIceCandidate(peer_id);
    handleOnTrack(peer_id, peers);
    handleAddTracks(peer_id);
    handleRTCDataChannels(peer_id);
    if (should_create_offer) handleRtcOffer(peer_id);

    playSound('addPeer');
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onicecandidate
 *
 * @param {*} peer_id
 */
function handleOnIceCandidate(peer_id) {
    peerConnections[peer_id].onicecandidate = (event) => {
        if (!event.candidate) return;
        sendToServer('relayICE', {
            peer_id: peer_id,
            ice_candidate: {
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                candidate: event.candidate.candidate,
            },
        });
    };
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/ontrack
 *
 * @param {*} peer_id
 * @param {*} peers
 */
function handleOnTrack(peer_id, peers) {
    peerConnections[peer_id].ontrack = (event) => {
        console.log('handleOnTrack', event);
        if (event.track.kind === 'video') {
            loadRemoteMediaStream(event.streams[0], peers, peer_id);
        }
    };
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
 *
 * @param {*} peer_id
 */
function handleAddTracks(peer_id) {
    localMediaStream.getTracks().forEach((track) => {
        peerConnections[peer_id].addTrack(track, localMediaStream);
    });
}

/**
 * Secure RTC Data Channel
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/ondatachannel
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/onmessage
 *
 * @param {*} peer_id
 */
function handleRTCDataChannels(peer_id) {
    peerConnections[peer_id].ondatachannel = (event) => {
        console.log('handleRTCDataChannels ' + peer_id, event);
        event.channel.onmessage = (msg) => {
            switch (event.channel.label) {
                case 'mirotalk_chat_channel':
                    try {
                        let dataMessage = JSON.parse(msg.data);
                        handleDataChannelChat(dataMessage);
                    } catch (err) {
                        console.error('handleDataChannelChat', err);
                    }
                    break;
                case 'mirotalk_file_sharing_channel':
                    try {
                        let dataFile = msg.data;
                        handleDataChannelFileSharing(dataFile);
                    } catch (err) {
                        console.error('handleDataChannelFS', err);
                    }
                    break;
            }
        };
    };
    createChatDataChannel(peer_id);
    createFileSharingDataChannel(peer_id);
}

/**
 * Only one side of the peer connection should create the offer, the signaling server picks one to be the offerer.
 * The other user will get a 'sessionDescription' event and will create an offer, then send back an answer 'sessionDescription' to us
 *
 * @param {*} peer_id
 */
function handleRtcOffer(peer_id) {
    console.log('Creating RTC offer to', peer_id);
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
    peerConnections[peer_id]
        .createOffer()
        .then((local_description) => {
            console.log('Local offer description is', local_description);
            // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
            peerConnections[peer_id]
                .setLocalDescription(local_description)
                .then(() => {
                    sendToServer('relaySDP', {
                        peer_id: peer_id,
                        session_description: local_description,
                    });
                    console.log('Offer setLocalDescription done!');
                })
                .catch((err) => {
                    console.error('[Error] offer setLocalDescription', err);
                    userLog('error', 'Offer setLocalDescription failed ' + err);
                });
        })
        .catch((err) => {
            console.error('[Error] sending offer', err);
        });
}

/**
 * Peers exchange session descriptions which contains information about their audio / video settings and that sort of stuff. First
 * the 'offerer' sends a description to the 'answerer' (with type "offer"), then the answerer sends one back (with type "answer").
 *
 * @param {*} config
 */
function handleSessionDescription(config) {
    console.log('Remote Session Description', config);

    let peer_id = config.peer_id;
    let remote_description = config.session_description;

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription
    let description = new RTCSessionDescription(remote_description);

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription
    peerConnections[peer_id]
        .setRemoteDescription(description)
        .then(() => {
            console.log('setRemoteDescription done!');
            if (remote_description.type == 'offer') {
                console.log('Creating answer');
                // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
                peerConnections[peer_id]
                    .createAnswer()
                    .then((local_description) => {
                        console.log('Answer description is: ', local_description);
                        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
                        peerConnections[peer_id]
                            .setLocalDescription(local_description)
                            .then(() => {
                                sendToServer('relaySDP', {
                                    peer_id: peer_id,
                                    session_description: local_description,
                                });
                                console.log('Answer setLocalDescription done!');
                            })
                            .catch((err) => {
                                console.error('[Error] answer setLocalDescription', err);
                                userLog('error', 'Answer setLocalDescription failed ' + err);
                            });
                    })
                    .catch((err) => {
                        console.error('[Error] creating answer', err);
                    });
            } // end [if type offer]
        })
        .catch((err) => {
            console.error('[Error] setRemoteDescription', err);
        });
}

/**
 * The offerer will send a number of ICE Candidate blobs to the answerer so they
 * can begin trying to find the best path to one another on the net.
 *
 * @param {*} config
 */
function handleIceCandidate(config) {
    let peer_id = config.peer_id;
    let ice_candidate = config.ice_candidate;
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate
    peerConnections[peer_id].addIceCandidate(new RTCIceCandidate(ice_candidate)).catch((err) => {
        console.error('[Error] addIceCandidate', err);
    });
}

/**
 * Disconnected from Signaling Server. Tear down all of our peer connections
 * and remove all the media divs when we disconnect from signaling server
 */
function handleDisconnect() {
    console.log('Disconnected from signaling server');
    for (let peer_id in peerMediaElements) {
        document.body.removeChild(peerMediaElements[peer_id].parentNode);
        resizeVideos();
    }
    for (let peer_id in peerConnections) {
        peerConnections[peer_id].close();
        msgerRemovePeer(peer_id);
    }
    chatDataChannels = {};
    fileDataChannels = {};
    peerConnections = {};
    peerMediaElements = {};
}

/**
 * When a user leaves a channel (or is disconnected from the signaling server) everyone will recieve a 'removePeer' message
 * telling them to trash the media channels they have open for those that peer. If it was this client that left a channel,
 * they'll also receive the removePeers. If this client was disconnected, they wont receive removePeers, but rather the
 * signaling_socket.on('disconnect') code will kick in and tear down all the peer sessions.
 *
 * @param {*} config
 */
function handleRemovePeer(config) {
    console.log('Signaling server said to remove peer:', config);

    let peer_id = config.peer_id;

    if (peer_id in peerMediaElements) {
        document.body.removeChild(peerMediaElements[peer_id].parentNode);
        resizeVideos();
    }
    if (peer_id in peerConnections) peerConnections[peer_id].close();

    msgerRemovePeer(peer_id);

    delete chatDataChannels[peer_id];
    delete fileDataChannels[peer_id];
    delete peerConnections[peer_id];
    delete peerMediaElements[peer_id];

    playSound('removePeer');
}

/**
 * Set mirotalk theme neon | dark | forest | sky | ghost | ...
 * @param {*} theme
 */
function setTheme(theme) {
    if (!theme) return;

    mirotalkTheme = theme;
    switch (mirotalkTheme) {
        case 'neon':
            // neon theme
            swalBackground = 'rgba(0, 0, 0, 0.7)';
            document.documentElement.style.setProperty('--body-bg', 'black');
            document.documentElement.style.setProperty('--msger-bg', 'linear-gradient(to left, #383838, #000000)');
            document.documentElement.style.setProperty(
                '--msger-private-bg',
                'linear-gradient(to left, #383838, #000000)',
            );
            document.documentElement.style.setProperty('--left-msg-bg', '#da05f3');
            document.documentElement.style.setProperty('--private-msg-bg', '#f77070');
            document.documentElement.style.setProperty('--right-msg-bg', '#579ffb');
            document.documentElement.style.setProperty('--wb-bg', 'linear-gradient(to left, #1f1e1e, #000000)');
            document.documentElement.style.setProperty('--wb-hbg', '#000000');
            document.documentElement.style.setProperty('--btn-bg', 'white');
            document.documentElement.style.setProperty('--btn-color', 'black');
            document.documentElement.style.setProperty('--btns-left', '20px');
            document.documentElement.style.setProperty('--btn-opc', '1');
            document.documentElement.style.setProperty('--my-settings-label-color', 'white');
            document.documentElement.style.setProperty('--box-shadow', '3px 3px 6px #0500ff, -3px -3px 6px #da05f3');
            break;
        case 'dark':
            // dark theme
            swalBackground = 'rgba(0, 0, 0, 0.7)';
            document.documentElement.style.setProperty('--body-bg', '#16171b');
            document.documentElement.style.setProperty('--msger-bg', 'linear-gradient(to left, #383838, #000000)');
            document.documentElement.style.setProperty(
                '--msger-private-bg',
                'linear-gradient(to left, #383838, #000000)',
            );
            document.documentElement.style.setProperty('--left-msg-bg', '#222328');
            document.documentElement.style.setProperty('--private-msg-bg', '#f77070');
            document.documentElement.style.setProperty('--right-msg-bg', '#0a0b0c');
            document.documentElement.style.setProperty('--wb-bg', 'linear-gradient(to left, #1f1e1e, #000000)');
            document.documentElement.style.setProperty('--wb-hbg', '#000000');
            document.documentElement.style.setProperty('--btn-bg', 'white');
            document.documentElement.style.setProperty('--btn-color', 'black');
            document.documentElement.style.setProperty('--btns-left', '20px');
            document.documentElement.style.setProperty('--btn-opc', '1');
            document.documentElement.style.setProperty('--my-settings-label-color', 'white');
            document.documentElement.style.setProperty('--box-shadow', '3px 3px 6px #0a0b0c, -3px -3px 6px #222328');
            break;
        case 'forest':
            // forest theme
            swalBackground = 'rgba(0, 0, 0, 0.7)';
            document.documentElement.style.setProperty('--body-bg', 'black');
            document.documentElement.style.setProperty('--msger-bg', 'linear-gradient(to left, #383838, #000000)');
            document.documentElement.style.setProperty(
                '--msger-private-bg',
                'linear-gradient(to left, #383838, #000000)',
            );
            document.documentElement.style.setProperty('--left-msg-bg', '#2e3500');
            document.documentElement.style.setProperty('--private-msg-bg', '#f77070');
            document.documentElement.style.setProperty('--right-msg-bg', '#004b1c');
            document.documentElement.style.setProperty('--wb-bg', 'linear-gradient(to left, #1f1e1e, #000000)');
            document.documentElement.style.setProperty('--wb-hbg', '#000000');
            document.documentElement.style.setProperty('--btn-bg', 'white');
            document.documentElement.style.setProperty('--btn-color', 'black');
            document.documentElement.style.setProperty('--btns-left', '20px');
            document.documentElement.style.setProperty('--btn-opc', '1');
            document.documentElement.style.setProperty('--my-settings-label-color', 'white');
            document.documentElement.style.setProperty('--box-shadow', '3px 3px 6px #27944f, -3px -3px 6px #14843d');
            break;
        case 'sky':
            // sky theme
            swalBackground = 'rgba(0, 0, 0, 0.7)';
            document.documentElement.style.setProperty('--body-bg', 'black');
            document.documentElement.style.setProperty('--msger-bg', 'linear-gradient(to left, #383838, #000000)');
            document.documentElement.style.setProperty(
                '--msger-private-bg',
                'linear-gradient(to left, #383838, #000000)',
            );
            document.documentElement.style.setProperty('--left-msg-bg', '#0c95b7');
            document.documentElement.style.setProperty('--private-msg-bg', '#f77070');
            document.documentElement.style.setProperty('--right-msg-bg', '#012a5f');
            document.documentElement.style.setProperty('--wb-bg', 'linear-gradient(to left, #1f1e1e, #000000)');
            document.documentElement.style.setProperty('--wb-hbg', '#000000');
            document.documentElement.style.setProperty('--btn-bg', 'white');
            document.documentElement.style.setProperty('--btn-color', 'black');
            document.documentElement.style.setProperty('--btns-left', '20px');
            document.documentElement.style.setProperty('--btn-opc', '1');
            document.documentElement.style.setProperty('--my-settings-label-color', 'white');
            document.documentElement.style.setProperty('--box-shadow', '3px 3px 6px #03a5ce, -3px -3px 6px #03a5ce');
            break;
        case 'ghost':
            // ghost theme
            swalBackground = 'rgba(0, 0, 0, 0.150)';
            document.documentElement.style.setProperty('--body-bg', 'black');
            document.documentElement.style.setProperty(
                '--msger-bg',
                'linear-gradient(to left, transparent, rgba(0, 0, 0, 0.7))',
            );
            document.documentElement.style.setProperty(
                '--msger-private-bg',
                'linear-gradient(to left, #383838, #000000)',
            );
            document.documentElement.style.setProperty('--wb-bg', 'transparent');
            document.documentElement.style.setProperty('--wb-hbg', '#000000');
            document.documentElement.style.setProperty('--btn-bg', 'white');
            document.documentElement.style.setProperty('--btn-color', 'black');
            document.documentElement.style.setProperty('--btns-left', '5px');
            document.documentElement.style.setProperty('--btn-opc', '0.7');
            document.documentElement.style.setProperty('--box-shadow', '0px');
            document.documentElement.style.setProperty('--my-settings-label-color', 'white');
            document.documentElement.style.setProperty('--left-msg-bg', 'rgba(0, 0, 0, 0.7)');
            document.documentElement.style.setProperty('--private-msg-bg', 'rgba(252, 110, 110, 0.7)');
            document.documentElement.style.setProperty('--right-msg-bg', 'rgba(0, 0, 0, 0.7)');
            break;
        // ...
        default:
            console.log('No theme found');
    }

    setButtonsBarPosition(mirotalkBtnsBar);
}

/**
 * Set buttons bar position
 * @param {*} position vertical / horizontal
 */
function setButtonsBarPosition(position) {
    if (!position || isMobileDevice) return;

    mirotalkBtnsBar = position;
    switch (mirotalkBtnsBar) {
        case 'vertical':
            let btnsLeft = mirotalkTheme === 'ghost' ? '5px' : '20px';
            document.documentElement.style.setProperty('--btns-top', '50%');
            document.documentElement.style.setProperty('--btns-right', '0px');
            document.documentElement.style.setProperty('--btns-left', btnsLeft);
            document.documentElement.style.setProperty('--btns-margin-left', '0px');
            document.documentElement.style.setProperty('--btns-width', '40px');
            document.documentElement.style.setProperty('--btns-flex-direction', 'column');
            break;
        case 'horizontal':
            document.documentElement.style.setProperty('--btns-top', '95%');
            document.documentElement.style.setProperty('--btns-right', '25%');
            document.documentElement.style.setProperty('--btns-left', '50%');
            document.documentElement.style.setProperty('--btns-margin-left', '-300px');
            document.documentElement.style.setProperty('--btns-width', '600px');
            document.documentElement.style.setProperty('--btns-flex-direction', 'row');
            break;
        default:
            console.log('No position found');
    }
}

/**
 * Setup local media stuff. Ask user for permission to use the computers microphone and/or camera,
 * attach it to an <audio> or <video> tag if they give us access.
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
 *
 * @param {*} callback
 * @param {*} errorback
 */
function setupLocalMedia(callback, errorback) {
    // if we've already been initialized do nothing
    if (localMediaStream != null) {
        if (callback) callback();
        return;
    }

    getPeerGeoLocation();

    console.log('Requesting access to local audio / video inputs');

    // default | qvgaVideo | vgaVideo | hdVideo | fhdVideo | 4kVideo |
    let videoConstraints =
        myBrowserName === 'Firefox' ? getVideoConstraints('useVideo') : getVideoConstraints('default');

    const constraints = {
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
        },
        video: videoConstraints,
    };

    navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
            loadLocalMedia(stream);
            if (callback) callback();
        })
        .catch((err) => {
            // https://blog.addpipe.com/common-getusermedia-errors/
            console.error('Access denied for audio/video', err);
            playSound('error');
            window.location.href = `/permission?roomId=${roomId}&getUserMediaError=${err.toString()}`;
            if (errorback) errorback();
        });
} // end [setup_local_stream]

/**
 * Load Local Media Stream obj
 * @param {*} stream
 */
function loadLocalMedia(stream) {
    console.log('Access granted to audio/video');
    // hide loading div
    getId('loadingDiv').style.display = 'none';

    localMediaStream = stream;

    // local video elemets
    const videoWrap = document.createElement('div');
    const localMedia = document.createElement('video');

    // handle my peer name video audio status
    const myStatusMenu = document.createElement('div');
    const myCountTimeImg = document.createElement('i');
    const myCountTime = document.createElement('p');
    const myVideoParagraphImg = document.createElement('i');
    const myVideoParagraph = document.createElement('h4');
    const myHandStatusIcon = document.createElement('button');
    const myVideoStatusIcon = document.createElement('button');
    const myAudioStatusIcon = document.createElement('button');
    const myVideoFullScreenBtn = document.createElement('button');
    const myVideoAvatarImage = document.createElement('img');

    // menu Status
    myStatusMenu.setAttribute('id', 'myStatusMenu');
    myStatusMenu.className = 'statusMenu';

    // session time
    myCountTimeImg.setAttribute('id', 'countTimeImg');
    myCountTimeImg.className = 'fas fa-clock';
    myCountTime.setAttribute('id', 'countTime');
    tippy(myCountTime, {
        content: 'Session Time',
    });
    // my peer name
    myVideoParagraphImg.setAttribute('id', 'myVideoParagraphImg');
    myVideoParagraphImg.className = 'fas fa-user';
    myVideoParagraph.setAttribute('id', 'myVideoParagraph');
    myVideoParagraph.className = 'videoPeerName';
    tippy(myVideoParagraph, {
        content: 'My name',
    });
    // my hand status element
    myHandStatusIcon.setAttribute('id', 'myHandStatusIcon');
    myHandStatusIcon.className = 'fas fa-hand-paper pulsate';
    myHandStatusIcon.style.setProperty('color', 'rgb(0, 255, 0)');
    tippy(myHandStatusIcon, {
        content: 'My hand is RAISED',
    });
    // my video status element
    myVideoStatusIcon.setAttribute('id', 'myVideoStatusIcon');
    myVideoStatusIcon.className = 'fas fa-video';
    tippy(myVideoStatusIcon, {
        content: 'My video is ON',
    });
    // my audio status element
    myAudioStatusIcon.setAttribute('id', 'myAudioStatusIcon');
    myAudioStatusIcon.className = 'fas fa-microphone';
    tippy(myAudioStatusIcon, {
        content: 'My audio is ON',
    });
    // my video full screen mode
    myVideoFullScreenBtn.setAttribute('id', 'myVideoFullScreenBtn');
    myVideoFullScreenBtn.className = 'fas fa-expand';
    tippy(myVideoFullScreenBtn, {
        content: 'Full screen mode',
    });
    // my video avatar image
    myVideoAvatarImage.setAttribute('id', 'myVideoAvatarImage');
    myVideoAvatarImage.className = 'videoAvatarImage pulsate';

    // add elements to myStatusMenu div
    myStatusMenu.appendChild(myCountTimeImg);
    myStatusMenu.appendChild(myCountTime);
    myStatusMenu.appendChild(myVideoParagraphImg);
    myStatusMenu.appendChild(myVideoParagraph);
    myStatusMenu.appendChild(myHandStatusIcon);
    myStatusMenu.appendChild(myVideoStatusIcon);
    myStatusMenu.appendChild(myAudioStatusIcon);
    myStatusMenu.appendChild(myVideoFullScreenBtn);

    // hand display none on default menad is raised == false
    myHandStatusIcon.style.display = 'none';

    localMedia.setAttribute('id', 'myVideo');
    localMedia.setAttribute('playsinline', true);
    localMedia.className = 'mirror';
    localMedia.autoplay = true;
    localMedia.muted = true;
    localMedia.volume = 0;
    localMedia.controls = false;

    videoWrap.className = 'video';
    videoWrap.setAttribute('id', 'myVideoWrap');

    // add elements to video wrap div
    videoWrap.appendChild(myStatusMenu);
    videoWrap.appendChild(myVideoAvatarImage);
    videoWrap.appendChild(localMedia);

    document.body.appendChild(videoWrap);
    videoWrap.style.display = 'none';

    getHtmlElementsById();
    setButtonsTitle();
    manageLeftButtons();
    handleBodyOnMouseMove();
    setupMySettings();
    setupVideoUrlPlayer();
    startCountTime();
    handleVideoPlayerFs('myVideo', 'myVideoFullScreenBtn');
}

/**
 * Load Remote Media Stream obj
 * @param {*} stream
 * @param {*} peers
 * @param {*} peer_id
 */
function loadRemoteMediaStream(stream, peers, peer_id) {
    // get data from peers obj
    let peer_name = peers[peer_id]['peer_name'];
    let peer_video = peers[peer_id]['peer_video'];
    let peer_audio = peers[peer_id]['peer_audio'];
    let peer_hand = peers[peer_id]['peer_hand'];
    let peer_rec = peers[peer_id]['peer_rec'];

    remoteMediaStream = stream;

    // remote video elements
    const remoteVideoWrap = document.createElement('div');
    const remoteMedia = document.createElement('video');

    // handle peers name video audio status
    const remoteStatusMenu = document.createElement('div');
    const remoteVideoParagraphImg = document.createElement('i');
    const remoteVideoParagraph = document.createElement('h4');
    const remoteHandStatusIcon = document.createElement('button');
    const remoteVideoStatusIcon = document.createElement('button');
    const remoteAudioStatusIcon = document.createElement('button');
    const remotePrivateMsgBtn = document.createElement('button');
    const remoteYoutubeBtnBtn = document.createElement('button');
    const remotePeerKickOut = document.createElement('button');
    const remoteVideoFullScreenBtn = document.createElement('button');
    const remoteVideoAvatarImage = document.createElement('img');

    // menu Status
    remoteStatusMenu.setAttribute('id', peer_id + '_menuStatus');
    remoteStatusMenu.className = 'statusMenu';

    // remote peer name element
    remoteVideoParagraphImg.setAttribute('id', peer_id + '_nameImg');
    remoteVideoParagraphImg.className = 'fas fa-user';
    remoteVideoParagraph.setAttribute('id', peer_id + '_name');
    remoteVideoParagraph.className = 'videoPeerName';
    tippy(remoteVideoParagraph, {
        content: 'Participant name',
    });
    const peerVideoText = document.createTextNode(peers[peer_id]['peer_name']);
    remoteVideoParagraph.appendChild(peerVideoText);
    // remote hand status element
    remoteHandStatusIcon.setAttribute('id', peer_id + '_handStatus');
    remoteHandStatusIcon.style.setProperty('color', 'rgb(0, 255, 0)');
    remoteHandStatusIcon.className = 'fas fa-hand-paper pulsate';
    tippy(remoteHandStatusIcon, {
        content: 'Participant hand is RAISED',
    });
    // remote video status element
    remoteVideoStatusIcon.setAttribute('id', peer_id + '_videoStatus');
    remoteVideoStatusIcon.className = 'fas fa-video';
    tippy(remoteVideoStatusIcon, {
        content: 'Participant video is ON',
    });
    // remote audio status element
    remoteAudioStatusIcon.setAttribute('id', peer_id + '_audioStatus');
    remoteAudioStatusIcon.className = 'fas fa-microphone';
    tippy(remoteAudioStatusIcon, {
        content: 'Participant audio is ON',
    });
    // remote peer YouTube video
    remoteYoutubeBtnBtn.setAttribute('id', peer_id + '_youtube');
    remoteYoutubeBtnBtn.className = 'fab fa-youtube';
    tippy(remoteYoutubeBtnBtn, {
        content: 'Send YouTube video',
    });
    // remote private message
    remotePrivateMsgBtn.setAttribute('id', peer_id + '_privateMsg');
    remotePrivateMsgBtn.className = 'fas fa-paper-plane';
    tippy(remotePrivateMsgBtn, {
        content: 'Send private message',
    });
    // remote peer kick out
    remotePeerKickOut.setAttribute('id', peer_id + '_kickOut');
    remotePeerKickOut.className = 'fas fa-sign-out-alt';
    tippy(remotePeerKickOut, {
        content: 'Kick out',
    });
    // remote video full screen mode
    remoteVideoFullScreenBtn.setAttribute('id', peer_id + '_fullScreen');
    remoteVideoFullScreenBtn.className = 'fas fa-expand';
    tippy(remoteVideoFullScreenBtn, {
        content: 'Full screen mode',
    });
    // my video avatar image
    remoteVideoAvatarImage.setAttribute('id', peer_id + '_avatar');
    remoteVideoAvatarImage.className = 'videoAvatarImage pulsate';

    // add elements to remoteStatusMenu div
    remoteStatusMenu.appendChild(remoteVideoParagraphImg);
    remoteStatusMenu.appendChild(remoteVideoParagraph);
    remoteStatusMenu.appendChild(remoteHandStatusIcon);
    remoteStatusMenu.appendChild(remoteVideoStatusIcon);
    remoteStatusMenu.appendChild(remoteAudioStatusIcon);
    remoteStatusMenu.appendChild(remoteYoutubeBtnBtn);
    remoteStatusMenu.appendChild(remotePrivateMsgBtn);
    remoteStatusMenu.appendChild(remotePeerKickOut);
    remoteStatusMenu.appendChild(remoteVideoFullScreenBtn);

    remoteMedia.setAttribute('id', peer_id + '_video');
    remoteMedia.setAttribute('playsinline', true);
    remoteMedia.mediaGroup = 'remotevideo';
    remoteMedia.autoplay = true;
    isMobileDevice ? (remoteMediaControls = false) : (remoteMediaControls = remoteMediaControls);
    remoteMedia.controls = remoteMediaControls;
    peerMediaElements[peer_id] = remoteMedia;

    remoteVideoWrap.className = 'video';

    // add elements to videoWrap div
    remoteVideoWrap.appendChild(remoteStatusMenu);
    remoteVideoWrap.appendChild(remoteVideoAvatarImage);
    remoteVideoWrap.appendChild(remoteMedia);

    document.body.appendChild(remoteVideoWrap);

    // attachMediaStream is a part of the adapter.js library
    attachMediaStream(remoteMedia, remoteMediaStream);
    // resize video elements
    resizeVideos();
    // handle video full screen mode
    handleVideoPlayerFs(peer_id + '_video', peer_id + '_fullScreen', peer_id);
    // handle kick out button event
    handlePeerKickOutBtn(peer_id);
    // refresh remote peers avatar name
    setPeerAvatarImgName(peer_id + '_avatar', peer_name);
    // refresh remote peers hand icon status and title
    setPeerHandStatus(peer_id, peer_name, peer_hand);
    // refresh remote peers video icon status and title
    setPeerVideoStatus(peer_id, peer_video);
    // refresh remote peers audio icon status and title
    setPeerAudioStatus(peer_id, peer_audio);
    // handle remote peers audio on-off
    handlePeerAudioBtn(peer_id);
    // handle remote peers video on-off
    handlePeerVideoBtn(peer_id);
    // handle remote private messages
    handlePeerPrivateMsg(peer_id, peer_name);
    // handle remote youtube video
    handlePeerYouTube(peer_id);
    // show status menu
    toggleClassElements('statusMenu', 'inline');
    // notify if peer started to recording own screen + audio
    if (peer_rec) notifyRecording(peer_name, 'Started');
}

/**
 * Log stream settings info
 * @param {*} name
 * @param {*} stream
 */
function logStreamSettingsInfo(name, stream) {
    console.log(name, {
        video: {
            label: stream.getVideoTracks()[0].label,
            settings: stream.getVideoTracks()[0].getSettings(),
        },
        audio: {
            label: stream.getAudioTracks()[0].label,
            settings: stream.getAudioTracks()[0].getSettings(),
        },
    });
}

/**
 * Resize video elements
 */
function resizeVideos() {
    const numToString = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
    const videos = document.querySelectorAll('.video');
    document.querySelectorAll('.video').forEach((v) => {
        v.className = 'video ' + numToString[videos.length];
    });
}

/**
 * Refresh video - chat image avatar on name changes
 * https://eu.ui-avatars.com/
 *
 * @param {*} videoAvatarImageId element
 * @param {*} peerName
 */
function setPeerAvatarImgName(videoAvatarImageId, peerName) {
    let videoAvatarImageElement = getId(videoAvatarImageId);
    // default img size 64 max 512
    let avatarImgSize = isMobileDevice ? 128 : 256;
    videoAvatarImageElement.setAttribute(
        'src',
        avatarApiUrl + '?name=' + peerName + '&size=' + avatarImgSize + '&background=random&rounded=true',
    );
}

/**
 * Set Chat avatar image by peer name
 * @param {*} avatar left/right
 * @param {*} peerName my/friends
 */
function setPeerChatAvatarImgName(avatar, peerName) {
    let avatarImg = avatarApiUrl + '?name=' + peerName + '&size=32' + '&background=random&rounded=true';

    switch (avatar) {
        case 'left':
            // console.log("Set Friend chat avatar image");
            leftChatAvatar = avatarImg;
            break;
        case 'right':
            // console.log("Set My chat avatar image");
            rightChatAvatar = avatarImg;
            break;
    }
}

/**
 * On video player click, go on full screen mode ||
 * On button click, go on full screen mode.
 * Press Esc to exit from full screen mode, or click again.
 *
 * @param {*} videoId
 * @param {*} videoFullScreenBtnId
 * @param {*} peer_id
 */
function handleVideoPlayerFs(videoId, videoFullScreenBtnId, peer_id = null) {
    let videoPlayer = getId(videoId);
    let videoFullScreenBtn = getId(videoFullScreenBtnId);

    // handle Chrome Firefox Opera Microsoft Edge videoPlayer ESC
    videoPlayer.addEventListener('fullscreenchange', (e) => {
        // if Controls enabled, or document on FS do nothing
        if (videoPlayer.controls || isDocumentOnFullScreen) return;
        let fullscreenElement = document.fullscreenElement;
        if (!fullscreenElement) {
            videoPlayer.style.pointerEvents = 'auto';
            isVideoOnFullScreen = false;
            // console.log("Esc FS isVideoOnFullScreen", isVideoOnFullScreen);
        }
    });

    // handle Safari videoPlayer ESC
    videoPlayer.addEventListener('webkitfullscreenchange', (e) => {
        // if Controls enabled, or document on FS do nothing
        if (videoPlayer.controls || isDocumentOnFullScreen) return;
        let webkitIsFullScreen = document.webkitIsFullScreen;
        if (!webkitIsFullScreen) {
            videoPlayer.style.pointerEvents = 'auto';
            isVideoOnFullScreen = false;
            // console.log("Esc FS isVideoOnFullScreen", isVideoOnFullScreen);
        }
    });

    // on button click go on FS mobile/desktop
    videoFullScreenBtn.addEventListener('click', (e) => {
        gotoFS();
    });

    // on video click go on FS
    videoPlayer.addEventListener('click', (e) => {
        // not mobile on click go on FS or exit from FS
        if (!isMobileDevice) {
            gotoFS();
        } else {
            // mobile on click exit from FS, for enter use videoFullScreenBtn
            if (isVideoOnFullScreen) handleFSVideo();
        }
    });

    function gotoFS() {
        // handle remote peer video fs
        if (peer_id !== null) {
            let remoteVideoStatusBtn = getId(peer_id + '_videoStatus');
            if (remoteVideoStatusBtn.className === 'fas fa-video') {
                handleFSVideo();
            } else {
                showMsg();
            }
        } else {
            // handle local video fs
            if (myVideoStatusIcon.className === 'fas fa-video') {
                handleFSVideo();
            } else {
                showMsg();
            }
        }
    }

    function showMsg() {
        userLog('toast', 'Full screen mode work when video is on');
    }

    function handleFSVideo() {
        // if Controls enabled, or document on FS do nothing
        if (videoPlayer.controls || isDocumentOnFullScreen) return;

        if (!isVideoOnFullScreen) {
            if (videoPlayer.requestFullscreen) {
                // Chrome Firefox Opera Microsoft Edge
                videoPlayer.requestFullscreen();
            } else if (videoPlayer.webkitRequestFullscreen) {
                // Safari request full screen mode
                videoPlayer.webkitRequestFullscreen();
            } else if (videoPlayer.msRequestFullscreen) {
                // IE11 request full screen mode
                videoPlayer.msRequestFullscreen();
            }
            isVideoOnFullScreen = true;
            videoPlayer.style.pointerEvents = 'none';
            // console.log("Go on FS isVideoOnFullScreen", isVideoOnFullScreen);
        } else {
            if (document.exitFullscreen) {
                // Chrome Firefox Opera Microsoft Edge
                document.exitFullscreen();
            } else if (document.webkitCancelFullScreen) {
                // Safari exit full screen mode ( Not work... )
                document.webkitCancelFullScreen();
            } else if (document.msExitFullscreen) {
                // IE11 exit full screen mode
                document.msExitFullscreen();
            }
            isVideoOnFullScreen = false;
            videoPlayer.style.pointerEvents = 'auto';
            // console.log("Esc FS isVideoOnFullScreen", isVideoOnFullScreen);
        }
    }
}

/**
 * Start talk time
 */
function startCountTime() {
    countTime.style.display = 'inline';
    callStartTime = Date.now();
    setInterval(function printTime() {
        callElapsedTime = Date.now() - callStartTime;
        countTime.innerHTML = getTimeToString(callElapsedTime);
    }, 1000);
}

/**
 * Return time to string
 * @param {*} time
 */
function getTimeToString(time) {
    let diffInHrs = time / 3600000;
    let hh = Math.floor(diffInHrs);
    let diffInMin = (diffInHrs - hh) * 60;
    let mm = Math.floor(diffInMin);
    let diffInSec = (diffInMin - mm) * 60;
    let ss = Math.floor(diffInSec);
    let formattedHH = hh.toString().padStart(2, '0');
    let formattedMM = mm.toString().padStart(2, '0');
    let formattedSS = ss.toString().padStart(2, '0');
    return `${formattedHH}:${formattedMM}:${formattedSS}`;
}

/**
 * Handle WebRTC left buttons
 */
function manageLeftButtons() {
    setShareRoomBtn();
    setAudioBtn();
    setVideoBtn();
    setSwapCameraBtn();
    setScreenShareBtn();
    setRecordStreamBtn();
    setFullScreenBtn();
    setChatRoomBtn();
    setChatEmojiBtn();
    setMyHandBtn();
    setMyWhiteboardBtn();
    setMyFileShareBtn();
    setMySettingsBtn();
    setAboutBtn();
    setLeaveRoomBtn();
    showButtonsBarAndMenu();
}

/**
 * Copy - share room url button click event
 */
function setShareRoomBtn() {
    shareRoomBtn.addEventListener('click', async (e) => {
        shareRoomUrl();
    });
}

/**
 * Audio mute - unmute button click event
 */
function setAudioBtn() {
    audioBtn.addEventListener('click', (e) => {
        handleAudio(e, false);
    });
}

/**
 * Video hide - show button click event
 */
function setVideoBtn() {
    videoBtn.addEventListener('click', (e) => {
        handleVideo(e, false);
    });
}

/**
 * Check if can swap or not the cam, if yes show the button else hide it
 */
function setSwapCameraBtn() {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInput = devices.filter((device) => device.kind === 'videoinput');
        if (videoInput.length > 1 && isMobileDevice) {
            swapCameraBtn.addEventListener('click', (e) => {
                swapCamera();
            });
        } else {
            swapCameraBtn.style.display = 'none';
        }
    });
}

/**
 * Check if i can share the screen, if yes show button else hide it
 */
function setScreenShareBtn() {
    if (!isMobileDevice && (navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia)) {
        screenShareBtn.addEventListener('click', (e) => {
            toggleScreenSharing();
        });
    } else {
        screenShareBtn.style.display = 'none';
    }
}

/**
 * Start - Stop Stream recording
 */
function setRecordStreamBtn() {
    recordStreamBtn.addEventListener('click', (e) => {
        if (isStreamRecording) {
            stopStreamRecording();
        } else {
            startStreamRecording();
        }
    });
}

/**
 * Full screen button click event
 */
function setFullScreenBtn() {
    if (DetectRTC.browser.name != 'Safari') {
        // detect esc from full screen mode
        document.addEventListener('fullscreenchange', (e) => {
            let fullscreenElement = document.fullscreenElement;
            if (!fullscreenElement) {
                fullScreenBtn.className = 'fas fa-expand-alt';
                isDocumentOnFullScreen = false;
                // only for desktop
                if (!isMobileDevice) {
                    tippy(fullScreenBtn, {
                        content: 'VIEW full screen',
                        placement: 'right-start',
                    });
                }
            }
        });
        fullScreenBtn.addEventListener('click', (e) => {
            toggleFullScreen();
        });
    } else {
        fullScreenBtn.style.display = 'none';
    }
}

/**
 * Chat room buttons click event
 */
function setChatRoomBtn() {
    // adapt chat room size for mobile
    setChatRoomForMobile();

    // open hide chat room
    chatRoomBtn.addEventListener('click', (e) => {
        if (!isChatRoomVisible) {
            showChatRoomDraggable();
        } else {
            hideChatRoomAndEmojiPicker();
            e.target.className = 'fas fa-comment';
        }
    });

    // ghost theme + undo
    msgerTheme.addEventListener('click', (e) => {
        if (mirotalkTheme == 'ghost') return;

        if (e.target.className == 'fas fa-ghost') {
            e.target.className = 'fas fa-undo';
            document.documentElement.style.setProperty('--msger-bg', 'rgba(0, 0, 0, 0.100)');
        } else {
            e.target.className = 'fas fa-ghost';
            document.documentElement.style.setProperty('--msger-bg', 'linear-gradient(to left, #383838, #000000)');
        }
    });

    // show msger participants section
    msgerCPBtn.addEventListener('click', (e) => {
        if (!thereIsPeerConnections()) {
            userLog('info', 'No participants detected');
            return;
        }
        msgerCP.style.display = 'flex';
    });

    // hide msger participants section
    msgerCPCloseBtn.addEventListener('click', (e) => {
        msgerCP.style.display = 'none';
    });

    // clean chat messages
    msgerClean.addEventListener('click', (e) => {
        cleanMessages();
    });

    // save chat messages to file
    msgerSaveBtn.addEventListener('click', (e) => {
        if (chatMessages.length != 0) {
            downloadChatMsgs();
            return;
        }
        userLog('info', 'No chat messages to save');
    });

    // close chat room - show left button and status menu if hide
    msgerClose.addEventListener('click', (e) => {
        hideChatRoomAndEmojiPicker();
        showButtonsBarAndMenu();
    });

    // open Video Url Player
    msgerVideoUrlBtn.addEventListener('click', (e) => {
        sendVideoUrl();
    });

    // Execute a function when the user releases a key on the keyboard
    msgerInput.addEventListener('keyup', (e) => {
        // Number 13 is the "Enter" key on the keyboard
        if (e.keyCode === 13) {
            e.preventDefault();
            msgerSendBtn.click();
        }
    });

    // on input check 4emoji from map
    msgerInput.oninput = function () {
        for (let i in chatInputEmoji) {
            let regex = new RegExp(escapeSpecialChars(i), 'gim');
            this.value = this.value.replace(regex, chatInputEmoji[i]);
        }
    };

    // chat send msg
    msgerSendBtn.addEventListener('click', (e) => {
        // prevent refresh page
        e.preventDefault();
        sendChatMessage();
    });
}

/**
 * Emoji picker chat room button click event
 */
function setChatEmojiBtn() {
    msgerEmojiBtn.addEventListener('click', (e) => {
        // prevent refresh page
        e.preventDefault();
        hideShowEmojiPicker();
    });

    emojiPicker.addEventListener('emoji-click', (e) => {
        //console.log(e.detail);
        //console.log(e.detail.emoji.unicode);
        msgerInput.value += e.detail.emoji.unicode;
        hideShowEmojiPicker();
    });
}

/**
 * Set my hand button click event
 */
function setMyHandBtn() {
    myHandBtn.addEventListener('click', async (e) => {
        setMyHandStatus();
    });
}

/**
 * Whiteboard : https://github.com/fabricjs/fabric.js
 */
function setMyWhiteboardBtn() {
    dragElement(whiteboard, whiteboardHeader);

    setupWhiteboard();

    whiteboardBtn.addEventListener('click', (e) => {
        toggleWhiteboard();
    });
    whiteboardPencilBtn.addEventListener('click', (e) => {
        whiteboardIsDrawingMode(true);
    });
    whiteboardObjectBtn.addEventListener('click', (e) => {
        whiteboardIsDrawingMode(false);
    });
    whiteboardUndoBtn.addEventListener('click', (e) => {
        whiteboardAction(getWhiteboardAction('undo'));
    });
    whiteboardRedoBtn.addEventListener('click', (e) => {
        whiteboardAction(getWhiteboardAction('redo'));
    });
    whiteboardSaveBtn.addEventListener('click', (e) => {
        wbCanvasSaveImg();
    });
    whiteboardImgFileBtn.addEventListener('click', (e) => {
        whiteboardAddObj('imgFile');
    });
    whiteboardImgUrlBtn.addEventListener('click', (e) => {
        whiteboardAddObj('imgUrl');
    });
    whiteboardTextBtn.addEventListener('click', (e) => {
        whiteboardAddObj('text');
    });
    whiteboardLineBtn.addEventListener('click', (e) => {
        whiteboardAddObj('line');
    });
    whiteboardRectBtn.addEventListener('click', (e) => {
        whiteboardAddObj('rect');
    });
    whiteboardCircleBtn.addEventListener('click', (e) => {
        whiteboardAddObj('circle');
    });
    whiteboardEraserBtn.addEventListener('click', (e) => {
        whiteboardIsEraser(true);
    });
    whiteboardCleanBtn.addEventListener('click', (e) => {
        confirmCleanBoard();
    });
    whiteboardCloseBtn.addEventListener('click', (e) => {
        whiteboardAction(getWhiteboardAction('close'));
    });
    wbDrawingColorEl.addEventListener('change', (e) => {
        wbCanvas.freeDrawingBrush.color = wbDrawingColorEl.value;
        whiteboardIsDrawingMode(true);
    });
    wbBackgroundColorEl.addEventListener('change', (e) => {
        let config = {
            room_id: roomId,
            peer_name: myPeerName,
            action: 'bgcolor',
            color: wbBackgroundColorEl.value,
        };
        whiteboardAction(config);
    });
}

/**
 * File Transfer button event click
 */
function setMyFileShareBtn() {
    // make send file div draggable
    if (!isMobileDevice) dragElement(getId('sendFileDiv'), getId('imgShare'));

    fileShareBtn.addEventListener('click', (e) => {
        //window.open("https://fromsmash.com"); // for Big Data
        selectFileToShare();
    });
    sendAbortBtn.addEventListener('click', (e) => {
        abortFileTransfer();
    });
}

/**
 * My settings button click event
 */
function setMySettingsBtn() {
    mySettingsBtn.addEventListener('click', (e) => {
        if (isMobileDevice) {
            buttonsBar.style.display = 'none';
            isButtonsVisible = false;
        }
        hideShowMySettings();
    });
    mySettingsCloseBtn.addEventListener('click', (e) => {
        hideShowMySettings();
    });
    myPeerNameSetBtn.addEventListener('click', (e) => {
        updateMyPeerName();
    });
    // make chat room draggable for desktop
    if (!isMobileDevice) dragElement(mySettings, mySettingsHeader);
}

/**
 * About button click event
 */
function setAboutBtn() {
    aboutBtn.addEventListener('click', (e) => {
        showAbout();
    });
}

/**
 * Leave room button click event
 */
function setLeaveRoomBtn() {
    leaveRoomBtn.addEventListener('click', (e) => {
        leaveRoom();
    });
}

/**
 * Handle left buttons - status menù show - hide on body mouse move
 */
function handleBodyOnMouseMove() {
    document.body.addEventListener('mousemove', (e) => {
        showButtonsBarAndMenu();
    });
}

/**
 * Setup local audio - video devices - theme ...
 */
function setupMySettings() {
    // tab buttons
    tabDevicesBtn.addEventListener('click', (e) => {
        openTab(e, 'tabDevices');
    });
    tabBandwidthBtn.addEventListener('click', (e) => {
        openTab(e, 'tabBandwidth');
    });
    tabRoomBtn.addEventListener('click', (e) => {
        openTab(e, 'tabRoom');
    });
    tabStylingBtn.addEventListener('click', (e) => {
        openTab(e, 'tabStyling');
    });
    // audio - video select box
    selectors = [audioInputSelect, audioOutputSelect, videoSelect];
    audioOutputSelect.disabled = !('sinkId' in HTMLMediaElement.prototype);
    navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);
    // select audio input
    audioInputSelect.addEventListener('change', (e) => {
        myVideoChange = false;
        refreshLocalMedia();
    });
    // select audio output
    audioOutputSelect.addEventListener('change', (e) => {
        changeAudioDestination();
    });
    // select video input
    videoSelect.addEventListener('change', (e) => {
        myVideoChange = true;
        refreshLocalMedia();
    });
    // select video quality
    videoQualitySelect.addEventListener('change', (e) => {
        setLocalVideoQuality();
    });
    // select video fps
    videoFpsSelect.addEventListener('change', (e) => {
        videoMaxFrameRate = parseInt(videoFpsSelect.value);
        setLocalMaxFps(videoMaxFrameRate);
    });
    // Firefox not support video cam Fps O.o
    if (myBrowserName === 'Firefox') {
        videoFpsSelect.value = null;
        videoFpsSelect.disabled = true;
    }
    // select screen fps
    screenFpsSelect.addEventListener('change', (e) => {
        screenMaxFrameRate = parseInt(screenFpsSelect.value);
        if (isScreenStreaming) setLocalMaxFps(screenMaxFrameRate);
    });
    // Mobile not support screen sharing
    if (isMobileDevice) {
        screenFpsSelect.value = null;
        screenFpsSelect.disabled = true;
    }
    // select themes
    themeSelect.addEventListener('change', (e) => {
        setTheme(themeSelect.value);
        setRecordButtonUi();
    });
    // Mobile not support buttons bar position horizontal
    if (isMobileDevice) {
        btnsBarSelect.disabled = true;
    } else {
        btnsBarSelect.addEventListener('change', (e) => {
            setButtonsBarPosition(btnsBarSelect.value);
        });
    }
    // room actions
    muteEveryoneBtn.addEventListener('click', (e) => {
        disableAllPeers('audio');
    });
    hideEveryoneBtn.addEventListener('click', (e) => {
        disableAllPeers('video');
    });
    lockUnlockRoomBtn.addEventListener('click', (e) => {
        lockUnlockRoom();
    });
}

/**
 * Make video Url player draggable
 */
function setupVideoUrlPlayer() {
    if (isMobileDevice) {
        // adapt video player iframe for mobile
        document.documentElement.style.setProperty('--iframe-width', '320px');
        document.documentElement.style.setProperty('--iframe-height', '240px');
    } else {
        dragElement(videoUrlCont, videoUrlHeader);
    }
    videoUrlCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeVideoUrlPlayer();
        emitVideoPlayer('close');
    });
}

/**
 * Refresh Local media audio video in - out
 */
function refreshLocalMedia() {
    // some devices can't swap the video track, if already in execution.
    stopLocalVideoTrack();
    stopLocalAudioTrack();

    navigator.mediaDevices.getUserMedia(getAudioVideoConstraints()).then(gotStream).then(gotDevices).catch(handleError);
}

/**
 * Get audio - video constraints
 * @returns constraints
 */
function getAudioVideoConstraints() {
    const audioSource = audioInputSelect.value;
    const videoSource = videoSelect.value;
    let videoConstraints = getVideoConstraints(videoQualitySelect.value ? videoQualitySelect.value : 'default');
    videoConstraints['deviceId'] = videoSource ? { exact: videoSource } : undefined;
    const constraints = {
        audio: {
            deviceId: audioSource ? { exact: audioSource } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
        },
        video: videoConstraints,
    };
    return constraints;
}

/**
 * https://webrtc.github.io/samples/src/content/getusermedia/resolution/
 *
 * @returns video constraints
 */
function getVideoConstraints(videoQuality) {
    let frameRate = { max: videoMaxFrameRate };

    switch (videoQuality) {
        case 'useVideo':
            return useVideo;
        // Firefox not support set frameRate (OverconstrainedError) O.o
        case 'default':
            return { frameRate: frameRate };
        // video cam constraints default
        case 'qvgaVideo':
            return {
                width: { exact: 320 },
                height: { exact: 240 },
                frameRate: frameRate,
            }; // video cam constraints low bandwidth
        case 'vgaVideo':
            return {
                width: { exact: 640 },
                height: { exact: 480 },
                frameRate: frameRate,
            }; // video cam constraints medium bandwidth
        case 'hdVideo':
            return {
                width: { exact: 1280 },
                height: { exact: 720 },
                frameRate: frameRate,
            }; // video cam constraints high bandwidth
        case 'fhdVideo':
            return {
                width: { exact: 1920 },
                height: { exact: 1080 },
                frameRate: frameRate,
            }; // video cam constraints very high bandwidth
        case '4kVideo':
            return {
                width: { exact: 3840 },
                height: { exact: 2160 },
                frameRate: frameRate,
            }; // video cam constraints ultra high bandwidth
    }
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/applyConstraints
 *
 * @param {*} maxFrameRate
 */
function setLocalMaxFps(maxFrameRate) {
    localMediaStream
        .getVideoTracks()[0]
        .applyConstraints({ frameRate: { max: maxFrameRate } })
        .then(() => {
            logStreamSettingsInfo('setLocalMaxFps', localMediaStream);
        })
        .catch((err) => {
            console.error('setLocalMaxFps', err);
            userLog('error', "Your device doesn't support the selected fps, please select the another one.");
        });
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/applyConstraints
 */
function setLocalVideoQuality() {
    let videoConstraints = getVideoConstraints(videoQualitySelect.value ? videoQualitySelect.value : 'default');
    localMediaStream
        .getVideoTracks()[0]
        .applyConstraints(videoConstraints)
        .then(() => {
            logStreamSettingsInfo('setLocalVideoQuality', localMediaStream);
        })
        .catch((err) => {
            console.error('setLocalVideoQuality', err);
            userLog('error', "Your device doesn't support the selected video quality, please select the another one.");
        });
}

/**
 * Change Speaker
 */
function changeAudioDestination() {
    const audioDestination = audioOutputSelect.value;
    attachSinkId(myVideo, audioDestination);
}

/**
 * Attach audio output device to video element using device/sink ID.
 * @param {*} element
 * @param {*} sinkId
 */
function attachSinkId(element, sinkId) {
    if (typeof element.sinkId !== 'undefined') {
        element
            .setSinkId(sinkId)
            .then(() => {
                console.log(`Success, audio output device attached: ${sinkId}`);
            })
            .catch((err) => {
                let errorMessage = err;
                if (err.name === 'SecurityError')
                    errorMessage = `You need to use HTTPS for selecting audio output device: ${err}`;
                console.error(errorMessage);
                // Jump back to first output device in the list as it's the default.
                audioOutputSelect.selectedIndex = 0;
            });
    } else {
        console.warn('Browser does not support output device selection.');
    }
}

/**
 * Got Stream and append to local media
 * @param {*} stream
 */
function gotStream(stream) {
    refreshMyStreamToPeers(stream, true);
    refreshMyLocalStream(stream, true);
    if (myVideoChange) {
        setMyVideoStatusTrue();
        if (isMobileDevice) myVideo.classList.toggle('mirror');
    }
    // Refresh button list in case labels have become available
    return navigator.mediaDevices.enumerateDevices();
}

/**
 * Get audio-video Devices and show it to select box
 * https://webrtc.github.io/samples/src/content/devices/input-output/
 * https://github.com/webrtc/samples/tree/gh-pages/src/content/devices/input-output
 * @param {*} deviceInfos
 */
function gotDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.
    const values = selectors.map((select) => select.value);
    selectors.forEach((select) => {
        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }
    });
    // check devices
    for (let i = 0; i !== deviceInfos.length; ++i) {
        const deviceInfo = deviceInfos[i];
        // console.log("device-info ------> ", deviceInfo);
        const option = document.createElement('option');
        option.value = deviceInfo.deviceId;

        switch (deviceInfo.kind) {
            case 'videoinput':
                option.text = `📹 ` + deviceInfo.label || `📹 camera ${videoSelect.length + 1}`;
                videoSelect.appendChild(option);
                break;

            case 'audioinput':
                option.text = `🎤 ` + deviceInfo.label || `🎤 microphone ${audioInputSelect.length + 1}`;
                audioInputSelect.appendChild(option);
                break;

            case 'audiooutput':
                option.text = `🔈 ` + deviceInfo.label || `🔈 speaker ${audioOutputSelect.length + 1}`;
                audioOutputSelect.appendChild(option);
                break;

            default:
                console.log('Some other kind of source/device: ', deviceInfo);
        }
    } // end for devices

    selectors.forEach((select, selectorIndex) => {
        if (Array.prototype.slice.call(select.childNodes).some((n) => n.value === values[selectorIndex])) {
            select.value = values[selectorIndex];
        }
    });
}

/**
 * Handle getUserMedia error
 * @param {*} err
 */
function handleError(err) {
    console.log('navigator.MediaDevices.getUserMedia error: ', err);
    switch (err.name) {
        case 'OverconstrainedError':
            userLog(
                'error',
                "GetUserMedia: Your device doesn't support the selected video quality or fps, please select the another one.",
            );
            break;
        default:
            userLog('error', 'GetUserMedia error ' + err);
    }
    // https://blog.addpipe.com/common-getusermedia-errors/
}

/**
 * AttachMediaStream stream to element
 * @param {*} element
 * @param {*} stream
 */
function attachMediaStream(element, stream) {
    //console.log("DEPRECATED, attachMediaStream will soon be removed.");
    console.log('Success, media stream attached');
    element.srcObject = stream;
}

/**
 * Show left buttons & status menù for 10 seconds on body mousemove
 * if mobile and chatroom open do nothing return
 * if mobile and mySettings open do nothing return
 */
function showButtonsBarAndMenu() {
    if (isButtonsVisible || (isMobileDevice && isChatRoomVisible) || (isMobileDevice && isMySettingsVisible)) return;
    toggleClassElements('statusMenu', 'inline');
    buttonsBar.style.display = 'flex';
    isButtonsVisible = true;
    setTimeout(() => {
        toggleClassElements('statusMenu', 'none');
        buttonsBar.style.display = 'none';
        isButtonsVisible = false;
    }, 10000);
}

/**
 * Copy room url to clipboard and share it with navigator share if supported
 * https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
 */
async function shareRoomUrl() {
    const myRoomUrl = window.location.href;

    // navigator share
    let isSupportedNavigatorShare = false;
    let errorNavigatorShare = false;
    // if supported
    if (navigator.share) {
        isSupportedNavigatorShare = true;
        try {
            // not add title and description to load metadata from url
            await navigator.share({ url: myRoomUrl });
            userLog('toast', 'Room Shared successfully!');
        } catch (err) {
            errorNavigatorShare = true;
            /*
                This feature is available only in secure contexts (HTTPS),
                in some or all supporting browsers and mobile devices
                console.error("navigator.share", err); 
            */
        }
    }

    // something wrong or not supported navigator.share
    if (!isSupportedNavigatorShare || (isSupportedNavigatorShare && errorNavigatorShare)) {
        playSound('newMessage');
        Swal.fire({
            background: swalBackground,
            position: 'center',
            title: 'Share the Room',
            // imageAlt: 'mirotalk-share',
            // imageUrl: shareUrlImg,
            html:
                `
            <br/>
            <div id="qrRoomContainer">
                <canvas id="qrRoom"></canvas>
            </div>
            <br/><br/>
            <p style="color:white;"> Share this meeting invite others to join.</p>
            <p style="color:rgb(8, 189, 89);">` +
                myRoomUrl +
                `</p>`,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: `Copy meeting URL`,
            denyButtonText: `Email invite`,
            cancelButtonText: `Close`,
            showClass: {
                popup: 'animate__animated animate__fadeInDown',
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp',
            },
        }).then((result) => {
            if (result.isConfirmed) {
                copyRoomURL();
            } else if (result.isDenied) {
                let message = {
                    email: '',
                    subject: 'Please join our MiroTalk Video Chat Meeting',
                    body: 'Click to join: ' + myRoomUrl,
                };
                shareRoomByEmail(message);
            }
        });
        makeRoomQR();
    }
}

/**
 * Make Room QR
 * https://github.com/neocotic/qrious
 */
function makeRoomQR() {
    let qr = new QRious({
        element: getId('qrRoom'),
        value: window.location.href,
    });
    qr.set({
        size: 256,
    });
}

/**
 * Copy Room URL to clipboard
 */
function copyRoomURL() {
    let roomURL = window.location.href;
    let tmpInput = document.createElement('input');
    document.body.appendChild(tmpInput);
    tmpInput.value = roomURL;
    tmpInput.select();
    tmpInput.setSelectionRange(0, 99999); // For mobile devices
    navigator.clipboard.writeText(tmpInput.value);
    console.log('Copied to clipboard Join Link ', roomURL);
    document.body.removeChild(tmpInput);
    userLog('toast', 'Meeting URL is copied to clipboard 👍');
}

/**
 * Share room id by email
 * @param {*} message email | subject | body
 */
function shareRoomByEmail(message) {
    let email = message.email;
    let subject = message.subject;
    let emailBody = message.body;
    document.location = 'mailto:' + email + '?subject=' + subject + '&body=' + emailBody;
}

/**
 * Handle Audio ON - OFF
 * @param {*} e event
 * @param {*} init bool true/false
 */
function handleAudio(e, init) {
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getAudioTracks
    localMediaStream.getAudioTracks()[0].enabled = !localMediaStream.getAudioTracks()[0].enabled;
    myAudioStatus = localMediaStream.getAudioTracks()[0].enabled;
    e.target.className = 'fas fa-microphone' + (myAudioStatus ? '' : '-slash');
    if (init) {
        audioBtn.className = 'fas fa-microphone' + (myAudioStatus ? '' : '-slash');
        if (!isMobileDevice) {
            tippy(initAudioBtn, {
                content: myAudioStatus ? 'Click to audio OFF' : 'Click to audio ON',
                placement: 'top',
            });
        }
    }
    setMyAudioStatus(myAudioStatus);
}

/**
 * Handle Video ON - OFF
 * @param {*} e event
 * @param {*} init bool true/false
 */
function handleVideo(e, init) {
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getVideoTracks
    localMediaStream.getVideoTracks()[0].enabled = !localMediaStream.getVideoTracks()[0].enabled;
    myVideoStatus = localMediaStream.getVideoTracks()[0].enabled;
    e.target.className = 'fas fa-video' + (myVideoStatus ? '' : '-slash');
    if (init) {
        videoBtn.className = 'fas fa-video' + (myVideoStatus ? '' : '-slash');
        if (!isMobileDevice) {
            tippy(initVideoBtn, {
                content: myVideoStatus ? 'Click to video OFF' : 'Click to video ON',
                placement: 'top',
            });
        }
    }
    setMyVideoStatus(myVideoStatus);
}

/**
 * SwapCamera front (user) - rear (environment)
 */
function swapCamera() {
    // setup camera
    camera = camera == 'user' ? 'environment' : 'user';
    if (camera == 'user') useVideo = true;
    else useVideo = { facingMode: { exact: camera } };

    // some devices can't swap the cam, if have Video Track already in execution.
    if (useVideo) stopLocalVideoTrack();

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    navigator.mediaDevices
        .getUserMedia({ video: useVideo })
        .then((camStream) => {
            refreshMyStreamToPeers(camStream);
            refreshMyLocalStream(camStream);
            if (useVideo) setMyVideoStatusTrue();
            myVideo.classList.toggle('mirror');
        })
        .catch((err) => {
            console.log('[Error] to swaping camera', err);
            userLog('error', 'Error to swaping the camera ' + err);
            // https://blog.addpipe.com/common-getusermedia-errors/
        });
}

/**
 * Stop Local Video Track
 */
function stopLocalVideoTrack() {
    localMediaStream.getVideoTracks()[0].stop();
}

/**
 * Stop Local Audio Track
 */
function stopLocalAudioTrack() {
    localMediaStream.getAudioTracks()[0].stop();
}

/**
 * Enable - disable screen sharing
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
 */
function toggleScreenSharing() {
    screenMaxFrameRate = parseInt(screenFpsSelect.value);
    const constraints = {
        video: { frameRate: { max: screenMaxFrameRate } },
    }; // true | { frameRate: { max: screenMaxFrameRate } }

    let screenMediaPromise;

    if (!isScreenStreaming) {
        // on screen sharing start
        screenMediaPromise = navigator.mediaDevices.getDisplayMedia(constraints);
    } else {
        // on screen sharing stop
        screenMediaPromise = navigator.mediaDevices.getUserMedia(getAudioVideoConstraints());
    }
    screenMediaPromise
        .then((screenStream) => {
            // stop cam video track on screen share
            stopLocalVideoTrack();
            isScreenStreaming = !isScreenStreaming;
            refreshMyStreamToPeers(screenStream);
            refreshMyLocalStream(screenStream);
            myVideo.classList.toggle('mirror');
            setScreenSharingStatus(isScreenStreaming);
        })
        .catch((err) => {
            console.error('[Error] Unable to share the screen', err);
            userLog('error', 'Unable to share the screen ' + err);
        });
}

/**
 * Set Screen Sharing Status
 * @param {*} status
 */
function setScreenSharingStatus(status) {
    screenShareBtn.className = status ? 'fas fa-stop-circle' : 'fas fa-desktop';
    // only for desktop
    if (!isMobileDevice) {
        tippy(screenShareBtn, {
            content: status ? 'STOP screen sharing' : 'START screen sharing',
            placement: 'right-start',
        });
    }
}

/**
 * set myVideoStatus true
 */
function setMyVideoStatusTrue() {
    if (myVideoStatus) return;
    // Put video status alredy ON
    localMediaStream.getVideoTracks()[0].enabled = true;
    myVideoStatus = true;
    videoBtn.className = 'fas fa-video';
    myVideoStatusIcon.className = 'fas fa-video';
    myVideoAvatarImage.style.display = 'none';
    emitPeerStatus('video', myVideoStatus);
    // only for desktop
    if (!isMobileDevice) {
        tippy(videoBtn, {
            content: 'Click to video OFF',
            placement: 'right-start',
        });
    }
}

/**
 * Enter - esc on full screen mode
 * https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
 */
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        fullScreenBtn.className = 'fas fa-compress-alt';
        isDocumentOnFullScreen = true;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            fullScreenBtn.className = 'fas fa-expand-alt';
            isDocumentOnFullScreen = false;
        }
    }
    // only for desktop
    if (!isMobileDevice) {
        tippy(fullScreenBtn, {
            content: isDocumentOnFullScreen ? 'EXIT full screen' : 'VIEW full screen',
            placement: 'right-start',
        });
    }
}

/**
 * Refresh my stream changes to connected peers in the room
 * @param {*} stream
 * @param {*} localAudioTrackChange true or false(default)
 */
function refreshMyStreamToPeers(stream, localAudioTrackChange = false) {
    if (!thereIsPeerConnections()) return;

    // refresh my stream to peers
    for (let peer_id in peerConnections) {
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getSenders
        let videoSender = peerConnections[peer_id]
            .getSenders()
            .find((s) => (s.track ? s.track.kind === 'video' : false));
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack
        videoSender.replaceTrack(stream.getVideoTracks()[0]);

        if (localAudioTrackChange) {
            let audioSender = peerConnections[peer_id]
                .getSenders()
                .find((s) => (s.track ? s.track.kind === 'audio' : false));
            // https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack
            audioSender.replaceTrack(stream.getAudioTracks()[0]);
        }
    }
}

/**
 * Refresh my local stream
 * @param {*} stream
 * @param {*} localAudioTrackChange true or false(default)
 */
function refreshMyLocalStream(stream, localAudioTrackChange = false) {
    stream.getVideoTracks()[0].enabled = true;

    // enable audio
    if (localAudioTrackChange && myAudioStatus === false) {
        audioBtn.className = 'fas fa-microphone';
        setMyAudioStatus(true);
        myAudioStatus = true;
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
    const newStream = new MediaStream([
        stream.getVideoTracks()[0],
        localAudioTrackChange ? stream.getAudioTracks()[0] : localMediaStream.getAudioTracks()[0],
    ]);
    localMediaStream = newStream;

    // log newStream devices
    logStreamSettingsInfo('refreshMyLocalStream', localMediaStream);

    // attachMediaStream is a part of the adapter.js library
    attachMediaStream(myVideo, localMediaStream); // newstream

    // on toggleScreenSharing video stop
    stream.getVideoTracks()[0].onended = () => {
        if (isScreenStreaming) toggleScreenSharing();
    };

    /**
     * When you stop the screen sharing, on default i turn back to the webcam with video stream ON.
     * If you want the webcam with video stream OFF, just disable it with the button (click to video OFF),
     * before to stop the screen sharing.
     */
    if (myVideoStatus === false) localMediaStream.getVideoTracks()[0].enabled = false;
}

/**
 * Start recording time
 */
function startRecordingTime() {
    recStartTime = Date.now();
    let rc = setInterval(function printTime() {
        if (isStreamRecording) {
            recElapsedTime = Date.now() - recStartTime;
            myVideoParagraph.innerHTML = myPeerName + '&nbsp;&nbsp; 🔴 REC ' + getTimeToString(recElapsedTime);
            return;
        }
        clearInterval(rc);
    }, 1000);
}

/**
 * Get MediaRecorder MimeTypes
 * @returns mimeType
 */
function getSupportedMimeTypes() {
    const possibleTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/mp4;codecs=h264,aac',
        'video/mp4',
    ];
    return possibleTypes.filter((mimeType) => {
        return MediaRecorder.isTypeSupported(mimeType);
    });
}

/**
 * Start Recording
 * https://github.com/webrtc/samples/tree/gh-pages/src/content/getusermedia/record
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
 */
function startStreamRecording() {
    recordedBlobs = [];

    let options = getSupportedMimeTypes();
    console.log('MediaRecorder options supported', options);
    options = { mimeType: options[0] }; // select the first available as mimeType

    try {
        if (isMobileDevice) {
            // on mobile devices recording camera + audio
            mediaRecorder = new MediaRecorder(localMediaStream, options);
            console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
            handleMediaRecorder(mediaRecorder);
        } else {
            // on desktop devices recording screen + audio
            screenMaxFrameRate = parseInt(screenFpsSelect.value);
            const constraints = {
                video: { frameRate: { max: screenMaxFrameRate } },
            };
            let recScreenStreamPromise = navigator.mediaDevices.getDisplayMedia(constraints);
            recScreenStreamPromise
                .then((screenStream) => {
                    const newStream = new MediaStream([
                        screenStream.getVideoTracks()[0],
                        localMediaStream.getAudioTracks()[0],
                    ]);
                    recScreenStream = newStream;
                    mediaRecorder = new MediaRecorder(recScreenStream, options);
                    console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
                    isRecScreenSream = true;
                    handleMediaRecorder(mediaRecorder);
                })
                .catch((err) => {
                    console.error('[Error] Unable to recording the screen + audio', err);
                    userLog('error', 'Unable to recording the screen + audio ' + err);
                });
        }
    } catch (err) {
        console.error('Exception while creating MediaRecorder: ', err);
        userLog('error', "Can't start stream recording: " + err);
        return;
    }
}

/**
 * Notify me if someone start to recording they screen + audio
 * @param {*} from peer_name
 * @param {*} action Started Stopped
 */
function notifyRecording(from, action) {
    let msg = '[ 🔴 REC ] : ' + action + ' to recording his own screen and audio';
    let chatMessage = {
        from: from,
        to: myPeerName,
        msg: msg,
        privateMsg: false,
    };
    handleDataChannelChat(chatMessage);
    userLog('toast', from + ' ' + msg);
}

/**
 * Handle Media Recorder obj
 * @param {*} mediaRecorder
 */
function handleMediaRecorder(mediaRecorder) {
    mediaRecorder.start();
    mediaRecorder.addEventListener('start', handleMediaRecorderStart);
    mediaRecorder.addEventListener('dataavailable', handleMediaRecorderData);
    mediaRecorder.addEventListener('stop', handleMediaRecorderStop);
}

/**
 * Handle Media Recorder onstart event
 * @param {*} event
 */
function handleMediaRecorderStart(event) {
    playSound('recStart');
    if (isRecScreenSream) {
        emitPeersAction('recStart');
        emitPeerStatus('rec', isRecScreenSream);
    }
    console.log('MediaRecorder started: ', event);
    isStreamRecording = true;
    recordStreamBtn.style.setProperty('background-color', 'red');
    startRecordingTime();
    // only for desktop
    if (!isMobileDevice) {
        tippy(recordStreamBtn, {
            content: 'STOP recording',
            placement: 'right-start',
        });
    } else {
        swapCameraBtn.style.display = 'none';
    }
}

/**
 * Handle Media Recorder ondata event
 * @param {*} event
 */
function handleMediaRecorderData(event) {
    console.log('MediaRecorder data: ', event);
    if (event.data && event.data.size > 0) recordedBlobs.push(event.data);
}

/**
 * Handle Media Recorder onstop event
 * @param {*} event
 */
function handleMediaRecorderStop(event) {
    playSound('recStop');
    console.log('MediaRecorder stopped: ', event);
    console.log('MediaRecorder Blobs: ', recordedBlobs);
    myVideoParagraph.innerHTML = myPeerName + ' (me)';
    isStreamRecording = false;
    if (isRecScreenSream) {
        recScreenStream.getTracks().forEach((track) => {
            if (track.kind === 'video') track.stop();
        });
        isRecScreenSream = false;
        emitPeersAction('recStop');
        emitPeerStatus('rec', isRecScreenSream);
    }
    setRecordButtonUi();
    downloadRecordedStream();
    // only for desktop
    if (!isMobileDevice) {
        tippy(recordStreamBtn, {
            content: 'START recording',
            placement: 'right-start',
        });
    } else {
        swapCameraBtn.style.display = 'block';
    }
}

/**
 * Stop recording
 */
function stopStreamRecording() {
    mediaRecorder.stop();
}

/**
 * Set Record Button UI on change theme
 */
function setRecordButtonUi() {
    recordStreamBtn.style.setProperty('background-color', 'white');
}

/**
 * Download recorded stream
 */
function downloadRecordedStream() {
    try {
        const type = recordedBlobs[0].type.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordedBlobs, { type: 'video/' + type });
        const recFileName = getDataTimeString() + '-REC.' + type;
        const currentDevice = isMobileDevice ? 'MOBILE' : 'PC';
        const blobFileSize = bytesToSize(blob.size);

        userLog(
            'success-html',
            `<div style="text-align: left;">
                🔴 Recording Info <br/>
                FILE: ${recFileName} <br/>
                SIZE: ${blobFileSize} <br/>
                Please wait to be processed, then will be downloaded to your ${currentDevice} device.
            </div>`,
        );

        saveBlobToFile(blob, recFileName);
    } catch (err) {
        userLog('error', 'Recording save failed: ' + err);
    }
}

/**
 * Create Chat Room Data Channel
 * @param {*} peer_id
 */
function createChatDataChannel(peer_id) {
    chatDataChannels[peer_id] = peerConnections[peer_id].createDataChannel('mirotalk_chat_channel');
    chatDataChannels[peer_id].onopen = (event) => {
        console.log('chatDataChannels created', event);
    };
}

/**
 * Set the chat room on full screen mode for mobile
 */
function setChatRoomForMobile() {
    if (isMobileDevice) {
        document.documentElement.style.setProperty('--msger-height', '99%');
        document.documentElement.style.setProperty('--msger-width', '99%');
    } else {
        // make chat room draggable for desktop
        dragElement(msgerDraggable, msgerHeader);
    }
}

/**
 * Show msger draggable on center screen position
 */
function showChatRoomDraggable() {
    playSound('newMessage');
    if (isMobileDevice) {
        buttonsBar.style.display = 'none';
        isButtonsVisible = false;
    }
    chatRoomBtn.className = 'fas fa-comment-slash';
    msgerDraggable.style.top = '50%';
    msgerDraggable.style.left = '50%';
    msgerDraggable.style.display = 'flex';
    isChatRoomVisible = true;
    // only for desktop
    if (!isMobileDevice) {
        tippy(chatRoomBtn, {
            content: 'CLOSE the chat',
            placement: 'right-start',
        });
    }
}

/**
 * Clean chat messages
 */
function cleanMessages() {
    Swal.fire({
        background: swalBackground,
        position: 'center',
        title: 'Clean up chat Messages?',
        imageUrl: deleteImg,
        showDenyButton: true,
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        // clean chat messages
        if (result.isConfirmed) {
            let msgs = msgerChat.firstChild;
            while (msgs) {
                msgerChat.removeChild(msgs);
                msgs = msgerChat.firstChild;
            }
            // clean object
            chatMessages = [];
        }
    });
}

/**
 * Hide chat room and emoji picker
 */
function hideChatRoomAndEmojiPicker() {
    msgerDraggable.style.display = 'none';
    msgerEmojiPicker.style.display = 'none';
    chatRoomBtn.className = 'fas fa-comment';
    isChatRoomVisible = false;
    isChatEmojiVisible = false;
    // only for desktop
    if (!isMobileDevice) {
        tippy(chatRoomBtn, {
            content: 'OPEN the chat',
            placement: 'right-start',
        });
    }
}

/**
 * Send Chat messages to peers in the room
 */
function sendChatMessage() {
    if (!thereIsPeerConnections()) {
        userLog('info', "Can't send message, no participants in the room");
        msgerInput.value = '';
        return;
    }

    const msg = msgerInput.value;
    // empity msg or
    if (!msg) return;

    emitMsg(myPeerName, 'toAll', msg, false);
    appendMessage(myPeerName, rightChatAvatar, 'right', msg, false);
    msgerInput.value = '';
}

/**
 * handle Incoming Data Channel Chat Messages
 * @param {*} dataMessage
 */
function handleDataChannelChat(dataMessage) {
    if (!dataMessage) return;

    let msgFrom = dataMessage.from;
    let msgTo = dataMessage.to;
    let msg = dataMessage.msg;
    let msgPrivate = dataMessage.privateMsg;

    // private message but not for me return
    if (msgPrivate && msgTo != myPeerName) return;

    console.log('handleDataChannelChat', dataMessage);
    // chat message for me also
    if (!isChatRoomVisible) {
        showChatRoomDraggable();
        chatRoomBtn.className = 'fas fa-comment-slash';
    }
    playSound('chatMessage');
    setPeerChatAvatarImgName('left', msgFrom);
    appendMessage(msgFrom, leftChatAvatar, 'left', msg, msgPrivate);
}

/**
 * Escape Special Chars
 * @param {*} regex
 */
function escapeSpecialChars(regex) {
    return regex.replace(/([()[{*+.$^\\|?])/g, '\\$1');
}

/**
 * Append Message to msger chat room
 * @param {*} from
 * @param {*} img
 * @param {*} side
 * @param {*} msg
 * @param {*} privateMsg
 */
function appendMessage(from, img, side, msg, privateMsg) {
    let time = getFormatDate(new Date());
    // collect chat msges to save it later
    chatMessages.push({
        time: time,
        from: from,
        msg: msg,
        privateMsg: privateMsg,
    });

    // check if i receive a private message
    let msgBubble = privateMsg ? 'private-msg-bubble' : 'msg-bubble';

    // console.log("chatMessages", chatMessages);
    let cMsg = detectUrl(msg);
    const msgHTML = `
	<div class="msg ${side}-msg">
		<div class="msg-img" style="background-image: url('${img}')"></div>
		<div class=${msgBubble}>
            <div class="msg-info">
                <div class="msg-info-name">${from}</div>
                <div class="msg-info-time">${time}</div>
            </div>
            <div class="msg-text">${cMsg}</div>
        </div>
	</div>
    `;
    msgerChat.insertAdjacentHTML('beforeend', msgHTML);
    msgerChat.scrollTop += 500;
}

/**
 * Add participants in the chat room lists
 * @param {*} peers
 */
function msgerAddPeers(peers) {
    // console.log("peers", peers);
    // add all current Participants
    for (let peer_id in peers) {
        let peer_name = peers[peer_id]['peer_name'];
        // bypass insert to myself in the list :)
        if (peer_name != myPeerName) {
            let exsistMsgerPrivateDiv = getId(peer_id + '_pMsgDiv');
            // if there isn't add it....
            if (!exsistMsgerPrivateDiv) {
                let msgerPrivateDiv = `
                <div id="${peer_id}_pMsgDiv" class="msger-peer-inputarea">
                    <input
                        id="${peer_id}_pMsgInput"
                        class="msger-input"
                        type="text"
                        placeholder="💬 Enter your message..."
                    />
                    <button id="${peer_id}_pMsgBtn" class="fas fa-paper-plane" value="${peer_name}">&nbsp;${peer_name}</button>
                </div>
                `;
                msgerCPList.insertAdjacentHTML('beforeend', msgerPrivateDiv);
                msgerCPList.scrollTop += 500;

                let msgerPrivateMsgInput = getId(peer_id + '_pMsgInput');
                let msgerPrivateBtn = getId(peer_id + '_pMsgBtn');
                addMsgerPrivateBtn(msgerPrivateBtn, msgerPrivateMsgInput);
            }
        }
    }
}

/**
 * Search peer by name in chat room lists to send the private messages
 */
function searchPeer() {
    let searchPeerBarName = getId('searchPeerBarName').value;
    let msgerPeerInputarea = getEcN('msger-peer-inputarea');
    searchPeerBarName = searchPeerBarName.toLowerCase();
    for (let i = 0; i < msgerPeerInputarea.length; i++) {
        if (!msgerPeerInputarea[i].innerHTML.toLowerCase().includes(searchPeerBarName)) {
            msgerPeerInputarea[i].style.display = 'none';
        } else {
            msgerPeerInputarea[i].style.display = 'flex';
        }
    }
}

/**
 * Remove participant from chat room lists
 * @param {*} peer_id
 */
function msgerRemovePeer(peer_id) {
    let msgerPrivateDiv = getId(peer_id + '_pMsgDiv');
    if (msgerPrivateDiv) {
        let peerToRemove = msgerPrivateDiv.firstChild;
        while (peerToRemove) {
            msgerPrivateDiv.removeChild(peerToRemove);
            peerToRemove = msgerPrivateDiv.firstChild;
        }
        msgerPrivateDiv.remove();
    }
}

/**
 * Setup msger buttons to send private messages
 * @param {*} msgerPrivateBtn
 * @param {*} msgerPrivateMsgInput
 */
function addMsgerPrivateBtn(msgerPrivateBtn, msgerPrivateMsgInput) {
    // add button to send private messages
    msgerPrivateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        let pMsg = msgerPrivateMsgInput.value;
        if (!pMsg) return;
        let toPeerName = msgerPrivateBtn.value;
        emitMsg(myPeerName, toPeerName, pMsg, true);
        appendMessage(myPeerName, rightChatAvatar, 'right', pMsg + '<br/><hr>Private message to ' + toPeerName, true);
        msgerPrivateMsgInput.value = '';
        msgerCP.style.display = 'none';
    });
}

/**
 * Detect url from text and make it clickable
 * Detect also if url is a img to create preview of it
 * @param {*} text
 * @returns html
 */
function detectUrl(text) {
    let urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
        if (isImageURL(text)) return '<p><img src="' + url + '" alt="img" width="200" height="auto"/></p>';
        return '<a id="chat-msg-a" href="' + url + '" target="_blank">' + url + '</a>';
    });
}

/**
 * Check if url passed is a image
 * @param {*} url
 * @returns true/false
 */
function isImageURL(url) {
    return url.match(/\.(jpeg|jpg|gif|png|tiff|bmp)$/) != null;
}

/**
 * Format data h:m:s
 * @param {*} date
 */
function getFormatDate(date) {
    const time = date.toTimeString().split(' ')[0];
    return `${time}`;
}

/**
 * Send message over Secure dataChannels
 * @param {*} from
 * @param {*} to
 * @param {*} msg
 * @param {*} privateMsg true/false
 */
function emitMsg(from, to, msg, privateMsg) {
    if (!msg) return;

    let chatMessage = {
        from: from,
        to: to,
        msg: msg,
        privateMsg: privateMsg,
    };
    console.log('Send msg', chatMessage);

    // Send chat msg through RTC Data Channels
    for (let peer_id in chatDataChannels) {
        if (chatDataChannels[peer_id].readyState === 'open')
            chatDataChannels[peer_id].send(JSON.stringify(chatMessage));
    }
}

/**
 * Hide - Show emoji picker div
 */
function hideShowEmojiPicker() {
    if (!isChatEmojiVisible) {
        playSound('newMessage');
        msgerEmojiPicker.style.display = 'block';
        isChatEmojiVisible = true;
        return;
    }
    msgerEmojiPicker.style.display = 'none';
    isChatEmojiVisible = false;
}

/**
 * Download Chat messages in json format
 * https://developer.mozilla.org/it/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
 */
function downloadChatMsgs() {
    let a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(chatMessages, null, 1));
    a.download = getDataTimeString() + '-CHAT.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Hide - show my settings
 */
function hideShowMySettings() {
    if (!isMySettingsVisible) {
        playSound('newMessage');
        // adapt it for mobile
        if (isMobileDevice) {
            mySettings.style.setProperty('width', '90%');
            document.documentElement.style.setProperty('--mySettings-select-w', '99%');
        }
        // my current peer name
        myPeerNameSet.placeholder = myPeerName;
        // center screen on show
        mySettings.style.top = '50%';
        mySettings.style.left = '50%';
        mySettings.style.display = 'block';
        isMySettingsVisible = true;
        return;
    }
    mySettings.style.display = 'none';
    isMySettingsVisible = false;
}

/**
 * Handle html tab settings
 * https://www.w3schools.com/howto/howto_js_tabs.asp
 *
 * @param {*} evt
 * @param {*} tabName
 */
function openTab(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = getEcN('tabcontent');
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = 'none';
    }
    tablinks = getEcN('tablinks');
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(' active', '');
    }
    getId(tabName).style.display = 'block';
    evt.currentTarget.className += ' active';
}

/**
 * Update myPeerName to other peers in the room
 */
function updateMyPeerName() {
    let myNewPeerName = myPeerNameSet.value;
    let myOldPeerName = myPeerName;

    // myNewPeerName empty
    if (!myNewPeerName) return;

    myPeerName = myNewPeerName;
    myVideoParagraph.innerHTML = myPeerName + ' (me)';

    sendToServer('peerName', {
        room_id: roomId,
        peer_name_old: myOldPeerName,
        peer_name_new: myPeerName,
    });

    myPeerNameSet.value = '';
    myPeerNameSet.placeholder = myPeerName;

    setPeerAvatarImgName('myVideoAvatarImage', myPeerName);
    setPeerChatAvatarImgName('right', myPeerName);
    userLog('toast', 'My name changed to ' + myPeerName);
}

/**
 * Append updated peer name to video player
 * @param {*} config
 */
function handlePeerName(config) {
    let peer_id = config.peer_id;
    let peer_name = config.peer_name;
    let videoName = getId(peer_id + '_name');
    if (videoName) videoName.innerHTML = peer_name;
    // change also btn value - name on chat lists....
    let msgerPeerName = getId(peer_id + '_pMsgBtn');
    if (msgerPeerName) {
        msgerPeerName.innerHTML = `&nbsp;${peer_name}`;
        msgerPeerName.value = peer_name;
    }
    // refresh also peer video avatar name
    setPeerAvatarImgName(peer_id + '_avatar', peer_name);
}

/**
 * Send my Video-Audio-Hand... status
 * @param {*} element
 * @param {*} status
 */
function emitPeerStatus(element, status) {
    sendToServer('peerStatus', {
        room_id: roomId,
        peer_name: myPeerName,
        element: element,
        status: status,
    });
}

/**
 * Set my Hand Status and Icon
 */
function setMyHandStatus() {
    if (myHandStatus) {
        // Raise hand
        myHandStatus = false;
        if (!isMobileDevice) {
            tippy(myHandBtn, {
                content: 'RAISE your hand',
                placement: 'right-start',
            });
        }
    } else {
        // Lower hand
        myHandStatus = true;
        if (!isMobileDevice) {
            tippy(myHandBtn, {
                content: 'LOWER your hand',
                placement: 'right-start',
            });
        }
        playSound('raiseHand');
    }
    myHandStatusIcon.style.display = myHandStatus ? 'inline' : 'none';
    emitPeerStatus('hand', myHandStatus);
}

/**
 * Set My Audio Status Icon and Title
 * @param {*} status
 */
function setMyAudioStatus(status) {
    myAudioStatusIcon.className = 'fas fa-microphone' + (status ? '' : '-slash');
    // send my audio status to all peers in the room
    emitPeerStatus('audio', status);
    tippy(myAudioStatusIcon, {
        content: status ? 'My audio is ON' : 'My audio is OFF',
    });
    status ? playSound('on') : playSound('off');
    // only for desktop
    if (!isMobileDevice) {
        tippy(audioBtn, {
            content: status ? 'Click to audio OFF' : 'Click to audio ON',
            placement: 'right-start',
        });
    }
}

/**
 * Set My Video Status Icon and Title
 * @param {*} status
 */
function setMyVideoStatus(status) {
    // on vdeo OFF display my video avatar name
    myVideoAvatarImage.style.display = status ? 'none' : 'block';
    myVideoStatusIcon.className = 'fas fa-video' + (status ? '' : '-slash');
    // send my video status to all peers in the room
    emitPeerStatus('video', status);
    tippy(myVideoStatusIcon, {
        content: status ? 'My video is ON' : 'My video is OFF',
    });
    status ? playSound('on') : playSound('off');
    // only for desktop
    if (!isMobileDevice) {
        tippy(videoBtn, {
            content: status ? 'Click to video OFF' : 'Click to video ON',
            placement: 'right-start',
        });
    }
}

/**
 * Handle peer audio - video - hand status
 * @param {*} config
 */
function handlePeerStatus(config) {
    //
    let peer_id = config.peer_id;
    let peer_name = config.peer_name;
    let element = config.element;
    let status = config.status;

    switch (element) {
        case 'video':
            setPeerVideoStatus(peer_id, status);
            break;
        case 'audio':
            setPeerAudioStatus(peer_id, status);
            break;
        case 'hand':
            setPeerHandStatus(peer_id, peer_name, status);
            break;
    }
}

/**
 * Set Participant Hand Status Icon and Title
 * @param {*} peer_id
 * @param {*} peer_name
 * @param {*} status
 */
function setPeerHandStatus(peer_id, peer_name, status) {
    let peerHandStatus = getId(peer_id + '_handStatus');
    peerHandStatus.style.display = status ? 'block' : 'none';
    if (status) {
        userLog('toast', peer_name + ' has raised the hand');
        playSound('raiseHand');
    }
}

/**
 * Set Participant Audio Status Icon and Title
 * @param {*} peer_id
 * @param {*} status
 */
function setPeerAudioStatus(peer_id, status) {
    let peerAudioStatus = getId(peer_id + '_audioStatus');
    peerAudioStatus.className = 'fas fa-microphone' + (status ? '' : '-slash');
    tippy(peerAudioStatus, {
        content: status ? 'Participant audio is ON' : 'Participant audio is OFF',
    });
    status ? playSound('on') : playSound('off');
}

/**
 * Mute Audio to specific user in the room
 * @param {*} peer_id
 */
function handlePeerAudioBtn(peer_id) {
    let peerAudioBtn = getId(peer_id + '_audioStatus');
    peerAudioBtn.onclick = () => {
        if (peerAudioBtn.className === 'fas fa-microphone') disablePeer(peer_id, 'audio');
    };
}

/**
 * Hide Video to specific user in the room
 * @param {*} peer_id
 */
function handlePeerVideoBtn(peer_id) {
    let peerVideoBtn = getId(peer_id + '_videoStatus');
    peerVideoBtn.onclick = () => {
        if (peerVideoBtn.className === 'fas fa-video') disablePeer(peer_id, 'video');
    };
}

/**
 * Send Private Message to specific peer
 * @param {*} peer_id
 * @param {*} toPeerName
 */
function handlePeerPrivateMsg(peer_id, toPeerName) {
    let peerPrivateMsg = getId(peer_id + '_privateMsg');
    peerPrivateMsg.onclick = (e) => {
        e.preventDefault();
        Swal.fire({
            background: swalBackground,
            position: 'center',
            imageUrl: messageImg,
            title: 'Send private message',
            input: 'text',
            showCancelButton: true,
            confirmButtonText: `Send`,
            showClass: {
                popup: 'animate__animated animate__fadeInDown',
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp',
            },
        }).then((result) => {
            if (result.value) {
                let pMsg = result.value;
                emitMsg(myPeerName, toPeerName, pMsg, true);
                appendMessage(
                    myPeerName,
                    rightChatAvatar,
                    'right',
                    pMsg + '<br/><hr>Private message to ' + toPeerName,
                    true,
                );
                userLog('toast', 'Message sent to ' + toPeerName + ' 👍');
            }
        });
    };
}

/**
 * Send YouTube video to specific peer
 * @param {*} peer_id
 */
function handlePeerYouTube(peer_id) {
    let peerYoutubeBtn = getId(peer_id + '_youtube');
    peerYoutubeBtn.onclick = () => {
        sendVideoUrl(peer_id);
    };
}

/**
 * Set Participant Video Status Icon and Title
 * @param {*} peer_id
 * @param {*} status
 */
function setPeerVideoStatus(peer_id, status) {
    let peerVideoAvatarImage = getId(peer_id + '_avatar');
    let peerVideoStatus = getId(peer_id + '_videoStatus');
    peerVideoStatus.className = 'fas fa-video' + (status ? '' : '-slash');
    peerVideoAvatarImage.style.display = status ? 'none' : 'block';
    tippy(peerVideoStatus, {
        content: status ? 'Participant video is ON' : 'Participant video is OFF',
    });
    status ? playSound('on') : playSound('off');
}

/**
 * Emit actions to all peers in the same room except yourself
 * @param {*} peerAction muteAudio hideVideo start/stop recording ...
 */
function emitPeersAction(peerAction) {
    if (!thereIsPeerConnections()) return;

    sendToServer('peerAction', {
        room_id: roomId,
        peer_name: myPeerName,
        peer_id: null,
        peer_action: peerAction,
    });
}

/**
 * Emit actions to specified peers in the same room
 * @param {*} peer_id
 * @param {*} peerAction
 */
function emitPeerAction(peer_id, peerAction) {
    if (!thereIsPeerConnections()) return;

    sendToServer('peerAction', {
        room_id: roomId,
        peer_id: peer_id,
        peer_name: myPeerName,
        peer_action: peerAction,
    });
}

/**
 * Handle received peer actions
 * @param {*} config
 */
function handlePeerAction(config) {
    let peer_name = config.peer_name;
    let peer_action = config.peer_action;

    switch (peer_action) {
        case 'muteAudio':
            setMyAudioOff(peer_name);
            break;
        case 'hideVideo':
            setMyVideoOff(peer_name);
            break;
        case 'recStart':
            notifyRecording(peer_name, 'Started');
            break;
        case 'recStop':
            notifyRecording(peer_name, 'Stopped');
            break;
    }
}

/**
 * Set my Audio off and Popup the peer name that performed this action
 */
function setMyAudioOff(peer_name) {
    if (myAudioStatus === false) return;
    localMediaStream.getAudioTracks()[0].enabled = false;
    myAudioStatus = localMediaStream.getAudioTracks()[0].enabled;
    audioBtn.className = 'fas fa-microphone-slash';
    setMyAudioStatus(myAudioStatus);
    userLog('toast', peer_name + ' has disabled your audio');
    playSound('off');
}

/**
 * Set my Video off and Popup the peer name that performed this action
 */
function setMyVideoOff(peer_name) {
    if (myVideoStatus === false) return;
    localMediaStream.getVideoTracks()[0].enabled = false;
    myVideoStatus = localMediaStream.getVideoTracks()[0].enabled;
    videoBtn.className = 'fas fa-video-slash';
    setMyVideoStatus(myVideoStatus);
    userLog('toast', peer_name + ' has disabled your video');
    playSound('off');
}

/**
 * Mute or Hide everyone except yourself
 * @param {*} element audio/video
 */
function disableAllPeers(element) {
    if (!thereIsPeerConnections()) {
        userLog('info', 'No participants detected');
        return;
    }
    Swal.fire({
        background: swalBackground,
        position: 'center',
        imageUrl: element == 'audio' ? audioOffImg : camOffImg,
        title: element == 'audio' ? 'Mute everyone except yourself?' : 'Hide everyone except yourself?',
        text:
            element == 'audio'
                ? "Once muted, you won't be able to unmute them, but they can unmute themselves at any time."
                : "Once hided, you won't be able to unhide them, but they can unhide themselves at any time.",
        showDenyButton: true,
        confirmButtonText: element == 'audio' ? `Mute` : `Hide`,
        denyButtonText: `Cancel`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        if (result.isConfirmed) {
            switch (element) {
                case 'audio':
                    userLog('toast', 'Mute everyone 👍');
                    emitPeersAction('muteAudio');
                    break;
                case 'video':
                    userLog('toast', 'Hide everyone 👍');
                    emitPeersAction('hideVideo');
                    break;
            }
        }
    });
}

/**
 * Mute or Hide specific peer
 * @param {*} peer_id
 * @param {*} element audio/video
 */
function disablePeer(peer_id, element) {
    if (!thereIsPeerConnections()) {
        userLog('info', 'No participants detected');
        return;
    }
    Swal.fire({
        background: swalBackground,
        position: 'center',
        imageUrl: element == 'audio' ? audioOffImg : camOffImg,
        title: element == 'audio' ? 'Mute this participant?' : 'Hide this participant?',
        text:
            element == 'audio'
                ? "Once muted, you won't be able to unmute them, but they can unmute themselves at any time."
                : "Once hided, you won't be able to unhide them, but they can unhide themselves at any time.",
        showDenyButton: true,
        confirmButtonText: element == 'audio' ? `Mute` : `Hide`,
        denyButtonText: `Cancel`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        if (result.isConfirmed) {
            switch (element) {
                case 'audio':
                    userLog('toast', 'Mute audio 👍');
                    emitPeerAction(peer_id, 'muteAudio');
                    break;
                case 'video':
                    userLog('toast', 'Hide video 👍');
                    emitPeerAction(peer_id, 'hideVideo');
                    break;
            }
        }
    });
}

/**
 * Lock Unlock the room from unauthorized access
 */
function lockUnlockRoom() {
    lockUnlockRoomBtn.className = roomLocked ? 'fas fa-lock-open' : 'fas fa-lock';

    if (roomLocked) {
        roomLocked = false;
        emitRoomStatus();
    } else {
        roomLocked = true;
        emitRoomStatus();
        playSound('locked');
    }
}

/**
 * Refresh Room Status (Locked/Unlocked)
 */
function emitRoomStatus() {
    let rStatus = roomLocked ? '🔒 LOCKED the room, no one can access!' : '🔓 UNLOCKED the room';
    userLog('toast', rStatus);

    sendToServer('roomStatus', {
        room_id: roomId,
        room_locked: roomLocked,
        peer_name: myPeerName,
    });
}

/**
 * Handle Room Status (Lock - Unlock)
 * @param {*} config
 */
function handleRoomStatus(config) {
    let peer_name = config.peer_name;
    let room_locked = config.room_locked;
    roomLocked = room_locked;
    lockUnlockRoomBtn.className = roomLocked ? 'fas fa-lock' : 'fas fa-lock-open';
    userLog('toast', peer_name + ' set room is locked to ' + roomLocked);
}

/**
 * Room is Locked can't access...
 */
function handleRoomLocked() {
    playSound('kickedOut');

    Swal.fire({
        allowOutsideClick: false,
        background: swalBackground,
        position: 'center',
        imageUrl: roomLockedImg,
        title: 'Oops, Room Locked',
        text: 'The room is locked, try with another one.',
        showDenyButton: false,
        confirmButtonText: `Ok`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        if (result.isConfirmed) window.location.href = '/newcall';
    });
}

/**
 * Whiteboard: Show-Hide
 */
function toggleWhiteboard() {
    if (!wbIsOpen) playSound('newMessage');
    whiteboard.classList.toggle('show');
    whiteboard.style.top = '50%';
    whiteboard.style.left = '50%';
    wbIsOpen = wbIsOpen ? false : true;
}

/**
 * Whiteboard: setup
 */
function setupWhiteboard() {
    setupWhiteboardCanvas();
    setupWhiteboardCanvasSize();
    setupWhiteboardLocalListners();
}

/**
 * Whiteboard: setup canvas
 */
function setupWhiteboardCanvas() {
    wbCanvas = new fabric.Canvas('wbCanvas');
    wbCanvas.freeDrawingBrush.color = '#FFFFFF';
    wbCanvas.freeDrawingBrush.width = 3;
    whiteboardIsDrawingMode(true);
}

/**
 * Whiteboard: setup canvas size
 */
function setupWhiteboardCanvasSize() {
    let optimalSize = [wbWidth, wbHeight];
    let scaleFactorX = window.innerWidth / optimalSize[0];
    let scaleFactorY = window.innerHeight / optimalSize[1];
    if (scaleFactorX < scaleFactorY && scaleFactorX < 1) {
        wbCanvas.setWidth(optimalSize[0] * scaleFactorX);
        wbCanvas.setHeight(optimalSize[1] * scaleFactorX);
        wbCanvas.setZoom(scaleFactorX);
        setWhiteboardSize(optimalSize[0] * scaleFactorX, optimalSize[1] * scaleFactorX);
    } else if (scaleFactorX > scaleFactorY && scaleFactorY < 1) {
        wbCanvas.setWidth(optimalSize[0] * scaleFactorY);
        wbCanvas.setHeight(optimalSize[1] * scaleFactorY);
        wbCanvas.setZoom(scaleFactorY);
        setWhiteboardSize(optimalSize[0] * scaleFactorY, optimalSize[1] * scaleFactorY);
    } else {
        wbCanvas.setWidth(optimalSize[0]);
        wbCanvas.setHeight(optimalSize[1]);
        wbCanvas.setZoom(1);
        setWhiteboardSize(optimalSize[0], optimalSize[1]);
    }
    wbCanvas.calcOffset();
    wbCanvas.renderAll();
}

/**
 * Whiteboard: setup size
 * @param {*} w width
 * @param {*} h height
 */
function setWhiteboardSize(w, h) {
    document.documentElement.style.setProperty('--wb-width', w);
    document.documentElement.style.setProperty('--wb-height', h);
}

/**
 * Whiteboard: drawing mode
 * @param {*} status true or false
 */
function whiteboardIsDrawingMode(status) {
    wbCanvas.isDrawingMode = status;
    if (status) {
        setColor(whiteboardPencilBtn, 'green');
        setColor(whiteboardObjectBtn, 'white');
        setColor(whiteboardEraserBtn, 'white');
        wbIsEraser = false;
    } else {
        setColor(whiteboardPencilBtn, 'white');
        setColor(whiteboardObjectBtn, 'green');
    }
}

/**
 * Whiteboard: eraser
 * @param {*} status true or false
 */
function whiteboardIsEraser(status) {
    whiteboardIsDrawingMode(false);
    wbIsEraser = status;
    setColor(whiteboardEraserBtn, wbIsEraser ? 'green' : 'white');
}

/**
 * Set color to specific element
 * @param {*} elem
 * @param {*} color
 */
function setColor(elem, color) {
    elem.style.color = color;
}

/**
 * Whiteboard: Add object to canvas
 * @param {*} type object
 */
function whiteboardAddObj(type) {
    switch (type) {
        case 'imgUrl':
            Swal.fire({
                background: swalBackground,
                title: 'Image URL',
                input: 'text',
                showCancelButton: true,
                confirmButtonText: 'OK',
            }).then((result) => {
                if (result.isConfirmed) {
                    let wbCanvasImgURL = result.value;
                    if (isImageURL(wbCanvasImgURL)) {
                        fabric.Image.fromURL(wbCanvasImgURL, function (myImg) {
                            addWbCanvasObj(myImg);
                        });
                    } else {
                        userLog('error', 'The URL is not a valid image');
                    }
                }
            });
            break;
        case 'imgFile':
            Swal.fire({
                allowOutsideClick: false,
                background: swalBackground,
                position: 'center',
                title: 'Select the image',
                input: 'file',
                inputAttributes: {
                    accept: wbImageInput,
                    'aria-label': 'Select the image',
                },
                showDenyButton: true,
                confirmButtonText: `OK`,
                denyButtonText: `Cancel`,
            }).then((result) => {
                if (result.isConfirmed) {
                    let wbCanvasImg = result.value;
                    if (wbCanvasImg && wbCanvasImg.size > 0) {
                        let reader = new FileReader();
                        reader.onload = function (event) {
                            let imgObj = new Image();
                            imgObj.src = event.target.result;
                            imgObj.onload = function () {
                                let image = new fabric.Image(imgObj);
                                image.set({ top: 0, left: 0 }).scale(0.3);
                                addWbCanvasObj(image);
                            };
                        };
                        reader.readAsDataURL(wbCanvasImg);
                    } else {
                        userLog('error', 'File not selected or empty');
                    }
                }
            });
            break;
        case 'text':
            Swal.fire({
                background: swalBackground,
                title: 'Enter the text',
                input: 'text',
                showCancelButton: true,
                confirmButtonText: 'OK',
            }).then((result) => {
                if (result.isConfirmed) {
                    let wbCanvasText = result.value;
                    if (wbCanvasText) {
                        const text = new fabric.Text(wbCanvasText, {
                            top: 0,
                            left: 0,
                            fontFamily: 'Comfortaa',
                            fill: wbCanvas.freeDrawingBrush.color,
                            strokeWidth: wbCanvas.freeDrawingBrush.width,
                            stroke: wbCanvas.freeDrawingBrush.color,
                        });
                        addWbCanvasObj(text);
                    }
                }
            });
            break;
        case 'line':
            const line = new fabric.Line([50, 100, 200, 200], {
                top: 0,
                left: 0,
                fill: wbCanvas.freeDrawingBrush.color,
                strokeWidth: wbCanvas.freeDrawingBrush.width,
                stroke: wbCanvas.freeDrawingBrush.color,
            });
            addWbCanvasObj(line);
            break;
        case 'circle':
            const circle = new fabric.Circle({
                radius: 50,
                fill: 'transparent',
                stroke: wbCanvas.freeDrawingBrush.color,
                strokeWidth: wbCanvas.freeDrawingBrush.width,
            });
            addWbCanvasObj(circle);
            break;
        case 'rect':
            const rect = new fabric.Rect({
                top: 0,
                left: 0,
                width: 150,
                height: 100,
                fill: 'transparent',
                stroke: wbCanvas.freeDrawingBrush.color,
                strokeWidth: wbCanvas.freeDrawingBrush.width,
            });
            addWbCanvasObj(rect);
            break;
    }
}

/**
 * Whiteboard: add object
 * @param {*} obj
 */
function addWbCanvasObj(obj) {
    if (obj) {
        wbCanvas.add(obj);
        whiteboardIsDrawingMode(false);
        wbCanvasToJson();
    }
}

/**
 * Whiteboard: Local listners
 */
function setupWhiteboardLocalListners() {
    wbCanvas.on('mouse:down', function (e) {
        mouseDown(e);
    });
    wbCanvas.on('mouse:up', function () {
        mouseUp();
    });
    wbCanvas.on('mouse:move', function () {
        mouseMove();
    });
    wbCanvas.on('object:added', function () {
        objectAdded();
    });
}

/**
 * Whiteboard: mouse down
 * @param {*} e
 * @returns
 */
function mouseDown(e) {
    wbIsDrawing = true;
    if (wbIsEraser && e.target) {
        wbCanvas.remove(e.target);
        return;
    }
}

/**
 * Whiteboard: mouse up
 */
function mouseUp() {
    wbIsDrawing = false;
    wbCanvasToJson();
}

/**
 * Whiteboard: mouse move
 * @returns
 */
function mouseMove() {
    if (wbIsEraser) {
        wbCanvas.hoverCursor = 'not-allowed';
        return;
    }
    if (!wbIsDrawing) return;
}

/**
 * Whiteboard: tmp objects
 */
function objectAdded() {
    if (!wbIsRedoing) wbPop = [];
    wbIsRedoing = false;
}

/**
 * Whiteboard: set background color
 * @param {*} color
 */
function wbCanvasBackgroundColor(color) {
    document.documentElement.style.setProperty('--wb-bg', color);
    wbBackgroundColorEl.value = color;
    wbCanvas.setBackgroundColor(color);
    wbCanvas.renderAll();
}

/**
 * Whiteboard: undo
 */
function wbCanvasUndo() {
    if (wbCanvas._objects.length > 0) {
        wbPop.push(wbCanvas._objects.pop());
        wbCanvas.renderAll();
    }
}

/**
 * Whiteboard: redo
 */
function wbCanvasRedo() {
    if (wbPop.length > 0) {
        wbIsRedoing = true;
        wbCanvas.add(wbPop.pop());
    }
}

/**
 * Whiteboard: save as images png
 */
function wbCanvasSaveImg() {
    const dataURL = wbCanvas.toDataURL({
        width: wbCanvas.getWidth(),
        height: wbCanvas.getHeight(),
        left: 0,
        top: 0,
        format: 'png',
    });
    const dataNow = getDataTimeString();
    const fileName = `whiteboard-${dataNow}.png`;
    saveDataToFile(dataURL, fileName);
}

/**
 * Whiteboard: save data to file
 * @param {*} dataURL
 * @param {*} fileName
 */
function saveDataToFile(dataURL, fileName) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = dataURL;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(dataURL);
    }, 100);
}

/**
 * Whiteboard: canvas objects to json
 */
function wbCanvasToJson() {
    if (thereIsPeerConnections()) {
        let config = {
            room_id: roomId,
            wbCanvasJson: JSON.stringify(wbCanvas.toJSON()),
        };
        sendToServer('wbCanvasToJson', config);
    }
}

/**
 * Whiteboard: json to canvas objects
 * @param {*} config
 */
function handleJsonToWbCanvas(config) {
    if (!wbIsOpen) toggleWhiteboard();

    wbCanvas.loadFromJSON(config.wbCanvasJson);
    wbCanvas.renderAll();
}

/**
 * Whiteboard: actions
 * @param {*} action
 * @returns json
 */
function getWhiteboardAction(action) {
    return {
        room_id: roomId,
        peer_name: myPeerName,
        action: action,
    };
}

/**
 * Whiteboard: Clean content
 */
function confirmCleanBoard() {
    playSound('newMessage');

    Swal.fire({
        background: swalBackground,
        imageUrl: deleteImg,
        position: 'center',
        title: 'Clean the board',
        text: 'Are you sure you want to clean the board?',
        showDenyButton: true,
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        if (result.isConfirmed) {
            whiteboardAction(getWhiteboardAction('clear'));
        }
    });
}

/**
 * Whiteboard: actions
 * @param {*} config
 */
function whiteboardAction(config) {
    if (thereIsPeerConnections()) {
        sendToServer('whiteboardAction', config);
    }
    handleWhiteboardAction(config, false);
}

/**
 * Whiteboard: handle actions
 * @param {*} config
 * @param {*} logme
 */
function handleWhiteboardAction(config, logme = true) {
    if (logme) {
        userLog('toast', `${config.peer_name} whiteboard action: ${config.action}`);
    }
    switch (config.action) {
        case 'bgcolor':
            wbCanvasBackgroundColor(config.color);
            break;
        case 'undo':
            wbCanvasUndo();
            break;
        case 'redo':
            wbCanvasRedo();
            break;
        case 'clear':
            wbCanvas.clear();
            break;
        case 'close':
            if (wbIsOpen) toggleWhiteboard();
            break;
        //...
    }
}

/**
 * Create File Sharing Data Channel
 * @param {*} peer_id
 */
function createFileSharingDataChannel(peer_id) {
    fileDataChannels[peer_id] = peerConnections[peer_id].createDataChannel('mirotalk_file_sharing_channel');
    fileDataChannels[peer_id].binaryType = 'arraybuffer';
    fileDataChannels[peer_id].onopen = (event) => {
        console.log('fileDataChannels created', event);
    };
}

/**
 * Handle File Sharing
 * @param {*} data
 */
function handleDataChannelFileSharing(data) {
    receiveBuffer.push(data);
    receivedSize += data.byteLength;

    // let getPercentage = ((receivedSize / incomingFileInfo.fileSize) * 100).toFixed(2);
    // console.log("Received progress: " + getPercentage + "%");

    if (receivedSize === incomingFileInfo.fileSize) {
        incomingFileData = receiveBuffer;
        receiveBuffer = [];
        endDownload();
    }
}

/**
 * Send File Data trought datachannel
 * https://webrtc.github.io/samples/src/content/datachannel/filetransfer/
 * https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js
 */
function sendFileData() {
    console.log('Send file ' + fileToSend.name + ' size ' + bytesToSize(fileToSend.size) + ' type ' + fileToSend.type);

    sendInProgress = true;

    sendFileInfo.innerHTML =
        'File name: ' +
        fileToSend.name +
        '<br>' +
        'File type: ' +
        fileToSend.type +
        '<br>' +
        'File size: ' +
        bytesToSize(fileToSend.size) +
        '<br>';

    sendFileDiv.style.display = 'inline';
    sendProgress.max = fileToSend.size;
    fileReader = new FileReader();
    let offset = 0;

    fileReader.addEventListener('error', (err) => console.error('fileReader error', err));
    fileReader.addEventListener('abort', (e) => console.log('fileReader aborted', e));
    fileReader.addEventListener('load', (e) => {
        if (!sendInProgress) return;

        // peer to peer over DataChannels
        sendFSData(e.target.result);
        offset += e.target.result.byteLength;

        sendProgress.value = offset;
        sendFilePercentage.innerHTML = 'Send progress: ' + ((offset / fileToSend.size) * 100).toFixed(2) + '%';

        // send file completed
        if (offset === fileToSend.size) {
            sendInProgress = false;
            sendFileDiv.style.display = 'none';
            userLog('success', 'The file ' + fileToSend.name + ' was sent successfully.');
        }

        if (offset < fileToSend.size) readSlice(offset);
    });
    const readSlice = (o) => {
        const slice = fileToSend.slice(offset, o + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    };
    readSlice(0);
}

/**
 * Send File through RTC Data Channels
 * @param {*} data fileReader e.target.result
 */
function sendFSData(data) {
    for (let peer_id in fileDataChannels) {
        if (fileDataChannels[peer_id].readyState === 'open') fileDataChannels[peer_id].send(data);
    }
}

/**
 * Abort the file transfer
 */
function abortFileTransfer() {
    if (fileReader && fileReader.readyState === 1) {
        fileReader.abort();
        sendFileDiv.style.display = 'none';
        sendInProgress = false;
        sendToServer('fileAbort', {
            room_id: roomId,
            peer_name: myPeerName,
        });
    }
}

/**
 * File Transfer aborted by peer
 */
function handleFileAbort() {
    receiveBuffer = [];
    incomingFileData = [];
    receivedSize = 0;
    console.log('File transfer aborted');
    userLog('toast', '⚠️ File transfer aborted');
}

/**
 * Select the File to Share
 */
function selectFileToShare() {
    playSound('newMessage');

    Swal.fire({
        allowOutsideClick: false,
        background: swalBackground,
        imageAlt: 'mirotalk-file-sharing',
        imageUrl: fileSharingImg,
        position: 'center',
        title: 'Share the file',
        input: 'file',
        inputAttributes: {
            accept: fileSharingInput,
            'aria-label': 'Select the file',
        },
        showDenyButton: true,
        confirmButtonText: `Send`,
        denyButtonText: `Cancel`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        if (result.isConfirmed) {
            fileToSend = result.value;
            if (fileToSend && fileToSend.size > 0) {
                // no peers in the room
                if (!thereIsPeerConnections()) {
                    userLog('info', 'No participants detected');
                    return;
                }
                // send some metadata about our file to peers in the room
                sendToServer('fileInfo', {
                    room_id: roomId,
                    peer_name: myPeerName,
                    file: {
                        fileName: fileToSend.name,
                        fileSize: fileToSend.size,
                        fileType: fileToSend.type,
                    },
                });
                // send the File
                setTimeout(() => {
                    sendFileData();
                }, 1000);
            } else {
                userLog('error', 'File not selected or empty.');
            }
        }
    });
}

/**
 * Get remote file info
 * @param {*} config file
 */
function handleFileInfo(config) {
    incomingFileInfo = config;
    incomingFileData = [];
    receiveBuffer = [];
    receivedSize = 0;
    let fileToReceiveInfo =
        ' From: ' +
        incomingFileInfo.peerName +
        '\n' +
        ' incoming file: ' +
        incomingFileInfo.fileName +
        '\n' +
        ' size: ' +
        bytesToSize(incomingFileInfo.fileSize) +
        '\n' +
        ' type: ' +
        incomingFileInfo.fileType;
    console.log(fileToReceiveInfo);
    userLog('toast', fileToReceiveInfo);
}

/**
 * The file will be saved in the Blob. You will be asked to confirm if you want to save it on your PC / Mobile device.
 * https://developer.mozilla.org/en-US/docs/Web/API/Blob
 */
function endDownload() {
    playSound('download');

    // save received file into Blob
    const blob = new Blob(incomingFileData);
    const file = incomingFileInfo.fileName;

    incomingFileData = [];

    // if file is image, show the preview
    if (isImageURL(incomingFileInfo.fileName)) {
        const reader = new FileReader();
        reader.onload = (e) => {
            Swal.fire({
                allowOutsideClick: false,
                background: swalBackground,
                position: 'center',
                title: 'Received file',
                text: incomingFileInfo.fileName + ' size ' + bytesToSize(incomingFileInfo.fileSize),
                imageUrl: e.target.result,
                imageAlt: 'mirotalk-file-img-download',
                showDenyButton: true,
                confirmButtonText: `Save`,
                denyButtonText: `Cancel`,
                showClass: {
                    popup: 'animate__animated animate__fadeInDown',
                },
                hideClass: {
                    popup: 'animate__animated animate__fadeOutUp',
                },
            }).then((result) => {
                if (result.isConfirmed) saveBlobToFile(blob, file);
            });
        };
        // blob where is stored downloaded file
        reader.readAsDataURL(blob);
    } else {
        // not img file
        Swal.fire({
            allowOutsideClick: false,
            background: swalBackground,
            imageAlt: 'mirotalk-file-download',
            imageUrl: fileSharingImg,
            position: 'center',
            title: 'Received file',
            text: incomingFileInfo.fileName + ' size ' + bytesToSize(incomingFileInfo.fileSize),
            showDenyButton: true,
            confirmButtonText: `Save`,
            denyButtonText: `Cancel`,
            showClass: {
                popup: 'animate__animated animate__fadeInDown',
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp',
            },
        }).then((result) => {
            if (result.isConfirmed) saveBlobToFile(blob, file);
        });
    }
}

/**
 * Save to PC / Mobile devices
 * https://developer.mozilla.org/en-US/docs/Web/API/Blob
 * @param {*} blob
 * @param {*} file
 */
function saveBlobToFile(blob, file) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = file;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Opend and send Video URL to all peers in the room
 *
 */
function sendVideoUrl(peer_id = null) {
    playSound('newMessage');

    Swal.fire({
        background: swalBackground,
        position: 'center',
        imageUrl: youtubeImg,
        title: 'Share YouTube Video',
        text: 'Past YouTube video URL',
        input: 'text',
        showCancelButton: true,
        confirmButtonText: `Share`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        if (result.value) {
            if (!thereIsPeerConnections()) {
                userLog('info', 'No participants detected');
                return;
            }
            console.log('Video URL: ' + result.value);
            let config = {
                video_src: result.value,
                peer_id: peer_id,
            };
            openVideoUrlPlayer(config);
            emitVideoPlayer('open', config);
        }
    });
}

/**
 * Open video url Player
 */
function openVideoUrlPlayer(config) {
    let videoSrc = config.video_src;
    let videoEmbed = getYoutubeEmbed(videoSrc);
    //
    if (!isVideoUrlPlayerOpen) {
        if (videoEmbed) {
            playSound('newMessage');
            videoUrlIframe.src = videoEmbed;
            videoUrlCont.style.display = 'flex';
            isVideoUrlPlayerOpen = true;
        } else {
            userLog('error', 'Something wrong, try with another Youtube URL');
        }
    } else {
        // video player seems open
        videoUrlIframe.src = videoEmbed;
    }
}

/**
 * Get youtube embed URL
 * @param {*} url
 * @returns Youtube Embed URL
 */
function getYoutubeEmbed(url) {
    let regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    let match = url.match(regExp);
    return match && match[7].length == 11 ? 'https://www.youtube.com/embed/' + match[7] + '?autoplay=1' : false;
}

/**
 * Close Video Url Player
 */
function closeVideoUrlPlayer() {
    // Reload all iframes again to stop videos & disable autoplay
    videoUrlIframe.src = videoUrlIframe.src.replace('?autoplay=1', '');
    videoUrlCont.style.display = 'none';
    isVideoUrlPlayerOpen = false;
}

/**
 * Emit video palyer to peers
 * @param {*} video_action
 * @param {*} config
 */
function emitVideoPlayer(video_action, config = {}) {
    sendToServer('videoPlayer', {
        room_id: roomId,
        peer_name: myPeerName,
        video_action: video_action,
        video_src: config.video_src,
        peer_id: config.peer_id,
    });
}

/**
 * Handle Video Player
 * @param {*} config
 */
function handleVideoPlayer(config) {
    let peer_name = config.peer_name;
    let video_action = config.video_action;
    //
    switch (video_action) {
        case 'open':
            userLog('toast', peer_name + ' open video player');
            openVideoUrlPlayer(config);
            break;
        case 'close':
            userLog('toast', peer_name + ' close video player');
            closeVideoUrlPlayer();
            break;
    }
}

/**
 * Handle peer kick out event button
 * @param {*} peer_id
 */
function handlePeerKickOutBtn(peer_id) {
    let peerKickOutBtn = getId(peer_id + '_kickOut');
    peerKickOutBtn.addEventListener('click', (e) => {
        kickOut(peer_id, peerKickOutBtn);
    });
}

/**
 * Kick out confirm
 * @param {*} peer_id
 * @param {*} peerKickOutBtn
 */
function kickOut(peer_id, peerKickOutBtn) {
    let pName = getId(peer_id + '_name').innerHTML;

    Swal.fire({
        background: swalBackground,
        position: 'center',
        imageUrl: confirmImg,
        title: 'Kick out ' + pName,
        text: 'Are you sure you want to kick out this participant?',
        showDenyButton: true,
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        if (result.isConfirmed) {
            // send peer to kick out from room
            sendToServer('kickOut', {
                room_id: roomId,
                peer_id: peer_id,
                peer_name: myPeerName,
            });
        }
    });
}

/**
 * You will be kicked out from the room and popup the peer name that performed this action
 * @param {*} config
 */
function handleKickedOut(config) {
    let peer_name = config.peer_name;

    playSound('kickedOut');

    let timerInterval;

    Swal.fire({
        allowOutsideClick: false,
        background: swalBackground,
        position: 'center',
        imageUrl: kickedOutImg,
        title: 'Kicked out!',
        html:
            `<h2 style="color: red;">` +
            `User ` +
            peer_name +
            `</h2> will kick out you after <b style="color: red;"></b> milliseconds.`,
        timer: 10000,
        timerProgressBar: true,
        didOpen: () => {
            Swal.showLoading();
            timerInterval = setInterval(() => {
                const content = Swal.getHtmlContainer();
                if (content) {
                    const b = content.querySelector('b');
                    if (b) b.textContent = Swal.getTimerLeft();
                }
            }, 100);
        },
        willClose: () => {
            clearInterval(timerInterval);
        },
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then(() => {
        window.location.href = '/newcall';
    });
}

/**
 * MiroTalk about info
 */
function showAbout() {
    playSound('newMessage');

    Swal.fire({
        background: swalBackground,
        position: 'center',
        title: '<strong>WebRTC Made with ❤️</strong>',
        imageAlt: 'mirotalk-about',
        imageUrl: aboutImg,
        html: `
        <br/>
        <div id="about">
            <b>Open Source</b> project on
            <a href="https://github.com/miroslavpejic85/mirotalk" target="_blank"><br/></br>
            <img alt="mirotalk github" src="../images/github.png"></a><br/><br/>
            <button class="far fa-heart pulsate" onclick="window.open('https://github.com/sponsors/miroslavpejic85?o=esb')"> Sponsor</button>
            <br /><br />
            Author:<a href="https://www.linkedin.com/in/miroslav-pejic-976a07101/" target="_blank"> Miroslav Pejic</a>
        </div>
        `,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    });
}

/**
 * Leave the Room and create a new one
 */
function leaveRoom() {
    playSound('newMessage');

    Swal.fire({
        background: swalBackground,
        position: 'center',
        imageAlt: 'mirotalk-leave',
        imageUrl: leaveRoomImg,
        title: 'Leave this room?',
        showDenyButton: true,
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        if (result.isConfirmed) window.location.href = '/newcall';
    });
}

/**
 * Make Obj draggable
 * https://www.w3schools.com/howto/howto_js_draggable.asp
 *
 * @param {*} elmnt
 * @param {*} dragObj
 */
function dragElement(elmnt, dragObj) {
    let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
    if (dragObj) {
        // if present, the header is where you move the DIV from:
        dragObj.onmousedown = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.onmousedown = dragMouseDown;
    }
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = elmnt.offsetTop - pos2 + 'px';
        elmnt.style.left = elmnt.offsetLeft - pos1 + 'px';
    }
    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

/**
 * Data Formated DD-MM-YYYY-H_M_S
 * https://convertio.co/it/
 * @returns data string
 */
function getDataTimeString() {
    const d = new Date();
    const date = d.toISOString().split('T')[0];
    const time = d.toTimeString().split(' ')[0];
    return `${date}-${time}`;
}

/**
 * Convert bytes to KB-MB-GB-TB
 * @param {*} bytes
 * @returns size
 */
function bytesToSize(bytes) {
    let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

/**
 * Basic user logging using https://sweetalert2.github.io
 * @param {*} type
 * @param {*} message
 */
function userLog(type, message) {
    switch (type) {
        case 'error':
            Swal.fire({
                background: swalBackground,
                position: 'center',
                icon: 'error',
                title: 'Oops...',
                text: message,
            });
            playSound('error');
            break;
        case 'info':
            Swal.fire({
                background: swalBackground,
                position: 'center',
                icon: 'info',
                title: 'Info',
                text: message,
                showClass: {
                    popup: 'animate__animated animate__fadeInDown',
                },
                hideClass: {
                    popup: 'animate__animated animate__fadeOutUp',
                },
            });
            break;
        case 'success':
            Swal.fire({
                background: swalBackground,
                position: 'center',
                icon: 'success',
                title: 'Success',
                text: message,
                showClass: {
                    popup: 'animate__animated animate__fadeInDown',
                },
                hideClass: {
                    popup: 'animate__animated animate__fadeOutUp',
                },
            });
            break;
        case 'success-html':
            Swal.fire({
                background: swalBackground,
                position: 'center',
                icon: 'success',
                title: 'Success',
                html: message,
                showClass: {
                    popup: 'animate__animated animate__fadeInDown',
                },
                hideClass: {
                    popup: 'animate__animated animate__fadeOutUp',
                },
            });
            break;
        case 'toast':
            const Toast = Swal.mixin({
                background: swalBackground,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
            });
            Toast.fire({
                icon: 'info',
                title: message,
            });
            break;
        // ......
        default:
            alert(message);
    }
}

/**
 * https://notificationsounds.com/notification-sounds
 * @param {*} name
 */
async function playSound(name) {
    if (!notifyBySound) return;
    let sound = '../sounds/' + name + '.mp3';
    let audioToPlay = new Audio(sound);
    try {
        await audioToPlay.play();
    } catch (err) {
        // console.error("Cannot play sound", err);
        // Automatic playback failed. (safari)
        return;
    }
}

/**
 * Show-Hide all elements grp by class name
 * @param {*} className
 * @param {*} displayState
 */
function toggleClassElements(className, displayState) {
    let elements = getEcN(className);
    for (let i = 0; i < elements.length; i++) {
        elements[i].style.display = displayState;
    }
}

/**
 * Get Html element by Id
 * @param {*} id
 */
function getId(id) {
    return document.getElementById(id);
}

/**
 * Get Html element by selector
 * @param {*} selector
 */
function getSl(selector) {
    return document.querySelector(selector);
}

/**
 * Get Html element by class name
 * @param {*} className
 */
function getEcN(className) {
    return document.getElementsByClassName(className);
}
