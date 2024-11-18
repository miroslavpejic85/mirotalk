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
 * @version 1.3.93
 *
 */

'use strict';

// https://www.w3schools.com/js/js_strict.asp

// Signaling server URL
const signalingServer = getSignalingServer();

// This room
const myRoomId = getId('myRoomId');
const roomId = getRoomId();
const myRoomUrl = window.location.origin + '/join/' + roomId; // share room url

// Images
const images = {
    confirmation: '../images/image-placeholder.png',
    share: '../images/share.png',
    locked: '../images/locked.png',
    videoOff: '../images/cam-off.png',
    audioOff: '../images/audio-off.png',
    audioGif: '../images/audio.gif',
    delete: '../images/delete.png',
    message: '../images/message.png',
    leave: '../images/leave-room.png',
    vaShare: '../images/va-share.png',
    about: '../images/mirotalk-logo.gif',
    feedback: '../images/feedback.png',
    forbidden: '../images/forbidden.png',
    avatar: '../images/mirotalk-logo.png',
    recording: '../images/recording.png',
}; // nice free icon: https://www.iconfinder.com

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
    mirror: 'fas fa-arrow-right-arrow-left',
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
    speech: 'fas fa-volume-high',
    heart: 'fas fa-heart',
    pip: 'fas fa-images',
    hideAll: 'fas fa-eye',
    up: 'fas fa-chevron-up',
    down: 'fas fa-chevron-down',
};
// https://fontawesome.com/search?o=r&m=free

const icons = {
    lock: '<i class="fas fa-lock"></i>',
    unlock: '<i class="fas fa-lock-open"></i>',
    pitchBar: '<i class="fas fa-microphone-lines"></i>',
    sounds: '<i class="fas fa-music"></i>',
    share: '<i class="fas fa-share-alt"></i>',
    user: '<i class="fas fa-user"></i>',
    fileSend: '<i class="fas fa-file-export"></i>',
    fileReceive: '<i class="fas fa-file-import"></i>',
    codecs: '<i class="fa-solid fa-film"></i>',
    theme: '<i class="fas fa-fill-drip"></i>',
};

// Whiteboard and fileSharing
const fileSharingInput = '*'; // allow all file extensions
const Base64Prefix = 'data:application/pdf;base64,';
const wbPdfInput = 'application/pdf';
const wbImageInput = 'image/*';
const wbWidth = 1280;
const wbHeight = 768;

// Peer infos
const extraInfo = getId('extraInfo');
const userAgent = navigator.userAgent.toLowerCase();
const detectRtcVersion = DetectRTC.version;
const isWebRTCSupported = DetectRTC.isWebRTCSupported;
const isMobileDevice = DetectRTC.isMobileDevice;
const isTabletDevice = isTablet(userAgent);
const isIPadDevice = isIpad(userAgent);
const isDesktopDevice = !isMobileDevice && !isTabletDevice && !isIPadDevice;
const osName = DetectRTC.osName;
const osVersion = DetectRTC.osVersion;
const browserName = DetectRTC.browser.name;
const browserVersion = DetectRTC.browser.version;
const peerInfo = getPeerInfo();
const thisInfo = getInfo();

// Local Storage class
const lS = new LocalStorage();
const localStorageSettings = lS.getObjectLocalStorage('P2P_SETTINGS');
const lsSettings = localStorageSettings ? localStorageSettings : lS.P2P_SETTINGS;
console.log('LOCAL_STORAGE_SETTINGS', lsSettings);

// Check if embedded inside an iFrame
const isEmbedded = window.self !== window.top;

// Check if PIP is supported by this browser
const showVideoPipBtn = document.pictureInPictureEnabled;

// Check if Document PIP is supported by this browser
const showDocumentPipBtn = !isEmbedded && 'documentPictureInPicture' in window;

// Loading div
const loadingDiv = getId('loadingDiv');

// Video/Audio media container
const videoMediaContainer = getId('videoMediaContainer');
const videoPinMediaContainer = getId('videoPinMediaContainer');
const audioMediaContainer = getId('audioMediaContainer');

// Init audio-video
const initUser = getId('initUser');
const initVideoContainer = getQs('.init-video-container');
const initVideo = getId('initVideo');
const initVideoBtn = getId('initVideoBtn');
const initAudioBtn = getId('initAudioBtn');
const initScreenShareBtn = getId('initScreenShareBtn');
const initVideoMirrorBtn = getId('initVideoMirrorBtn');
const initUsernameEmojiButton = getId('initUsernameEmojiButton');
const initVideoSelect = getId('initVideoSelect');
const initMicrophoneSelect = getId('initMicrophoneSelect');
const initSpeakerSelect = getId('initSpeakerSelect');
const usernameEmoji = getId('usernameEmoji');

// Buttons bar
const buttonsBar = getId('buttonsBar');
const shareRoomBtn = getId('shareRoomBtn');
const recordStreamBtn = getId('recordStreamBtn');
const fullScreenBtn = getId('fullScreenBtn');
const chatRoomBtn = getId('chatRoomBtn');
const captionBtn = getId('captionBtn');
const roomEmojiPickerBtn = getId('roomEmojiPickerBtn');
const whiteboardBtn = getId('whiteboardBtn');
const snapshotRoomBtn = getId('snapshotRoomBtn');
const fileShareBtn = getId('fileShareBtn');
const documentPiPBtn = getId('documentPiPBtn');
const mySettingsBtn = getId('mySettingsBtn');
const aboutBtn = getId('aboutBtn');

// Buttons bottom
const bottomButtons = getId('bottomButtons');
const toggleExtraBtn = getId('toggleExtraBtn');
const audioBtn = getId('audioBtn');
const videoBtn = getId('videoBtn');
const swapCameraBtn = getId('swapCameraBtn');
const hideMeBtn = getId('hideMeBtn');
const screenShareBtn = getId('screenShareBtn');
const myHandBtn = getId('myHandBtn');
const leaveRoomBtn = getId('leaveRoomBtn');

// Room Emoji Picker
const closeEmojiPickerContainer = getId('closeEmojiPickerContainer');
const emojiPickerContainer = getId('emojiPickerContainer');
const emojiPickerHeader = getId('emojiPickerHeader');
const userEmoji = getId(`userEmoji`);

// Chat room
const msgerDraggable = getId('msgerDraggable');
const msgerHeader = getId('msgerHeader');
const msgerTogglePin = getId('msgerTogglePin');
const msgerTheme = getId('msgerTheme');
const msgerCPBtn = getId('msgerCPBtn');
const msgerDropDownMenuBtn = getId('msgerDropDownMenuBtn');
const msgerDropDownContent = getId('msgerDropDownContent');
const msgerClean = getId('msgerClean');
const msgerSaveBtn = getId('msgerSaveBtn');
const msgerClose = getId('msgerClose');
const msgerMaxBtn = getId('msgerMaxBtn');
const msgerMinBtn = getId('msgerMinBtn');
const msgerChat = getId('msgerChat');
const msgerEmojiBtn = getId('msgerEmojiBtn');
const msgerMarkdownBtn = getId('msgerMarkdownBtn');
const msgerGPTBtn = getId('msgerGPTBtn');
const msgerShareFileBtn = getId('msgerShareFileBtn');
const msgerVideoUrlBtn = getId('msgerVideoUrlBtn');
const msgerInput = getId('msgerInput');
const msgerCleanTextBtn = getId('msgerCleanTextBtn');
const msgerPasteBtn = getId('msgerPasteBtn');
const msgerShowChatOnMsgDiv = getId('msgerShowChatOnMsgDiv');
const msgerShowChatOnMsg = getId('msgerShowChatOnMsg');
const msgerSpeechMsgDiv = getId('msgerSpeechMsgDiv');
const msgerSpeechMsg = getId('msgerSpeechMsg');
const msgerSendBtn = getId('msgerSendBtn');

const chatInputEmoji = {
    '<3': '❤️',
    '</3': '💔',
    ':D': '😀',
    ':)': '😃',
    ';)': '😉',
    ':(': '😒',
    ':p': '😛',
    ';p': '😜',
    ":'(": '😢',
    ':+1:': '👍',
    ':*': '😘',
    ':O': '😲',
    ':|': '😐',
    ':*(': '😭',
    XD: '😆',
    ':B': '😎',
    ':P': '😜',
    '<(': '👎',
    '>:(': '😡',
    ':S': '😟',
    ':X': '🤐',
    ';(': '😥',
    ':T': '😖',
    ':@': '😠',
    ':$': '🤑',
    ':&': '🤗',
    ':#': '🤔',
    ':!': '😵',
    ':W': '😷',
    ':%': '🤒',
    ':*!': '🤩',
    ':G': '😬',
    ':R': '😋',
    ':M': '🤮',
    ':L': '🥴',
    ':C': '🥺',
    ':F': '🥳',
    ':Z': '🤢',
    ':^': '🤓',
    ':K': '🤫',
    ':D!': '🤯',
    ':H': '🧐',
    ':U': '🤥',
    ':V': '🤪',
    ':N': '🥶',
    ':J': '🥴',
}; // https://github.com/wooorm/gemoji/blob/main/support.md

// Chat room emoji picker
const msgerEmojiPicker = getId('msgerEmojiPicker');

// Chat room connected peers
const msgerCP = getId('msgerCP');
const msgerCPHeader = getId('msgerCPHeader');
const msgerCPCloseBtn = getId('msgerCPCloseBtn');
const msgerCPList = getId('msgerCPList');
const searchPeerBarName = getId('searchPeerBarName');

// Caption section
const captionDraggable = getId('captionDraggable');
const captionHeader = getId('captionHeader');
const captionTogglePin = getId('captionTogglePin');
const captionTheme = getId('captionTheme');
const captionMaxBtn = getId('captionMaxBtn');
const captionMinBtn = getId('captionMinBtn');
const captionClean = getId('captionClean');
const captionSaveBtn = getId('captionSaveBtn');
const captionClose = getId('captionClose');
const captionChat = getId('captionChat');

// My settings
const mySettings = getId('mySettings');
const mySettingsHeader = getId('mySettingsHeader');
const tabVideoBtn = getId('tabVideoBtn');
const tabAudioBtn = getId('tabAudioBtn');
const tabVideoShareBtn = getId('tabVideoShareBtn');
const tabRecordingBtn = getId('tabRecordingBtn');
const tabParticipantsBtn = getId('tabParticipantsBtn');
const tabProfileBtn = getId('tabProfileBtn');
const tabNetworkBtn = getId('tabNetworkBtn');
const networkIP = getId('networkIP');
const networkHost = getId('networkHost');
const networkStun = getId('networkStun');
const networkTurn = getId('networkTurn');
const tabRoomBtn = getId('tabRoomBtn');
const roomSendEmailBtn = getId('roomSendEmailBtn');
const tabStylingBtn = getId('tabStylingBtn');
const tabLanguagesBtn = getId('tabLanguagesBtn');
const mySettingsCloseBtn = getId('mySettingsCloseBtn');
const myPeerNameSet = getId('myPeerNameSet');
const myPeerNameSetBtn = getId('myPeerNameSetBtn');
const switchSounds = getId('switchSounds');
const switchShare = getId('switchShare');
const switchPushToTalk = getId('switchPushToTalk');
const switchAudioPitchBar = getId('switchAudioPitchBar');
const audioInputSelect = getId('audioSource');
const audioOutputSelect = getId('audioOutput');
const audioOutputDiv = getId('audioOutputDiv');
const speakerTestBtn = getId('speakerTestBtn');
const videoSelect = getId('videoSource');
const videoQualitySelect = getId('videoQuality');
const videoFpsSelect = getId('videoFps');
const videoFpsDiv = getId('videoFpsDiv');
const screenFpsSelect = getId('screenFps');
const pushToTalkDiv = getId('pushToTalkDiv');
const recImage = getId('recImage');
const switchH264Recording = getId('switchH264Recording');
const pauseRecBtn = getId('pauseRecBtn');
const resumeRecBtn = getId('resumeRecBtn');
const recordingTime = getId('recordingTime');
const lastRecordingInfo = getId('lastRecordingInfo');
const themeSelect = getId('mirotalkTheme');
const videoObjFitSelect = getId('videoObjFitSelect');
const mainButtonsBar = getQsA('#buttonsBar button');
const mainButtonsIcon = getQsA('#buttonsBar button i');
const btnsBarSelect = getId('mainButtonsBarPosition');
const pinUnpinGridDiv = getId('pinUnpinGridDiv');
const pinVideoPositionSelect = getId('pinVideoPositionSelect');
const tabRoomPeerName = getId('tabRoomPeerName');
const tabRoomParticipants = getId('tabRoomParticipants');
const tabRoomSecurity = getId('tabRoomSecurity');
const tabEmailInvitation = getId('tabEmailInvitation');
const isPeerPresenter = getId('isPeerPresenter');
const peersCount = getId('peersCount');
const screenFpsDiv = getId('screenFpsDiv');

// Audio options
const dropDownMicOptions = getId('dropDownMicOptions');
const switchAutoGainControl = getId('switchAutoGainControl');
const switchNoiseSuppression = getId('switchNoiseSuppression');
const switchEchoCancellation = getId('switchEchoCancellation');
const sampleRateSelect = getId('sampleRateSelect');
const sampleSizeSelect = getId('sampleSizeSelect');
const channelCountSelect = getId('channelCountSelect');
const micLatencyRange = getId('micLatencyRange');
const micVolumeRange = getId('micVolumeRange');
const applyAudioOptionsBtn = getId('applyAudioOptionsBtn');
const micOptionsBtn = getId('micOptionsBtn');
const micDropDownMenu = getId('micDropDownMenu');
const micLatencyValue = getId('micLatencyValue');
const micVolumeValue = getId('micVolumeValue');

// Tab Media
const shareMediaAudioVideoBtn = getId('shareMediaAudioVideoBtn');

// My whiteboard
const whiteboard = getId('whiteboard');
const whiteboardHeader = getId('whiteboardHeader');
const whiteboardTitle = getId('whiteboardTitle');
const whiteboardOptions = getId('whiteboardOptions');
const wbDrawingColorEl = getId('wbDrawingColorEl');
const whiteboardGhostButton = getId('whiteboardGhostButton');
const wbBackgroundColorEl = getId('wbBackgroundColorEl');
const whiteboardPencilBtn = getId('whiteboardPencilBtn');
const whiteboardObjectBtn = getId('whiteboardObjectBtn');
const whiteboardUndoBtn = getId('whiteboardUndoBtn');
const whiteboardRedoBtn = getId('whiteboardRedoBtn');
const whiteboardDropDownMenuBtn = getId('whiteboardDropDownMenuBtn');
const whiteboardDropdownMenu = getId('whiteboardDropdownMenu');
const whiteboardImgFileBtn = getId('whiteboardImgFileBtn');
const whiteboardPdfFileBtn = getId('whiteboardPdfFileBtn');
const whiteboardImgUrlBtn = getId('whiteboardImgUrlBtn');
const whiteboardTextBtn = getId('whiteboardTextBtn');
const whiteboardLineBtn = getId('whiteboardLineBtn');
const whiteboardRectBtn = getId('whiteboardRectBtn');
const whiteboardTriangleBtn = getId('whiteboardTriangleBtn');
const whiteboardCircleBtn = getId('whiteboardCircleBtn');
const whiteboardSaveBtn = getId('whiteboardSaveBtn');
const whiteboardEraserBtn = getId('whiteboardEraserBtn');
const whiteboardCleanBtn = getId('whiteboardCleanBtn');
const whiteboardLockBtn = getId('whiteboardLockBtn');
const whiteboardUnlockBtn = getId('whiteboardUnlockBtn');
const whiteboardCloseBtn = getId('whiteboardCloseBtn');

// Room actions buttons
const muteEveryoneBtn = getId('muteEveryoneBtn');
const hideEveryoneBtn = getId('hideEveryoneBtn');
const ejectEveryoneBtn = getId('ejectEveryoneBtn');
const lockRoomBtn = getId('lockRoomBtn');
const unlockRoomBtn = getId('unlockRoomBtn');

// File send progress
const sendFileDiv = getId('sendFileDiv');
const imgShareSend = getId('imgShareSend');
const sendFilePercentage = getId('sendFilePercentage');
const sendFileInfo = getId('sendFileInfo');
const sendProgress = getId('sendProgress');
const sendAbortBtn = getId('sendAbortBtn');

// File receive progress
const receiveFileDiv = getId('receiveFileDiv');
const imgShareReceive = getId('imgShareReceive');
const receiveFilePercentage = getId('receiveFilePercentage');
const receiveFileInfo = getId('receiveFileInfo');
const receiveProgress = getId('receiveProgress');
const receiveHideBtn = getId('receiveHideBtn');
const receiveAbortBtn = getId('receiveAbortBtn');

// Video/audio url player
const videoUrlCont = getId('videoUrlCont');
const videoAudioUrlCont = getId('videoAudioUrlCont');
const videoUrlHeader = getId('videoUrlHeader');
const videoAudioUrlHeader = getId('videoAudioUrlHeader');
const videoUrlCloseBtn = getId('videoUrlCloseBtn');
const videoAudioCloseBtn = getId('videoAudioCloseBtn');
const videoUrlIframe = getId('videoUrlIframe');
const videoAudioUrlElement = getId('videoAudioUrlElement');

// Speech recognition
const speechRecognitionIcon = getId('speechRecognitionIcon');
const speechRecognitionStart = getId('speechRecognitionStart');
const speechRecognitionStop = getId('speechRecognitionStop');

// Media
const sinkId = 'sinkId' in HTMLMediaElement.prototype;

//....

const userLimits = {
    active: false, // Limit users per room
    count: 2, // Limit 2 users per room if userLimits.active true
};

const isRulesActive = true; // Presenter can do anything, guest is slightly moderate, if false no Rules for the room.
const forceCamMaxResolutionAndFps = false; // This force the webCam to max resolution as default, up to 8k and 60fps (very high bandwidth are required) if false, you can set it from settings
const useAvatarSvg = true; // if false the cam-Off avatar = images.avatar

/**
 * Determines the video zoom mode.
 * If set to true, the video zooms at the center of the frame.
 * If set to false, the video zooms at the cursor position.
 */
const ZOOM_CENTER_MODE = false;
const ZOOM_IN_OUT_ENABLED = true; // Video Zoom in/out default (true)

// Color Picker:

const themeCustom = {
    input: getId('themeColorPicker'),
    check: getId('keepCustomTheme'),
    color: lsSettings.theme_color ? lsSettings.theme_color : '#000000',
    keep: lsSettings.theme_custom ? lsSettings.theme_custom : false,
};

const pickr = Pickr.create({
    el: themeCustom.input,
    theme: 'classic', // or 'monolith', or 'nano'
    default: themeCustom.color,
    useAsButton: true,
    swatches: [
        'rgba(244, 67, 54, 1)',
        'rgba(233, 30, 99, 0.95)',
        'rgba(156, 39, 176, 0.9)',
        'rgba(103, 58, 183, 0.85)',
        'rgba(63, 81, 181, 0.8)',
        'rgba(33, 150, 243, 0.75)',
        'rgba(3, 169, 244, 0.7)',
        'rgba(0, 188, 212, 0.7)',
        'rgba(0, 150, 136, 0.75)',
        'rgba(76, 175, 80, 0.8)',
        'rgba(139, 195, 74, 0.85)',
        'rgba(205, 220, 57, 0.9)',
        'rgba(255, 235, 59, 0.95)',
        'rgba(255, 193, 7, 1)',
    ],
    components: {
        preview: true,
        opacity: true,
        hue: true,
    },
})
    .on('init', (pickr) => {
        themeCustom.input.value = pickr.getSelectedColor().toHEXA().toString(0);
    })
    .on('change', (color) => {
        themeCustom.color = color.toHEXA().toString();
        themeCustom.input.value = themeCustom.color;
        setCustomTheme();
    })
    .on('changestop', () => {
        lsSettings.theme_color = themeCustom.color;
        lS.setSettings(lsSettings);
    });

// misc
let swBg = 'rgba(0, 0, 0, 0.7)'; // swAlert background color
let callElapsedTime; // count time
let mySessionTime; // conference session time
let isDocumentOnFullScreen = false;
let isToggleExtraBtnClicked = false;

// peer
let myPeerId; // This socket.id
let myPeerUUID = getUUID(); // Unique peer id
let myPeerName = getPeerName();
let myToken = getPeerToken(); // peer JWT
let isPresenter = false; // True Who init the room (aka first peer joined)
let myHandStatus = false;
let myVideoStatus = false;
let myAudioStatus = false;
let myVideoStatusBefore = false;
let myScreenStatus = false;
let isScreenEnabled = getScreenEnabled();
let notify = getNotify(); // popup room sharing on join
let notifyBySound = true; // turn on - off sound notifications
let isPeerReconnected = false;

// media
let useAudio = true; // User allow for microphone usage
let useVideo = true; // User allow for camera usage
let isEnumerateVideoDevices = false;
let isEnumerateAudioDevices = false;

// video/audio player
let isVideoUrlPlayerOpen = false;
let pinnedVideoPlayerId = null;

// connection
let signalingSocket; // socket.io connection to our webserver
let needToCreateOffer = false; // after session description answer
let peerConnections = {}; // keep track of our peer connections, indexed by peer_id == socket.io id
let chatDataChannels = {}; // keep track of our peer chat data channels
let fileDataChannels = {}; // keep track of our peer file sharing data channels
let allPeers = {}; // keep track of all peers in the room, indexed by peer_id == socket.io id

// stream
let initStream; // initial webcam stream
let localVideoMediaStream; // my webcam
let localAudioMediaStream; // my microphone
let peerVideoMediaElements = {}; // keep track of our peer <video> tags, indexed by peer_id_video
let peerAudioMediaElements = {}; // keep track of our peer <audio> tags, indexed by peer_id_audio

// main and bottom buttons
let mainButtonsBarPosition = 'vertical'; // vertical - horizontal
let placement = 'right'; // https://atomiks.github.io/tippyjs/#placements
let bottomButtonsPlacement = 'right';
let isButtonsVisible = false;
let isButtonsBarOver = false;

// video
let myVideo;
let myAudio;
let myVideoWrap;
let myVideoAvatarImage;
let myPrivacyBtn;
let myVideoPinBtn;
let myPitchBar;
let myVideoParagraph;
let myHandStatusIcon;
let myVideoStatusIcon;
let myAudioStatusIcon;
let isVideoPrivacyActive = false; // Video circle for privacy
let isVideoPinned = false;
let isVideoFullScreenSupported = true;
let isVideoOnFullScreen = false;
let isScreenSharingSupported = false;
let isScreenStreaming = false;
let isHideMeActive = getHideMeActive();
let remoteMediaControls = false; // enable - disable peers video player controls (default false)
let camera = 'user'; // user = front-facing camera on a smartphone. | environment = the back camera on a smartphone.

// chat
let leftChatAvatar;
let rightChatAvatar;
let chatMessagesId = 0;
let showChatOnMessage = true;
let isChatPinned = false;
let isCaptionPinned = false;
let isChatRoomVisible = false;
let isCaptionBoxVisible = false;
let isChatEmojiVisible = false;
let isChatMarkdownOn = false;
let isChatGPTOn = false;
let isChatPasteTxt = false;
let speechInMessages = false;
let isSpeechSynthesisSupported = 'speechSynthesis' in window;
let transcripts = []; // collect all the transcripts to save it later if you need
let chatMessages = []; // collect chat messages to save it later if want
let chatGPTcontext = []; // keep chatGPT messages context

// settings
let videoMaxFrameRate = 30;
let screenMaxFrameRate = 30;
let videoQualitySelectedIndex = 0; // default HD and 30fps
let videoFpsSelectedIndex = 1; // 30 fps
let screenFpsSelectedIndex = 1; // 30 fps
let isMySettingsVisible = false;
let thisRoomPassword = null;
let isRoomLocked = false;
let isAudioPitchBar = true;
let isPushToTalkActive = false;
let isSpaceDown = false;

// recording
let mediaRecorder;
let recordedBlobs;
let audioRecorder; // helpers.js
let recScreenStream; // screen media to recording
let recTimer;
let recCodecs;
let recElapsedTime;
let recPrioritizeH264 = false;
let isStreamRecording = false;
let isStreamRecordingPaused = false;
let isRecScreenStream = false;

// whiteboard
let wbCanvas = null;
let wbIsLock = false;
let wbIsDrawing = false;
let wbIsOpen = false;
let wbIsRedoing = false;
let wbIsEraser = false;
let wbIsBgTransparent = false;
let wbPop = [];
let isWhiteboardFs = false;

// file transfer
let fileToSend;
let fileReader;
let receiveBuffer = [];
let receivedSize = 0;
let incomingFileInfo;
let incomingFileData;
let sendInProgress = false;
let receiveInProgress = false;
/**
 * MTU 1kb/s to prevent drop.
 * Note: FireFox seems not supports chunkSize > 1024?
 */
const chunkSize = 1024; // 1024 * 16; // 16kb/s

// server
let isHostProtected = false; // Username and Password required to initialize room
let isPeerAuthEnabled = false; // Username and Password required in the URL params to join room

// survey
let surveyActive = true; // when leaving the room give a feedback, if false will be redirected to newcall page
let surveyURL = 'https://www.questionpro.com/t/AUs7VZq00L';

// Redirect on leave room
let redirectActive = false;
let redirectURL = '/newcall';

/**
 * Load all Html elements by Id
 */
function getHtmlElementsById() {
    mySessionTime = getId('mySessionTime');
    // My video elements
    myVideo = getId('myVideo');
    myAudio = getId('myAudio');
    myVideoWrap = getId('myVideoWrap');
    myVideoAvatarImage = getId('myVideoAvatarImage');
    myPrivacyBtn = getId('myPrivacyBtn');
    myVideoPinBtn = getId('myVideoPinBtn');
    myPitchBar = getId('myPitchBar');
    // My username, hand/video/audio status
    myVideoParagraph = getId('myVideoParagraph');
    myHandStatusIcon = getId('myHandStatusIcon');
    myVideoStatusIcon = getId('myVideoStatusIcon');
    myAudioStatusIcon = getId('myAudioStatusIcon');
}

/**
 * Using tippy aka very nice tooltip!
 * https://atomiks.github.io/tippyjs/
 */
function setButtonsToolTip() {
    // Not need for mobile
    if (isMobileDevice) return;
    // Init buttons
    setTippy(initScreenShareBtn, 'Toggle screen sharing', 'top');
    setTippy(initVideoMirrorBtn, 'Toggle video mirror', 'top');
    setTippy(initUsernameEmojiButton, 'Toggle username emoji', 'top');
    // Main buttons
    refreshMainButtonsToolTipPlacement();
    // Chat room buttons
    setTippy(msgerClose, 'Close', 'bottom');
    setTippy(msgerShowChatOnMsgDiv, 'Show chat when you receive a new message', 'bottom');
    setTippy(msgerSpeechMsgDiv, 'Speech the incoming messages', 'bottom');
    setTippy(msgerTogglePin, 'Toggle chat pin', 'bottom');
    setTippy(msgerTheme, 'Ghost theme', 'bottom');
    setTippy(msgerMaxBtn, 'Maximize', 'bottom');
    setTippy(msgerMinBtn, 'Minimize', 'bottom');
    setTippy(msgerEmojiBtn, 'Emoji', 'top');
    setTippy(msgerMarkdownBtn, 'Markdown', 'top');
    setTippy(msgerGPTBtn, 'ChatGPT', 'top');
    setTippy(msgerShareFileBtn, 'Share file', 'top');
    setTippy(msgerCPBtn, 'Private messages', 'top');
    setTippy(msgerCleanTextBtn, 'Clean', 'top');
    setTippy(msgerPasteBtn, 'Paste', 'top');
    setTippy(msgerSendBtn, 'Send', 'top');
    // Chat participants buttons
    setTippy(msgerCPCloseBtn, 'Close', 'bottom');
    // Caption buttons
    setTippy(captionClose, 'Close', 'bottom');
    setTippy(captionMaxBtn, 'Maximize', 'bottom');
    setTippy(captionMinBtn, 'Minimize', 'bottom');
    setTippy(captionTogglePin, 'Toggle caption pin', 'bottom');
    setTippy(captionTheme, 'Ghost theme', 'bottom');
    setTippy(captionClean, 'Clean the messages', 'bottom');
    setTippy(captionSaveBtn, 'Save the messages', 'bottom');
    setTippy(speechRecognitionIcon, 'Status', 'bottom');
    setTippy(speechRecognitionStart, 'Start', 'top');
    setTippy(speechRecognitionStop, 'Stop', 'top');
    // Settings
    setTippy(mySettingsCloseBtn, 'Close', 'bottom');
    setTippy(myPeerNameSetBtn, 'Change name', 'top');
    setTippy(myRoomId, 'Room name (click to copy/share)', 'right');
    setTippy(
        switchPushToTalk,
        'If Active, When SpaceBar keydown the microphone will be activated, on keyup will be deactivated, like a walkie-talkie',
        'right',
    );
    setTippy(switchSounds, 'Toggle room notify sounds', 'right');
    setTippy(switchShare, "Show 'Share Room' popup on join.", 'right');
    setTippy(recImage, 'Toggle recording', 'right');
    setTippy(
        switchH264Recording,
        'Prioritize h.264 with AAC or h.264 with Opus codecs over VP8 with Opus or VP9 with Opus codecs',
        'right',
    );
    setTippy(networkIP, 'IP address associated with the ICE candidate', 'right');
    setTippy(
        networkHost,
        'This type of ICE candidate represents a candidate that corresponds to an interface on the local device. Host candidates are typically generated based on the local IP addresses of the device and can be used for direct peer-to-peer communication within the same network',
        'right',
    );
    setTippy(
        networkStun,
        'Server reflexive candidates are obtained by the ICE agent when it sends a request to a STUN (Session Traversal Utilities for NAT) server. These candidates reflect the public IP address and port of the client as observed by the STUN server. They are useful for traversing NATs (Network Address Translators) and establishing connectivity between peers across different networks',
        'right',
    );
    setTippy(
        networkTurn,
        'Relay candidates are obtained when communication between peers cannot be established directly due to symmetric NATs or firewall restrictions. In such cases, communication is relayed through a TURN (Traversal Using Relays around NAT) server. TURN servers act as intermediaries, relaying data between peers, allowing them to communicate even when direct connections are not possible. This is typically the fallback mechanism for establishing connectivity when direct peer-to-peer communication fails',
        'right',
    );
    // Whiteboard buttons
    setTippy(whiteboardLockBtn, 'Toggle Lock whiteboard', 'right');
    setTippy(whiteboardUnlockBtn, 'Toggle Lock whiteboard', 'right');
    setTippy(whiteboardCloseBtn, 'Close', 'right');
    setTippy(wbDrawingColorEl, 'Drawing color', 'bottom');
    setTippy(whiteboardGhostButton, 'Toggle transparent background', 'bottom');
    setTippy(wbBackgroundColorEl, 'Background color', 'bottom');
    setTippy(whiteboardPencilBtn, 'Drawing mode', 'bottom');
    setTippy(whiteboardObjectBtn, 'Object mode', 'bottom');
    setTippy(whiteboardUndoBtn, 'Undo', 'bottom');
    setTippy(whiteboardRedoBtn, 'Redo', 'bottom');
    // Suspend/Hide File transfer buttons
    setTippy(sendAbortBtn, 'Abort file transfer', 'bottom');
    setTippy(receiveAbortBtn, 'Abort file transfer', 'bottom');
    setTippy(receiveHideBtn, 'Hide file transfer', 'bottom');
    // Video/audio URL player
    setTippy(videoUrlCloseBtn, 'Close the video player', 'bottom');
    setTippy(videoAudioCloseBtn, 'Close the video player', 'bottom');
    setTippy(msgerVideoUrlBtn, 'Share a video or audio to all participants', 'top');
}

