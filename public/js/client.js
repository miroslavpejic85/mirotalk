/*
 ██████ ██      ██ ███████ ███    ██ ████████ 
██      ██      ██ ██      ████   ██    ██    
██      ██      ██ █████   ██ ██  ██    ██    
██      ██      ██ ██      ██  ██ ██    ██    
 ██████ ███████ ██ ███████ ██   ████    ██   
*/

/**
 * MiroTalk P2P - Client component
 *
 * @link    GitHub: https://github.com/miroslavpejic85/mirotalk
 * @link    Official Live demo: https://p2p.mirotalk.com
 * @license For open source use: AGPLv3
 * @license For commercial use or closed source, contact us at license.mirotalk@gmail.com or purchase directly from CodeCanyon
 * @license CodeCanyon: https://codecanyon.net/item/mirotalk-p2p-webrtc-realtime-video-conferences/38376661
 * @author  Miroslav Pejic - miroslav.pejic.85@gmail.com
 * @version 1.0.5
 *
 */

'use strict';

// https://www.w3schools.com/js/js_strict.asp

const signalingServer = getSignalingServer();
const roomId = getRoomId();
const welcomeImg = '../images/image-placeholder.png';
const shareUrlImg = '../images/image-placeholder.png';
const leaveRoomImg = '../images/leave-room.png';
const confirmImg = '../images/image-placeholder.png';
const fileSharingImg = '../images/share.png';
const roomLockedImg = '../images/locked.png';
const camOffImg = '../images/cam-off.png';
const audioOffImg = '../images/audio-off.png';
const deleteImg = '../images/delete.png';
const youtubeImg = '../images/youtube.png';
const messageImg = '../images/message.png';
const kickedOutImg = '../images/leave-room.png';
const audioGif = '../images/audio.gif';
const videoAudioShare = '../images/va-share.png';
const aboutImg = '../images/mirotalk-logo.png';
const imgFeedback = '../images/feedback.png';
const forbiddenImg = '../images/forbidden.png';
const avatarImg = '../images/mirotalk-logo.png';
const camMicOff = '../images/cam-mic-off.png';

// nice free icon: https://www.iconfinder.com

const fileSharingInput = '*'; // allow all file extensions

const isWebRTCSupported = DetectRTC.isWebRTCSupported;
const isMobileDevice = DetectRTC.isMobileDevice;
const myBrowserName = DetectRTC.browser.name;

const wbImageInput = 'image/*';
const wbWidth = 1200;
const wbHeight = 600;

const chatInputEmoji = {
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

const className = {
    user: 'fas fa-user',
    clock: 'fas fa-clock',
    hideMeOn: 'fas fa-user-slash',
    hideMeOff: 'fas fa-user',
    audioOn: 'fas fa-microphone',
    audioOff: 'fas fa-microphone-slash',
    videoOn: 'fas fa-video',
    videoOff: 'fas fa-video-slash',
    screenOn: 'fas fa-desktop',
    screenOff: 'fas fa-stop-circle',
    handPulsate: 'fas fa-hand-paper pulsate',
    privacy: 'far fa-circle',
    snapShot: 'fas fa-camera-retro',
    pinUnpin: 'fas fa-map-pin',
    zoomIn: 'fas fa-magnifying-glass-plus',
    zoomOut: 'fas fa-magnifying-glass-minus',
    fullScreen: 'fas fa-expand',
    fsOn: 'fas fa-compress-alt',
    fsOff: 'fas fa-expand-alt',
    msgPrivate: 'fas fa-paper-plane',
    shareFile: 'fas fa-upload',
    shareVideoAudio: 'fab fa-youtube',
    kickOut: 'fas fa-sign-out-alt',
    chatOn: 'fas fa-comment',
    chatOff: 'fas fa-comment-slash',
    ghost: 'fas fa-ghost',
    undo: 'fas fa-undo',
    captionOn: 'fas fa-closed-captioning',
    trash: 'fas fa-trash',
    copy: 'fas fa-copy',
    heart: 'fas fa-heart',
};
// https://fontawesome.com/search?o=r&m=free

const icons = {
    lock: '<i class="fas fa-lock"></i>',
    unlock: '<i class="fas fa-lock-open"></i>',
    pitchBar: '<i class="fas fa-microphone-lines"></i>',
    sounds: '<i class="fas fa-music"></i>',
    user: '<i class="fas fa-user"></i>',
    fileSend: '<i class="fas fa-file-export"></i>',
    fileReceive: '<i class="fas fa-file-import"></i>',
};

const myRoomUrl = window.location.href;

// Local Storage class
const lS = new LocalStorage();

// Show desired buttons captionBtn, showSwapCameraBtn, showScreenShareBtn, showFullScreenBtn -> (auto-detected)
const buttons = {
    main: {
        showShareRoomBtn: true,
        showHideMeBtn: true,
        showAudioBtn: true,
        showVideoBtn: true,
        showScreenBtn: true,
        showRecordStreamBtn: true,
        showChatRoomBtn: true,
        showCaptionRoomBtn: true,
        showMyHandBtn: true,
        showWhiteboardBtn: true,
        showFileShareBtn: true,
        showMySettingsBtn: true,
        showAboutBtn: true, // Please keep me always true, Thank you!
    },
    chat: {
        showMaxBtn: true,
        showSaveMessageBtn: true,
        showMarkDownBtn: true,
        showChatGPTBtn: true,
        showFileShareBtn: true,
        showShareVideoAudioBtn: true,
        showParticipantsBtn: true,
    },
    caption: {
        showMaxBtn: true,
    },
    settings: {
        showTabRoomPeerName: true,
        showTabRoomParticipants: true,
        showTabRoomSecurity: true,
        showMuteEveryoneBtn: true,
        showHideEveryoneBtn: true,
        showEjectEveryoneBtn: true,
        showLockRoomBtn: true,
        showUnlockRoomBtn: true,
    },
    remote: {
        showAudioVolume: true,
        audioBtnClickAllowed: true,
        videoBtnClickAllowed: true,
        showKickOutBtn: true,
        showSnapShotBtn: true,
        showFileShareBtn: true,
        showShareVideoAudioBtn: true,
        showPrivateMessageBtn: true,
        showZoomInOutBtn: true,
    },
    local: {
        showSnapShotBtn: true,
        showVideoCircleBtn: true,
        showZoomInOutBtn: true,
    },
};

const isRulesActive = true; // Presenter can do anything, guest is slightly moderate, if false no Rules for the room.

const forceCamMaxResolutionAndFps = false; // This force the webCam to max resolution, up to 4k and 60fps (very high bandwidth are required) if false, you can set it from settings

const userLimitsActive = false; // Limit users per room

const usersCountLimit = 2; // Limit 2 users per room if userLimitsActive true

const useAvatarSvg = true; // if false the cam-Off avatar = avatarImg

let isHideMeActive = false; // Hide myself from the meeting view

let notifyBySound = true; // turn on - off sound notifications

let thisRoomPassword = null;

let isRoomLocked = false;

let isPresenter = false; // Who init the room (aka first peer joined)

let needToEnableMyAudio = false; // On screen sharing end, check if need to enable my audio

let initEnumerateDevicesFailed = false; // Check if user webcam and audio init is failed

let isVideoPrivacyActive = false; // Video circle for privacy

let surveyActive = true; // when leaving the room give a feedback, if false will be redirected to newcall page

let surveyURL = 'https://www.questionpro.com/t/AUs7VZq00L';

let myPeerId; // socket.id
let peerInfo = {}; // Some peer info
let userAgent; // User agent info

let isTabletDevice = false;
let isIPadDevice = false;
let isVideoFullScreenSupported = true;

// video cam - screen max frame rate
let videoMaxFrameRate = 30;
let screenMaxFrameRate = 30;

let videoQualitySelectedIndex = 0; // default

let leftChatAvatar;
let rightChatAvatar;
let chatMessagesId = 0;

let callStartTime;
let callElapsedTime;
let recStartTime;
let recElapsedTime;
let mirotalkTheme = 'dark'; // dark - grey ...
let mirotalkBtnsBar = 'vertical'; // vertical - horizontal
let pinVideoPositionSelect;
let swalBackground = 'rgba(0, 0, 0, 0.7)'; // black - #16171b - transparent ...
let myPeerName = getPeerName();
let myPeerUUID = getUUID();
let isScreenEnabled = getScreenEnabled();
let isScreenSharingSupported = false;
let isCamMirrored = false;
let notify = getNotify();
let useAudio = true;
let useVideo = true;
let isEnumerateVideoDevices = false;
let isEnumerateAudioDevices = false;
let camera = 'user'; // user = front-facing camera on a smartphone. | environment = the back camera on a smartphone.
let roomLocked = false;
let myVideoChange = false;
let myHandStatus = false;
let myVideoStatusBefore = false;
let myVideoStatus = false;
let myAudioStatus = false;
let myScreenStatus = false;
let pitchDetectionStatus = false;
let audioContext;
let mediaStreamSource;
let meter;
let isPushToTalkActive = false;
let isAudioPitchBar = true;
let isSpaceDown = false;
let isScreenStreaming = false;
let showChatOnMessage = true;
let isChatRoomVisible = false;
let isCaptionBoxVisible = false;
let isChatEmojiVisible = false;
let isChatMarkdownOn = false;
let isChatGPTOn = false;
let isButtonsVisible = false;
let isButtonsBarOver = false;
let isMySettingsVisible = false;
let isVideoOnFullScreen = false;
let isDocumentOnFullScreen = false;
let isWhiteboardFs = false;
let isVideoUrlPlayerOpen = false;
let isVideoPinned = false;
let pinnedVideoPlayerId = null;
let isRecScreenStream = false;
let isChatPasteTxt = false;
let needToCreateOffer = false; // after session description answer
let signalingSocket; // socket.io connection to our webserver
let initStream; // initial webcam stream
let localMediaStream; // my microphone / webcam
let remoteMediaStream; // peers microphone / webcam
let recScreenStream; // recorded screen stream
let remoteMediaControls = false; // enable - disable peers video player controls (default false)
let peerConnection = null; // RTCPeerConnection
let peerConnections = {}; // keep track of our peer connections, indexed by peer_id == socket.io id
let chatDataChannels = {}; // keep track of our peer chat data channels
let fileDataChannels = {}; // keep track of our peer file sharing data channels
let peerMediaElements = {}; // keep track of our peer <video> tags, indexed by peer_id
let chatMessages = []; // collect chat messages to save it later if want
let allPeers = {}; // keep track of all peers in the room, indexed by peer_id == socket.io id
let transcripts = []; //collect all the transcripts to save it later if you need
let countTime; // conference count time
// init audio-video
let initAudioBtn;
let initVideoBtn;
let initScreenShareBtn;
// init Devices select
let initVideo;
let initVideoSelect;
let initMicrophoneSelect;
let initSpeakerSelect;
// buttons bar
let buttonsBar;
let shareRoomBtn;
let hideMeBtn;
let audioBtn;
let videoBtn;
let swapCameraBtn;
let screenShareBtn;
let recordStreamBtn;
let fullScreenBtn;
let chatRoomBtn;
let captionBtn;
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
let msgerMaxBtn;
let msgerMinBtn;
let msgerChat;
let msgerEmojiBtn;
let msgerMarkdownBtn;
let msgerGPTBtn;
let msgerShareFileBtn;
let msgerInput;
let msgerCleanTextBtn;
let msgerPasteBtn;
let msgerShowChatOnMsg;
let msgerSendBtn;
//caption section
let captionDraggable;
let captionHeader;
let captionTheme;
let captionMaxBtn;
let captionMinBtn;
let captionClean;
let captionSaveBtn;
let captionClose;
let captionChat;
// chat room connected peers
let msgerCP;
let msgerCPHeader;
let msgerCPCloseBtn;
let msgerCPList;
// chat room emoji picker
let msgerEmojiPicker;
// my settings
let mySettings;
let mySettingsHeader;
let tabDevicesBtn;
let tabBandwidthBtn;
let tabRoomBtn;
let tabStylingBtn;
let tabLanguagesBtn;
let mySettingsCloseBtn;
let myPeerNameSet;
let myPeerNameSetBtn;
let switchSounds;
let switchPushToTalk;
let switchAudioPitchBar;
let audioInputSelect;
let audioOutputSelect;
let videoSelect;
let videoQualitySelect;
let videoFpsSelect;
let screenFpsSelect;
let themeSelect;
let videoObjFitSelect;

let btnsBarSelect;
let selectors;
let tabRoomPeerName;
let tabRoomParticipants;
let tabRoomSecurity;
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
let whiteboardGhostButton;
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
let whiteboardTriangleBtn;
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
let wbIsBgTransparent = false;
let wbPop = [];
// room actions btns
let muteEveryoneBtn;
let hideEveryoneBtn;
let ejectEveryoneBtn;
let lockRoomBtn;
let unlockRoomBtn;
// file transfer settings
let fileToSend;
let fileReader;
let receiveBuffer = [];
let receivedSize = 0;
let incomingFileInfo;
let incomingFileData;
// send form
let sendFileDiv;
let sendFileInfo;
let sendProgress;
let sendAbortBtn;
let sendInProgress = false;
// receive form
let receiveFileDiv;
let receiveFileInfo;
let receiveProgress;
let receiveHideBtn;
let receiveFilePercentage;
let receiveInProgress = false;
// MTU 1kb to prevent drop.
// const chunkSize = 1024;
const chunkSize = 1024 * 16; // 16kb/s
// video URL player
let videoUrlCont;
let videoAudioUrlCont;
let videoUrlHeader;
let videoAudioUrlHeader;
let videoUrlCloseBtn;
let videoAudioCloseBtn;
let videoUrlIframe;
let videoAudioUrlElement;
// speech recognition
let speechRecognitionIcon;
let speechRecognitionStart;
let speechRecognitionStop;

/**
 * Load all Html elements by Id
 */
function getHtmlElementsById() {
    countTime = getId('countTime');
    // init buttons
    initScreenShareBtn = getId('initScreenShareBtn');
    // Init devices select
    initVideo = getId('initVideo');
    initVideoSelect = getId('initVideoSelect');
    initMicrophoneSelect = getId('initMicrophoneSelect');
    initSpeakerSelect = getId('initSpeakerSelect');
    // my video
    myVideo = getId('myVideo');
    myVideoWrap = getId('myVideoWrap');
    myVideoAvatarImage = getId('myVideoAvatarImage');
    // buttons Bar
    buttonsBar = getId('buttonsBar');
    shareRoomBtn = getId('shareRoomBtn');
    hideMeBtn = getId('hideMeBtn');
    audioBtn = getId('audioBtn');
    videoBtn = getId('videoBtn');
    swapCameraBtn = getId('swapCameraBtn');
    screenShareBtn = getId('screenShareBtn');
    recordStreamBtn = getId('recordStreamBtn');
    fullScreenBtn = getId('fullScreenBtn');
    captionBtn = getId('captionBtn');
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
    msgerMaxBtn = getId('msgerMaxBtn');
    msgerMinBtn = getId('msgerMinBtn');
    msgerChat = getId('msgerChat');
    msgerEmojiBtn = getId('msgerEmojiBtn');
    msgerMarkdownBtn = getId('msgerMarkdownBtn');
    msgerGPTBtn = getId('msgerGPTBtn');
    msgerShareFileBtn = getId('msgerShareFileBtn');
    msgerInput = getId('msgerInput');
    msgerCleanTextBtn = getId('msgerCleanTextBtn');
    msgerPasteBtn = getId('msgerPasteBtn');
    msgerShowChatOnMsg = getId('msgerShowChatOnMsg');
    msgerSendBtn = getId('msgerSendBtn');
    // chat room connected peers
    msgerCP = getId('msgerCP');
    msgerCPHeader = getId('msgerCPHeader');
    msgerCPCloseBtn = getId('msgerCPCloseBtn');
    msgerCPList = getId('msgerCPList');
    // chat room emoji picker
    msgerEmojiPicker = getId('msgerEmojiPicker');
    //caption box elements
    captionDraggable = getId('captionDraggable');
    captionHeader = getId('captionHeader');
    captionTheme = getId('captionTheme');
    captionMaxBtn = getId('captionMaxBtn');
    captionMinBtn = getId('captionMinBtn');
    captionClean = getId('captionClean');
    captionSaveBtn = getId('captionSaveBtn');
    captionClose = getId('captionClose');
    captionChat = getId('captionChat');
    // my settings
    mySettings = getId('mySettings');
    mySettingsHeader = getId('mySettingsHeader');
    tabDevicesBtn = getId('tabDevicesBtn');
    tabBandwidthBtn = getId('tabBandwidthBtn');
    tabRoomBtn = getId('tabRoomBtn');
    tabStylingBtn = getId('tabStylingBtn');
    tabLanguagesBtn = getId('tabLanguagesBtn');
    mySettingsCloseBtn = getId('mySettingsCloseBtn');
    myPeerNameSet = getId('myPeerNameSet');
    myPeerNameSetBtn = getId('myPeerNameSetBtn');
    switchSounds = getId('switchSounds');
    switchPushToTalk = getId('switchPushToTalk');
    switchAudioPitchBar = getId('switchAudioPitchBar');
    audioInputSelect = getId('audioSource');
    audioOutputSelect = getId('audioOutput');
    videoSelect = getId('videoSource');
    videoQualitySelect = getId('videoQuality');
    videoFpsSelect = getId('videoFps');
    screenFpsSelect = getId('screenFps');
    themeSelect = getId('mirotalkTheme');
    videoObjFitSelect = getId('videoObjFitSelect');
    btnsBarSelect = getId('mirotalkBtnsBar');
    pinVideoPositionSelect = getId('pinVideoPositionSelect');
    tabRoomPeerName = getId('tabRoomPeerName');
    tabRoomParticipants = getId('tabRoomParticipants');
    tabRoomSecurity = getId('tabRoomSecurity');
    // my conference name, hand, video - audio status
    myVideoParagraph = getId('myVideoParagraph');
    myHandStatusIcon = getId('myHandStatusIcon');
    myVideoStatusIcon = getId('myVideoStatusIcon');
    myAudioStatusIcon = getId('myAudioStatusIcon');
    // my whiteboard
    whiteboard = getId('whiteboard');
    whiteboardHeader = getId('whiteboardHeader');
    wbDrawingColorEl = getId('wbDrawingColorEl');
    whiteboardGhostButton = getId('whiteboardGhostButton');
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
    whiteboardTriangleBtn = getId('whiteboardTriangleBtn');
    whiteboardCircleBtn = getId('whiteboardCircleBtn');
    whiteboardSaveBtn = getId('whiteboardSaveBtn');
    whiteboardEraserBtn = getId('whiteboardEraserBtn');
    whiteboardCleanBtn = getId('whiteboardCleanBtn');
    whiteboardCloseBtn = getId('whiteboardCloseBtn');
    // room actions buttons
    muteEveryoneBtn = getId('muteEveryoneBtn');
    hideEveryoneBtn = getId('hideEveryoneBtn');
    ejectEveryoneBtn = getId('ejectEveryoneBtn');
    lockRoomBtn = getId('lockRoomBtn');
    unlockRoomBtn = getId('unlockRoomBtn');
    // file send progress
    sendFileDiv = getId('sendFileDiv');
    sendFileInfo = getId('sendFileInfo');
    sendProgress = getId('sendProgress');
    sendAbortBtn = getId('sendAbortBtn');
    // file receive progress
    receiveFileDiv = getId('receiveFileDiv');
    receiveFileInfo = getId('receiveFileInfo');
    receiveProgress = getId('receiveProgress');
    receiveHideBtn = getId('receiveHideBtn');
    receiveFilePercentage = getId('receiveFilePercentage');
    // video url player
    videoUrlCont = getId('videoUrlCont');
    videoAudioUrlCont = getId('videoAudioUrlCont');
    videoUrlHeader = getId('videoUrlHeader');
    videoAudioUrlHeader = getId('videoAudioUrlHeader');
    videoUrlCloseBtn = getId('videoUrlCloseBtn');
    videoAudioCloseBtn = getId('videoAudioCloseBtn');
    videoUrlIframe = getId('videoUrlIframe');
    videoAudioUrlElement = getId('videoAudioUrlElement');
    // speech recognition
    speechRecognitionIcon = getId('speechRecognitionIcon');
    speechRecognitionStart = getId('speechRecognitionStart');
    speechRecognitionStop = getId('speechRecognitionStop');
}

/**
 * Using tippy aka very nice tooltip!
 * https://atomiks.github.io/tippyjs/
 */
function setButtonsToolTip() {
    // not need for mobile
    if (isMobileDevice) return;
    // init buttons
    setTippy(initScreenShareBtn, 'Toggle screen sharing', 'top');
    // main buttons
    setTippy(shareRoomBtn, 'Invite others to join', 'right-start');
    setTippy(hideMeBtn, 'Toggle hide myself from the room view', 'right-start');
    setTippy(audioBtn, 'Stop the audio', 'right-start');
    setTippy(videoBtn, 'Stop the video', 'right-start');
    setTippy(screenShareBtn, 'Start screen sharing', 'right-start');
    setTippy(recordStreamBtn, 'Start recording', 'right-start');
    setTippy(fullScreenBtn, 'View full screen', 'right-start');
    setTippy(chatRoomBtn, 'Open the chat', 'right-start');
    setTippy(captionBtn, 'Open the caption', 'right-start');
    setTippy(myHandBtn, 'Raise your hand', 'right-start');
    setTippy(whiteboardBtn, 'Open the whiteboard', 'right-start');
    setTippy(fileShareBtn, 'Share file', 'right-start');
    setTippy(mySettingsBtn, 'Open settings', 'right-start');
    setTippy(aboutBtn, 'About this project', 'right-start');
    setTippy(leaveRoomBtn, 'Leave this room', 'right-start');
    // chat room buttons
    setTippy(msgerTheme, 'Ghost theme', 'top');
    setTippy(msgerCPBtn, 'Private messages', 'top');
    setTippy(msgerClean, 'Clean the messages', 'top');
    setTippy(msgerSaveBtn, 'Save the messages', 'top');
    setTippy(msgerClose, 'Close', 'right');
    setTippy(msgerMaxBtn, 'Maximize', 'right');
    setTippy(msgerMinBtn, 'Minimize', 'right');
    setTippy(msgerEmojiBtn, 'Emoji', 'top');
    setTippy(msgerMarkdownBtn, 'Markdown', 'top');
    setTippy(msgerGPTBtn, 'ChatGPT', 'top');
    setTippy(msgerShareFileBtn, 'Share file', 'top');
    setTippy(msgerCleanTextBtn, 'Clean', 'top');
    setTippy(msgerPasteBtn, 'Paste', 'top');
    setTippy(msgerShowChatOnMsg, "Show me when I'm receive a new message", 'top');
    setTippy(msgerSendBtn, 'Send', 'top');
    // chat participants buttons
    setTippy(msgerCPCloseBtn, 'Close', 'left');
    // caption buttons
    setTippy(captionClose, 'Close', 'right');
    setTippy(captionMaxBtn, 'Maximize', 'right');
    setTippy(captionMinBtn, 'Minimize', 'right');
    setTippy(captionTheme, 'Ghost theme', 'top');
    setTippy(captionClean, 'Clean the messages', 'top');
    setTippy(captionSaveBtn, 'Save the messages', 'top');
    setTippy(speechRecognitionStart, 'Start', 'top');
    setTippy(speechRecognitionStop, 'Stop', 'top');
    // settings
    setTippy(mySettingsCloseBtn, 'Close', 'right');
    setTippy(myPeerNameSetBtn, 'Change name', 'top');
    setTippy(
        switchPushToTalk,
        'If Active, When SpaceBar keydown the microphone will be activated, on keyup will be deactivated, like a walkie-talkie.',
        'right',
    );
    setTippy(switchSounds, 'Toggle room notify sounds', 'right');
    // tab btns
    setTippy(tabDevicesBtn, 'Devices', 'top');
    setTippy(tabBandwidthBtn, 'Bandwidth', 'top');
    setTippy(tabRoomBtn, 'Room', 'top');
    setTippy(tabStylingBtn, 'Styling', 'top');
    setTippy(tabLanguagesBtn, 'Languages', 'top');
    // whiteboard btns
    setTippy(wbDrawingColorEl, 'Drawing color', 'bottom');
    setTippy(whiteboardGhostButton, 'Toggle transparent background', 'bottom');
    setTippy(wbBackgroundColorEl, 'Background color', 'bottom');
    setTippy(whiteboardPencilBtn, 'Drawing mode', 'bottom');
    setTippy(whiteboardObjectBtn, 'Object mode', 'bottom');
    setTippy(whiteboardUndoBtn, 'Undo', 'bottom');
    setTippy(whiteboardRedoBtn, 'Redo', 'bottom');
    setTippy(whiteboardImgFileBtn, 'Add image from file', 'bottom');
    setTippy(whiteboardImgUrlBtn, 'Add image from URL', 'bottom');
    setTippy(whiteboardTextBtn, 'Add the text', 'bottom');
    setTippy(whiteboardLineBtn, 'Add the line', 'bottom');
    setTippy(whiteboardRectBtn, 'Add the rectangle', 'bottom');
    setTippy(whiteboardTriangleBtn, 'Add triangle', 'bottom');
    setTippy(whiteboardCircleBtn, 'Add the circle', 'bottom');
    setTippy(whiteboardSaveBtn, 'Save the board', 'bottom');
    setTippy(whiteboardEraserBtn, 'Erase the object', 'bottom');
    setTippy(whiteboardCleanBtn, 'Clean the board', 'bottom');
    setTippy(whiteboardCloseBtn, 'Close', 'right');
    // room actions btn
    // setTippy(muteEveryoneBtn, 'Mute everyone except yourself', 'top');
    // setTippy(hideEveryoneBtn, 'Hide everyone except yourself', 'top');
    // setTippy(ejectEveryoneBtn, 'Eject everyone except yourself', 'top');
    // Suspend/Hide File transfer btn
    setTippy(sendAbortBtn, 'Abort file transfer', 'right-start');
    setTippy(receiveHideBtn, 'Hide file transfer', 'right-start');
    // video URL player
    setTippy(videoUrlCloseBtn, 'Close the video player', 'right-start');
    setTippy(videoAudioCloseBtn, 'Close the video player', 'right-start');
    setTippy(msgerVideoUrlBtn, 'Share a video or audio to all participants', 'top');
}

/**
 * Set nice tooltip to element
 * @param {object} elem element
 * @param {string} content message to popup
 * @param {string} placement position
 */
function setTippy(elem, content, placement) {
    if (isMobileDevice) return;
    tippy(elem, {
        content: content,
        placement: placement,
    });
}

/**
 * Get peer info using DetecRTC
 * https://github.com/muaz-khan/DetectRTC
 * @returns {object} peer info
 */
function getPeerInfo() {
    return {
        detectRTCversion: DetectRTC.version,
        isWebRTCSupported: DetectRTC.isWebRTCSupported,
        isDesktopDevice: !DetectRTC.isMobileDevice && !isTabletDevice && !isIPadDevice,
        isMobileDevice: DetectRTC.isMobileDevice,
        isTabletDevice: isTabletDevice,
        isIPadDevice: isIPadDevice,
        osName: DetectRTC.osName,
        osVersion: DetectRTC.osVersion,
        browserName: DetectRTC.browser.name,
        browserVersion: DetectRTC.browser.version,
    };
}

/**
 * Get Signaling server URL
 * @returns {string} Signaling server URL
 */
function getSignalingServer() {
    console.log('00 Location', window.location);
    return window.location.protocol + '//' + window.location.hostname;
}

/**
 * Generate random Room id if not set
 * @returns {string} Room Id
 */
function getRoomId() {
    // check if passed as params /join?room=id
    let qs = new URLSearchParams(window.location.search);
    let queryRoomId = filterXSS(qs.get('room'));

    // skip /join/
    let roomId = queryRoomId ? queryRoomId : window.location.pathname.substring(6);

    // if not specified room id, create one random
    if (roomId == '') {
        roomId = makeId(20);
        const newUrl = signalingServer + '/join/' + roomId;
        window.history.pushState({ url: newUrl }, roomId, newUrl);
    }
    console.log('Direct join', { room: roomId });
    return roomId;
}

/**
 * Generate random Id
 * @param {integer} length
 * @returns {string} random id
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
 * Get UUID4
 * @returns uuid4
 */
function getUUID() {
    const uuid4 = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
    );
    if (window.localStorage.uuid) {
        return window.localStorage.uuid;
    }
    window.localStorage.uuid = uuid4;
    return uuid4;
}