/**
 * Refresh main buttons tooltips based of they position (vertical/horizontal)
 * @returns void
 */
function refreshMainButtonsToolTipPlacement() {
    // not need for mobile
    if (isMobileDevice) return;

    // ButtonsBar
    placement = btnsBarSelect.options[btnsBarSelect.selectedIndex].value == 'vertical' ? 'right' : 'top';

    // BottomButtons
    bottomButtonsPlacement = btnsBarSelect.options[btnsBarSelect.selectedIndex].value == 'vertical' ? 'top' : 'right';

    setTippy(shareRoomBtn, 'Share the Room', placement);
    setTippy(hideMeBtn, 'Toggle hide myself from the room view', placement);
    setTippy(recordStreamBtn, 'Start recording', placement);
    setTippy(fullScreenBtn, 'View full screen', placement);
    setTippy(captionBtn, 'Open the caption', placement);
    setTippy(roomEmojiPickerBtn, 'Send reaction', placement);
    setTippy(whiteboardBtn, 'Open the whiteboard', placement);
    setTippy(snapshotRoomBtn, 'Snapshot screen, windows or tab', placement);
    setTippy(fileShareBtn, 'Share file', placement);
    setTippy(documentPiPBtn, 'Toggle picture in picture', placement);
    setTippy(mySettingsBtn, 'Open the settings', placement);
    setTippy(aboutBtn, 'About this project', placement);

    setTippy(toggleExtraBtn, 'Toggle extra buttons', bottomButtonsPlacement);
    setTippy(audioBtn, useAudio ? 'Stop the audio' : 'My audio is disabled', bottomButtonsPlacement);
    setTippy(videoBtn, useVideo ? 'Stop the video' : 'My video is disabled', bottomButtonsPlacement);
    setTippy(screenShareBtn, 'Start screen sharing', bottomButtonsPlacement);
    setTippy(myHandBtn, 'Raise your hand', bottomButtonsPlacement);
    setTippy(chatRoomBtn, 'Open the chat', bottomButtonsPlacement);
    setTippy(leaveRoomBtn, 'Leave this room', bottomButtonsPlacement);
}

/**
 * Set nice tooltip to element
 * @param {object} element element
 * @param {string} content message to popup
 * @param {string} placement position
 */
function setTippy(element, content, placement) {
    if (isMobileDevice) return;
    if (element) {
        if (element._tippy) {
            element._tippy.destroy();
        }
        try {
            tippy(element, {
                content: content,
                placement: placement,
            });
        } catch (err) {
            console.error('setTippy error', err.message);
        }
    } else {
        console.warn('setTippy element not found with content', content);
    }
}

/**
 * Get peer info using DetectRTC
 * https://github.com/muaz-khan/DetectRTC
 * @returns {object} peer info
 */
function getPeerInfo() {
    return {
        detectRTCversion: detectRtcVersion,
        isWebRTCSupported: isWebRTCSupported,
        isDesktopDevice: isDesktopDevice,
        isMobileDevice: isMobileDevice,
        isTabletDevice: isTabletDevice,
        isIPadDevice: isIPadDevice,
        osName: osName,
        osVersion: osVersion,
        browserName: browserName,
        browserVersion: browserVersion,
    };
}

/**
 * Get Extra info
 * @returns object info
 */
function getInfo() {
    const parser = new UAParser(userAgent);

    try {
        const parserResult = parser.getResult();
        console.log('Info', parserResult);

        // Filter out properties with 'Unknown' values
        const filterUnknown = (obj) => {
            const filtered = {};
            for (const [key, value] of Object.entries(obj)) {
                if (value && value !== 'Unknown') {
                    filtered[key] = value;
                }
            }
            return filtered;
        };

        const filteredResult = {
            //ua: parserResult.ua,
            browser: filterUnknown(parserResult.browser),
            cpu: filterUnknown(parserResult.cpu),
            device: filterUnknown(parserResult.device),
            engine: filterUnknown(parserResult.engine),
            os: filterUnknown(parserResult.os),
        };

        // Convert the filtered result to a readable JSON string
        const resultString = JSON.stringify(filteredResult, null, 2);

        extraInfo.innerText = resultString;

        return parserResult;
    } catch (error) {
        console.error('Error parsing user agent:', error);
    }
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

    // Update Room name in settings
    if (myRoomId) myRoomId.innerText = roomId;

    // Save room name in local storage
    window.localStorage.lastRoom = roomId;
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
        if (queryNotify != null) {
            console.log('Direct join', { notify: queryNotify });
            return queryNotify;
        }
    }
    notify = lsSettings.share_on_join;
    console.log('Direct join', { notify: notify });
    return notify;
}

/**
 * Get Peer JWT
 * @returns {mixed} boolean false or token string
 */
function getPeerToken() {
    if (window.sessionStorage.peer_token) return window.sessionStorage.peer_token;
    let qs = new URLSearchParams(window.location.search);
    let token = filterXSS(qs.get('token'));
    let queryToken = false;
    if (token) {
        queryToken = token;
    }
    console.log('Direct join', { token: queryToken });
    return queryToken;
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
 * Hide myself from the meeting view
 * @returns {boolean} true/false
 */
function getHideMeActive() {
    let qs = new URLSearchParams(window.location.search);
    let hide = filterXSS(qs.get('hide'));
    let queryHideMe = false;
    if (hide) {
        hide = hide.toLowerCase();
        queryHideMe = hide === '1' || hide === 'true';
    }
    console.log('Direct join', { hide: queryHideMe });
    return queryHideMe;
}

/**
 * Check if there is peer connections
 * @returns {boolean} true/false
 */
function thereArePeerConnections() {
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
 * Get Started...
 */
document.addEventListener('DOMContentLoaded', function () {
    initClientPeer();
});

/**
 * On body load Get started
 */
function initClientPeer() {
    setTheme();

    if (!isWebRTCSupported) {
        return userLog('error', 'This browser seems not supported WebRTC!');
    }

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
    signalingSocket.on('unauthorized', handleUnauthorized);
    signalingSocket.on('roomIsLocked', handleUnlockTheRoom);
    signalingSocket.on('roomAction', handleRoomAction);
    signalingSocket.on('addPeer', handleAddPeer);
    signalingSocket.on('serverInfo', handleServerInfo);
    signalingSocket.on('sessionDescription', handleSessionDescription);
    signalingSocket.on('iceCandidate', handleIceCandidate);
    signalingSocket.on('peerName', handlePeerName);
    signalingSocket.on('peerStatus', handlePeerStatus);
    signalingSocket.on('peerAction', handlePeerAction);
    signalingSocket.on('message', handleMessage);
    signalingSocket.on('wbCanvasToJson', handleJsonToWbCanvas);
    signalingSocket.on('whiteboardAction', handleWhiteboardAction);
    signalingSocket.on('kickOut', handleKickedOut);
    signalingSocket.on('fileInfo', handleFileInfo);
    signalingSocket.on('fileAbort', handleFileAbort);
    signalingSocket.on('fileReceiveAbort', handleAbortFileTransfer);
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
    if (thereArePeerConnections() && typeof config === 'object' && config !== null) {
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

    if (localVideoMediaStream && localAudioMediaStream) {
        await joinToChannel();
    } else {
        await initEnumerateDevices();
        await setupLocalVideoMedia();
        await setupLocalAudioMedia();
        if (!useVideo || (!useVideo && !useAudio)) {
            await loadLocalMedia(new MediaStream(), 'video');
        }
        getHtmlElementsById();
        setButtonsToolTip();
        handleUsernameEmojiPicker();
        manageButtons();
        handleButtonsRule();
        setupMySettings();
        loadSettingsFromLocalStorage();
        setupVideoUrlPlayer();
        startSessionTime();
        await whoAreYou();
    }
}

/**
 * Handle some signaling server info
 * @param {object} config data
 */
function handleServerInfo(config) {
    console.log('13. Server info', config);

    const { peers_count, host_protected, user_auth, is_presenter, survey, redirect, rec_prioritize_h264 } = config;

    isHostProtected = host_protected;
    isPeerAuthEnabled = user_auth;

    // Get survey settings from server
    surveyActive = survey.active;
    surveyURL = survey.url;

    // Get redirect settings from server
    (redirectActive = redirect.active), (redirectURL = redirect.url);

    // Limit room to n peers
    if (userLimits.active && peers_count > userLimits.count) {
        return roomIsBusy();
    }

    // Let start with some basic rules
    isPresenter = isPeerReconnected ? isPresenter : is_presenter;
    isPeerPresenter.innerText = isPresenter;

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
 * HOST_USER_AUTH enabled and peer not match valid username and password
 */
function handleUnauthorized() {
    playSound('alert');
    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: swBg,
        imageUrl: images.forbidden,
        title: 'Oops, Unauthorized',
        text: 'The host has user authentication enabled',
        confirmButtonText: `Login`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then(() => {
        // Login required to join room
        openURL(`/login/?room=${roomId}`);
    });
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
        background: swBg,
        imageUrl: images.forbidden,
        position: 'center',
        title: 'Room is busy',
        html: `The room is limited to ${userLimits.count} users. <br/> Please try again later`,
        showDenyButton: false,
        confirmButtonText: `OK`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
    console.log('14. Peer isPresenter: ' + isPresenter + ' Reconnected to signaling server: ' + isPeerReconnected);
    if (!isPresenter) {
        //buttons.main.showShareRoomBtn = false;
        buttons.settings.showMicOptionsBtn = false;
        buttons.settings.showTabRoomParticipants = false;
        buttons.settings.showTabRoomSecurity = false;
        buttons.settings.showTabEmailInvitation = false;
        // buttons.remote.audioBtnClickAllowed = false;
        // buttons.remote.videoBtnClickAllowed = false;
        buttons.remote.showKickOutBtn = false;
        buttons.whiteboard.whiteboardLockBtn = false;
        //...
    } else {
        buttons.main.showShareRoomBtn = true;
        buttons.settings.showMicOptionsBtn = true;
        buttons.settings.showTabRoomParticipants = true;
        buttons.settings.showTabRoomSecurity = true;
        buttons.settings.showTabEmailInvitation = true;
        buttons.settings.showLockRoomBtn = !isRoomLocked;
        buttons.settings.showUnlockRoomBtn = isRoomLocked;
        buttons.remote.audioBtnClickAllowed = true;
        buttons.remote.videoBtnClickAllowed = true;
        buttons.remote.showKickOutBtn = true;
        buttons.whiteboard.whiteboardLockBtn = true;
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
    //elemDisplay(screenShareBtn, buttons.main.showScreenBtn, ); // auto-detected
    elemDisplay(recordStreamBtn, buttons.main.showRecordStreamBtn);
    elemDisplay(recImage, buttons.main.showRecordStreamBtn);
    elemDisplay(chatRoomBtn, buttons.main.showChatRoomBtn);
    elemDisplay(captionBtn, buttons.main.showCaptionRoomBtn && speechRecognition); // auto-detected
    elemDisplay(roomEmojiPickerBtn, buttons.main.showRoomEmojiPickerBtn);
    elemDisplay(myHandBtn, buttons.main.showMyHandBtn);
    elemDisplay(whiteboardBtn, buttons.main.showWhiteboardBtn);
    elemDisplay(snapshotRoomBtn, buttons.main.showSnapshotRoomBtn && !isMobileDevice);
    elemDisplay(fileShareBtn, buttons.main.showFileShareBtn);
    elemDisplay(documentPiPBtn, buttons.main.showDocumentPipBtn);
    elemDisplay(mySettingsBtn, buttons.main.showMySettingsBtn);
    elemDisplay(aboutBtn, buttons.main.showAboutBtn);
    // chat
    elemDisplay(msgerTogglePin, !isMobileDevice && buttons.chat.showTogglePinBtn);
    elemDisplay(msgerMaxBtn, !isMobileDevice && buttons.chat.showMaxBtn);
    elemDisplay(msgerSaveBtn, buttons.chat.showSaveMessageBtn);
    elemDisplay(msgerMarkdownBtn, buttons.chat.showMarkDownBtn);
    elemDisplay(msgerGPTBtn, buttons.chat.showChatGPTBtn);
    elemDisplay(msgerShareFileBtn, buttons.chat.showFileShareBtn);
    elemDisplay(msgerVideoUrlBtn, buttons.chat.showShareVideoAudioBtn);
    elemDisplay(msgerCPBtn, buttons.chat.showParticipantsBtn);
    // caption
    elemDisplay(captionTogglePin, !isMobileDevice && buttons.caption.showTogglePinBtn);
    elemDisplay(captionMaxBtn, !isMobileDevice && buttons.caption.showMaxBtn);
    // Settings
    elemDisplay(dropDownMicOptions, buttons.settings.showMicOptionsBtn && isPresenter); // auto-detected
    elemDisplay(muteEveryoneBtn, buttons.settings.showMuteEveryoneBtn);
    elemDisplay(hideEveryoneBtn, buttons.settings.showHideEveryoneBtn);
    elemDisplay(ejectEveryoneBtn, buttons.settings.showEjectEveryoneBtn);
    elemDisplay(lockRoomBtn, buttons.settings.showLockRoomBtn);
    elemDisplay(unlockRoomBtn, buttons.settings.showUnlockRoomBtn);
    elemDisplay(tabRoomPeerName, buttons.settings.showTabRoomPeerName);
    elemDisplay(tabRoomParticipants, buttons.settings.showTabRoomParticipants);
    elemDisplay(tabRoomSecurity, buttons.settings.showTabRoomSecurity);
    elemDisplay(tabEmailInvitation, buttons.settings.showTabEmailInvitation);
    // Whiteboard
    buttons.whiteboard.whiteboardLockBtn
        ? elemDisplay(whiteboardLockBtn, true, 'flex')
        : elemDisplay(whiteboardLockBtn, false);
}

/**
 * set your name for the conference
 */
async function whoAreYou() {
    console.log('11. Who are you?');

    document.body.style.background = 'var(--body-bg)';

    if (myPeerName) {
        elemDisplay(loadingDiv, false);

        myPeerName = filterXSS(myPeerName);

        console.log(`11.1 Check if ${myPeerName} exist in the room`, roomId);

        if (await checkUserName()) {
            if (!myToken) return userNameAlreadyInRoom(); // #209 Hack...
        }

        checkPeerAudioVideo();
        whoAreYouJoin();
        playSound('addPeer');
        return;
    }

    playSound('newMessage');

    // init buttons click events

    initVideoBtn.onclick = async (e) => {
        await handleVideo(e, true);
    };
    initAudioBtn.onclick = (e) => {
        handleAudio(e, true);
    };
    initVideoMirrorBtn.onclick = (e) => {
        toggleInitVideoMirror();
    };
    initUsernameEmojiButton.onclick = (e) => {
        getId('usernameInput').value = '';
        toggleUsernameEmoji();
    };

    await loadLocalStorage();

    if (!useVideo || !buttons.main.showVideoBtn) {
        useVideo = false;
        elemDisplay(document.getElementById('initVideo'), false);
        elemDisplay(document.getElementById('initVideoBtn'), false);
        elemDisplay(document.getElementById('initVideoMirrorBtn'), false);
        elemDisplay(document.getElementById('initVideoSelect'), false);
        elemDisplay(document.getElementById('tabVideoBtn'), false);
    }
    if (!useAudio || !buttons.main.showAudioBtn) {
        //useAudio = false;
        elemDisplay(document.getElementById('initAudioBtn'), false);
        elemDisplay(document.getElementById('initMicrophoneSelect'), false);
        elemDisplay(document.getElementById('initSpeakerSelect'), false);
        elemDisplay(document.getElementById('tabAudioBtn'), false);
    }
    if (!buttons.main.showScreenBtn) {
        elemDisplay(document.getElementById('initScreenShareBtn'), false);
    }

    initUser.classList.toggle('hidden');

    initVideoContainerShow(myVideoStatus);

    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: swBg,
        title: 'MiroTalk P2P',
        position: 'center',
        input: 'text',
        inputPlaceholder: 'Enter your email or name',
        inputAttributes: { maxlength: 32, id: 'usernameInput' },
        inputValue: window.localStorage.peer_name ? window.localStorage.peer_name : '',
        html: initUser, // inject html
        confirmButtonText: `Join meeting`,
        customClass: { popup: 'init-modal-size' },
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
        willOpen: () => {
            elemDisplay(loadingDiv, false);
        },
        inputValidator: async (value) => {
            if (!value) return 'Please enter your email or name';
            // Long name
            if (value.length > 30) return 'Name must be max 30 char';

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
                // Hide username emoji
                if (!usernameEmoji.classList.contains('hidden')) {
                    usernameEmoji.classList.add('hidden');
                }
                window.localStorage.peer_name = myPeerName;
                whoAreYouJoin();
            }
        },
    }).then(() => {
        playSound('addPeer');
    });

    // select video - audio

    initVideoSelect.onchange = async () => {
        await changeInitCamera(initVideoSelect.value);
        await handleLocalCameraMirror();
        videoSelect.selectedIndex = initVideoSelect.selectedIndex;
        refreshLsDevices();
    };
    initMicrophoneSelect.onchange = async () => {
        await changeLocalMicrophone(initMicrophoneSelect.value);
        audioInputSelect.selectedIndex = initMicrophoneSelect.selectedIndex;
        refreshLsDevices();
    };
    initSpeakerSelect.onchange = async () => {
        await changeAudioDestination();
        audioOutputSelect.selectedIndex = initSpeakerSelect.selectedIndex;
        refreshLsDevices();
    };

    // init video -audio buttons
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
 * Refresh all LS devices
 */
async function refreshLsDevices() {
    lS.setLocalStorageDevices(lS.MEDIA_TYPE.video, videoSelect.selectedIndex, videoSelect.value);
    lS.setLocalStorageDevices(lS.MEDIA_TYPE.audio, audioInputSelect.selectedIndex, audioInputSelect.value);
    lS.setLocalStorageDevices(lS.MEDIA_TYPE.speaker, audioOutputSelect.selectedIndex, audioOutputSelect.value);
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
        background: swBg,
        imageUrl: images.forbidden,
        position: 'center',
        title: 'Username',
        html: `The Username is already in use. <br/> Please try with another one`,
        showDenyButton: false,
        confirmButtonText: `OK`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
        const initMicrophoneExist = selectOptionByValueExist(initMicrophoneSelect, localStorageDevices.audio.select);
        const initSpeakerExist = selectOptionByValueExist(initSpeakerSelect, localStorageDevices.speaker.select);
        const initVideoExist = selectOptionByValueExist(initVideoSelect, localStorageDevices.video.select);
        //
        const audioInputExist = selectOptionByValueExist(audioInputSelect, localStorageDevices.audio.select);
        const audioOutputExist = selectOptionByValueExist(audioOutputSelect, localStorageDevices.speaker.select);
        const videoExist = selectOptionByValueExist(videoSelect, localStorageDevices.video.select);

        console.log('Check for audio changes', {
            previous: localStorageDevices.audio.select,
            current: audioInputSelect.value,
        });

        if (!initMicrophoneExist || !audioInputExist) {
            console.log('12.1 Audio devices seems changed, use default index 0');
            initMicrophoneSelect.selectedIndex = 0;
            audioInputSelect.selectedIndex = 0;
            refreshLsDevices();
        }

        console.log('Check for speaker changes', {
            previous: localStorageDevices.speaker.select,
            current: audioOutputSelect.value,
        });

        if (!initSpeakerExist || !audioOutputExist) {
            console.log('12.2 Speaker devices seems changed, use default index 0');
            initSpeakerSelect.selectedIndex = 0;
            audioOutputSelect.selectedIndex = 0;
            refreshLsDevices();
        }

        console.log('Check for video changes', {
            previous: localStorageDevices.video.select,
            current: videoSelect.value,
        });

        if (!initVideoExist || !videoExist) {
            console.log('12.3 Video devices seems changed, use default index 0');
            initVideoSelect.selectedIndex = 0;
            videoSelect.selectedIndex = 0;
            refreshLsDevices();
        }

        //
        console.log('12.4 Get Local Storage Devices after', lS.getLocalStorageDevices());
    }
    // Start init cam
    if (useVideo && initVideoSelect.value) {
        await changeInitCamera(initVideoSelect.value);
        await handleLocalCameraMirror();
    }
    // Refresh audio
    if (useAudio && audioInputSelect.value) {
        await changeLocalMicrophone(audioInputSelect.value);
    }
    // Refresh speaker
    if (audioOutputSelect.value) await changeAudioDestination();

    // Check init audio/video
    await checkInitConfig();
}

/**
 * Use the select element to check if a specific option value exists,
 * and if it does, automatically set it as the selected option.
 * @param {object} selectElement
 * @param {string} value
 * @return boolean
 */
function selectOptionByValueExist(selectElement, value) {
    let foundValue = false;
    for (let i = 0; i < selectElement.options.length; i++) {
        if (selectElement.options[i].value === value) {
            selectElement.selectedIndex = i;
            foundValue = true;
            break;
        }
    }
    return foundValue;
}

/**
 * Check int config from local storage
 */
async function checkInitConfig() {
    const initConfig = lS.getInitConfig();
    console.log('Get init config', initConfig);
    if (initConfig) {
        if (useAudio && !initConfig.audio) initAudioBtn.click();
        if (useVideo && !initConfig.video) initVideoBtn.click();
    }
}

/**
 * Change init camera by device id
 * @param {string} deviceId
 */
async function changeInitCamera(deviceId) {
    // Stop media tracks to avoid issue on mobile
    if (initStream) {
        await stopTracks(initStream);
    }
    if (localVideoMediaStream) {
        await stopVideoTracks(localVideoMediaStream);
    }

    // Get video constraints
    const videoConstraints = await getVideoConstraints('default');
    videoConstraints['deviceId'] = { exact: deviceId };

    await navigator.mediaDevices
        .getUserMedia({ video: videoConstraints })
        .then((camStream) => {
            updateInitLocalVideoMediaStream(camStream);
        })
        .catch(async (err) => {
            console.error('Error accessing init video device', err);
            console.warn('Fallback to default constraints');
            try {
                const camStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: {
                            exact: deviceId, // Specify the exact device ID you want to access
                        },
                    },
                }); // Fallback to default constraints
                updateInitLocalVideoMediaStream(camStream);
            } catch (fallbackErr) {
                console.error('Error accessing init video device with default constraints', fallbackErr);
                reloadBrowser(err);
            }
        });

    /**
     * Update Init/Local Video Stream
     * @param {MediaStream} camStream
     */
    function updateInitLocalVideoMediaStream(camStream) {
        if (camStream) {
            // We going to update init video stream
            initVideo.srcObject = camStream;
            initStream = camStream;
            console.log('Success attached init video stream', initStream.getVideoTracks()[0].getSettings());
            // We going to update also the local video stream
            myVideo.srcObject = camStream;
            localVideoMediaStream = camStream;
            console.log('Success attached local video stream', localVideoMediaStream.getVideoTracks()[0].getSettings());
        }
    }

    /**
     * Something going wrong
     * @param {object} err
     */
    function reloadBrowser(err) {
        console.error('[Error] changeInitCamera', err);
        userLog('error', 'Error while swapping init camera' + err);
        initVideoSelect.selectedIndex = 0;
        videoSelect.selectedIndex = 0;
        refreshLsDevices();
        // Refresh page...
        setTimeout(function () {
            location.reload();
        }, 3000);
    }
}

/**
 * Change local camera by device id
 * @param {string} deviceId
 */
async function changeLocalCamera(deviceId) {
    if (localVideoMediaStream) {
        await stopVideoTracks(localVideoMediaStream);
    }

    // Get video constraints
    const videoConstraints = await getVideoConstraints(videoQualitySelect.value ? videoQualitySelect.value : 'default');
    videoConstraints['deviceId'] = { exact: deviceId };
    console.log('videoConstraints', videoConstraints);

    await navigator.mediaDevices
        .getUserMedia({ video: videoConstraints })
        .then((camStream) => {
            updateLocalVideoMediaStream(camStream);
        })
        .catch(async (err) => {
            console.error('Error accessing local video device:', err);
            console.warn('Fallback to default constraints');
            try {
                const camStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: {
                            exact: deviceId, // Specify the exact device ID you want to access
                        },
                    },
                });
                updateLocalVideoMediaStream(camStream);
            } catch (fallbackErr) {
                console.error('Error accessing init video device with default constraints', fallbackErr);
                printError(err);
            }
        });

    /**
     * Update Local Video Media Stream
     * @param {MediaStream} camStream
     */
    function updateLocalVideoMediaStream(camStream) {
        if (camStream) {
            myVideo.srcObject = camStream;
            localVideoMediaStream = camStream;
            logStreamSettingsInfo('Success attached local video stream', camStream);
            refreshMyStreamToPeers(camStream);
            setLocalMaxFps(videoMaxFrameRate);
        }
    }

    /**
     * SOmething going wrong
     * @param {object} err
     */
    function printError(err) {
        console.error('[Error] changeLocalCamera', err);
        userLog('error', 'Error while swapping local camera ' + err);
    }
}

/**
 * Change local microphone by device id
 * @param {string} deviceId
 */
async function changeLocalMicrophone(deviceId) {
    if (localAudioMediaStream) {
        await stopAudioTracks(localAudioMediaStream);
    }

    // Get audio constraints
    const audioConstraints = await getAudioConstraints();
    audioConstraints['deviceId'] = { exact: deviceId };
    console.log('audioConstraints', audioConstraints);

    await navigator.mediaDevices
        .getUserMedia({ audio: audioConstraints })
        .then((micStream) => {
            myAudio.srcObject = micStream;
            localAudioMediaStream = micStream;
            logStreamSettingsInfo('Success attached local microphone stream', micStream);
            getMicrophoneVolumeIndicator(micStream);
            refreshMyStreamToPeers(micStream, true);
        })
        .catch((err) => {
            console.error('[Error] changeLocalMicrophone', err);
            userLog('error', 'Error while swapping local microphone' + err);
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
        let queryPeerAudio = useAudio ? audio === '1' || audio === 'true' : false;
        if (queryPeerAudio != null) handleAudio(audioBtn, false, queryPeerAudio);
        //elemDisplay(tabAudioBtn, queryPeerAudio);
        console.log('Direct join', { audio: queryPeerAudio });
    }
    if (video) {
        video = video.toLowerCase();
        let queryPeerVideo = useVideo ? video === '1' || video === 'true' : false;
        if (queryPeerVideo != null) handleVideo(videoBtn, false, queryPeerVideo);
        //elemDisplay(tabVideoBtn, queryPeerVideo);
        console.log('Direct join', { video: queryPeerVideo });
    }
}

/**
 * Room and Peer name are ok Join Channel
 */
async function whoAreYouJoin() {
    myVideoParagraph.innerText = myPeerName + ' (me)';
    setPeerAvatarImgName('myVideoAvatarImage', myPeerName);
    setPeerAvatarImgName('myProfileAvatar', myPeerName);
    setPeerChatAvatarImgName('right', myPeerName);
    joinToChannel();
    handleHideMe(isHideMeActive);
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
        peer_token: myToken,
        peer_video: useVideo,
        peer_audio: useAudio,
        peer_video_status: myVideoStatus,
        peer_audio_status: myAudioStatus,
        peer_screen_status: myScreenStatus,
        peer_hand_status: myHandStatus,
        peer_rec_status: isStreamRecording,
        peer_privacy_status: isVideoPrivacyActive,
        userAgent: userAgent,
    });
    handleBodyOnMouseMove(); // show/hide buttonsBar, bottomButtons ...
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
    const peerConnection = new RTCPeerConnection({ iceServers: iceServers });
    peerConnections[peer_id] = peerConnection;

    allPeers = peers;

    console.log('[RTCPeerConnection] - PEER_ID', peer_id); // the connected peer_id
    console.log('[RTCPeerConnection] - PEER-CONNECTIONS', peerConnections); // all peers connections in the room expect myself
    console.log('[RTCPeerConnection] - PEERS', peers); // all peers in the room

    // As P2P check who I am connected with
    let connectedPeersName = [];
    for (const id in peerConnections) {
        connectedPeersName.push(peers[id]['peer_name']);
    }
    console.log('[RTCPeerConnection] - CONNECTED TO PEERS', JSON.stringify(connectedPeersName));
    // userLog('info', 'Connected to: ' + JSON.stringify(connectedPeersName));

    await handlePeersConnectionStatus(peer_id);
    await msgerAddPeers(peers);
    await handleOnIceCandidate(peer_id);
    await handleRTCDataChannels(peer_id);
    await handleOnTrack(peer_id, peers);
    await handleAddTracks(peer_id);

    if (!peer_video && !needToCreateOffer) {
        needToCreateOffer = true;
    }
    if (should_create_offer) {
        await handleRtcOffer(peer_id);
        console.log('[RTCPeerConnection] - SHOULD CREATE OFFER', {
            peer_id: peer_id,
            peer_name: peer_name,
        });
    }

    if (!peer_video) {
        await loadRemoteMediaStream(new MediaStream(), peers, peer_id, 'video');
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
 * Handle ICE candidate
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onicecandidate
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidateerror_event
 * @param {string} peer_id socket.id
 */
async function handleOnIceCandidate(peer_id) {
    peerConnections[peer_id].onicecandidate = (event) => {
        if (!event.candidate || !event.candidate.candidate) return;

        const { type, candidate, address, sdpMLineIndex } = event.candidate;

        //console.log('[ICE-CANDIDATE] ---->', { type, address, candidate });

        sendToServer('relayICE', {
            peer_id,
            ice_candidate: {
                sdpMLineIndex,
                candidate,
            },
        });

        // Get Ice address
        const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
        let addressInfo = candidate.match(ipRegex);
        if (!addressInfo && address) addressInfo = [address];

        // IP
        if (addressInfo) {
            networkIP.innerText = addressInfo;
        }

        // Display network information based on candidate type
        switch (type) {
            case 'host':
                networkHost.innerText = '🟢';
                break;
            case 'srflx':
                networkStun.innerText = '🟢';
                break;
            case 'relay':
                networkTurn.innerText = '🟢';
                break;
            default:
                console.warn(`[ICE candidate] unknown type: ${type}`, candidate);
                break;
        }
    };

    // handle ICE candidate errors
    peerConnections[peer_id].onicecandidateerror = (event) => {
        const { url, errorText } = event;

        console.warn('[ICE candidate] error', { url, error: errorText });

        if (url.startsWith('host:')) networkHost.innerText = '🔴';
        if (url.startsWith('stun:')) networkStun.innerText = '🔴';
        if (url.startsWith('turn:')) networkTurn.innerText = '🔴';

        //msgPopup('warning', `${url}: ${errorText}`, 'top-end', 6000);
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
        const remoteVideoStream = getId(`${peer_id}___video`);
        const remoteAudioStream = getId(`${peer_id}___audio`);
        const remoteAvatarImage = getId(`${peer_id}_avatar`);

        const peerInfo = peers[peer_id];
        const { peer_name } = peerInfo;
        const { kind } = event.track;

        console.log('[ON TRACK] - info', { peer_id, peer_name, kind });

        if (event.streams && event.streams[0]) {
            console.log('[ON TRACK] - peers', peers);

            switch (kind) {
                case 'video':
                    remoteVideoStream
                        ? attachMediaStream(remoteVideoStream, event.streams[0])
                        : loadRemoteMediaStream(event.streams[0], peers, peer_id, kind);
                    break;
                case 'audio':
                    remoteAudioStream && isAudioTrack
                        ? attachMediaStream(remoteAudioStream, event.streams[0])
                        : loadRemoteMediaStream(event.streams[0], peers, peer_id, kind);
                    break;
                default:
                    break;
            }
        } else {
            console.log('[ON TRACK] - SCREEN SHARING', { peer_id, peer_name, kind });
            // Create a new screen share video stream from track video (refreshMyStreamToPeers)
            const inboundStream = new MediaStream([event.track]);
            attachMediaStream(remoteVideoStream, inboundStream);
            elemDisplay(remoteAvatarImage, false);
            elemDisplay(remoteVideoStream, true, 'block');
        }
    };
}

/**
 * Add my localVideoMediaStream and localAudioMediaStream Tracks to connected peer
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
 * @param {string} peer_id socket.id
 */
async function handleAddTracks(peer_id) {
    const peer_name = allPeers[peer_id]['peer_name'];

    const videoTrack = localVideoMediaStream && localVideoMediaStream.getVideoTracks()[0];
    const audioTrack = localAudioMediaStream && localAudioMediaStream.getAudioTracks()[0];

    console.log('handleAddTracks', {
        videoTrack: videoTrack,
        audioTrack: audioTrack,
    });

    if (videoTrack) {
        console.log('[ADD VIDEO TRACK] to Peer Name [' + peer_name + ']');
        await peerConnections[peer_id].addTrack(videoTrack, localVideoMediaStream);
    }

    if (audioTrack) {
        console.log('[ADD AUDIO TRACK] to Peer Name [' + peer_name + ']');
        await peerConnections[peer_id].addTrack(audioTrack, localAudioMediaStream);
    }
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
                            default:
                                break;
                        }
                    } catch (err) {
                        console.error('mirotalk_chat_channel', err);
                    }
                    break;
                case 'mirotalk_file_sharing_channel':
                    try {
                        const dataFile = msg.data;
                        if (dataFile instanceof ArrayBuffer && dataFile.byteLength != 0) {
                            handleDataChannelFileSharing(dataFile);
                        } else {
                            // Work around for Firefox Bug: even if set dc.binaryType to arraybuffer it sends Blob?
                            if (dataFile instanceof Blob && dataFile.size != 0) {
                                blobToArrayBuffer(dataFile)
                                    .then((arrayBuffer) => {
                                        handleDataChannelFileSharing(arrayBuffer);
                                    })
                                    .catch((error) => {
                                        console.error('mirotalk_file_sharing_channel', error);
                                    });
                            }
                        }
                    } catch (err) {
                        console.error('mirotalk_file_sharing_channel', err);
                    }
                    break;
                default:
                    break;
            }
        };
    };
    createChatDataChannel(peer_id);
    createFileSharingDataChannel(peer_id);
}

/**
 * Convert Blob to ArrayBuffer
 * @param {object} blob
 * @returns arrayBuffer
 */
function blobToArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result;
            resolve(arrayBuffer);
        };
        reader.onerror = () => {
            reject(new Error('Error reading Blob as ArrayBuffer'));
        };
        reader.readAsArrayBuffer(blob);
    });
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

    for (const peer_id in peerConnections) {
        const peerVideoId = peer_id + '___video';
        const peerAudioId = peer_id + '___audio';

        const peerVideo = getId(peerVideoId);
        if (peerVideo) {
            // Peer video in focus mode
            if (peerVideo.hasAttribute('focus-mode')) {
                const remoteVideoFocusBtn = getId(peer_id + '_focusMode');
                if (remoteVideoFocusBtn) {
                    remoteVideoFocusBtn.click();
                }
            }
        }
        peerVideoMediaElements[peerVideoId].parentNode.removeChild(peerVideoMediaElements[peerVideoId]);
        peerAudioMediaElements[peerAudioId].parentNode.removeChild(peerAudioMediaElements[peerAudioId]);
        peerConnections[peer_id].close();
        msgerRemovePeer(peer_id);
        removeVideoPinMediaContainer(peer_id);
    }

    adaptAspectRatio();

    chatDataChannels = {};
    fileDataChannels = {};
    peerConnections = {};
    peerVideoMediaElements = {};
    peerAudioMediaElements = {};

    isPeerReconnected = true;
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

    const { peer_id } = config;

    const peerVideoId = peer_id + '___video';
    const peerAudioId = peer_id + '___audio';

    if (peerVideoId in peerVideoMediaElements) {
        const peerVideo = getId(peerVideoId);
        if (peerVideo) {
            // Peer video in focus mode
            if (peerVideo.hasAttribute('focus-mode')) {
                const remoteVideoFocusBtn = getId(peer_id + '_focusMode');
                if (remoteVideoFocusBtn) {
                    remoteVideoFocusBtn.click();
                }
            }
        }
        peerVideoMediaElements[peerVideoId].parentNode.removeChild(peerVideoMediaElements[peerVideoId]);
        adaptAspectRatio();
    }

    if (peerAudioId in peerAudioMediaElements) {
        peerAudioMediaElements[peerAudioId].parentNode.removeChild(peerAudioMediaElements[peerAudioId]);
    }

    if (peer_id in peerConnections) peerConnections[peer_id].close();

    msgerRemovePeer(peer_id);
    removeVideoPinMediaContainer(peer_id);

    delete chatDataChannels[peer_id];
    delete fileDataChannels[peer_id];
    delete peerConnections[peer_id];
    delete peerVideoMediaElements[peerVideoId];
    delete peerAudioMediaElements[peerAudioId];
    delete allPeers[peer_id];

    playSound('removePeer');

    console.log('ALL PEERS', allPeers);
}

/**
 * Set custom theme
 */
function setCustomTheme() {
    const color = themeCustom.color;
    swBg = `radial-gradient(${color}, ${color})`;
    setSP('--body-bg', `radial-gradient(${color}, ${color})`);
    setSP('--msger-bg', `radial-gradient(${color}, ${color})`);
    setSP('--msger-private-bg', `radial-gradient(${color}, ${color})`);
    setSP('--wb-bg', `radial-gradient(${color}, ${color})`);
    setSP('--elem-border-color', '0.5px solid rgb(255 255 255 / 32%)');
    setSP('--navbar-bg', 'rgba(0, 0, 0, 0.2)');
    setSP('--select-bg', `${color}`);
    setSP('--tab-btn-active', `${color}`);
    setSP('--box-shadow', '0px 8px 16px 0px rgba(0, 0, 0, 0.2)');
    setSP('--left-msg-bg', '#252d31');
    setSP('--right-msg-bg', `${color}`);
    setSP('--private-msg-bg', '#6b1226');
    setSP('--btn-bar-bg-color', '#FFFFFF');
    setSP('--btn-bar-color', '#000000');
    setSP('--btns-bg-color', `${color}`);
    document.body.style.background = `radial-gradient(${color}, ${color})`;
}

/**
 * Set mirotalk theme | dark | grey | ...
 */
function setTheme() {
    if (themeCustom.keep) return setCustomTheme();

    mirotalkTheme.selectedIndex = lsSettings.theme;
    const theme = mirotalkTheme.value;
    switch (theme) {
        case 'dark':
            // dark theme
            swBg = 'radial-gradient(#393939, #000000)';
            setSP('--body-bg', 'radial-gradient(#393939, #000000)');
            setSP('--msger-bg', 'radial-gradient(#393939, #000000)');
            setSP('--msger-private-bg', 'radial-gradient(#393939, #000000)');
            setSP('--wb-bg', 'radial-gradient(#393939, #000000)');
            setSP('--elem-border-color', 'none');
            setSP('--navbar-bg', 'rgba(28, 28, 28, 0.8)');
            setSP('--select-bg', '#3a3a3a');
            setSP('--tab-btn-active', '#4f4f4f');
            setSP('--box-shadow', '0px 8px 16px 0px rgba(0, 0, 0, 0.4)');
            setSP('--left-msg-bg', '#353535');
            setSP('--right-msg-bg', '#4a4a4a');
            setSP('--private-msg-bg', '#2a2a2a');
            setSP('--btn-bar-bg-color', '#FFFFFF');
            setSP('--btn-bar-color', '#000000');
            setSP('--btns-bg-color', 'rgba(0, 0, 0, 0.7)');
            setSP('--dd-color', '#FFFFFF');
            document.body.style.background = 'radial-gradient(#393939, #000000)';
            mirotalkTheme.selectedIndex = 0;
            break;
        case 'grey':
            // grey theme
            swBg = 'radial-gradient(#4f4f4f, #1c1c1c)';
            setSP('--body-bg', 'radial-gradient(#4f4f4f, #1c1c1c)');
            setSP('--msger-bg', 'radial-gradient(#4f4f4f, #1c1c1c)');
            setSP('--wb-bg', 'radial-gradient(#5f5f5f, #2c2c2c)');
            setSP('--elem-border-color', 'none');
            setSP('--navbar-bg', 'rgba(28, 28, 28, 0.8)');
            setSP('--select-bg', '#3a3a3a');
            setSP('--tab-btn-active', '#4f4f4f');
            setSP('--box-shadow', '0px 8px 16px 0px rgba(0, 0, 0, 0.4)');
            setSP('--msger-private-bg', 'radial-gradient(#4f4f4f, #1c1c1c)');
            setSP('--left-msg-bg', '#353535');
            setSP('--right-msg-bg', '#4a4a4a');
            setSP('--private-msg-bg', '#616161');
            setSP('--btn-bar-bg-color', '#FFFFFF');
            setSP('--btn-bar-color', '#000000');
            setSP('--btns-bg-color', 'rgba(0, 0, 0, 0.7)');
            setSP('--dd-color', '#FFFFFF');
            document.body.style.background = 'radial-gradient(#4f4f4f, #1c1c1c)';
            mirotalkTheme.selectedIndex = 1;
            break;
        case 'green':
            // green theme
            swBg = 'radial-gradient(#004d40, #001f1c)';
            setSP('--body-bg', 'radial-gradient(#004d40, #001f1c)');
            setSP('--msger-bg', 'radial-gradient(#004d40, #001f1c)');
            setSP('--wb-bg', 'radial-gradient(#004d40, #001f1c)');
            setSP('--elem-border-color', 'none');
            setSP('--navbar-bg', 'rgba(0, 31, 28, 0.8)');
            setSP('--select-bg', '#002e2b');
            setSP('--tab-btn-active', '#004d40');
            setSP('--box-shadow', '0px 8px 16px 0px rgba(0, 0, 0, 0.4)');
            setSP('--msger-private-bg', 'radial-gradient(#4f4f4f, #1c1c1c)');
            setSP('--left-msg-bg', '#004d40');
            setSP('--right-msg-bg', '#00312c');
            setSP('--private-msg-bg', '#004a47');
            setSP('--btn-bar-bg-color', '#FFFFFF');
            setSP('--btn-bar-color', '#000000');
            setSP('--btns-bg-color', 'rgba(0, 42, 34, 0.7)');
            setSP('--dd-color', '#00FF00');
            document.body.style.background = 'radial-gradient(#004d40, #001f1c)';
            mirotalkTheme.selectedIndex = 2;
            break;
        case 'blue':
            // blue theme
            swBg = 'radial-gradient(#1a237e, #0d1b34)';
            setSP('--body-bg', 'radial-gradient(#1a237e, #0d1b34)');
            setSP('--msger-bg', 'radial-gradient(#1a237e, #0d1b34)');
            setSP('--wb-bg', 'radial-gradient(#1a237e, #0d1b34)');
            setSP('--elem-border-color', 'none');
            setSP('--navbar-bg', 'rgba(13, 27, 52, 0.8)');
            setSP('--select-bg', '#0d1b34');
            setSP('--tab-btn-active', '#1a237e');
            setSP('--box-shadow', '0px 8px 16px 0px rgba(0, 0, 0, 0.4)');
            setSP('--msger-private-bg', 'radial-gradient(#4f4f4f, #1c1c1c)');
            setSP('--left-msg-bg', '#1a237e');
            setSP('--right-msg-bg', '#0d1b34');
            setSP('--private-msg-bg', '#1a237e');
            setSP('--btn-bar-bg-color', '#FFFFFF');
            setSP('--btn-bar-color', '#000000');
            setSP('--btns-bg-color', 'rgba(0, 39, 77, 0.7)');
            setSP('--dd-color', '#1E90FF');
            document.body.style.background = 'radial-gradient(#1a237e, #0d1b34)';
            mirotalkTheme.selectedIndex = 3;
            break;
        case 'red':
            // red theme
            swBg = 'radial-gradient(#8B0000, #320000)';
            setSP('--body-bg', 'radial-gradient(#8B0000, #320000)');
            setSP('--msger-bg', 'radial-gradient(#8B0000, #320000)');
            setSP('--wb-bg', 'radial-gradient(#8B0000, #320000)');
            setSP('--navbar-bg', 'rgba(50, 0, 0, 0.8)');
            setSP('--select-bg', '#320000');
            setSP('--tab-btn-active', '#8B0000');
            setSP('--box-shadow', '0px 8px 16px 0px rgba(0, 0, 0, 0.4)');
            setSP('--msger-private-bg', 'radial-gradient(#4f4f4f, #1c1c1c)');
            setSP('--left-msg-bg', '#8B0000');
            setSP('--right-msg-bg', '#4B0000');
            setSP('--private-msg-bg', '#8B0000');
            setSP('--btn-bar-bg-color', '#FFFFFF');
            setSP('--btn-bar-color', '#000000');
            setSP('--btns-bg-color', 'rgba(42, 13, 13, 0.7)');
            setSP('--dd-color', '#FF4500');
            document.body.style.background = 'radial-gradient(#8B0000, #320000)';
            mirotalkTheme.selectedIndex = 4;
            break;
        case 'purple':
            // purple theme
            swBg = 'radial-gradient(#4B0082, #2C003E)';
            setSP('--body-bg', 'radial-gradient(#4B0082, #2C003E)');
            setSP('--msger-bg', 'radial-gradient(#4B0082, #2C003E)');
            setSP('--wb-bg', 'radial-gradient(#4B0082, #2C003E)');
            setSP('--elem-border-color', 'none');
            setSP('--navbar-bg', 'rgba(44, 0, 62, 0.8)');
            setSP('--select-bg', '#2C003E');
            setSP('--tab-btn-active', '#4B0082');
            setSP('--box-shadow', '0px 8px 16px 0px rgba(0, 0, 0, 0.4)');
            setSP('--msger-private-bg', 'radial-gradient(#4f4f4f, #1c1c1c)');
            setSP('--left-msg-bg', '#4B0082');
            setSP('--right-msg-bg', '#2C003E');
            setSP('--private-msg-bg', '#4B0082');
            setSP('--btn-bar-bg-color', '#FFFFFF');
            setSP('--btn-bar-color', '#000000');
            setSP('--btns-bg-color', 'rgba(42, 0, 29, 0.7)');
            setSP('--dd-color', '#BF00FF');
            document.body.style.background = 'radial-gradient(#4B0082, #2C003E)';
            mirotalkTheme.selectedIndex = 5;
            break;
        case 'orange':
            // orange theme
            swBg = 'radial-gradient(#FF8C00, #4B1C00)';
            setSP('--body-bg', 'radial-gradient(#FF8C00, #4B1C00)');
            setSP('--msger-bg', 'radial-gradient(#FF8C00, #4B1C00)');
            setSP('--wb-bg', 'radial-gradient(#FF8C00, #4B1C00)');
            setSP('--elem-border-color', 'none');
            setSP('--navbar-bg', 'rgba(75, 28, 0, 0.8)');
            setSP('--select-bg', '#4B1C00');
            setSP('--tab-btn-active', '#FF8C00');
            setSP('--box-shadow', '0px 8px 16px 0px rgba(0, 0, 0, 0.4)');
            setSP('--msger-private-bg', 'radial-gradient(#4f4f4f, #1c1c1c)');
            setSP('--left-msg-bg', '#FF8C00');
            setSP('--right-msg-bg', '#4B1C00');
            setSP('--private-msg-bg', '#FF8C00');
            setSP('--btn-bar-bg-color', '#FFFFFF');
            setSP('--btn-bar-color', '#000000');
            setSP('--btns-bg-color', 'rgba(61, 26, 0, 0.7)');
            setSP('--dd-color', '#FFA500');
            document.body.style.background = 'radial-gradient(#FF8C00, #4B1C00)';
            mirotalkTheme.selectedIndex = 6;
            break;
        case 'yellow':
            // yellow theme
            swBg = 'radial-gradient(#FFD700, #3B3B00)';
            setSP('--body-bg', 'radial-gradient(#FFD700, #3B3B00)');
            setSP('--msger-bg', 'radial-gradient(#FFD700, #3B3B00)');
            setSP('--wb-bg', 'radial-gradient(#FFD700, #3B3B00)');
            setSP('--elem-border-color', 'none');
            setSP('--navbar-bg', 'rgba(59, 59, 0, 0.8)');
            setSP('--select-bg', '#3B3B00');
            setSP('--tab-btn-active', '#FFD700');
            setSP('--box-shadow', '0px 8px 16px 0px rgba(0, 0, 0, 0.4)');
            setSP('--msger-private-bg', 'radial-gradient(#4f4f4f, #1c1c1c)');
            setSP('--left-msg-bg', '#FFD700');
            setSP('--right-msg-bg', '#B8860B');
            setSP('--private-msg-bg', '#FFD700');
            setSP('--btn-bar-bg-color', '#FFFFFF');
            setSP('--btn-bar-color', '#000000');
            setSP('--btns-bg-color', 'rgba(77, 59, 0, 0.7)');
            setSP('--dd-color', '#FFD700');
            document.body.style.background = 'radial-gradient(#FFD700, #3B3B00)';
            mirotalkTheme.selectedIndex = 7;
            break;
        // ...
        default:
            console.log('No theme found');
            break;
    }
    //setButtonsBarPosition(mainButtonsBarPosition);
}

/**
 * Set buttons bar position
 * @param {string} position vertical / horizontal
 */
function setButtonsBarPosition(position) {
    if (!position || isMobileDevice) return;

    mainButtonsBarPosition = position;
    switch (mainButtonsBarPosition) {
        case 'vertical':
            // buttonsBar
            setSP('--btns-top', '50%');
            setSP('--btns-right', '0px');
            setSP('--btns-left', '15px');
            setSP('--btns-margin-left', '0px');
            setSP('--btns-width', '40px');
            setSP('--btns-flex-direction', 'column');
            // bottomButtons horizontally
            setSP('--bottom-btns-top', 'auto');
            setSP('--bottom-btns-left', '50%');
            setSP('--bottom-btns-bottom', '0');
            setSP('--bottom-btns-translate-X', '-50%');
            setSP('--bottom-btns-translate-Y', '0%');
            setSP('--bottom-btns-margin-bottom', '16px');
            setSP('--bottom-btns-flex-direction', 'row');
            break;
        case 'horizontal':
            // buttonsBar
            setSP('--btns-top', '95%');
            setSP('--btns-right', '25%');
            setSP('--btns-left', '50%');
            setSP('--btns-margin-left', '-260px');
            setSP('--btns-width', '520px');
            setSP('--btns-flex-direction', 'row');
            // bottomButtons vertically
            setSP('--bottom-btns-top', '50%');
            setSP('--bottom-btns-left', '15px');
            setSP('--bottom-btns-bottom', 'auto');
            setSP('--bottom-btns-translate-X', '0%');
            setSP('--bottom-btns-translate-Y', '-50%');
            setSP('--bottom-btns-margin-bottom', '0');
            setSP('--bottom-btns-flex-direction', 'column');
            break;
        default:
            console.log('No position found');
            break;
    }
    refreshMainButtonsToolTipPlacement();
}

/**
 * Init to enumerate the devices
 */
async function initEnumerateDevices() {
    console.log('05. init Enumerate Video and Audio Devices');
    await initEnumerateVideoDevices();
    await initEnumerateAudioDevices();
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
        .then(async (stream) => {
            await enumerateAudioDevices(stream);
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
        .then(async (stream) => {
            await enumerateVideoDevices(stream);
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
async function enumerateAudioDevices(stream) {
    console.log('06. Get Audio Devices');
    await navigator.mediaDevices
        .enumerateDevices()
        .then((devices) =>
            devices.forEach(async (device) => {
                let el,
                    eli = null;
                if ('audioinput' === device.kind) {
                    el = audioInputSelect;
                    eli = initMicrophoneSelect;
                    lS.DEVICES_COUNT.audio++;
                } else if ('audiooutput' === device.kind) {
                    el = audioOutputSelect;
                    eli = initSpeakerSelect;
                    lS.DEVICES_COUNT.speaker++;
                }
                if (!el) return;
                await addChild(device, [el, eli]);
            }),
        )
        .then(async () => {
            await stopTracks(stream);
            isEnumerateAudioDevices = true;
            //const sinkId = 'sinkId' in HTMLMediaElement.prototype;
            audioOutputSelect.disabled = !sinkId;
            // Check if there is speakers
            if (!sinkId || initSpeakerSelect.options.length === 0) {
                elemDisplay(initSpeakerSelect, false);
                elemDisplay(audioOutputDiv, false);
            }
        });
}

/**
 * Enumerate Video
 * @param {object} stream
 */
async function enumerateVideoDevices(stream) {
    console.log('07. Get Video Devices');
    await navigator.mediaDevices
        .enumerateDevices()
        .then((devices) =>
            devices.forEach(async (device) => {
                let el,
                    eli = null;
                if ('videoinput' === device.kind) {
                    el = videoSelect;
                    eli = initVideoSelect;
                    lS.DEVICES_COUNT.video++;
                }
                if (!el) return;
                await addChild(device, [el, eli]);
            }),
        )
        .then(async () => {
            await stopTracks(stream);
            isEnumerateVideoDevices = true;
        });
}

/**
 * Stop tracks from stream
 * @param {object} stream
 */
async function stopTracks(stream) {
    stream.getTracks().forEach((track) => {
        track.stop();
    });
}

/**
 * Add child to element
 * @param {object} device
 * @param {object} els
 */
async function addChild(device, els) {
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
}

/**
 * Setup local video media. Ask the user for permission to use the computer's camera,
 * and attach it to a <video> tag if access is granted.
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
 */
async function setupLocalVideoMedia() {
    if (!useVideo || localVideoMediaStream) {
        return;
    }

    console.log('Requesting access to video inputs');

    const videoConstraints = useVideo ? await getVideoConstraints('default') : false;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        await updateLocalVideoMediaStream(stream);
    } catch (err) {
        console.error('Error accessing video device', err);
        console.warn('Fallback to default constraints');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            await updateLocalVideoMediaStream(stream);
        } catch (fallbackErr) {
            console.error('Error accessing video device with default constraints', fallbackErr);
            handleMediaError('video', fallbackErr);
        }
    }

    /**
     * Update Local Media Stream
     * @param {MediaStream} stream
     */
    async function updateLocalVideoMediaStream(stream) {
        if (stream) {
            localVideoMediaStream = stream;
            await loadLocalMedia(stream, 'video');
            console.log('Access granted to video device');
        }
    }
}

/**
 * Setup local audio media. Ask the user for permission to use the computer's microphone,
 * and attach it to an <audio> tag if access is granted.
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
 */
async function setupLocalAudioMedia() {
    if (!useAudio || localAudioMediaStream) {
        return;
    }

    console.log('Requesting access to audio inputs');

    const audioConstraints = useAudio ? await getAudioConstraints() : false;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        if (stream) {
            await loadLocalMedia(stream, 'audio');
            if (useAudio) {
                localAudioMediaStream = stream;
                await getMicrophoneVolumeIndicator(stream);
                console.log('10. Access granted to audio device');
            }
        }
    } catch (err) {
        handleMediaError('audio', err);
    }
}

/**
 * Handle media access error.
 * https://blog.addpipe.com/common-getusermedia-errors/
 *
 * @param {string} mediaType - 'video' or 'audio'
 * @param {object} err - The error object
 */
function handleMediaError(mediaType, err) {
    playSound('alert');
    //
    let errMessage = err;

    switch (err.name) {
        case 'NotFoundError':
        case 'DevicesNotFoundError':
            errMessage = 'Required track is missing';
            break;
        case 'NotReadableError':
        case 'TrackStartError':
            errMessage = 'Already in use';
            break;
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
            errMessage = 'Constraints cannot be satisfied by available devices';
            break;
        case 'NotAllowedError':
        case 'PermissionDeniedError':
            errMessage = 'Permission denied in browser';
            break;
        case 'TypeError':
            errMessage = 'Empty constraints object';
            break;
        default:
            break;
    }

    // Print message to inform user
    const $html = `
        <ul style="text-align: left">
            <li>Media type: ${mediaType}</li>
            <li>Error name: ${err.name}</li>
            <li>Error message: <p style="color: red">${errMessage}</p></li>
            <li>Common: <a href="https://blog.addpipe.com/common-getusermedia-errors" target="_blank">getUserMedia errors</a></li>
        </ul>
    `;

    msgHTML(null, images.forbidden, 'Access denied', $html, 'center', '/');

    /*
        it immediately stops the execution of the current function and jumps to the nearest enclosing try...catch block or, 
        if none exists, it interrupts the script execution and displays an error message in the console.
    */
    throw new Error(
        `Access denied for ${mediaType} device [${err.name}]: ${errMessage} check the common getUserMedia errors: https://blog.addpipe.com/common-getusermedia-errors/`,
    );
}

/**
 * Load Local Media Stream obj
 * @param {object} stream media stream audio - video
 */
async function loadLocalMedia(stream, kind) {
    if (stream) console.log('LOAD LOCAL MEDIA STREAM TRACKS', stream.getTracks());

    switch (kind) {
        case 'video':
            //alert('local video');
            console.log('SETUP LOCAL VIDEO STREAM');

            // local video elements
            const myVideoWrap = document.createElement('div');
            const myLocalMedia = document.createElement('video');

            // html elements
            const myVideoNavBar = document.createElement('div');
            const mySessionTime = document.createElement('button');
            const myPeerName = document.createElement('p');
            const myHandStatusIcon = document.createElement('button');
            const myVideoToImgBtn = document.createElement('button');
            const myPrivacyBtn = document.createElement('button');
            const myVideoStatusIcon = document.createElement('button');
            const myAudioStatusIcon = document.createElement('button');
            const myVideoFullScreenBtn = document.createElement('button');
            const myVideoPinBtn = document.createElement('button');
            const myVideoMirrorBtn = document.createElement('button');
            const myVideoZoomInBtn = document.createElement('button');
            const myVideoZoomOutBtn = document.createElement('button');
            const myVideoPiPBtn = document.createElement('button');
            const myVideoAvatarImage = document.createElement('img');
            const myPitchMeter = document.createElement('div');
            const myPitchBar = document.createElement('div');

            // session time
            mySessionTime.setAttribute('id', 'mySessionTime');
            mySessionTime.className = 'notranslate';
            mySessionTime.style.cursor = 'default';

            // my peer name
            myPeerName.setAttribute('id', 'myVideoParagraph');
            myPeerName.className = 'videoPeerName notranslate';

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
            myVideoStatusIcon.style.cursor = 'default';

            // my audio status element
            myAudioStatusIcon.setAttribute('id', 'myAudioStatusIcon');
            myAudioStatusIcon.className = className.audioOn;
            myAudioStatusIcon.style.cursor = 'default';

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

            // my video Picture in Picture
            myVideoPiPBtn.setAttribute('id', 'myVideoPiPBtn');
            myVideoPiPBtn.className = className.pip;

            // my video pin/unpin button
            myVideoPinBtn.setAttribute('id', 'myVideoPinBtn');
            myVideoPinBtn.className = className.pinUnpin;

            // my video toggle mirror
            myVideoMirrorBtn.setAttribute('id', 'myVideoMirror');
            myVideoMirrorBtn.className = className.mirror;

            // no mobile devices
            if (!isMobileDevice) {
                setTippy(mySessionTime, 'Session Time', 'bottom');
                setTippy(myPeerName, 'My name', 'bottom');
                setTippy(myHandStatusIcon, 'My hand is raised', 'bottom');
                setTippy(myPrivacyBtn, 'Toggle video privacy', 'bottom');
                setTippy(myVideoStatusIcon, 'My video is on', 'bottom');
                setTippy(myAudioStatusIcon, 'My audio is on', 'bottom');
                setTippy(myVideoToImgBtn, 'Take a snapshot', 'bottom');
                setTippy(myVideoFullScreenBtn, 'Full screen mode', 'bottom');
                setTippy(myVideoPiPBtn, 'Toggle picture in picture', 'bottom');
                setTippy(myVideoZoomInBtn, 'Zoom in video', 'bottom');
                setTippy(myVideoZoomOutBtn, 'Zoom out video', 'bottom');
                setTippy(myVideoPinBtn, 'Toggle Pin video', 'bottom');
                setTippy(myVideoMirrorBtn, 'Toggle video mirror', 'bottom');
            }

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
            myVideoNavBar.appendChild(mySessionTime);

            !isMobileDevice && myVideoNavBar.appendChild(myVideoPinBtn);

            myVideoNavBar.appendChild(myVideoMirrorBtn);

            buttons.local.showVideoPipBtn && myVideoNavBar.appendChild(myVideoPiPBtn);

            if (buttons.local.showZoomInOutBtn) {
                myVideoNavBar.appendChild(myVideoZoomInBtn);
                myVideoNavBar.appendChild(myVideoZoomOutBtn);
            }

            isVideoFullScreenSupported && myVideoNavBar.appendChild(myVideoFullScreenBtn);
            buttons.local.showSnapShotBtn && myVideoNavBar.appendChild(myVideoToImgBtn);
            buttons.local.showVideoCircleBtn && myVideoNavBar.appendChild(myPrivacyBtn);

            myVideoNavBar.appendChild(myVideoStatusIcon);
            myVideoNavBar.appendChild(myAudioStatusIcon);
            myVideoNavBar.appendChild(myHandStatusIcon);

            // add my pitchBar
            myPitchMeter.appendChild(myPitchBar);

            // hand display none on default menad is raised == false
            elemDisplay(myHandStatusIcon, false);

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

            videoMediaContainer.appendChild(myVideoWrap);
            elemDisplay(myVideoWrap, false);

            logStreamSettingsInfo('localVideoMediaStream', stream);
            attachMediaStream(myLocalMedia, stream);
            adaptAspectRatio();

            handleVideoToggleMirror(myLocalMedia.id, myVideoMirrorBtn.id);

            isVideoFullScreenSupported && handleVideoPlayerFs(myLocalMedia.id, myVideoFullScreenBtn.id);

            handleFileDragAndDrop(myLocalMedia.id, myPeerId, true);

            buttons.local.showSnapShotBtn && handleVideoToImg(myLocalMedia.id, myVideoToImgBtn.id);

            buttons.local.showVideoCircleBtn && handleVideoPrivacyBtn(myLocalMedia.id, myPrivacyBtn.id);

            handleVideoPinUnpin(myLocalMedia.id, myVideoPinBtn.id, myVideoWrap.id, myLocalMedia.id);

            buttons.local.showVideoPipBtn && handlePictureInPicture(myVideoPiPBtn.id, myLocalMedia.id, myPeerId);

            ZOOM_IN_OUT_ENABLED && handleVideoZoomInOut(myVideoZoomInBtn.id, myVideoZoomOutBtn.id, myLocalMedia.id);

            refreshMyVideoStatus(stream);

            if (!useVideo) {
                elemDisplay(myVideoAvatarImage, true, 'block');
                myVideoStatusIcon.className = className.videoOff;
                videoBtn.className = className.videoOff;
                if (!isMobileDevice) {
                    setTippy(myVideoStatusIcon, 'My video is disabled', 'bottom');
                }
            }

            if (!useAudio) {
                myAudioStatusIcon.className = className.audioOff;
                audioBtn.className = className.audioOff;
                if (!isMobileDevice) {
                    setTippy(myAudioStatusIcon, 'My audio is disabled', 'bottom');
                }
            }
            break;
        case 'audio':
            //alert('local audio');
            console.log('SETUP LOCAL AUDIO STREAM');
            // handle remote audio elements
            const localAudioWrap = document.createElement('div');
            const localAudioMedia = document.createElement('audio');
            localAudioMedia.id = 'myAudio';
            localAudioMedia.controls = false;
            localAudioMedia.autoplay = true;
            localAudioMedia.muted = true;
            localAudioMedia.volume = 0;
            localAudioWrap.appendChild(localAudioMedia);
            audioMediaContainer.appendChild(localAudioWrap);
            logStreamSettingsInfo('localAudioMediaStream', stream);
            attachMediaStream(localAudioMedia, stream);
            refreshMyAudioStatus(stream);
            break;
        default:
            break;
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
            background: swBg,
            position: 'center',
            icon: 'question',
            text: 'Do you want to share your screen?',
            showDenyButton: true,
            confirmButtonText: `Yes`,
            denyButtonText: `No`,
            showClass: { popup: 'animate__animated animate__fadeInDown' },
            hideClass: { popup: 'animate__animated animate__fadeOutUp' },
        }).then((result) => {
            if (result.isConfirmed) {
                screenShareBtn.click();
            }
        });
    }
}