/**
 * Check if notify is set
 * @returns {boolean} true/false (default true)
 */
function getNotify() {
    let qs = new URLSearchParams(window.location.search);
    let notify = filterXSS(qs.get('notify'));
    if (notify) {
        let queryNotify = notify === '1' || notify === 'true';
        if (queryNotify != null) return queryNotify;
    }
    return true;
}

/**
 * Check if peer name is set
 * @returns {string} Peer Name
 */
function getPeerName() {
    const qs = new URLSearchParams(window.location.search);
    const name = filterXSS(qs.get('name'));
    if (isHtml(name)) {
        console.log('Direct join', { name: 'Invalid name' });
        return 'Invalid name';
    }
    console.log('Direct join', { name: name });
    return name;
}

/**
 * Is screen enabled on join room
 * @returns {boolean} true/false
 */
function getScreenEnabled() {
    let qs = new URLSearchParams(window.location.search);
    let screen = filterXSS(qs.get('screen'));
    if (screen) {
        screen = screen.toLowerCase();
        let queryPeerScreen = screen === '1' || screen === 'true';
        console.log('Direct join', { screen: queryPeerScreen });
        return queryPeerScreen;
    }
    console.log('Direct join', { screen: false });
    return false;
}

/**
 * Check if there is peer connections
 * @returns {boolean} true/false
 */
function thereIsPeerConnections() {
    if (Object.keys(peerConnections).length === 0) return false;
    return true;
}

/**
 * Count the peer connections
 * @returns peer connections count
 */
function countPeerConnections() {
    return Object.keys(peerConnections).length;
}

/**
 * On body load Get started
 */
function initClientPeer() {
    if (!isWebRTCSupported) {
        return userLog('error', 'This browser seems not supported WebRTC!');
    }

    userAgent = navigator.userAgent.toLowerCase();

    isTabletDevice = isTablet(userAgent);
    isIPadDevice = isIpad(userAgent);
    peerInfo = getPeerInfo();

    // check if video Full screen supported on default true
    if (peerInfo.isMobileDevice && peerInfo.osName === 'iOS') {
        isVideoFullScreenSupported = false;
    }

    console.log('01. Connecting to signaling server');

    // Disable the HTTP long-polling transport
    signalingSocket = io({ transports: ['websocket'] });

    const transport = signalingSocket.io.engine.transport.name; // in most cases, "polling"
    console.log('02. Connection transport', transport);

    // Check upgrade transport
    signalingSocket.io.engine.on('upgrade', () => {
        const upgradedTransport = signalingSocket.io.engine.transport.name; // in most cases, "websocket"
        console.log('Connection upgraded transport', upgradedTransport);
    });

    // async - await requests
    signalingSocket.request = function request(type, data = {}) {
        return new Promise((resolve, reject) => {
            signalingSocket.emit(type, data, (data) => {
                if (data.error) {
                    console.error('signalingSocket.request error', data.error);
                    reject(data.error);
                } else {
                    console.log('signalingSocket.request data', data);
                    resolve(data);
                }
            });
        });
    };

    // on receiving data from signaling server...
    signalingSocket.on('connect', handleConnect);
    signalingSocket.on('roomIsLocked', handleUnlockTheRoom);
    signalingSocket.on('roomAction', handleRoomAction);
    signalingSocket.on('addPeer', handleAddPeer);
    signalingSocket.on('serverInfo', handleServerInfo);
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
 * @param {string} msg msg to send to signaling server
 * @param {object} config data to send to signaling server
 */
async function sendToServer(msg, config = {}) {
    await signalingSocket.emit(msg, config);
}

/**
 * Send async data through RTC Data Channels
 * @param {object} config data
 */
async function sendToDataChannel(config) {
    if (thereIsPeerConnections() && typeof config === 'object' && config !== null) {
        for (let peer_id in chatDataChannels) {
            if (chatDataChannels[peer_id].readyState === 'open')
                await chatDataChannels[peer_id].send(JSON.stringify(config));
        }
    }
}

/**
 * Connected to Signaling Server. Once the user has given us access to their
 * microphone/cam, join the channel and start peering up
 */
async function handleConnect() {
    console.log('03. Connected to signaling server');

    myPeerId = signalingSocket.id;
    console.log('04. My peer id [ ' + myPeerId + ' ]');

    if (localMediaStream) {
        await joinToChannel();
    } else {
        await initEnumerateDevices();
        await setupLocalMedia();
        await whoAreYou();
    }
}

/**
 * Handle some signaling server info
 * @param {object} config data
 */
function handleServerInfo(config) {
    const { peers_count, is_presenter, survey } = config;

    // Get survey settings from server
    surveyActive = survey.active;
    surveyURL = survey.url;

    console.log('13. Server info', config);

    // Limit room to n peers
    if (userLimitsActive && peers_count > usersCountLimit) {
        return roomIsBusy();
    }

    // Let start with some basic rules
    isPresenter = is_presenter;
    if (isRulesActive) {
        handleRules(isPresenter);
    }

    if (notify && peers_count == 1) {
        shareRoomMeetingURL(true);
    } else {
        checkShareScreen();
    }
}

/**
 * Room is busy, disconnect me and alert the user that
 * will be redirected to home page
 */
function roomIsBusy() {
    signalingSocket.disconnect();
    playSound('alert');
    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: swalBackground,
        imageUrl: forbiddenImg,
        position: 'center',
        title: 'Room is busy',
        html: `The room is limited to ${usersCountLimit} users. <br/> Please try again later`,
        showDenyButton: false,
        confirmButtonText: `OK`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        if (result.isConfirmed) {
            openURL('/');
        }
    });
}

/**
 * Presenter can do anything, for others you can limit
 * some functions by hidden the buttons etc.
 *
 * @param {boolean} isPresenter true/false
 */
function handleRules(isPresenter) {
    console.log('14. Peer isPresenter: ' + isPresenter);
    if (!isPresenter) {
        buttons.settings.showTabRoomParticipants = false;
        buttons.settings.showTabRoomSecurity = false;
        buttons.remote.audioBtnClickAllowed = false;
        buttons.remote.videoBtnClickAllowed = false;
        buttons.remote.showKickOutBtn = false;
        //...
    } else {
        buttons.settings.showTabRoomParticipants = true;
        buttons.settings.showTabRoomSecurity = true;
        buttons.settings.showLockRoomBtn = !isRoomLocked;
        buttons.settings.showUnlockRoomBtn = isRoomLocked;
        buttons.remote.audioBtnClickAllowed = true;
        buttons.remote.videoBtnClickAllowed = true;
        buttons.remote.showKickOutBtn = true;
    }

    handleButtonsRule();
}

/**
 * Hide not desired buttons
 */
function handleButtonsRule() {
    // Main
    elemDisplay(shareRoomBtn, buttons.main.showShareRoomBtn);
    elemDisplay(hideMeBtn, buttons.main.showHideMeBtn);
    elemDisplay(audioBtn, buttons.main.showAudioBtn);
    elemDisplay(videoBtn, buttons.main.showVideoBtn);
    //elemDisplay(screenShareBtn, buttons.main.showScreenBtn); // auto-detected
    elemDisplay(recordStreamBtn, buttons.main.showRecordStreamBtn);
    elemDisplay(chatRoomBtn, buttons.main.showChatRoomBtn);
    elemDisplay(captionBtn, buttons.main.showCaptionRoomBtn && speechRecognition); // auto-detected
    elemDisplay(myHandBtn, buttons.main.showMyHandBtn);
    elemDisplay(whiteboardBtn, buttons.main.showWhiteboardBtn);
    elemDisplay(fileShareBtn, buttons.main.showFileShareBtn);
    elemDisplay(mySettingsBtn, buttons.main.showMySettingsBtn);
    elemDisplay(aboutBtn, buttons.main.showAboutBtn);
    // chat
    elemDisplay(msgerMaxBtn, !isMobileDevice && buttons.chat.showMaxBtn);
    elemDisplay(msgerSaveBtn, buttons.chat.showSaveMessageBtn);
    elemDisplay(msgerMarkdownBtn, buttons.chat.showMarkDownBtn);
    elemDisplay(msgerGPTBtn, buttons.chat.showChatGPTBtn);
    elemDisplay(msgerShareFileBtn, buttons.chat.showFileShareBtn);
    elemDisplay(msgerVideoUrlBtn, buttons.chat.showShareVideoAudioBtn);
    elemDisplay(msgerCPBtn, buttons.chat.showParticipantsBtn);
    // caption
    elemDisplay(captionMaxBtn, !isMobileDevice && buttons.caption.showMaxBtn);
    // Settings
    elemDisplay(muteEveryoneBtn, buttons.settings.showMuteEveryoneBtn);
    elemDisplay(hideEveryoneBtn, buttons.settings.showHideEveryoneBtn);
    elemDisplay(ejectEveryoneBtn, buttons.settings.showEjectEveryoneBtn);
    elemDisplay(lockRoomBtn, buttons.settings.showLockRoomBtn);
    elemDisplay(unlockRoomBtn, buttons.settings.showUnlockRoomBtn);
    elemDisplay(tabRoomPeerName, buttons.settings.showTabRoomPeerName);
    elemDisplay(tabRoomParticipants, buttons.settings.showTabRoomParticipants);
    elemDisplay(tabRoomSecurity, buttons.settings.showTabRoomSecurity);
}

/**
 * set your name for the conference
 */
async function whoAreYou() {
    console.log('11. Who are you?');

    getId('loadingDiv').style.display = 'none';
    document.body.style.background = 'var(--body-bg)';

    if (myPeerName) {
        myPeerName = filterXSS(myPeerName);

        console.log(`11.1 Check if ${myPeerName} exist in the room`, roomId);

        if (await checkUserName()) {
            return userNameAlreadyInRoom();
        }

        checkPeerAudioVideo();
        whoAreYouJoin();
        playSound('addPeer');
        return;
    }

    playSound('newMessage');

    await loadLocalStorage();

    const initUser = getId('initUser');
    initUser.classList.toggle('hidden');

    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: 'radial-gradient(#393939, #000000)', //swalBackground,
        title: 'MiroTalk P2P',
        position: 'center',
        input: 'text',
        inputPlaceholder: 'Enter your name',
        inputValue: window.localStorage.peer_name ? window.localStorage.peer_name : '',
        html: initUser, // inject html
        confirmButtonText: `Join meeting`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
        inputValidator: async (value) => {
            if (!value) return 'Please enter your name';

            // prevent xss execution itself
            myPeerName = filterXSS(value);

            // prevent XSS injection to remote peer
            if (isHtml(myPeerName)) {
                myPeerName = '';
                return 'Invalid name!';
            }

            // check if peer name is already in use in the room
            if (await checkUserName()) {
                return 'Username is already in use!';
            } else {
                window.localStorage.peer_name = myPeerName;
                whoAreYouJoin();
            }
        },
    }).then(() => {
        playSound('addPeer');
    });

    // select video - audio

    initVideoSelect.onchange = async () => {
        videoSelect.selectedIndex = initVideoSelect.selectedIndex;
        lS.setLocalStorageDevices(lS.MEDIA_TYPE.video, videoSelect.selectedIndex, videoSelect.value);
        myVideoChange = true;
        await refreshLocalMedia();
        await changeInitCamera(initVideoSelect.value);
    };
    initMicrophoneSelect.onchange = async () => {
        audioInputSelect.selectedIndex = initMicrophoneSelect.selectedIndex;
        lS.setLocalStorageDevices(lS.MEDIA_TYPE.audio, audioInputSelect.selectedIndex, audioInputSelect.value);
        myVideoChange = false;
        await refreshLocalMedia();
    };
    initSpeakerSelect.onchange = () => {
        audioOutputSelect.selectedIndex = initSpeakerSelect.selectedIndex;
        lS.setLocalStorageDevices(lS.MEDIA_TYPE.speaker, audioOutputSelect.selectedIndex, audioOutputSelect.value);
        changeAudioDestination();
    };

    // init video -audio buttons

    initAudioBtn = getId('initAudioBtn');
    initVideoBtn = getId('initVideoBtn');

    if (!useVideo) {
        initVideoBtn.className = className.videoOff;
        setMyVideoStatus(useVideo);
    }
    if (!useAudio) {
        initAudioBtn.className = className.audioOff;
        setMyAudioStatus(useAudio);
    }

    setTippy(initAudioBtn, 'Stop the audio', 'top');
    setTippy(initVideoBtn, 'Stop the video', 'top');
}

/**
 * Check if UserName already exist in the room
 * @param {string} peer_name
 * @returns boolean
 */
async function checkUserName(peer_name = null) {
    return signalingSocket
        .request('data', {
            room_id: roomId,
            peer_id: myPeerId,
            peer_name: peer_name ? peer_name : myPeerName,
            method: 'checkPeerName',
            params: {},
        })
        .then((response) => response);
}

/**
 * Username already in the room
 */
function userNameAlreadyInRoom() {
    signalingSocket.disconnect();
    playSound('alert');
    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: swalBackground,
        imageUrl: forbiddenImg,
        position: 'center',
        title: 'Username',
        html: `The Username is already in use. <br/> Please try with another one`,
        showDenyButton: false,
        confirmButtonText: `OK`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        if (result.isConfirmed) {
            openURL('/');
        }
    });
}

/**
 * Load settings from Local Storage
 */
async function loadLocalStorage() {
    const localStorageDevices = lS.getLocalStorageDevices();
    console.log('12. Get Local Storage Devices before', localStorageDevices);
    if (localStorageDevices) {
        //
        initMicrophoneSelect.selectedIndex = localStorageDevices.audio.index;
        initSpeakerSelect.selectedIndex = localStorageDevices.speaker.index;
        initVideoSelect.selectedIndex = localStorageDevices.video.index;
        //
        audioInputSelect.selectedIndex = initMicrophoneSelect.selectedIndex;
        audioOutputSelect.selectedIndex = initSpeakerSelect.selectedIndex;
        videoSelect.selectedIndex = initVideoSelect.selectedIndex;
        //
        if (lS.DEVICES_COUNT.audio != localStorageDevices.audio.count) {
            console.log('12.1 Audio devices seems changed, use default index 0');
            initMicrophoneSelect.selectedIndex = 0;
            audioInputSelect.selectedIndex = 0;
            lS.setLocalStorageDevices(
                lS.MEDIA_TYPE.audio,
                initMicrophoneSelect.selectedIndex,
                initMicrophoneSelect.value,
            );
        }
        if (lS.DEVICES_COUNT.speaker != localStorageDevices.speaker.count) {
            console.log('12.2 Speaker devices seems changed, use default index 0');
            initSpeakerSelect.selectedIndex = 0;
            audioOutputSelect.selectedIndex = 0;
            lS.setLocalStorageDevices(
                lS.MEDIA_TYPE.speaker,
                initSpeakerSelect.selectedIndexIndex,
                initSpeakerSelect.value,
            );
        }
        if (lS.DEVICES_COUNT.video != localStorageDevices.video.count) {
            console.log('12.3 Video devices seems changed, use default index 0');
            initVideoSelect.selectedIndex = 0;
            videoSelect.selectedIndex = 0;
            lS.setLocalStorageDevices(lS.MEDIA_TYPE.video, initVideoSelect.selectedIndex, initVideoSelect.value);
        }
        //
        console.log('12.4 Get Local Storage Devices after', lS.getLocalStorageDevices());
    }
    // Start init cam
    if (useVideo && initVideoSelect.value) {
        myVideoChange = true;
        await refreshLocalMedia();
        await changeInitCamera(initVideoSelect.value);
    }
}

/**
 * Change init camera by device id
 * @param {string} deviceId
 */
async function changeInitCamera(deviceId) {
    if (initStream) {
        stopTracks(initStream);
        initVideo.style.display = 'block';
    }
    // Get video constraints
    let videoConstraints = await getVideoConstraints('default');
    videoConstraints['deviceId'] = { exact: deviceId };

    navigator.mediaDevices
        .getUserMedia({ video: videoConstraints })
        .then((camStream) => {
            initVideo.srcObject = camStream;
            initStream = camStream;
            console.log('Success attached init video stream', initStream.getVideoTracks()[0].getSettings());
        })
        .catch((err) => {
            console.error('[Error] changeInitCamera', err);
            userLog('error', 'Error while swapping init camera' + err, 'top-end');
        });
}

/**
 * Check peer audio and video &audio=1&video=1
 * 1/true = enabled / 0/false = disabled
 */
function checkPeerAudioVideo() {
    let qs = new URLSearchParams(window.location.search);
    let audio = filterXSS(qs.get('audio'));
    let video = filterXSS(qs.get('video'));
    if (audio) {
        audio = audio.toLowerCase();
        let queryPeerAudio = audio === '1' || audio === 'true';
        if (queryPeerAudio != null) handleAudio(audioBtn, false, queryPeerAudio);
        console.log('Direct join', { audio: queryPeerAudio });
    }
    if (video) {
        video = video.toLowerCase();
        let queryPeerVideo = video === '1' || video === 'true';
        if (queryPeerVideo != null) handleVideo(videoBtn, false, queryPeerVideo);
        console.log('Direct join', { video: queryPeerVideo });
    }
}

/**
 * Room and Peer name are ok Join Channel
 */
async function whoAreYouJoin() {
    if (isMobileDevice && myVideoStatus && myAudioStatus) await refreshLocalMedia();
    myVideoWrap.style.display = 'inline';
    myVideoParagraph.innerText = myPeerName + ' (me)';
    setPeerAvatarImgName('myVideoAvatarImage', myPeerName);
    setPeerChatAvatarImgName('right', myPeerName);
    joinToChannel();
    setTheme(mirotalkTheme);
}

/**
 * join to channel and send some peer info
 */
async function joinToChannel() {
    console.log('12. join to channel', roomId);
    sendToServer('join', {
        join_data_time: getDataTimeString(),
        channel: roomId,
        channel_password: thisRoomPassword,
        peer_info: peerInfo,
        peer_uuid: myPeerUUID,
        peer_name: myPeerName,
        peer_video: useVideo,
        peer_audio: useAudio,
        peer_video_status: myVideoStatus,
        peer_audio_status: myAudioStatus,
        peer_screen_status: myScreenStatus,
        peer_hand_status: myHandStatus,
        peer_rec_status: isRecScreenStream,
        peer_privacy_status: isVideoPrivacyActive,
        userAgent: userAgent,
    });
    handleBodyOnMouseMove(); // show/hide buttonsBar...
}

/**
 * When we join a group, our signaling server will send out 'addPeer' events to each pair of users in the group (creating a fully-connected graph of users,
 * ie if there are 6 people in the channel you will connect directly to the other 5, so there will be a total of 15 connections in the network).
 * @param {object} config data
 */
async function handleAddPeer(config) {
    //console.log("addPeer", JSON.stringify(config));

    const { peer_id, should_create_offer, iceServers, peers } = config;

    const peer_name = peers[peer_id]['peer_name'];
    const peer_video = peers[peer_id]['peer_video'];

    if (peer_id in peerConnections) {
        // This could happen if the user joins multiple channels where the other peer is also in.
        return console.log('Already connected to peer', peer_id);
    }

    console.log('iceServers', iceServers[0]);

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    peerConnection = new RTCPeerConnection({ iceServers: iceServers });
    peerConnections[peer_id] = peerConnection;

    allPeers = peers;

    console.log('[RTCPeerConnection] - PEER_ID', peer_id); // the connected peer_id
    console.log('[RTCPeerConnection] - PEER-CONNECTIONS', peerConnections); // all peers connections in the room expect myself
    console.log('[RTCPeerConnection] - PEERS', peers); // all peers in the room

    // As P2P check who I am connected with
    let connectedPeersName = [];
    for (let peer_id in peerConnections) {
        connectedPeersName.push({
            peer_name: peers[peer_id]['peer_name'],
        });
    }
    console.log('[RTCPeerConnection] - CONNECTED TO', JSON.stringify(connectedPeersName));
    // userLog('info', 'Connected to: ' + JSON.stringify(connectedPeersName));

    await handlePeersConnectionStatus(peer_id);
    await msgerAddPeers(peers);
    await handleOnIceCandidate(peer_id);
    await handleRTCDataChannels(peer_id);
    await handleOnTrack(peer_id, peers);
    await handleAddTracks(peer_id);

    if (useVideo && !peer_video && !needToCreateOffer) {
        needToCreateOffer = true;
    }
    if (should_create_offer) {
        await handleRtcOffer(peer_id);
        console.log('[RTCPeerConnection] - SHOULD CREATE OFFER', {
            peer_id: peer_id,
            peer_name: peer_name,
        });
    }

    await wbUpdate();
    playSound('addPeer');
}

/**
 * Handle peers connection state
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionstatechange_event
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionState
 * @param {string} peer_id socket.id
 */