/**
 * Load Remote Media Stream obj
 * @param {MediaStream} stream media stream audio - video
 * @param {object} peers all peers info connected to the same room
 * @param {string} peer_id socket.id
 */
async function loadRemoteMediaStream(stream, peers, peer_id, kind) {
    // get data from peers obj
    console.log('REMOTE PEER INFO', peers[peer_id]);

    const peer_name = peers[peer_id]['peer_name'];
    const peer_audio = peers[peer_id]['peer_audio'];
    const peer_video = peers[peer_id]['peer_video'];
    const peer_video_status = peers[peer_id]['peer_video_status'];
    const peer_audio_status = peers[peer_id]['peer_audio_status'];
    const peer_screen_status = peers[peer_id]['peer_screen_status'];
    const peer_hand_status = peers[peer_id]['peer_hand_status'];
    const peer_rec_status = peers[peer_id]['peer_rec_status'];
    const peer_privacy_status = peers[peer_id]['peer_privacy_status'];

    if (stream) console.log('LOAD REMOTE MEDIA STREAM TRACKS - PeerName:[' + peer_name + ']', stream.getTracks());

    switch (kind) {
        case 'video':
            // alert('remote video');
            console.log('SETUP REMOTE VIDEO STREAM');

            // handle remote video elements
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
            const remoteVideoFocusBtn = document.createElement('button');
            const remoteVideoMirrorBtn = document.createElement('button');
            const remoteVideoZoomInBtn = document.createElement('button');
            const remoteVideoZoomOutBtn = document.createElement('button');
            const remoteVideoPiPBtn = document.createElement('button');
            const remoteVideoAvatarImage = document.createElement('img');
            const remotePitchMeter = document.createElement('div');
            const remotePitchBar = document.createElement('div');
            const remoteAudioVolume = document.createElement('input');

            // Expand button UI/UX
            const remoteExpandBtnDiv = document.createElement('div');
            const remoteExpandBtn = document.createElement('button');
            const remoteExpandContainerDiv = document.createElement('div');

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
            remoteVideoStatusIcon.style.cursor = 'default';

            // remote audio status element
            remoteAudioStatusIcon.setAttribute('id', peer_id + '_audioStatus');
            remoteAudioStatusIcon.className = className.audioOn;
            remoteAudioStatusIcon.style.cursor = 'default';

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

            // remote video Picture in Picture
            remoteVideoPiPBtn.setAttribute('id', peer_id + 'videoPIP');
            remoteVideoPiPBtn.className = className.pip;

            // remote video full screen mode
            remoteVideoFullScreenBtn.setAttribute('id', peer_id + '_fullScreen');
            remoteVideoFullScreenBtn.className = className.fullScreen;

            // remote video pin/unpin button
            remoteVideoPinBtn.setAttribute('id', peer_id + '_pinUnpin');
            remoteVideoPinBtn.className = className.pinUnpin;

            // remote video hide all button
            remoteVideoFocusBtn.setAttribute('id', peer_id + '_focusMode');
            remoteVideoFocusBtn.className = className.hideAll;

            // remote video toggle mirror
            remoteVideoMirrorBtn.setAttribute('id', peer_id + '_toggleMirror');
            remoteVideoMirrorBtn.className = className.mirror;

            // no mobile devices
            if (!isMobileDevice) {
                setTippy(remotePeerName, 'Participant name', 'bottom');
                setTippy(remoteHandStatusIcon, 'Participant hand is raised', 'bottom');
                setTippy(remoteVideoStatusIcon, 'Participant video is on', 'bottom');
                setTippy(remoteAudioStatusIcon, 'Participant audio is on', 'bottom');
                setTippy(remoteAudioVolume, '🔊 Volume', 'top');
                setTippy(remoteVideoAudioUrlBtn, 'Send Video or Audio', 'bottom');
                setTippy(remotePrivateMsgBtn, 'Send private message', 'bottom');
                setTippy(remoteFileShareBtn, 'Send file', 'bottom');
                setTippy(remoteVideoToImgBtn, 'Take a snapshot', 'bottom');
                setTippy(remotePeerKickOut, 'Kick out', 'bottom');
                setTippy(remoteVideoFullScreenBtn, 'Full screen mode', 'bottom');
                setTippy(remoteVideoZoomInBtn, 'Zoom in video', 'bottom');
                setTippy(remoteVideoZoomOutBtn, 'Zoom out video', 'bottom');
                setTippy(remoteVideoPiPBtn, 'Toggle picture in picture', 'bottom');
                setTippy(remoteVideoPinBtn, 'Toggle Pin video', 'bottom');
                setTippy(remoteVideoFocusBtn, 'Toggle Focus mode', 'bottom');
                setTippy(remoteVideoMirrorBtn, 'Toggle video mirror', 'bottom');
            }

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

            // remote expand buttons div
            remoteExpandBtnDiv.className = 'expand-video';
            remoteExpandBtn.id = peer_id + '_videoExpandBtn';
            remoteExpandBtn.className = 'fas fa-ellipsis-vertical';
            remoteExpandContainerDiv.className = 'expand-video-content';

            // attach to remote video nav bar
            !isMobileDevice && remoteVideoNavBar.appendChild(remoteVideoPinBtn);

            buttons.remote.showVideoFocusBtn && remoteVideoNavBar.appendChild(remoteVideoFocusBtn);

            remoteVideoNavBar.appendChild(remoteVideoMirrorBtn);

            buttons.remote.showVideoPipBtn && remoteVideoNavBar.appendChild(remoteVideoPiPBtn);

            // Add to expand container div...
            if (buttons.remote.showZoomInOutBtn) {
                remoteExpandContainerDiv.appendChild(remoteVideoZoomInBtn);
                remoteExpandContainerDiv.appendChild(remoteVideoZoomOutBtn);
            }
            buttons.remote.showPrivateMessageBtn && remoteExpandContainerDiv.appendChild(remotePrivateMsgBtn);
            buttons.remote.showFileShareBtn && remoteExpandContainerDiv.appendChild(remoteFileShareBtn);
            buttons.remote.showShareVideoAudioBtn && remoteExpandContainerDiv.appendChild(remoteVideoAudioUrlBtn);
            buttons.remote.showKickOutBtn && remoteExpandContainerDiv.appendChild(remotePeerKickOut);

            remoteExpandBtnDiv.appendChild(remoteExpandBtn);
            remoteExpandBtnDiv.appendChild(remoteExpandContainerDiv);

            isVideoFullScreenSupported && remoteVideoNavBar.appendChild(remoteVideoFullScreenBtn);

            buttons.remote.showSnapShotBtn && remoteVideoNavBar.appendChild(remoteVideoToImgBtn);

            remoteVideoNavBar.appendChild(remoteVideoStatusIcon);
            remoteVideoNavBar.appendChild(remoteAudioStatusIcon);

            // Disabled audio volume control on Mobile devices
            if (!isMobileDevice && peer_audio && buttons.remote.showAudioVolume) {
                remoteVideoNavBar.appendChild(remoteAudioVolume);
            }
            remoteVideoNavBar.appendChild(remoteHandStatusIcon);

            remoteVideoNavBar.appendChild(remoteExpandBtnDiv);

            remoteMedia.setAttribute('id', peer_id + '___video');
            remoteMedia.setAttribute('playsinline', true);
            remoteMedia.autoplay = true;
            remoteMediaControls = isMobileDevice ? false : remoteMediaControls;
            remoteMedia.style.objectFit = peer_screen_status ? 'contain' : 'var(--video-object-fit)';
            remoteMedia.style.name = peer_id + (peer_screen_status ? '_typeScreen' : '_typeCam');
            remoteMedia.controls = remoteMediaControls;

            remoteVideoWrap.className = 'Camera';
            remoteVideoWrap.setAttribute('id', peer_id + '_videoWrap');
            remoteVideoWrap.style.display = isHideALLVideosActive ? 'none' : 'block';

            // add elements to videoWrap div
            remoteVideoWrap.appendChild(remoteVideoNavBar);
            remoteVideoWrap.appendChild(remoteVideoAvatarImage);
            remoteVideoWrap.appendChild(remotePitchMeter);
            remoteVideoWrap.appendChild(remoteMedia);
            remoteVideoWrap.appendChild(remotePeerName);

            // need later on disconnect or remove peers
            peerVideoMediaElements[remoteMedia.id] = remoteVideoWrap;

            // append all elements to videoMediaContainer
            videoMediaContainer.appendChild(remoteVideoWrap);
            // attachMediaStream is a part of the adapter.js library
            attachMediaStream(remoteMedia, stream);
            // resize video elements
            adaptAspectRatio();

            // handle video to image
            buttons.remote.showSnapShotBtn && handleVideoToImg(remoteMedia.id, remoteVideoToImgBtn.id, peer_id);

            // handle video pin/unpin
            handleVideoPinUnpin(remoteMedia.id, remoteVideoPinBtn.id, remoteVideoWrap.id, peer_id, peer_screen_status);

            // handle video focus mode
            handleVideoFocusMode(remoteVideoFocusBtn, remoteVideoWrap, remoteMedia);

            // handle video toggle mirror
            handleVideoToggleMirror(remoteMedia.id, remoteVideoMirrorBtn.id);

            // handle vide picture in picture
            buttons.remote.showVideoPipBtn && handlePictureInPicture(remoteVideoPiPBtn.id, remoteMedia.id, peer_id);

            // handle video zoomIn/Out
            ZOOM_IN_OUT_ENABLED &&
                handleVideoZoomInOut(remoteVideoZoomInBtn.id, remoteVideoZoomOutBtn.id, remoteMedia.id, peer_id);

            // pin video on screen share detected
            if (peer_video_status && peer_screen_status) remoteVideoPinBtn.click();

            // handle video full screen mode
            isVideoFullScreenSupported && handleVideoPlayerFs(remoteMedia.id, remoteVideoFullScreenBtn.id, peer_id);

            // handle file share drag and drop
            handleFileDragAndDrop(remoteMedia.id, peer_id);

            // handle kick out button event
            buttons.remote.showKickOutBtn && handlePeerKickOutBtn(peer_id);

            // set video privacy true
            peer_privacy_status && setVideoPrivacyStatus(remoteMedia.id, peer_privacy_status);

            // refresh remote peers avatar name
            setPeerAvatarImgName(remoteVideoAvatarImage.id, peer_name);
            // refresh remote peers hand icon status and title
            setPeerHandStatus(peer_id, peer_name, peer_hand_status);
            // refresh remote peers video icon status and title
            setPeerVideoStatus(peer_id, peer_screen_status ? peer_screen_status : peer_video_status);
            // refresh remote peers audio icon status and title
            setPeerAudioStatus(peer_id, peer_audio_status);
            // handle remote peers audio on-off
            handlePeerAudioBtn(peer_id);
            // handle remote peers video on-off
            handlePeerVideoBtn(peer_id);

            // handle remote private messages
            buttons.remote.showPrivateMessageBtn && handlePeerPrivateMsg(peer_id, peer_name);
            // handle remote send file
            buttons.remote.showFileShareBtn && handlePeerSendFile(peer_id);
            // handle remote video - audio URL
            buttons.remote.showShareVideoAudioBtn && handlePeerVideoAudioUrl(peer_id);

            // show status menu
            toggleClassElements('statusMenu', 'inline');

            // notify if peer started to recording own screen + audio
            if (peer_rec_status) notifyRecording(peer_id, peer_name, 'Started');

            // Peer without camera, screen sharing OFF
            if (!peer_video && !peer_screen_status) {
                elemDisplay(remoteVideoAvatarImage, true, 'block');
                remoteVideoStatusIcon.className = className.videoOff;
            }
            // Peer without camera, screen sharing ON
            if (!peer_video && peer_screen_status) {
                handleScreenStart(peer_id);
            }
            break;
        case 'audio':
            // alert('remote audio');
            console.log('SETUP REMOTE AUDIO STREAM');
            // handle remote audio elements
            const remoteAudioWrap = document.createElement('div');
            const remoteAudioMedia = document.createElement('audio');
            const remoteAudioVolumeId = peer_id + '_audioVolume';
            remoteAudioMedia.id = peer_id + '___audio';
            remoteAudioMedia.autoplay = true;
            remoteAudioMedia.audio = 1.0;
            remoteAudioWrap.appendChild(remoteAudioMedia);
            audioMediaContainer.appendChild(remoteAudioWrap);
            attachMediaStream(remoteAudioMedia, stream);
            peerAudioMediaElements[remoteAudioMedia.id] = remoteAudioWrap;
            // handle remote peers audio volume
            handleAudioVolume(remoteAudioVolumeId, remoteAudioMedia.id);
            // Toggle visibility of volume control based on the audio status of the peer
            elemDisplay(getId(remoteAudioVolumeId), peer_audio_status);
            // Change audio output...
            if (sinkId && audioOutputSelect.value) await changeAudioDestination(remoteAudioMedia);
            break;
        default:
            break;
    }
}

/**
 * Log stream settings info
 * @param {string} name function name called from
 * @param {object} stream media stream audio - video
 */
function logStreamSettingsInfo(name, stream) {
    if ((useVideo || isScreenStreaming) && hasVideoTrack(stream)) {
        console.log(name, {
            video: {
                label: stream.getVideoTracks()[0].label,
                settings: stream.getVideoTracks()[0].getSettings(),
            },
        });
    }
    if (useAudio && hasAudioTrack(stream)) {
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
    const participantsCount = videoMediaContainer.childElementCount;
    if (peersCount) peersCount.innerText = participantsCount;
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
 * Get Gravatar from email
 * @param {string} email
 * @param {integer} size
 * @returns object image
 */
function genGravatar(email, size = false) {
    const hash = md5(email.toLowerCase().trim());
    const gravatarURL = `https://www.gravatar.com/avatar/${hash}` + (size ? `?s=${size}` : '?s=250');
    return gravatarURL;
    function md5(input) {
        return CryptoJS.MD5(input).toString();
    }
}

/**
 * Check if valid email
 * @param {string} email
 * @returns boolean
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
    const bgColor = `rgb(${red}, ${green}, ${blue})`;
    const textColor = '#ffffff';
    const svg = `
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
    videoAvatarImageElement.style.pointerEvents = 'none';
    if (useAvatarSvg) {
        const avatarImgSize = isMobileDevice ? 128 : 256;
        const avatarImgSvg = isValidEmail(peerName) ? genGravatar(peerName) : genAvatarSvg(peerName, avatarImgSize);
        videoAvatarImageElement.setAttribute('src', avatarImgSvg);
    } else {
        videoAvatarImageElement.setAttribute('src', images.avatar);
    }
}

/**
 * Set Chat avatar image by peer name
 * @param {string} avatar position left/right
 * @param {string} peerName me or peer name
 */
function setPeerChatAvatarImgName(avatar, peerName) {
    const avatarImg = isValidEmail(peerName) ? genGravatar(peerName) : genAvatarSvg(peerName, 32);

    switch (avatar) {
        case 'left':
            // console.log("Set Friend chat avatar image");
            leftChatAvatar = avatarImg;
            break;
        case 'right':
            // console.log("Set My chat avatar image");
            rightChatAvatar = avatarImg;
            break;
        default:
            break;
    }
}

/**
 * Handle Video Toggle Mirror
 * @param {string} videoId
 * @param {string} videoToggleMirrorBtnId
 */
function handleVideoToggleMirror(videoId, videoToggleMirrorBtnId) {
    const videoPlayer = getId(videoId);
    const videoToggleMirrorBtn = getId(videoToggleMirrorBtnId);
    if (videoPlayer && videoToggleMirrorBtn) {
        // Toggle video mirror
        videoToggleMirrorBtn.addEventListener('click', (e) => {
            videoPlayer.classList.toggle('mirror');
        });
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
    const videoPlayer = getId(videoId);
    const videoFullScreenBtn = getId(videoFullScreenBtnId);

    // handle Chrome Firefox Opera Microsoft Edge videoPlayer ESC
    videoPlayer.addEventListener('fullscreenchange', (e) => {
        // if Controls enabled, or document on FS do nothing
        if (videoPlayer.controls || isDocumentOnFullScreen) return;
        const fullscreenElement = document.fullscreenElement;
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
        const webkitIsFullScreen = document.webkitIsFullScreen;
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
            const remoteVideoStatusBtn = getId(peer_id + '_videoStatus');
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
    const videoPeer = getId(elemId);

    videoPeer.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.parentElement.style.outline = '3px dashed var(--dd-color)';
        document.querySelector('.Camera').style.outline = 'none';
    });

    videoPeer.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.parentElement.style.outline = 'none';
    });

    videoPeer.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.parentElement.style.outline = 'none';
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
            const item = e.dataTransfer.items[0].webkitGetAsEntry();
            console.log('Drag and drop', item);
            if (item.isDirectory) {
                return userLog('warning', 'Please drag and drop a single file not a folder.', 'top-end');
            }
            const file = e.dataTransfer.items[0].getAsFile();
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
    const video = getId(videoId);
    const privacyBtn = getId(privacyBtnId);
    if (useVideo && video && privacyBtn) {
        privacyBtn.addEventListener('click', () => {
            playSound('click');
            isVideoPrivacyActive = !isVideoPrivacyActive;
            setVideoPrivacyStatus(videoId, isVideoPrivacyActive);
            emitPeerStatus('privacy', isVideoPrivacyActive);
        });
    } else {
        if (privacyBtn) elemDisplay(privacyBtn, false);
    }
}

/**
 * Set video privacy status
 * @param {string} peerVideoId
 * @param {boolean} peerPrivacyActive
 */
function setVideoPrivacyStatus(peerVideoId, peerPrivacyActive) {
    const video = getId(peerVideoId);
    if (!video) return;
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
    const videoPlayer = getId(elemId);
    const btnPn = getId(pnId);
    const cam = getId(camId);
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
                elemDisplay(videoPinMediaContainer, true, 'block');
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
        default:
            break;
    }
    resizeVideoMedia();
}

/**
 * Handle video focus mode (hide all except selected one)
 * @param {object} remoteVideoFocusBtn button
 * @param {object} remoteVideoWrap videoWrapper
 * @param {object} remoteMedia videoMedia
 */
function handleVideoFocusMode(remoteVideoFocusBtn, remoteVideoWrap, remoteMedia) {
    if (remoteVideoFocusBtn) {
        remoteVideoFocusBtn.addEventListener('click', (e) => {
            if (isHideMeActive) {
                return userLog('toast', 'To use this feature, please toggle Hide self view before', 'top-end', 6000);
            }
            isHideALLVideosActive = !isHideALLVideosActive;
            e.target.style.color = isHideALLVideosActive ? 'lime' : 'white';
            if (isHideALLVideosActive) {
                remoteVideoWrap.style.width = '100%';
                remoteVideoWrap.style.height = '100%';
                remoteMedia.setAttribute('focus-mode', 'true');
            } else {
                resizeVideoMedia();
                remoteMedia.removeAttribute('focus-mode');
            }
            const children = videoMediaContainer.children;
            for (let child of children) {
                if (child.id != remoteVideoWrap.id) {
                    child.style.display = isHideALLVideosActive ? 'none' : 'block';
                }
            }
        });
    }
}

/**
 * Zoom in/out video element center or by cursor position
 * @param {string} zoomInBtnId
 * @param {string} zoomOutBtnId
 * @param {string} mediaId
 * @param {string} peerId
 */
function handleVideoZoomInOut(zoomInBtnId, zoomOutBtnId, mediaId, peerId = null) {
    const id = peerId ? peerId + '_videoStatus' : 'myVideoStatusIcon';
    const videoWrap = getId(peerId ? peerId + '_videoWrap' : 'myVideoWrap');
    const zoomIn = getId(zoomInBtnId);
    const zoomOut = getId(zoomOutBtnId);
    const video = getId(mediaId);

    /**
     * 1.1: This value is used when the `zoomDirection` is 'zoom-in'.
     * It means that when the user scrolls the mouse wheel up (indicating a zoom-in action), the scale factor is set to 1.1.
     * This means that the content will be scaled up to 110% of its original size with each scroll event, effectively making it larger.
     */
    const ZOOM_IN_FACTOR = 1.1;
    /**
     * 0.9: This value is used when the zoomDirection is 'zoom-out'.
     * It means that when the user scrolls the mouse wheel down (indicating a zoom-out action), the scale factor is set to 0.9.
     * This means that the content will be scaled down to 90% of its original size with each scroll event, effectively making it smaller.
     */
    const ZOOM_OUT_FACTOR = 0.9;
    const MAX_ZOOM = 15;
    const MIN_ZOOM = 1;

    let zoom = 1;

    function setTransform() {
        if (isVideoOf(id) || isVideoPrivacyMode(video)) return;
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
        video.style.scale = zoom;
    }

    function resetZoom(video) {
        zoom = 1;
        video.style.transform = '';
        video.style.transformOrigin = 'center';
    }

    if (!isMobileDevice) {
        // Zoom center
        if (ZOOM_CENTER_MODE) {
            video.addEventListener('wheel', (e) => {
                e.preventDefault();
                let delta = e.wheelDelta ? e.wheelDelta : -e.deltaY;
                delta > 0 ? (zoom *= 1.2) : (zoom /= 1.2);
                setTransform();
            });
        } else {
            // Zoom on cursor position
            video.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (isVideoOf(id) || isVideoPrivacyMode(video)) return;

                const rect = videoWrap.getBoundingClientRect();
                const cursorX = e.clientX - rect.left;
                const cursorY = e.clientY - rect.top;

                const zoomDirection = e.deltaY > 0 ? 'zoom-out' : 'zoom-in';
                const scaleFactor = zoomDirection === 'zoom-out' ? ZOOM_OUT_FACTOR : ZOOM_IN_FACTOR;

                zoom *= scaleFactor;
                zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

                video.style.transformOrigin = `${cursorX}px ${cursorY}px`;
                video.style.transform = `scale(${zoom})`;
                video.style.cursor = zoom === 1 ? 'pointer' : zoomDirection;
            });

            videoWrap.addEventListener('mouseleave', () => {
                video.style.cursor = 'pointer';
                if (video.id === myVideo.id && !isScreenStreaming) {
                    resetZoom(video);
                }
            });

            video.addEventListener('mouseleave', () => {
                video.style.cursor = 'pointer';
            });
        }
    }

    if (buttons.local.showZoomInOutBtn) {
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
    }

    function isVideoOf(id) {
        const videoStatusBtn = getId(id);
        return videoStatusBtn.className === className.videoOff;
    }
    function isVideoPrivacyMode() {
        return video.classList.contains('videoCircle');
    }
}

/**
 * Handle Video Picture in Picture mode
 *
 * @param {string} btnId
 * @param {string} videoId
 * @param {string} peerId
 */
function handlePictureInPicture(btnId, videoId, peerId) {
    const btnPiP = getId(btnId);
    const video = getId(videoId);
    const myVideoStatus = getId('myVideoStatusIcon');
    const remoteVideoStatus = getId(peerId + '_videoStatus');
    btnPiP.addEventListener('click', () => {
        if (video.pictureInPictureElement) {
            video.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
            if (
                (myVideoStatus && myVideoStatus.className === className.videoOff) ||
                (remoteVideoStatus && remoteVideoStatus.className === className.videoOff)
            ) {
                return msgPopup('warning', 'Prohibit Picture-in-Picture (PIP) on disabled video', 'top-end', 6000);
            }
            video.requestPictureInPicture().catch((error) => {
                console.error('Failed to enter Picture-in-Picture mode:', error);
                msgPopup('warning', error.message, 'top-end', 6000);
                elemDisplay(btnPiP, false);
            });
        }
    });
}

/**
 * Remove video pin media container
 * @param {string} peer_id aka socket.id
 * @param {boolean} force_remove force to remove
 */
function removeVideoPinMediaContainer(peer_id, force_remove = false) {
    //alert(pinnedVideoPlayerId + '==' + peer_id);
    if (
        (isVideoPinned && (pinnedVideoPlayerId == peer_id + '___video' || pinnedVideoPlayerId == peer_id)) ||
        force_remove
    ) {
        elemDisplay(videoPinMediaContainer, false);
        isVideoPinned = false;
        pinnedVideoPlayerId = null;
        videoMediaContainerUnpin();
        if (isChatPinned) {
            chatPin();
        }
        if (isCaptionPinned) {
            captionPin();
        }
        resizeVideoMedia();
    }
}

/**
 * Pin videoMediaContainer
 */
function videoMediaContainerPin() {
    if (!isVideoPinned) {
        videoMediaContainer.style.top = 0;
        videoMediaContainer.style.width = '75%';
        videoMediaContainer.style.height = '100%';
    }
}

/**
 * Unpin videoMediaContainer
 */
function videoMediaContainerUnpin() {
    if (!isVideoPinned) {
        videoMediaContainer.style.top = 0;
        videoMediaContainer.style.right = null;
        videoMediaContainer.style.width = '100%';
        videoMediaContainer.style.height = '100%';
    }
}

/**
 * Handle Video to Img click event
 * @param {string} videoStream uuid video element
 * @param {string} videoToImgBtn uuid snapshot btn
 * @param {string} peer_id socket.id
 */