async function handlePeersConnectionStatus(peer_id) {
    peerConnections[peer_id].onconnectionstatechange = function (event) {
        const connectionStatus = event.currentTarget.connectionState;
        const signalingState = event.currentTarget.signalingState;
        const peerName = allPeers[peer_id]['peer_name'];
        console.log('[RTCPeerConnection] - CONNECTION', {
            peer_id: peer_id,
            peer_name: peerName,
            connectionStatus: connectionStatus,
            signalingState: signalingState,
        });
    };
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onicecandidate
 * @param {string} peer_id socket.id
 */
async function handleOnIceCandidate(peer_id) {
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
 * @param {string} peer_id socket.id
 * @param {object} peers all peers info connected to the same room
 */
async function handleOnTrack(peer_id, peers) {
    console.log('[ON TRACK] - peer_id', { peer_id: peer_id });
    peerConnections[peer_id].ontrack = (event) => {
        const remoteVideoStream = getId(peer_id + '_video');
        const peer_name = peers[peer_id]['peer_name'];
        const kind = event.track.kind;
        //userLog('info', '[ON TRACK] - peer_name: ' + peer_name + ' kind: ' + kind);
        console.log('[ON TRACK] - info', { peer_id: peer_id, peer_name: peer_name, kind: kind, track: event.track });
        if (event.streams && event.streams[0]) {
            console.log('[ON TRACK] - peers', peers);
            remoteVideoStream
                ? attachMediaStream(remoteVideoStream, event.streams[0])
                : loadRemoteMediaStream(event.streams[0], peers, peer_id);
        } else {
            console.log('[ON TRACK] - SCREEN SHARING', { peer_id: peer_id, peer_name: peer_name, kind: kind });
            // attach newStream with screen share video and audio already existing
            const inboundStream = new MediaStream([event.track, remoteVideoStream.srcObject.getAudioTracks()[0]]);
            attachMediaStream(remoteVideoStream, inboundStream);
        }
    };
}

/**
 * Add my localMediaStream Tracks to connected peer
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
 * @param {string} peer_id socket.id
 */
async function handleAddTracks(peer_id) {
    const peer_name = allPeers[peer_id]['peer_name'];
    await localMediaStream.getTracks().forEach((track) => {
        console.log('[ADD TRACK] to Peer Name [' + peer_name + '] kind - ' + track.kind);
        peerConnections[peer_id].addTrack(track, localMediaStream);
    });
}

/**
 * Secure RTC Data Channel
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/ondatachannel
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/onmessage
 * @param {string} peer_id socket.id
 */
async function handleRTCDataChannels(peer_id) {
    peerConnections[peer_id].ondatachannel = (event) => {
        console.log('handleRTCDataChannels ' + peer_id, event);
        event.channel.onmessage = (msg) => {
            switch (event.channel.label) {
                case 'mirotalk_chat_channel':
                    try {
                        const dataMessage = JSON.parse(msg.data);
                        switch (dataMessage.type) {
                            case 'chat':
                                handleDataChannelChat(dataMessage);
                                break;
                            case 'speech':
                                handleDataChannelSpeechTranscript(dataMessage);
                                break;
                            case 'micVolume':
                                handlePeerVolume(dataMessage);
                                break;
                        }
                    } catch (err) {
                        console.error('mirotalk_chat_channel', err);
                    }
                    break;
                case 'mirotalk_file_sharing_channel':
                    try {
                        const dataFile = msg.data;
                        handleDataChannelFileSharing(dataFile);
                    } catch (err) {
                        console.error('mirotalk_file_sharing_channel', err);
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
 * @param {string} peer_id socket.id
 */
async function handleRtcOffer(peer_id) {
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onnegotiationneeded
    peerConnections[peer_id].onnegotiationneeded = () => {
        console.log('Creating RTC offer to ' + allPeers[peer_id]['peer_name']);
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
    };
}

/**
 * Peers exchange session descriptions which contains information about their audio / video settings and that sort of stuff. First
 * the 'offerer' sends a description to the 'answerer' (with type "offer"), then the answerer sends one back (with type "answer").
 * @param {object} config data
 */
function handleSessionDescription(config) {
    console.log('Remote Session Description', config);
    const { peer_id, session_description } = config;

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription
    const remote_description = new RTCSessionDescription(session_description);

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription
    peerConnections[peer_id]
        .setRemoteDescription(remote_description)
        .then(() => {
            console.log('setRemoteDescription done!');
            if (session_description.type == 'offer') {
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

                                // https://github.com/miroslavpejic85/mirotalk/issues/110
                                if (needToCreateOffer) {
                                    needToCreateOffer = false;
                                    handleRtcOffer(peer_id);
                                    console.log('[RTCSessionDescription] - NEED TO CREATE OFFER', {
                                        peer_id: peer_id,
                                    });
                                }
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
 * @param {object} config data
 */
function handleIceCandidate(config) {
    const { peer_id, ice_candidate } = config;
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate
    peerConnections[peer_id].addIceCandidate(new RTCIceCandidate(ice_candidate)).catch((err) => {
        console.error('[Error] addIceCandidate', err);
    });
}

/**
 * Disconnected from Signaling Server.
 * Tear down all of our peer connections and remove all the media divs.
 * @param {object} reason of disconnection
 */
function handleDisconnect(reason) {
    console.log('Disconnected from signaling server', { reason: reason });

    checkRecording();

    for (let peer_id in peerMediaElements) {
        peerMediaElements[peer_id].parentNode.removeChild(peerMediaElements[peer_id]);
        adaptAspectRatio();
    }
    for (let peer_id in peerConnections) {
        peerConnections[peer_id].close();
        msgerRemovePeer(peer_id);
        removeVideoPinMediaContainer(peer_id);
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
 * @param {object} config data
 */
function handleRemovePeer(config) {
    console.log('Signaling server said to remove peer:', config);

    checkRecording();

    const { peer_id } = config;

    if (peer_id in peerMediaElements) {
        peerMediaElements[peer_id].parentNode.removeChild(peerMediaElements[peer_id]);
        adaptAspectRatio();
    }
    if (peer_id in peerConnections) peerConnections[peer_id].close();

    msgerRemovePeer(peer_id);
    removeVideoPinMediaContainer(peer_id);

    delete chatDataChannels[peer_id];
    delete fileDataChannels[peer_id];
    delete peerConnections[peer_id];
    delete peerMediaElements[peer_id];
    delete allPeers[peer_id];

    isPresenter = !thereIsPeerConnections();
    if (isRulesActive && isPresenter) {
        console.log('I am alone in the room, got Presenter Rules');
        handleRules(isPresenter);
    }

    playSound('removePeer');

    console.log('ALL PEERS', allPeers);
}

/**
 * Set mirotalk theme | dark | grey | ...
 * @param {string} theme type
 */
function setTheme(theme) {
    if (!theme) return;

    mirotalkTheme = theme;
    switch (mirotalkTheme) {
        case 'dark':
            // dark theme
            swalBackground = 'radial-gradient(#393939, #000000)';
            document.documentElement.style.setProperty('--body-bg', 'radial-gradient(#393939, #000000)');
            document.documentElement.style.setProperty('--msger-bg', 'radial-gradient(#393939, #000000)');
            document.documentElement.style.setProperty('--msger-private-bg', 'radial-gradient(#393939, #000000)');
            document.documentElement.style.setProperty('--wb-bg', 'radial-gradient(#393939, #000000)');
            document.documentElement.style.setProperty('--box-shadow', '0px 8px 16px 0px rgba(0, 0, 0, 0.2)');
            document.documentElement.style.setProperty('--left-msg-bg', '#252d31');
            document.documentElement.style.setProperty('--right-msg-bg', '#056162');
            document.documentElement.style.setProperty('--private-msg-bg', '#6b1226');
            document.body.style.background = 'radial-gradient(#393939, #000000)';
            break;
        case 'grey':
            // grey theme
            swalBackground = 'radial-gradient(#666, #333)';
            document.documentElement.style.setProperty('--body-bg', 'radial-gradient(#666, #333)');
            document.documentElement.style.setProperty('--msger-bg', 'radial-gradient(#666, #333)');
            document.documentElement.style.setProperty('--wb-bg', 'radial-gradient(#797979, #000)');
            document.documentElement.style.setProperty('--box-shadow', '0px 8px 16px 0px rgba(0, 0, 0, 0.2)');
            document.documentElement.style.setProperty('--msger-private-bg', 'radial-gradient(#666, #333)');
            document.documentElement.style.setProperty('--left-msg-bg', '#252d31');
            document.documentElement.style.setProperty('--right-msg-bg', '#056162');
            document.documentElement.style.setProperty('--private-msg-bg', '#6b1226');
            document.body.style.background = 'radial-gradient(#666, #333)';
            break;
        // ...
        default:
            console.log('No theme found');
    }

    setButtonsBarPosition(mirotalkBtnsBar);
}

/**
 * Set buttons bar position
 * @param {string} position vertical / horizontal
 */
function setButtonsBarPosition(position) {
    if (!position || isMobileDevice) return;

    mirotalkBtnsBar = position;
    switch (mirotalkBtnsBar) {
        case 'vertical':
            document.documentElement.style.setProperty('--btns-top', '50%');
            document.documentElement.style.setProperty('--btns-right', '0px');
            document.documentElement.style.setProperty('--btns-left', '15px');
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
 * Init to enumerate the devices
 */
async function initEnumerateDevices() {
    console.log('05. init Enumerate Devices');
    await initEnumerateVideoDevices();
    await initEnumerateAudioDevices();
    if (!useAudio && !useVideo) {
        initEnumerateDevicesFailed = true;
        playSound('alert');
        await Swal.fire({
            allowOutsideClick: false,
            allowEscapeKey: false,
            background: '#000000',
            position: 'center',
            imageUrl: camMicOff,
            title: 'Camera and microphone not allowed',
            text: "Meet needs access to the camera and microphone. Click the locked camera and microphone icon in your browser's address bar, before to join room.",
            showDenyButton: false,
            confirmButtonText: `OK`,
            showClass: {
                popup: 'animate__animated animate__fadeInDown',
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp',
            },
        }).then((result) => {
            if (result.isConfirmed) {
                openURL('/'); // back to homepage
            }
        });
    }
}

/**
 * Init to enumerate the audio devices
 * @returns boolean true/false
 */
async function initEnumerateAudioDevices() {
    if (isEnumerateAudioDevices) return;
    // allow the audio
    await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
            enumerateAudioDevices(stream);
            useAudio = true;
        })
        .catch(() => {
            useAudio = false;
        });
}

/**
 * Init to enumerate the vide devices
 * @returns boolean true/false
 */
async function initEnumerateVideoDevices() {
    if (isEnumerateVideoDevices) return;
    // allow the video
    await navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
            enumerateVideoDevices(stream);
            useVideo = true;
        })
        .catch(() => {
            useVideo = false;
        });
}

/**
 * Enumerate Audio
 * @param {object} stream
 */
function enumerateAudioDevices(stream) {
    console.log('06. Get Audio Devices');
    navigator.mediaDevices
        .enumerateDevices()
        .then((devices) =>
            devices.forEach((device) => {
                let el,
                    eli = null;
                if ('audioinput' === device.kind) {
                    el = getId('audioSource');
                    eli = getId('initMicrophoneSelect');
                } else if ('audiooutput' === device.kind) {
                    el = getId('audioOutput');
                    eli = getId('initSpeakerSelect');
                }
                if (!el) return;
                addChild(device, [el, eli]);
            }),
        )
        .then(() => {
            stopTracks(stream);
            isEnumerateAudioDevices = true;
            const sinkId = 'sinkId' in HTMLMediaElement.prototype;
            getId('audioOutput').disabled = !sinkId;
            if (!sinkId) getId('initSpeakerSelect').display = 'none';
        });
}

/**
 * Enumerate Video
 * @param {object} stream
 */
function enumerateVideoDevices(stream) {
    console.log('07. Get Video Devices');
    navigator.mediaDevices
        .enumerateDevices()
        .then((devices) =>
            devices.forEach((device) => {
                let el,
                    eli = null;
                if ('videoinput' === device.kind) {
                    el = getId('videoSource');
                    eli = getId('initVideoSelect');
                }
                if (!el) return;
                addChild(device, [el, eli]);
            }),
        )
        .then(() => {
            stopTracks(stream);
            isEnumerateVideoDevices = true;
        });
}

/**
 * Stop tracks from stream
 * @param {object} stream
 */
function stopTracks(stream) {
    stream.getTracks().forEach((track) => {
        track.stop();
    });
}

/**
 * Add child to element
 * @param {object} device
 * @param {object} els
 */
function addChild(device, els) {
    const { kind, deviceId, label } = device;
    els.forEach((el) => {
        const option = document.createElement('option');
        option.value = deviceId;
        switch (kind) {
            case 'videoinput':
                option.innerText = `📹 ` + label || `📹 camera ${el.length + 1}`;
                break;
            case 'audioinput':
                option.innerText = `🎤 ` + label || `🎤 microphone ${el.length + 1}`;
                break;
            case 'audiooutput':
                option.innerText = `🔈 ` + label || `🔈 speaker ${el.length + 1}`;
                break;
            default:
                break;
        }
        el.appendChild(option);
    });
    selectors = [getId('audioSource'), getId('audioOutput'), getId('videoSource')];
}

/**
 * Setup local media stuff. Ask user for permission to use the computers microphone and/or camera,
 * attach it to an <audio> or <video> tag if they give us access.
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
 */
async function setupLocalMedia() {
    // if we've already been initialized do nothing or there is error on initEnumerateDevicesFailed
    if (localMediaStream != null || initEnumerateDevicesFailed) {
        return;
    }

    console.log('08. Requesting access to local audio - video inputs');
    console.log('09. Supported constraints', navigator.mediaDevices.getSupportedConstraints());

    // default | qvgaVideo | vgaVideo | hdVideo | fhdVideo | 2kVideo | 4kVideo |
    const videoConstraints = useVideo ? await getVideoConstraints('default') : false;
    const audioConstraints = useAudio ? await getAudioConstraints() : false;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: videoConstraints,
        });
        if (stream) {
            await loadLocalMedia(stream);
            if (useAudio) {
                await startPitchDetection(stream);
            }
        }
    } catch (err) {
        console.error('[Error] - Access denied for audio - video device', err);
        playSound('alert');
        openURL(
            `/permission?roomId=${roomId}&getUserMediaError=${err.toString()} <br/> Check the common getusermedia errors <a href="https://blog.addpipe.com/common-getusermedia-errors" target="_blank">here<a/>`,
        );
    }
} // end [setup_local_stream]

/**
 * Load Local Media Stream obj
 * @param {object} stream media stream audio - video
 */
async function loadLocalMedia(stream) {
    console.log('10. Access granted to audio - video device');

    localMediaStream = stream;

    console.log('LOAD LOCAL MEDIA STREAM TRACKS', localMediaStream.getTracks());

    // local video elemets
    const myVideoWrap = document.createElement('div');
    const myLocalMedia = document.createElement('video');

    // html elements
    const myVideoNavBar = document.createElement('div');
    const myCountTime = document.createElement('button');
    const myPeerName = document.createElement('p');
    const myHandStatusIcon = document.createElement('button');
    const myVideoToImgBtn = document.createElement('button');
    const myPrivacyBtn = document.createElement('button');
    const myVideoStatusIcon = document.createElement('button');
    const myAudioStatusIcon = document.createElement('button');
    const myVideoFullScreenBtn = document.createElement('button');
    const myVideoPinBtn = document.createElement('button');
    const myVideoZoomInBtn = document.createElement('button');
    const myVideoZoomOutBtn = document.createElement('button');
    const myVideoAvatarImage = document.createElement('img');
    const myPitchMeter = document.createElement('div');
    const myPitchBar = document.createElement('div');

    // session time
    myCountTime.setAttribute('id', 'countTime');

    // my peer name
    myPeerName.setAttribute('id', 'myVideoParagraph');
    myPeerName.className = 'videoPeerName';

    // my hand status element
    myHandStatusIcon.setAttribute('id', 'myHandStatusIcon');
    myHandStatusIcon.className = className.handPulsate;
    myHandStatusIcon.style.setProperty('color', 'rgb(0, 255, 0)');

    // my privacy button
    myPrivacyBtn.setAttribute('id', 'myPrivacyBtn');
    myPrivacyBtn.className = className.privacy;

    // my video status element
    myVideoStatusIcon.setAttribute('id', 'myVideoStatusIcon');
    myVideoStatusIcon.className = className.videoOn;

    // my audio status element
    myAudioStatusIcon.setAttribute('id', 'myAudioStatusIcon');
    myAudioStatusIcon.className = className.audioOn;

    // my video to image
    myVideoToImgBtn.setAttribute('id', 'myVideoToImgBtn');
    myVideoToImgBtn.className = className.snapShot;

    // my video full screen mode
    myVideoFullScreenBtn.setAttribute('id', 'myVideoFullScreenBtn');
    myVideoFullScreenBtn.className = className.fullScreen;

    // my video zoomIn/Out
    myVideoZoomInBtn.setAttribute('id', 'myVideoZoomInBtn');
    myVideoZoomInBtn.className = className.zoomIn;
    myVideoZoomOutBtn.setAttribute('id', 'myVideoZoomOutBtn');
    myVideoZoomOutBtn.className = className.zoomOut;

    // my video pin/unpin button
    myVideoPinBtn.setAttribute('id', 'myVideoPinBtn');
    myVideoPinBtn.className = className.pinUnpin;

    // no mobile devices
    setTippy(myCountTime, 'Session Time', 'bottom');
    setTippy(myPeerName, 'My name', 'bottom');
    setTippy(myHandStatusIcon, 'My hand is raised', 'bottom');
    setTippy(myPrivacyBtn, 'Toggle video privacy', 'bottom');
    setTippy(myVideoStatusIcon, 'My video is on', 'bottom');
    setTippy(myAudioStatusIcon, 'My audio is on', 'bottom');
    setTippy(myVideoToImgBtn, 'Take a snapshot', 'bottom');
    setTippy(myVideoFullScreenBtn, 'Full screen mode', 'bottom');
    setTippy(myVideoZoomInBtn, 'Zoom in video', 'bottom');
    setTippy(myVideoZoomOutBtn, 'Zoom out video', 'bottom');
    setTippy(myVideoPinBtn, 'Toggle Pin video', 'bottom');

    // my video avatar image
    myVideoAvatarImage.setAttribute('id', 'myVideoAvatarImage');
    myVideoAvatarImage.className = 'videoAvatarImage'; // pulsate

    // my pitch meter
    myPitchMeter.setAttribute('id', 'myPitch');
    myPitchBar.setAttribute('id', 'myPitchBar');
    myPitchMeter.className = 'speechbar';
    myPitchBar.className = 'bar';
    myPitchBar.style.height = '1%';

    // my video nav bar
    myVideoNavBar.className = 'navbar fadein';

    // attach to video nav bar
    myVideoNavBar.appendChild(myCountTime);

    if (!isMobileDevice) {
        myVideoNavBar.appendChild(myVideoPinBtn);
    }

    if (buttons.local.showZoomInOutBtn) {
        myVideoNavBar.appendChild(myVideoZoomInBtn);
        myVideoNavBar.appendChild(myVideoZoomOutBtn);
    }

    if (isVideoFullScreenSupported) {
        myVideoNavBar.appendChild(myVideoFullScreenBtn);
    }
    if (buttons.local.showSnapShotBtn) {
        myVideoNavBar.appendChild(myVideoToImgBtn);
    }
    if (buttons.local.showVideoCircleBtn) {
        myVideoNavBar.appendChild(myPrivacyBtn);
    }

    myVideoNavBar.appendChild(myVideoStatusIcon);
    myVideoNavBar.appendChild(myAudioStatusIcon);
    myVideoNavBar.appendChild(myHandStatusIcon);

    // add my pitchBar
    myPitchMeter.appendChild(myPitchBar);

    // hand display none on default menad is raised == false
    myHandStatusIcon.style.display = 'none';

    myLocalMedia.setAttribute('id', 'myVideo');
    myLocalMedia.setAttribute('playsinline', true);
    myLocalMedia.className = 'mirror';
    myLocalMedia.autoplay = true;
    myLocalMedia.muted = true;
    myLocalMedia.volume = 0;
    myLocalMedia.controls = false;

    myVideoWrap.className = 'Camera';
    myVideoWrap.setAttribute('id', 'myVideoWrap');

    // add elements to video wrap div
    myVideoWrap.appendChild(myVideoNavBar);
    myVideoWrap.appendChild(myVideoAvatarImage);
    myVideoWrap.appendChild(myLocalMedia);
    myVideoWrap.appendChild(myPitchMeter);
    myVideoWrap.appendChild(myPeerName);

    getId('videoMediaContainer').appendChild(myVideoWrap);
    myVideoWrap.style.display = 'none';

    logStreamSettingsInfo('localMediaStream', localMediaStream);
    attachMediaStream(myLocalMedia, localMediaStream);
    adaptAspectRatio();

    getHtmlElementsById();
    setButtonsToolTip();
    manageLeftButtons();
    handleButtonsRule();
    setupMySettings();
    setupVideoUrlPlayer();
    startCountTime();

    if (isVideoFullScreenSupported) {
        handleVideoPlayerFs(myLocalMedia.id, myVideoFullScreenBtn.id);
    }

    handleFileDragAndDrop(myLocalMedia.id, myPeerId, true);

    if (buttons.local.showSnapShotBtn) {
        handleVideoToImg(myLocalMedia.id, myVideoToImgBtn.id);
    }
    if (buttons.local.showVideoCircleBtn) {
        handleVideoPrivacyBtn(myLocalMedia.id, myPrivacyBtn.id);
    }

    handleVideoPinUnpin(myLocalMedia.id, myVideoPinBtn.id, myVideoWrap.id, myLocalMedia.id);

    if (buttons.local.showZoomInOutBtn) {
        handleVideoZoomInOut(myVideoZoomInBtn.id, myVideoZoomOutBtn.id, myLocalMedia.id);
    }

    refreshMyVideoAudioStatus(localMediaStream);

    if (!useVideo) {
        myVideoAvatarImage.style.display = 'block';
        myVideoStatusIcon.className = className.videoOff;
        videoBtn.className = className.videoOff;
    }
}

/**
 * Check if screen is shared on join room
 */
function checkShareScreen() {
    if (!isMobileDevice && isScreenEnabled && isScreenSharingSupported) {
        playSound('newMessage');
        // screenShareBtn.click(); // Chrome - Opera - Edge - Brave
        // handle error: getDisplayMedia requires transient activation from a user gesture on Safari - FireFox
        Swal.fire({
            background: swalBackground,
            position: 'center',
            icon: 'question',
            text: 'Do you want to share your screen?',
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
                screenShareBtn.click();
            }
        });
    }
}

/**
 * Load Remote Media Stream obj
 * @param {object} stream media stream audio - video
 * @param {object} peers all peers info connected to the same room
 * @param {string} peer_id socket.id
 */
async function loadRemoteMediaStream(stream, peers, peer_id) {
    // get data from peers obj
    const peer_name = peers[peer_id]['peer_name'];
    const peer_video = peers[peer_id]['peer_video'];
    const peer_video_status = peers[peer_id]['peer_video_status'];
    const peer_audio_status = peers[peer_id]['peer_audio_status'];
    const peer_screen_status = peers[peer_id]['peer_screen_status'];
    const peer_hand_status = peers[peer_id]['peer_hand_status'];
    const peer_rec_status = peers[peer_id]['peer_rec_status'];
    const peer_privacy_status = peers[peer_id]['peer_privacy_status'];

    remoteMediaStream = stream;

    console.log('LOAD REMOTE MEDIA STREAM TRACKS - PeerName:[' + peer_name + ']', remoteMediaStream.getTracks());

    // remote video elements
    const remoteVideoWrap = document.createElement('div');
    const remoteMedia = document.createElement('video');

    // html elements
    const remoteVideoNavBar = document.createElement('div');
    const remotePeerName = document.createElement('p');
    const remoteHandStatusIcon = document.createElement('button');
    const remoteVideoStatusIcon = document.createElement('button');
    const remoteAudioStatusIcon = document.createElement('button');
    const remoteVideoAudioUrlBtn = document.createElement('button');
    const remoteFileShareBtn = document.createElement('button');
    const remotePrivateMsgBtn = document.createElement('button');
    const remotePeerKickOut = document.createElement('button');
    const remoteVideoToImgBtn = document.createElement('button');
    const remoteVideoFullScreenBtn = document.createElement('button');
    const remoteVideoPinBtn = document.createElement('button');
    const remoteVideoZoomInBtn = document.createElement('button');
    const remoteVideoZoomOutBtn = document.createElement('button');
    const remoteVideoAvatarImage = document.createElement('img');
    const remotePitchMeter = document.createElement('div');
    const remotePitchBar = document.createElement('div');
    const remoteAudioVolume = document.createElement('input');

    // remote peer name element
    remotePeerName.setAttribute('id', peer_id + '_name');
    remotePeerName.className = 'videoPeerName';

    const peerVideoText = document.createTextNode(peer_name);
    remotePeerName.appendChild(peerVideoText);

    // remote hand status element
    remoteHandStatusIcon.setAttribute('id', peer_id + '_handStatus');
    remoteHandStatusIcon.style.setProperty('color', 'rgb(0, 255, 0)');
    remoteHandStatusIcon.className = className.handPulsate;

    // remote video status element
    remoteVideoStatusIcon.setAttribute('id', peer_id + '_videoStatus');
    remoteVideoStatusIcon.className = className.videoOn;

    // remote audio status element
    remoteAudioStatusIcon.setAttribute('id', peer_id + '_audioStatus');
    remoteAudioStatusIcon.className = className.audioOn;

    // remote audio volume element
    remoteAudioVolume.setAttribute('id', peer_id + '_audioVolume');
    remoteAudioVolume.type = 'range';
    remoteAudioVolume.min = 0;
    remoteAudioVolume.max = 100;
    remoteAudioVolume.value = 100;

    // remote private message
    remotePrivateMsgBtn.setAttribute('id', peer_id + '_privateMsg');
    remotePrivateMsgBtn.className = className.msgPrivate;

    // remote share file
    remoteFileShareBtn.setAttribute('id', peer_id + '_shareFile');
    remoteFileShareBtn.className = className.shareFile;

    // remote peer YouTube video
    remoteVideoAudioUrlBtn.setAttribute('id', peer_id + '_videoAudioUrl');
    remoteVideoAudioUrlBtn.className = className.shareVideoAudio;

    // my video to image
    remoteVideoToImgBtn.setAttribute('id', peer_id + '_snapshot');
    remoteVideoToImgBtn.className = className.snapShot;

    // remote peer kick out
    remotePeerKickOut.setAttribute('id', peer_id + '_kickOut');
    remotePeerKickOut.className = className.kickOut;

    // remote video zoomIn/Out
    remoteVideoZoomInBtn.setAttribute('id', peer_id + 'videoZoomIn');
    remoteVideoZoomInBtn.className = className.zoomIn;
    remoteVideoZoomOutBtn.setAttribute('id', peer_id + 'videoZoomOut');
    remoteVideoZoomOutBtn.className = className.zoomOut;

    // remote video full screen mode
    remoteVideoFullScreenBtn.setAttribute('id', peer_id + '_fullScreen');
    remoteVideoFullScreenBtn.className = className.fullScreen;

    // remote video pin/unpin button
    remoteVideoPinBtn.setAttribute('id', peer_id + '_pinUnpin');
    remoteVideoPinBtn.className = className.pinUnpin;

    // no mobile devices
    setTippy(remotePeerName, 'Participant name', 'bottom');
    setTippy(remoteHandStatusIcon, 'Participant hand is raised', 'bottom');
    setTippy(remoteVideoStatusIcon, 'Participant video is on', 'bottom');
    setTippy(remoteAudioStatusIcon, 'Participant audio is on', 'bottom');
    setTippy(remoteAudioVolume, '🔊 Volume', 'top-end');
    setTippy(remoteVideoAudioUrlBtn, 'Send Video or Audio', 'bottom');
    setTippy(remotePrivateMsgBtn, 'Send private message', 'bottom');
    setTippy(remoteFileShareBtn, 'Send file', 'bottom');
    setTippy(remoteVideoToImgBtn, 'Take a snapshot', 'bottom');
    setTippy(remotePeerKickOut, 'Kick out', 'bottom');
    setTippy(remoteVideoFullScreenBtn, 'Full screen mode', 'bottom');
    setTippy(remoteVideoZoomInBtn, 'Zoom in video', 'bottom');
    setTippy(remoteVideoZoomOutBtn, 'Zoom out video', 'bottom');
    setTippy(remoteVideoPinBtn, 'Toggle Pin video', 'bottom');

    // my video avatar image
    remoteVideoAvatarImage.setAttribute('id', peer_id + '_avatar');
    remoteVideoAvatarImage.className = 'videoAvatarImage'; // pulsate

    // remote pitch meter
    remotePitchMeter.setAttribute('id', peer_id + '_pitch');
    remotePitchBar.setAttribute('id', peer_id + '_pitch_bar');
    remotePitchMeter.className = 'speechbar';
    remotePitchBar.className = 'bar';
    remotePitchBar.style.height = '1%';

    remotePitchMeter.appendChild(remotePitchBar);

    // remote video nav bar
    remoteVideoNavBar.className = 'navbar fadein';

    // attach to remote video nav bar
    if (!isMobileDevice) {
        remoteVideoNavBar.appendChild(remoteVideoPinBtn);
    }

    if (buttons.remote.showZoomInOutBtn) {
        remoteVideoNavBar.appendChild(remoteVideoZoomInBtn);
        remoteVideoNavBar.appendChild(remoteVideoZoomOutBtn);
    }

    if (isVideoFullScreenSupported) {
        remoteVideoNavBar.appendChild(remoteVideoFullScreenBtn);
    }
    if (buttons.remote.showSnapShotBtn) {
        remoteVideoNavBar.appendChild(remoteVideoToImgBtn);
    }

    if (buttons.remote.showZoomInOutBtn) {
        remoteVideoNavBar.appendChild(remoteVideoStatusIcon);
        remoteVideoNavBar.appendChild(remoteAudioStatusIcon);
    }

    if (buttons.remote.showAudioVolume) {
        remoteVideoNavBar.appendChild(remoteAudioVolume);
    }
    remoteVideoNavBar.appendChild(remoteHandStatusIcon);

    if (buttons.remote.showPrivateMessageBtn) {
        remoteVideoNavBar.appendChild(remotePrivateMsgBtn);
    }
    if (buttons.remote.showFileShareBtn) {
        remoteVideoNavBar.appendChild(remoteFileShareBtn);
    }
    if (buttons.remote.showShareVideoAudioBtn) {
        remoteVideoNavBar.appendChild(remoteVideoAudioUrlBtn);
    }
    if (buttons.remote.showKickOutBtn) {
        remoteVideoNavBar.appendChild(remotePeerKickOut);
    }

    remoteMedia.setAttribute('id', peer_id + '_video');
    remoteMedia.setAttribute('playsinline', true);
    remoteMedia.autoplay = true;
    isMobileDevice ? (remoteMediaControls = false) : (remoteMediaControls = remoteMediaControls);
    remoteMedia.style.objectFit = peer_screen_status ? 'contain' : 'var(--video-object-fit)';
    remoteMedia.style.name = peer_id + (peer_screen_status ? '_typeScreen' : '_typeCam');
    remoteMedia.controls = remoteMediaControls;

    remoteVideoWrap.className = 'Camera';
    remoteVideoWrap.setAttribute('id', peer_id + '_videoWrap');

    // add elements to videoWrap div
    remoteVideoWrap.appendChild(remoteVideoNavBar);
    remoteVideoWrap.appendChild(remoteVideoAvatarImage);
    remoteVideoWrap.appendChild(remotePitchMeter);
    remoteVideoWrap.appendChild(remoteMedia);
    remoteVideoWrap.appendChild(remotePeerName);

    // need later on disconnect or remove peers
    peerMediaElements[peer_id] = remoteVideoWrap;

    // append all elements to videoMediaContainer
    getId('videoMediaContainer').appendChild(remoteVideoWrap);
    // attachMediaStream is a part of the adapter.js library
    attachMediaStream(remoteMedia, remoteMediaStream);
    // resize video elements
    adaptAspectRatio();

    if (buttons.remote.showSnapShotBtn) {
        // handle video to image
        handleVideoToImg(remoteMedia.id, remoteVideoToImgBtn.id, peer_id);
    }

    // handle video pin/unpin
    handleVideoPinUnpin(remoteMedia.id, remoteVideoPinBtn.id, remoteVideoWrap.id, peer_id, peer_screen_status);

    if (buttons.remote.showZoomInOutBtn) {
        // handle video zoomIn/Out
        handleVideoZoomInOut(remoteVideoZoomInBtn.id, remoteVideoZoomOutBtn.id, remoteMedia.id, peer_id);
    }

    // pin video on screen share detected
    if (peer_video_status && peer_screen_status) {
        getId(remoteVideoPinBtn.id).click();
    }

    if (isVideoFullScreenSupported) {
        // handle video full screen mode
        handleVideoPlayerFs(remoteMedia.id, remoteVideoFullScreenBtn.id, peer_id);
    }

    // handle file share drag and drop
    handleFileDragAndDrop(remoteMedia.id, peer_id);

    if (buttons.remote.showKickOutBtn) {
        // handle kick out button event
        handlePeerKickOutBtn(peer_id);
    }

    if (peer_privacy_status) {
        // set video privacy true
        setVideoPrivacyStatus(remoteMedia.id, peer_privacy_status);
    }

    // refresh remote peers avatar name
    setPeerAvatarImgName(remoteVideoAvatarImage.id, peer_name);
    // refresh remote peers hand icon status and title
    setPeerHandStatus(peer_id, peer_name, peer_hand_status);
    // refresh remote peers video icon status and title
    setPeerVideoStatus(peer_id, peer_video_status);
    // refresh remote peers audio icon status and title
    setPeerAudioStatus(peer_id, peer_audio_status);
    // handle remote peers audio volume
    handleAudioVolume(remoteAudioVolume.id, remoteMedia.id);
    // handle remote peers audio on-off
    handlePeerAudioBtn(peer_id);
    // handle remote peers video on-off
    handlePeerVideoBtn(peer_id);

    if (buttons.remote.showPrivateMessageBtn) {
        // handle remote private messages
        handlePeerPrivateMsg(peer_id, peer_name);
    }
    if (buttons.remote.showFileShareBtn) {
        // handle remote send file
        handlePeerSendFile(peer_id);
    }
    if (buttons.remote.showShareVideoAudioBtn) {
        // handle remote video - audio URL
        handlePeerVideoAudioUrl(peer_id);
    }

    // show status menu
    toggleClassElements('statusMenu', 'inline');
    // notify if peer started to recording own screen + audio
    if (peer_rec_status) notifyRecording(peer_name, 'Started');

    // peer not has video at all
    if (!peer_video) {
        remoteVideoAvatarImage.style.display = 'block';
        remoteVideoStatusIcon.className = className.videoOff;
    }
}

/**
 * Log stream settings info
 * @param {string} name function name called from
 * @param {object} stream media stream audio - video
 */
function logStreamSettingsInfo(name, stream) {
    if (useVideo || isScreenStreaming) {
        console.log(name, {
            video: {
                label: stream.getVideoTracks()[0].label,
                settings: stream.getVideoTracks()[0].getSettings(),
            },
        });
    }
    if (useAudio) {
        console.log(name, {
            audio: {
                label: stream.getAudioTracks()[0].label,
                settings: stream.getAudioTracks()[0].getSettings(),
            },
        });
    }
}

/**
 * Handle aspect ratio
 * ['0:0', '4:3', '16:9', '1:1', '1:2'];
 *    0      1       2      3      4
 */
function adaptAspectRatio() {
    let participantsCount = getId('videoMediaContainer').childElementCount;
    let desktop,
        mobile = 1;
    // desktop aspect ratio
    switch (participantsCount) {
        // case 1:
        //     desktop = 0; // (0:0)
        //     break;
        case 1:
        case 3:
        case 4:
        case 7:
        case 9:
            desktop = 2; // (16:9)
            break;
        case 5:
        case 6:
        case 10:
        case 11:
            desktop = 1; // (4:3)
            break;
        case 2:
        case 8:
            desktop = 3; // (1:1)
            break;
        default:
            desktop = 0; // (0:0)
    }
    // mobile aspect ratio
    switch (participantsCount) {
        case 3:
        case 9:
        case 10:
            mobile = 2; // (16:9)
            break;
        case 2:
        case 7:
        case 8:
        case 11:
            mobile = 1; // (4:3)
            break;
        case 1:
        case 4:
        case 5:
        case 6:
            mobile = 3; // (1:1)
            break;
        default:
            mobile = 3; // (1:1)
    }
    if (participantsCount > 11) {
        desktop = 1; // (4:3)
        mobile = 3; // (1:1)
    }
    setAspectRatio(isMobileDevice ? mobile : desktop);
}

/**
 * Create round svg image with first 2 letters of peerName in center
 * Thank you: https://github.com/phpony
 *
 * @param {string} peerName
 * @param {integer} avatarImgSize width and height in px
 */
function genAvatarSvg(peerName, avatarImgSize) {
    const charCodeRed = peerName.charCodeAt(0);
    const charCodeGreen = peerName.charCodeAt(1) || charCodeRed;
    const red = Math.pow(charCodeRed, 7) % 200;
    const green = Math.pow(charCodeGreen, 7) % 200;
    const blue = (red + green) % 200;
    let bgColor = `rgb(${red}, ${green}, ${blue})`;
    let textColor = '#ffffff';
    let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" 
    xmlns:xlink="http://www.w3.org/1999/xlink" 
    width="${avatarImgSize}px" 
    height="${avatarImgSize}px" 
    viewBox="0 0 ${avatarImgSize} ${avatarImgSize}" 
    version="1.1">
        <circle 
            fill="${bgColor}" 
            width="${avatarImgSize}" 
            height="${avatarImgSize}" 
            cx="${avatarImgSize / 2}" 
            cy="${avatarImgSize / 2}" 
            r="${avatarImgSize / 2}"/>
        <text 
            x="50%" 
            y="50%" 
            style="color:${textColor};
            line-height:1;
            font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Fira Sans, Droid Sans, Helvetica Neue, sans-serif" 
            alignment-baseline="middle" 
            text-anchor="middle" 
            font-size="${Math.round(avatarImgSize * 0.4)}" 
            font-weight="normal" 
            dy=".1em" 
            dominant-baseline="middle" 
            fill="${textColor}">${peerName.substring(0, 2).toUpperCase()}
        </text>
    </svg>`;
    return 'data:image/svg+xml,' + svg.replace(/#/g, '%23').replace(/"/g, "'").replace(/&/g, '&amp;');
}

/**
 * Refresh video - chat image avatar on name changes: https://eu.ui-avatars.com/
 * @param {string} videoAvatarImageId element id
 * @param {string} peerName
 */
function setPeerAvatarImgName(videoAvatarImageId, peerName) {
    const videoAvatarImageElement = getId(videoAvatarImageId);
    if (useAvatarSvg) {
        const avatarImgSize = isMobileDevice ? 128 : 256;
        const avatarImgSvg = genAvatarSvg(peerName, avatarImgSize);
        videoAvatarImageElement.setAttribute('src', avatarImgSvg);
    } else {
        videoAvatarImageElement.setAttribute('src', avatarImg);
    }
}

/**
 * Set Chat avatar image by peer name
 * @param {string} avatar position left/right
 * @param {string} peerName me or peer name
 */
function setPeerChatAvatarImgName(avatar, peerName) {
    const avatarImg = genAvatarSvg(peerName, 32);

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
 * @param {string} videoId uuid video element
 * @param {string} videoFullScreenBtnId uuid full screen btn
 * @param {string} peer_id socket.id
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
        if (videoPlayer.classList.contains('videoCircle')) {
            return userLog('toast', 'Full Screen not allowed if video on privacy mode');
        }
        gotoFS();
    });

    // on video click go on FS
    videoPlayer.addEventListener('click', (e) => {
        if (videoPlayer.classList.contains('videoCircle')) {
            return userLog('toast', 'Full Screen not allowed if video on privacy mode');
        }
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
            if (remoteVideoStatusBtn.className === className.videoOn) {
                handleFSVideo();
            } else {
                showMsg();
            }
        } else {
            // handle local video fs
            if (myVideoStatusIcon.className === className.videoOn || isScreenStreaming) {
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
 * Handle file drag and drop on video element
 * @param {string} elemId element id
 * @param {string} peer_id peer id
 * @param {boolean} itsMe true/false
 */
function handleFileDragAndDrop(elemId, peer_id, itsMe = false) {
    let videoPeer = getId(elemId);

    videoPeer.addEventListener('dragover', function (e) {
        e.preventDefault();
    });

    videoPeer.addEventListener('drop', function (e) {
        e.preventDefault();
        if (itsMe) {
            return userLog('warning', 'You cannot send files to yourself.');
        }
        if (sendInProgress) {
            return userLog('warning', 'Please wait for the previous file to be sent.');
        }
        if (e.dataTransfer.items && e.dataTransfer.items.length > 1) {
            return userLog('warning', 'Please drag and drop a single file.');
        }
        // Use DataTransferItemList interface to access the file(s)
        if (e.dataTransfer.items) {
            // If dropped items aren't files, reject them
            let item = e.dataTransfer.items[0].webkitGetAsEntry();
            console.log('Drag and drop', item);
            if (item.isDirectory) {
                return userLog('warning', 'Please drag and drop a single file not a folder.', 'top-end');
            }
            let file = e.dataTransfer.items[0].getAsFile();
            sendFileInformations(file, peer_id);
        } else {
            // Use DataTransfer interface to access the file(s)
            sendFileInformations(e.dataTransfer.files[0], peer_id);
        }
    });
}

/**
 * Handle video privacy button click event
 * @param {string} videoId
 * @param {boolean} privacyBtnId
 */
function handleVideoPrivacyBtn(videoId, privacyBtnId) {
    let video = getId(videoId);
    let privacyBtn = getId(privacyBtnId);
    if (useVideo && video && privacyBtn) {
        privacyBtn.addEventListener('click', () => {
            playSound('click');
            isVideoPrivacyActive = !isVideoPrivacyActive;
            setVideoPrivacyStatus(videoId, isVideoPrivacyActive);
            emitPeerStatus('privacy', isVideoPrivacyActive);
        });
    } else {
        if (privacyBtn) privacyBtn.style.display = 'none';
    }
}

/**
 * Set video privacy status
 * @param {string} peerVideoId
 * @param {boolean} peerPrivacyActive
 */
function setVideoPrivacyStatus(peerVideoId, peerPrivacyActive) {
    let video = getId(peerVideoId);
    if (peerPrivacyActive) {
        video.classList.remove('videoDefault');
        video.classList.add('videoCircle');
        video.style.objectFit = 'cover';
    } else {
        video.classList.remove('videoCircle');
        video.classList.add('videoDefault');
        video.style.objectFit = 'var(--video-object-fit)';
    }
}

/**
 * Handle video pin/unpin
 * @param {string} elemId video id
 * @param {string} pnId button pin id
 * @param {string} camId video wrap id
 * @param {string} peerId peer id
 * @param {boolean} isScreen stream
 */
function handleVideoPinUnpin(elemId, pnId, camId, peerId, isScreen = false) {
    let videoPlayer = getId(elemId);
    let btnPn = getId(pnId);
    let cam = getId(camId);
    let videoMediaContainer = getId('videoMediaContainer');
    let videoPinMediaContainer = getId('videoPinMediaContainer');
    if (btnPn && videoPlayer && cam) {
        btnPn.addEventListener('click', () => {
            if (isMobileDevice) return;
            playSound('click');
            isVideoPinned = !isVideoPinned;
            if (isVideoPinned) {
                if (!videoPlayer.classList.contains('videoCircle')) {
                    videoPlayer.style.objectFit = 'contain';
                }
                cam.className = '';
                cam.style.width = '100%';
                cam.style.height = '100%';
                toggleVideoPin(pinVideoPositionSelect.value);
                videoPinMediaContainer.appendChild(cam);
                videoPinMediaContainer.style.display = 'block';
                pinnedVideoPlayerId = elemId;
                setColor(btnPn, 'lime');
            } else {
                if (pinnedVideoPlayerId != videoPlayer.id) {
                    isVideoPinned = true;
                    if (isScreenEnabled) return;
                    return userLog('toast', 'Another video seems pinned, unpin it before to pin this one', 5000);
                }
                if (!isScreenStreaming) videoPlayer.style.objectFit = 'var(--video-object-fit)';
                if (isScreen || videoPlayer.style.name == peerId + '_typeScreen')
                    videoPlayer.style.objectFit = 'contain';
                videoPinMediaContainer.removeChild(cam);
                cam.className = 'Camera';
                videoMediaContainer.appendChild(cam);
                removeVideoPinMediaContainer(peerId, true);
                setColor(btnPn, 'white');
            }
            adaptAspectRatio();
        });
    }
}

function toggleVideoPin(position) {
    if (!isVideoPinned) return;
    const videoMediaContainer = getId('videoMediaContainer');
    const videoPinMediaContainer = getId('videoPinMediaContainer');
    switch (position) {
        case 'top':
            videoPinMediaContainer.style.top = '25%';
            videoPinMediaContainer.style.width = '100%';
            videoPinMediaContainer.style.height = '70%';
            videoMediaContainer.style.top = 0;
            videoMediaContainer.style.width = '100%';
            videoMediaContainer.style.height = '25%';
            videoMediaContainer.style.right = 0;
            break;
        case 'vertical':
            videoPinMediaContainer.style.top = 0;
            videoPinMediaContainer.style.width = '75%';
            videoPinMediaContainer.style.height = '100%';
            videoMediaContainer.style.top = 0;
            videoMediaContainer.style.width = '25%';
            videoMediaContainer.style.height = '100%';
            videoMediaContainer.style.right = 0;
            break;
        case 'horizontal':
            videoPinMediaContainer.style.top = 0;
            videoPinMediaContainer.style.width = '100%';
            videoPinMediaContainer.style.height = '75%';
            videoMediaContainer.style.top = '75%';
            videoMediaContainer.style.right = null;
            videoMediaContainer.style.width = null;
            videoMediaContainer.style.width = '100% !important';
            videoMediaContainer.style.height = '25%';
            break;
    }
    resizeVideoMedia();
}

/**
 * Zoom in/out video element
 * @param {string} zoomInBtnId
 * @param {string} zoomOutBtnId
 * @param {string} mediaId
 * @param {string} peerId
 */
function handleVideoZoomInOut(zoomInBtnId, zoomOutBtnId, mediaId, peerId = null) {
    const id = peerId ? peerId + '_videoStatus' : 'myVideoStatusIcon';
    const zoomIn = getId(zoomInBtnId);
    const zoomOut = getId(zoomOutBtnId);
    const video = getId(mediaId);

    let zoom = 1;

    function setTransform() {
        if (isVideoOf(id) || isVideoPrivacyMode(video)) return;
        if (zoom < 1) zoom = 1;
        video.style.scale = zoom;
    }

    video.addEventListener('wheel', (e) => {
        e.preventDefault();
        let delta = e.wheelDelta ? e.wheelDelta : -e.deltaY;
        delta > 0 ? (zoom *= 1.2) : (zoom /= 1.2);
        setTransform();
    });

    zoomIn.addEventListener('click', () => {
        if (isVideoOf(id)) return userLog('toast', 'Zoom in work when video is on');
        if (isVideoPrivacyMode(video)) return userLog('toast', 'Zoom in not allowed if video on privacy mode');
        zoom = zoom + 0.1;
        setTransform();
    });

    zoomOut.addEventListener('click', () => {
        if (isVideoOf(id)) return userLog('toast', 'Zoom out work when video is on');
        if (isVideoPrivacyMode(video)) return userLog('toast', 'Zoom out not allowed if video on privacy mode');
        zoom = zoom - 0.1;
        setTransform();
    });

    function isVideoOf(id) {
        const videoStatusBtn = getId(id);
        return videoStatusBtn.className === className.videoOff;
    }
    function isVideoPrivacyMode() {
        return video.classList.contains('videoCircle');
    }
}

/**
 * Remove video pin media container
 * @param {string} peer_id aka socket.id
 * @param {boolean} force_remove force to remove
 */
function removeVideoPinMediaContainer(peer_id, force_remove = false) {
    //alert(pinnedVideoPlayerId + '==' + peer_id);
    if (
        (isVideoPinned && (pinnedVideoPlayerId == peer_id + '_video' || pinnedVideoPlayerId == peer_id)) ||
        force_remove
    ) {
        const videoPinMediaContainer = getId('videoPinMediaContainer');
        const videoMediaContainer = getId('videoMediaContainer');
        videoPinMediaContainer.style.display = 'none';
        videoMediaContainer.style.top = 0;
        videoMediaContainer.style.right = null;
        videoMediaContainer.style.width = '100%';
        videoMediaContainer.style.height = '100%';
        pinnedVideoPlayerId = null;
        isVideoPinned = false;
        resizeVideoMedia();
    }
}

/**
 * Handle Video to Img click event
 * @param {string} videoStream uuid video element
 * @param {string} videoToImgBtn uuid snapshot btn
 * @param {string} peer_id socket.id
 */
function handleVideoToImg(videoStream, videoToImgBtn, peer_id = null) {
    let videoBtn = getId(videoToImgBtn);
    let video = getId(videoStream);
    videoBtn.addEventListener('click', () => {
        if (video.classList.contains('videoCircle')) {
            return userLog('toast', 'Snapshot not allowed if video on privacy mode');
        }
        if (peer_id !== null) {
            // handle remote video snapshot
            let remoteVideoStatusBtn = getId(peer_id + '_videoStatus');
            if (remoteVideoStatusBtn.className === className.videoOn) {
                return takeSnapshot(video);
            }
        } else {
            // handle local video snapshot
            if (myVideoStatusIcon.className === className.videoOn) {
                return takeSnapshot(video);
            }
        }
        userLog('toast', 'Snapshot not work on video disabled');
    });
}

/**
 * Save Video Frame to Image
 * @param {object} video element from where to take the snapshot
 */
function takeSnapshot(video) {
    playSound('snapshot');
    let context, canvas, width, height, dataURL;
    width = video.videoWidth;
    height = video.videoHeight;
    canvas = canvas || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, width, height);
    dataURL = canvas.toDataURL('image/png'); // or image/jpeg
    // console.log(dataURL);
    saveDataToFile(dataURL, getDataTimeString() + '-SNAPSHOT.png');
}

/**
 * Start talk time
 */
function startCountTime() {
    countTime.style.display = 'inline';
    callStartTime = Date.now();
    setInterval(function printTime() {
        callElapsedTime = Date.now() - callStartTime;
        countTime.innerText = getTimeToString(callElapsedTime);
    }, 1000);
}

/**
 * Convert time to string
 * @param {integer} time
 * @return {string} format HH:MM:SS
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
 * Refresh my localMediaStream audio/video status
 * @param {object} localMediaStream
 */
function refreshMyVideoAudioStatus(localMediaStream) {
    // check Track audio/video status
    localMediaStream.getTracks().forEach((track) => {
        switch (track.kind) {
            case 'video':
                myVideoStatus = track.enabled;
                break;
            case 'audio':
                myAudioStatus = track.enabled;
                break;
        }
    });
}

/**
 * Handle WebRTC left buttons
 */
function manageLeftButtons() {
    setShareRoomBtn();
    setHideMeButton();
    setAudioBtn();
    setVideoBtn();
    setSwapCameraBtn();
    setScreenShareBtn();
    setRecordStreamBtn();
    setFullScreenBtn();
    setChatRoomBtn();
    setCaptionRoomBtn();
    setChatEmojiBtn();
    setMyHandBtn();
    setMyWhiteboardBtn();
    setMyFileShareBtn();
    setMySettingsBtn();
    setAboutBtn();
    setLeaveRoomBtn();
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
 * Hide myself from room view
 */
function setHideMeButton() {
    hideMeBtn.addEventListener('click', (e) => {
        isHideMeActive = !isHideMeActive;
        handleHideMe(isHideMeActive);
    });
}

/**
 * Audio mute - unmute button click event
 */
function setAudioBtn() {
    audioBtn.addEventListener('click', (e) => {
        handleAudio(e, false);
    });

    document.onkeydown = (e) => {
        if (!isPushToTalkActive || isChatRoomVisible) return;
        if (e.code === 'Space') {
            if (isSpaceDown) return; // prevent multiple call
            handleAudio(audioBtn, false, true);
            isSpaceDown = true;
            console.log('Push-to-talk: audio ON');
        }
    };
    document.onkeyup = (e) => {
        e.preventDefault();
        if (!isPushToTalkActive || isChatRoomVisible) return;
        if (e.code === 'Space') {
            handleAudio(audioBtn, false, false);
            isSpaceDown = false;
            console.log('Push-to-talk: audio OFF');
        }
    };
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
    if (
        !isMobileDevice &&
        (navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia) &&
        buttons.main.showScreenBtn
    ) {
        isScreenSharingSupported = true;
        initScreenShareBtn.addEventListener('click', async (e) => {
            await toggleScreenSharing(true);
        });
        screenShareBtn.addEventListener('click', async (e) => {
            await toggleScreenSharing();
        });
    } else {
        initScreenShareBtn.style.display = 'none';
        screenShareBtn.style.display = 'none';
        elemDisplay(getId('screenFpsDiv'), false);
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
    if (myBrowserName != 'Safari') {
        // detect esc from full screen mode
        document.addEventListener('fullscreenchange', (e) => {
            let fullscreenElement = document.fullscreenElement;
            if (!fullscreenElement) {
                fullScreenBtn.className = className.fsOff;
                isDocumentOnFullScreen = false;
                setTippy(fullScreenBtn, 'View full screen', 'right-start');
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
    setChatRoomAndCaptionForMobile();

    // open hide chat room
    chatRoomBtn.addEventListener('click', (e) => {
        if (!isChatRoomVisible) {
            showChatRoomDraggable();
        } else {
            hideChatRoomAndEmojiPicker();
            e.target.className = className.chatOn;
        }
    });

    // ghost theme + undo
    msgerTheme.addEventListener('click', (e) => {
        if (e.target.className == className.ghost) {
            e.target.className = className.undo;
            document.documentElement.style.setProperty('--msger-bg', 'rgba(0, 0, 0, 0.100)');
        } else {
            e.target.className = className.ghost;
            document.documentElement.style.setProperty('--msger-bg', 'radial-gradient(#393939, #000000)');
        }
    });

    // show msger participants section
    msgerCPBtn.addEventListener('click', (e) => {
        if (!thereIsPeerConnections()) {
            return userLog('info', 'No participants detected');
        }
        msgerCP.style.display = 'flex';
    });

    // hide msger participants section
    msgerCPCloseBtn.addEventListener('click', (e) => {
        msgerCP.style.display = 'none';
    });

    // clean chat messages
    msgerClean.addEventListener('click', (e) => {
        if (chatMessages.length != 0) {
            return cleanMessages();
        }
        userLog('info', 'No chat messages to delete');
    });

    // save chat messages to file
    msgerSaveBtn.addEventListener('click', (e) => {
        if (chatMessages.length != 0) {
            return downloadChatMsgs();
        }
        userLog('info', 'No chat messages to save');
    });

    // close chat room - show left button and status menu if hide
    msgerClose.addEventListener('click', (e) => {
        chatMinimize();
        hideChatRoomAndEmojiPicker();
        showButtonsBarAndMenu();
    });

    // Maximize chat
    msgerMaxBtn.addEventListener('click', (e) => {
        chatMaximize();
    });
    // minimize chat
    msgerMinBtn.addEventListener('click', (e) => {
        chatMinimize();
    });

    // Markdown on-off
    msgerMarkdownBtn.addEventListener('click', (e) => {
        isChatMarkdownOn = !isChatMarkdownOn;
        setColor(msgerMarkdownBtn, isChatMarkdownOn ? 'lime' : 'white');
    });

    // ChatGPT/OpenAI
    msgerGPTBtn.addEventListener('click', (e) => {
        isChatGPTOn = !isChatGPTOn;
        setColor(msgerGPTBtn, isChatGPTOn ? 'lime' : 'white');
    });

    // share file from chat
    msgerShareFileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        selectFileToShare(myPeerId, true);
    });

    // open Video Url Player
    msgerVideoUrlBtn.addEventListener('click', (e) => {
        sendVideoUrl();
    });

    // Execute a function when the user releases a key on the keyboard
    msgerInput.addEventListener('keyup', (e) => {
        // Number 13 is the "Enter" key on the keyboard
        if (e.keyCode === 13 && (isMobileDevice || !e.shiftKey)) {
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
        checkLineBreaks();
    };

    msgerInput.onpaste = () => {
        isChatPasteTxt = true;
        checkLineBreaks();
    };

    // clean input msg txt
    msgerCleanTextBtn.addEventListener('click', (e) => {
        cleanMessageInput();
    });

    // paste to input msg txt
    msgerPasteBtn.addEventListener('click', (e) => {
        pasteToMessageInput();
    });

    // chat show on message
    msgerShowChatOnMsg.addEventListener('change', (e) => {
        playSound('switch');
        showChatOnMessage = e.currentTarget.checked;
        if (showChatOnMessage) {
            msgPopup('info', "Chat will be shown, when I'm receive a new message", 'top-end', 3000);
        } else {
            msgPopup('info', "Chat not will be shown, when I'm receive a new message", 'top-end', 3000);
        }
    });

    // chat send msg
    msgerSendBtn.addEventListener('click', async (e) => {
        // prevent refresh page
        e.preventDefault();
        await sendChatMessage();
    });

    // adapt input font size 4 mobile
    if (isMobileDevice) msgerInput.style.fontSize = 'xx-small';
}

/**
 * Caption room buttons click event
 */
function setCaptionRoomBtn() {
    if (speechRecognition && buttons.main.showCaptionRoomBtn) {
        // open hide caption
        captionBtn.addEventListener('click', (e) => {
            if (!isCaptionBoxVisible) {
                showCaptionDraggable();
            } else {
                hideCaptionBox();
            }
        });

        // Maximize caption
        captionMaxBtn.addEventListener('click', (e) => {
            captionMaximize();
        });
        // minimize caption
        captionMinBtn.addEventListener('click', (e) => {
            captionMinimize();
        });

        // ghost theme + undo
        captionTheme.addEventListener('click', (e) => {
            if (e.target.className == className.ghost) {
                e.target.className = className.undo;
                document.documentElement.style.setProperty('--msger-bg', 'rgba(0, 0, 0, 0.100)');
            } else {
                e.target.className = className.ghost;
                document.documentElement.style.setProperty('--msger-bg', 'radial-gradient(#393939, #000000)');
            }
        });

        // clean caption transcripts
        captionClean.addEventListener('click', (e) => {
            if (transcripts.length != 0) {
                return cleanCaptions();
            }
            userLog('info', 'No captions to delete');
        });

        // save caption transcripts to file
        captionSaveBtn.addEventListener('click', (e) => {
            if (transcripts.length != 0) {
                return downloadCaptions();
            }
            userLog('info', 'No captions to save');
        });

        // close caption box - show left button and status menu if hide
        captionClose.addEventListener('click', (e) => {
            captionMinimize();
            hideCaptionBox();
            showButtonsBarAndMenu();
        });

        // hide it
        speechRecognitionStop.style.display = 'none';

        // start recognition speech
        speechRecognitionStart.addEventListener('click', (e) => {
            startSpeech(true);
        });
        // stop recognition speech
        speechRecognitionStop.addEventListener('click', (e) => {
            startSpeech(false);
        });
    } else {
        captionBtn.style.display = 'none';
        // https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API#browser_compatibility
    }
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
    // Add emoji picker
    const pickerOptions = {
        theme: 'dark',
        onEmojiSelect: addEmojiToMsg,
    };
    const emojiPicker = new EmojiMart.Picker(pickerOptions);
    msgerEmojiPicker.appendChild(emojiPicker);
}

/**
 * Add emoji to chat message
 */
function addEmojiToMsg(data) {
    //console.log(data);
    msgerInput.value += data.native;
    hideShowEmojiPicker();
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
 * Whiteboard: https://github.com/fabricjs/fabric.js
 */
function setMyWhiteboardBtn() {
    dragElement(whiteboard, whiteboardHeader);

    setupWhiteboard();

    whiteboardBtn.addEventListener('click', (e) => {
        handleWhiteboardToggle();
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
    whiteboardTriangleBtn.addEventListener('click', (e) => {
        whiteboardAddObj('triangle');
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
        handleWhiteboardToggle();
    });
    wbDrawingColorEl.addEventListener('change', (e) => {
        wbCanvas.freeDrawingBrush.color = wbDrawingColorEl.value;
        whiteboardIsDrawingMode(true);
    });
    wbBackgroundColorEl.addEventListener('change', (e) => {
        setWhiteboardBgColor(wbBackgroundColorEl.value);
    });
    whiteboardGhostButton.addEventListener('click', (e) => {
        wbIsBgTransparent = !wbIsBgTransparent;
        setWhiteboardBgColor(wbIsBgTransparent ? 'rgba(0, 0, 0, 0.100)' : wbBackgroundColorEl.value);
        //wbIsBgTransparent ? wbCanvasBackgroundColor('rgba(0, 0, 0, 0.100)'): setTheme(mirotalkTheme);
    });
}

/**
 * File Transfer button event click
 */
function setMyFileShareBtn() {
    // make send-receive file div draggable
    if (!isMobileDevice) {
        dragElement(getId('sendFileDiv'), getId('imgShareSend'));
        dragElement(getId('receiveFileDiv'), getId('imgShareReceive'));
    }

    fileShareBtn.addEventListener('click', (e) => {
        //window.open("https://fromsmash.com"); // for Big Data
        selectFileToShare(myPeerId, true);
    });
    sendAbortBtn.addEventListener('click', (e) => {
        abortFileTransfer();
    });
    receiveHideBtn.addEventListener('click', (e) => {
        hideFileTransfer();
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
    // Sounds
    switchSounds.addEventListener('change', (e) => {
        notifyBySound = e.currentTarget.checked;
        userLog('toast', `${icons.sounds} Notify & sounds ` + (notifyBySound ? 'ON' : 'OFF'));
        playSound('switch');
    });

    if (isMobileDevice) {
        document.getElementById('pushToTalkDiv').style.display = 'none';
    } else {
        // Push to talk
        switchPushToTalk.addEventListener('change', (e) => {
            isPushToTalkActive = e.currentTarget.checked;
            userLog('toast', `👆 Push to talk ` + (isPushToTalkActive ? 'ON' : 'OFF'));
            playSound('switch');
        });
    }

    switchAudioPitchBar.addEventListener('change', (e) => {
        isAudioPitchBar = e.currentTarget.checked;
        userLog('toast', `${icons.pitchBar} Audio pitch bar ` + (isAudioPitchBar ? 'ON' : 'OFF'));
        playSound('switch');
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
    // detect buttons bar over
    buttonsBar.addEventListener('mouseover', () => {
        isButtonsBarOver = true;
    });
    buttonsBar.addEventListener('mouseout', () => {
        isButtonsBarOver = false;
    });
    checkButtonsBarAndMenu();
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
    tabLanguagesBtn.addEventListener('click', (e) => {
        openTab(e, 'tabLanguages');
    });
    // select audio input
    audioInputSelect.addEventListener('change', async () => {
        myVideoChange = false;
        await refreshLocalMedia();
        lS.setLocalStorageDevices(lS.MEDIA_TYPE.audio, audioInputSelect.selectedIndex, audioInputSelect.value);
    });
    // select audio output
    audioOutputSelect.addEventListener('change', (e) => {
        changeAudioDestination();
        lS.setLocalStorageDevices(lS.MEDIA_TYPE.speaker, audioOutputSelect.selectedIndex, audioOutputSelect.value);
    });
    // select video input
    videoSelect.addEventListener('change', async () => {
        myVideoChange = true;
        await refreshLocalMedia();
        lS.setLocalStorageDevices(lS.MEDIA_TYPE.video, videoSelect.selectedIndex, videoSelect.value);
    });
    // select video quality
    videoQualitySelect.addEventListener('change', async (e) => {
        await setLocalVideoQuality();
    });
    // select video fps
    videoFpsSelect.addEventListener('change', (e) => {
        videoMaxFrameRate = parseInt(videoFpsSelect.value);
        setLocalMaxFps(videoMaxFrameRate);
    });
    // default 30 fps
    videoFpsSelect.selectedIndex = '1';

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
    // default 30 fps
    screenFpsSelect.selectedIndex = '1';

    // Mobile not support screen sharing
    if (isMobileDevice) {
        screenFpsSelect.value = null;
        screenFpsSelect.disabled = true;
    }
    // select themes
    themeSelect.addEventListener('change', (e) => {
        setTheme(themeSelect.value);
    });
    // video object fit
    videoObjFitSelect.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--video-object-fit', videoObjFitSelect.value);
    });
    videoObjFitSelect.selectedIndex = 2; // cover

    // Mobile not support buttons bar position horizontal
    if (isMobileDevice) {
        btnsBarSelect.disabled = true;
    } else {
        btnsBarSelect.addEventListener('change', (e) => {
            setButtonsBarPosition(btnsBarSelect.value);
        });
    }

    // Mobile not support pin/unpin video
    if (!isMobileDevice) {
        pinVideoPositionSelect.addEventListener('change', (e) => {
            toggleVideoPin(pinVideoPositionSelect.value);
        });
    } else {
        getId('pinUnpinGridDiv').style.display = 'none';
    }

    // room actions
    muteEveryoneBtn.addEventListener('click', (e) => {
        disableAllPeers('audio');
    });
    hideEveryoneBtn.addEventListener('click', (e) => {
        disableAllPeers('video');
    });
    ejectEveryoneBtn.addEventListener('click', (e) => {
        ejectEveryone();
    });
    lockRoomBtn.addEventListener('click', (e) => {
        handleRoomAction({ action: 'lock' }, true);
    });
    unlockRoomBtn.addEventListener('click', (e) => {
        handleRoomAction({ action: 'unlock' }, true);
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
        dragElement(videoAudioUrlCont, videoAudioUrlHeader);
    }
    videoUrlCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeVideoUrlPlayer();
        emitVideoPlayer('close');
    });
    videoAudioCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeVideoUrlPlayer();
        emitVideoPlayer('close');
    });
}

/**
 * Refresh Local media audio video in - out
 */
async function refreshLocalMedia() {
    console.log('Refresh local media', {
        audioStatus: myAudioStatus,
        videoStatus: myVideoStatus,
    });
    // some devices can't swap the video track, if already in execution.
    await stopLocalVideoTrack();
    await stopLocalAudioTrack();
    const audioVideoConstraints = await getAudioVideoConstraints();
    navigator.mediaDevices.getUserMedia(audioVideoConstraints).then(gotStream).then(gotDevices).catch(handleError);
}

/**
 * Get audio - video constraints
 * @returns {object} audio - video constraints
 */
async function getAudioVideoConstraints() {
    const audioSource = audioInputSelect.value;
    const videoSource = videoSelect.value;
    let videoConstraints = useVideo;
    if (videoConstraints) {
        videoConstraints = await getVideoConstraints(videoQualitySelect.value ? videoQualitySelect.value : 'default');
        videoConstraints['deviceId'] = videoSource ? { exact: videoSource } : undefined;
    }
    let audioConstraints = useAudio;
    if (audioConstraints) {
        audioConstraints = await getAudioConstraints();
        audioConstraints['deviceId'] = audioSource ? { exact: audioSource } : undefined;
    }
    return {
        audio: audioConstraints,
        video: videoConstraints,
    };
}

/**
 * Get video constraints: https://webrtc.github.io/samples/src/content/getusermedia/resolution/
 * WebCam resolution: https://webcamtests.com/resolution
 * @param {string} videoQuality desired video quality
 * @returns {object} video constraints
 */
async function getVideoConstraints(videoQuality) {
    const frameRate = { max: videoMaxFrameRate };

    switch (videoQuality) {
        case 'default':
            if (forceCamMaxResolutionAndFps) {
                // This will make the browser use the maximum resolution available as default, `up to 4K and 60fps`.
                return {
                    width: { ideal: 3840 },
                    height: { ideal: 2160 },
                    frameRate: { ideal: 60 },
                }; // video cam constraints default
            }
            // This will make the browser use hdVideo and 30fps.
            return {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
            }; // on default as hdVideo
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
        case '2kVideo':
            return {
                width: { exact: 2560 },
                height: { exact: 1440 },
                frameRate: frameRate,
            }; // video cam constraints ultra high bandwidth
        case '4kVideo':
            return {
                width: { exact: 3840 },
                height: { exact: 2160 },
                frameRate: frameRate,
            }; // video cam constraints ultra high bandwidth
    }
}

/**
 * Get audio constraints
 */
async function getAudioConstraints() {
    return {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
    };
}

/**
 * Set local max fps: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/applyConstraints
 * @param {string} maxFrameRate desired max frame rate
 */
function setLocalMaxFps(maxFrameRate) {
    if (!useVideo) return;
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
 * Set local video quality: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/applyConstraints
 */
async function setLocalVideoQuality() {
    if (!useVideo) return;
    let videoConstraints = await getVideoConstraints(videoQualitySelect.value ? videoQualitySelect.value : 'default');
    localMediaStream
        .getVideoTracks()[0]
        .applyConstraints(videoConstraints)
        .then(() => {
            logStreamSettingsInfo('setLocalVideoQuality', localMediaStream);
            videoQualitySelectedIndex = videoQualitySelect.selectedIndex;
        })
        .catch((err) => {
            videoQualitySelect.selectedIndex = videoQualitySelectedIndex;
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
 * @param {object} element video element to attach the audio output
 * @param {string} sinkId uuid audio output device
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
 * @param {object} stream media stream audio - video
 * @returns {object} media Devices Info
 */
async function gotStream(stream) {
    await refreshMyLocalStream(stream, true);
    await refreshMyStreamToPeers(stream, true);
    if (myVideoChange) {
        setMyVideoStatusTrue();
        // This fix IPadPro - Tablet mirror of the back camera
        if ((isMobileDevice || isIPadDevice || isTabletDevice) && !isCamMirrored) {
            myVideo.classList.toggle('mirror');
            isCamMirrored = true;
        }
    }
    // Refresh button list in case labels have become available
    return navigator.mediaDevices.enumerateDevices();
}

/**
 * Get audio-video Devices and show it to select box
 * https://webrtc.github.io/samples/src/content/devices/input-output/
 * https://github.com/webrtc/samples/tree/gh-pages/src/content/devices/input-output
 * @param {object} deviceInfos device infos
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
 * Handle getUserMedia error: https://blog.addpipe.com/common-getusermedia-errors/
 * @param {object} err user media error
 */
function handleError(err) {
    console.error('navigator.MediaDevices.getUserMedia error: ', err);
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
}

/**
 * AttachMediaStream stream to element
 * @param {object} element element to attach the stream
 * @param {object} stream media stream audio - video
 */
function attachMediaStream(element, stream) {
    //console.log("DEPRECATED, attachMediaStream will soon be removed.");
    element.srcObject = stream;
    console.log('Success, media stream attached', stream.getTracks());

    if (myBrowserName === 'Safari') {
        /*
            Hack for Safari...
            https://www.pilatesanytime.com/Pilates-Help/1016/How-to-Get-Safari-to-Autoplay-Video-and-Audio-Chapters
        */
        element.onloadedmetadata = function () {
            let videoPlayPromise = element.play();
            if (videoPlayPromise !== undefined) {
                videoPlayPromise
                    .then(function () {
                        console.log('Safari - automatic playback started!');
                    })
                    .catch(function (err) {
                        console.error('Safari - automatic playback error', err);
                    });
            }
        };
    }
}

/**
 * Show left buttons & status
 * if buttons visible or I'm on hover do nothing return
 * if mobile and chatroom open do nothing return
 * if mobile and myCaption visible do nothing
 * if mobile and mySettings open do nothing return
 */
function showButtonsBarAndMenu() {
    if (
        isButtonsBarOver ||
        isButtonsVisible ||
        (isMobileDevice && isChatRoomVisible) ||
        (isMobileDevice && isCaptionBoxVisible) ||
        (isMobileDevice && isMySettingsVisible)
    )
        return;
    toggleClassElements('navbar', 'block');
    buttonsBar.style.display = 'flex';
    isButtonsVisible = true;
}

/**
 * Check every 10 sec if need to hide buttons bar and status menu
 */
function checkButtonsBarAndMenu() {
    if (!isButtonsBarOver) {
        toggleClassElements('navbar', 'none');
        buttonsBar.style.display = 'none';
        isButtonsVisible = false;
    }
    setTimeout(() => {
        checkButtonsBarAndMenu();
    }, 10000);
}

/**
 * Copy room url to clipboard and share it with navigator share if supported
 * https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
 */
async function shareRoomUrl() {
    // navigator share
    if (navigator.share) {
        try {
            // not add title and description to load metadata from url
            await navigator.share({ url: myRoomUrl });
            userLog('toast', 'Room Shared successfully!');
        } catch (err) {
            /*
            This feature is available only in secure contexts (HTTPS),
            in some or all supporting browsers and mobile devices
            console.error("navigator.share", err); 
            */
            console.error('Navigator share error', err);

            shareRoomMeetingURL();
        }
    } else {
        shareRoomMeetingURL();
    }
}

/**
 * Share meeting room
 * @param {boolean} checkScreen check screen share
 */
function shareRoomMeetingURL(checkScreen = false) {
    playSound('newMessage');
    Swal.fire({
        background: swalBackground,
        position: 'center',
        title: 'Share the room',
        html: `
        <div id="qrRoomContainer">
            <canvas id="qrRoom"></canvas>
        </div>
        <br/>
        <p style="color:rgb(8, 189, 89);">Join from your mobile device</p>
        <p style="background:transparent; color:white; font-family: Arial, Helvetica, sans-serif;">No need for apps, simply capture the QR code with your mobile camera Or Invite someone else to join by sending them the following URL</p>
        <p style="color:rgb(8, 189, 89);">${myRoomUrl}</p>`,
        showDenyButton: true,
        showCancelButton: true,
        cancelButtonColor: 'red',
        denyButtonColor: 'green',
        confirmButtonText: `Copy URL`,
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
        // share screen on join room
        if (checkScreen) checkShareScreen();
    });
    makeRoomQR();
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
    userLog('toast', 'Meeting URL copied to clipboard 👍');
}

/**
 * Share room id by email
 * @param {object} message content: email | subject | body
 */
function shareRoomByEmail(message) {
    let email = message.email;
    let subject = message.subject;
    let emailBody = message.body;
    document.location = 'mailto:' + email + '?subject=' + subject + '&body=' + emailBody;
}

/**
 * Handle Audio ON - OFF
 * @param {object} e event
 * @param {boolean} init on join room
 * @param {null|boolean} force audio off (default null can be true/false)
 */
function handleAudio(e, init, force = null) {
    if (!useAudio) return;
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getAudioTracks

    localMediaStream.getAudioTracks()[0].enabled =
        force != null ? force : !localMediaStream.getAudioTracks()[0].enabled;
    myAudioStatus = localMediaStream.getAudioTracks()[0].enabled;

    force != null
        ? (e.className = myAudioStatus ? className.audioOn : className.audioOff)
        : (e.target.className = myAudioStatus ? className.audioOn : className.audioOff);

    if (init) {
        audioBtn.className = myAudioStatus ? className.audioOn : className.audioOff;
        setTippy(initAudioBtn, myAudioStatus ? 'Stop the audio' : 'Start the audio', 'top');
        getId('initMicrophoneSelect').disabled = !myAudioStatus;
        getId('initSpeakerSelect').disabled = !myAudioStatus;
    }
    setMyAudioStatus(myAudioStatus);
}

/**
 * Handle Video ON - OFF
 * @param {object} e event
 * @param {boolean} init on join room
 * @param {null|boolean} force video off (default null can be true/false)
 */
function handleVideo(e, init, force = null) {
    if (!useVideo) return;
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getVideoTracks

    localMediaStream.getVideoTracks()[0].enabled =
        force != null ? force : !localMediaStream.getVideoTracks()[0].enabled;
    myVideoStatus = localMediaStream.getVideoTracks()[0].enabled;

    force != null
        ? (e.className = myVideoStatus ? className.videoOn : className.videoOff)
        : (e.target.className = myVideoStatus ? className.videoOn : className.videoOff);

    videoBtn.className = myVideoStatus ? className.videoOn : className.videoOff;

    if (init) {
        initVideoBtn.className = myVideoStatus ? className.videoOn : className.videoOff;
        setTippy(initVideoBtn, myVideoStatus ? 'Stop the video' : 'Start the video', 'top');
        initVideo.style.display = myVideoStatus ? 'block' : 'none';
        initVideoSelect.disabled = !myVideoStatus;
    }
    setMyVideoStatus(myVideoStatus);
}

/**
 * SwapCamera front (user) - rear (environment)
 */
async function swapCamera() {
    // setup camera
    let camVideo = false;
    camera = camera == 'user' ? 'environment' : 'user';
    camVideo = camera == 'user' ? true : { facingMode: { exact: camera } };

    // some devices can't swap the cam, if have Video Track already in execution.
    await stopLocalVideoTrack();

    let camStream = null;

    try {
        // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
        camStream = await navigator.mediaDevices.getUserMedia({ video: camVideo });
        if (camStream) {
            await refreshMyLocalStream(camStream);
            await refreshMyStreamToPeers(camStream);
            await setMyVideoStatusTrue();
            if (!isCamMirrored) {
                myVideo.classList.toggle('mirror');
                isCamMirrored = true;
            }
        }
    } catch (err) {
        console.log('[Error] to swapping camera', err);
        userLog('error', 'Error to swapping the camera ' + err);
        // https://blog.addpipe.com/common-getusermedia-errors/
    }
}

/**
 * Stop Local Video Track
 */
async function stopLocalVideoTrack() {
    if (useVideo || !isScreenStreaming) {
        const localVideoTrack = localMediaStream.getVideoTracks()[0];
        if (localVideoTrack) {
            console.log('stopLocalVideoTrack', localVideoTrack);
            localVideoTrack.stop();
        }
    }
}

/**
 * Stop Local Audio Track
 */
async function stopLocalAudioTrack() {
    const localAudioTrack = localMediaStream.getAudioTracks()[0];
    if (localAudioTrack) {
        console.log('stopLocalAudioTrack', localAudioTrack);
        localAudioTrack.stop();
    }
}

/**
 * Enable - disable screen sharing
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
 * @param {boolean} init screen before join
 */
async function toggleScreenSharing(init = false) {
    screenMaxFrameRate = parseInt(screenFpsSelect.value);
    const constraints = {
        audio: true, // enable tab audio
        video: { frameRate: { max: screenMaxFrameRate } },
    }; // true | { frameRate: { max: screenMaxFrameRate } }

    let screenMediaPromise = null;

    try {
        // Going to save webcam video status before to screen share
        if (!isScreenStreaming) {
            myVideoStatusBefore = myVideoStatus;
            console.log('My video status before screen sharing: ' + myVideoStatusBefore);
        }
        screenMediaPromise = isScreenStreaming
            ? await navigator.mediaDevices.getUserMedia(await getAudioVideoConstraints())
            : await navigator.mediaDevices.getDisplayMedia(constraints);
        if (screenMediaPromise) {
            isVideoPrivacyActive = false;
            emitPeerStatus('privacy', isVideoPrivacyActive);
            isScreenStreaming = !isScreenStreaming;
            if (isScreenStreaming) {
                setMyVideoStatusTrue();
                emitPeersAction('screenStart');
            } else {
                emitPeersAction('screenStop');
                adaptAspectRatio();
            }
            myScreenStatus = isScreenStreaming;
            await emitPeerStatus('screen', myScreenStatus);
            await stopLocalVideoTrack();
            await refreshMyLocalStream(screenMediaPromise);
            await refreshMyStreamToPeers(screenMediaPromise);

            if (initStream) {
                stopTracks(initStream);
                initStream = screenMediaPromise;
                const newStream = new MediaStream([initStream.getVideoTracks()[0]]);
                initVideo.style.display = 'block';
                initVideo.classList.toggle('mirror');
                initVideo.srcObject = newStream;
                disable(initVideoSelect, isScreenStreaming);
                disable(initVideoBtn, isScreenStreaming);
            }

            // Disable cam video when screen sharing stop
            if (!init && !isScreenStreaming && !myVideoStatusBefore) setMyVideoOff(myPeerName);
            // Enable cam video when screen sharing stop
            if (!init && !isScreenStreaming && myVideoStatusBefore) setMyVideoStatusTrue();

            myVideo.classList.toggle('mirror');
            setScreenSharingStatus(isScreenStreaming);
            if (myVideoAvatarImage && !useVideo)
                myVideoAvatarImage.style.display = isScreenStreaming ? 'none' : 'block';
            let myPrivacyBtn = getId('myPrivacyBtn');
            if (myPrivacyBtn) myPrivacyBtn.style.display = isScreenStreaming ? 'none' : 'inline';
            if (isScreenStreaming || isVideoPinned) getId('myVideoPinBtn').click();
        }
    } catch (err) {
        console.error('[Error] Unable to share the screen', err);
        if (init) return;
        userLog('error', 'Unable to share the screen ' + err);
    }
}

/**
 * Set Screen Sharing Status
 * @param {boolean} status of screen sharing
 */
function setScreenSharingStatus(status) {
    initScreenShareBtn.className = status ? className.screenOff : className.screenOn;
    screenShareBtn.className = status ? className.screenOff : className.screenOn;
    setTippy(screenShareBtn, status ? 'Stop screen sharing' : 'Start screen sharing', 'right-start');
}

/**
 * Set myVideoStatus true
 */
async function setMyVideoStatusTrue() {
    if (myVideoStatus || !useVideo) return;
    // Put video status already ON
    localMediaStream.getVideoTracks()[0].enabled = true;
    myVideoStatus = true;
    initVideoBtn.className = className.videoOn;
    videoBtn.className = className.videoOn;
    myVideoStatusIcon.className = className.videoOn;
    myVideoAvatarImage.style.display = 'none';
    emitPeerStatus('video', myVideoStatus);
    setTippy(videoBtn, 'Stop the video', 'right-start');
    setTippy(initVideoBtn, 'Stop the video', 'top');
}

/**
 * Enter - esc on full screen mode
 * https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
 */
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        fullScreenBtn.className = className.fsOn;
        isDocumentOnFullScreen = true;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            fullScreenBtn.className = className.fsOff;
            isDocumentOnFullScreen = false;
        }
    }
    setTippy(fullScreenBtn, isDocumentOnFullScreen ? 'Exit full screen' : 'View full screen', 'right-start');
}

/**
 * Refresh my stream changes to connected peers in the room
 * @param {object} stream media stream audio - video
 * @param {boolean} localAudioTrackChange default false
 */
async function refreshMyStreamToPeers(stream, localAudioTrackChange = false) {
    if (!thereIsPeerConnections()) return;

    console.log('PEER-CONNECTIONS', peerConnections); // all peers connections in the room expect myself
    console.log('ALL-PEERS', allPeers); // all peers connected in the room

    // refresh my stream to connected peers expect myself
    for (let peer_id in peerConnections) {
        let peer_name = allPeers[peer_id]['peer_name'];

        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getSenders
        let videoSender = peerConnections[peer_id]
            .getSenders()
            .find((s) => (s.track ? s.track.kind === 'video' : false));
        console.log('CHECK VIDEO SENDER - ' + peer_name, videoSender);

        if (videoSender) {
            // https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack
            videoSender.replaceTrack(stream.getVideoTracks()[0]);
            console.log('REPLACE VIDEO TRACK TO', { peer_id: peer_id, peer_name: peer_name });
        } else {
            stream.getTracks().forEach((track) => {
                if (track.kind === 'video') {
                    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
                    peerConnections[peer_id].addTrack(track);
                    handleRtcOffer(peer_id); // https://groups.google.com/g/discuss-webrtc/c/Ky3wf_hg1l8?pli=1
                    console.log('ADD VIDEO TRACK TO', { peer_id: peer_id, peer_name: peer_name });
                }
            });
        }

        let myAudioTrack; // audio Track to replace to peers

        if (stream.getAudioTracks()[0] && (localAudioTrackChange || isScreenStreaming)) {
            myAudioTrack = stream.getAudioTracks()[0];
        } else {
            myAudioTrack = localMediaStream.getAudioTracks()[0];
        }
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getSenders
        let audioSender = peerConnections[peer_id]
            .getSenders()
            .find((s) => (s.track ? s.track.kind === 'audio' : false));

        if (audioSender) {
            // https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack
            audioSender.replaceTrack(myAudioTrack);
            console.log('REPLACE AUDIO TRACK TO', { peer_id: peer_id, peer_name: peer_name });
        }

        // When share a video tab that contain audio, my voice will be turned off
        if (isScreenStreaming && stream.getAudioTracks()[0]) {
            setMyAudioOff('you');
            needToEnableMyAudio = true;
            audioBtn.disabled = true;
        }
        // On end screen sharing enable my audio if need
        if (!isScreenStreaming && needToEnableMyAudio) {
            setMyAudioOn('you');
            needToEnableMyAudio = false;
            audioBtn.disabled = false;
        }
    }
}

/**
 * Refresh my local stream
 * @param {object} stream media stream audio - video
 * @param {boolean} localAudioTrackChange default false
 */
async function refreshMyLocalStream(stream, localAudioTrackChange = false) {
    // enable video
    if (useVideo || isScreenStreaming) stream.getVideoTracks()[0].enabled = true;

    // enable audio
    if (localAudioTrackChange && myAudioStatus === false) {
        audioBtn.className = className.audioOn;
        setMyAudioStatus(true);
        myAudioStatus = true;
    }

    let newStream = null;

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
    if (useVideo || isScreenStreaming) {
        console.log('Refresh my local media stream VIDEO - AUDIO');
        newStream = new MediaStream([
            stream.getVideoTracks()[0],
            localAudioTrackChange ? stream.getAudioTracks()[0] : localMediaStream.getAudioTracks()[0],
        ]);
    } else {
        console.log('Refresh my local media stream AUDIO');
        newStream = new MediaStream([
            localAudioTrackChange ? stream.getAudioTracks()[0] : localMediaStream.getAudioTracks()[0],
        ]);
    }

    localMediaStream = newStream;

    // refresh video privacy mode on screen sharing
    if (isScreenStreaming) {
        isVideoPrivacyActive = false;
        setVideoPrivacyStatus('myVideo', isVideoPrivacyActive);
    }

    // adapt video object fit on screen streaming
    getId('myVideo').style.objectFit = isScreenStreaming ? 'contain' : 'var(--video-object-fit)';

    // log newStream devices
    logStreamSettingsInfo('refreshMyLocalStream', localMediaStream);

    // start capture mic volumes
    startPitchDetection(localMediaStream);

    // attachMediaStream is a part of the adapter.js library
    attachMediaStream(myVideo, localMediaStream); // newStream

    // on toggleScreenSharing video stop
    if (useVideo || isScreenStreaming) {
        stream.getVideoTracks()[0].onended = () => {
            toggleScreenSharing();
        };
    }
}

/**
 * Check if recording is active, if yes,
 * on disconnect, remove peer, kick out or leave room, we going to save it
 */
function checkRecording() {
    if (isStreamRecording || myVideoParagraph.innerText.includes('REC')) {
        console.log('Going to save recording');
        stopStreamRecording();
    }
}

/**
 * Start recording time
 */
function startRecordingTime() {
    recStartTime = Date.now();
    let rc = setInterval(function printTime() {
        if (isStreamRecording) {
            recElapsedTime = Date.now() - recStartTime;
            myVideoParagraph.innerText = myPeerName + ' 🔴 REC ' + getTimeToString(recElapsedTime);
            return;
        }
        clearInterval(rc);
    }, 1000);
}

/**
 * Get MediaRecorder MimeTypes
 * @returns {boolean} is mimeType supported by media recorder
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
                    isRecScreenStream = true;
                    handleMediaRecorder(mediaRecorder);
                })
                .catch((err) => {
                    console.error('[Error] Unable to recording the screen + audio', err);
                    userLog('error', 'Unable to recording the screen + audio ' + err);
                });
        }
    } catch (err) {
        console.error('Exception while creating MediaRecorder: ', err);
        return userLog('error', "Can't start stream recording: " + err);
    }
}

/**
 * Notify me if someone start to recording they screen + audio
 * @param {string} from peer_name
 * @param {string} action recording action
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
 * Handle Media Recorder
 * @param {object} mediaRecorder
 */
function handleMediaRecorder(mediaRecorder) {
    mediaRecorder.start();
    mediaRecorder.addEventListener('start', handleMediaRecorderStart);
    mediaRecorder.addEventListener('dataavailable', handleMediaRecorderData);
    mediaRecorder.addEventListener('stop', handleMediaRecorderStop);
}

/**
 * Handle Media Recorder onstart event
 * @param {object} event of media recorder
 */
function handleMediaRecorderStart(event) {
    playSound('recStart');
    if (isRecScreenStream) {
        emitPeersAction('recStart');
        emitPeerStatus('rec', isRecScreenStream);
    }
    console.log('MediaRecorder started: ', event);
    isStreamRecording = true;
    recordStreamBtn.style.setProperty('color', '#ff4500');
    startRecordingTime();
    setTippy(recordStreamBtn, 'Stop recording', 'right-start');
    if (isMobileDevice) {
        swapCameraBtn.style.display = 'none';
    }
}

/**
 * Handle Media Recorder ondata event
 * @param {object} event of media recorder
 */
function handleMediaRecorderData(event) {
    console.log('MediaRecorder data: ', event);
    if (event.data && event.data.size > 0) recordedBlobs.push(event.data);
}

/**
 * Handle Media Recorder onstop event
 * @param {object} event of media recorder
 */
function handleMediaRecorderStop(event) {
    playSound('recStop');
    console.log('MediaRecorder stopped: ', event);
    console.log('MediaRecorder Blobs: ', recordedBlobs);
    isStreamRecording = false;
    myVideoParagraph.innerText = myPeerName + ' (me)';
    if (isRecScreenStream) {
        recScreenStream.getTracks().forEach((track) => {
            if (track.kind === 'video') track.stop();
        });
        isRecScreenStream = false;
        emitPeersAction('recStop');
        emitPeerStatus('rec', isRecScreenStream);
    }
    recordStreamBtn.style.setProperty('color', '#000');
    downloadRecordedStream();
    setTippy(recordStreamBtn, 'Start recording', 'right-start');
    if (isMobileDevice) {
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
                🔴 &nbsp; Recording Info: <br/>
                <ul>
                    <li>File: ${recFileName}</li>
                    <li>Size: ${blobFileSize}</li>
                </ul>
                <br/>
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
 * @param {string} peer_id socket.id
 */
function createChatDataChannel(peer_id) {
    chatDataChannels[peer_id] = peerConnections[peer_id].createDataChannel('mirotalk_chat_channel');
    chatDataChannels[peer_id].onopen = (event) => {
        console.log('chatDataChannels created', event);
    };
}

/**
 * Set the chat room & caption on full screen mode for mobile
 */
function setChatRoomAndCaptionForMobile() {
    if (isMobileDevice) {
        // chat full screen
        document.documentElement.style.setProperty('--msger-height', '99%');
        document.documentElement.style.setProperty('--msger-width', '99%');
        // caption full screen
        document.documentElement.style.setProperty('--caption-height', '99%');
        document.documentElement.style.setProperty('--caption-width', '99%');
    } else {
        // make chat room draggable for desktop
        dragElement(msgerDraggable, msgerHeader);
        // make caption draggable for desktop
        dragElement(captionDraggable, captionHeader);
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
    chatRoomBtn.className = className.chatOff;
    msgerDraggable.style.top = '50%';
    msgerDraggable.style.left = isMobileDevice ? '50%' : '25%';
    msgerDraggable.style.display = 'flex';
    isChatRoomVisible = true;
    setTippy(chatRoomBtn, 'Close the chat', 'right-start');
}

/**
 * Show caption box draggable on center screen position
 */
function showCaptionDraggable() {
    playSound('newMessage');
    if (isMobileDevice) {
        buttonsBar.style.display = 'none';
        isButtonsVisible = false;
    }
    captionBtn.className = 'far fa-closed-captioning';
    captionDraggable.style.top = '50%';
    captionDraggable.style.left = isMobileDevice ? '50%' : '75%';
    captionDraggable.style.display = 'flex';
    isCaptionBoxVisible = true;
    setTippy(captionBtn, 'Close the caption', 'right-start');
}

/**
 * Chat maximize
 */
function chatMaximize() {
    elemDisplay(msgerMaxBtn, false);
    elemDisplay(msgerMinBtn, true);
    chatCenter();
    document.documentElement.style.setProperty('--msger-width', '100%');
    document.documentElement.style.setProperty('--msger-height', '100%');
}

/**
 * Chat minimize
 */
function chatMinimize() {
    elemDisplay(msgerMinBtn, false);
    elemDisplay(msgerMaxBtn, true);
    chatCenter();
    document.documentElement.style.setProperty('--msger-width', '420px');
    document.documentElement.style.setProperty('--msger-height', '680px');
}

/**
 * Set chat position
 */
function chatCenter() {
    msgerDraggable.style.top = '50%';
    msgerDraggable.style.left = '50%';
}

/**
 * Caption maximize
 */
function captionMaximize() {
    elemDisplay(captionMaxBtn, false);
    elemDisplay(captionMinBtn, true);
    captionCenter();
    document.documentElement.style.setProperty('--caption-width', '100%');
    document.documentElement.style.setProperty('--caption-height', '100%');
}

/**
 * Caption minimize
 */
function captionMinimize() {
    elemDisplay(captionMinBtn, false);
    elemDisplay(captionMaxBtn, true);
    captionCenter();
    document.documentElement.style.setProperty('--caption-width', '420px');
    document.documentElement.style.setProperty('--caption-height', '680px');
}

/**
 * Set caption position
 */
function captionCenter() {
    captionDraggable.style.top = '50%';
    captionDraggable.style.left = '50%';
}

/**
 * Clean chat messages
 */
function cleanMessages() {
    playSound('newMessage');
    Swal.fire({
        background: swalBackground,
        position: 'center',
        title: 'Clean up chat messages?',
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
            playSound('delete');
        }
    });
}

/**
 * Clean captions
 */
function cleanCaptions() {
    playSound('newMessage');
    Swal.fire({
        background: swalBackground,
        position: 'center',
        title: 'Clean up all caption transcripts?',
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
            let captions = captionChat.firstChild;
            while (captions) {
                captionChat.removeChild(captions);
                captions = captionChat.firstChild;
            }
            // clean object
            transcripts = [];
            playSound('delete');
        }
    });
}

/**
 * Hide chat room and emoji picker
 */
function hideChatRoomAndEmojiPicker() {
    msgerDraggable.style.display = 'none';
    msgerEmojiPicker.style.display = 'none';
    msgerEmojiBtn.style.color = '#FFFFFF';
    chatRoomBtn.className = className.chatOn;
    isChatRoomVisible = false;
    isChatEmojiVisible = false;
    setTippy(chatRoomBtn, 'Open the chat', 'right-start');
}

/**
 * Hide chat room and emoji picker
 */
function hideCaptionBox() {
    captionDraggable.style.display = 'none';
    captionBtn.className = className.captionOn;
    isCaptionBoxVisible = false;
    setTippy(captionBtn, 'Open the caption', 'right-start');
}

/**
 * Send Chat messages to peers in the room
 */
async function sendChatMessage() {
    if (!thereIsPeerConnections() && !isChatGPTOn) {
        cleanMessageInput();
        isChatPasteTxt = false;
        return userLog('info', "Can't send message, no participants in the room");
    }

    msgerInput.value = filterXSS(msgerInput.value.trim());
    const msg = checkMsg(msgerInput.value);

    // empty msg or
    if (!msg) {
        isChatPasteTxt = false;
        return cleanMessageInput();
    }

    isChatGPTOn ? await getChatGPTmessage(msg) : emitMsg(myPeerName, 'toAll', msg, false, myPeerId);
    appendMessage(myPeerName, rightChatAvatar, 'right', msg, false);
    cleanMessageInput();
}

/**
 * handle Incoming Data Channel Chat Messages
 * @param {object} dataMessage chat messages
 */
function handleDataChannelChat(dataMessage) {
    if (!dataMessage) return;

    // sanitize all params
    const msgFrom = filterXSS(dataMessage.from);
    const msgFromId = filterXSS(dataMessage.fromId);
    const msgTo = filterXSS(dataMessage.to);
    const msg = filterXSS(dataMessage.msg);
    const msgPrivate = filterXSS(dataMessage.privateMsg);
    const msgId = filterXSS(dataMessage.id);

    // We check if the message is from real peer
    const from_peer_name = allPeers[msgFromId]['peer_name'];
    if (from_peer_name != msgFrom) {
        console.log('Fake message detected', { realFrom: from_peer_name, fakeFrom: msgFrom, msg: msg });
        return;
    }

    // private message but not for me return
    if (msgPrivate && msgTo != myPeerName) return;

    console.log('handleDataChannelChat', dataMessage);

    // chat message for me also
    if (!isChatRoomVisible && showChatOnMessage) {
        showChatRoomDraggable();
        chatRoomBtn.className = className.chatOff;
    }
    // show message from
    if (!showChatOnMessage) {
        userLog('toast', `New message from: ${msgFrom}`);
    }

    playSound('chatMessage');
    setPeerChatAvatarImgName('left', msgFrom);
    appendMessage(msgFrom, leftChatAvatar, 'left', msg, msgPrivate, msgId);
}

/**
 * Clean input txt message
 */
function cleanMessageInput() {
    msgerInput.value = '';
    msgerInput.style.height = '15px';
}

/**
 * Paste from clipboard to input txt message
 */
function pasteToMessageInput() {
    navigator.clipboard
        .readText()
        .then((text) => {
            msgerInput.value += text;
            isChatPasteTxt = true;
            checkLineBreaks();
        })
        .catch((err) => {
            console.error('Failed to read clipboard contents: ', err);
        });
}

/**
 * Handle text transcript getting from peers
 * @param {object} config data
 */
function handleDataChannelSpeechTranscript(config) {
    handleSpeechTranscript(config);
}

/**
 * Handle text transcript getting from peers
 * @param {object} config data
 */
function handleSpeechTranscript(config) {
    if (!config) return;
    console.log('Handle speech transcript', config);

    config.text_data = filterXSS(config.text_data);
    config.peer_name = filterXSS(config.peer_name);

    const { peer_name, text_data } = config;

    const time_stamp = getFormatDate(new Date());
    const avatar_image = genAvatarSvg(peer_name, 32);

    if (!isCaptionBoxVisible) showCaptionDraggable();

    const msgHTML = `
	<div class="msg left-msg">
        <img class="msg-img" src="${avatar_image}" />
		<div class="msg-caption-bubble">
            <div class="msg-info">
                <div class="msg-info-name">${peer_name} : ${time_stamp}</div>
            </div>
            <div class="msg-text">${text_data}</div>
        </div>
	</div>
    `;
    captionChat.insertAdjacentHTML('beforeend', msgHTML);
    captionChat.scrollTop += 500;
    transcripts.push({
        time: time_stamp,
        name: peer_name,
        caption: text_data,
    });
    playSound('speech');
}

/**
 * Escape Special Chars
 * @param {string} regex string to replace
 */
function escapeSpecialChars(regex) {
    return regex.replace(/([()[{*+.$^\\|?])/g, '\\$1');
}

/**
 * Append Message to msger chat room
 * @param {string} from peer name
 * @param {string} img images url
 * @param {string} side left/right
 * @param {string} msg message to append
 * @param {boolean} privateMsg if is private message
 * @param {string} msgId peer id
 */
function appendMessage(from, img, side, msg, privateMsg, msgId = null) {
    let time = getFormatDate(new Date());

    // sanitize all params
    const getFrom = filterXSS(from);
    const getImg = filterXSS(img);
    const getSide = filterXSS(side);
    const getMsg = filterXSS(msg);
    const getPrivateMsg = filterXSS(privateMsg);
    const getMsgId = filterXSS(msgId);

    // collect chat msges to save it later
    chatMessages.push({
        time: time,
        from: getFrom,
        msg: getMsg,
        privateMsg: getPrivateMsg,
    });

    // check if i receive a private message
    let msgBubble = getPrivateMsg ? 'private-msg-bubble' : 'msg-bubble';

    let msgHTML = `
	<div id="msg-${chatMessagesId}" class="msg ${getSide}-msg">
        <img class="msg-img" src="${getImg}" />
		<div class=${msgBubble}>
            <div class="msg-info">
                <div class="msg-info-name">${getFrom}</div>
                <div class="msg-info-time">${time}</div>
            </div>
            <div id="${chatMessagesId}" class="msg-text">${getMsg}
                <hr/>
    `;
    // add btn direct reply to private message
    if (getPrivateMsg && getMsgId != null && getMsgId != myPeerId) {
        msgHTML += `
                <button 
                    class="${className.msgPrivate}"
                    id="msg-private-reply-${chatMessagesId}"
                    style="color:#fff; border:none; background:transparent;"
                    onclick="sendPrivateMsgToPeer('${myPeerId}','${getFrom}')"
                ></button>`;
    }
    msgHTML += `
                <button
                    id="msg-delete-${chatMessagesId}"
                    class="${className.trash}"
                    style="color:#fff; border:none; background:transparent;"
                    onclick="deleteMessage('msg-${chatMessagesId}')"
                ></button>
                <button
                    id="msg-copy-${chatMessagesId}"
                    class="${className.copy}" 
                    style="color:#fff; border:none; background:transparent;"
                    onclick="copyToClipboard('${chatMessagesId}')"
                ></button>
            </div>
        </div>
	</div>
    `;
    msgerChat.insertAdjacentHTML('beforeend', msgHTML);
    msgerChat.scrollTop += 500;
    setTippy(getId('msg-delete-' + chatMessagesId), 'Delete', 'top');
    setTippy(getId('msg-copy-' + chatMessagesId), 'Copy', 'top');
    setTippy(getId('msg-private-reply-' + chatMessagesId), 'Reply', 'top');
    chatMessagesId++;
}

/**
 * Delete message
 * @param {string} id msg id
 */
function deleteMessage(id) {
    playSound('newMessage');
    Swal.fire({
        background: swalBackground,
        position: 'center',
        title: 'Delete this messages?',
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
        // clean this message
        if (result.isConfirmed) {
            getId(id).remove();
            playSound('delete');
        }
    });
}

/**
 * Copy the element innerText on clipboard
 * @param {string} id
 */
function copyToClipboard(id) {
    const text = getId(id).innerText;
    navigator.clipboard
        .writeText(text)
        .then(() => {
            msgPopup('success', 'Message copied!', 'top-end', 1000);
        })
        .catch((err) => {
            msgPopup('error', err, 'top-end', 2000);
        });
}

/**
 * Add participants in the chat room lists
 * @param {object} peers all peers info connected to the same room
 */
async function msgerAddPeers(peers) {
    // console.log("peers", peers);
    // add all current Participants
    for (let peer_id in peers) {
        let peer_name = peers[peer_id]['peer_name'];
        // bypass insert to myself in the list :)
        if (peer_id != myPeerId && peer_name) {
            let exsistMsgerPrivateDiv = getId(peer_id + '_pMsgDiv');
            // if there isn't add it....
            if (!exsistMsgerPrivateDiv) {
                let avatarSvg = genAvatarSvg(peer_name, 24);
                let msgerPrivateDiv = `
                <div id="${peer_id}_pMsgDiv" class="msger-peer-inputarea">
                <img id="${peer_id}_pMsgAvatar" src="${avatarSvg}"> 
                    <textarea
                        rows="1"
                        cols="1"
                        id="${peer_id}_pMsgInput"
                        class="msger-input"
                        placeholder="Write private message..."
                    ></textarea>
                    <button id="${peer_id}_pMsgBtn" class="${className.msgPrivate}" value="${peer_name}"></button>
                </div>
                `;
                msgerCPList.insertAdjacentHTML('beforeend', msgerPrivateDiv);
                msgerCPList.scrollTop += 500;

                let msgerPrivateMsgInput = getId(peer_id + '_pMsgInput');
                let msgerPrivateBtn = getId(peer_id + '_pMsgBtn');
                addMsgerPrivateBtn(msgerPrivateBtn, msgerPrivateMsgInput, myPeerId);
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
        if (!msgerPeerInputarea[i].innerText.toLowerCase().includes(searchPeerBarName)) {
            msgerPeerInputarea[i].style.display = 'none';
        } else {
            msgerPeerInputarea[i].style.display = 'flex';
        }
    }
}

/**
 * Remove participant from chat room lists
 * @param {string} peer_id socket.id
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
 * @param {object} msgerPrivateBtn chat private message send button
 * @param {object} msgerPrivateMsgInput chat private message text input
 * @param {string} peerId chat peer_id
 */
function addMsgerPrivateBtn(msgerPrivateBtn, msgerPrivateMsgInput, peerId) {
    // add button to send private messages
    msgerPrivateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sendPrivateMessage();
    });

    // Number 13 is the "Enter" key on the keyboard
    msgerPrivateMsgInput.addEventListener('keyup', (e) => {
        if (e.keyCode === 13) {
            e.preventDefault();
            sendPrivateMessage();
        }
    });

    msgerPrivateMsgInput.onpaste = () => {
        isChatPasteTxt = true;
    };

    function sendPrivateMessage() {
        msgerPrivateMsgInput.value = filterXSS(msgerPrivateMsgInput.value.trim());
        const pMsg = checkMsg(msgerPrivateMsgInput.value);
        if (!pMsg) {
            msgerPrivateMsgInput.value = '';
            isChatPasteTxt = false;
            return;
        }
        // sanitization to prevent XSS
        msgerPrivateBtn.value = filterXSS(msgerPrivateBtn.value);
        myPeerName = filterXSS(myPeerName);

        if (isHtml(myPeerName) && isHtml(msgerPrivateBtn.value)) {
            msgerPrivateMsgInput.value = '';
            isChatPasteTxt = false;
            return;
        }

        const toPeerName = msgerPrivateBtn.value;
        emitMsg(myPeerName, toPeerName, pMsg, true, peerId);
        appendMessage(myPeerName, rightChatAvatar, 'right', pMsg + '<hr>Private message to ' + toPeerName, true);
        msgerPrivateMsgInput.value = '';
        msgerCP.style.display = 'none';
    }
}

/**
 * Check Message
 * @param {string} txt passed text
 * @returns {string} html format
 */
function checkMsg(txt) {
    const text = filterXSS(txt);
    if (text.trim().length == 0) return;
    if (isHtml(text)) return sanitizeHtml(text);
    if (isValidHttpURL(text)) {
        if (isImageURL(text)) return getImage(text);
        //if (isVideoTypeSupported(text)) return getIframe(text);
        return getLink(text);
    }
    if (isChatMarkdownOn) return marked.parse(text);
    if (isChatPasteTxt && getLineBreaks(text) > 1) {
        isChatPasteTxt = false;
        return getPre(text);
    }
    if (getLineBreaks(text) > 1) return getPre(text);
    console.log('CheckMsg', text);
    return text;
}

/**
 * Sanitize Html
 * @param {string} input code
 * @returns Html as string
 */
function sanitizeHtml(input) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;',
    };
    return input.replace(/[&<>"'/]/g, (m) => map[m]);
}

/**
 * Check if string contain html
 * @param {string} str
 * @returns
 */
function isHtml(str) {
    let a = document.createElement('div');
    a.innerHTML = str;
    for (let c = a.childNodes, i = c.length; i--; ) {
        if (c[i].nodeType == 1) return true;
    }
    return false;
}

/**
 * Check if valid URL
 * @param {string} str to check
 * @returns boolean true/false
 */
function isValidHttpURL(url) {
    const pattern = new RegExp(
        '^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$',
        'i',
    ); // fragment locator
    return pattern.test(url);
}

/**
 * Check if url passed is a image
 * @param {string} url to check
 * @returns {boolean} true/false
 */
function isImageURL(url) {
    return url.match(/\.(jpeg|jpg|gif|png|tiff|bmp)$/) != null;
}

/**
 * Get image
 * @param {string} text
 * @returns img
 */
function getImage(text) {
    const url = filterXSS(text);
    const div = document.createElement('div');
    const img = document.createElement('img');
    img.setAttribute('src', url);
    img.setAttribute('width', '200px');
    img.setAttribute('height', 'auto');
    div.appendChild(img);
    console.log('GetImg', div.firstChild.outerHTML);
    return div.firstChild.outerHTML;
}

/**
 * Get Link
 * @param {string} text
 * @returns a href
 */
function getLink(text) {
    const url = filterXSS(text);
    const a = document.createElement('a');
    const div = document.createElement('div');
    const linkText = document.createTextNode(url);
    a.setAttribute('href', url);
    a.setAttribute('target', '_blank');
    a.appendChild(linkText);
    div.appendChild(a);
    console.log('GetLink', div.firstChild.outerHTML);
    return div.firstChild.outerHTML;
}

/**
 * Get pre
 * @param {string} txt
 * @returns pre
 */
function getPre(txt) {
    const text = filterXSS(txt);
    const pre = document.createElement('pre');
    const div = document.createElement('div');
    pre.textContent = text;
    div.appendChild(pre);
    console.log('GetPre', div.firstChild.outerHTML);
    return div.firstChild.outerHTML;
}

/**
 * Get IFrame from URL
 * @param {string} text
 * @returns html iframe
 */
function getIframe(text) {
    const url = filterXSS(text);
    const iframe = document.createElement('iframe');
    const div = document.createElement('div');
    const is_youtube = getVideoType(url) == 'na' ? true : false;
    const video_audio_url = is_youtube ? getYoutubeEmbed(url) : url;
    iframe.setAttribute('title', 'Chat-IFrame');
    iframe.setAttribute('src', video_audio_url);
    iframe.setAttribute('width', 'auto');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute(
        'allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
    );
    iframe.setAttribute('allowfullscreen', 'allowfullscreen');
    div.appendChild(iframe);
    console.log('GetIFrame', div.firstChild.outerHTML);
    return div.firstChild.outerHTML;
}

/**
 * Get text Line breaks
 * @param {string} text
 * @returns integer lines
 */
function getLineBreaks(text) {
    return (text.match(/\n/g) || []).length;
}

/**
 * Check chat input line breaks and value length
 */
function checkLineBreaks() {
    msgerInput.style.height = '';
    if (getLineBreaks(msgerInput.value) > 0 || msgerInput.value.length > 50) {
        msgerInput.style.height = '200px';
    }
}

/**
 * Format date
 * @param {object} date
 * @returns {string} date format h:m:s
 */
function getFormatDate(date) {
    const time = date.toTimeString().split(' ')[0];
    return `${time}`;
}

/**
 * Send message over Secure dataChannels
 * @param {string} from peer name
 * @param {string} to peer name
 * @param {string} msg message to send
 * @param {boolean} privateMsg if is a private message
 * @param {string} id peer_id
 */
function emitMsg(from, to, msg, privateMsg, id) {
    if (!msg) return;

    // sanitize all params
    const getFrom = filterXSS(from);
    const getFromId = filterXSS(myPeerId);
    const getTo = filterXSS(to);
    const getMsg = filterXSS(msg);
    const getPrivateMsg = filterXSS(privateMsg);
    const getId = filterXSS(id);

    let chatMessage = {
        type: 'chat',
        from: getFrom,
        fromId: getFromId,
        id: getId,
        to: getTo,
        msg: getMsg,
        privateMsg: getPrivateMsg,
    };
    console.log('Send msg', chatMessage);
    sendToDataChannel(chatMessage);
}

/**
 * Read ChatGPT incoming message
 * https://platform.openai.com/docs/introduction
 * @param {string} msg
 */
async function getChatGPTmessage(msg) {
    console.log('Send ChatGPT message:', msg);
    signalingSocket
        .request('data', {
            room_id: roomId,
            peer_id: myPeerId,
            peer_name: myPeerName,
            method: 'getChatGPT',
            params: {
                time: getDataTimeString(),
                prompt: msg,
            },
        })
        .then(
            function (completion) {
                if (!completion) return;
                setPeerChatAvatarImgName('left', 'ChatGPT');
                appendMessage('ChatGPT', leftChatAvatar, 'left', completion, true);
                cleanMessageInput();
                playSound('message');
            }.bind(this),
        )
        .catch((err) => {
            console.log('ChatGPT error:', err);
        });
}

/**
 * Hide - Show emoji picker div
 */
function hideShowEmojiPicker() {
    if (!isChatEmojiVisible) {
        msgerEmojiPicker.style.display = 'block';
        msgerEmojiBtn.style.color = '#FFFF00';
        isChatEmojiVisible = true;
        return;
    }
    msgerEmojiPicker.style.display = 'none';
    msgerEmojiBtn.style.color = '#FFFFFF';
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
    playSound('download');
}

/**
 * Download Captions in json format
 * https://developer.mozilla.org/it/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
 */
function downloadCaptions() {
    let a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transcripts, null, 1));
    a.download = getDataTimeString() + roomId + '-CAPTIONS.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playSound('download');
}

/**
 * Hide - show my settings
 */
function hideShowMySettings() {
    if (!isMySettingsVisible) {
        playSound('newMessage');
        // adapt it for mobile
        if (isMobileDevice) {
            mySettings.style.setProperty('width', '100%');
            mySettings.style.setProperty('height', '100%');
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
 * @param {object} evt event
 * @param {string} tabName name of the tab to open
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
async function updateMyPeerName() {
    // myNewPeerName empty
    if (!myPeerNameSet.value) return;

    // check if peer name is already in use in the room
    if (await checkUserName(myPeerNameSet.value)) {
        myPeerNameSet.value = '';
        return userLog('warning', 'Username is already in use!');
    }

    // prevent xss execution itself
    myPeerNameSet.value = filterXSS(myPeerNameSet.value);

    // prevent XSS injection to remote peer
    if (isHtml(myPeerNameSet.value)) {
        myPeerNameSet.value = '';
        return userLog('warning', 'Invalid name!');
    }

    const myNewPeerName = myPeerNameSet.value;
    const myOldPeerName = myPeerName;

    myPeerName = myNewPeerName;
    myVideoParagraph.innerText = myPeerName + ' (me)';

    sendToServer('peerName', {
        room_id: roomId,
        peer_name_old: myOldPeerName,
        peer_name_new: myPeerName,
    });

    myPeerNameSet.value = '';
    myPeerNameSet.placeholder = myPeerName;

    window.localStorage.peer_name = myPeerName;

    setPeerAvatarImgName('myVideoAvatarImage', myPeerName);
    setPeerChatAvatarImgName('right', myPeerName);
    userLog('toast', 'My name changed to ' + myPeerName);
}

/**
 * Append updated peer name to video player
 * @param {object} config data
 */
function handlePeerName(config) {
    const { peer_id, peer_name } = config;
    const videoName = getId(peer_id + '_name');
    if (videoName) videoName.innerText = peer_name;
    // change also avatar and btn value - name on chat lists....
    const msgerPeerName = getId(peer_id + '_pMsgBtn');
    const msgerPeerAvatar = getId(peer_id + '_pMsgAvatar');
    if (msgerPeerName) msgerPeerName.value = peer_name;
    if (msgerPeerAvatar) msgerPeerAvatar.src = genAvatarSvg(peer_name, 32);
    // refresh also peer video avatar name
    setPeerAvatarImgName(peer_id + '_avatar', peer_name);
}

/**
 * Send my Video-Audio-Hand... status
 * @param {string} element typo
 * @param {boolean} status true/false
 */
async function emitPeerStatus(element, status) {
    sendToServer('peerStatus', {
        room_id: roomId,
        peer_name: myPeerName,
        peer_id: myPeerId,
        element: element,
        status: status,
    });
}

/**
 * Handle hide myself from room view
 * @param {boolean} isHideMeActive
 */
function handleHideMe(isHideMeActive) {
    const myVideoWrap = getId('myVideoWrap');
    const myVideoPinBtn = getId('myVideoPinBtn');
    if (isHideMeActive && isVideoPinned) myVideoPinBtn.click();
    myVideoWrap.style.display = isHideMeActive ? 'none' : 'inline-block';
    hideMeBtn.className = isHideMeActive ? className.hideMeOn : className.hideMeOff;
    hideMeBtn.style.color = isHideMeActive ? 'red' : 'black';
    isHideMeActive ? playSound('off') : playSound('on');
    if (Object.keys(peerConnections).length === 1) {
        resizeVideoMedia();
    }
}

/**
 * Set my Hand Status and Icon
 */
function setMyHandStatus() {
    if (myHandStatus) {
        // Raise hand
        myHandStatus = false;
        setTippy(myHandBtn, 'Raise your hand', 'right-start');
    } else {
        // Lower hand
        myHandStatus = true;
        setTippy(myHandBtn, 'Lower your hand', 'right-start');
        playSound('raiseHand');
    }
    myHandStatusIcon.style.display = myHandStatus ? 'inline' : 'none';
    emitPeerStatus('hand', myHandStatus);
}

/**
 * Set My Audio Status Icon and Title
 * @param {boolean} status of my audio
 */
function setMyAudioStatus(status) {
    myAudioStatusIcon.className = status ? className.audioOn : className.audioOff;
    // send my audio status to all peers in the room
    emitPeerStatus('audio', status);
    setTippy(myAudioStatusIcon, status ? 'My audio is on' : 'My audio is off', 'bottom');
    setTippy(audioBtn, status ? 'Stop the audio' : 'Start the audio', 'right-start');
    status ? playSound('on') : playSound('off');
    console.log('My audio status', status);
}

/**
 * Set My Video Status Icon and Title
 * @param {boolean} status of my video
 */
function setMyVideoStatus(status) {
    // on vdeo OFF display my video avatar name
    if (myVideoAvatarImage) myVideoAvatarImage.style.display = status ? 'none' : 'block';
    if (myVideoStatusIcon) myVideoStatusIcon.className = status ? className.videoOn : className.videoOff;
    // send my video status to all peers in the room
    emitPeerStatus('video', status);
    if (!isMobileDevice) {
        if (myVideoStatusIcon) setTippy(myVideoStatusIcon, status ? 'My video is on' : 'My video is off', 'bottom');
        setTippy(videoBtn, status ? 'Stop the video' : 'Start the video', 'right-start');
    }
    status ? playSound('on') : playSound('off');
    console.log('My video status', status);
}

/**
 * Handle peer audio - video - hand - privacy status
 * @param {object} config data
 */
function handlePeerStatus(config) {
    //
    const { peer_id, peer_name, element, status } = config;

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
        case 'privacy':
            setVideoPrivacyStatus(peer_id + '_video', status);
            break;
    }
}

/**
 * Set Participant Hand Status Icon and Title
 * @param {string} peer_id socket.id
 * @param {string} peer_name peer name
 * @param {boolean} status of the hand
 */
function setPeerHandStatus(peer_id, peer_name, status) {
    let peerHandStatus = getId(peer_id + '_handStatus');
    peerHandStatus.style.display = status ? 'inline' : 'none';
    if (status) {
        userLog('toast', `${icons.user} ${peer_name} \n has raised the hand!`);
        playSound('raiseHand');
    }
}

/**
 * Set Participant Audio Status Icon and Title
 * @param {string} peer_id socket.id
 * @param {boolean} status of peer audio
 */
function setPeerAudioStatus(peer_id, status) {
    let peerAudioStatus = getId(peer_id + '_audioStatus');
    if (peerAudioStatus) {
        peerAudioStatus.className = status ? className.audioOn : className.audioOff;
        setTippy(peerAudioStatus, status ? 'Participant audio is on' : 'Participant audio is off', 'bottom');
        status ? playSound('on') : playSound('off');
    }
}

/**
 * Handle Peer audio volume 0/100
 * @param {string} audioVolumeId audio volume input id
 * @param {string} mediaId media id
 */
function handleAudioVolume(audioVolumeId, mediaId) {
    let media = getId(mediaId);
    let audioVolume = getId(audioVolumeId);
    if (audioVolume && media) {
        audioVolume.style.maxWidth = '40px';
        audioVolume.style.display = 'inline';
        audioVolume.style.cursor = 'pointer';
        audioVolume.value = 100;
        audioVolume.addEventListener('input', () => {
            media.volume = audioVolume.value / 100;
        });
    }
}

/**
 * Mute Audio to specific user in the room
 * @param {string} peer_id socket.id
 */
function handlePeerAudioBtn(peer_id) {
    if (!buttons.remote.audioBtnClickAllowed) return;
    let peerAudioBtn = getId(peer_id + '_audioStatus');
    peerAudioBtn.onclick = () => {
        if (peerAudioBtn.className === className.audioOn) disablePeer(peer_id, 'audio');
    };
}

/**
 * Hide Video to specified peer in the room
 * @param {string} peer_id socket.id
 */
function handlePeerVideoBtn(peer_id) {
    if (!useVideo || !buttons.remote.videoBtnClickAllowed) return;
    let peerVideoBtn = getId(peer_id + '_videoStatus');
    peerVideoBtn.onclick = () => {
        if (peerVideoBtn.className === className.videoOn) disablePeer(peer_id, 'video');
    };
}

/**
 * Send Private Message to specific peer
 * @param {string} peer_id socket.id
 * @param {string} toPeerName peer name to send message
 */
function handlePeerPrivateMsg(peer_id, toPeerName) {
    let peerPrivateMsg = getId(peer_id + '_privateMsg');
    peerPrivateMsg.onclick = (e) => {
        e.preventDefault();
        sendPrivateMsgToPeer(myPeerId, toPeerName);
    };
}

/**
 * Send Private messages to peers
 * @param {string} toPeerId
 * @param {string} toPeerName
 */
function sendPrivateMsgToPeer(toPeerId, toPeerName) {
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
            result.value = filterXSS(result.value);
            let pMsg = checkMsg(result.value);
            if (!pMsg) {
                isChatPasteTxt = false;
                return;
            }
            emitMsg(myPeerName, toPeerName, pMsg, true, toPeerId);
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
}

/**
 * Handle peer send file
 * @param {string} peer_id
 */
function handlePeerSendFile(peer_id) {
    let peerFileSendBtn = getId(peer_id + '_shareFile');
    peerFileSendBtn.onclick = () => {
        selectFileToShare(peer_id);
    };
}

/**
 * Send video - audio URL to specific peer
 * @param {string} peer_id socket.id
 */
function handlePeerVideoAudioUrl(peer_id) {
    let peerYoutubeBtn = getId(peer_id + '_videoAudioUrl');
    peerYoutubeBtn.onclick = () => {
        sendVideoUrl(peer_id);
    };
}

/**
 * Set Participant Video Status Icon and Title
 * @param {string} peer_id socket.id
 * @param {boolean} status of peer video
 */
function setPeerVideoStatus(peer_id, status) {
    let peerVideoAvatarImage = getId(peer_id + '_avatar');
    let peerVideoStatus = getId(peer_id + '_videoStatus');
    if (peerVideoAvatarImage) peerVideoAvatarImage.style.display = status ? 'none' : 'block';
    if (peerVideoStatus) {
        peerVideoStatus.className = status ? className.videoOn : className.videoOff;
        setTippy(peerVideoStatus, status ? 'Participant video is on' : 'Participant video is off', 'bottom');
        status ? playSound('on') : playSound('off');
    }
}

/**
 * Emit actions to all peers in the same room except yourself
 * @param {object} peerAction to all peers
 */
async function emitPeersAction(peerAction) {
    if (!thereIsPeerConnections()) return;

    sendToServer('peerAction', {
        room_id: roomId,
        peer_name: myPeerName,
        peer_id: myPeerId,
        peer_uuid: myPeerUUID,
        peer_use_video: useVideo,
        peer_action: peerAction,
        send_to_all: true,
    });
}

/**
 * Emit actions to specified peer in the same room
 * @param {string} peer_id socket.id
 * @param {object} peerAction to specified peer
 */
async function emitPeerAction(peer_id, peerAction) {
    if (!thereIsPeerConnections()) return;

    sendToServer('peerAction', {
        room_id: roomId,
        peer_id: peer_id,
        peer_use_video: useVideo,
        peer_name: myPeerName,
        peer_action: peerAction,
        send_to_all: false,
    });
}

/**
 * Handle received peer actions
 * @param {object} config data
 */
function handlePeerAction(config) {
    // console.log('Handle peer action: ', config);
    const { peer_id, peer_name, peer_use_video, peer_action } = config;

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
        case 'screenStart':
            handleScreenStart(peer_id);
            break;
        case 'screenStop':
            handleScreenStop(peer_id, peer_use_video);
            break;
        case 'ejectAll':
            handleKickedOut(config);
            break;
    }
}

/**
 * Handle Screen Start
 * @param {string} peer_id
 */
function handleScreenStart(peer_id) {
    let remoteVideoAvatarImage = getId(peer_id + '_avatar');
    let remoteVideoStatusBtn = getId(peer_id + '_videoStatus');
    let remoteVideoStream = getId(peer_id + '_video');
    if (remoteVideoStatusBtn) {
        remoteVideoStatusBtn.className = className.videoOn;
        setTippy(remoteVideoStatusBtn, 'Participant screen share is on', 'bottom');
    }
    if (remoteVideoStream) {
        getId(peer_id + '_pinUnpin').click();
        remoteVideoStream.style.objectFit = 'contain';
        remoteVideoStream.style.name = peer_id + '_typeScreen';
    }
    if (remoteVideoAvatarImage) {
        remoteVideoAvatarImage.style.display = 'none';
    }
}

/**
 * Handle Screen Stop
 * @param {string} peer_id
 * @param {boolean} peer_use_video
 */
function handleScreenStop(peer_id, peer_use_video) {
    let remoteVideoStream = getId(peer_id + '_video');
    let remoteVideoAvatarImage = getId(peer_id + '_avatar');
    let remoteVideoStatusBtn = getId(peer_id + '_videoStatus');
    if (remoteVideoStatusBtn) {
        remoteVideoStatusBtn.className = className.videoOff;
        setTippy(remoteVideoStatusBtn, 'Participant screen share is off', 'bottom');
    }
    if (remoteVideoStream) {
        if (isVideoPinned) getId(peer_id + '_pinUnpin').click();
        remoteVideoStream.style.objectFit = 'var(--video-object-fit)';
        remoteVideoStream.style.name = peer_id + '_typeCam';
        adaptAspectRatio();
    }
    if (remoteVideoAvatarImage && remoteVideoStream && !peer_use_video) {
        remoteVideoAvatarImage.style.display = 'block';
        remoteVideoStream.srcObject.getVideoTracks().forEach((track) => {
            track.enabled = false;
        });
    } else {
        if (remoteVideoAvatarImage) {
            remoteVideoAvatarImage.style.display = 'none';
        }
    }
}

/**
 * Set my Audio off and Popup the peer name that performed this action
 * @param {string} peer_name peer name
 */
function setMyAudioOff(peer_name) {
    if (myAudioStatus === false || !useAudio) return;
    localMediaStream.getAudioTracks()[0].enabled = false;
    myAudioStatus = localMediaStream.getAudioTracks()[0].enabled;
    audioBtn.className = className.audioOff;
    setMyAudioStatus(myAudioStatus);
    userLog('toast', `${icons.user} ${peer_name} \n has disabled your audio`);
    playSound('off');
}

/**
 * Set my Audio on and Popup the peer name that performed this action
 * @param {string} peer_name peer name
 */
function setMyAudioOn(peer_name) {
    if (myAudioStatus === true || !useAudio) return;
    localMediaStream.getAudioTracks()[0].enabled = true;
    myAudioStatus = localMediaStream.getAudioTracks()[0].enabled;
    audioBtn.className = className.audioOn;
    setMyAudioStatus(myAudioStatus);
    userLog('toast', `${icons.user} ${peer_name} \n has enabled your audio`);
    playSound('on');
}

/**
 * Set my Video off and Popup the peer name that performed this action
 * @param {string} peer_name peer name
 */
function setMyVideoOff(peer_name) {
    if (!useVideo) return;
    //if (myVideoStatus === false || !useVideo) return;
    localMediaStream.getVideoTracks()[0].enabled = false;
    myVideoStatus = localMediaStream.getVideoTracks()[0].enabled;
    videoBtn.className = className.videoOff;
    setMyVideoStatus(myVideoStatus);
    userLog('toast', `${icons.user} ${peer_name} \n has disabled your video`);
    playSound('off');
}

/**
 * Mute or Hide everyone except yourself
 * @param {string} element type audio/video
 */
function disableAllPeers(element) {
    if (!thereIsPeerConnections()) {
        return userLog('info', 'No participants detected');
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
 * Eject all participants in the room expect yourself
 */
function ejectEveryone() {
    if (!thereIsPeerConnections()) {
        return userLog('info', 'No participants detected');
    }
    Swal.fire({
        background: swalBackground,
        imageUrl: kickedOutImg,
        position: 'center',
        title: 'Eject everyone except yourself?',
        text: 'Are you sure to want eject all participants from the room?',
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
            emitPeersAction('ejectAll');
        }
    });
}

/**
 * Mute or Hide specific peer
 * @param {string} peer_id socket.id
 * @param {string} element type audio/video
 */
function disablePeer(peer_id, element) {
    if (!thereIsPeerConnections()) {
        return userLog('info', 'No participants detected');
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
 * Handle Room action
 * @param {object} config data
 * @param {boolean} emit data to signaling server
 */
function handleRoomAction(config, emit = false) {
    const { action } = config;
    if (emit) {
        const thisConfig = {
            room_id: roomId,
            peer_id: myPeerId,
            peer_name: myPeerName,
            peer_uuid: myPeerUUID,
            action: action,
            password: null,
        };
        switch (action) {
            case 'lock':
                playSound('newMessage');

                Swal.fire({
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showDenyButton: true,
                    background: swalBackground,
                    imageUrl: roomLockedImg,
                    input: 'text',
                    inputPlaceholder: 'Set Room password',
                    confirmButtonText: `OK`,
                    denyButtonText: `Cancel`,
                    showClass: {
                        popup: 'animate__animated animate__fadeInDown',
                    },
                    hideClass: {
                        popup: 'animate__animated animate__fadeOutUp',
                    },
                    inputValidator: (pwd) => {
                        if (!pwd) return 'Please enter the Room password';
                        thisRoomPassword = pwd;
                    },
                }).then((result) => {
                    if (result.isConfirmed) {
                        thisConfig.password = thisRoomPassword;
                        sendToServer('roomAction', thisConfig);
                        handleRoomStatus(thisConfig);
                    }
                });
                break;
            case 'unlock':
                sendToServer('roomAction', thisConfig);
                handleRoomStatus(thisConfig);
                break;
        }
    } else {
        // data coming from signaling server
        handleRoomStatus(config);
    }
}

/**
 * Handle room status
 * @param {object} config data
 */
function handleRoomStatus(config) {
    const { action, peer_name, password } = config;

    switch (action) {
        case 'lock':
            playSound('locked');
            userLog('toast', `${icons.user} ${peer_name} \n has 🔒 LOCKED the room by password`, 'top-end');
            elemDisplay(lockRoomBtn, false);
            elemDisplay(unlockRoomBtn, true);
            isRoomLocked = true;
            break;
        case 'unlock':
            userLog('toast', `${icons.user} ${peer_name} \n has 🔓 UNLOCKED the room`, 'top-end');
            elemDisplay(unlockRoomBtn, false);
            elemDisplay(lockRoomBtn, true);
            isRoomLocked = false;
            break;
        case 'checkPassword':
            isRoomLocked = true;
            password == 'OK' ? joinToChannel() : handleRoomLocked();
            break;
    }
}

/**
 * Room is locked you provide a wrong password, can't access!
 */
function handleRoomLocked() {
    playSound('eject');

    console.log('Room is Locked, try with another one');
    Swal.fire({
        allowOutsideClick: false,
        background: swalBackground,
        position: 'center',
        imageUrl: roomLockedImg,
        title: 'Oops, Wrong Room Password',
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
        if (result.isConfirmed) openURL('/newcall');
    });
}

/**
 * Try to unlock the room by providing a valid password
 */
function handleUnlockTheRoom() {
    playSound('alert');

    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: swalBackground,
        imageUrl: roomLockedImg,
        title: 'Oops, Room is Locked',
        input: 'text',
        inputPlaceholder: 'Enter the Room password',
        confirmButtonText: `OK`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
        inputValidator: (pwd) => {
            if (!pwd) return 'Please enter the Room password';
            thisRoomPassword = pwd;
        },
    }).then(() => {
        const config = {
            room_id: roomId,
            peer_name: myPeerName,
            action: 'checkPassword',
            password: thisRoomPassword,
        };
        sendToServer('roomAction', config);
        elemDisplay(lockRoomBtn, false);
        elemDisplay(unlockRoomBtn, true);
    });
}

/**
 * Handle whiteboard toogle
 */
function handleWhiteboardToggle() {
    thereIsPeerConnections() ? whiteboardAction(getWhiteboardAction('toggle')) : toggleWhiteboard();
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
 * @param {string} w width
 * @param {string} h height
 */
function setWhiteboardSize(w, h) {
    document.documentElement.style.setProperty('--wb-width', w);
    document.documentElement.style.setProperty('--wb-height', h);
}

/**
 * Set whiteboard background color
 * @param {string} color whiteboard bg
 */
function setWhiteboardBgColor(color) {
    const config = {
        room_id: roomId,
        peer_name: myPeerName,
        action: 'bgcolor',
        color: color,
    };
    whiteboardAction(config);
}

/**
 * Whiteboard: drawing mode
 * @param {boolean} status of drawing mode
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
 * @param {boolean} status if eraser on
 */
function whiteboardIsEraser(status) {
    whiteboardIsDrawingMode(false);
    wbIsEraser = status;
    setColor(whiteboardEraserBtn, wbIsEraser ? 'green' : 'white');
}

/**
 * Set color to specific element
 * @param {object} elem element
 * @param {string} color to set
 */
function setColor(elem, color) {
    elem.style.color = color;
}

/**
 * Whiteboard: Add object to canvas
 * @param {string} type of object to add
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
                showClass: {
                    popup: 'animate__animated animate__fadeInDown',
                },
                hideClass: {
                    popup: 'animate__animated animate__fadeOutUp',
                },
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
                title: 'Select image',
                input: 'file',
                inputAttributes: {
                    accept: wbImageInput,
                    'aria-label': 'Select image',
                },
                showDenyButton: true,
                confirmButtonText: `OK`,
                denyButtonText: `Cancel`,
                showClass: {
                    popup: 'animate__animated animate__fadeInDown',
                },
                hideClass: {
                    popup: 'animate__animated animate__fadeOutUp',
                },
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
            const text = new fabric.IText('Lorem Ipsum', {
                top: 0,
                left: 0,
                fontFamily: 'Comfortaa',
                fill: wbCanvas.freeDrawingBrush.color,
                strokeWidth: wbCanvas.freeDrawingBrush.width,
                stroke: wbCanvas.freeDrawingBrush.color,
            });
            addWbCanvasObj(text);
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
        case 'triangle':
            const triangle = new fabric.Triangle({
                top: 0,
                left: 0,
                width: 150,
                height: 100,
                fill: 'transparent',
                stroke: wbCanvas.freeDrawingBrush.color,
                strokeWidth: wbCanvas.freeDrawingBrush.width,
            });
            addWbCanvasObj(triangle);
            break;
        default:
            break;
    }
}

/**
 * Whiteboard: add object
 * @param {object} obj to add
 */
function addWbCanvasObj(obj) {
    if (obj) {
        wbCanvas.add(obj).setActiveObject(obj);
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
 * @param {object} e event
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
    } else {
        wbCanvas.hoverCursor = 'move';
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
 * @param {string} color to set
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
    playSound('ok');
}

/**
 * Whiteboard: save data to file
 * @param {object} dataURL to download
 * @param {string} fileName to save
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
        const config = {
            room_id: roomId,
            wbCanvasJson: JSON.stringify(wbCanvas.toJSON()),
        };
        sendToServer('wbCanvasToJson', config);
    }
}

/**
 * If whiteboard opened, update canvas to all peers connected
 */
async function wbUpdate() {
    if (wbIsOpen && thereIsPeerConnections()) wbCanvasToJson();
}

/**
 * Whiteboard: json to canvas objects
 * @param {object} config data
 */
function handleJsonToWbCanvas(config) {
    if (!wbIsOpen) toggleWhiteboard();

    wbCanvas.loadFromJSON(config.wbCanvasJson);
    wbCanvas.renderAll();
}

/**
 * Whiteboard: actions
 * @param {string} action whiteboard action
 * @returns {object} data
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
            playSound('delete');
        }
    });
}

/**
 * Whiteboard: actions
 * @param {object} config data
 */
function whiteboardAction(config) {
    if (thereIsPeerConnections()) {
        sendToServer('whiteboardAction', config);
    }
    handleWhiteboardAction(config, false);
}

/**
 * Whiteboard: handle actions
 * @param {object} config data
 * @param {boolean} logMe popup action
 */
function handleWhiteboardAction(config, logMe = true) {
    const { peer_name, action, color } = config;

    if (logMe) {
        userLog('toast', `${icons.user} ${peer_name} \n whiteboard action: ${action}`);
    }
    switch (action) {
        case 'bgcolor':
            wbCanvasBackgroundColor(color);
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
        case 'toggle':
            toggleWhiteboard();
            break;
        //...
    }
}

/**
 * Create File Sharing Data Channel
 * @param {string} peer_id socket.id
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
 * @param {object} data received
 */
function handleDataChannelFileSharing(data) {
    if (!receiveInProgress) return;
    receiveBuffer.push(data);
    receivedSize += data.byteLength;
    receiveProgress.value = receivedSize;
    receiveFilePercentage.innerText =
        'Receive progress: ' + ((receivedSize / incomingFileInfo.file.fileSize) * 100).toFixed(2) + '%';
    if (receivedSize === incomingFileInfo.file.fileSize) {
        receiveFileDiv.style.display = 'none';
        incomingFileData = receiveBuffer;
        receiveBuffer = [];
        endDownload();
    }
}

/**
 * Send File Data trought datachannel
 * https://webrtc.github.io/samples/src/content/datachannel/filetransfer/
 * https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js
 *
 * @param {string} peer_id peer id
 * @param {boolean} broadcast sent to all or not
 */
function sendFileData(peer_id, broadcast) {
    console.log('Send file ' + fileToSend.name + ' size ' + bytesToSize(fileToSend.size) + ' type ' + fileToSend.type);

    sendInProgress = true;

    sendFileInfo.innerText =
        'File name: ' +
        fileToSend.name +
        '\n' +
        'File type: ' +
        fileToSend.type +
        '\n' +
        'File size: ' +
        bytesToSize(fileToSend.size) +
        '\n';

    sendFileDiv.style.display = 'inline';
    sendProgress.max = fileToSend.size;
    fileReader = new FileReader();
    let offset = 0;

    fileReader.addEventListener('error', (err) => console.error('fileReader error', err));
    fileReader.addEventListener('abort', (e) => console.log('fileReader aborted', e));
    fileReader.addEventListener('load', (e) => {
        if (!sendInProgress) return;

        // peer to peer over DataChannels
        let data = {
            peer_id: peer_id,
            broadcast: broadcast,
            fileData: e.target.result,
        };
        sendFSData(data);
        offset += data.fileData.byteLength;

        sendProgress.value = offset;
        sendFilePercentage.innerText = 'Send progress: ' + ((offset / fileToSend.size) * 100).toFixed(2) + '%';

        // send file completed
        if (offset === fileToSend.size) {
            sendInProgress = false;
            sendFileDiv.style.display = 'none';
            userLog('success', 'The file ' + fileToSend.name + ' was sent successfully.');
        }

        if (offset < fileToSend.size) readSlice(offset);
    });
    const readSlice = (o) => {
        for (let peer_id in fileDataChannels) {
            // https://stackoverflow.com/questions/71285807/i-am-trying-to-share-a-file-over-webrtc-but-after-some-time-it-stops-and-log-rt
            if (fileDataChannels[peer_id].bufferedAmount > fileDataChannels[peer_id].bufferedAmountLowThreshold) {
                fileDataChannels[peer_id].onbufferedamountlow = () => {
                    fileDataChannels[peer_id].onbufferedamountlow = null;
                    readSlice(0);
                };
                return;
            }
        }
        const slice = fileToSend.slice(offset, o + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    };
    readSlice(0);
}

/**
 * Send File through RTC Data Channels
 * @param {object} data to sent
 */
function sendFSData(data) {
    let broadcast = data.broadcast;
    let peer_id_to_send = data.peer_id;
    if (broadcast) {
        // send to all peers
        for (let peer_id in fileDataChannels) {
            if (fileDataChannels[peer_id].readyState === 'open') fileDataChannels[peer_id].send(data.fileData);
        }
    } else {
        // send to peer
        for (let peer_id in fileDataChannels) {
            if (peer_id_to_send == peer_id && fileDataChannels[peer_id].readyState === 'open') {
                fileDataChannels[peer_id].send(data.fileData);
            }
        }
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
    receiveInProgress = false;
    receiveFileDiv.style.display = 'none';
    console.log('File transfer aborted');
    userLog('toast', '⚠️ File transfer aborted');
}

/**
 * Hide incoming file transfer
 */
function hideFileTransfer() {
    receiveFileDiv.style.display = 'none';
}

/**
 * Select the File to Share
 * @param {string} peer_id
 * @param {boolean} broadcast send to all (default false)
 */
function selectFileToShare(peer_id, broadcast = false) {
    playSound('newMessage');

    Swal.fire({
        allowOutsideClick: false,
        background: swalBackground,
        imageAlt: 'mirotalk-file-sharing',
        imageUrl: fileSharingImg,
        position: 'center',
        title: 'Share file',
        input: 'file',
        inputAttributes: {
            accept: fileSharingInput,
            'aria-label': 'Select file',
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
            sendFileInformations(result.value, peer_id, broadcast);
        }
    });
}

/**
 * Send file informations
 * @param {object} file data
 * @param {string} peer_id
 * @param {boolean} broadcast send to all (default false)
 * @returns
 */
function sendFileInformations(file, peer_id, broadcast = false) {
    fileToSend = file;
    // check if valid
    if (fileToSend && fileToSend.size > 0) {
        // no peers in the room
        if (!thereIsPeerConnections()) {
            return userLog('info', 'No participants detected');
        }

        // prevent XSS injection to remote peer (fileToSend.name is read only)
        if (isHtml(fileToSend.name) || !isValidFileName(fileToSend.name))
            return userLog('warning', 'Invalid file name!');

        const fileInfo = {
            room_id: roomId,
            broadcast: broadcast,
            peer_name: myPeerName,
            peer_id: peer_id,
            file: {
                fileName: fileToSend.name,
                fileSize: fileToSend.size,
                fileType: fileToSend.type,
            },
        };

        // keep trace of sent file in chat
        appendMessage(
            myPeerName,
            rightChatAvatar,
            'right',
            `${icons.fileSend} File send: 
            <br/> 
            <ul>
                <li>Name: ${fileToSend.name}</li>
                <li>Size: ${bytesToSize(fileToSend.size)}</li>
            </ul>`,
            false,
        );

        // send some metadata about our file to peers in the room
        sendToServer('fileInfo', fileInfo);

        // send the File
        setTimeout(() => {
            sendFileData(peer_id, broadcast);
        }, 1000);
    } else {
        userLog('error', 'File dragged not valid or empty.');
    }
}

/**
 * Html Json pretty print
 * @param {object} obj
 * @returns html pre json
 */
function toHtmlJson(obj) {
    return '<pre>' + JSON.stringify(obj, null, 4) + '</pre>';
}

/**
 * Get remote file info
 * @param {object} config data
 */
function handleFileInfo(config) {
    incomingFileInfo = config;
    incomingFileData = [];
    receiveBuffer = [];
    receivedSize = 0;
    let fileToReceiveInfo =
        'From: ' +
        incomingFileInfo.peer_name +
        '\n' +
        'Incoming file: ' +
        incomingFileInfo.file.fileName +
        '\n' +
        'File size: ' +
        bytesToSize(incomingFileInfo.file.fileSize) +
        '\n' +
        'File type: ' +
        incomingFileInfo.file.fileType;
    console.log(fileToReceiveInfo);
    // generate chat avatar by peer_name
    setPeerChatAvatarImgName('left', incomingFileInfo.peer_name);
    // keep track of received file on chat
    appendMessage(
        incomingFileInfo.peer_name,
        leftChatAvatar,
        'left',
        `${icons.fileReceive} File receive: 
        <br/> 
        <ul>
            <li>From: ${incomingFileInfo.peer_name}</li>
            <li>Name: ${incomingFileInfo.file.fileName}</li>
            <li>Size: ${bytesToSize(incomingFileInfo.file.fileSize)}</li>
        </ul>`,
        !incomingFileInfo.broadcast,
        incomingFileInfo.peer_id,
    );
    receiveFileInfo.innerText = fileToReceiveInfo;
    receiveFileDiv.style.display = 'inline';
    receiveProgress.max = incomingFileInfo.file.fileSize;
    receiveInProgress = true;
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
    const file = incomingFileInfo.file.fileName;

    incomingFileData = [];

    // if file is image, show the preview
    if (isImageURL(incomingFileInfo.file.fileName)) {
        const reader = new FileReader();
        reader.onload = (e) => {
            Swal.fire({
                allowOutsideClick: false,
                background: swalBackground,
                position: 'center',
                title: 'Received file',
                text: incomingFileInfo.file.fileName + ' size ' + bytesToSize(incomingFileInfo.file.fileSize),
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
            text: incomingFileInfo.file.fileName + ' size ' + bytesToSize(incomingFileInfo.file.fileSize),
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
 * @param {object} blob content
 * @param {string} file to save
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
 * @param {string} peer_id socket.id
 */
function sendVideoUrl(peer_id = null) {
    playSound('newMessage');

    Swal.fire({
        background: swalBackground,
        position: 'center',
        imageUrl: videoAudioShare,
        title: 'Share a Video or Audio',
        text: 'Paste a Video or audio URL',
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
            result.value = filterXSS(result.value);
            if (!thereIsPeerConnections()) {
                return userLog('info', 'No participants detected');
            }
            console.log('Video URL: ' + result.value);
            /*
                https://www.youtube.com/watch?v=RT6_Id5-7-s
                http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
                https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3
            */
            if (!isVideoTypeSupported(result.value)) {
                return userLog('warning', 'Something wrong, try with another Video or audio URL');
            }
            const is_youtube = getVideoType(result.value) == 'na' ? true : false;
            const video_url = is_youtube ? getYoutubeEmbed(result.value) : result.value;
            const config = {
                peer_id: peer_id,
                video_src: video_url,
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
    console.log('Open video Player', config);
    const videoSrc = config.video_src;
    const videoType = getVideoType(videoSrc);
    const videoEmbed = getYoutubeEmbed(videoSrc);
    console.log('Video embed', videoEmbed);
    //
    if (!isVideoUrlPlayerOpen) {
        if (videoEmbed) {
            playSound('newMessage');
            console.log('Load element type: iframe');
            videoUrlIframe.src = videoEmbed;
            videoUrlCont.style.display = 'flex';
            isVideoUrlPlayerOpen = true;
        } else {
            playSound('newMessage');
            console.log('Load element type: Video');
            videoAudioUrlCont.style.display = 'flex';
            videoAudioUrlElement.setAttribute('src', videoSrc);
            videoAudioUrlElement.type = videoType;
            if (videoAudioUrlElement.type == 'video/mp3') {
                videoAudioUrlElement.poster = audioGif;
            }
            isVideoUrlPlayerOpen = true;
        }
    } else {
        // video player seems open
        if (videoEmbed) {
            videoUrlIframe.src = videoEmbed;
        } else {
            videoAudioUrlElement.src = videoSrc;
        }
    }
}

/**
 * Get video type
 * @param {string} url
 * @returns string video type
 */
function getVideoType(url) {
    if (url.endsWith('.mp4')) return 'video/mp4';
    if (url.endsWith('.mp3')) return 'video/mp3';
    if (url.endsWith('.webm')) return 'video/webm';
    if (url.endsWith('.ogg')) return 'video/ogg';
    return 'na';
}

/**
 * Check if video URL is supported
 * @param {string} url
 * @returns boolean true/false
 */
function isVideoTypeSupported(url) {
    if (
        url.endsWith('.mp4') ||
        url.endsWith('.mp3') ||
        url.endsWith('.webm') ||
        url.endsWith('.ogg') ||
        url.includes('youtube.com')
    )
        return true;
    return false;
}

/**
 * Get youtube embed URL
 * @param {string} url of YouTube video
 * @returns {string} YouTube Embed URL
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
    console.log('Close video Player', {
        videoUrlIframe: videoUrlIframe.src,
        videoAudioUrlElement: videoAudioUrlElement.src,
    });
    if (videoUrlIframe.src != '') videoUrlIframe.setAttribute('src', '');
    if (videoAudioUrlElement.src != '') videoAudioUrlElement.setAttribute('src', '');
    videoUrlCont.style.display = 'none';
    videoAudioUrlCont.style.display = 'none';
    isVideoUrlPlayerOpen = false;
}

/**
 * Emit video palyer to peers
 * @param {string} video_action type
 * @param {object} config data
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
 * @param {object} config data
 */
function handleVideoPlayer(config) {
    const { peer_name, video_action } = config;
    //
    switch (video_action) {
        case 'open':
            userLog('toast', `${icons.user} ${peer_name} \n open video player`);
            openVideoUrlPlayer(config);
            break;
        case 'close':
            userLog('toast', `${icons.user} ${peer_name} \n close video player`);
            closeVideoUrlPlayer();
            break;
    }
}

/**
 * Handle peer kick out event button
 * @param {string} peer_id socket.id
 */
function handlePeerKickOutBtn(peer_id) {
    if (!buttons.remote.showKickOutBtn) return;
    let peerKickOutBtn = getId(peer_id + '_kickOut');
    peerKickOutBtn.addEventListener('click', (e) => {
        kickOut(peer_id);
    });
}

/**
 * Eject peer, confirm before
 * @param {string} peer_id socket.id
 */
function kickOut(peer_id) {
    let pName = getId(peer_id + '_name').innerText;

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
                peer_uuid: myPeerUUID,
                peer_name: myPeerName,
            });
        }
    });
}

/**
 * You will be kicked out from the room and popup the peer name that performed this action
 * @param {object} config data
 */
function handleKickedOut(config) {
    signalingSocket.disconnect();

    const { peer_name } = config;

    playSound('eject');

    let timerInterval;

    Swal.fire({
        allowOutsideClick: false,
        background: swalBackground,
        position: 'center',
        imageUrl: kickedOutImg,
        title: 'Kicked out!',
        html:
            `<h2 style="color: #FF2D00;">` +
            `User ` +
            peer_name +
            `</h2> will kick out you after <b style="color: #FF2D00;"></b> milliseconds.`,
        timer: 5000,
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
        checkRecording();
        openURL('/newcall');
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
        title: '<strong>WebRTC P2P</strong>',
        imageAlt: 'mirotalk-about',
        imageUrl: aboutImg,
        html: `
        <br/>
        <div id="about">
            <b><a id="github-button" data-umami-event="GitHub button" href="https://github.com/miroslavpejic85/mirotalk" target="_blank">Open Source</a></b> project
            <br/><br/>
            <button id="sponsor-button" data-umami-event="Sponsor button" class="pulsate" onclick="window.open('https://github.com/sponsors/miroslavpejic85?o=esb')"><i class="${className.heart}" ></i>&nbsp;Support</button>
            <br /><br />
            Author:<a id="linkedin-button" data-umami-event="Linkedin button" href="https://www.linkedin.com/in/miroslav-pejic-976a07101/" target="_blank"> Miroslav Pejic</a>
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
    if (surveyActive) {
        leaveFeedback();
    } else {
        checkRecording();
        openURL('/newcall');
    }
}

/**
 * Ask for feedback when room exit
 */
function leaveFeedback() {
    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        showDenyButton: true,
        background: swalBackground,
        imageUrl: imgFeedback,
        title: 'Leave a feedback',
        text: 'Do you want to rate your MiroTalk experience?',
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: {
            popup: 'animate__animated animate__fadeInDown',
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp',
        },
    }).then((result) => {
        checkRecording();
        if (result.isConfirmed) {
            openURL(surveyURL);
        } else {
            openURL('/newcall');
        }
    });
}

/**
 * Make Obj draggable: https://www.w3schools.com/howto/howto_js_draggable.asp
 * @param {object} elmnt father element
 * @param {object} dragObj children element to make father draggable (click + mouse move)
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
 * Date Format: https://convertio.co/it/
 * @returns {string} date string format: DD-MM-YYYY-H_M_S
 */
function getDataTimeString() {
    const d = new Date();
    const date = d.toISOString().split('T')[0];
    const time = d.toTimeString().split(' ')[0];
    return `${date}-${time}`;
}

/**
 * Convert bytes to KB-MB-GB-TB
 * @param {object} bytes to convert
 * @returns {string} converted size
 */
function bytesToSize(bytes) {
    let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

/**
 * Handle peer audio volume
 * @param {object} data peer audio
 */
function handlePeerVolume(data) {
    if (!isAudioPitchBar) return;
    let peer_id = data.peer_id;
    let element = getId(peer_id + '_pitch_bar');
    let remoteVideoWrap = getId(peer_id + '_videoWrap');
    let volume = data.volume + 25; //for design purpose
    if (!element) return;
    if (volume > 50) {
        element.style.backgroundColor = 'orange';
    }
    element.style.height = volume + '%';
    //remoteVideoWrap.classList.toggle('speaking');
    setTimeout(function () {
        element.style.backgroundColor = '#19bb5c';
        element.style.height = '0%';
        //remoteVideoWrap.classList.toggle('speaking');
    }, 700);
}

/**
 * Handle my audio volume
 * @param {object} data my audio
 */
function handleMyVolume(data) {
    if (!isAudioPitchBar) return;
    let element = getId('myPitchBar');
    let volume = data.volume + 25;
    if (!element) return;
    if (volume > 50) {
        element.style.backgroundColor = 'orange';
    }
    element.style.height = volume + '%';
    //myVideoWrap.classList.toggle('speaking');
    setTimeout(function () {
        element.style.backgroundColor = '#19bb5c';
        element.style.height = '0%';
        //myVideoWrap.classList.toggle('speaking');
    }, 700);
}

/**
 * Basic user logging using https://sweetalert2.github.io
 * @param {string} type of popup
 * @param {string} message to popup
 * @param {integer} timer toast duration ms
 */
function userLog(type, message, timer = 3000) {
    switch (type) {
        case 'warning':
        case 'error':
            Swal.fire({
                background: swalBackground,
                position: 'center',
                icon: type,
                title: type,
                text: message,
                hideClass: {
                    popup: 'animate__animated animate__fadeOutUp',
                },
            });
            playSound('alert');
            break;
        case 'info':
        case 'success':
            Swal.fire({
                background: swalBackground,
                position: 'center',
                icon: type,
                title: type,
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
                timer: timer,
                timerProgressBar: true,
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
 * Message popup
 * @param {string} icon info, success, warning, error
 * @param {string} message to show
 * @param {string} position of the toast
 * @param {integer} timer ms before to hide
 */
function msgPopup(icon, message, position, timer = 1000) {
    const Toast = Swal.mixin({
        background: swalBackground,
        toast: true,
        position: position,
        showConfirmButton: false,
        timer: timer,
        timerProgressBar: true,
    });
    Toast.fire({
        icon: icon,
        title: message,
    });
}

/**
 * https://notificationsounds.com/notification-sounds
 * @param {string} name audio to play
 */
async function playSound(name) {
    if (!notifyBySound) return;
    let sound = '../sounds/' + name + '.mp3';
    let audioToPlay = new Audio(sound);
    try {
        audioToPlay.volume = 0.5;
        await audioToPlay.play();
    } catch (err) {
        // console.error("Cannot play sound", err);
        // Automatic playback failed. (safari)
        return;
    }
}

/**
 * Open specified URL
 * @param {string} url to open
 * @param {boolean} blank if true opne url in the new tab
 */
function openURL(url, blank = false) {
    blank ? window.open(url, '_blank') : (window.location.href = url);
}

/**
 * Show-Hide all elements grp by class name
 * @param {string} className to toggle
 * @param {string} displayState of the element
 */
function toggleClassElements(className, displayState) {
    let elements = getEcN(className);
    for (let i = 0; i < elements.length; i++) {
        elements[i].style.display = displayState;
    }
}

/**
 * Check if valid filename
 * @param {string} fileName
 * @returns boolean
 */
function isValidFileName(fileName) {
    const invalidChars = /[\\\/\?\*\|:"<>]/;
    return !invalidChars.test(fileName);
}

/**
 * Check if Tablet device
 * @param {object} userAgent info
 * @return {boolean} true/false
 */
function isTablet(userAgent) {
    return /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(
        userAgent,
    );
}

/**
 * Check if IPad device
 * @param {object} userAgent
 * @return {boolean} true/false
 */
function isIpad(userAgent) {
    return /macintosh/.test(userAgent) && 'ontouchend' in document;
}

/**
 * Get Html element by Id
 * @param {string} id of the element
 * @returns {object} element
 */
function getId(id) {
    return document.getElementById(id);
}

/**
 * Get Html element by selector
 * @param {string} selector of the element
 * @returns {object} element
 */
function getSl(selector) {
    return document.querySelector(selector);
}

/**
 * Get Html element by class name
 * @param {string} className of the element
 * @returns {object} element
 */
function getEcN(className) {
    return document.getElementsByClassName(className);
}

/**
 * Get html element by name
 * @param {string} name
 * @returns element
 */
function getName(name) {
    return document.getElementsByName(name);
}

/**
 * Element style display
 * @param {object} elem
 * @param {boolean} yes true/false
 */
function elemDisplay(elem, yes) {
    elem.style.display = yes ? 'inline' : 'none';
}

/**
 * Sanitize XSS scripts
 * @param {object} src object
 * @returns sanitized object
 */
function sanitizeXSS(src) {
    return JSON.parse(filterXSS(JSON.stringify(src)));
}

/**
 * Disable element
 * @param {object} elem
 * @param {boolean} disabled
 */
function disable(elem, disabled) {
    elem.disabled = disabled;
}