function handleVideoToImg(videoStream, videoToImgBtn, peer_id = null) {
    const videoBtn = getId(videoToImgBtn);
    const video = getId(videoStream);
    videoBtn.addEventListener('click', () => {
        if (video.classList.contains('videoCircle')) {
            return userLog('toast', 'Snapshot not allowed if video on privacy mode');
        }
        if (peer_id !== null) {
            // handle remote video snapshot
            const remoteVideoStatusBtn = getId(peer_id + '_videoStatus');
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
 * Start session time
 */
function startSessionTime() {
    callElapsedTime = 0;
    elemDisplay(mySessionTime, true);
    setInterval(function printTime() {
        callElapsedTime++;
        mySessionTime.innerText = secondsToHms(callElapsedTime);
    }, 1000);
}

/**
 * Refresh my localVideoMediaStream video status
 * @param {MediaStream} localVideoMediaStream
 */
function refreshMyVideoStatus(localVideoMediaStream) {
    if (!localVideoMediaStream) return;
    // check Track video status
    localVideoMediaStream.getTracks().forEach((track) => {
        if (track.kind === 'video') {
            myVideoStatus = track.enabled;
        }
    });
}

/**
 * Refresh my localAudioMediaStream audio status
 * @param {MediaStream} localAudioMediaStream
 */
function refreshMyAudioStatus(localAudioMediaStream) {
    if (!localAudioMediaStream) return;
    // check Track audio status
    localAudioMediaStream.getTracks().forEach((track) => {
        if (track.kind === 'audio') {
            myAudioStatus = track.enabled;
        }
    });
}

/**
 * Handle WebRTC left buttons
 */
function manageButtons() {
    // Buttons bar
    setShareRoomBtn();
    setRecordStreamBtn();
    setScreenShareBtn();
    setFullScreenBtn();
    setChatRoomBtn();
    setCaptionRoomBtn();
    setRoomEmojiButton();
    setChatEmojiBtn();
    setMyWhiteboardBtn();
    setSnapshotRoomBtn();
    setMyFileShareBtn();
    setDocumentPiPBtn();
    setMySettingsBtn();
    setAboutBtn();

    // Buttons bottom
    setToggleExtraButtons();
    setAudioBtn();
    setVideoBtn();
    setSwapCameraBtn();
    setHideMeButton();
    setMyHandBtn();
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
        if (isHideALLVideosActive) {
            return userLog('toast', 'To use this feature, please toggle video focus mode', 'top-end', 6000);
        }
        isHideMeActive = !isHideMeActive;
        handleHideMe(isHideMeActive);
    });
}

/**
 * Toggle extra buttons
 */
function setToggleExtraButtons() {
    toggleExtraBtn.addEventListener('click', () => {
        toggleExtraButtons();
        if (!isMobileDevice) {
            isToggleExtraBtnClicked = true;
            setTimeout(() => {
                isToggleExtraBtnClicked = false;
            }, 2000);
        }
    });
    toggleExtraBtn.addEventListener('mouseover', () => {
        if (isToggleExtraBtnClicked || isMobileDevice) return;
        if (buttonsBar.style.display === 'none') {
            toggleExtraButtons();
        }
    });
}

/**
 * Toggle extra buttons
 */
function toggleExtraButtons() {
    const isButtonsBarHidden = buttonsBar.style.display === 'none' || buttonsBar.style.display === '';
    const displayValue = isButtonsBarHidden ? 'flex' : 'none';
    const cName = isButtonsBarHidden ? className.up : className.down;

    elemDisplay(buttonsBar, isButtonsBarHidden, displayValue);
    toggleExtraBtn.className = cName;
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
    videoBtn.addEventListener('click', async (e) => {
        await handleVideo(e, false);
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
            elemDisplay(swapCameraBtn, false);
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
        elemDisplay(initScreenShareBtn, false);
        elemDisplay(screenShareBtn, false);
        elemDisplay(screenFpsDiv, false);
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
    recImage.addEventListener('click', (e) => {
        recordStreamBtn.click();
    });
}

/**
 * Full screen button click event
 */
function setFullScreenBtn() {
    const fsSupported =
        document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled;

    if (fsSupported) {
        // detect esc from full screen mode
        document.addEventListener('fullscreenchange', (e) => {
            let fullscreenElement = document.fullscreenElement;
            if (!fullscreenElement) {
                fullScreenBtn.className = className.fsOff;
                isDocumentOnFullScreen = false;
                setTippy(fullScreenBtn, 'View full screen', placement);
            }
        });
        fullScreenBtn.addEventListener('click', (e) => {
            toggleFullScreen();
        });
    } else {
        elemDisplay(fullScreenBtn, false);
    }
}

/**
 * Chat room buttons click event
 */
function setChatRoomBtn() {
    // adapt chat room size for mobile
    setChatRoomAndCaptionForMobile();

    // Search peer by name
    searchPeerBarName.addEventListener('keyup', () => {
        searchPeer();
    });

    // open hide chat room
    chatRoomBtn.addEventListener('click', (e) => {
        if (!isChatRoomVisible) {
            showChatRoomDraggable();
        } else {
            hideChatRoomAndEmojiPicker();
            e.target.className = className.chatOn;
        }
    });

    // pin/unpin
    msgerTogglePin.addEventListener('click', () => {
        toggleChatPin();
    });

    // ghost theme + undo
    msgerTheme.addEventListener('click', (e) => {
        if (e.target.className == className.ghost) {
            e.target.className = className.undo;
            setSP('--msger-bg', 'rgba(0, 0, 0, 0.100)');
        } else {
            e.target.className = className.ghost;
            setTheme();
        }
    });

    // dropdown chat menu
    msgerDropDownMenuBtn.addEventListener('click', () => {
        toggleChatDropDownMenu();
    });

    // show msger participants section
    msgerCPBtn.addEventListener('click', (e) => {
        if (!thereArePeerConnections()) {
            return userLog('info', 'No participants detected');
        }
        elemDisplay(msgerCP, true, 'flex');
    });

    // hide msger participants section
    msgerCPCloseBtn.addEventListener('click', (e) => {
        elemDisplay(msgerCP, false);
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
        showChatOnMessage
            ? msgPopup('info', 'Chat will be shown, when you receive a new message', 'top-end', 3000)
            : msgPopup('info', 'Chat not will be shown, when you receive a new message', 'top-end', 3000);
        lsSettings.show_chat_on_msg = showChatOnMessage;
        lS.setSettings(lsSettings);
    });

    // speech incoming message
    if (isSpeechSynthesisSupported) {
        msgerSpeechMsg.addEventListener('change', (e) => {
            playSound('switch');
            speechInMessages = e.currentTarget.checked;
            speechInMessages
                ? msgPopup('info', 'When You receive a new message, it will be converted into speech', 'top-end', 3000)
                : msgPopup('info', 'You have disabled speech messages', 'top-end', 3000);
            lsSettings.speech_in_msg = speechInMessages;
            lS.setSettings(lsSettings);
        });
    } else {
        elemDisplay(msgerSpeechMsgDiv, false);
    }

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

        // toggle caption pin
        captionTogglePin.addEventListener('click', () => {
            toggleCaptionPin();
        });

        // ghost theme + undo
        captionTheme.addEventListener('click', (e) => {
            if (e.target.className == className.ghost) {
                e.target.className = className.undo;
                setSP('--msger-bg', 'rgba(0, 0, 0, 0.100)');
            } else {
                e.target.className = className.ghost;
                setTheme();
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
        elemDisplay(speechRecognitionStop, false);

        // start recognition speech
        speechRecognitionStart.addEventListener('click', (e) => {
            startSpeech();
        });
        // stop recognition speech
        speechRecognitionStop.addEventListener('click', (e) => {
            stopSpeech();
        });
    } else {
        elemDisplay(captionBtn, false);
        // https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API#browser_compatibility
    }
}

/**
 * Set room emoji reaction button
 */
function setRoomEmojiButton() {
    const pickerRoomOptions = {
        theme: 'dark',
        onEmojiSelect: sendEmojiToRoom,
    };

    const emojiRoomPicker = new EmojiMart.Picker(pickerRoomOptions);

    emojiPickerContainer.appendChild(emojiRoomPicker);
    elemDisplay(emojiPickerContainer, false);

    if (!isMobileDevice) {
        dragElement(emojiPickerContainer, emojiPickerHeader);
    }

    roomEmojiPickerBtn.addEventListener('click', (e) => {
        toggleEmojiPicker();
    });
    closeEmojiPickerContainer.addEventListener('click', (e) => {
        toggleEmojiPicker();
    });

    function sendEmojiToRoom(data) {
        console.log('Selected Emoji:', data.native);
        const message = {
            type: 'roomEmoji',
            room_id: roomId,
            peer_name: myPeerName,
            emoji: data.native,
        };
        if (thereArePeerConnections()) {
            sendToServer('message', message);
        }
        handleEmoji(message);
    }

    function toggleEmojiPicker() {
        if (emojiPickerContainer.style.display === 'block') {
            elemDisplay(emojiPickerContainer, false);
            setColor(roomEmojiPickerBtn, 'black');
        } else {
            emojiPickerContainer.style.display = 'block';
            setColor(roomEmojiPickerBtn, 'green');
        }
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
    whiteboardDropDownMenuBtn.addEventListener('click', function () {
        whiteboardDropdownMenu.style.display === 'block'
            ? elemDisplay(whiteboardDropdownMenu, false)
            : elemDisplay(whiteboardDropdownMenu, true, 'block');
    });
    whiteboardSaveBtn.addEventListener('click', (e) => {
        wbCanvasSaveImg();
    });
    whiteboardImgFileBtn.addEventListener('click', (e) => {
        whiteboardAddObj('imgFile');
    });
    whiteboardPdfFileBtn.addEventListener('click', (e) => {
        whiteboardAddObj('pdfFile');
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
    whiteboardLockBtn.addEventListener('click', (e) => {
        toggleLockUnlockWhiteboard();
    });
    whiteboardUnlockBtn.addEventListener('click', (e) => {
        toggleLockUnlockWhiteboard();
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
        //setWhiteboardBgColor(wbIsBgTransparent ? 'rgba(0, 0, 0, 0.100)' : wbBackgroundColorEl.value);
        wbIsBgTransparent ? wbCanvasBackgroundColor('rgba(0, 0, 0, 0.100)') : setTheme();
    });
    // Hide the whiteboard dropdown menu if clicked outside
    document.addEventListener('click', (event) => {
        if (!whiteboardDropDownMenuBtn.contains(event.target) && !whiteboardDropDownMenuBtn.contains(event.target)) {
            elemDisplay(whiteboardDropdownMenu, false);
        }
    });
}

/**
 * File Transfer button click event
 */
function setMyFileShareBtn() {
    // make send-receive file div draggable
    if (!isMobileDevice) {
        dragElement(sendFileDiv, imgShareSend);
        dragElement(receiveFileDiv, imgShareReceive);
    }

    fileShareBtn.addEventListener('click', (e) => {
        //window.open("https://fromsmash.com"); // for Big Data
        selectFileToShare(myPeerId, true);
    });
    sendAbortBtn.addEventListener('click', (e) => {
        abortFileTransfer();
    });
    receiveAbortBtn.addEventListener('click', (e) => {
        abortReceiveFileTransfer();
    });
    receiveHideBtn.addEventListener('click', (e) => {
        hideFileTransfer();
    });
}

/**
 * Set snapshot room button click event
 */
function setSnapshotRoomBtn() {
    snapshotRoomBtn.addEventListener('click', async (e) => {
        await snapshotRoom();
    });
}

/**
 * Snapshot Screen, Window or Tab
 */
async function snapshotRoom() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const video = document.createElement('video');

    try {
        const captureStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
        });

        video.srcObject = captureStream;
        video.onloadedmetadata = () => {
            video.play();
        };

        // Wait for the video to start playing
        video.onplay = async () => {
            playSound('snapshot');

            // Sleep some ms
            await sleep(1000);

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Create a link element to download the image
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'Room_' + roomId + '_' + getDataTimeString() + '_snapshot.png';
            link.click();

            // Stop all video tracks to release the capture stream
            captureStream.getTracks().forEach((track) => track.stop());

            // Clean up: remove references to avoid memory leaks
            video.srcObject = null;
            canvas.width = 0;
            canvas.height = 0;
        };
    } catch (err) {
        console.error('Error: ' + err);
        userLog('error', 'Snapshot room error ' + err.message, 6000);
    }
}

/**
 * Document Picture-in-Picture button click event
 */
function setDocumentPiPBtn() {
    documentPiPBtn.addEventListener('click', async () => {
        if (!showDocumentPipBtn) return;
        if (documentPictureInPicture.window) {
            documentPictureInPicture.window.close();
            console.log('DOCUMENT PIP close');
            return;
        }
        await documentPictureInPictureOpen();
    });
}

/**
 *  Close documentPictureInPicture
 */
async function documentPictureInPictureClose() {
    if (!showDocumentPipBtn) return;
    if (documentPictureInPicture.window) {
        documentPictureInPicture.window.close();
        console.log('DOCUMENT PIP close');
    }
}

/**
 * Open documentPictureInPicture
 */
async function documentPictureInPictureOpen() {
    if (!showDocumentPipBtn) return;
    try {
        const pipWindow = await documentPictureInPicture.requestWindow({
            width: 300,
            height: 720,
        });

        function updateCustomProperties() {
            const documentStyle = getComputedStyle(document.documentElement);

            pipWindow.document.documentElement.style = `
                --body-bg: ${documentStyle.getPropertyValue('--body-bg')};
            `;
        }

        updateCustomProperties();

        const pipStylesheet = document.createElement('link');
        const pipVideoContainer = document.createElement('div');

        pipStylesheet.type = 'text/css';
        pipStylesheet.rel = 'stylesheet';
        pipStylesheet.href = '../css/documentPiP.css';

        pipVideoContainer.className = 'pipVideoContainer';

        pipWindow.document.head.append(pipStylesheet);
        pipWindow.document.body.append(pipVideoContainer);

        function cloneVideoElements() {
            let foundVideo = false;

            pipVideoContainer.innerHTML = '';

            [...getSlALL('video')].forEach((video) => {
                console.log('DOCUMENT PIP found video id -----> ' + video.id);

                // No video stream detected or is video share from URL...
                if (!video.srcObject || video.id === 'videoAudioUrlElement') return;

                let videoPIPAllowed = false;

                // get video element
                const videoPlayer = getId(video.id);

                // Check if video can be add on pipVideo
                if (video.id === 'myVideo') {
                    const localVideoStatus = getId('myVideoStatusIcon');

                    videoPIPAllowed =
                        localVideoStatus.className === className.videoOn && // video is ON
                        !videoPlayer.classList.contains('videoCircle'); // not in privacy mode

                    console.log('DOCUMENT PIP LOCAL videoPIPAllowed -----> ' + videoPIPAllowed);
                } else {
                    const parts = video.id.split('___'); // peerId___video
                    const peer_id = parts[0];
                    const remoteVideoStatus = getId(peer_id + '_videoStatus');

                    videoPIPAllowed =
                        remoteVideoStatus.className === className.videoOn && // video is ON
                        !videoPlayer.classList.contains('videoCircle'); // not in privacy mode

                    console.log('DOCUMENT PIP REMOTE videoPIPAllowed -----> ' + videoPIPAllowed);
                }

                if (!videoPIPAllowed) return;

                // Video is ON not in privacy mode continue....

                foundVideo = true;

                const pipVideo = document.createElement('video');

                pipVideo.classList.add('pipVideo');
                pipVideo.classList.toggle('mirror', video.classList.contains('mirror'));
                pipVideo.srcObject = video.srcObject;
                pipVideo.autoplay = true;
                pipVideo.muted = true;

                pipVideoContainer.append(pipVideo);
            });

            return foundVideo;
        }

        if (!cloneVideoElements()) {
            documentPictureInPictureClose();
            return userLog('toast', 'No video allowed for Document PIP');
        }

        const videoObserver = new MutationObserver(() => {
            cloneVideoElements();
        });

        videoObserver.observe(videoMediaContainer, {
            childList: true,
        });

        const documentObserver = new MutationObserver(() => {
            updateCustomProperties();
        });

        documentObserver.observe(document.documentElement, {
            attributeFilter: ['style'],
        });

        pipWindow.addEventListener('unload', () => {
            videoObserver.disconnect();
            documentObserver.disconnect();
        });
    } catch (err) {
        userLog('warning', err.message, 6000);
    }
}

/**
 * My settings button click event
 */
function setMySettingsBtn() {
    mySettingsBtn.addEventListener('click', (e) => {
        if (isMobileDevice) {
            elemDisplay(buttonsBar, false);
            elemDisplay(bottomButtons, false);
            isButtonsVisible = false;
        }
        hideShowMySettings();
    });
    mySettingsCloseBtn.addEventListener('click', (e) => {
        hideShowMySettings();
    });
    speakerTestBtn.addEventListener('click', (e) => {
        playSound('ring', true);
    });
    myPeerNameSetBtn.addEventListener('click', (e) => {
        updateMyPeerName();
    });
    // Sounds
    switchSounds.addEventListener('change', (e) => {
        notifyBySound = e.currentTarget.checked;
        lsSettings.sounds = notifyBySound;
        lS.setSettings(lsSettings);
        userLog('toast', `${icons.sounds} Notify & sounds ` + (notifyBySound ? 'ON' : 'OFF'));
        playSound('switch');
    });
    switchShare.addEventListener('change', (e) => {
        notify = e.currentTarget.checked;
        lsSettings.share_on_join = notify;
        lS.setSettings(lsSettings);
        userLog('toast', `${icons.share} Share room on join ` + (notify ? 'ON' : 'OFF'));
        playSound('switch');
    });

    if (isMobileDevice) {
        elemDisplay(pushToTalkDiv, false);
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
        lsSettings.pitch_bar = isAudioPitchBar;
        lS.setSettings(lsSettings);
        userLog('toast', `${icons.pitchBar} Audio pitch bar ` + (isAudioPitchBar ? 'ON' : 'OFF'));
        playSound('switch');
    });

    // make chat room draggable for desktop
    if (!isMobileDevice) dragElement(mySettings, mySettingsHeader);

    // recording codecs
    switchH264Recording.addEventListener('change', (e) => {
        recPrioritizeH264 = e.currentTarget.checked;
        lsSettings.rec_prioritize_h264 = recPrioritizeH264;
        lS.setSettings(lsSettings);
        userLog('toast', `${icons.codecs} Recording prioritize h.264 ` + (recPrioritizeH264 ? 'ON' : 'OFF'));
        playSound('switch');
    });
    // Recording pause/resume
    pauseRecBtn.addEventListener('click', (e) => {
        pauseRecording();
    });
    resumeRecBtn.addEventListener('click', (e) => {
        resumeRecording();
    });
    // Styles
    themeCustom.check.onchange = (e) => {
        themeCustom.keep = e.currentTarget.checked;
        themeSelect.disabled = themeCustom.keep;
        lsSettings.theme_custom = themeCustom.keep;
        lsSettings.theme_color = themeCustom.color;
        lS.setSettings(lsSettings);
        setTheme();
        userLog('toast', `${icons.theme} Custom theme keep ` + (themeCustom.keep ? 'ON' : 'OFF'));
        playSound('switch');
        e.target.blur();
    };
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

    bottomButtons.addEventListener('mouseover', () => {
        isButtonsBarOver = true;
    });
    bottomButtons.addEventListener('mouseout', () => {
        isButtonsBarOver = false;
    });

    checkButtonsBarAndMenu();
}

/**
 * Setup local audio - video devices - theme ...
 */
function setupMySettings() {
    // tab buttons
    tabRoomBtn.addEventListener('click', (e) => {
        openTab(e, 'tabRoom');
    });
    tabVideoBtn.addEventListener('click', (e) => {
        openTab(e, 'tabVideo');
    });
    tabAudioBtn.addEventListener('click', (e) => {
        openTab(e, 'tabAudio');
    });
    tabVideoShareBtn.addEventListener('click', (e) => {
        openTab(e, 'tabMedia');
    });
    tabRecordingBtn.addEventListener('click', (e) => {
        openTab(e, 'tabRecording');
    });
    tabParticipantsBtn.addEventListener('click', (e) => {
        openTab(e, 'tabParticipants');
    });
    tabProfileBtn.addEventListener('click', (e) => {
        openTab(e, 'tabProfile');
    });
    tabNetworkBtn.addEventListener('click', (e) => {
        openTab(e, 'tabNetwork');
    });
    tabStylingBtn.addEventListener('click', (e) => {
        openTab(e, 'tabStyling');
    });
    tabLanguagesBtn.addEventListener('click', (e) => {
        openTab(e, 'tabLanguages');
    });
    // copy room URL
    myRoomId.addEventListener('click', () => {
        isMobileDevice ? shareRoomUrl() : copyRoomURL();
    });
    // send invite by email to join room in a specified data-time
    roomSendEmailBtn.addEventListener('click', () => {
        shareRoomByEmail();
    });
    // tab media
    shareMediaAudioVideoBtn.addEventListener('click', (e) => {
        sendVideoUrl();
    });
    // select audio input
    audioInputSelect.addEventListener('change', async () => {
        await changeLocalMicrophone(audioInputSelect.value);
        refreshLsDevices();
    });
    // advance audio options
    micOptionsBtn.addEventListener('click', function () {
        micDropDownMenu.style.display === 'block'
            ? elemDisplay(micDropDownMenu, false)
            : elemDisplay(micDropDownMenu, true, 'block');
    });
    // audio options
    switchAutoGainControl.onchange = (e) => {
        lsSettings.mic_auto_gain_control = e.currentTarget.checked;
        lS.setSettings(lsSettings);
        e.target.blur();
    };
    switchEchoCancellation.onchange = (e) => {
        lsSettings.mic_echo_cancellations = e.currentTarget.checked;
        lS.setSettings(lsSettings);
        e.target.blur();
    };
    switchNoiseSuppression.onchange = (e) => {
        lsSettings.mic_noise_suppression = e.currentTarget.checked;
        lS.setSettings(lsSettings);
        e.target.blur();
    };
    sampleRateSelect.onchange = (e) => {
        lsSettings.mic_sample_rate = e.currentTarget.selectedIndex;
        lS.setSettings(lsSettings);
        e.target.blur();
    };
    sampleSizeSelect.onchange = (e) => {
        lsSettings.mic_sample_size = e.currentTarget.selectedIndex;
        lS.setSettings(lsSettings);
        e.target.blur();
    };
    channelCountSelect.onchange = (e) => {
        lsSettings.mic_channel_count = e.currentTarget.selectedIndex;
        lS.setSettings(lsSettings);
        e.target.blur();
    };
    micLatencyRange.oninput = (e) => {
        lsSettings.mic_latency = e.currentTarget.value;
        lS.setSettings(lsSettings);
        micLatencyValue.innerText = e.currentTarget.value;
        e.target.blur();
    };
    micVolumeRange.oninput = (e) => {
        lsSettings.mic_volume = e.currentTarget.value;
        lS.setSettings(lsSettings);
        micVolumeValue.innerText = e.currentTarget.value;
        e.target.blur();
    };
    // apply audio options constraints
    applyAudioOptionsBtn.addEventListener('click', async () => {
        await changeLocalMicrophone(audioInputSelect.value);
        micOptionsBtn.click();
    });
    // select audio output
    audioOutputSelect.addEventListener('change', async () => {
        await changeAudioDestination();
        refreshLsDevices();
    });
    // select video input
    videoSelect.addEventListener('change', async () => {
        await changeLocalCamera(videoSelect.value);
        await handleLocalCameraMirror();
        await documentPictureInPictureClose();
        refreshLsDevices();
    });
    // select video quality
    videoQualitySelect.addEventListener('change', async (e) => {
        await setLocalVideoQuality();
    });
    // select video fps
    videoFpsSelect.addEventListener('change', (e) => {
        videoMaxFrameRate = parseInt(videoFpsSelect.value, 10);
        setLocalMaxFps(videoMaxFrameRate);
        lsSettings.video_fps = e.currentTarget.selectedIndex;
        lS.setSettings(lsSettings);
    });
    // select screen fps
    screenFpsSelect.addEventListener('change', (e) => {
        screenMaxFrameRate = parseInt(screenFpsSelect.value, 10);
        if (isScreenStreaming) setLocalMaxFps(screenMaxFrameRate, 'screen');
        lsSettings.screen_fps = e.currentTarget.selectedIndex;
        lS.setSettings(lsSettings);
    });

    // Mobile not support screen sharing
    if (isMobileDevice) {
        screenFpsSelect.value = null;
        screenFpsSelect.disabled = true;
    }
    // select themes
    themeSelect.addEventListener('change', (e) => {
        lsSettings.theme = themeSelect.selectedIndex;
        lS.setSettings(lsSettings);
        setTheme();
    });
    // video object fit
    videoObjFitSelect.addEventListener('change', (e) => {
        lsSettings.video_obj_fit = videoObjFitSelect.selectedIndex;
        lS.setSettings(lsSettings);
        setSP('--video-object-fit', videoObjFitSelect.value);
    });
    // Mobile not support buttons bar position horizontal
    if (isMobileDevice) {
        btnsBarSelect.disabled = true;
    } else {
        btnsBarSelect.addEventListener('change', (e) => {
            lsSettings.buttons_bar = btnsBarSelect.selectedIndex;
            lS.setSettings(lsSettings);
            setButtonsBarPosition(btnsBarSelect.value);
            resizeMainButtons();
        });
    }

    // Mobile not support pin/unpin video
    if (!isMobileDevice) {
        pinVideoPositionSelect.addEventListener('change', (e) => {
            lsSettings.pin_grid = pinVideoPositionSelect.selectedIndex;
            lS.setSettings(lsSettings);
            toggleVideoPin(pinVideoPositionSelect.value);
        });
    } else {
        elemDisplay(pinUnpinGridDiv, false);
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
 * Load settings from local storage
 */
function loadSettingsFromLocalStorage() {
    showChatOnMessage = lsSettings.show_chat_on_msg;
    speechInMessages = lsSettings.speech_in_msg;
    msgerShowChatOnMsg.checked = showChatOnMessage;
    msgerSpeechMsg.checked = speechInMessages;
    screenFpsSelect.selectedIndex = lsSettings.screen_fps;
    videoFpsSelect.selectedIndex = lsSettings.video_fps;
    screenFpsSelectedIndex = screenFpsSelect.selectedIndex;
    videoFpsSelectedIndex = videoFpsSelect.selectedIndex;
    screenMaxFrameRate = parseInt(getSelectedIndexValue(screenFpsSelect), 10);
    videoMaxFrameRate = parseInt(getSelectedIndexValue(videoFpsSelect), 10);
    notifyBySound = lsSettings.sounds;
    isAudioPitchBar = lsSettings.pitch_bar;
    recPrioritizeH264 = lsSettings.rec_prioritize_h264;
    switchSounds.checked = notifyBySound;
    switchShare.checked = notify;
    switchAudioPitchBar.checked = isAudioPitchBar;
    switchH264Recording.checked = recPrioritizeH264;

    themeCustom.check.checked = themeCustom.keep;
    themeSelect.disabled = themeCustom.keep;
    themeCustom.input.value = themeCustom.color;

    switchAutoGainControl.checked = lsSettings.mic_auto_gain_control;
    switchEchoCancellation.checked = lsSettings.mic_echo_cancellations;
    switchNoiseSuppression.checked = lsSettings.mic_noise_suppression;
    sampleRateSelect.selectedIndex = lsSettings.mic_sample_rate;
    sampleSizeSelect.selectedIndex = lsSettings.mic_sample_size;
    channelCountSelect.selectedIndex = lsSettings.mic_channel_count;
    micLatencyRange.value = lsSettings.mic_latency || '50';
    micLatencyValue.innerText = lsSettings.mic_latency || '50';
    micVolumeRange.value = lsSettings.mic_volume || '100';
    micVolumeValue.innerText = lsSettings.mic_volume || '100';

    videoObjFitSelect.selectedIndex = lsSettings.video_obj_fit;
    btnsBarSelect.selectedIndex = lsSettings.buttons_bar;
    pinVideoPositionSelect.selectedIndex = lsSettings.pin_grid;
    setSP('--video-object-fit', videoObjFitSelect.value);
    setButtonsBarPosition(btnsBarSelect.value);
    toggleVideoPin(pinVideoPositionSelect.value);
    resizeMainButtons();
}

/**
 * Get value from element selected index
 * @param {object} elem
 * @returns any value
 */
function getSelectedIndexValue(elem) {
    return elem.options[elem.selectedIndex].value;
}

/**
 * Make video Url player draggable
 */
function setupVideoUrlPlayer() {
    if (isMobileDevice) {
        // adapt video player iframe for mobile
        setSP('--iframe-width', '320px');
        setSP('--iframe-height', '240px');
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
 * Handle Camera mirror logic
 */
async function handleLocalCameraMirror() {
    if (isDesktopDevice) {
        // Desktop devices...
        if (!initVideo.classList.contains('mirror')) {
            initVideo.classList.toggle('mirror');
        }
        if (!myVideo.classList.contains('mirror')) {
            myVideo.classList.toggle('mirror');
        }
    } else {
        // Mobile, Tablet, IPad devices...
        if (initVideo.classList.contains('mirror')) {
            initVideo.classList.remove('mirror');
        }
        if (myVideo.classList.contains('mirror')) {
            myVideo.classList.remove('mirror');
        }
    }
}

/**
 * Toggle username emoji
 */
function toggleUsernameEmoji() {
    usernameEmoji.classList.toggle('hidden');
}

/**
 * Handle username emoji picker
 */
function handleUsernameEmojiPicker() {
    const pickerOptions = {
        theme: 'dark',
        onEmojiSelect: addEmojiToUsername,
    };
    const emojiUsernamePicker = new EmojiMart.Picker(pickerOptions);
    usernameEmoji.appendChild(emojiUsernamePicker);

    function addEmojiToUsername(data) {
        getId('usernameInput').value += data.native;
        toggleUsernameEmoji();
    }
}

/**
 * Toggle vide mirror
 */
function toggleInitVideoMirror() {
    initVideo.classList.toggle('mirror');
    myVideo.classList.toggle('mirror');
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
    const frameRate = videoMaxFrameRate;
    let constraints = {};

    switch (videoQuality) {
        case 'default':
            if (forceCamMaxResolutionAndFps) {
                // This will make the browser use the maximum resolution available as default, `up to 8K and 60fps`.
                constraints = {
                    width: { ideal: 7680 },
                    height: { ideal: 4320 },
                    frameRate: { ideal: 60 },
                }; // video cam constraints default
            } else {
                // This will make the browser use as ideal hdVideo and 30fps.
                constraints = {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                }; // on default as hdVideo
            }
            break;
        case 'qvgaVideo':
            constraints = {
                width: { exact: 320 },
                height: { exact: 240 },
                frameRate: frameRate,
            }; // video cam constraints low bandwidth
            break;
        case 'vgaVideo':
            constraints = {
                width: { exact: 640 },
                height: { exact: 480 },
                frameRate: frameRate,
            }; // video cam constraints medium bandwidth
            break;
        case 'hdVideo':
            constraints = {
                width: { exact: 1280 },
                height: { exact: 720 },
                frameRate: frameRate,
            }; // video cam constraints high bandwidth
            break;
        case 'fhdVideo':
            constraints = {
                width: { exact: 1920 },
                height: { exact: 1080 },
                frameRate: frameRate,
            }; // video cam constraints very high bandwidth
            break;
        case '2kVideo':
            constraints = {
                width: { exact: 2560 },
                height: { exact: 1440 },
                frameRate: frameRate,
            }; // video cam constraints ultra high bandwidth
            break;
        case '4kVideo':
            constraints = {
                width: { exact: 3840 },
                height: { exact: 2160 },
                frameRate: frameRate,
            }; // video cam constraints ultra high bandwidth
            break;
        case '6kVideo':
            constraints = {
                width: { exact: 6144 },
                height: { exact: 3456 },
                frameRate: frameRate,
            }; // video cam constraints Very ultra high bandwidth
            break;
        case '8kVideo':
            constraints = {
                width: { exact: 7680 },
                height: { exact: 4320 },
                frameRate: frameRate,
            }; // video cam constraints Very ultra high bandwidth
            break;
        default:
            break;
    }
    console.log('Video constraints', constraints);
    return constraints;
}

/**
 * Get audio constraints
 */
async function getAudioConstraints() {
    let constraints = {
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
        },
        video: false,
    };
    if (isRulesActive && isPresenter) {
        constraints = {
            audio: {
                autoGainControl: switchAutoGainControl.checked,
                echoCancellation: switchEchoCancellation.checked,
                noiseSuppression: switchNoiseSuppression.checked,
                sampleRate: parseInt(sampleRateSelect.value),
                sampleSize: parseInt(sampleSizeSelect.value),
                channelCount: parseInt(channelCountSelect.value),
                latency: parseInt(micLatencyRange.value),
                volume: parseInt(micVolumeRange.value / 100),
            },
            video: false,
        };
    }
    console.log('Audio constraints', constraints);
    return constraints;
    // return {
    //     echoCancellation: true,
    //     noiseSuppression: true,
    // };
}

/**
 * Set local max fps: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/applyConstraints
 * @param {string} maxFrameRate desired max frame rate
 * @param {string} type camera/screen default camera
 */
async function setLocalMaxFps(maxFrameRate, type = 'camera') {
    if (!useVideo || !localVideoMediaStream) return;
    localVideoMediaStream
        .getVideoTracks()[0]
        .applyConstraints({ frameRate: maxFrameRate })
        .then(() => {
            logStreamSettingsInfo('setLocalMaxFps', localVideoMediaStream);
            type === 'camera'
                ? (videoFpsSelectedIndex = videoFpsSelect.selectedIndex)
                : (screenFpsSelectedIndex = screenFpsSelect.selectedIndex);
        })
        .catch((err) => {
            console.error('setLocalMaxFps', err);
            type === 'camera'
                ? (videoFpsSelect.selectedIndex = videoFpsSelectedIndex)
                : (screenFpsSelect.selectedIndex = screenFpsSelectedIndex);
            userLog('error', "Your device doesn't support the selected fps, please select the another one.");
        });
}

/**
 * Set local video quality: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/applyConstraints
 */
async function setLocalVideoQuality() {
    if (!useVideo || !localVideoMediaStream) return;
    const videoConstraints = await getVideoConstraints(videoQualitySelect.value ? videoQualitySelect.value : 'default');
    localVideoMediaStream
        .getVideoTracks()[0]
        .applyConstraints(videoConstraints)
        .then(() => {
            logStreamSettingsInfo('setLocalVideoQuality', localVideoMediaStream);
            videoQualitySelectedIndex = videoQualitySelect.selectedIndex;
        })
        .catch((err) => {
            videoQualitySelect.selectedIndex = videoQualitySelectedIndex;
            console.error('setLocalVideoQuality', err);
            userLog('error', "Your device doesn't support the selected video quality, please select the another one.");
        });
}

/**
 * Change audio output (Speaker)
 */
async function changeAudioDestination(audioElement = false) {
    const audioDestination = audioOutputSelect.value;
    if (audioElement) {
        // change audio output to specified participant audio
        await attachSinkId(audioElement, audioDestination);
    } else {
        const audioElements = audioMediaContainer.querySelectorAll('audio');
        // change audio output for all participants audio
        audioElements.forEach(async (audioElement) => {
            // discard my own audio on this device, so I won't hear myself.
            if (audioElement.id != 'myAudio') {
                await attachSinkId(audioElement, audioDestination);
            }
        });
    }
}

/**
 * Attach audio output device to audio element using device/sink ID.
 * @param {object} element audio element to attach the audio output
 * @param {string} sinkId uuid audio output device
 */
async function attachSinkId(element, sinkId) {
    if (typeof element.sinkId !== 'undefined') {
        element
            .setSinkId(sinkId)
            .then(() => {
                console.log(`Success, audio output device attached: ${sinkId}`);
            })
            .catch((err) => {
                let errorMessage = err;
                if (err.name === 'SecurityError') {
                    errorMessage = 'SecurityError: You need to use HTTPS for selecting audio output device';
                } else if (err.name === 'NotAllowedError') {
                    errorMessage = 'NotAllowedError: Permission to use audio output device is not granted';
                } else if (err.name === 'NotFoundError') {
                    errorMessage = 'NotFoundError: The specified audio output device was not found';
                } else {
                    errorMessage = `Error: ${err}`;
                }
                console.error(errorMessage);
                userLog('error', `attachSinkId: ${errorMessage}`);
                // Jump back to first output device in the list as it's the default.
                audioOutputSelect.selectedIndex = 0;
            });
    } else {
        console.warn('Browser does not support output device selection.');
    }
}

/**
 * AttachMediaStream stream to element
 * @param {object} element element to attach the stream
 * @param {object} stream media stream audio - video
 */
function attachMediaStream(element, stream) {
    if (!element || !stream) return;
    //console.log("DEPRECATED, attachMediaStream will soon be removed.");
    element.srcObject = stream;
    console.log('Success, media stream attached', stream.getTracks());
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
    //elemDisplay(buttonsBar, true, 'flex');
    toggleExtraBtn.className = className.down;
    elemDisplay(bottomButtons, true, 'flex');
    isButtonsVisible = true;
}

/**
 * Check every 10 sec if need to hide buttons bar and status menu
 */
function checkButtonsBarAndMenu() {
    if (!isButtonsBarOver) {
        toggleClassElements('navbar', 'none');
        toggleExtraBtn.className = className.up;
        elemDisplay(buttonsBar, false);
        elemDisplay(bottomButtons, false);
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
            const roomURL = getRoomURL();
            await navigator.share({ url: roomURL });
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
    const roomURL = getRoomURL();
    Swal.fire({
        background: swBg,
        position: 'center',
        title: 'Share the room',
        html: `
        <div id="qrRoomContainer">
            <canvas id="qrRoom"></canvas>
        </div>
        <br/>
        <p style="color:rgb(8, 189, 89);">Join from your mobile device</p>
        <p style="background:transparent; color:white; font-family: Arial, Helvetica, sans-serif;">No need for apps, simply capture the QR code with your mobile camera Or Invite someone else to join by sending them the following URL</p>
        <p style="color:rgb(8, 189, 89);">${roomURL}</p>`,
        showDenyButton: true,
        showCancelButton: true,
        cancelButtonColor: 'red',
        denyButtonColor: 'green',
        confirmButtonText: `Copy URL`,
        denyButtonText: `Email invite`,
        cancelButtonText: `Close`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.isConfirmed) {
            copyRoomURL();
        } else if (result.isDenied) {
            shareRoomByEmail();
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
    const roomURL = getRoomURL();
    const tmpInput = document.createElement('input');
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
 * Send the room ID via email at the scheduled date and time.
 */
function shareRoomByEmail() {
    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: swBg,
        imageUrl: images.message,
        position: 'center',
        title: 'Select a Date and Time',
        html: '<input type="text" id="datetimePicker" class="flatpickr" />',
        showCancelButton: true,
        confirmButtonText: 'OK',
        cancelButtonColor: 'red',
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
        preConfirm: () => {
            const roomURL = getRoomURL();
            const newLine = '%0D%0A%0D%0A';
            const selectedDateTime = document.getElementById('datetimePicker').value;
            const roomPassword = isRoomLocked && thisRoomPassword ? 'Password: ' + thisRoomPassword + newLine : '';
            const email = '';
            const emailSubject = `Please join our MiroTalk P2P Video Chat Meeting`;
            const emailBody = `The meeting is scheduled at: ${newLine} DateTime: ${selectedDateTime} ${newLine}${roomPassword}Click to join: ${roomURL} ${newLine}`;
            document.location = 'mailto:' + email + '?subject=' + emailSubject + '&body=' + emailBody;
        },
    });
    flatpickr('#datetimePicker', {
        enableTime: true,
        dateFormat: 'Y-m-d H:i',
        time_24hr: true,
    });
}

/**
 * Get Room URL
 * @returns {url} roomURL
 */
function getRoomURL() {
    return myRoomUrl;
    // return isHostProtected && isPeerAuthEnabled
    //     ? window.location.origin + '/join/?room=' + roomId + '&token=' + myToken
    //     : myRoomUrl;
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

    const audioStatus = force !== null ? force : !myAudioStatus;
    const audioClassName = audioStatus ? className.audioOn : className.audioOff;

    myAudioStatus = audioStatus;

    localAudioMediaStream.getAudioTracks()[0].enabled = audioStatus;

    force != null ? (e.className = audioClassName) : (e.target.className = audioClassName);

    audioBtn.className = audioClassName;

    if (init) {
        initAudioBtn.className = audioClassName;
        setTippy(initAudioBtn, audioStatus ? 'Stop the audio' : 'Start the audio', 'right');
        initMicrophoneSelect.disabled = !audioStatus;
        initSpeakerSelect.disabled = !audioStatus;
        lS.setInitConfig(lS.MEDIA_TYPE.audio, audioStatus);
    }

    setMyAudioStatus(myAudioStatus);
}

/**
 * Stop audio track from MediaStream
 * @param {MediaStream} stream
 */
async function stopAudioTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
        if (track.kind === 'audio') track.stop();
    });
}

/**
 * Handle Video ON - OFF
 * @param {object} e event
 * @param {boolean} init on join room
 * @param {null|boolean} force video off (default null can be true/false)
 */
async function handleVideo(e, init, force = null) {
    if (!useVideo) return;
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getVideoTracks

    const videoStatus = force !== null ? force : !myVideoStatus;
    const videoClassName = videoStatus ? className.videoOn : className.videoOff;

    myVideoStatus = videoStatus;

    localVideoMediaStream.getVideoTracks()[0].enabled = videoStatus;

    force != null ? (e.className = videoClassName) : (e.target.className = videoClassName);

    videoBtn.className = videoClassName;

    if (init) {
        initVideoBtn.className = videoClassName;
        setTippy(initVideoBtn, videoStatus ? 'Stop the video' : 'Start the video', 'top');
        videoStatus ? elemDisplay(initVideo, true, 'block') : elemDisplay(initVideo, false);
        initVideoSelect.disabled = !videoStatus;
        lS.setInitConfig(lS.MEDIA_TYPE.video, videoStatus);
        initVideoContainerShow(videoStatus);
        elemDisplay(initVideoMirrorBtn, videoStatus);
    }

    if (!videoStatus) {
        if (!isScreenStreaming) {
            // Stop the video track based on the condition
            if (init) {
                await stopVideoTracks(initStream); // Stop init video track (camera LED off)
            } else {
                await stopVideoTracks(localVideoMediaStream); // Stop local video track (camera LED off)
                await documentPictureInPictureClose(); // Close doc PIP if open
            }
        }
    } else {
        if (init) {
            // Resume the video track for the init camera (camera LED on)
            await changeInitCamera(initVideoSelect.value);
        } else if (!isScreenStreaming) {
            // Resume the video track for the local camera (camera LED on)
            await changeLocalCamera(videoSelect.value);
        }
    }

    setMyVideoStatus(videoStatus);
}

/**
 * Handle initVideoContainer
 * @param {boolean} show
 */
function initVideoContainerShow(show = true) {
    initVideoContainer.style.width = show ? '100%' : 'auto';
}

/**
 * Stop video track from MediaStream
 * @param {MediaStream} stream
 */
async function stopVideoTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
        if (track.kind === 'video') track.stop();
    });
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

    try {
        // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
        const camStream = await navigator.mediaDevices.getUserMedia({ video: camVideo });
        if (camStream) {
            await refreshMyLocalStream(camStream);
            await refreshMyStreamToPeers(camStream);
            await setLocalMaxFps(videoMaxFrameRate);
            await handleLocalCameraMirror();
            await setMyVideoStatusTrue();
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
        const localVideoTrack = localVideoMediaStream.getVideoTracks()[0];
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
    const localAudioTrack = localAudioMediaStream.getAudioTracks()[0];
    if (localAudioTrack) {
        console.log('stopLocalAudioTrack', localAudioTrack);
        localAudioTrack.stop();
    }
}

/**
 * Toggle screen sharing and handle related actions
 * @param {boolean} init - Indicates if it's the initial screen share state
 */
async function toggleScreenSharing(init = false) {
    try {
        // Set screen frame rate
        screenMaxFrameRate = parseInt(screenFpsSelect.value, 10);

        // Screen share constraints
        const constraints = {
            audio: myAudioStatus ? false : true,
            video: { frameRate: screenMaxFrameRate },
        };

        // Store webcam video status before screen sharing
        if (!isScreenStreaming) {
            myVideoStatusBefore = myVideoStatus;
            console.log('My video status before screen sharing: ' + myVideoStatusBefore);
        } else {
            if (!useVideo && !useAudio) {
                return handleToggleScreenException('Audio and Video are disabled', init);
            }
        }

        // Get screen or webcam media stream based on current state
        const screenMediaPromise = isScreenStreaming
            ? await navigator.mediaDevices.getUserMedia(await getAudioVideoConstraints())
            : await navigator.mediaDevices.getDisplayMedia(constraints);

        if (screenMediaPromise) {
            isVideoPrivacyActive = false;
            emitPeerStatus('privacy', isVideoPrivacyActive);

            isScreenStreaming = !isScreenStreaming;
            myScreenStatus = isScreenStreaming;

            if (isScreenStreaming) {
                setMyVideoStatusTrue();
                emitPeersAction('screenStart');
            } else {
                emitPeersAction('screenStop');
                adaptAspectRatio();
                // Reset zoom
                myVideo.style.transform = '';
                myVideo.style.transformOrigin = 'center';
            }

            await emitPeerStatus('screen', myScreenStatus);

            await stopLocalVideoTrack();
            await refreshMyLocalStream(screenMediaPromise, !useAudio);
            await refreshMyStreamToPeers(screenMediaPromise, !useAudio);

            if (init) {
                // Handle init media stream
                if (initStream) await stopTracks(initStream);
                initStream = screenMediaPromise;
                if (hasVideoTrack(initStream)) {
                    const newInitStream = new MediaStream([initStream.getVideoTracks()[0]]);
                    elemDisplay(initVideo, true, 'block');
                    initVideo.classList.toggle('mirror');
                    initVideo.srcObject = newInitStream;
                    disable(initVideoSelect, isScreenStreaming);
                    disable(initVideoBtn, isScreenStreaming);
                } else {
                    elemDisplay(initVideo, false);
                }
            }

            // Disable cam video when screen sharing stops
            if (!init && !isScreenStreaming && !myVideoStatusBefore) setMyVideoOff(myPeerName);
            // Enable cam video when screen sharing stops
            if (!init && !isScreenStreaming && myVideoStatusBefore) setMyVideoStatusTrue();

            myVideo.classList.toggle('mirror');
            setScreenSharingStatus(isScreenStreaming);

            if (myVideoAvatarImage && !useVideo) {
                isScreenStreaming
                    ? elemDisplay(myVideoAvatarImage, false)
                    : elemDisplay(myVideoAvatarImage, true, 'block');
            }

            if (myPrivacyBtn) {
                isScreenStreaming ? elemDisplay(myPrivacyBtn, false) : elemDisplay(myPrivacyBtn, true);
            }

            if (isScreenStreaming || isVideoPinned) myVideoPinBtn.click();
        }
    } catch (err) {
        err.name === 'NotAllowedError'
            ? console.error('Screen sharing permission was denied by the user.')
            : await handleToggleScreenException(`[Warning] Unable to share the screen: ${err}`, init);
        if (init) return;
    }
}

/**
 * Handle exception and actions when toggling screen sharing
 * @param {string} reason - The reason message
 * @param {boolean} init - Indicates whether it's an initial state
 */
async function handleToggleScreenException(reason, init) {
    try {
        console.warn('handleToggleScreenException', reason);

        // Update video privacy status
        isVideoPrivacyActive = false;
        emitPeerStatus('privacy', isVideoPrivacyActive);

        // Inform peers about screen sharing stop
        emitPeersAction('screenStop');

        // Turn off your video
        setMyVideoOff(myPeerName);

        // Toggle screen streaming status
        isScreenStreaming = !isScreenStreaming;
        myScreenStatus = isScreenStreaming;

        // Update screen sharing status
        setScreenSharingStatus(isScreenStreaming);

        // Emit screen status to peers
        await emitPeerStatus('screen', myScreenStatus);

        // Stop the local video track
        await stopLocalVideoTrack();

        // Handle video status based on conditions
        if (!init && !isScreenStreaming && !myVideoStatusBefore) {
            setMyVideoOff(myPeerName);
        } else if (!init && !isScreenStreaming && myVideoStatusBefore) {
            setMyVideoStatusTrue();
        }

        // Toggle the 'mirror' class on myVideo
        myVideo.classList.toggle('mirror');

        // Handle video avatar image and privacy button visibility
        if (myVideoAvatarImage && !useVideo) {
            isScreenStreaming ? elemDisplay(myVideoAvatarImage, false) : elemDisplay(myVideoAvatarImage, true, 'block');
        }

        // Automatically pin the video if screen sharing or video is pinned
        if (isScreenStreaming || isVideoPinned) {
            myVideoPinBtn.click();
        }
    } catch (error) {
        console.error('[Error] An unexpected error occurred', error);
    }
}

/**
 * Set Screen Sharing Status
 * @param {boolean} status of screen sharing
 */
function setScreenSharingStatus(status) {
    if (!useVideo) {
        status ? elemDisplay(myVideo, true, 'block') : elemDisplay(myVideo, false);
    }
    initScreenShareBtn.className = status ? className.screenOff : className.screenOn;
    screenShareBtn.className = status ? className.screenOff : className.screenOn;
    setTippy(screenShareBtn, status ? 'Stop screen sharing' : 'Start screen sharing', placement);
}

/**
 * Set myVideoStatus true
 */
async function setMyVideoStatusTrue() {
    if (myVideoStatus || !useVideo) return;
    // Put video status already ON
    localVideoMediaStream.getVideoTracks()[0].enabled = true;
    myVideoStatus = true;
    initVideoBtn.className = className.videoOn;
    videoBtn.className = className.videoOn;
    myVideoStatusIcon.className = className.videoOn;
    elemDisplay(myVideoAvatarImage, false);
    elemDisplay(myVideo, true, 'block');
    setTippy(videoBtn, 'Stop the video', placement);
    setTippy(initVideoBtn, 'Stop the video', 'top');
    emitPeerStatus('video', myVideoStatus);
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
    setTippy(fullScreenBtn, isDocumentOnFullScreen ? 'Exit full screen' : 'View full screen', placement);
}

/**
 * Refresh my stream changes to connected peers in the room
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getSenders
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
 *
 * @param {MediaStream} stream - Media stream (audio/video) to refresh to peers.
 * @param {boolean} localAudioTrackChange - Indicates whether there's a change in the local audio track (default false).
 */
async function refreshMyStreamToPeers(stream, localAudioTrackChange = false) {
    if (!thereArePeerConnections()) return;

    if (useAudio && localAudioTrackChange) localAudioMediaStream.getAudioTracks()[0].enabled = myAudioStatus;

    // Log peer connections and all peers
    console.log('PEER-CONNECTIONS', peerConnections);
    console.log('ALL-PEERS', allPeers);

    // Check if the passed stream has an audio track
    const streamHasAudioTrack = hasAudioTrack(stream);

    // Check if the passed stream has an video track
    const streamHasVideoTrack = hasVideoTrack(stream);

    // Check if the local stream has an audio track
    const localStreamHasAudioTrack = hasAudioTrack(localAudioMediaStream);

    // Check if the local stream has an video track
    const localStreamHasVideoTrack = hasVideoTrack(localVideoMediaStream);

    // Determine the audio stream to add to peers
    const audioStream = streamHasAudioTrack ? stream : localStreamHasAudioTrack && localAudioMediaStream;

    // Determine the audio track to replace to peers
    const audioTrack =
        streamHasAudioTrack && (localAudioTrackChange || isScreenStreaming)
            ? stream.getAudioTracks()[0]
            : localStreamHasAudioTrack && localAudioMediaStream.getAudioTracks()[0];

    // Determine the video stream to add to peers
    const videoStream = streamHasVideoTrack ? stream : localStreamHasVideoTrack && localVideoMediaStream;

    // Determine the video track to replace to peers
    const videoTracks = streamHasVideoTrack
        ? stream.getVideoTracks()[0]
        : localStreamHasVideoTrack && localVideoMediaStream.getVideoTracks()[0];

    // Refresh my stream to connected peers except myself
    for (const peer_id in peerConnections) {
        const peer_name = allPeers[peer_id]['peer_name'];

        // Replace video track
        const videoSender = peerConnections[peer_id].getSenders().find((s) => s.track && s.track.kind === 'video');

        if (useVideo && videoSender) {
            videoSender.replaceTrack(videoTracks);
            console.log('REPLACE VIDEO TRACK TO', { peer_id, peer_name, video: videoTracks });
        } else {
            if (videoStream) {
                // Add video track if sender does not exist
                videoStream.getTracks().forEach(async (track) => {
                    if (track.kind === 'video') {
                        peerConnections[peer_id].addTrack(track);
                        await handleRtcOffer(peer_id); // https://groups.google.com/g/discuss-webrtc/c/Ky3wf_hg1l8?pli=1
                        console.log('ADD VIDEO TRACK TO', { peer_id, peer_name, video: track });
                    }
                });
            }
        }

        // Replace audio track
        const audioSender = peerConnections[peer_id].getSenders().find((s) => s.track && s.track.kind === 'audio');

        if (audioSender && audioTrack) {
            audioSender.replaceTrack(audioTrack);
            console.log('REPLACE AUDIO TRACK TO', { peer_id, peer_name, audio: audioTrack });
        } else {
            if (audioStream) {
                // Add audio track if sender does not exist
                audioStream.getTracks().forEach(async (track) => {
                    if (track.kind === 'audio') {
                        peerConnections[peer_id].addTrack(track);
                        await handleRtcOffer(peer_id); // https://groups.google.com/g/discuss-webrtc/c/Ky3wf_hg1l8?pli=1
                        console.log('ADD AUDIO TRACK TO', { peer_id, peer_name, audio: track });
                    }
                });
            }
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

    const tracksToInclude = [];

    const videoTrack = hasVideoTrack(stream)
        ? stream.getVideoTracks()[0]
        : hasVideoTrack(localVideoMediaStream) && localVideoMediaStream.getVideoTracks()[0];

    const audioTrack =
        hasAudioTrack(stream) && localAudioTrackChange
            ? stream.getAudioTracks()[0]
            : hasAudioTrack(localAudioMediaStream) && localAudioMediaStream.getAudioTracks()[0];

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
    if (useVideo || isScreenStreaming) {
        console.log('Refresh my local media stream VIDEO - AUDIO', { isScreenStreaming: isScreenStreaming });
        if (videoTrack) {
            tracksToInclude.push(videoTrack);
            localVideoMediaStream = new MediaStream([videoTrack]);
            attachMediaStream(myVideo, localVideoMediaStream);
            logStreamSettingsInfo('refreshMyLocalStream-localVideoMediaStream', localVideoMediaStream);
        }
        if (audioTrack) {
            tracksToInclude.push(audioTrack);
            localAudioMediaStream = new MediaStream([audioTrack]);
            attachMediaStream(myAudio, localAudioMediaStream);
            getMicrophoneVolumeIndicator(localAudioMediaStream);
            logStreamSettingsInfo('refreshMyLocalStream-localAudioMediaStream', localAudioMediaStream);
        }
    } else {
        console.log('Refresh my local media stream AUDIO');
        if (useAudio && audioTrack) {
            tracksToInclude.push(audioTrack);
            localAudioMediaStream = new MediaStream([audioTrack]);
            getMicrophoneVolumeIndicator(localAudioMediaStream);
            logStreamSettingsInfo('refreshMyLocalStream-localAudioMediaStream', localAudioMediaStream);
        }
    }

    if (isScreenStreaming) {
        // refresh video privacy mode on screen sharing
        isVideoPrivacyActive = false;
        setVideoPrivacyStatus('myVideo', isVideoPrivacyActive);

        // on toggleScreenSharing video stop from popup bar
        stream.getVideoTracks()[0].onended = () => {
            toggleScreenSharing();
        };
    }

    // adapt video object fit on screen streaming
    myVideo.style.objectFit = isScreenStreaming ? 'contain' : 'var(--video-object-fit)';
}

/**
 * Check if MediaStream has audio track
 * @param {MediaStream} mediaStream
 * @returns boolean
 */
function hasAudioTrack(mediaStream) {
    if (!mediaStream) return false;
    const audioTracks = mediaStream.getAudioTracks();
    return audioTracks.length > 0;
}

/**
 * Check if MediaStream has video track
 * @param {MediaStream} mediaStream
 * @returns boolean
 */
function hasVideoTrack(mediaStream) {
    if (!mediaStream) return false;
    const videoTracks = mediaStream.getVideoTracks();
    return videoTracks.length > 0;
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
 * Handle recording errors
 * @param {string} error
 */
function handleRecordingError(error, popupLog = true) {
    console.error('Recording error', error);
    if (popupLog) userLog('error', error);
}

/**
 * Seconds to HMS
 * @param {number} d
 * @return {string} format HH:MM:SS
 */
function secondsToHms(d) {
    d = Number(d);
    const h = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    const s = Math.floor((d % 3600) % 60);
    const hDisplay = h > 0 ? h + 'h' : '';
    const mDisplay = m > 0 ? m + 'm' : '';
    const sDisplay = s > 0 ? s + 's' : '';
    return hDisplay + ' ' + mDisplay + ' ' + sDisplay;
}

/**
 * Start/Stop recording timer
 */
function startRecordingTimer() {
    resumeRecButtons();
    recElapsedTime = 0;
    recTimer = setInterval(function printTime() {
        if (!isStreamRecordingPaused) {
            recElapsedTime++;
            let recTimeElapsed = secondsToHms(recElapsedTime);
            myVideoParagraph.innerText = myPeerName + ' 🔴 REC ' + recTimeElapsed;
            recordingTime.innerText = recTimeElapsed;
        }
    }, 1000);
}
function stopRecordingTimer() {
    clearInterval(recTimer);
    resetRecButtons();
}

/**
 * Get MediaRecorder MimeTypes
 * @returns {boolean} is mimeType supported by media recorder
 */
function getSupportedMimeTypes() {
    const possibleTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/mp4'];
    possibleTypes.splice(recPrioritizeH264 ? 0 : 2, 0, 'video/mp4;codecs=h264,aac', 'video/webm;codecs=h264,opus');
    console.log('POSSIBLE CODECS', possibleTypes);
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

    // Get supported MIME types and set options
    const supportedMimeTypes = getSupportedMimeTypes();
    console.log('MediaRecorder supported options', supportedMimeTypes);
    const options = { mimeType: supportedMimeTypes[0] };

    recCodecs = supportedMimeTypes[0];

    try {
        audioRecorder = new MixedAudioRecorder();
        const audioStreams = getAudioStreamFromAudioElements();
        console.log('Audio streams tracks --->', audioStreams.getTracks());

        const audioMixerStreams = audioRecorder.getMixedAudioStream(
            audioStreams
                .getTracks()
                .filter((track) => track.kind === 'audio')
                .map((track) => new MediaStream([track])),
        );

        const audioMixerTracks = audioMixerStreams.getTracks();
        console.log('Audio mixer tracks --->', audioMixerTracks);

        isMobileDevice ? startMobileRecording(options, audioMixerTracks) : recordingOptions(options, audioMixerTracks);
    } catch (err) {
        handleRecordingError('Exception while creating MediaRecorder: ' + err);
    }
}

/**
 * Recording options Camera or Screen/Window for Desktop devices
 * @param {MediaRecorderOptions} options - MediaRecorder options.
 * @param {array} audioMixerTracks - Array of audio tracks from the audio mixer.
 */
function recordingOptions(options, audioMixerTracks) {
    Swal.fire({
        background: swBg,
        position: 'top',
        imageUrl: images.recording,
        title: 'Recording options',
        showDenyButton: true,
        showCancelButton: true,
        cancelButtonColor: 'red',
        denyButtonColor: 'green',
        confirmButtonText: `Camera`,
        denyButtonText: `Screen/Window`,
        cancelButtonText: `Cancel`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.isConfirmed) {
            startMobileRecording(options, audioMixerTracks);
        } else if (result.isDenied) {
            startDesktopRecording(options, audioMixerTracks);
        }
    });
}

/**
 * Starts mobile recording with the specified options and audio mixer tracks.
 * @param {MediaRecorderOptions} options - MediaRecorder options.
 * @param {array} audioMixerTracks - Array of audio tracks from the audio mixer.
 */
function startMobileRecording(options, audioMixerTracks) {
    try {
        // Combine audioMixerTracks and videoTracks into a single array
        const combinedTracks = [];

        // Add audio mixer tracks to the combinedTracks array if available
        if (Array.isArray(audioMixerTracks)) {
            combinedTracks.push(...audioMixerTracks);
        }

        // Check if there's a local media stream (presumably for the camera)
        if (useVideo && localVideoMediaStream !== null) {
            const videoTracks = localVideoMediaStream.getVideoTracks();
            console.log('Cam video tracks --->', videoTracks);

            // Add video tracks from the local media stream to combinedTracks if available
            if (Array.isArray(videoTracks)) {
                combinedTracks.push(...videoTracks);
            }
        }

        // Create a new MediaStream using the combinedTracks
        const recCamStream = new MediaStream(combinedTracks);
        console.log('New Cam Media Stream tracks  --->', recCamStream.getTracks());

        // Create a MediaRecorder instance with the combined stream and specified options
        mediaRecorder = new MediaRecorder(recCamStream, options);
        console.log('Created MediaRecorder', mediaRecorder, 'with options', options);

        // Call a function to handle the MediaRecorder
        handleMediaRecorder(mediaRecorder);
    } catch (err) {
        // Handle any errors that occur during the recording setup
        handleRecordingError('Unable to record the camera + audio: ' + err, false);
    }
}

/**
 * Starts desktop recording with the specified options and audio mixer tracks.
 * On desktop devices, it records the screen or window along with all audio tracks.
 * @param {MediaRecorderOptions} options - MediaRecorder options.
 * @param {array} audioMixerTracks - Array of audio tracks from the audio mixer.
 */
function startDesktopRecording(options, audioMixerTracks) {
    // Get the desired frame rate for screen recording
    // screenMaxFrameRate = parseInt(screenFpsSelect.value, 10);

    // Define constraints for capturing the screen
    const constraints = {
        video: { frameRate: { max: 30 } }, // Recording max 30fps
    };

    // Request access to screen capture using the specified constraints
    navigator.mediaDevices
        .getDisplayMedia(constraints)
        .then((screenStream) => {
            // Get video tracks from the screen capture stream
            const screenTracks = screenStream.getVideoTracks();
            console.log('Screen video tracks --->', screenTracks);

            // Create an array to combine screen tracks and audio mixer tracks
            const combinedTracks = [];

            // Add screen video tracks to combinedTracks if available
            if (Array.isArray(screenTracks)) {
                combinedTracks.push(...screenTracks);
            }

            // Add audio mixer tracks to combinedTracks if available
            if (useAudio && Array.isArray(audioMixerTracks)) {
                combinedTracks.push(...audioMixerTracks);
            }

            // Create a new MediaStream using the combinedTracks
            recScreenStream = new MediaStream(combinedTracks);
            console.log('New Screen/Window Media Stream tracks  --->', recScreenStream.getTracks());

            // Create a MediaRecorder instance with the combined stream and specified options
            mediaRecorder = new MediaRecorder(recScreenStream, options);
            console.log('Created MediaRecorder', mediaRecorder, 'with options', options);

            // Set a flag to indicate that screen recording is active
            isRecScreenStream = true;

            // Call a function to handle the MediaRecorder
            handleMediaRecorder(mediaRecorder);
        })
        .catch((err) => {
            // Handle any errors that occur during screen recording setup
            handleRecordingError('Unable to record the screen + audio: ' + err, false);
        });
}

/**
 * Get a MediaStream containing audio tracks from audio elements on the page.
 * @returns {MediaStream} A MediaStream containing audio tracks.
 */
function getAudioStreamFromAudioElements() {
    const audioElements = getSlALL('audio');
    const audioStream = new MediaStream();
    audioElements.forEach((audio) => {
        const audioTrack = audio.srcObject.getAudioTracks()[0];
        if (audioTrack) {
            audioStream.addTrack(audioTrack);
        }
    });
    return audioStream;
}

/**
 * Notify me if someone start to recording they camera/screen/window + audio
 * @param {string} fromId peer_id
 * @param {string} from peer_name
 * @param {string} action recording action
 */
function notifyRecording(fromId, from, action) {
    const msg = '🔴 ' + action + ' conference recording';
    const chatMessage = {
        from: from,
        fromId: fromId,
        to: myPeerName,
        msg: msg,
        privateMsg: false,
    };
    handleDataChannelChat(chatMessage);
    if (!showChatOnMessage) {
        const recAgree = action != 'Stop' ? 'Your presence implies you agree to being recorded' : '';
        toastMessage(
            null,
            null,
            `${from}
            <br /><br />
            <span>${msg}</span>
            <br /><br />
            ${recAgree}`,
            'top-end',
            6000,
        );
    }
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
    startRecordingTimer();
    emitPeersAction('recStart');
    emitPeerStatus('rec', true);
    console.log('MediaRecorder started: ', event);
    isStreamRecording = true;
    recordStreamBtn.style.setProperty('color', '#ff4500');
    setTippy(recordStreamBtn, 'Stop recording', placement);
    if (isMobileDevice) elemDisplay(swapCameraBtn, false);
    playSound('recStart');
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
    console.log('MediaRecorder stopped: ', event);
    console.log('MediaRecorder Blobs: ', recordedBlobs);
    stopRecordingTimer();
    emitPeersAction('recStop');
    emitPeerStatus('rec', false);
    isStreamRecording = false;
    myVideoParagraph.innerText = myPeerName + ' (me)';
    if (isRecScreenStream) {
        recScreenStream.getTracks().forEach((track) => {
            if (track.kind === 'video') track.stop();
        });
        isRecScreenStream = false;
    }
    recordStreamBtn.style.setProperty('color', '#000');
    downloadRecordedStream();
    setTippy(recordStreamBtn, 'Start recording', placement);
    if (isMobileDevice) elemDisplay(swapCameraBtn, true, 'block');
    playSound('recStop');
}

/**
 * Stop recording
 */
function stopStreamRecording() {
    mediaRecorder.stop();
    audioRecorder.stopMixedAudioStream();
}

/**
 * Pause recording display buttons
 */
function pauseRecButtons() {
    elemDisplay(pauseRecBtn, false);
    elemDisplay(resumeRecBtn, true);
}
/**
 * Resume recording display buttons
 */
function resumeRecButtons() {
    elemDisplay(resumeRecBtn, false);
    elemDisplay(pauseRecBtn, true);
}
/**
 * Reset recording display buttons
 */
function resetRecButtons() {
    elemDisplay(pauseRecBtn, false);
    elemDisplay(resumeRecBtn, false);
}

/**
 * Pause recording
 */
function pauseRecording() {
    if (mediaRecorder) {
        isStreamRecordingPaused = true;
        mediaRecorder.pause();
        pauseRecButtons();
        console.log('Pause recording');
    }
}

/**
 * Resume recording
 */
function resumeRecording() {
    if (mediaRecorder) {
        mediaRecorder.resume();
        isStreamRecordingPaused = false;
        resumeRecButtons();
        console.log('Resume recording');
    }
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

        const recordingInfo = `
        <br/>
        <br/>
            <ul>
                <li>Time: ${recordingTime.innerText}</li>
                <li>File: ${recFileName}</li>
                <li>Codecs: ${recCodecs}</li>
                <li>Size: ${blobFileSize}</li>
            </ul>
        <br/>
        `;
        lastRecordingInfo.innerHTML = `<br/>Last recording info: ${recordingInfo}`;
        recordingTime.innerText = '';

        userLog(
            'success-html',
            `<div style="text-align: left;">
                🔴 &nbsp; Recording Info: <br/>
                ${recordingInfo}
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
        setSP('--msger-height', '99%');
        setSP('--msger-width', '99%');
        // caption full screen
        setSP('--caption-height', '99%');
        setSP('--caption-width', '99%');
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
        elemDisplay(buttonsBar, false);
        elemDisplay(bottomButtons, false);
        isButtonsVisible = false;
    }
    //chatLeftCenter();
    chatCenter();

    chatRoomBtn.className = className.chatOff;
    isChatRoomVisible = true;

    if (isDesktopDevice && canBePinned()) {
        toggleChatPin();
    }

    setTippy(chatRoomBtn, 'Close the chat', bottomButtonsPlacement);
}

/**
 * Show caption box draggable on center screen position
 */
function showCaptionDraggable() {
    playSound('newMessage');
    if (isMobileDevice) {
        elemDisplay(buttonsBar, false);
        elemDisplay(bottomButtons, false);
        isButtonsVisible = false;
    }
    //captionRightCenter();
    captionCenter();
    captionBtn.className = 'far fa-closed-captioning';
    isCaptionBoxVisible = true;

    if (isDesktopDevice && canBePinned()) {
        toggleCaptionPin();
    }

    setTippy(captionBtn, 'Close the caption', placement);
}

/**
 * Toggle Chat dropdown menu
 */
function toggleChatDropDownMenu() {
    msgerDropDownContent.style.display === 'block'
        ? (msgerDropDownContent.style.display = 'none')
        : (msgerDropDownContent.style.display = 'block');
}

/**
 * Chat maximize
 */
function chatMaximize() {
    elemDisplay(msgerMaxBtn, false);
    elemDisplay(msgerMinBtn, true);
    chatCenter();
    setSP('--msger-width', '100%');
    setSP('--msger-height', '100%');
}

/**
 * Chat minimize
 */
function chatMinimize() {
    elemDisplay(msgerMinBtn, false);
    elemDisplay(msgerMaxBtn, true);
    chatCenter();
    if (!isChatPinned) {
        if (isMobileDevice) {
            setSP('--msger-width', '99%');
            setSP('--msger-height', '99%');
        } else {
            setSP('--msger-width', '420px');
            setSP('--msger-height', '680px');
        }
    } else {
        setSP('--msger-width', '25%');
        setSP('--msger-height', '100%');
    }
}

/**
 * Set chat position
 */
function chatCenter() {
    if (!isChatPinned) {
        msgerDraggable.style.position = 'fixed';
        msgerDraggable.style.display = 'flex';
        msgerDraggable.style.top = '50%';
        msgerDraggable.style.left = '50%';
        msgerDraggable.style.transform = 'translate(-50%, -50%)';
        msgerDraggable.style.webkitTransform = 'translate(-50%, -50%)';
        msgerDraggable.style.mozTransform = 'translate(-50%, -50%)';
    }
}

/**
 * Check if the element can be pinned based of viewport size
 * @returns boolean
 */
function canBePinned() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    return viewportWidth >= 1024 && viewportHeight >= 768;
}

/**
 * Toggle Chat Pin
 */
function toggleChatPin() {
    if (isCaptionPinned) {
        return userLog('toast', 'Please unpin the Caption that appears to be currently pinned');
    }
    isChatPinned ? chatUnpin() : chatPin();
    playSound('click');
}

/**
 * Handle chat pin
 */
function chatPin() {
    videoMediaContainerPin();
    chatPinned();
    isChatPinned = true;
    setColor(msgerTogglePin, 'lime');
    resizeVideoMedia();
    msgerDraggable.style.resize = 'none';
    if (!isMobileDevice) undragElement(msgerDraggable, msgerHeader);
}

/**
 * Handle chat unpin
 */
function chatUnpin() {
    videoMediaContainerUnpin();
    setSP('--msger-width', '420px');
    setSP('--msger-height', '680px');
    elemDisplay(msgerMinBtn, false);
    buttons.chat.showMaxBtn && elemDisplay(msgerMaxBtn, true);
    isChatPinned = false;
    //chatLeftCenter();
    chatCenter();
    setColor(msgerTogglePin, 'white');
    resizeVideoMedia();
    msgerDraggable.style.resize = 'both';
    if (!isMobileDevice) dragElement(msgerDraggable, msgerHeader);
}

/**
 * Move Chat center left
 */
function chatLeftCenter() {
    msgerDraggable.style.position = 'fixed';
    msgerDraggable.style.display = 'flex';
    msgerDraggable.style.top = '50%';
    msgerDraggable.style.left = isMobileDevice ? '50%' : '25%';
    msgerDraggable.style.transform = 'translate(-50%, -50%)';
}

/**
 * Chat is pinned
 */
function chatPinned() {
    msgerDraggable.style.position = 'absolute';
    msgerDraggable.style.top = 0;
    msgerDraggable.style.right = 0;
    msgerDraggable.style.left = null;
    msgerDraggable.style.transform = null;
    setSP('--msger-width', '25%');
    setSP('--msger-height', '100%');
}

/**
 * Caption maximize
 */
function captionMaximize() {
    elemDisplay(captionMaxBtn, false);
    elemDisplay(captionMinBtn, true);
    captionCenter();
    setSP('--caption-width', '100%');
    setSP('--caption-height', '100%');
}

/**
 * Caption minimize
 */
function captionMinimize() {
    elemDisplay(captionMinBtn, false);
    elemDisplay(captionMaxBtn, true);
    captionCenter();
    if (!isCaptionPinned) {
        if (isMobileDevice) {
            setSP('--caption-width', '99%');
            setSP('--caption-height', '99%');
        } else {
            setSP('--caption-width', '420px');
            setSP('--caption-height', '680px');
        }
    } else {
        setSP('--caption-width', '25%');
        setSP('--caption-height', '100%');
    }
}

/**
 * Set chat position
 */
function captionCenter() {
    if (!isCaptionPinned) {
        captionDraggable.style.position = 'fixed';
        captionDraggable.style.display = 'flex';
        captionDraggable.style.top = '50%';
        captionDraggable.style.left = '50%';
        captionDraggable.style.transform = 'translate(-50%, -50%)';
        captionDraggable.style.webkitTransform = 'translate(-50%, -50%)';
        captionDraggable.style.mozTransform = 'translate(-50%, -50%)';
    }
}

/**
 * Toggle Caption Pin
 */
function toggleCaptionPin() {
    if (isChatPinned) {
        return userLog('toast', 'Please unpin the Chat that appears to be currently pinned');
    }
    isCaptionPinned ? captionUnpin() : captionPin();
    playSound('click');
}

/**
 * Handle caption pin
 */
function captionPin() {
    videoMediaContainerPin();
    captionPinned();
    isCaptionPinned = true;
    setColor(captionTogglePin, 'lime');
    resizeVideoMedia();
    captionDraggable.style.resize = 'none';
    if (!isMobileDevice) undragElement(captionDraggable, captionHeader);
}

/**
 * Handle caption unpin
 */
function captionUnpin() {
    videoMediaContainerUnpin();
    setSP('--caption-width', '420px');
    setSP('--caption-height', '680px');
    elemDisplay(captionMinBtn, false);
    buttons.caption.showMaxBtn && elemDisplay(captionMaxBtn, true);
    isCaptionPinned = false;
    //captionRightCenter();
    captionCenter();
    setColor(captionTogglePin, 'white');
    resizeVideoMedia();
    captionDraggable.style.resize = 'both';
    if (!isMobileDevice) dragElement(captionDraggable, captionHeader);
}

/**
 * Move Caption center right
 */
function captionRightCenter() {
    captionDraggable.style.position = 'fixed';
    captionDraggable.style.display = 'flex';
    captionDraggable.style.top = '50%';
    captionDraggable.style.left = isMobileDevice ? '50%' : '75%';
    captionDraggable.style.transform = 'translate(-50%, -50%)';
}

/**
 * Caption is pinned
 */
function captionPinned() {
    captionDraggable.style.position = 'absolute';
    captionDraggable.style.top = 0;
    captionDraggable.style.right = 0;
    captionDraggable.style.left = null;
    captionDraggable.style.transform = null;
    setSP('--caption-width', '25%');
    setSP('--caption-height', '100%');
}

/**
 * Clean chat messages
 */
function cleanMessages() {
    playSound('newMessage');
    Swal.fire({
        background: swBg,
        position: 'center',
        title: 'Clean up chat messages?',
        imageUrl: images.delete,
        showDenyButton: true,
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        // clean chat messages
        if (result.isConfirmed) {
            let msgs = msgerChat.firstChild;
            while (msgs) {
                msgerChat.removeChild(msgs);
                msgs = msgerChat.firstChild;
            }
            // clean chat messages
            chatMessages = [];
            // clean chatGPT context
            chatGPTcontext = [];
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
        background: swBg,
        position: 'center',
        title: 'Clean up all caption transcripts?',
        imageUrl: images.delete,
        showDenyButton: true,
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
    if (isChatPinned) {
        chatUnpin();
    }
    elemDisplay(msgerDraggable, false);
    elemDisplay(msgerEmojiPicker, false);
    setColor(msgerEmojiBtn, '#FFFFFF');
    chatRoomBtn.className = className.chatOn;
    isChatRoomVisible = false;
    isChatEmojiVisible = false;
    setTippy(chatRoomBtn, 'Open the chat', bottomButtonsPlacement);
}

/**
 * Hide chat room and emoji picker
 */
function hideCaptionBox() {
    if (isCaptionPinned) {
        captionUnpin();
    }
    elemDisplay(captionDraggable, false);
    captionBtn.className = className.captionOn;
    isCaptionBoxVisible = false;
    setTippy(captionBtn, 'Open the caption', placement);
}

/**
 * Send Chat messages to peers in the room
 */
async function sendChatMessage() {
    if (!thereArePeerConnections() && !isChatGPTOn) {
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

    setPeerChatAvatarImgName('left', msgFrom);
    appendMessage(msgFrom, leftChatAvatar, 'left', msg, msgPrivate, msgId);
    speechInMessages ? speechMessage(true, msgFrom, msg) : playSound('chatMessage');
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
    const avatar_image = isValidEmail(peer_name) ? genGravatar(peer_name) : genAvatarSvg(peer_name, 32);

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

    const isValidPrivateMessage = getPrivateMsg && getMsgId != null && getMsgId != myPeerId;

    const message = getFrom === 'ChatGPT' ? `<pre>${getMsg}</pre>` : getMsg;

    let msgHTML = `
	<div id="msg-${chatMessagesId}" class="msg ${getSide}-msg">
        <img class="msg-img" src="${getImg}" />
		<div class=${msgBubble}>
            <div class="msg-info">
                <div class="msg-info-name">${getFrom}</div>
                <div class="msg-info-time">${time}</div>
            </div>
            <div id="${chatMessagesId}" class="msg-text">${message}
                <hr/>
    `;
    // add btn direct reply to private message
    if (isValidPrivateMessage) {
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
                ></button>`;
    if (isSpeechSynthesisSupported) {
        msgHTML += `
                <button
                    id="msg-speech-${chatMessagesId}"
                    class="${className.speech}" 
                    style="color:#fff; border:none; background:transparent;"
                    onclick="speechMessage(false, '${getFrom}', '${checkMsg(message)}')"
                ></button>`;
    }
    msgHTML += ` 
            </div>
        </div>
    </div>
    `;
    msgerChat.insertAdjacentHTML('beforeend', msgHTML);
    msgerChat.scrollTop += 500;
    if (!isMobileDevice) {
        setTippy(getId('msg-delete-' + chatMessagesId), 'Delete', 'top');
        setTippy(getId('msg-copy-' + chatMessagesId), 'Copy', 'top');
        setTippy(getId('msg-speech-' + chatMessagesId), 'Speech', 'top');
        if (isValidPrivateMessage) {
            setTippy(getId('msg-private-reply-' + chatMessagesId), 'Reply', 'top');
        }
    }
    chatMessagesId++;
}

/**
 * Speech message
 * https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance
 *
 * @param {boolean} newMsg true/false
 * @param {string} from peer_name
 * @param {string} msg message
 */
function speechMessage(newMsg = true, from, msg) {
    const speech = new SpeechSynthesisUtterance();
    speech.text = (newMsg ? 'New' : '') + ' message from:' + from + '. The message is:' + msg;
    speech.rate = 0.9;
    window.speechSynthesis.speak(speech);
}

/**
 * Delete message
 * @param {string} id msg id
 */
function deleteMessage(id) {
    playSound('newMessage');
    Swal.fire({
        background: swBg,
        position: 'center',
        title: 'Delete this messages?',
        imageUrl: images.delete,
        showDenyButton: true,
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
            msgPopup('error', err, 'top', 2000);
        });
}

/**
 * Add participants in the chat room lists
 * @param {object} peers all peers info connected to the same room
 */
async function msgerAddPeers(peers) {
    // console.log("peers", peers);
    // add all current Participants
    for (const peer_id in peers) {
        const peer_name = peers[peer_id]['peer_name'];
        // bypass insert to myself in the list :)
        if (peer_id != myPeerId && peer_name) {
            const exsistMsgerPrivateDiv = getId(peer_id + '_pMsgDiv');
            // if there isn't add it....
            if (!exsistMsgerPrivateDiv) {
                const avatarSvg = isValidEmail(peer_name) ? genGravatar(peer_name) : genAvatarSvg(peer_name, 24);
                const msgerPrivateDiv = `
                <div id="${peer_id}_pMsgDiv" class="msger-peer-inputarea">
                <span style="display: none">${peer_name}</span>
                <img id="${peer_id}_pMsgAvatar" class="peer-img" src="${avatarSvg}"> 
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

                const msgerPrivateMsgInput = getId(peer_id + '_pMsgInput');
                const msgerPrivateBtn = getId(peer_id + '_pMsgBtn');
                addMsgerPrivateBtn(msgerPrivateBtn, msgerPrivateMsgInput, myPeerId);
            }
        }
    }
}

/**
 * Search peer by name in chat room lists to send the private messages
 */
function searchPeer() {
    const searchPeerBarName = getId('searchPeerBarName').value.toLowerCase();
    const msgerPeerInputarea = getEcN('msger-peer-inputarea');
    for (let i = 0; i < msgerPeerInputarea.length; i++) {
        const span = msgerPeerInputarea[i].getElementsByTagName('span')[0];
        //console.log(span);
        span && span.innerText.toLowerCase().includes(searchPeerBarName)
            ? elemDisplay(msgerPeerInputarea[i], true, 'flex')
            : elemDisplay(msgerPeerInputarea[i], false);
    }
}

/**
 * Remove participant from chat room lists
 * @param {string} peer_id socket.id
 */
function msgerRemovePeer(peer_id) {
    const msgerPrivateDiv = getId(peer_id + '_pMsgDiv');
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
        elemDisplay(msgerCP, false);
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
        'i', // fragment locator
    );
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

    const chatMessage = {
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
                context: chatGPTcontext,
            },
        })
        .then(
            function (completion) {
                if (!completion) return;
                const { message, context } = completion;
                chatGPTcontext = context ? context : [];
                setPeerChatAvatarImgName('left', 'ChatGPT');
                appendMessage('ChatGPT', leftChatAvatar, 'left', message, true);
                cleanMessageInput();
                speechInMessages ? speechMessage(true, 'ChatGPT', message) : playSound('message');
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
        elemDisplay(msgerEmojiPicker, true, 'block');
        setColor(msgerEmojiBtn, '#FFFF00');
        isChatEmojiVisible = true;
        return;
    }
    elemDisplay(msgerEmojiPicker, false);
    setColor(msgerEmojiBtn, '#FFFFFF');
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
            setSP('--mySettings-select-w', '99%');
        }
        // my current peer name
        myPeerNameSet.placeholder = myPeerName;
        // center screen on show
        mySettings.style.top = '50%';
        mySettings.style.left = '50%';
        elemDisplay(mySettings, true, 'block');
        setTippy(mySettingsBtn, 'Close the settings', placement);
        isMySettingsVisible = true;
        return;
    }
    elemDisplay(mySettings, false);
    setTippy(mySettingsBtn, 'Open the settings', placement);
    isMySettingsVisible = false;
}

/**
 * Handle html tab settings
 * https://www.w3schools.com/howto/howto_js_tabs.asp
 * @param {object} evt event
 * @param {string} tabName name of the tab to open
 */
function openTab(evt, tabName) {
    const tabN = getId(tabName);
    const tabContent = getEcN('tabcontent');
    const tabLinks = getEcN('tablinks');
    let i;
    for (i = 0; i < tabContent.length; i++) {
        elemDisplay(tabContent[i], false);
    }
    for (i = 0; i < tabLinks.length; i++) {
        tabLinks[i].className = tabLinks[i].className.replace(' active', '');
    }
    elemDisplay(tabN, true, 'block');
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
    setPeerAvatarImgName('myProfileAvatar', myPeerName);
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
    if (msgerPeerAvatar) {
        msgerPeerAvatar.src = isValidEmail(peer_name) ? genGravatar(peer_name) : genAvatarSvg(peer_name, 32);
    }
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
    if (isHideMeActive) {
        if (isVideoPinned) myVideoPinBtn.click();
        elemDisplay(myVideoWrap, false);
        setColor(hideMeBtn, 'red');
        hideMeBtn.className = className.hideMeOn;
        playSound('off');
    } else {
        elemDisplay(myVideoWrap, true, 'inline-block');
        hideMeBtn.className = className.hideMeOff;
        setColor(hideMeBtn, 'black');
        playSound('on');
    }
    resizeVideoMedia();
}

/**
 * Set my Hand Status and Icon
 */
function setMyHandStatus() {
    myHandStatus = !myHandStatus;
    if (myHandStatus) {
        // Raise hand
        setColor(myHandBtn, 'green');
        elemDisplay(myHandStatusIcon, true);
        setTippy(myHandBtn, 'Raise your hand', bottomButtonsPlacement);
        playSound('raiseHand');
    } else {
        // Lower hand
        setColor(myHandBtn, 'black');
        elemDisplay(myHandStatusIcon, false);
        setTippy(myHandBtn, 'Lower your hand', bottomButtonsPlacement);
    }
    emitPeerStatus('hand', myHandStatus);
}

/**
 * Set My Audio Status Icon and Title
 * @param {boolean} status of my audio
 */
function setMyAudioStatus(status) {
    console.log('My audio status', status);
    const audioClassName = status ? className.audioOn : className.audioOff;
    audioBtn.className = audioClassName;
    myAudioStatusIcon.className = audioClassName;
    // send my audio status to all peers in the room
    emitPeerStatus('audio', status);
    setTippy(myAudioStatusIcon, status ? 'My audio is on' : 'My audio is off', 'bottom');
    setTippy(audioBtn, status ? 'Stop the audio' : 'Start the audio', bottomButtonsPlacement);
    status ? playSound('on') : playSound('off');
}

/**
 * Set My Video Status Icon and Title
 * @param {boolean} status of my video
 */
function setMyVideoStatus(status) {
    console.log('My video status', status);

    // On video OFF display my video avatar name
    if (myVideoAvatarImage) {
        status ? elemDisplay(myVideoAvatarImage, false) : elemDisplay(myVideoAvatarImage, true, 'block');
    }
    if (myVideoStatusIcon) {
        myVideoStatusIcon.className = status ? className.videoOn : className.videoOff;
    }

    // send my video status to all peers in the room
    emitPeerStatus('video', status);

    if (!isMobileDevice) {
        if (myVideoStatusIcon) setTippy(myVideoStatusIcon, status ? 'My video is on' : 'My video is off', 'bottom');
        setTippy(videoBtn, status ? 'Stop the video' : 'Start the video', bottomButtonsPlacement);
    }

    if (status) {
        elemDisplay(myVideo, true, 'block');
        elemDisplay(initVideo, true, 'block');
        playSound('on');
    } else {
        elemDisplay(myVideo, false);
        elemDisplay(initVideo, false);
        playSound('off');
    }
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
            setVideoPrivacyStatus(peer_id + '___video', status);
            break;
        default:
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
    const peerHandStatus = getId(peer_id + '_handStatus');
    if (status) {
        elemDisplay(peerHandStatus, true);
        userLog('toast', `${icons.user} ${peer_name} \n has raised the hand!`);
        playSound('raiseHand');
    } else {
        elemDisplay(peerHandStatus, false);
    }
}

/**
 * Set Participant Audio Status and toggle Audio Volume
 * @param {string} peer_id socket.id
 * @param {boolean} status of peer audio
 */
function setPeerAudioStatus(peer_id, status) {
    const peerAudioStatus = getId(peer_id + '_audioStatus');
    const peerAudioVolume = getId(peer_id + '_audioVolume');
    if (peerAudioStatus) {
        peerAudioStatus.className = status ? className.audioOn : className.audioOff;
        setTippy(peerAudioStatus, status ? 'Participant audio is on' : 'Participant audio is off', 'bottom');
        status ? playSound('on') : playSound('off');
    }
    if (peerAudioVolume) {
        elemDisplay(peerAudioVolume, status);
    }
}

/**
 * Handle Peer audio volume 0/100
 * @param {string} audioVolumeId audio volume input id
 * @param {string} mediaId peer audio id
 */
function handleAudioVolume(audioVolumeId, mediaId) {
    const media = getId(mediaId);
    const audioVolume = getId(audioVolumeId);
    if (audioVolume && media) {
        audioVolume.style.maxWidth = '40px';
        audioVolume.style.display = 'inline';
        audioVolume.style.cursor = 'pointer';
        audioVolume.value = 100;
        audioVolume.addEventListener('input', () => {
            media.volume = audioVolume.value / 100;
        });
    } else {
        if (audioVolume) elemDisplay(audioVolume, false);
    }
}

/**
 * Mute Audio to specific user in the room
 * @param {string} peer_id socket.id
 */
function handlePeerAudioBtn(peer_id) {
    if (!buttons.remote.audioBtnClickAllowed) return;
    const peerAudioBtn = getId(peer_id + '_audioStatus');
    peerAudioBtn.onclick = () => {
        if (peerAudioBtn.className === className.audioOn) {
            isPresenter
                ? disablePeer(peer_id, 'audio')
                : msgPopup('warning', 'Only the presenter can mute participants', 'top-end', 4000);
        }
    };
}

/**
 * Hide Video to specified peer in the room
 * @param {string} peer_id socket.id
 */
function handlePeerVideoBtn(peer_id) {
    if (!useVideo || !buttons.remote.videoBtnClickAllowed) return;
    const peerVideoBtn = getId(peer_id + '_videoStatus');
    peerVideoBtn.onclick = () => {
        if (peerVideoBtn.className === className.videoOn) {
            isPresenter
                ? disablePeer(peer_id, 'video')
                : msgPopup('warning', 'Only the presenter can hide participants', 'top-end', 4000);
        }
    };
}

/**
 * Send Private Message to specific peer
 * @param {string} peer_id socket.id
 * @param {string} toPeerName peer name to send message
 */
function handlePeerPrivateMsg(peer_id, toPeerName) {
    const peerPrivateMsg = getId(peer_id + '_privateMsg');
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
        background: swBg,
        position: 'center',
        imageUrl: images.message,
        title: 'Send private message',
        input: 'text',
        showCancelButton: true,
        confirmButtonText: `Send`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.value) {
            result.value = filterXSS(result.value);
            const pMsg = checkMsg(result.value);
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
    const peerFileSendBtn = getId(peer_id + '_shareFile');
    peerFileSendBtn.onclick = () => {
        selectFileToShare(peer_id);
    };
}

/**
 * Send video - audio URL to specific peer
 * @param {string} peer_id socket.id
 */
function handlePeerVideoAudioUrl(peer_id) {
    const peerYoutubeBtn = getId(peer_id + '_videoAudioUrl');
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
    const peerVideoPlayer = getId(peer_id + '___video');
    const peerVideoAvatarImage = getId(peer_id + '_avatar');
    const peerVideoStatus = getId(peer_id + '_videoStatus');
    if (status) {
        if (peerVideoPlayer) elemDisplay(peerVideoPlayer, true, 'block');
        if (peerVideoAvatarImage) elemDisplay(peerVideoAvatarImage, false);
        if (peerVideoStatus) {
            peerVideoStatus.className = className.videoOn;
            setTippy(peerVideoStatus, 'Participant video is on', 'bottom');
            playSound('on');
        }
    } else {
        if (peerVideoPlayer) elemDisplay(peerVideoPlayer, false);
        if (peerVideoAvatarImage) elemDisplay(peerVideoAvatarImage, true, 'block');
        if (peerVideoStatus) {
            peerVideoStatus.className = className.videoOff;
            setTippy(peerVideoStatus, 'Participant video is off', 'bottom');
            playSound('off');
        }
    }
}

/**
 * Emit actions to all peers in the same room except yourself
 * @param {object} peerAction to all peers
 */
async function emitPeersAction(peerAction) {
    if (!thereArePeerConnections()) return;

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
    if (!thereArePeerConnections()) return;

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
    console.log('Handle peer action: ', config);
    const { peer_id, peer_name, peer_use_video, peer_action } = config;

    switch (peer_action) {
        case 'muteAudio':
            setMyAudioOff(peer_name);
            break;
        case 'hideVideo':
            setMyVideoOff(peer_name);
            break;
        case 'recStart':
            notifyRecording(peer_id, peer_name, 'Start');
            break;
        case 'recStop':
            notifyRecording(peer_id, peer_name, 'Stop');
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
        default:
            break;
    }
}

/**
 * Handle incoming message
 * @param {object} message
 */
function handleMessage(message) {
    console.log('Got message', message);

    switch (message.type) {
        case 'roomEmoji':
            handleEmoji(message);
            break;
        //....
        default:
            break;
    }
}

/**
 * Handle room emoji reaction
 * @param {object} message
 * @param {integer} duration time in ms
 */
function handleEmoji(message, duration = 5000) {
    if (userEmoji) {
        const emojiDisplay = document.createElement('div');
        emojiDisplay.className = 'animate__animated animate__backInUp';
        emojiDisplay.style.padding = '10px';
        emojiDisplay.style.fontSize = '2vh';
        emojiDisplay.style.color = '#FFF';
        emojiDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        emojiDisplay.style.borderRadius = '10px';
        emojiDisplay.style.marginBottom = '5px';
        emojiDisplay.innerText = `${message.emoji} ${message.peer_name}`;
        userEmoji.appendChild(emojiDisplay);
        setTimeout(() => {
            emojiDisplay.remove();
        }, duration);
    }
}

/**
 * Handle Screen Start
 * @param {string} peer_id
 */
function handleScreenStart(peer_id) {
    const remoteVideoAvatarImage = getId(peer_id + '_avatar');
    const remoteVideoStatusBtn = getId(peer_id + '_videoStatus');
    const remoteVideoStream = getId(peer_id + '___video');
    if (remoteVideoStatusBtn) {
        remoteVideoStatusBtn.className = className.videoOn;
        setTippy(remoteVideoStatusBtn, 'Participant screen share is on', 'bottom');
    }
    if (remoteVideoStream) {
        getId(peer_id + '_pinUnpin').click();
        remoteVideoStream.style.objectFit = 'contain';
        remoteVideoStream.style.name = peer_id + '_typeScreen';
    }
    if (remoteVideoAvatarImage) elemDisplay(remoteVideoAvatarImage, false);
}

/**
 * Handle Screen Stop
 * @param {string} peer_id
 * @param {boolean} peer_use_video
 */
function handleScreenStop(peer_id, peer_use_video) {
    const remoteVideoStream = getId(peer_id + '___video');
    const remoteVideoAvatarImage = getId(peer_id + '_avatar');
    const remoteVideoStatusBtn = getId(peer_id + '_videoStatus');
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
        elemDisplay(remoteVideoAvatarImage, true, 'block');
        remoteVideoStream.srcObject.getVideoTracks().forEach((track) => {
            track.stop();
            // track.enabled = false;
        });
        elemDisplay(remoteVideoStream, false);
    } else {
        if (remoteVideoAvatarImage) elemDisplay(remoteVideoAvatarImage, false);
    }
}

/**
 * Set my Audio off and Popup the peer name that performed this action
 * @param {string} peer_name peer name
 */
function setMyAudioOff(peer_name) {
    if (myAudioStatus === false || !useAudio) return;
    localAudioMediaStream.getAudioTracks()[0].enabled = false;
    myAudioStatus = localAudioMediaStream.getAudioTracks()[0].enabled;
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
    localAudioMediaStream.getAudioTracks()[0].enabled = true;
    myAudioStatus = localAudioMediaStream.getAudioTracks()[0].enabled;
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
    localVideoMediaStream.getVideoTracks()[0].enabled = false;
    myVideoStatus = localVideoMediaStream.getVideoTracks()[0].enabled;
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
    if (!thereArePeerConnections()) {
        return userLog('info', 'No participants detected');
    }
    Swal.fire({
        background: swBg,
        position: 'center',
        imageUrl: element == 'audio' ? images.audioOff : images.videoOff,
        title: element == 'audio' ? 'Mute everyone except yourself?' : 'Hide everyone except yourself?',
        text:
            element == 'audio'
                ? "Once muted, you won't be able to unmute them, but they can unmute themselves at any time."
                : "Once hided, you won't be able to unhide them, but they can unhide themselves at any time.",
        showDenyButton: true,
        confirmButtonText: element == 'audio' ? `Mute` : `Hide`,
        denyButtonText: `Cancel`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
                default:
                    break;
            }
        }
    });
}

/**
 * Eject all participants in the room expect yourself
 */
function ejectEveryone() {
    if (!thereArePeerConnections()) {
        return userLog('info', 'No participants detected');
    }
    Swal.fire({
        background: swBg,
        imageUrl: images.leave,
        position: 'center',
        title: 'Eject everyone except yourself?',
        text: 'Are you sure to want eject all participants from the room?',
        showDenyButton: true,
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
    if (!thereArePeerConnections()) {
        return userLog('info', 'No participants detected');
    }
    Swal.fire({
        background: swBg,
        position: 'center',
        imageUrl: element == 'audio' ? images.audioOff : images.videoOff,
        title: element == 'audio' ? 'Mute this participant?' : 'Hide this participant?',
        text:
            element == 'audio'
                ? "Once muted, you won't be able to unmute them, but they can unmute themselves at any time."
                : "Once hided, you won't be able to unhide them, but they can unhide themselves at any time.",
        showDenyButton: true,
        confirmButtonText: element == 'audio' ? `Mute` : `Hide`,
        denyButtonText: `Cancel`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
                default:
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
                    background: swBg,
                    imageUrl: images.locked,
                    input: 'text',
                    inputPlaceholder: 'Set Room password',
                    confirmButtonText: `OK`,
                    denyButtonText: `Cancel`,
                    showClass: { popup: 'animate__animated animate__fadeInDown' },
                    hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
            default:
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
        default:
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
        background: swBg,
        position: 'center',
        imageUrl: images.locked,
        title: 'Oops, Wrong Room Password',
        text: 'The room is locked, try with another one.',
        showDenyButton: false,
        confirmButtonText: `Ok`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
        background: swBg,
        imageUrl: images.locked,
        title: 'Oops, Room is Locked',
        input: 'text',
        inputPlaceholder: 'Enter the Room password',
        confirmButtonText: `OK`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
    thereArePeerConnections() ? whiteboardAction(getWhiteboardAction('toggle')) : toggleWhiteboard();
}

/**
 * Toggle Lock/Unlock whiteboard
 */
function toggleLockUnlockWhiteboard() {
    wbIsLock = !wbIsLock;

    const btnToShow = wbIsLock ? whiteboardUnlockBtn : whiteboardLockBtn;
    const btnToHide = wbIsLock ? whiteboardLockBtn : whiteboardUnlockBtn;
    const btnColor = wbIsLock ? 'red' : 'white';
    const action = wbIsLock ? 'lock' : 'unlock';

    elemDisplay(btnToShow, true, 'flex');
    elemDisplay(btnToHide, false);
    setColor(whiteboardUnlockBtn, btnColor);

    whiteboardAction(getWhiteboardAction(action));

    if (wbIsLock) {
        userLog('toast', 'The whiteboard is locked. \n The participants cannot interact with it.');
        playSound('locked');
    }
}

/**
 * Whiteboard: Show-Hide
 */
function toggleWhiteboard() {
    if (!wbIsOpen) {
        playSound('newMessage');
        setTippy(whiteboardBtn, 'Close the Whiteboard', placement);
    } else {
        setTippy(whiteboardBtn, 'Open the Whiteboard', placement);
    }

    whiteboard.classList.toggle('show');
    whiteboard.style.top = '50%';
    whiteboard.style.left = '50%';
    wbIsOpen = !wbIsOpen;
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
    const optimalSize = [wbWidth, wbHeight];
    const scaleFactorX = window.innerWidth / optimalSize[0];
    const scaleFactorY = window.innerHeight / optimalSize[1];
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
    setSP('--wb-width', w);
    setSP('--wb-height', h);
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
                background: swBg,
                title: 'Image URL',
                input: 'text',
                showCancelButton: true,
                confirmButtonText: 'OK',
                showClass: { popup: 'animate__animated animate__fadeInDown' },
                hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
            setupFileSelection('Select the image', wbImageInput, renderImageToCanvas);
            break;
        case 'pdfFile':
            setupFileSelection('Select the PDF', wbPdfInput, renderPdfToCanvas);
            break;
        case 'text':
            const text = new fabric.IText('Lorem Ipsum', {
                top: 0,
                left: 0,
                fontFamily: 'Montserrat',
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
 * Setup Canvas file selections
 * @param {string} title
 * @param {string} accept
 * @param {object} renderToCanvas
 */
function setupFileSelection(title, accept, renderToCanvas) {
    Swal.fire({
        allowOutsideClick: false,
        background: swBg,
        position: 'center',
        title: title,
        input: 'file',
        html: `
        <div id="dropArea">
            <p>Drag and drop your file here</p>
        </div>
        `,
        inputAttributes: {
            accept: accept,
            'aria-label': title,
        },
        didOpen: () => {
            const dropArea = document.getElementById('dropArea');
            dropArea.addEventListener('dragenter', handleDragEnter);
            dropArea.addEventListener('dragover', handleDragOver);
            dropArea.addEventListener('dragleave', handleDragLeave);
            dropArea.addEventListener('drop', handleDrop);
        },
        showDenyButton: true,
        confirmButtonText: `OK`,
        denyButtonText: `Cancel`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.isConfirmed) {
            renderToCanvas(result.value);
        }
    });

    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.style.background = 'var(--body-bg)';
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.style.background = '';
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
        e.target.style.background = '';
    }

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            console.log('Selected file:', file);
            Swal.close();
            renderToCanvas(file);
        }
    }
}

/**
 * Render Image file to Canvas
 * @param {object} wbCanvasImg
 */
function renderImageToCanvas(wbCanvasImg) {
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
    }
}

/**
 * Render PDF file to Canvas
 * @param {object} wbCanvasPdf
 */
async function renderPdfToCanvas(wbCanvasPdf) {
    if (wbCanvasPdf && wbCanvasPdf.size > 0) {
        let reader = new FileReader();
        reader.onload = async function (event) {
            wbCanvas.requestRenderAll();
            await pdfToImage(event.target.result, wbCanvas);
            whiteboardIsDrawingMode(false);
            wbCanvasToJson();
        };
        reader.readAsDataURL(wbCanvasPdf);
    }
}

/**
 * Promisify the FileReader
 * @param {object} blob
 * @returns object Data URL
 */
function readBlob(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result));
        reader.addEventListener('error', reject);
        reader.readAsDataURL(blob);
    });
}

/**
 * Load PDF and return an array of canvases
 * @param {object} pdfData
 * @param {object} pages
 * @returns canvas object
 */
async function loadPDF(pdfData, pages) {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfData = pdfData instanceof Blob ? await readBlob(pdfData) : pdfData;
    const data = atob(pdfData.startsWith(Base64Prefix) ? pdfData.substring(Base64Prefix.length) : pdfData);
    try {
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const numPages = pdf.numPages;
        const canvases = await Promise.all(
            Array.from({ length: numPages }, (_, i) => {
                const pageNumber = i + 1;
                if (pages && pages.indexOf(pageNumber) === -1) return null;
                return pdf.getPage(pageNumber).then(async (page) => {
                    const viewport = page.getViewport({ scale: window.devicePixelRatio });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                    };
                    await page.render(renderContext).promise;
                    return canvas;
                });
            }),
        );
        return canvases.filter((canvas) => canvas !== null);
    } catch (error) {
        console.error('Error loading PDF:', error);
        throw error;
    }
}

/**
 * Convert PDF to fabric.js images and add to canvas
 * @param {object} pdfData
 * @param {object} canvas
 */
async function pdfToImage(pdfData, canvas) {
    const scale = 1 / window.devicePixelRatio;
    try {
        const canvases = await loadPDF(pdfData);
        canvases.forEach(async (c) => {
            canvas.add(
                new fabric.Image(await c, {
                    scaleX: scale,
                    scaleY: scale,
                }),
            );
        });
    } catch (error) {
        console.error('Error converting PDF to images:', error);
        throw error;
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
    setSP('--wb-bg', color);
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
    elemDisplay(a, false);
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
    if (!isPresenter && wbIsLock) return;
    if (thereArePeerConnections()) {
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
    if (wbIsOpen && thereArePeerConnections()) {
        wbCanvasToJson();
        whiteboardAction(getWhiteboardAction(wbIsLock ? 'lock' : 'unlock'));
    }
}

/**
 * Whiteboard: json to canvas objects
 * @param {object} config data
 */
function handleJsonToWbCanvas(config) {
    if (!wbIsOpen) toggleWhiteboard();

    wbCanvas.loadFromJSON(config.wbCanvasJson);
    wbCanvas.renderAll();

    if (!isPresenter && !wbCanvas.isDrawingMode && wbIsLock) {
        wbDrawing(false);
    }
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
        background: swBg,
        imageUrl: images.delete,
        position: 'center',
        title: 'Clean the board',
        text: 'Are you sure you want to clean the board?',
        showDenyButton: true,
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
    if (thereArePeerConnections()) {
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
        case 'lock':
            if (!isPresenter) {
                elemDisplay(whiteboardTitle, false);
                elemDisplay(whiteboardOptions, false);
                elemDisplay(whiteboardBtn, false);
                wbDrawing(false);
                wbIsLock = true;
            }
            break;
        case 'unlock':
            if (!isPresenter) {
                elemDisplay(whiteboardTitle, true, 'flex');
                elemDisplay(whiteboardOptions, true, 'inline');
                elemDisplay(whiteboardBtn, true);
                wbDrawing(true);
                wbIsLock = false;
            }
            break;
        //...
        default:
            break;
    }
}

/**
 * Toggle whiteboard drawing mode
 * @param {boolean} status
 */
function wbDrawing(status) {
    wbCanvas.isDrawingMode = status; // Disable free drawing
    wbCanvas.selection = status; // Disable object selection
    wbCanvas.forEachObject(function (obj) {
        obj.selectable = status; // Make all objects unselectable
    });
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
        elemDisplay(receiveFileDiv, false);
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

    elemDisplay(sendFileDiv, true);
    sendProgress.max = fileToSend.size;
    fileReader = new FileReader();
    let offset = 0;

    fileReader.addEventListener('error', (err) => console.error('fileReader error', err));
    fileReader.addEventListener('abort', (e) => console.log('fileReader aborted', e));
    fileReader.addEventListener('load', (e) => {
        if (!sendInProgress) return;

        // peer to peer over DataChannels
        const data = {
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
            elemDisplay(sendFileDiv, false);
            userLog('success', 'The file ' + fileToSend.name + ' was sent successfully.');
        }

        if (offset < fileToSend.size) readSlice(offset);
    });
    const readSlice = (o) => {
        for (const peer_id in fileDataChannels) {
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
    const broadcast = data.broadcast;
    const peer_id_to_send = data.peer_id;
    if (broadcast) {
        // send to all peers
        for (const peer_id in fileDataChannels) {
            if (fileDataChannels[peer_id].readyState === 'open') fileDataChannels[peer_id].send(data.fileData);
        }
    } else {
        // send to peer
        for (const peer_id in fileDataChannels) {
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
        elemDisplay(sendFileDiv, false);
        sendInProgress = false;
        sendToServer('fileAbort', {
            room_id: roomId,
            peer_name: myPeerName,
        });
    }
}

/**
 * Abort file transfer
 */
function abortReceiveFileTransfer() {
    sendToServer('fileReceiveAbort', {
        room_id: roomId,
        peer_name: myPeerName,
    });
}

/**
 * Handle abort file transfer
 * @param object config - peer info that abort the file transfer
 */
function handleAbortFileTransfer(config) {
    console.log(`File transfer aborted by ${config.peer_name}`);
    userLog('toast', `⚠️ File transfer aborted by ${config.peer_name}`);
    abortFileTransfer();
}

/**
 * File Transfer aborted by peer
 */
function handleFileAbort() {
    receiveBuffer = [];
    incomingFileData = [];
    receivedSize = 0;
    receiveInProgress = false;
    elemDisplay(receiveFileDiv, false);
    console.log('File transfer aborted');
    userLog('toast', '⚠️ File transfer aborted');
}

/**
 * Hide incoming file transfer
 */
function hideFileTransfer() {
    elemDisplay(receiveFileDiv, false);
}

/**
 * Select or Drag and Drop the File to Share
 * @param {string} peer_id
 * @param {boolean} broadcast send to all (default false)
 */
function selectFileToShare(peer_id, broadcast = false) {
    playSound('newMessage');

    Swal.fire({
        allowOutsideClick: false,
        background: swBg,
        imageAlt: 'mirotalk-file-sharing',
        imageUrl: images.share,
        position: 'center',
        title: 'Share file',
        input: 'file',
        html: `
        <div id="dropArea">
            <p>Drag and drop your file here</p>
        </div>
        `,
        inputAttributes: {
            accept: fileSharingInput,
            'aria-label': 'Select file',
        },
        didOpen: () => {
            const dropArea = getId('dropArea');
            dropArea.addEventListener('dragenter', handleDragEnter);
            dropArea.addEventListener('dragover', handleDragOver);
            dropArea.addEventListener('dragleave', handleDragLeave);
            dropArea.addEventListener('drop', handleDrop);
        },
        showDenyButton: true,
        confirmButtonText: `Send`,
        denyButtonText: `Cancel`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.isConfirmed) {
            sendFileInformations(result.value, peer_id, broadcast);
        }
    });

    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.style.background = 'var(--body-bg)';
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.style.background = '';
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
        e.target.style.background = '';
    }

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            console.log('Selected file:', file);
            Swal.close();
            sendFileInformations(file, peer_id, broadcast);
        }
    }
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
        if (!thereArePeerConnections()) {
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
    elemDisplay(receiveFileDiv, true);
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
                background: swBg,
                position: 'center',
                title: 'Received file',
                text: incomingFileInfo.file.fileName + ' size ' + bytesToSize(incomingFileInfo.file.fileSize),
                imageUrl: e.target.result,
                imageAlt: 'mirotalk-file-img-download',
                showDenyButton: true,
                confirmButtonText: `Save`,
                denyButtonText: `Cancel`,
                showClass: { popup: 'animate__animated animate__fadeInDown' },
                hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
            background: swBg,
            imageAlt: 'mirotalk-file-download',
            imageUrl: images.share,
            position: 'center',
            title: 'Received file',
            text: incomingFileInfo.file.fileName + ' size ' + bytesToSize(incomingFileInfo.file.fileSize),
            showDenyButton: true,
            confirmButtonText: `Save`,
            denyButtonText: `Cancel`,
            showClass: { popup: 'animate__animated animate__fadeInDown' },
            hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
    elemDisplay(a, false);
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
        background: swBg,
        position: 'center',
        imageUrl: images.vaShare,
        title: 'Share a Video or Audio',
        text: 'Paste a Video or audio URL',
        input: 'text',
        showCancelButton: true,
        confirmButtonText: `Share`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.value) {
            result.value = filterXSS(result.value);
            if (!thereArePeerConnections()) {
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

    // Take URL from clipboard ex:
    // https://www.youtube.com/watch?v=1ZYbU82GVz4

    navigator.clipboard
        .readText()
        .then((clipboardText) => {
            if (!clipboardText) return false;
            const sanitizedText = filterXSS(clipboardText);
            const inputElement = Swal.getInput();
            if (isVideoTypeSupported(sanitizedText) && inputElement) {
                inputElement.value = sanitizedText;
            }
            return false;
        })
        .catch(() => {
            return false;
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
            elemDisplay(videoUrlCont, true, 'flex');
            isVideoUrlPlayerOpen = true;
        } else {
            playSound('newMessage');
            console.log('Load element type: Video');
            elemDisplay(videoAudioUrlCont, true, 'flex');
            videoAudioUrlElement.setAttribute('src', videoSrc);
            videoAudioUrlElement.type = videoType;
            if (videoAudioUrlElement.type == 'video/mp3') {
                videoAudioUrlElement.poster = images.audioGif;
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
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
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
    elemDisplay(videoUrlCont, false);
    elemDisplay(videoAudioUrlCont, false);
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
        default:
            break;
    }
}

/**
 * Handle peer kick out event button
 * @param {string} peer_id socket.id
 */
function handlePeerKickOutBtn(peer_id) {
    if (!buttons.remote.showKickOutBtn) return;
    const peerKickOutBtn = getId(peer_id + '_kickOut');
    peerKickOutBtn.addEventListener('click', (e) => {
        isPresenter
            ? kickOut(peer_id)
            : msgPopup('warning', 'Only the presenter can eject participants', 'top-end', 4000);
    });
}

/**
 * Eject peer, confirm before
 * @param {string} peer_id socket.id
 */
function kickOut(peer_id) {
    const pName = getId(peer_id + '_name').innerText;

    Swal.fire({
        background: swBg,
        position: 'center',
        imageUrl: images.confirmation,
        title: 'Kick out ' + pName,
        text: 'Are you sure you want to kick out this participant?',
        showDenyButton: true,
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
        background: swBg,
        position: 'center',
        imageUrl: images.leave,
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
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
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
        background: swBg,
        position: 'center',
        title: '<strong>WebRTC P2P v1.3.93</strong>',
        imageAlt: 'mirotalk-about',
        imageUrl: images.about,
        customClass: { image: 'img-about' },
        html: `
        <br/>
        <div id="about">
            <button 
                id="support-button" 
                data-umami-event="Support button" 
                onclick="window.open('https://codecanyon.net/user/miroslavpejic85')">
                <i class="${className.heart}" ></i>&nbsp;Support
            </button>
            <br /><br /><br />
            Author:<a 
                id="linkedin-button" 
                data-umami-event="Linkedin button" 
                href="https://www.linkedin.com/in/miroslav-pejic-976a07101/" target="_blank"> 
                Miroslav Pejic
            </a>
            <br /><br />
            Email:<a 
                id="email-button" 
                data-umami-event="Email button" 
                href="mailto:miroslav.pejic.85@gmail.com?subject=MiroTalk P2P info"> 
                miroslav.pejic.85@gmail.com
            </a>
            <br /><br />
            <hr />
            <span>&copy; 2024 MiroTalk P2P, all rights reserved</span>
            <hr />
        </div>
        `,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    });
}

/**
 * Leave the Room and create a new one
 */
function leaveRoom() {
    checkRecording();
    if (surveyActive) {
        leaveFeedback();
    } else {
        redirectOnLeave();
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
        background: swBg,
        imageUrl: images.feedback,
        title: 'Leave a feedback',
        text: 'Do you want to rate your MiroTalk experience?',
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.isConfirmed) {
            openURL(surveyURL);
        } else {
            redirectOnLeave();
        }
    });
}

function redirectOnLeave() {
    redirectActive ? openURL(redirectURL) : openURL('/newcall');
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
 * Make Obj Undraggable
 * @param {object} elmnt father element
 * @param {object} dragObj children element to make father undraggable
 */
function undragElement(elmnt, dragObj) {
    if (dragObj) {
        dragObj.onmousedown = null;
    } else {
        elmnt.onmousedown = null;
    }
    elmnt.style.top = '';
    elmnt.style.left = '';
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
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

/**
 * Handle peer audio volume
 * @param {object} data peer audio
 */
function handlePeerVolume(data) {
    const { peer_id, volume } = data;

    let audioColorTmp = '#19bb5c';
    if ([50, 60, 70].includes(volume)) audioColorTmp = '#FFA500'; // Orange
    if ([80, 90, 100].includes(volume)) audioColorTmp = '#FF0000'; // Red

    if (!isAudioPitchBar) {
        const remotePeerAvatarImg = getId(peer_id + '_avatar');
        if (remotePeerAvatarImg) {
            applyBoxShadowEffect(remotePeerAvatarImg, audioColorTmp, 100);
        }
        const remotePeerVideo = getId(peer_id + '___video');
        if (remotePeerVideo && remotePeerVideo.classList.contains('videoCircle')) {
            applyBoxShadowEffect(remotePeerVideo, audioColorTmp, 100);
        }
        return;
    }

    const remotePitchBar = getId(peer_id + '_pitch_bar');
    //let remoteVideoWrap = getId(peer_id + '_videoWrap');
    if (!remotePitchBar) return;
    remotePitchBar.style.backgroundColor = audioColorTmp;
    remotePitchBar.style.height = volume + '%';
    //remoteVideoWrap.classList.toggle('speaking');
    setTimeout(function () {
        remotePitchBar.style.backgroundColor = '#19bb5c';
        remotePitchBar.style.height = '0%';
        //remoteVideoWrap.classList.toggle('speaking');
    }, 100);
}

/**
 * Handle my audio volume
 * @param {object} data my audio
 */
function handleMyVolume(data) {
    const { volume } = data;

    let audioColorTmp = '#19bb5c';
    if ([50, 60, 70].includes(volume)) audioColorTmp = '#FFA500'; // Orange
    if ([80, 90, 100].includes(volume)) audioColorTmp = '#FF0000'; // Red

    if (!isAudioPitchBar || !myPitchBar) {
        const localPeerAvatarImg = getId('myVideoAvatarImage');
        if (localPeerAvatarImg) {
            applyBoxShadowEffect(localPeerAvatarImg, audioColorTmp, 100);
        }
        if (myVideo && myVideo.classList.contains('videoCircle')) {
            applyBoxShadowEffect(myVideo, audioColorTmp, 100);
        }
        return;
    }
    myPitchBar.style.backgroundColor = audioColorTmp;
    myPitchBar.style.height = volume + '%';
    //myVideoWrap.classList.toggle('speaking');
    setTimeout(function () {
        myPitchBar.style.backgroundColor = '#19bb5c';
        myPitchBar.style.height = '0%';
        //myVideoWrap.classList.toggle('speaking');
    }, 100);
}

/**
 * Apply Box Shadow effect to element
 * @param {object} element
 * @param {string} color
 * @param {integer} delay ms
 */
function applyBoxShadowEffect(element, color, delay = 200) {
    if (element) {
        element.style.boxShadow = `0 0 20px ${color}`;
        setTimeout(() => {
            element.style.boxShadow = 'none';
        }, delay);
    }
}

/**
 * Basic user logging using https://sweetalert2.github.io & https://animate.style/
 * @param {string} type of popup
 * @param {string} message to popup
 * @param {integer} timer toast duration ms
 */
function userLog(type, message, timer = 3000) {
    switch (type) {
        case 'warning':
        case 'error':
            Swal.fire({
                background: swBg,
                position: 'center',
                icon: type,
                title: type,
                text: message,
                showClass: { popup: 'animate__animated animate__fadeInDown' },
                hideClass: { popup: 'animate__animated animate__fadeOutUp' },
            });
            playSound('alert');
            break;
        case 'info':
        case 'success':
            Swal.fire({
                background: swBg,
                position: 'center',
                icon: type,
                title: type,
                text: message,
                showClass: { popup: 'animate__animated animate__fadeInDown' },
                hideClass: { popup: 'animate__animated animate__fadeOutUp' },
            });
            break;
        case 'success-html':
            Swal.fire({
                background: swBg,
                position: 'center',
                icon: 'success',
                title: 'Success',
                html: message,
                showClass: { popup: 'animate__animated animate__fadeInDown' },
                hideClass: { popup: 'animate__animated animate__fadeOutUp' },
            });
            break;
        case 'toast':
            const Toast = Swal.mixin({
                background: swBg,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: timer,
                timerProgressBar: true,
            });
            Toast.fire({
                icon: 'info',
                html: message,
                showClass: { popup: 'animate__animated animate__fadeInDown' },
                hideClass: { popup: 'animate__animated animate__fadeOutUp' },
            });
            break;
        // ......
        default:
            alert(message);
            break;
    }
}

/**
 * Popup Toast message
 * @param {string} icon info, success, alert, warning
 * @param {string} title message title
 * @param {string} html message in html format
 * @param {string} position message position
 * @param {integer} duration time popup in ms
 */
function toastMessage(icon, title, html, position = 'top-end', duration = 3000) {
    const Toast = Swal.mixin({
        background: swBg,
        position: position,
        icon: icon,
        showConfirmButton: false,
        timerProgressBar: true,
        toast: true,
        timer: duration,
    });
    Toast.fire({
        title: title,
        html: html,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    });
}

/**
 * Popup html message
 * @param {string} icon info, success, alert, warning
 * @param {string} imageUrl image path
 * @param {string} title message title
 * @param {string} html message in html format
 * @param {string} position message position
 * @param {string} redirectURL if set on press ok will be redirected to the URL
 */
function msgHTML(icon, imageUrl, title, html, position = 'center', redirectURL = false) {
    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: swBg,
        position: position,
        icon: icon,
        imageUrl: imageUrl,
        title: title,
        html: html,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.isConfirmed && redirectURL) {
            openURL(redirectURL);
        }
    });
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
        background: swBg,
        toast: true,
        position: position,
        showConfirmButton: false,
        timer: timer,
        timerProgressBar: true,
    });
    Toast.fire({
        icon: icon,
        title: message,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    });
}

/**
 * https://notificationsounds.com/notification-sounds
 * @param {string} name audio to play
 * @param {boolean} force audio
 */
async function playSound(name, force = false) {
    if (!notifyBySound && !force) return;
    const sound = '../sounds/' + name + '.mp3';
    const audioToPlay = new Audio(sound);
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
    const elements = getEcN(className);
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
 * Get all element descendants of node
 * @param {string} selectors
 * @returns all element descendants of node that match selectors.
 */
function getQsA(selectors) {
    return document.querySelectorAll(selectors);
}

/**
 * Get element by selector
 * @param {string} selector
 * @returns element
 */
function getQs(selector) {
    return document.querySelector(selector);
}

/**
 * Set document style property
 * @param {string} key
 * @param {string} value
 * @returns {objects} element
 */
function setSP(key, value) {
    return document.documentElement.style.setProperty(key, value);
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
 * Get ALL Html elements by selector
 * @param {string} selector of the element
 * @returns {object} element
 */
function getSlALL(selector) {
    return document.querySelectorAll(selector);
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
function elemDisplay(element, display, mode = 'inline') {
    element.style.display = display ? mode : 'none';
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

/**
 * Sleep in ms
 * @param {integer} ms milleseconds
 * @returns Promise
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
