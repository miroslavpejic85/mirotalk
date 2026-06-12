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
 * @version 1.8.62
 *
 */

'use strict';

// https://www.w3schools.com/js/js_strict.asp

// This room
const myRoomId = getId('myRoomId');
const roomSessionDuration = getRoomDuration();
const roomId = getRoomId();
const myRoomUrl = window.location.origin + '/join/' + roomId; // share room url

// Images
const images = {
    caption: '../images/caption.png',
    chatgpt: '../images/chatgpt.png',
    confirmation: '../images/image-placeholder.png',
    share: '../images/share.png',
    locked: '../images/locked.png',
    videoOff: '../images/cam-off.png',
    audioOff: '../images/audio-off.png',
    audioGif: '../images/audio.gif',
    screenOff: '../images/screen-off.png',
    delete: '../images/delete.png',
    message: '../images/message.png',
    leave: '../images/leave-room.png',
    vaShare: '../images/va-share.png',
    about: '../images/mirotalk-logo.gif',
    feedback: '../images/feedback.png',
    forbidden: '../images/forbidden.png',
    avatar: '../images/mirotalk-logo.png',
    recording: '../images/recording.png',
    poster: '../images/loader.gif',
    geoLocation: '../images/geolocation.png',
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
    geoLocation: 'fas fa-location-dot',
    shareFile: 'fas fa-upload',
    shareVideoAudio: 'fab fa-youtube',
    kickOut: 'fas fa-sign-out-alt',
    chatOn: 'fas fa-comment',
    chatOff: 'fas fa-comment',
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
    close: '<i class="fas fa-times"></i>',
    infoBrowser: '<i class="fa-solid fa-globe"></i>',
    infoCpu: '<i class="fa-solid fa-microchip"></i>',
    infoDevice: '<i class="fa-solid fa-laptop"></i>',
    infoEngine: '<i class="fa-solid fa-gear"></i>',
    infoOs: '<i class="fa-solid fa-layer-group"></i>',
    infoDefault: '<i class="fa-solid fa-circle-info"></i>',
};

// Whiteboard and fileSharing
const fileSharingInput = '*'; // allow all file extensions
const Base64Prefix = 'data:application/pdf;base64,';
const wbPdfInput = 'application/pdf';
const wbImageInput = 'image/*';

// Reference dimensions for whiteboard (16:9 aspect ratio)
const wbReferenceWidth = 1920;
const wbReferenceHeight = 1080;

// Peer infos
const extraInfo = getId('extraInfo');
const isWebRTCSupported = checkWebRTCSupported();
const userAgent = navigator.userAgent;
const parser = new UAParser(userAgent);
const parserResult = parser.getResult();
const deviceType = parserResult.device.type || 'desktop';
const isMobileDevice = deviceType === 'mobile';
const isMobileSafari = isMobileDevice && parserResult.browser.name.toLowerCase().includes('safari');
const isTabletDevice = deviceType === 'tablet';
const isIPadDevice = parserResult.device.model?.toLowerCase() === 'ipad';
const isDesktopDevice = deviceType === 'desktop';
const osName = parserResult.os.name;
const osVersion = parserResult.os.version;
const browserName = parserResult.browser.name;
const browserVersion = parserResult.browser.version;
const isFirefox = browserName.toLowerCase().includes('firefox');
const peerInfo = getPeerInfo();
const thisInfo = getInfo();

// Local Storage class
const lS = new LocalStorage();
const localStorageSettings = lS.getObjectLocalStorage('P2P_SETTINGS');
const lsSettings = { ...lS.P2P_SETTINGS, ...(localStorageSettings || {}) };
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

// Share Room QR popup
const qrRoomPopupContainer = getId('qrRoomPopupContainer');

// Init audio-video
const initUser = getId('initUser');
const initVideoContainer = getQs('.init-video-container');
const initVideo = getId('initVideo');
const initVideoBtn = getId('initVideoBtn');
const initAudioBtn = getId('initAudioBtn');
const initScreenShareBtn = getId('initScreenShareBtn');
const initVideoMirrorBtn = getId('initVideoMirrorBtn');
const initUsernameEmojiButton = getId('initUsernameEmojiButton');
const initExitBtn = getId('initExitBtn');
const initVideoSelect = getId('initVideoSelect');
const initMicrophoneSelect = getId('initMicrophoneSelect');
const initSpeakerSelect = getId('initSpeakerSelect');
const usernameEmoji = getId('usernameEmoji');

// Buttons bar
const shareRoomBtn = getId('shareRoomBtn');
const recordStreamBtn = getId('recordStreamBtn');
const fullScreenBtn = getId('fullScreenBtn');
const chatRoomBtn = getId('chatRoomBtn');
const participantsBtn = getId('participantsBtn');
const participantsCountBadge = getId('participantsCountBadge');
const captionBtn = getId('captionBtn');
const roomEmojiPickerBtn = getId('roomEmojiPickerBtn');
const whiteboardBtn = getId('whiteboardBtn');
const snapshotRoomBtn = getId('snapshotRoomBtn');
const fileShareBtn = getId('fileShareBtn');
const documentPiPBtn = getId('documentPiPBtn');
const aboutBtn = getId('aboutBtn');

// Buttons bottom
const bottomButtons = getId('bottomButtons');
const audioBtn = getId('audioBtn');
const videoBtn = getId('videoBtn');
const videoDropdown = getId('videoDropdown');
const audioDropdown = getId('audioDropdown');
const videoToggle = getId('videoToggle');
const audioToggle = getId('audioToggle');
const videoMenu = getId('videoMenu');
const audioMenu = getId('audioMenu');
const swapCameraBtn = getId('swapCameraBtn');
const hideMeBtn = getId('hideMeBtn');
const screenShareBtn = getId('screenShareBtn');
const myHandBtn = getId('myHandBtn');
const mySettingsBtn = getId('mySettingsBtn');
const settingsSplit = getId('settingsSplit');
const settingsExtraDropdown = getId('settingsExtraDropdown');
const settingsExtraToggle = getId('settingsExtraToggle');
const settingsExtraMenu = getId('settingsExtraMenu');
const leaveRoomBtn = getId('leaveRoomBtn');

const exitDropdown = getId('exitDropdown');
const exitMenu = getId('exitMenu');
const exitLeaveBtn = getId('exitLeaveBtn');
const exitLeaveAllBtn = getId('exitLeaveAllBtn');

// Room Emoji Picker
const closeEmojiPickerContainer = getId('closeEmojiPickerContainer');
const emojiPickerContainer = getId('emojiPickerContainer');
const userEmoji = getId(`userEmoji`);

// Chat room
const msgerDraggable = getId('msgerDraggable');
const msgerHeader = getId('msgerHeader');
const msgerTogglePin = getId('msgerTogglePin');
const msgerTheme = getId('msgerTheme');
const msgerCPBtn = getId('msgerCPBtn');
const msgerDropDownMenuBtn = getId('msgerDropDownMenuBtn');
const msgerDropDownContent = getId('msgerDropDownContent');
const msgerSidebarDropDownMenuBtn = getId('msgerSidebarDropDownMenuBtn');
const msgerSidebarDropDownContent = getId('msgerSidebarDropDownContent');

const msgerClean = getId('msgerClean');
const msgerSaveBtn = getId('msgerSaveBtn');
const msgerRoomChatItem = getId('msgerRoomChatItem');
const msgerConversationTitle = getId('msgerConversationTitle');
const msgerConversationMeta = getId('msgerConversationMeta');
const msgerChat = getId('msgerChat');
const msgerEmptyNotice = getId('msgerEmptyNotice');
const msgerEmptyParticipantsNotice = getId('msgerEmptyParticipantsNotice');
const msgerMain = document.querySelector('.msger-main');
const msgerEmojiBtn = getId('msgerEmojiBtn');
const msgerMarkdownBtn = getId('msgerMarkdownBtn');
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

const CHAT_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const CHAT_GPT_PEER_ID = 'chatgpt';
const CHAT_GPT_NAME = 'ChatGPT';

const roomEmojiBurstState = {
    startedAt: 0,
    anchorX: 0,
    anchorY: 0,
    count: 0,
};

// Chat room emoji picker
const msgerEmojiPicker = getId('msgerEmojiPicker');

// Chat room connected peers
const msgerCP = getId('msgerCP');
const msgerCPChat = getId('msgerCPChat');
const msgerCPHeader = getId('msgerCPHeader');
const msgerCPCloseBtn = getId('msgerCPCloseBtn');
const msgerCPList = getId('msgerCPList');
const msgerParticipantsList = getId('msgerParticipantsList');
const searchPeerBarName = getId('searchPeerBarName');
const msgerCPDropDownMenuBtn = getId('msgerCPDropDownMenuBtn');
const msgerCPDropDownContent = getId('msgerCPDropDownContent');

renderMsgerRoomActionsDropdown(msgerCPDropDownContent);
renderMsgerRoomActionsDropdown(msgerSidebarDropDownContent, 'Desktop');

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
const captionDropDownMenuBtn = getId('captionDropDownMenuBtn');
const captionDropDownContent = getId('captionDropDownContent');
const transcriptShowOnMsgEl = getId('transcriptShowOnMsg');
const transcriptSendToAllEl = getId('transcriptSendToAll');
const captionChat = getId('captionChat');
const captionEmptyNotice = getId('captionEmptyNotice');
const captionFooter = getId('captionFooter');

// My settings
const mySettings = getId('mySettings');
const mySettingsHeader = getId('mySettingsHeader');
const mySessionTime = getId('mySessionTime'); // conference session time
const tabVideoBtn = getId('tabVideoBtn');
const tabAudioBtn = getId('tabAudioBtn');
const tabVideoShareBtn = getId('tabVideoShareBtn');
const tabRecordingBtn = getId('tabRecordingBtn');
const tabProfileBtn = getId('tabProfileBtn');
const tabShortcutsBtn = getId('tabShortcutsBtn');
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
const myProfileAvatarUploadBtn = getId('myProfileAvatarUploadBtn');
const myProfileAvatarResetBtn = getId('myProfileAvatarResetBtn');
const switchSounds = getId('switchSounds');
const switchShare = getId('switchShare');
const switchKeepButtonsVisible = getId('switchKeepButtonsVisible');
const pinChatByDefaultRow = getId('pinChatByDefaultRow');
const switchPinChatByDefault = getId('switchPinChatByDefault');
const keepAwakeButton = getId('keepAwakeButton');
const switchKeepAwake = getId('switchKeepAwake');

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
const pauseRecBtn = getId('pauseRecBtn');
const resumeRecBtn = getId('resumeRecBtn');
const recordingTime = getId('recordingTime');
const lastRecordingInfo = getId('lastRecordingInfo');
const themeSelect = getId('mirotalkTheme');
const videoObjFitSelect = getId('videoObjFitSelect');
const btnsBarSelect = getId('mainButtonsBarPosition');
const pinUnpinGridDiv = getId('pinUnpinGridDiv');
const pinVideoPositionSelect = getId('pinVideoPositionSelect');
const tabRoomPeerName = getId('tabRoomPeerName');
const tabRoomParticipants = getId('tabRoomParticipants');
const tabRoomSecurity = getId('tabRoomSecurity');
const tabEmailInvitation = getId('tabEmailInvitation');
const noiseSuppressionBtn = getId('noiseSuppressionBtn');
const isPeerPresenter = getId('isPeerPresenter');
const peersCount = getId('peersCount');
const screenFpsDiv = getId('screenFpsDiv');
const switchShortcuts = getId('switchShortcuts');

// Audio options
const micOptionsDiv = getId('micOptionsDiv');
const switchNoiseSuppression = getId('switchNoiseSuppression');
const labelNoiseSuppression = getId('labelNoiseSuppression');

// Tab Media
const shareMediaAudioVideoBtn = getId('shareMediaAudioVideoBtn');

// My whiteboard
const whiteboard = getId('whiteboard');
const whiteboardHeader = getId('whiteboardHeader');
const whiteboardTitle = getId('whiteboardTitle');
const whiteboardOptions = getId('whiteboardOptions');
const wbDrawingColorEl = getId('wbDrawingColorEl');
const whiteboardGhostButton = getId('whiteboardGhostButton');
const whiteboardGridBtn = getId('whiteboardGridBtn');
const wbBackgroundColorEl = getId('wbBackgroundColorEl');
const whiteboardPencilBtn = getId('whiteboardPencilBtn');
const whiteboardVanishingBtn = getId('whiteboardVanishingBtn');
const whiteboardObjectBtn = getId('whiteboardObjectBtn');
const whiteboardEraserBtn = getId('whiteboardEraserBtn');
const whiteboardUndoBtn = getId('whiteboardUndoBtn');
const whiteboardRedoBtn = getId('whiteboardRedoBtn');
const whiteboardDropDownMenuBtn = getId('whiteboardDropDownMenuBtn');
const whiteboardDropdownMenu = getId('whiteboardDropdownMenu');
const whiteboardImgFileBtn = getId('whiteboardImgFileBtn');
const whiteboardPdfFileBtn = getId('whiteboardPdfFileBtn');
const whiteboardImgUrlBtn = getId('whiteboardImgUrlBtn');
const whiteboardTextBtn = getId('whiteboardTextBtn');
const whiteboardStickyNoteBtn = getId('whiteboardStickyNoteBtn');
const whiteboardLineBtn = getId('whiteboardLineBtn');
const whiteboardRectBtn = getId('whiteboardRectBtn');
const whiteboardTriangleBtn = getId('whiteboardTriangleBtn');
const whiteboardCircleBtn = getId('whiteboardCircleBtn');
const whiteboardSaveBtn = getId('whiteboardSaveBtn');
const whiteboardCleanBtn = getId('whiteboardCleanBtn');
const whiteboardLockBtn = getId('whiteboardLockBtn');
const whiteboardUnlockBtn = getId('whiteboardUnlockBtn');
const whiteboardCloseBtn = getId('whiteboardCloseBtn');
const whiteboardShortcutsBtn = getId('whiteboardShortcutsBtn');
const whiteboardShortcutsContent = getId('whiteboardShortcutsContent');

// Room actions buttons
const captionEveryoneBtn = getId('captionEveryoneBtn');
const captionEveryoneStopBtn = getId('captionEveryoneStopBtn');
const muteEveryoneBtn = getId('muteEveryoneBtn');
const hideEveryoneBtn = getId('hideEveryoneBtn');
const ejectEveryoneBtn = getId('ejectEveryoneBtn');
const captionEveryoneBtnDesktop = getId('captionEveryoneBtnDesktop');
const captionEveryoneStopBtnDesktop = getId('captionEveryoneStopBtnDesktop');
const muteEveryoneBtnDesktop = getId('muteEveryoneBtnDesktop');
const hideEveryoneBtnDesktop = getId('hideEveryoneBtnDesktop');
const ejectEveryoneBtnDesktop = getId('ejectEveryoneBtnDesktop');
const activeRoomsBtn = getId('activeRoomsBtn');
const lockRoomBtn = getId('lockRoomBtn');
const unlockRoomBtn = getId('unlockRoomBtn');

// File send progress
const sendFileDiv = getId('sendFileDiv');
const sendFileDragHandle = getId('sendFileDragHandle');
const sendFilePercentage = getId('sendFilePercentage');
const sendFileInfo = getId('sendFileInfo');
const sendProgress = getId('sendProgress');
const sendAbortBtn = getId('sendAbortBtn');

// File receive progress
const receiveFileDiv = getId('receiveFileDiv');
const receiveFileDragHandle = getId('receiveFileDragHandle');
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

// Disconnect banner
const banner = getId('disconnectBanner');
const icon = getId('disconnectBannerIcon');
const title = getId('disconnectBannerTitle');
const msg = getId('disconnectBannerMsg');
const spinner = getId('disconnectBannerSpinner');
let disconnectBannerRafId = null;

//....

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

const keepCustomTheme = getId('keepCustomTheme');

const themeCustom = {
    input: getId('themeColorPicker'),
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

// Room
let thisMaxRoomParticipants = 8;

// misc
let swBg = 'rgba(0, 0, 0, 0.7)'; // swAlert background color
let isDocumentOnFullScreen = false;
let isToggleExtraBtnClicked = false;
let hasTemporaryAvatar = !!(lsSettings.peer_avatar && isValidAvatarURL(lsSettings.peer_avatar));

// peer
let myPeerId; // This socket.id
let myPeerUUID = getUUID(); // Unique peer id
let myPeerName = getPeerName();
let myPeerAvatar = getPeerAvatar();
let myToken = getPeerToken(); // peer JWT
let isPresenter = false; // True Who init the room (aka first peer joined)
let myHandStatus = false;
let myVideoStatus = false;
let myAudioStatus = false;
let myScreenStatus = false;
let isScreenEnabled = getScreenEnabled();
let notify = getNotify(); // popup room sharing on join
let chat = getChat(); // popup chat on join
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
let peerConnections = {}; // keep track of our peer connections, indexed by peer_id == socket.io id
let chatDataChannels = {}; // keep track of our peer chat data channels
let fileDataChannels = {}; // keep track of our peer file sharing data channels
let allPeers = {}; // keep track of all peers in the room, indexed by peer_id == socket.io id
let pendingIceCandidates = {}; // keep track of pending ICE candidates before the peer connection is ready, indexed by peer_id == socket.io id

let lastStats = null;

// stream
let isRNNoiseSupported = true; // Built in noise supression
let initStream; // initial webcam stream
let localVideoMediaStream; // my webcam
let localScreenMediaStream; // my screen share
let localScreenDisplayStream; // raw getDisplayMedia stream (may include audio)
let screenShareAudioContext; // AudioContext used to mix screen audio + microphone
let localAudioMediaStream; // my microphone
let noiseProcessor = null; // RNNoise audio processing
let peerScreenMediaElements = {}; // keep track of our peer <video> tags, indexed by peer_id_screen
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
let myScreen;
let myAudio;
let myVideoWrap;
let myVideoAvatarImage;
let myPrivacyBtn;
let myVideoPinBtn;
let myScreenPinBtn;
let myPitchBar;
let myVolumeTimer = null;
const peerVolumeTimers = {};
let myVideoPeerName;
let myScreenPeerName;
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
let transcriptShowOnMsg = true;
let transcriptSendToAll = true;
let isChatPinned = false;
let isCaptionPinned = false;
let isChatRoomVisible = false;
let isParticipantsVisible = false;
let isChatOpenedByParticipantsBtn = false;
let isOpeningParticipants = false;
let isCaptionBoxVisible = false;
let isChatEmojiVisible = false;
let isChatMarkdownOn = false;
let isChatPasteTxt = false;
let pinChatByDefault = false;
let speechInMessages = false;
let isSpeechSynthesisSupported = 'speechSynthesis' in window;
let transcripts = []; // collect all the transcripts to save it later if you need
let chatMessages = []; // collect chat messages to save it later if want
let chatGPTcontext = []; // keep chatGPT messages context

let activeConversation = {
    type: 'public',
    peerName: '',
    peerId: '',
};
let unreadMessages = {
    public: 0,
    private: {},
};
let activeMsgerParticipantDropdown = null;

// settings
let videoMaxFrameRate = 30;
let screenMaxFrameRate = 30;
let videoQualitySelectedIndex = 0; // default HD and 30fps
let videoFpsSelectedIndex = 1; // 30 fps
let screenFpsSelectedIndex = 1; // 30 fps
let isMySettingsVisible = false;
let thisRoomPassword = null;
let isRoomLocked = false;
let isKeepButtonsVisible = false;
let isAudioPitchBar = true;
let isPushToTalkActive = false;
let isSpaceDown = false;
let isShortcutsEnabled = false;
let themeCardDebounce = null;

// recording
let mediaRecorder;
let recordedBlobs;
let audioRecorder; // helpers.js
let recScreenStream; // screen media to recording
let recTimer;
let recCodecs;
let recElapsedTime;
let recStartTs = null;
let isStreamRecording = false;
let isStreamRecordingPaused = false;
let isRecScreenStream = false;

// whiteboard
let wbCanvas = null;
let wbIsLock = false;
let wbIsDrawing = false;
let wbIsOpen = false;
let wbIsRedoing = false;
let wbIsObject = false;
let wbIsEraser = false;
let wbIsPencil = false;
let wbIsVanishing = false;
let wbIsBgTransparent = false;
let wbPop = [];
let wbVanishingObjects = [];
let wbGridLines = [];
let wbGridSize = 20;
let wbStroke = '#cccccc63';
let wbGridVisible = false;
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

let needToCreateOfferByPeer = {};

// GeoLocation
const notificationService = new NotificationService({ Swal, swBg, images, playSound });
const geoService = GeoService;
let geo;

/**
 * Load GeoLocation service
 * @returns {void}
 */
function loadGeo() {
    geo = new PeerGeoLocation({
        room_id: roomId,
        peer_name: myPeerName,
        peer_id: myPeerId,
        peer_uuid: myPeerUUID,
        sendToServer,
        msgPopup,
        notificationService,
        geoService,
        openURL,
    });
}

/**
 * Load all Html elements by Id
 */
function getHtmlElementsById() {
    // My video elements
    myVideo = getId('myVideo');
    myScreen = getId('myScreen');
    myAudio = getId('myAudio');
    myVideoWrap = getId('myVideoWrap');
    myVideoAvatarImage = getId('myVideoAvatarImage');
    myPrivacyBtn = getId('myPrivacyBtn');
    myVideoPinBtn = getId('myVideoPinBtn');
    myScreenPinBtn = getId('myScreenPinBtn');
    myPitchBar = getId('myPitchBar');
    // My username, hand/video/audio status
    myVideoPeerName = getId('myVideoPeerName');
    myScreenPeerName = getId('myScreenPeerName');
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
    setTippy(initExitBtn, 'Leave meeting', 'top');

    // Main buttons
    refreshMainButtonsToolTipPlacement();
    // Chat room buttons
    setTippy(msgerClose, 'Close', 'bottom');
    setTippy(msgerTogglePin, 'Toggle chat pin', 'bottom');
    setTippy(msgerTheme, 'Ghost theme', 'bottom');
    setTippy(msgerMaxBtn, 'Maximize', 'bottom');
    setTippy(msgerMinBtn, 'Minimize', 'bottom');
    setTippy(msgerEmojiBtn, 'Emoji', 'top');
    setTippy(msgerMarkdownBtn, 'Markdown', 'top');
    setTippy(msgerShareFileBtn, 'Share file', 'top');
    setTippy(msgerCPBtn, 'Participants', 'bottom');
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
    setTippy(transcriptSendToAllEl, 'When enabled, your transcription will be sent to all participants', 'bottom');
    setTippy(speechRecognitionIcon, 'Status', 'bottom');
    setTippy(speechRecognitionStart, 'Start caption', 'top');
    setTippy(speechRecognitionStop, 'Stop caption', 'top');
    // Settings
    setTippy(mySettingsCloseBtn, 'Close', 'bottom');
    setTippy(myPeerNameSetBtn, 'Change name', 'top');
    setTippy(myRoomId, 'Room name (click to copy/share)', 'right');
    setTippy(mySessionTime, 'Session time', 'right');
    setTippy(
        switchNoiseSuppression,
        'If Active, the audio will be processed to reduce background noise, making the voice clearer',
        'right'
    );
    setTippy(
        switchPushToTalk,
        'If Active, When SpaceBar keydown the microphone will be activated, on keyup will be deactivated, like a walkie-talkie',
        'right'
    );
    setTippy(switchSounds, 'Toggle room notify sounds', 'right');
    setTippy(switchShare, "Show 'Share Room' popup on join.", 'right');
    setTippy(switchKeepButtonsVisible, 'Keep buttons always visible', 'right');
    setTippy(switchPinChatByDefault, 'Open chat pinned by default', 'right');
    setTippy(switchKeepAwake, 'Prevent the device from sleeping (if supported)', 'right');
    setTippy(recImage, 'Toggle recording', 'right');
    setTippy(networkIP, 'IP address associated with the ICE candidate', 'right');
    setTippy(
        networkHost,
        'This type of ICE candidate represents a candidate that corresponds to an interface on the local device. Host candidates are typically generated based on the local IP addresses of the device and can be used for direct peer-to-peer communication within the same network',
        'right'
    );
    setTippy(
        networkStun,
        'Server reflexive candidates are obtained by the ICE agent when it sends a request to a STUN (Session Traversal Utilities for NAT) server. These candidates reflect the public IP address and port of the client as observed by the STUN server. They are useful for traversing NATs (Network Address Translators) and establishing connectivity between peers across different networks',
        'right'
    );
    setTippy(
        networkTurn,
        'Relay candidates are obtained when communication between peers cannot be established directly due to symmetric NATs or firewall restrictions. In such cases, communication is relayed through a TURN (Traversal Using Relays around NAT) server. TURN servers act as intermediaries, relaying data between peers, allowing them to communicate even when direct connections are not possible. This is typically the fallback mechanism for establishing connectivity when direct peer-to-peer communication fails',
        'right'
    );
    // Whiteboard buttons
    setTippy(whiteboardLockBtn, 'Toggle Lock whiteboard', 'right');
    setTippy(whiteboardUnlockBtn, 'Toggle Lock whiteboard', 'right');
    setTippy(whiteboardCloseBtn, 'Close', 'bottom');
    setTippy(wbDrawingColorEl, 'Drawing color', 'bottom');
    setTippy(whiteboardGhostButton, 'Toggle transparent background', 'bottom');
    setTippy(whiteboardGridBtn, 'Toggle whiteboard grid', 'bottom');
    setTippy(wbBackgroundColorEl, 'Background color', 'bottom');
    setTippy(whiteboardPencilBtn, 'Drawing mode', 'bottom');
    setTippy(whiteboardVanishingBtn, 'Vanishing pen (disappears in 5s)', 'bottom');
    setTippy(whiteboardObjectBtn, 'Object mode', 'bottom');
    setTippy(whiteboardEraserBtn, 'Eraser mode', 'bottom');
    setTippy(whiteboardUndoBtn, 'Undo', 'bottom');
    setTippy(whiteboardRedoBtn, 'Redo', 'bottom');
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

    setTippy(audioBtn, useAudio ? 'Stop the audio (A)' : 'My audio is disabled', bottomButtonsPlacement);
    setTippy(videoBtn, useVideo ? 'Stop the video (V)' : 'My video is disabled', bottomButtonsPlacement);
    setTippy(screenShareBtn, 'Start screen sharing (S)', bottomButtonsPlacement);
    setTippy(myHandBtn, 'Raise your hand (H)', bottomButtonsPlacement);
    setTippy(chatRoomBtn, 'Open the chat (C)', bottomButtonsPlacement);
    setTippy(participantsBtn, 'Show participants', bottomButtonsPlacement);
    setTippy(mySettingsBtn, 'Open the settings (O)', bottomButtonsPlacement);
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
 * Get peer info using D
 * @returns {object} peer info
 */
function getPeerInfo() {
    return {
        isDesktopDevice: isDesktopDevice,
        isMobileDevice: isMobileDevice,
        isTabletDevice: isTabletDevice,
        isIPadDevice: isIPadDevice,
        osName: osName,
        osVersion: osVersion,
        browserName: browserName,
        browserVersion: browserVersion,
        extras: {},
    };
}

/**
 * Get Extra info
 * @returns object info
 */
function getInfo() {
    try {
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

        const sectionMeta = {
            browser: { iconMarkup: icons.infoBrowser, label: 'Browser' },
            cpu: { iconMarkup: icons.infoCpu, label: 'CPU info' },
            device: { iconMarkup: icons.infoDevice, label: 'Device' },
            engine: { iconMarkup: icons.infoEngine, label: 'Engine' },
            os: { iconMarkup: icons.infoOs, label: 'OS info' },
        };

        const rows = Object.entries(filteredResult)
            .filter(([, data]) => Object.keys(data).length > 0)
            .map(([section, data]) => {
                const { iconMarkup, label } = sectionMeta[section] || {
                    iconMarkup: icons.infoDefault,
                    label: section,
                };
                const badges = Object.entries(data)
                    .filter(([key]) => key !== 'major')
                    .map(([, val]) => `<span class="extra-info-badge">${val}</span>`)
                    .join('');
                return `
                    <div class="extra-info-row extra-info-row--${section}">
                        <div class="extra-info-label">
                            ${iconMarkup}
                            <span>${label}</span>
                        </div>
                        <div class="extra-info-values">${badges}</div>
                    </div>`;
            })
            .join('');

        extraInfo.innerHTML = renderRoomTemplate('tpl-extra-info-grid', {
            html: {
                rows,
            },
        });

        return parserResult;
    } catch (error) {
        console.error('Error parsing user agent:', error);
    }
}

/**
 * Generate random Room id if not set
 * @returns {string} Room Id
 */
function getRoomId() {
    // check if passed as params /join?room=id
    let queryRoomId = getQueryParam('room');

    // skip /join/
    let roomId = queryRoomId ? queryRoomId : window.location.pathname.split('/join/')[1];

    // if not specified room id or 'random', create one random
    if (roomId == '' || roomId === 'random') {
        roomId = makeId(20);
        // Preserve existing query params (audio, video, name, duration, notify, etc.) and set `room` as query param
        const url = new URL(window.location.href);

        // Force join route to query-based format: /join?room=...
        url.pathname = `/join`;

        // Ensure room is in query string
        url.searchParams.set('room', roomId);

        const newUrl = url.toString();
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
 * Room Session Duration
 */
function getRoomDuration() {
    const roomDuration = getQueryParam('duration');

    if (isValidDuration(roomDuration)) {
        if (roomDuration === 'unlimited') {
            console.log('The room has no time limit');
            return roomDuration;
        }
        const timeLimit = timeToMilliseconds(roomDuration);
        setTimeout(() => {
            playSound('eject');
            Swal.fire({
                background: swBg,
                position: 'center',
                title: 'Time Limit Reached',
                text: 'The room has reached its time limit and will close shortly',
                icon: 'warning',
                timer: 6000, // 6 seconds
                timerProgressBar: true,
                showConfirmButton: false,
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
                willClose: () => {
                    exitRoom();
                },
            });
        }, timeLimit);

        console.log('Direct join', { duration: roomDuration, timeLimit: timeLimit });
        return roomDuration;
    }
    return 'unlimited';
}

/**
 * Convert HH:MM:SS to milliseconds
 * @param {string} timeString Time string in HH:MM:SS format
 * @returns {integer} milliseconds
 */
function timeToMilliseconds(timeString) {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * Validate duration format
 * @param {string} duration Duration string
 * @returns {boolean} true/false
 */
function isValidDuration(duration) {
    if (duration === 'unlimited') return true;
    // Check if the format is HH:MM:SS
    const regex = /^(\d{2}):(\d{2}):(\d{2})$/;
    const match = duration.match(regex);
    if (!match) return false;
    const [hours, minutes, seconds] = match.slice(1).map(Number);
    // Validate ranges: hours, minutes, and seconds
    if (hours < 0 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        return false;
    }
    return true;
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
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
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
    let notify = getQueryParam('notify');
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
 * Check if chat is set
 * @returns {boolean} true/false
 */
function getChat() {
    let chat = getQueryParam('chat');
    if (chat) {
        let queryChat = chat === '1' || chat === 'true';
        if (queryChat != null) {
            console.log('Direct join', { chat: queryChat });
            notify = false; // From widget disable notify on join...
            return queryChat;
        }
    }
    console.log('Direct join', { chat: chat });
    return chat;
}

/**
 * Get Peer JWT
 * @returns {mixed} boolean false or token string
 */
function getPeerToken() {
    if (window.sessionStorage.peer_token) return window.sessionStorage.peer_token;
    let token = getQueryParam('token');
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
    const name = getQueryParam('name');
    if (isHtml(name)) {
        console.log('Direct join', { name: 'Invalid name' });
        return 'Invalid name';
    }

    if (name === 'random') {
        const randomName = generateRandomName();
        console.log('Direct join', { name: randomName });
        return randomName;
    }

    console.log('Direct join', { name: name });
    return name;
}

/**
 * Generate random peer name
 * @returns {string} Random Peer Name
 */
function generateRandomName() {
    const adjectives = ['Quick', 'Lazy', 'Happy', 'Sad', 'Brave', 'Clever', 'Witty', 'Calm', 'Bright', 'Charming'];
    const nouns = ['Fox', 'Dog', 'Cat', 'Mouse', 'Lion', 'Tiger', 'Bear', 'Wolf', 'Eagle', 'Shark'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000);
    return `${adjective}${noun}${number}`;
}

/**
 * Check if peer avatar is set
 * @returns {string} Peer Avatar
 */
function getPeerAvatar() {
    const avatar = getQueryParam('avatar');
    const avatarDisabled = avatar === '0' || avatar === 'false';
    const isBase64Avatar = typeof avatar === 'string' && avatar.startsWith('data:image/');

    console.log('Direct join', { avatar: avatar });

    if (avatarDisabled || isBase64Avatar || !isValidAvatarURL(avatar)) {
        const saved = lsSettings.peer_avatar;
        if (saved && isValidAvatarURL(saved)) {
            console.log('Restored avatar from localStorage', { avatar: saved });
            return saved;
        }
        return false;
    }
    return avatar;
}

/**
 * Is screen enabled on join room
 * @returns {boolean} true/false
 */
function getScreenEnabled() {
    let screen = getQueryParam('screen');
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
    let hide = getQueryParam('hide');
    let queryHideMe = false;
    if (hide) {
        hide = hide.toLowerCase();
        queryHideMe = hide === '1' || hide === 'true';
    }
    console.log('Direct join', { hide: queryHideMe });
    return queryHideMe;
}

/**
 * Get query parameter from URL
 * @param {string} param parameter name
 * @returns {string} parameter value
 */
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return filterXSS(urlParams.get(param));
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
    initCursorLightEffect();
    initClientPeer();
    initDocumentListeners();
});

/**
 * Document listeners
 */
function initDocumentListeners() {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar-dropdown')) {
            document.querySelectorAll('.navbar-dropdown-content.show').forEach((el) => el.classList.remove('show'));
        }
    });
}

/**
 * Initialize cursor light effect on video container
 */
function initCursorLightEffect() {
    if (!videoMediaContainer || !isDesktopDevice) return;
    videoMediaContainer.classList.add('mouse-light');
    videoMediaContainer.addEventListener('mousemove', function (e) {
        const rect = videoMediaContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        videoMediaContainer.style.setProperty('--mouse-x', x + '%');
        videoMediaContainer.style.setProperty('--mouse-y', y + '%');
    });
}

/**
 * On body load Get started
 */
async function initClientPeer() {
    await getThemes();
    setTheme();

    if (!isWebRTCSupported) {
        return userLog('error', 'This browser seems not supported WebRTC!');
    }

    // Check if video full screen is supported by the browser
    isVideoFullScreenSupported =
        typeof document !== 'undefined' &&
        ('fullscreenEnabled' in document ||
            'webkitFullscreenEnabled' in document ||
            'mozFullScreenEnabled' in document ||
            'msFullscreenEnabled' in document);

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
    signalingSocket.on('cmd', handleCmd);
    signalingSocket.on('message', handleMessage);
    signalingSocket.on('caption', handleCaptionActions);
    signalingSocket.on('videoPlayer', handleVideoPlayer);
    signalingSocket.on('wbCanvasToJson', handleJsonToWbCanvas);
    signalingSocket.on('whiteboardAction', handleWhiteboardAction);
    signalingSocket.on('fileInfo', handleFileInfo);
    signalingSocket.on('fileAbort', handleFileAbort);
    signalingSocket.on('fileReceiveAbort', abortFileTransfer);
    signalingSocket.on('kickOut', handleKickedOut);
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

    hideDisconnectBanner();
    myPeerId = signalingSocket.id;
    console.log('04. My peer id [ ' + myPeerId + ' ]');

    await getButtons();

    // If reconnecting, force rejoin to properly sync with other peers
    if (localVideoMediaStream && localAudioMediaStream) {
        await joinToChannel();
    } else {
        await initEnumerateDevices();
        await setupLocalVideoMedia();
        await setupLocalAudioMedia();
        // Create camera tile (even if no camera, to show avatar)
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
        handleDropdownHover();
        setupQuickDeviceSwitchDropdowns();
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

    const { peers_count, host_protected, user_auth, is_presenter, survey, redirect, maxRoomParticipants } = config;

    isHostProtected = host_protected;
    isPeerAuthEnabled = user_auth;

    // Get survey settings from server
    surveyActive = survey.active;
    surveyURL = survey.url;

    // Get redirect settings from server
    redirectActive = redirect.active;
    redirectURL = redirect.url;

    // Limit room to n peers
    if (maxRoomParticipants) thisMaxRoomParticipants = maxRoomParticipants;
    if (peers_count > thisMaxRoomParticipants) {
        return roomIsBusy();
    }

    // Let start with some basic rules
    isPresenter = is_presenter;
    console.log('New connection - presenter status from server:', isPresenter);
    isPeerPresenter.innerText = isPresenter;

    // Peer identified if presenter or not then....
    handleShortcuts();

    if (isRulesActive) {
        handleRules(isPresenter);
    }

    if (notify && peers_count == 1) {
        shareRoomMeetingURL(true);
    } else {
        checkShareScreen();
    }

    checkChatOnJoin();
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
        title: 'Ops, Unauthorized',
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
        html: renderRoomTemplate('tpl-room-busy-message', {
            text: {
                maxUsers: String(thisMaxRoomParticipants),
            },
        }),
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
        buttons.settings.showTabRoomParticipants = false;
        buttons.settings.showTabRoomSecurity = false;
        buttons.settings.showTabEmailInvitation = false;
        buttons.remote.showKickOutBtn = false;
        buttons.remote.showGeoLocationBtn = false;
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
    const showExtraBtn =
        buttons.main.showExtraBtn &&
        Array.from(settingsExtraMenu.children).filter((el) => el.style.display !== 'none').length > 0;
    if (!showExtraBtn) {
        mySettingsBtn.style.borderRadius = '10px';
    }

    // Main buttons
    displayElements([
        { element: shareRoomBtn, display: buttons.main.showShareRoomBtn },
        { element: hideMeBtn, display: buttons.main.showHideMeBtn },
        { element: fullScreenBtn, display: buttons.main.showFullScreenBtn },
        { element: settingsExtraDropdown, display: showExtraBtn },
        { element: audioBtn, display: buttons.main.showAudioBtn },
        { element: videoBtn, display: buttons.main.showVideoBtn },
        //{ element: screenShareBtn, display: buttons.main.showScreenBtn }, // auto-detected
        { element: recordStreamBtn, display: buttons.main.showRecordStreamBtn },
        { element: recImage, display: buttons.main.showRecordStreamBtn },
        { element: chatRoomBtn, display: buttons.main.showChatRoomBtn },
        { element: participantsBtn, display: buttons.main.showParticipantsBtn },
        { element: captionBtn, display: buttons.main.showCaptionRoomBtn && speechRecognition }, // auto-detected
        { element: roomEmojiPickerBtn, display: buttons.main.showRoomEmojiPickerBtn },
        { element: myHandBtn, display: buttons.main.showMyHandBtn },
        { element: whiteboardBtn, display: buttons.main.showWhiteboardBtn },
        { element: snapshotRoomBtn, display: buttons.main.showSnapshotRoomBtn && !isMobileDevice },
        { element: fileShareBtn, display: buttons.main.showFileShareBtn },
        { element: documentPiPBtn, display: showDocumentPipBtn && buttons.main.showDocumentPipBtn },
        { element: mySettingsBtn, display: buttons.main.showMySettingsBtn },
        { element: aboutBtn, display: buttons.main.showAboutBtn },
    ]);

    // Chat buttons
    displayElements([
        { element: msgerTogglePin, display: !isMobileDevice && buttons.chat.showTogglePinBtn },
        { element: msgerMaxBtn, display: !isMobileDevice && buttons.chat.showMaxBtn },
        { element: msgerSaveBtn, display: buttons.chat.showSaveMessageBtn },
        { element: msgerMarkdownBtn, display: buttons.chat.showMarkDownBtn },
        { element: msgerShareFileBtn, display: buttons.chat.showFileShareBtn },
        { element: msgerVideoUrlBtn, display: buttons.chat.showShareVideoAudioBtn },
        { element: msgerCPBtn, display: buttons.chat.showParticipantsBtn },
    ]);

    // Caption buttons
    displayElements([
        { element: captionTogglePin, display: !isMobileDevice && buttons.caption.showTogglePinBtn },
        { element: captionMaxBtn, display: !isMobileDevice && buttons.caption.showMaxBtn },
    ]);

    // Hide settings tabs when corresponding main buttons are disabled
    if (!buttons.main.showVideoBtn) {
        displayElements([
            { element: tabVideoBtn, display: false },
            { element: videoDropdown, display: false },
            { element: getId('videoSourceDiv'), display: false },
            { element: getId('videoFitDiv'), display: false },
            { element: videoFpsDiv, display: false },
        ]);
    }
    if (!buttons.main.showAudioBtn) {
        displayElements([
            { element: tabAudioBtn, display: false },
            { element: audioDropdown, display: false },
        ]);
    }

    // Settings buttons
    displayElements([
        { element: activeRoomsBtn, display: buttons.settings.showActiveRoomsBtn },
        { element: micOptionsDiv, display: buttons.settings.showMicOptionsBtn || isPresenter },
        { element: captionEveryoneBtn, display: buttons.settings.showCaptionEveryoneBtn },
        { element: muteEveryoneBtn, display: buttons.settings.showMuteEveryoneBtn },
        { element: hideEveryoneBtn, display: buttons.settings.showHideEveryoneBtn },
        { element: ejectEveryoneBtn, display: buttons.settings.showEjectEveryoneBtn },
        { element: lockRoomBtn, display: buttons.settings.showLockRoomBtn },
        { element: unlockRoomBtn, display: buttons.settings.showUnlockRoomBtn },
        { element: tabRoomPeerName, display: buttons.settings.showTabRoomPeerName },
        { element: tabRoomParticipants, display: buttons.settings.showTabRoomParticipants },
        { element: tabRoomSecurity, display: buttons.settings.showTabRoomSecurity },
        { element: tabEmailInvitation, display: buttons.settings.showTabEmailInvitation },
        { element: noiseSuppressionBtn, display: buttons.settings.customNoiseSuppression && isRNNoiseSupported },
    ]);

    // Whiteboard
    elemDisplay(
        whiteboardLockBtn,
        buttons.whiteboard.whiteboardLockBtn,
        buttons.whiteboard.whiteboardLockBtn ? 'flex' : undefined
    );
}

/**
 * Get Buttons config from server side and apply to current client
 */
async function getButtons() {
    try {
        const response = await axios.get('/buttons', {
            timeout: 5000,
        });
        const serverButtons = response.data.message;
        if (serverButtons) {
            // Merge serverButtons into BUTTONS, keeping nested keys intact by performing a deep merge
            buttons = mergeConfig(buttons || {}, serverButtons);
            console.log('AXIOS ROOM BUTTONS SETTINGS', {
                serverButtons: serverButtons,
                clientButtons: buttons,
            });
        }
    } catch (error) {
        console.error('AXIOS GET CONFIG ERROR', error.message);
    }
}

/**
 * Get Themes config from server side and merge with built-in defaults
 */
async function getThemes() {
    try {
        const response = await axios.get('/themes', {
            timeout: 5000,
        });
        const serverThemes = response.data.message;
        if (serverThemes) {
            // Deep merge each theme: server overrides take precedence
            for (const [name, vars] of Object.entries(serverThemes)) {
                themeMap[name] = themeMap[name] ? { ...themeMap[name], ...vars } : vars;
            }
            renderDynamicThemeCards();
            console.log('AXIOS ROOM THEMES SETTINGS', {
                serverThemes: serverThemes,
                clientThemes: Object.keys(themeMap),
            });
        }
    } catch (error) {
        console.error('AXIOS GET THEMES ERROR', error.message);
    }
}

/**
 * Dynamically add theme cards & dropdown options for server-defined themes
 * that are not part of the built-in defaults.
 */
function renderDynamicThemeCards() {
    const grid = getId('themeCardsGrid');
    if (!grid) return;

    const builtInThemes = new Set(Array.from(themeSelect.options).map((opt) => opt.value));

    const iconPool = [
        'fa-solid fa-wand-magic-sparkles',
        'fa-solid fa-palette',
        'fa-solid fa-paint-roller',
        'fa-solid fa-swatchbook',
        'fa-solid fa-brush',
        'fa-solid fa-eye-dropper',
        'fa-solid fa-fill-drip',
        'fa-solid fa-circle-half-stroke',
    ];
    let iconIndex = 0;

    for (const [name, vars] of Object.entries(themeMap)) {
        if (builtInThemes.has(name)) continue;

        // Add <option> to the hidden select
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        themeSelect.appendChild(option);

        const index = themeSelect.options.length - 1;

        // Pick an icon and a color from the theme's --dd-color
        const iconClass = iconPool[iconIndex % iconPool.length];
        iconIndex++;
        const iconColor = vars['--dd-color'] || '#c0c0c0';

        // Create the card
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.dataset.theme = name;
        card.dataset.index = index;
        card.innerHTML = renderRoomTemplate('tpl-theme-card-content', {
            text: {
                label: option.textContent,
            },
            attrs: {
                iconClass,
            },
        });

        // Apply dynamic icon color via inline style
        const icon = card.querySelector('i');
        icon.style.color = iconColor;

        // Set dynamic active border color
        card.style.setProperty('--dynamic-theme-color', iconColor);

        // Click handler (same logic as built-in cards)
        card.onclick = () => {
            if (card.classList.contains('disabled')) return;
            themeSelect.selectedIndex = index;
            updateThemeCardsActive();
            if (themeCardDebounce) clearTimeout(themeCardDebounce);
            themeCardDebounce = setTimeout(() => {
                themeCardDebounce = null;
                themeSelect.dispatchEvent(new Event('change'));
            }, 200);
        };

        grid.appendChild(card);
    }
}

/**
 * Deep merge two objects
 * @param {object} target target object
 * @param {object} source source object
 * @returns {object} merged object
 */
function mergeConfig(target, source) {
    if (typeof target !== 'object' || target === null) return source;
    if (typeof source !== 'object' || source === null) return source;
    const output = Array.isArray(target) ? target.slice() : { ...target };
    for (const key of Object.keys(source)) {
        const srcVal = source[key];
        const tgtVal = output[key];
        if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal)) {
            output[key] = mergeConfig(tgtVal || {}, srcVal);
        } else {
            output[key] = srcVal;
        }
    }
    return output;
}

/**
 * Get user name from OIDC profile
 * @returns {string} Peer Name
 */
async function getUserName() {
    try {
        const { data: profile } = await axios.get('/profile', { timeout: 5000 });
        if (profile && profile.name) {
            console.log('AXIOS GET OIDC Profile retrieved successfully', profile);
            window.localStorage.peer_name = profile.name;
        }
    } catch (error) {
        console.error('AXIOS OIDC Error fetching profile', error.message || error);
    }
    return window.localStorage.peer_name || '';
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
    initExitBtn.onclick = (e) => {
        initExitMeeting();
    };

    await loadLocalStorage();

    // detect low quality bluetooth headset
    detectBluetoothHeadset(true);

    if (!useVideo || !buttons.main.showVideoBtn) {
        displayElements([
            { element: getId('initVideo'), display: false },
            { element: getId('initVideoBtn'), display: false },
            { element: getId('initVideoMirrorBtn'), display: false },
            { element: getId('initVideoSelect'), display: false },
        ]);
        if (!buttons.main.showVideoBtn) {
            elemDisplay(getId('tabVideoBtn'), false);
        }
        // Disable camera settings, keep screen available
        displayElements([
            { element: getId('videoDropdown'), display: false },
            { element: getId('videoSourceDiv'), display: false },
            { element: getId('videoFitDiv'), display: false },
            { element: getId('videoFpsDiv'), display: false },
        ]);
    }
    if (!useAudio || !buttons.main.showAudioBtn) {
        displayElements([
            { element: getId('initAudioBtn'), display: false },
            { element: getId('initMicrophoneSelect'), display: false },
            { element: getId('initSpeakerSelect'), display: false },
            { element: getId('tabAudioBtn'), display: false },
            { element: getId('audioDropdown'), display: false },
        ]);
    }
    if (!buttons.main.showScreenBtn) {
        elemDisplay(getId('initScreenShareBtn'), false);
    }

    initVideoContainerShow(myVideoStatus);

    window.localStorage.peer_name = await getUserName();

    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: swBg,
        title: brand.app?.name || 'MiroTalk P2P',
        position: 'center',
        input: 'text',
        inputPlaceholder: 'Enter your email or name',
        inputAttributes: { maxlength: 254, id: 'usernameInput' },
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

            // Long email or name
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            if ((isEmail && value.length > 254) || (!isEmail && value.length > 32)) {
                return isEmail ? 'Email must be max 254 char' : 'Name must be max 32 char';
            }

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

    // Show initUser injected into Swal html
    initUser.classList.toggle('hidden');

    // select video - audio

    initVideoSelect.onchange = async () => {
        await changeInitCamera(initVideoSelect.value);
        await handleLocalCameraMirror();
        videoSelect.selectedIndex = initVideoSelect.selectedIndex;
        refreshLsDevices();
    };
    initMicrophoneSelect.onchange = async () => {
        detectBluetoothHeadset(true);
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
        html: renderRoomTemplate('tpl-username-in-use-message'),
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
    // Refresh audio — skip if the current mic already matches the stored device
    // to avoid tearing down and rebuilding the noise-suppression pipeline unnecessarily.
    if (useAudio && audioInputSelect.value) {
        const currentMicStream = noiseProcessor?.originalStream || localAudioMediaStream;
        const currentMicDeviceId = getAudioTrack(currentMicStream)?.getSettings?.()?.deviceId;
        if (currentMicDeviceId !== audioInputSelect.value) {
            await changeLocalMicrophone(audioInputSelect.value);
        }
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
 * Detects whether the camera stream is front-facing ('user') or rear-facing ('environment').
 * Defaults to 'user' (front-facing) if detection fails (e.g., desktop cameras).
 * @param {MediaStream} stream - The video stream from `getUserMedia`.
 * @returns {string} 'user' (front) or 'environment' (rear).
 */
function detectCameraFacingMode(stream) {
    if (!stream || !stream.getVideoTracks().length) {
        console.warn("No video track found in the stream. Defaulting to 'user'.");
        return 'user';
    }
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    const capabilities = videoTrack.getCapabilities?.() || {};
    // Priority: settings.facingMode (actual) → capabilities.facingMode (possible) → default 'user'
    const facingMode = settings.facingMode || capabilities.facingMode?.[0] || 'user';
    return facingMode === 'environment' ? 'environment' : 'user'; // Force valid output
}

/**
 * Change init camera by device id
 * @param {string} deviceId
 */
async function changeInitCamera(deviceId) {
    // Show the loader spinner while switching camera
    const initVideoLoader = getId('initVideoLoader');
    if (initVideoLoader) initVideoLoader.style.display = '';

    // Stop media tracks to avoid issue on mobile
    if (initStream) {
        await stopTracks(initStream);
    }
    if (localVideoMediaStream) {
        await stopVideoTracks(localVideoMediaStream);
    }

    // Get video constraints
    const videoConstraints = getVideoConstraints('default');
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
            // Detect camera
            camera = detectCameraFacingMode(camStream);
            console.log('Detect Camera facing mode', camera);
            // We going to update init video stream
            initVideo.srcObject = camStream;
            // Hide the CSS loader overlay once camera stream is attached
            const initVideoLoader = getId('initVideoLoader');
            if (initVideoLoader) initVideoLoader.style.display = 'none';
            initStream = camStream;
            const initVideoTrack = getVideoTrack(initStream);
            if (initVideoTrack) {
                console.log('Success attached init video stream', initVideoTrack.getSettings());
            }
            // We going to update also the local video stream
            myVideo.srcObject = camStream;
            localVideoMediaStream = camStream;
            const localVideoTrack = getVideoTrack(localVideoMediaStream);
            if (localVideoTrack) {
                console.log('Success attached local video stream', localVideoTrack.getSettings());
            }
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
    // Show loading spinner while switching camera
    const myVideoWrap = getId('myVideoWrap');
    const spinner = myVideoWrap ? myVideoWrap.querySelector('.video-loading-spinner') : null;
    if (spinner) elemDisplay(spinner, true, 'flex');

    if (localVideoMediaStream) {
        await stopVideoTracks(localVideoMediaStream);
    }

    // Get video constraints
    const videoConstraints = getVideoConstraints(videoQualitySelect.value ? videoQualitySelect.value : 'default');
    videoConstraints['deviceId'] = { exact: deviceId };
    console.log('videoConstraints', videoConstraints);

    await navigator.mediaDevices
        .getUserMedia({ video: videoConstraints })
        .then(async (camStream) => {
            await updateLocalVideoMediaStream(camStream);
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
                await updateLocalVideoMediaStream(camStream);
            } catch (fallbackErr) {
                console.error('Error accessing init video device with default constraints', fallbackErr);
                printError(err);
                if (spinner) elemDisplay(spinner, false);
            }
        });

    /**
     * Update Local Video Media Stream
     * @param {MediaStream} camStream
     */
    async function updateLocalVideoMediaStream(camStream) {
        if (camStream) {
            camera = detectCameraFacingMode(camStream);
            console.log('Detect Camera facing mode', camera);
            myVideo.srcObject = camStream;
            localVideoMediaStream = camStream;
            logStreamSettingsInfo('Success attached local video stream', camStream);
            await refreshMyStreamToPeers(camStream);
            setLocalMaxFps(videoMaxFrameRate);
        }
        if (spinner) elemDisplay(spinner, false);
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
    // If noise suppression is active, localAudioMediaStream may be the processed stream.
    // Stop the RNNoise pipeline first and stop the *original* microphone tracks.
    const oldMicStream = noiseProcessor?.originalStream || noiseProcessor?.mediaStream || localAudioMediaStream;

    stopNoiseSuppressionPipeline();

    if (oldMicStream) {
        await stopAudioTracks(oldMicStream);
    }

    // Get audio constraints
    const audioConstraints = getAudioConstraints(deviceId);
    console.log('audioConstraints', audioConstraints);

    await navigator.mediaDevices
        .getUserMedia(audioConstraints)
        .then(async (micStream) => {
            myAudio.srcObject = micStream;
            localAudioMediaStream = micStream;
            logStreamSettingsInfo('Success attached local microphone stream', micStream);
            getMicrophoneVolumeIndicator(micStream);

            if (lsSettings.mic_noise_suppression && buttons.settings.customNoiseSuppression) {
                const ok = await enableNoiseSuppression();
                if (!ok) {
                    await refreshMyStreamToPeers(micStream, true);
                }
            } else {
                await refreshMyStreamToPeers(micStream, true);
            }
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
    let audio = getQueryParam('audio');
    let video = getQueryParam('video');
    if (audio) {
        audio = audio.toLowerCase();
        let queryPeerAudio = useAudio && buttons.main.showAudioBtn ? audio === '1' || audio === 'true' : false;
        if (queryPeerAudio != null) handleAudio(audioBtn, false, queryPeerAudio);
        //elemDisplay(tabAudioBtn, queryPeerAudio);
        console.log('Direct join', { audio: queryPeerAudio });
    }
    if (video) {
        video = video.toLowerCase();
        let queryPeerVideo = useVideo && buttons.main.showVideoBtn ? video === '1' || video === 'true' : false;
        if (queryPeerVideo != null) handleVideo(videoBtn, false, queryPeerVideo);
        //elemDisplay(tabVideoBtn, queryPeerVideo);
        console.log('Direct join', { video: queryPeerVideo });
    }
}

/**
 * Initialize RNNoise suppression: check availability early and mark
 * the feature as unsupported when the processor class is missing or
 * the browser lacks AudioWorklet / WebAssembly.
 * Call once during startup, before any audio stream is created.
 */
async function initRNNoiseSuppression() {
    if (typeof RNNoiseProcessor === 'undefined') {
        console.warn('RNNoiseProcessor class is not available (script not loaded).');
        handleRNNoiseNotSupported();
        return;
    }

    if (!RNNoiseProcessor.isSupported()) {
        console.warn('RNNoise: AudioWorklet or WebAssembly not supported on this device, skipping.');
        handleRNNoiseNotSupported();
        return;
    }

    const supports48k = await RNNoiseProcessor.isSampleRateSupported();
    if (!supports48k) {
        console.warn('RNNoise: device does not support 48 kHz sample rate, skipping.');
        handleRNNoiseNotSupported();
        return;
    }

    // Tear down any leftover processor from a previous session / hot-reload.
    stopNoiseSuppressionPipeline();

    console.log('RNNoise suppression initialized — ready to activate.');
}

/**
 * Noise suppression not supported — hide the UI toggle and flag it.
 */
function handleRNNoiseNotSupported() {
    isRNNoiseSupported = false;
    // Uncheck the toggle so localStorage stays consistent
    if (switchNoiseSuppression) switchNoiseSuppression.checked = false;
    lsSettings.mic_noise_suppression = false;
    lS.setSettings(lsSettings);
    // Hide the custom noise suppression toggle in audio settings
    elemDisplay(noiseSuppressionBtn, false);
}

/**
 * Enable RNNoise audio processing for noise suppression.
 * Returns true on success, false on failure.
 */
async function enableNoiseSuppression() {
    if (!localAudioMediaStream || localAudioMediaStream.getAudioTracks().length === 0) {
        console.warn('enableNoiseSuppression: no local audio stream available.');
        return false;
    }

    // Guard: processor class must exist and be supported
    if (typeof RNNoiseProcessor === 'undefined' || !RNNoiseProcessor.isSupported()) {
        console.warn('RNNoise: not available or not supported on this device, skipping.');
        handleRNNoiseNotSupported();
        return false;
    }

    // Reset any existing pipeline to avoid keeping stale/ended streams.
    stopNoiseSuppressionPipeline();

    try {
        noiseProcessor = new RNNoiseProcessor();
        // Keep a reference to the raw microphone stream for safe restore.
        noiseProcessor.originalStream = localAudioMediaStream;

        const processedStream = await noiseProcessor.startProcessing(localAudioMediaStream);

        if (!processedStream || processedStream.getAudioTracks().length === 0) {
            console.warn('Noise suppression returned no usable stream, falling back to raw mic.');
            stopNoiseSuppressionPipeline();
            await refreshMyStreamToPeers(localAudioMediaStream, true);
            toastMessage(
                'warning',
                'Noise suppression is not supported on this device. Using default WebRTC noise suppression instead.'
            );
            return false;
        }

        noiseProcessor.toggleNoiseSuppression();
        localAudioMediaStream = processedStream;
        await refreshMyStreamToPeers(localAudioMediaStream, true);
        return true;
    } catch (err) {
        console.error('enableNoiseSuppression error:', err);
        stopNoiseSuppressionPipeline();
        await refreshMyStreamToPeers(localAudioMediaStream, true);
        return false;
    }
}

/**
 * Disable RNNoise audio processing for noise suppression
 */
async function disableNoiseSuppression(restoreOriginalStream = true) {
    if (noiseProcessor) {
        const originalStream = noiseProcessor.originalStream || noiseProcessor.mediaStream;
        if (restoreOriginalStream && originalStream) {
            localAudioMediaStream = originalStream;
        }
        await refreshMyStreamToPeers(localAudioMediaStream, true);
        stopNoiseSuppressionPipeline();
    } else {
        await refreshMyStreamToPeers(localAudioMediaStream, true);
    }
}

/**
 * Stop RNNoise audio processing pipeline and release all references.
 */
function stopNoiseSuppressionPipeline() {
    if (!noiseProcessor) return;
    try {
        noiseProcessor.stopProcessing();
    } catch (err) {
        console.warn('stopNoiseSuppressionPipeline: cleanup error ignored', err);
    }
    // Drop the reference to the original mic stream so it can be GC'd.
    noiseProcessor.originalStream = null;
    noiseProcessor = null;
}

/**
 * Restart noise suppression (e.g. after changing mic)
 */
async function restartNoiseSuppression() {
    if (!lsSettings.mic_noise_suppression) return;
    // Do not restore the old microphone stream when restarting.
    await disableNoiseSuppression(false);
    await enableNoiseSuppression();
}

/**
 * Room and Peer name are ok Join Channel
 */
async function whoAreYouJoin() {
    myVideoPeerName.innerText = myPeerName + ' (me)';
    setPeerAvatarImgName('myVideoAvatarImage', myPeerName, myPeerAvatar);
    setPeerAvatarImgName('myProfileAvatar', myPeerName, myPeerAvatar);
    setPeerChatAvatarImgName('right', myPeerName, myPeerAvatar);
    joinToChannel();
    handleHideMe(isHideMeActive);
    loadGeo();

    // Load screen media if needed
    await loadScreenMedia();

    // Refresh camera if screen streaming
    if (isScreenStreaming && useVideo) {
        await changeLocalCamera(videoSelect.value);
    }
    if (useAudio && localAudioMediaStream) {
        getMicrophoneVolumeIndicator(localAudioMediaStream);
    }
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
        peer_avatar: myPeerAvatar,
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
    handleBodyOnMouseMove(); // show/hide bottomButtons ...
    makeRoomPopupQR();
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
    const peer_video_status = peers[peer_id]['peer_video_status'];
    const peer_screen_status = peers[peer_id]['peer_screen_status'];

    if (peer_id in peerConnections) {
        // This could happen if the user joins multiple channels where the other peer is also in.
        console.log('Already connected to peer', peer_id);
        return;
    }

    // Re-broadcast current profile to ensure late joiners receive latest avatar/name.
    // This uses the existing peerName signaling path.
    emitMyPeerProfile();

    console.log('iceServers', iceServers[0]);

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    const peerConnection = new RTCPeerConnection({ iceServers: iceServers });
    peerConnections[peer_id] = peerConnection;

    allPeers = peers;
    // Ensure extras object exists for every peer to avoid undefined checks later
    try {
        for (const id in allPeers) {
            if (!allPeers[id]) continue;
            if (!allPeers[id].extras) allPeers[id].extras = {};
        }
    } catch (e) {
        console.warn('[INIT EXTRAS] failed to normalize peers extras', e);
    }

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

    if ((!peer_video_status || !peer_screen_status) && !needToCreateOfferByPeer[peer_id]) {
        needToCreateOfferByPeer[peer_id] = true;
    }
    if (should_create_offer) {
        await handleRtcOffer(peer_id);
        console.log('[RTCPeerConnection] - SHOULD CREATE OFFER', {
            peer_id: peer_id,
            peer_name: peer_name,
            role: 'offerer',
        });
    }

    // Add tracks (this will trigger onnegotiationneeded if needed)
    await handleAddTracks(peer_id);

    // Create camera tile for peer without camera to show their avatar or has screen sharing on but camera off
    if (!peer_video || (peer_screen_status && !peer_video_status)) {
        await loadRemoteMediaStream(new MediaStream(), peers, peer_id, 'video');
    }

    await wbUpdate();
    playSound('addPeer');

    // Screen reader announcement for peer joined
    screenReaderAccessibility.announceMessage(`${peer_name} joined the room`);
}

/**
 * Broadcast my current profile (name + avatar) to room peers
 */
function emitMyPeerProfile() {
    sendToServer('peerName', {
        room_id: roomId,
        peer_name_old: myPeerName,
        peer_name_new: myPeerName,
        peer_avatar: myPeerAvatar,
    });
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
    peerConnections[peer_id].ontrack = (event) => {
        if (!event.streams?.[0]) {
            console.warn('[ON TRACK] No streams found', event);
            return;
        }

        const kind = event.track?.kind;
        if (!kind) {
            console.warn('[ON TRACK] Unable to determine track kind', event);
            return;
        }

        const peerInfo = allPeers?.[peer_id] || peers?.[peer_id] || {};
        const peer_name = peerInfo.peer_name || 'Unknown';
        const inbound = event.streams[0];

        // Helper to load or attach stream
        const handleStream = (elementId, streamType) => {
            const element = getId(`${peer_id}___${elementId}`);

            if (!element) {
                // Tile doesn't exist yet — create everything
                loadRemoteMediaStream(inbound, allPeers || peers, peer_id, streamType);
            } else {
                // Tile already exists (e.g. peer joined with camera off) — just attach the new stream
                attachMediaStream(element, inbound);
                elemDisplay(element, true, 'block');
                // Safari requires an explicit play() after srcObject is reassigned
                element.play().catch(() => {});
            }
        };

        if (kind === 'audio') {
            const audioElement = getId(`${peer_id}___audio`);

            if (audioElement) {
                attachMediaStream(audioElement, inbound);
                // Always call play() — srcObject was just assigned so the old check (!srcObject) was always false
                audioElement.play().catch((err) => {
                    console.warn('[AUDIO] Autoplay not allowed by device, setting up fallback:', err);
                    handleAudioFallback(audioElement, peer_name);
                });
            } else {
                loadRemoteMediaStream(inbound, allPeers || peers, peer_id, 'audio');
            }
            return;
        }

        // Video or screen track
        if (kind === 'video') {
            // Determine if the incoming video track is a screen share or camera.
            const extras = peerInfo.extras || {};
            const label = event.track.label || '';
            const settings = event?.track?.getSettings() || {};

            const isDisplayCapture =
                !!settings.displaySurface || settings.mediaSource === 'screen' || settings.displaySurface === 'monitor';

            const isScreenByExtras =
                extras.screen_track_id === event.track.id || extras.screen_stream_id === inbound.id;

            const isScreenByLabel = /screen|window|monitor|display/i.test(label);

            const isScreenByStatus = peerInfo.peer_screen_status && !peerInfo.peer_video_status;

            const isScreen = isDisplayCapture || isScreenByExtras || isScreenByLabel || isScreenByStatus;

            handleStream(isScreen ? 'screen' : 'video', isScreen ? 'screen' : 'video');
        }
    };
}

/**
 * Add my localVideoMediaStream, localScreenMediaStream and localAudioMediaStream Tracks to connected peer
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
 * @param {string} peer_id socket.id
 */
async function handleAddTracks(peer_id) {
    const pc = peerConnections[peer_id];
    const peer_name = allPeers[peer_id]['peer_name'];

    const videoTrack = getVideoTrack(localVideoMediaStream);
    const screenTrack = getVideoTrack(localScreenMediaStream);
    const screenAudioTrack =
        isScreenStreaming && hasAudioTrack(localScreenMediaStream) ? getAudioTrack(localScreenMediaStream) : null;
    const micAudioTrack = getAudioTrack(localAudioMediaStream);
    const audioTrack = screenAudioTrack || micAudioTrack;
    const audioStream = screenAudioTrack ? localScreenMediaStream : localAudioMediaStream;

    console.log('handleAddTracks', {
        videoTrack: videoTrack,
        screenTrack: screenTrack,
        screenAudioTrack: screenAudioTrack,
        audioTrack: audioTrack,
    });

    if (videoTrack) {
        console.log('[ADD VIDEO TRACK] to Peer Name [' + peer_name + ']');
        await pc.addTrack(videoTrack, localVideoMediaStream);
    }

    if (screenTrack) {
        console.log('[ADD SCREEN TRACK] to Peer Name [' + peer_name + ']');
        await pc.addTrack(screenTrack, localScreenMediaStream);
    }

    if (audioTrack && audioStream) {
        console.log('[ADD AUDIO TRACK] to Peer Name [' + peer_name + ']');
        await pc.addTrack(audioTrack, audioStream);
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
                            case 'chatReaction':
                                handleDataChannelChatReaction(dataMessage);
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
    const pc = peerConnections[peer_id];
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onnegotiationneeded
    pc.onnegotiationneeded = () => {
        console.log('Creating RTC offer to ' + allPeers[peer_id]['peer_name']);
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
        pc.createOffer()
            .then((local_description) => {
                console.log('Local offer description is', local_description);
                // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
                pc.setLocalDescription(local_description)
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

    const pc = peerConnections[peer_id];

    if (!pc) {
        console.warn('[RTCSessionDescription] peer connection missing, ignoring', { peer_id });
        return;
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription
    pc.setRemoteDescription(remote_description)
        .then(() => {
            console.log('setRemoteDescription done!');

            // Drain any queued ICE now that remoteDescription is set.
            flushIceCandidates(peer_id).catch((err) => console.error('[Error] flushIceCandidates', err));

            if (session_description.type == 'offer') {
                console.log('Creating answer');
                // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
                pc.createAnswer()
                    .then((local_description) => {
                        console.log('Answer description is: ', local_description);
                        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
                        pc.setLocalDescription(local_description)
                            .then(() => {
                                sendToServer('relaySDP', {
                                    peer_id: peer_id,
                                    session_description: local_description,
                                });
                                console.log('Answer setLocalDescription done!');

                                // https://github.com/miroslavpejic85/mirotalk/issues/110
                                if (needToCreateOfferByPeer[peer_id]) {
                                    needToCreateOfferByPeer[peer_id] = false;
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
    const pc = peerConnections[peer_id];

    if (!pc) {
        queueIceCandidate(peer_id, ice_candidate);
        return;
    }

    // Queue until remoteDescription is set; otherwise addIceCandidate can fail and the candidate is lost.
    if (!pc.remoteDescription || !pc.remoteDescription.type) {
        queueIceCandidate(peer_id, ice_candidate);
        return;
    }

    pc.addIceCandidate(new RTCIceCandidate(ice_candidate)).catch((err) => {
        console.error('[Error] addIceCandidate', err);
    });
}

/**
 * If addIceCandidate is called before setRemoteDescription, it can fail and the candidate will be lost. To prevent this, we queue candidates until setRemoteDescription is called.
 * @param {string} peer_id socket.id
 * @param {object} ice_candidate RTCIceCandidateInit
 * @returns {void}
 */
function queueIceCandidate(peer_id, ice_candidate) {
    if (!peer_id || !ice_candidate) return;
    if (!pendingIceCandidates[peer_id]) pendingIceCandidates[peer_id] = [];
    pendingIceCandidates[peer_id].push(ice_candidate);
}

/**
 * When setRemoteDescription is called, we can flush any queued ICE candidates for that peer.
 * @param {string} peer_id socket.id
 * @returns {Promise<void>}
 */
async function flushIceCandidates(peer_id) {
    const pc = peerConnections[peer_id];
    const queued = pendingIceCandidates[peer_id];

    if (!pc || !queued || queued.length === 0) return;
    if (!pc.remoteDescription || !pc.remoteDescription.type) return;

    delete pendingIceCandidates[peer_id];

    for (const ice of queued) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(ice));
        } catch (err) {
            console.error('[Error] addIceCandidate (queued)', err);
        }
    }
}

/**
 * Disconnected from Signaling Server.
 * Tear down all of our peer connections and remove all the media divs.
 * @param {object} reason of disconnection
 */
function handleDisconnect(reason) {
    console.log('Disconnected from signaling server', { reason: reason });

    showDisconnectBanner();
    checkRecording();

    for (const peer_id in peerConnections) {
        const peerScreenId = peer_id + '___screen';
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

        const screenVideo = getId(peerScreenId);
        if (screenVideo) {
            // Peer screen in focus mode
            if (screenVideo.hasAttribute('focus-mode')) {
                const remoteScreenFocusBtn = getId(peer_id + '_screen_focusMode');
                if (remoteScreenFocusBtn) {
                    remoteScreenFocusBtn.click();
                }
            }
        }

        if (peerScreenMediaElements[peerScreenId] && peerScreenMediaElements[peerScreenId].parentNode) {
            peerScreenMediaElements[peerScreenId].parentNode.removeChild(peerScreenMediaElements[peerScreenId]);
        }
        if (peerVideoMediaElements[peerVideoId] && peerVideoMediaElements[peerVideoId].parentNode) {
            peerVideoMediaElements[peerVideoId].parentNode.removeChild(peerVideoMediaElements[peerVideoId]);
        }
        if (peerAudioMediaElements[peerAudioId] && peerAudioMediaElements[peerAudioId].parentNode) {
            peerAudioMediaElements[peerAudioId].parentNode.removeChild(peerAudioMediaElements[peerAudioId]);
        }

        peerConnections[peer_id].close();
        msgerRemovePeer(peer_id);
        removeVideoPinMediaContainer(peer_id);
    }

    adaptAspectRatio();

    chatDataChannels = {};
    fileDataChannels = {};
    peerConnections = {};
    pendingIceCandidates = {};
    peerScreenMediaElements = {};
    peerVideoMediaElements = {};
    peerAudioMediaElements = {};

    // Set reconnection flag to trigger proper rejoin
    isPeerReconnected = true;
    console.log('Set isPeerReconnected=true, will attempt to rejoin on reconnect');
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

    const peerScreenId = peer_id + '___screen';
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

    if (peerScreenId in peerScreenMediaElements) {
        const peerScreen = getId(peerScreenId);
        if (peerScreen) {
            // Peer screen in focus mode
            if (peerScreen.hasAttribute('focus-mode')) {
                const remoteScreenFocusBtn = getId(peer_id + '_screen_focusMode');
                if (remoteScreenFocusBtn) {
                    remoteScreenFocusBtn.click();
                }
            }
        }
        peerScreenMediaElements[peerScreenId].parentNode.removeChild(peerScreenMediaElements[peerScreenId]);
        adaptAspectRatio();
    }

    if (peerAudioId in peerAudioMediaElements) {
        peerAudioMediaElements[peerAudioId].parentNode.removeChild(peerAudioMediaElements[peerAudioId]);
    }

    if (peer_id in peerConnections) peerConnections[peer_id].close();

    // Clean up dropdown menus appended to body
    const dropdownBtn = getId(peer_id + '_videoDropdownBtn');
    if (dropdownBtn && dropdownBtn._dropdownContent) {
        dropdownBtn._dropdownContent.remove();
    }

    msgerRemovePeer(peer_id);
    removeVideoPinMediaContainer(peer_id);

    delete chatDataChannels[peer_id];
    delete fileDataChannels[peer_id];
    delete peerConnections[peer_id];
    delete pendingIceCandidates[peer_id];
    delete peerScreenMediaElements[peerScreenId];
    delete peerVideoMediaElements[peerVideoId];
    delete peerAudioMediaElements[peerAudioId];
    delete allPeers[peer_id];

    playSound('removePeer');

    // Screen reader announcement for peer left
    const peer_name = allPeers && allPeers[peer_id] ? allPeers[peer_id]['peer_name'] : 'Participant';
    screenReaderAccessibility.announceMessage(`${peer_name} left the room`);

    console.log('ALL PEERS', allPeers);
}

/**
 * Theme definitions — each key maps to the CSS custom properties for that theme
 */
let themeMap = {
    dark: {
        '--body-bg': 'radial-gradient(#2a2a2e, #121214)',
        '--msger-bg': 'radial-gradient(#2a2a2e, #121214)',
        '--msger-private-bg': 'radial-gradient(#2a2a2e, #121214)',
        '--wb-bg': 'radial-gradient(#2a2a2e, #121214)',
        '--elem-border-color': '1px solid rgba(255, 255, 255, 0.08)',
        '--navbar-bg': 'rgba(18, 18, 20, 0.85)',
        '--select-bg': '#333338',
        '--tab-btn-active': '#3d3d42',
        '--box-shadow': '0px 4px 12px 0px rgba(0, 0, 0, 0.5)',
        '--left-msg-bg': '#2c2c30',
        '--right-msg-bg': '#3a3a40',
        '--private-msg-bg': '#252528',
        '--btn-bar-bg-color': '#E8E8EC',
        '--btn-bar-color': '#121214',
        '--btns-bg-color': 'rgba(18, 18, 20, 0.75)',
        '--dd-color': '#E8E8EC',
    },
    grey: {
        '--body-bg': 'radial-gradient(#3b3f47, #1e2028)',
        '--msger-bg': 'radial-gradient(#3b3f47, #1e2028)',
        '--msger-private-bg': 'radial-gradient(#3b3f47, #1e2028)',
        '--wb-bg': 'radial-gradient(#434750, #252830)',
        '--elem-border-color': '1px solid rgba(255, 255, 255, 0.08)',
        '--navbar-bg': 'rgba(30, 32, 40, 0.85)',
        '--select-bg': '#32363e',
        '--tab-btn-active': '#484c55',
        '--box-shadow': '0px 4px 12px 0px rgba(0, 0, 0, 0.45)',
        '--left-msg-bg': '#33373f',
        '--right-msg-bg': '#434750',
        '--private-msg-bg': '#2d3038',
        '--btn-bar-bg-color': '#E8E8EC',
        '--btn-bar-color': '#1e2028',
        '--btns-bg-color': 'rgba(30, 32, 40, 0.75)',
        '--dd-color': '#E0E0E6',
    },
    green: {
        '--body-bg': 'radial-gradient(#1a3a32, #0d1f1a)',
        '--msger-bg': 'radial-gradient(#1a3a32, #0d1f1a)',
        '--msger-private-bg': 'radial-gradient(#1a3a32, #0d1f1a)',
        '--wb-bg': 'radial-gradient(#1a3a32, #0d1f1a)',
        '--elem-border-color': '1px solid rgba(72, 199, 154, 0.15)',
        '--navbar-bg': 'rgba(13, 31, 26, 0.88)',
        '--select-bg': '#17332b',
        '--tab-btn-active': '#22493e',
        '--box-shadow': '0px 4px 12px 0px rgba(0, 0, 0, 0.5)',
        '--left-msg-bg': '#1e3f36',
        '--right-msg-bg': '#14302a',
        '--private-msg-bg': '#153028',
        '--btn-bar-bg-color': '#E8F5E9',
        '--btn-bar-color': '#0d1f1a',
        '--btns-bg-color': 'rgba(13, 31, 26, 0.75)',
        '--dd-color': '#48C79A',
    },
    blue: {
        '--body-bg': 'radial-gradient(#1b2a4a, #0f1729)',
        '--msger-bg': 'radial-gradient(#1b2a4a, #0f1729)',
        '--msger-private-bg': 'radial-gradient(#1b2a4a, #0f1729)',
        '--wb-bg': 'radial-gradient(#1b2a4a, #0f1729)',
        '--elem-border-color': '1px solid rgba(96, 165, 250, 0.15)',
        '--navbar-bg': 'rgba(15, 23, 41, 0.88)',
        '--select-bg': '#182440',
        '--tab-btn-active': '#243656',
        '--box-shadow': '0px 4px 12px 0px rgba(0, 0, 0, 0.5)',
        '--left-msg-bg': '#1e2e50',
        '--right-msg-bg': '#152038',
        '--private-msg-bg': '#172545',
        '--btn-bar-bg-color': '#E3F2FD',
        '--btn-bar-color': '#0f1729',
        '--btns-bg-color': 'rgba(15, 23, 41, 0.75)',
        '--dd-color': '#60A5FA',
    },
    red: {
        '--body-bg': 'radial-gradient(#3d1520, #1c0a10)',
        '--msger-bg': 'radial-gradient(#3d1520, #1c0a10)',
        '--msger-private-bg': 'radial-gradient(#3d1520, #1c0a10)',
        '--wb-bg': 'radial-gradient(#3d1520, #1c0a10)',
        '--elem-border-color': '1px solid rgba(248, 113, 113, 0.15)',
        '--navbar-bg': 'rgba(28, 10, 16, 0.88)',
        '--select-bg': '#35121c',
        '--tab-btn-active': '#4d1a28',
        '--box-shadow': '0px 4px 12px 0px rgba(0, 0, 0, 0.5)',
        '--left-msg-bg': '#421824',
        '--right-msg-bg': '#2e1018',
        '--private-msg-bg': '#381420',
        '--btn-bar-bg-color': '#FDE8E8',
        '--btn-bar-color': '#1c0a10',
        '--btns-bg-color': 'rgba(28, 10, 16, 0.75)',
        '--dd-color': '#F87171',
    },
    purple: {
        '--body-bg': 'radial-gradient(#2a1840, #150d24)',
        '--msger-bg': 'radial-gradient(#2a1840, #150d24)',
        '--msger-private-bg': 'radial-gradient(#2a1840, #150d24)',
        '--wb-bg': 'radial-gradient(#2a1840, #150d24)',
        '--elem-border-color': '1px solid rgba(192, 132, 252, 0.15)',
        '--navbar-bg': 'rgba(21, 13, 36, 0.88)',
        '--select-bg': '#241538',
        '--tab-btn-active': '#351f4e',
        '--box-shadow': '0px 4px 12px 0px rgba(0, 0, 0, 0.5)',
        '--left-msg-bg': '#2e1c45',
        '--right-msg-bg': '#201230',
        '--private-msg-bg': '#28163c',
        '--btn-bar-bg-color': '#F3E8FD',
        '--btn-bar-color': '#150d24',
        '--btns-bg-color': 'rgba(21, 13, 36, 0.75)',
        '--dd-color': '#C084FC',
    },
    orange: {
        '--body-bg': 'radial-gradient(#3d2410, #1e1208)',
        '--msger-bg': 'radial-gradient(#3d2410, #1e1208)',
        '--msger-private-bg': 'radial-gradient(#3d2410, #1e1208)',
        '--wb-bg': 'radial-gradient(#3d2410, #1e1208)',
        '--elem-border-color': '1px solid rgba(251, 191, 36, 0.15)',
        '--navbar-bg': 'rgba(30, 18, 8, 0.88)',
        '--select-bg': '#352010',
        '--tab-btn-active': '#4d3018',
        '--box-shadow': '0px 4px 12px 0px rgba(0, 0, 0, 0.5)',
        '--left-msg-bg': '#422814',
        '--right-msg-bg': '#2e1c0e',
        '--private-msg-bg': '#382210',
        '--btn-bar-bg-color': '#FFF3E0',
        '--btn-bar-color': '#1e1208',
        '--btns-bg-color': 'rgba(30, 18, 8, 0.75)',
        '--dd-color': '#FBBF24',
    },
    yellow: {
        '--body-bg': 'radial-gradient(#3a3418, #1e1c0e)',
        '--msger-bg': 'radial-gradient(#3a3418, #1e1c0e)',
        '--msger-private-bg': 'radial-gradient(#3a3418, #1e1c0e)',
        '--wb-bg': 'radial-gradient(#3a3418, #1e1c0e)',
        '--elem-border-color': '1px solid rgba(250, 204, 21, 0.15)',
        '--navbar-bg': 'rgba(30, 28, 14, 0.88)',
        '--select-bg': '#322e15',
        '--tab-btn-active': '#4a441e',
        '--box-shadow': '0px 4px 12px 0px rgba(0, 0, 0, 0.5)',
        '--left-msg-bg': '#3e381c',
        '--right-msg-bg': '#2c2812',
        '--private-msg-bg': '#363018',
        '--btn-bar-bg-color': '#FFFDE7',
        '--btn-bar-color': '#1e1c0e',
        '--btns-bg-color': 'rgba(30, 28, 14, 0.75)',
        '--dd-color': '#FACC15',
    },
};

/**
 * Apply a set of CSS custom properties from a theme vars object
 * @param {object} vars theme CSS properties map
 */
function applyThemeVars(vars) {
    swBg = vars['--body-bg'];
    for (const [prop, value] of Object.entries(vars)) {
        setSP(prop, value);
    }
    document.body.style.background = vars['--body-bg'];
}

/**
 * Set custom theme
 */
function setCustomTheme() {
    const color = themeCustom.color;
    const bg = `radial-gradient(${color}, ${color})`;
    applyThemeVars({
        '--body-bg': bg,
        '--msger-bg': bg,
        '--msger-private-bg': bg,
        '--wb-bg': bg,
        '--elem-border-color': '0.5px solid rgb(255 255 255 / 32%)',
        '--navbar-bg': 'rgba(0, 0, 0, 0.2)',
        '--select-bg': color,
        '--tab-btn-active': color,
        '--box-shadow': '0px 8px 16px 0px rgba(0, 0, 0, 0.2)',
        '--left-msg-bg': '#252d31',
        '--right-msg-bg': color,
        '--private-msg-bg': '#6b1226',
        '--btn-bar-bg-color': '#FFFFFF',
        '--btn-bar-color': '#000000',
        '--btns-bg-color': color,
    });
}

/**
 * Set mirotalk theme | dark | grey | ...
 */
function setTheme() {
    if (themeCustom.keep) return setCustomTheme();

    mirotalkTheme.selectedIndex = lsSettings.theme;
    const theme = mirotalkTheme.value;
    const vars = themeMap[theme];

    if (!vars) {
        console.log('No theme found');
        return;
    }

    applyThemeVars(vars);

    const themeNames = Object.keys(themeMap);
    mirotalkTheme.selectedIndex = themeNames.indexOf(theme);

    wbIsBgTransparent = false;
    //setButtonsBarPosition(mainButtonsBarPosition);
    updateThemeCardsActive();
}

function updateThemeCardsActive() {
    const cards = document.querySelectorAll('.theme-card');
    cards.forEach((card) => {
        const isActive = parseInt(card.dataset.index) === themeSelect.selectedIndex;
        card.classList.toggle('active', isActive);
        // For dynamic (server-added) cards, apply active border/shadow via inline style
        const dynamicColor = card.style.getPropertyValue('--dynamic-theme-color');
        if (dynamicColor) {
            card.style.borderColor = isActive ? dynamicColor : '';
            card.style.boxShadow = isActive ? `0 0 12px ${dynamicColor}33` : '';
        }
    });
}

function updateThemeCardsDisabled() {
    const cards = document.querySelectorAll('.theme-card');
    cards.forEach((card) => {
        card.classList.toggle('disabled', themeSelect.disabled);
    });
}

/**
 * Buttons bar position definitions
 */
const buttonsBarPositionMap = {
    vertical: {
        // bottomButtons horizontally
        '--bottom-btns-top': 'auto',
        '--bottom-btns-left': '50%',
        '--bottom-btns-bottom': '0',
        '--bottom-btns-translate-X': '-50%',
        '--bottom-btns-translate-Y': '0%',
        '--bottom-btns-margin-bottom': '16px',
        '--bottom-btns-flex-direction': 'row',
    },
    horizontal: {
        // bottomButtons vertically
        '--bottom-btns-top': '50%',
        '--bottom-btns-left': '15px',
        '--bottom-btns-bottom': 'auto',
        '--bottom-btns-translate-X': '0%',
        '--bottom-btns-translate-Y': '-50%',
        '--bottom-btns-margin-bottom': '0',
        '--bottom-btns-flex-direction': 'column',
    },
};

/**
 * Set buttons bar position
 * @param {string} position vertical / horizontal
 */
function setButtonsBarPosition(position) {
    if (!position || isMobileDevice) return;

    mainButtonsBarPosition = position;
    const vars = buttonsBarPositionMap[mainButtonsBarPosition];

    if (!vars) {
        console.log('No position found');
        return;
    }

    for (const [prop, value] of Object.entries(vars)) {
        setSP(prop, value);
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
            })
        )
        .then(async () => {
            await stopTracks(stream);
            isEnumerateAudioDevices = true;
            //const sinkId = 'sinkId' in HTMLMediaElement.prototype;
            audioOutputSelect.disabled = !sinkId;
            // Check if there is speakers
            if (!sinkId || initSpeakerSelect.options.length === 0) {
                displayElements([
                    { element: initSpeakerSelect, display: false },
                    { element: audioOutputDiv, display: false },
                ]);
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
            })
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
 * Refresh audio/video devices list when hardware changes are detected
 * Preserves the currently selected device if it's still available
 */
async function refreshMyAudioVideoDevices() {
    console.log('Refreshing audio/video devices...');

    // Store currently selected device IDs
    const selectedVideoId = videoSelect?.value;
    const selectedAudioInputId = audioInputSelect?.value;
    const selectedAudioOutputId = audioOutputSelect?.value;

    try {
        // Re-enumerate all devices
        const devices = await navigator.mediaDevices.enumerateDevices();

        // Clear existing options
        if (videoSelect) videoSelect.innerHTML = '';
        if (audioInputSelect) audioInputSelect.innerHTML = '';
        if (audioOutputSelect) audioOutputSelect.innerHTML = '';

        // Reset device counts
        lS.DEVICES_COUNT.video = 0;
        lS.DEVICES_COUNT.audio = 0;
        lS.DEVICES_COUNT.speaker = 0;

        // Populate select elements with new device list
        for (const device of devices) {
            let el = null;
            if (device.kind === 'videoinput') {
                el = videoSelect;
                lS.DEVICES_COUNT.video++;
            } else if (device.kind === 'audioinput') {
                el = audioInputSelect;
                lS.DEVICES_COUNT.audio++;
            } else if (device.kind === 'audiooutput') {
                el = audioOutputSelect;
                lS.DEVICES_COUNT.speaker++;
            }
            if (el) await addChild(device, [el]);
        }

        // Update speaker availability
        audioOutputSelect.disabled = !sinkId || lS.DEVICES_COUNT.speaker === 0;

        // Try to restore previously selected devices
        let videoChanged = false;
        let audioInputChanged = false;
        let audioOutputChanged = false;

        if (videoSelect && selectedVideoId) {
            if (selectOptionByValueExist(videoSelect, selectedVideoId)) {
                videoSelect.value = selectedVideoId;
            } else {
                videoChanged = true;
                console.log('Previously selected camera no longer available');
            }
        }

        if (audioInputSelect && selectedAudioInputId) {
            if (selectOptionByValueExist(audioInputSelect, selectedAudioInputId)) {
                audioInputSelect.value = selectedAudioInputId;
            } else {
                audioInputChanged = true;
                console.log('Previously selected microphone no longer available');
            }
        }

        if (audioOutputSelect && selectedAudioOutputId) {
            if (selectOptionByValueExist(audioOutputSelect, selectedAudioOutputId)) {
                audioOutputSelect.value = selectedAudioOutputId;
            } else {
                audioOutputChanged = true;
                console.log('Previously selected speaker no longer available');
            }
        }

        // If active device was removed, switch to the new default
        if (videoChanged && useVideo && videoSelect?.value) {
            console.log('Switching to new default camera:', videoSelect.value);
            await changeLocalCamera(videoSelect.value);
        }

        if (audioInputChanged && useAudio && audioInputSelect?.value) {
            console.log('Switching to new default microphone:', audioInputSelect.value);
            await changeLocalMicrophone(audioInputSelect.value);
        }

        if (audioOutputChanged && audioOutputSelect?.value) {
            console.log('Switching to new default speaker:', audioOutputSelect.value);
            await changeAudioDestination();
        }

        // Update local storage with new selections
        await refreshLsDevices();

        console.log('Device refresh complete:', {
            video: lS.DEVICES_COUNT.video,
            audio: lS.DEVICES_COUNT.audio,
            speaker: lS.DEVICES_COUNT.speaker,
        });
    } catch (err) {
        console.error('Error refreshing devices:', err);
    }
}

/**
 * Detect low quality bluetooth devices
 * @param {boolean} init indicates if it's during inizialization before join room
 */
function detectBluetoothHeadset(init = false) {
    const selectEl = init ? initMicrophoneSelect : audioInputSelect;
    if (!selectEl) return;

    const micName = getSelectedOptionText(selectEl);
    console.log('Selected microphone:', micName);

    const lowQualityBT = /(bluetooth|headset|hands[- ]?free|hsp|hfp|sco|airpods)/i;
    if (micName && lowQualityBT.test(micName)) {
        alert(
            "⚠️ You're using a Bluetooth headset with limited audio quality. For best results, use your device's built-in microphone or a wired headset."
        );
    }
}

/**
 *  Get selected option text
 * @param {object} selectEl
 * @returns string
 */
function getSelectedOptionText(selectEl) {
    if (!selectEl || !selectEl.options || selectEl.selectedIndex < 0) return '';
    const opt = selectEl.options[selectEl.selectedIndex];
    return opt && opt.text ? opt.text.trim() : '';
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

    const videoConstraints = useVideo ? getVideoConstraints('default') : false;

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

    // Check RNNoise support early, before audio streams are created.
    await initRNNoiseSuppression();

    const audioConstraints = useAudio ? getAudioConstraints() : { audio: false };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        if (stream) {
            /* 
                Verify the audio track is live – on some mobile devices getUserMedia
                succeeds but the track is muted/ended (e.g. built-in mic restrictions).
            */
            let activeStream = stream;
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack && (audioTrack.readyState === 'ended' || audioTrack.muted)) {
                console.warn(
                    'Audio track obtained but is ' +
                        (audioTrack.muted ? 'muted' : 'ended') +
                        ', retrying with relaxed constraints'
                );
                stream.getTracks().forEach((t) => t.stop());
                activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            await loadLocalMedia(activeStream, 'audio');
            if (useAudio) {
                localAudioMediaStream = activeStream;
                console.log('10. Access granted to audio device');

                // Auto-enable noise suppression if the user had it active in a previous session.
                if (lsSettings.mic_noise_suppression && isRNNoiseSupported && buttons.settings.customNoiseSuppression) {
                    const ok = await enableNoiseSuppression();
                    if (!ok) {
                        console.warn('Auto noise-suppression failed on startup, continuing with raw mic.');
                    }
                }
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
        `Access denied for ${mediaType} device [${err.name}]: ${errMessage} check the common getUserMedia errors: https://blog.addpipe.com/common-getusermedia-errors/`
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
            const myCurrentSessionTime = document.createElement('span');
            const myVideoPeerName = document.createElement('p');
            const myHandStatusIcon = document.createElement('button');
            const myVideoToImgBtn = document.createElement('button');
            const myPrivacyBtn = document.createElement('button');
            const myVideoStatusIcon = document.createElement('button');
            const myAudioStatusIcon = document.createElement('button');
            const myVideoFullScreenBtn = document.createElement('button');
            const myVideoFocusBtn = document.createElement('button');
            const myVideoPinBtn = document.createElement('button');
            const myVideoMirrorBtn = document.createElement('button');
            const myVideoZoomInBtn = document.createElement('button');
            const myVideoZoomOutBtn = document.createElement('button');
            const myVideoPiPBtn = document.createElement('button');
            const myDropdownDiv = document.createElement('div');
            const myDropdownBtn = document.createElement('button');
            const myDropdownContent = document.createElement('div');
            const myVideoAvatarImage = document.createElement('img');
            const myPitchMeter = document.createElement('div');
            const myPitchBar = document.createElement('div');

            //my current session time
            myCurrentSessionTime.setAttribute('id', 'myCurrentSessionTime');
            myCurrentSessionTime.className = 'notranslate';

            // my peer name
            myVideoPeerName.setAttribute('id', 'myVideoPeerName');
            myVideoPeerName.className = 'videoPeerName notranslate fadein';

            // my hand status element
            myHandStatusIcon.setAttribute('id', 'myHandStatusIcon');
            myHandStatusIcon.className = className.handPulsate;
            myHandStatusIcon.style.setProperty('color', '#FFD700');

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

            // my video hide all button
            myVideoFocusBtn.setAttribute('id', 'myVideoFocusMode');
            myVideoFocusBtn.className = className.hideAll;

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
                setTippy(myHandStatusIcon, 'My hand is raised', 'bottom');
                setTippy(myPrivacyBtn, 'Toggle video privacy', 'bottom');
                setTippy(myVideoStatusIcon, 'My video is on', 'bottom');
                setTippy(myAudioStatusIcon, 'My audio is on', 'bottom');
                setTippy(myVideoToImgBtn, 'Take a snapshot', 'bottom');
                setTippy(myVideoFullScreenBtn, 'Full screen mode', 'bottom');
                setTippy(myVideoFocusBtn, 'Toggle Focus mode', 'bottom');
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

            myVideoNavBar.appendChild(myCurrentSessionTime);

            !isMobileDevice && myVideoNavBar.appendChild(myVideoPinBtn);

            buttons.local.showVideoFocusBtn && myVideoNavBar.appendChild(myVideoFocusBtn);

            if (showVideoPipBtn && buttons.local.showVideoPipBtn) myVideoNavBar.appendChild(myVideoPiPBtn);

            buttons.local.showSnapShotBtn && myVideoNavBar.appendChild(myVideoToImgBtn);
            buttons.local.showVideoCircleBtn && myVideoNavBar.appendChild(myPrivacyBtn);

            // Local dropdown menu
            myDropdownDiv.className = 'navbar-dropdown';
            myDropdownBtn.id = 'myVideoDropdownBtn';
            myDropdownBtn.className = 'fas fa-ellipsis-vertical';
            myDropdownContent.className = 'navbar-dropdown-content';

            myDropdownContent.appendChild(createDropdownItem(myVideoMirrorBtn, 'Mirror', myDropdownContent));
            isVideoFullScreenSupported &&
                myDropdownContent.appendChild(
                    createDropdownItem(myVideoFullScreenBtn, 'Full Screen', myDropdownContent)
                );
            if (buttons.local.showZoomInOutBtn) {
                myDropdownContent.appendChild(createDropdownItem(myVideoZoomInBtn, 'Zoom In', myDropdownContent));
                myDropdownContent.appendChild(createDropdownItem(myVideoZoomOutBtn, 'Zoom Out', myDropdownContent));
            }

            myDropdownDiv.appendChild(myDropdownBtn);
            document.body.appendChild(myDropdownContent);
            myDropdownBtn._dropdownContent = myDropdownContent;
            handleDropdownEvents(myDropdownDiv, myDropdownBtn, myDropdownContent);

            myVideoNavBar.appendChild(myVideoStatusIcon);
            myVideoNavBar.appendChild(myAudioStatusIcon);
            myVideoNavBar.appendChild(myHandStatusIcon);

            myVideoNavBar.appendChild(myDropdownDiv);

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
            myVideoWrap.appendChild(myVideoPeerName);

            createVideoLoadingSpinner(myVideoWrap, myLocalMedia);

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

            buttons.local.showVideoFocusBtn && handleVideoFocusMode(myVideoFocusBtn, myVideoWrap, myLocalMedia);

            handleVideoPinUnpin(myLocalMedia.id, myVideoPinBtn.id, myVideoWrap.id, myLocalMedia.id);

            if (showVideoPipBtn && buttons.local.showVideoPipBtn)
                handlePictureInPicture(myVideoPiPBtn.id, myLocalMedia.id, myPeerId);

            ZOOM_IN_OUT_ENABLED &&
                handleVideoZoomInOut(
                    myVideoStatusIcon.id,
                    myVideoWrap.id,
                    myVideoZoomInBtn.id,
                    myVideoZoomOutBtn.id,
                    myLocalMedia.id
                );

            refreshMyVideoStatus(stream);

            if (!useVideo) {
                elemDisplay(myVideoAvatarImage, true, 'block');
                const spinner = myVideoWrap.querySelector('.video-loading-spinner');
                if (spinner) elemDisplay(spinner, false);
                setMediaButtonsClass([
                    { element: myVideoStatusIcon, status: false, mediaType: 'video' },
                    { element: videoBtn, status: false, mediaType: 'video' },
                ]);
                if (!isMobileDevice) {
                    setTippy(myVideoStatusIcon, 'My video is disabled', 'bottom');
                }
            }

            if (!useAudio) {
                setMediaButtonsClass([
                    { element: myAudioStatusIcon, status: false, mediaType: 'audio' },
                    { element: audioBtn, status: false, mediaType: 'audio' },
                ]);
                if (!isMobileDevice) {
                    setTippy(myAudioStatusIcon, 'My audio is disabled', 'bottom');
                }
            }
            break;
        case 'screen':
            //alert('local screen');
            console.log('SETUP LOCAL SCREEN STREAM');

            // local screen elements
            const myScreenWrap = document.createElement('div');
            const myScreenMedia = document.createElement('video');

            // html elements
            const myScreenNavBar = document.createElement('div');
            const myScreenPeerName = document.createElement('p');
            const myScreenToImgBtn = document.createElement('button');
            const myScreenFullScreenBtn = document.createElement('button');
            const myScreenFocusBtn = document.createElement('button');
            const myScreenPinBtn = document.createElement('button');
            const myScreenZoomInBtn = document.createElement('button');
            const myScreenZoomOutBtn = document.createElement('button');
            const myScreenPiPBtn = document.createElement('button');
            const myScreenAvatarImage = document.createElement('img');

            // my screen peer name
            myScreenPeerName.setAttribute('id', 'myScreenPeerName');
            myScreenPeerName.className = 'videoPeerName notranslate fadein';
            myScreenPeerName.innerText = myPeerName + ' (me)';

            // my screen to image
            myScreenToImgBtn.setAttribute('id', 'myScreenToImgBtn');
            myScreenToImgBtn.className = className.snapShot;

            // my screen full screen mode
            myScreenFullScreenBtn.setAttribute('id', 'myScreenFullScreenBtn');
            myScreenFullScreenBtn.className = className.fullScreen;

            // my screen zoomIn/Out
            myScreenZoomInBtn.setAttribute('id', 'myScreenZoomInBtn');
            myScreenZoomInBtn.className = className.zoomIn;
            myScreenZoomOutBtn.setAttribute('id', 'myScreenZoomOutBtn');
            myScreenZoomOutBtn.className = className.zoomOut;

            // my screen focus mode
            myScreenFocusBtn.setAttribute('id', 'myScreenFocusMode');
            myScreenFocusBtn.className = className.hideAll;

            // my screen Picture in Picture
            myScreenPiPBtn.setAttribute('id', 'myScreenPiPBtn');
            myScreenPiPBtn.className = className.pip;

            // my screen pin/unpin button
            myScreenPinBtn.setAttribute('id', 'myScreenPinBtn');
            myScreenPinBtn.className = className.pinUnpin;

            // no mobile devices
            if (!isMobileDevice) {
                setTippy(myScreenToImgBtn, 'Take a snapshot', 'bottom');
                setTippy(myScreenFullScreenBtn, 'Full screen mode', 'bottom');
                setTippy(myScreenZoomInBtn, 'Zoom in screen', 'bottom');
                setTippy(myScreenZoomOutBtn, 'Zoom out screen', 'bottom');
                setTippy(myScreenPiPBtn, 'Toggle picture in picture', 'bottom');
                setTippy(myScreenFocusBtn, 'Toggle Focus mode', 'bottom');
                setTippy(myScreenPinBtn, 'Toggle Pin screen', 'bottom');
            }

            // my screen avatar image
            myScreenAvatarImage.setAttribute('id', 'myScreenAvatarImage');
            myScreenAvatarImage.className = 'videoAvatarImage'; // pulsate

            // my screen nav bar
            myScreenNavBar.className = 'navbar fadein';

            // attach to screen nav bar
            !isMobileDevice && myScreenNavBar.appendChild(myScreenPinBtn);

            buttons.local.showVideoFocusBtn && myScreenNavBar.appendChild(myScreenFocusBtn);

            buttons.local.showSnapShotBtn && myScreenNavBar.appendChild(myScreenToImgBtn);

            myScreenNavBar.appendChild(myScreenPiPBtn);

            if (buttons.local.showZoomInOutBtn) {
                myScreenNavBar.appendChild(myScreenZoomInBtn);
                myScreenNavBar.appendChild(myScreenZoomOutBtn);
            }

            isVideoFullScreenSupported && myScreenNavBar.appendChild(myScreenFullScreenBtn);

            myScreenMedia.setAttribute('id', 'myScreen');
            myScreenMedia.setAttribute('playsinline', true);
            myScreenMedia.style.objectFit = 'contain';
            myScreenMedia.className = '';
            myScreenMedia.autoplay = true;
            myScreenMedia.muted = true;
            myScreenMedia.volume = 0;
            myScreenMedia.controls = false;

            myScreenWrap.className = 'Screen';
            myScreenWrap.setAttribute('id', 'myScreenWrap');

            // add elements to screen wrap div
            myScreenWrap.appendChild(myScreenNavBar);
            myScreenWrap.appendChild(myScreenAvatarImage);
            myScreenWrap.appendChild(myScreenMedia);
            myScreenWrap.appendChild(myScreenPeerName);

            createVideoLoadingSpinner(myScreenWrap, myScreenMedia);

            videoMediaContainer.appendChild(myScreenWrap);
            // Show my screen tile immediately when created
            elemDisplay(myScreenWrap, true, 'inline-block');

            logStreamSettingsInfo('localScreenMediaStream', stream);
            attachMediaStream(myScreenMedia, stream);

            adaptAspectRatio();

            buttons.local.showSnapShotBtn && handleVideoToImg(myScreenMedia.id, myScreenToImgBtn.id);

            isVideoFullScreenSupported && handleVideoPlayerFs(myScreenMedia.id, myScreenFullScreenBtn.id);

            buttons.local.showVideoFocusBtn && handleVideoFocusMode(myScreenFocusBtn, myScreenWrap, myScreenMedia);

            handleVideoPinUnpin(myScreenMedia.id, myScreenPinBtn.id, myScreenWrap.id, myScreenMedia.id, true);

            myScreenPinBtn.click();

            if (showVideoPipBtn && buttons.local.showVideoPipBtn)
                handlePictureInPicture(myScreenPiPBtn.id, myScreenMedia.id, myPeerId);

            ZOOM_IN_OUT_ENABLED &&
                handleVideoZoomInOut(
                    '',
                    myScreenWrap.id,
                    myScreenZoomInBtn.id,
                    myScreenZoomOutBtn.id,
                    myScreenMedia.id
                );
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
    if (!isMobileDevice && isScreenEnabled && isScreenSharingSupported && buttons.main.showScreenBtn) {
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
 * Open chat on Join
 */
function checkChatOnJoin() {
    if (chat) {
        chatRoomBtn.click();
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
    const peer_avatar = peers[peer_id]['peer_avatar'];
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
            const remoteGeoLocationBtn = document.createElement('button');
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
            const remoteDropdownDiv = document.createElement('div');
            const remoteDropdownBtn = document.createElement('button');
            const remoteDropdownContent = document.createElement('div');

            // remote peer name element
            remotePeerName.setAttribute('id', peer_id + '_name');
            remotePeerName.className = 'videoPeerName notranslate fadein';

            const peerVideoText = document.createTextNode(peer_name);
            remotePeerName.appendChild(peerVideoText);

            // remote hand status element
            remoteHandStatusIcon.setAttribute('id', peer_id + '_handStatus');
            remoteHandStatusIcon.style.setProperty('color', '#FFD700');
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

            // remote geo location
            remoteGeoLocationBtn.setAttribute('id', peer_id + '_geoLocation');
            remoteGeoLocationBtn.className = className.geoLocation;

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

            // tooltips for navbar buttons only (not dropdown items)
            if (!isMobileDevice) {
                setTippy(remotePeerName, 'Participant name', 'bottom');
                setTippy(remoteHandStatusIcon, 'Participant hand is raised', 'bottom');
                setTippy(remoteVideoStatusIcon, 'Participant video is on', 'bottom');
                setTippy(remoteAudioStatusIcon, 'Participant audio is on', 'bottom');
                setTippy(remoteAudioVolume, '🔊 Volume', 'top');
                setTippy(remoteVideoToImgBtn, 'Take a snapshot', 'bottom');
                setTippy(remoteVideoPiPBtn, 'Toggle picture in picture', 'bottom');
                setTippy(remoteVideoPinBtn, 'Toggle Pin video', 'bottom');
                setTippy(remoteVideoFocusBtn, 'Toggle Focus mode', 'bottom');
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

            // remote dropdown menu (replaces old expand-video)
            remoteDropdownDiv.className = 'navbar-dropdown';
            remoteDropdownBtn.id = peer_id + '_videoDropdownBtn';
            remoteDropdownBtn.className = 'fas fa-ellipsis-vertical';
            remoteDropdownContent.className = 'navbar-dropdown-content';

            // Build dropdown items
            remoteDropdownContent.appendChild(
                createDropdownItem(remoteVideoMirrorBtn, 'Mirror', remoteDropdownContent)
            );
            isVideoFullScreenSupported &&
                remoteDropdownContent.appendChild(
                    createDropdownItem(remoteVideoFullScreenBtn, 'Full Screen', remoteDropdownContent)
                );
            if (buttons.remote.showZoomInOutBtn) {
                remoteDropdownContent.appendChild(
                    createDropdownItem(remoteVideoZoomInBtn, 'Zoom In', remoteDropdownContent)
                );
                remoteDropdownContent.appendChild(
                    createDropdownItem(remoteVideoZoomOutBtn, 'Zoom Out', remoteDropdownContent)
                );
            }
            buttons.remote.showPrivateMessageBtn &&
                remoteDropdownContent.appendChild(
                    createDropdownItem(remotePrivateMsgBtn, 'Private Message', remoteDropdownContent)
                );
            buttons.remote.showGeoLocationBtn &&
                remoteDropdownContent.appendChild(
                    createDropdownItem(remoteGeoLocationBtn, 'Geo Location', remoteDropdownContent)
                );
            buttons.remote.showFileShareBtn &&
                remoteDropdownContent.appendChild(
                    createDropdownItem(remoteFileShareBtn, 'Send File', remoteDropdownContent)
                );
            buttons.remote.showShareVideoAudioBtn &&
                remoteDropdownContent.appendChild(
                    createDropdownItem(remoteVideoAudioUrlBtn, 'Send Video/Audio', remoteDropdownContent)
                );
            buttons.remote.showKickOutBtn &&
                remoteDropdownContent.appendChild(
                    createDropdownItem(remotePeerKickOut, 'Kick Out', remoteDropdownContent, 'red')
                );

            remoteDropdownDiv.appendChild(remoteDropdownBtn);
            // Append dropdown content to body so it escapes overflow:hidden on .Camera
            document.body.appendChild(remoteDropdownContent);
            // Store reference for cleanup on peer removal
            remoteDropdownBtn._dropdownContent = remoteDropdownContent;

            handleDropdownEvents(remoteDropdownDiv, remoteDropdownBtn, remoteDropdownContent);

            // attach to remote video nav bar
            !isMobileDevice && remoteVideoNavBar.appendChild(remoteVideoPinBtn);

            buttons.remote.showVideoFocusBtn && remoteVideoNavBar.appendChild(remoteVideoFocusBtn);

            if (showVideoPipBtn && buttons.remote.showVideoPipBtn) remoteVideoNavBar.appendChild(remoteVideoPiPBtn);

            buttons.remote.showSnapShotBtn && remoteVideoNavBar.appendChild(remoteVideoToImgBtn);

            remoteVideoNavBar.appendChild(remoteVideoStatusIcon);
            remoteVideoNavBar.appendChild(remoteAudioStatusIcon);

            // Disabled audio volume control on Mobile devices
            if (!isMobileDevice && peer_audio && buttons.remote.showAudioVolume) {
                remoteVideoNavBar.appendChild(remoteAudioVolume);
            }
            remoteVideoNavBar.appendChild(remoteHandStatusIcon);

            remoteVideoNavBar.appendChild(remoteDropdownDiv);

            remoteMedia.setAttribute('id', peer_id + '___video');
            remoteMedia.setAttribute('playsinline', true);
            remoteMedia.autoplay = true;
            remoteMedia.muted = true; // audio is handled by a separate <audio> element; muting allows autoplay on Safari
            remoteMediaControls = isMobileDevice ? false : remoteMediaControls;
            remoteMedia.style.objectFit = 'var(--video-object-fit)';
            remoteMedia.style.name = peer_id + '_typeCam';
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

            createVideoLoadingSpinner(remoteVideoWrap, remoteMedia);

            // need later on disconnect or remove peers
            peerVideoMediaElements[remoteMedia.id] = remoteVideoWrap;

            // append all elements to videoMediaContainer
            videoMediaContainer.appendChild(remoteVideoWrap);
            // attachMediaStream is a part of the adapter.js library
            attachMediaStream(remoteMedia, stream);
            // Explicitly play – required on mobile Safari where autoplay alone is not enough
            remoteMedia.play().catch(() => {});

            // resize video elements
            adaptAspectRatio();

            // handle video to image
            buttons.remote.showSnapShotBtn && handleVideoToImg(remoteMedia.id, remoteVideoToImgBtn.id, peer_id);

            // handle video pin/unpin
            handleVideoPinUnpin(remoteMedia.id, remoteVideoPinBtn.id, remoteVideoWrap.id, peer_id);

            // handle video focus mode
            handleVideoFocusMode(remoteVideoFocusBtn, remoteVideoWrap, remoteMedia);

            // handle video toggle mirror
            handleVideoToggleMirror(remoteMedia.id, remoteVideoMirrorBtn.id);

            // handle vide picture in picture
            if (showVideoPipBtn && buttons.remote.showVideoPipBtn)
                handlePictureInPicture(remoteVideoPiPBtn.id, remoteMedia.id, peer_id);

            // handle video zoomIn/Out
            ZOOM_IN_OUT_ENABLED &&
                handleVideoZoomInOut(
                    '',
                    remoteVideoWrap.id,
                    remoteVideoZoomInBtn.id,
                    remoteVideoZoomOutBtn.id,
                    remoteMedia.id,
                    peer_id
                );

            // handle video full screen mode
            isVideoFullScreenSupported && handleVideoPlayerFs(remoteMedia.id, remoteVideoFullScreenBtn.id, peer_id);

            // handle file share drag and drop
            handleFileDragAndDrop(remoteMedia.id, peer_id);

            // handle kick out button event
            buttons.remote.showKickOutBtn && handlePeerKickOutBtn(peer_id);

            // set video privacy true
            peer_privacy_status && setVideoPrivacyStatus(remoteMedia.id, peer_privacy_status);

            // refresh remote peers avatar name
            setPeerAvatarImgName(remoteVideoAvatarImage.id, peer_name, peer_avatar);
            // refresh remote peers hand icon status and title
            setPeerHandStatus(peer_id, peer_name, peer_hand_status);
            // refresh remote peers video icon status and title
            setPeerVideoStatus(peer_id, peer_video_status);
            // refresh remote peers audio icon status and title
            setPeerAudioStatus(peer_id, peer_audio_status);
            // handle remote peers audio on-off
            handlePeerAudioBtn(peer_id);
            // handle remote peers video on-off
            handlePeerVideoBtn(peer_id);

            // handle remote geo location
            buttons.remote.showGeoLocationBtn && handlePeerGeoLocation(peer_id, peer_name);
            // handle remote private messages
            buttons.remote.showPrivateMessageBtn && handlePeerPrivateMsg(peer_id, peer_name, remotePrivateMsgBtn.id);
            // handle remote send file
            buttons.remote.showFileShareBtn && handlePeerSendFile(peer_id, remoteFileShareBtn.id);
            // handle remote video - audio URL
            buttons.remote.showShareVideoAudioBtn && handlePeerVideoAudioUrl(peer_id, remoteVideoAudioUrlBtn.id);

            // show status menu
            toggleClassElements('statusMenu', 'inline');

            // notify if peer started to recording own screen + audio
            if (peer_rec_status) notifyRecording(peer_id, peer_name, peer_avatar, 'Started');

            // Handle different video/screen states
            if (!peer_video_status && !peer_screen_status) {
                // Camera OFF, Screen OFF - show avatar
                console.log('[LOAD REMOTE] Camera OFF, Screen OFF - showing avatar');
                videoIsOff();
            } else if (!peer_video_status && peer_screen_status) {
                // Camera OFF, Screen ON - show avatar on video tile, screen tile will be created when track arrives
                console.log('[LOAD REMOTE] Camera OFF, Screen ON - showing avatar, waiting for screen track');
                videoIsOff();
            } else if (peer_video_status && !peer_screen_status) {
                // Camera ON, Screen OFF - video track will show
                console.log('[LOAD REMOTE] Camera ON, Screen OFF - video track active');
                // Avatar hidden by default, video track will display
            } else {
                // Both camera and screen on
                console.log('[LOAD REMOTE] Both Camera and Screen ON');
            }

            function videoIsOff() {
                displayElements([
                    { element: remoteMedia, display: false },
                    { element: remoteVideoAvatarImage, display: true, mode: 'block' },
                ]);
                setMediaButtonsClass([{ element: remoteVideoStatusIcon, status: false, mediaType: 'video' }]);
                const spinner = remoteVideoWrap.querySelector('.video-loading-spinner');
                if (spinner) elemDisplay(spinner, false);
            }
            break;
        case 'screen':
            console.log('SETUP REMOTE SCREEN STREAM');

            // Remote screen elements
            const remoteScreenWrap = document.createElement('div');
            const remoteScreenMedia = document.createElement('video');

            // html elements
            const remoteScreenNavBar = document.createElement('div');
            const remoteScreenPeerName = document.createElement('p');
            const remoteScreenToImgBtn = document.createElement('button');
            const remoteScreenFullScreenBtn = document.createElement('button');
            const remoteScreenPinBtn = document.createElement('button');
            const remoteScreenFocusBtn = document.createElement('button');
            const remoteScreenZoomInBtn = document.createElement('button');
            const remoteScreenZoomOutBtn = document.createElement('button');
            const remoteScreenPiPBtn = document.createElement('button');
            const remoteScreenVideoAudioUrlBtn = document.createElement('button');
            const remoteScreenFileShareBtn = document.createElement('button');
            const remoteScreenPrivateMsgBtn = document.createElement('button');
            const remoteScreenAvatarImage = document.createElement('img');

            // IDs and classes
            remoteScreenPeerName.setAttribute('id', peer_id + '_screen_name');
            remoteScreenPeerName.className = 'videoPeerName notranslate fadein';
            remoteScreenPeerName.appendChild(document.createTextNode(peer_name + ' (screen)'));

            remoteScreenPrivateMsgBtn.setAttribute('id', peer_id + '_screen_privateMsg');
            remoteScreenPrivateMsgBtn.className = className.msgPrivate;

            remoteScreenFileShareBtn.setAttribute('id', peer_id + '_screen_shareFile');
            remoteScreenFileShareBtn.className = className.shareFile;

            remoteScreenVideoAudioUrlBtn.setAttribute('id', peer_id + '_screen_videoAudioUrl');
            remoteScreenVideoAudioUrlBtn.className = className.shareVideoAudio;

            remoteScreenToImgBtn.setAttribute('id', peer_id + '_screen_to_img');
            remoteScreenToImgBtn.className = className.snapShot;

            remoteScreenFullScreenBtn.setAttribute('id', peer_id + '_screen_fullScreen');
            remoteScreenFullScreenBtn.className = className.fullScreen;

            remoteScreenZoomInBtn.setAttribute('id', peer_id + 'screenZoomIn');
            remoteScreenZoomInBtn.className = className.zoomIn;
            remoteScreenZoomOutBtn.setAttribute('id', peer_id + 'screenZoomOut');
            remoteScreenZoomOutBtn.className = className.zoomOut;

            remoteScreenPiPBtn.setAttribute('id', peer_id + 'screenPIP');
            remoteScreenPiPBtn.className = className.pip;

            remoteScreenFocusBtn.setAttribute('id', peer_id + '_screen_focusMode');
            remoteScreenFocusBtn.className = className.hideAll;

            remoteScreenPinBtn.setAttribute('id', peer_id + '_screen_pinUnpin');
            remoteScreenPinBtn.className = className.pinUnpin;

            if (!isMobileDevice) {
                setTippy(remoteScreenPeerName, 'Participant screen', 'bottom');
                setTippy(remoteScreenVideoAudioUrlBtn, 'Send Video or Audio', 'bottom');
                setTippy(remoteScreenPrivateMsgBtn, 'Open private conversation', 'bottom');
                setTippy(remoteScreenFileShareBtn, 'Send file', 'bottom');
                setTippy(remoteScreenToImgBtn, 'Take a snapshot', 'bottom');
                setTippy(remoteScreenFullScreenBtn, 'Full screen mode', 'bottom');
                setTippy(remoteScreenZoomInBtn, 'Zoom in screen', 'bottom');
                setTippy(remoteScreenZoomOutBtn, 'Zoom out screen', 'bottom');
                setTippy(remoteScreenPiPBtn, 'Toggle picture in picture', 'bottom');
                setTippy(remoteScreenFocusBtn, 'Toggle Focus mode', 'bottom');
                setTippy(remoteScreenPinBtn, 'Toggle Pin screen', 'bottom');
            }

            remoteScreenAvatarImage.setAttribute('id', peer_id + '_screen_avatar');
            remoteScreenAvatarImage.className = 'videoAvatarImage';

            remoteScreenNavBar.className = 'navbar fadein';
            !isMobileDevice && remoteScreenNavBar.appendChild(remoteScreenPinBtn);

            buttons.remote.showVideoFocusBtn && remoteScreenNavBar.appendChild(remoteScreenFocusBtn);

            buttons.remote.showSnapShotBtn && remoteScreenNavBar.appendChild(remoteScreenToImgBtn);

            remoteScreenNavBar.appendChild(remoteScreenPiPBtn);
            if (buttons.remote.showZoomInOutBtn) {
                remoteScreenNavBar.appendChild(remoteScreenZoomInBtn);
                remoteScreenNavBar.appendChild(remoteScreenZoomOutBtn);
            }
            isVideoFullScreenSupported && remoteScreenNavBar.appendChild(remoteScreenFullScreenBtn);

            buttons.remote.showPrivateMessageBtn && remoteScreenNavBar.appendChild(remoteScreenPrivateMsgBtn);
            buttons.remote.showFileShareBtn && remoteScreenNavBar.appendChild(remoteScreenFileShareBtn);
            buttons.remote.showShareVideoAudioBtn && remoteScreenNavBar.appendChild(remoteScreenVideoAudioUrlBtn);

            remoteScreenMedia.setAttribute('id', peer_id + '___screen');
            remoteScreenMedia.setAttribute('playsinline', true);
            remoteScreenMedia.autoplay = true;
            remoteScreenMedia.muted = true; // audio is handled by a separate <audio> element; muting allows autoplay on Safari
            remoteScreenMedia.controls = remoteMediaControls;
            remoteScreenMedia.style.objectFit = 'contain';
            remoteScreenMedia.style.name = peer_id + '_typeScreen';

            remoteScreenWrap.className = 'Screen';
            remoteScreenWrap.setAttribute('id', peer_id + '_screenWrap');
            remoteScreenWrap.style.display = isHideALLVideosActive ? 'none' : 'block';

            remoteScreenWrap.appendChild(remoteScreenNavBar);
            remoteScreenWrap.appendChild(remoteScreenAvatarImage);
            remoteScreenWrap.appendChild(remoteScreenMedia);
            remoteScreenWrap.appendChild(remoteScreenPeerName);

            createVideoLoadingSpinner(remoteScreenWrap, remoteScreenMedia);

            // need later on disconnect or remove peers
            peerScreenMediaElements[remoteScreenMedia.id] = remoteScreenWrap;

            videoMediaContainer.appendChild(remoteScreenWrap);
            attachMediaStream(remoteScreenMedia, stream);
            // Explicitly play – required on mobile Safari where autoplay alone is not enough
            remoteScreenMedia.play().catch(() => {});
            adaptAspectRatio();

            // handle remote private messages
            buttons.remote.showPrivateMessageBtn &&
                handlePeerPrivateMsg(peer_id, peer_name, remoteScreenPrivateMsgBtn.id);
            // handle remote send file
            buttons.remote.showFileShareBtn && handlePeerSendFile(peer_id, remoteScreenFileShareBtn.id);
            // handle remote video - audio URL
            buttons.remote.showShareVideoAudioBtn && handlePeerVideoAudioUrl(peer_id, remoteScreenVideoAudioUrlBtn.id);

            // screen to image
            buttons.remote.showSnapShotBtn && handleVideoToImg(remoteScreenMedia.id, remoteScreenToImgBtn.id);

            // pin/unpin video
            handleVideoPinUnpin(remoteScreenMedia.id, remoteScreenPinBtn.id, remoteScreenWrap.id, peer_id, true);

            // handle video focus mode
            handleVideoFocusMode(remoteScreenFocusBtn, remoteScreenWrap, remoteScreenMedia);

            // pin video on screen share
            remoteScreenPinBtn.click();

            if (showVideoPipBtn && buttons.remote.showVideoPipBtn)
                handlePictureInPicture(remoteScreenPiPBtn.id, remoteScreenMedia.id, peer_id);

            ZOOM_IN_OUT_ENABLED &&
                handleVideoZoomInOut(
                    '',
                    remoteScreenWrap.id,
                    remoteScreenZoomInBtn.id,
                    remoteScreenZoomOutBtn.id,
                    remoteScreenMedia.id,
                    peer_id
                );

            isVideoFullScreenSupported &&
                handleVideoPlayerFs(remoteScreenMedia.id, remoteScreenFullScreenBtn.id, peer_id);
            break;
        case 'audio':
            // alert('remote audio');
            console.log('SETUP REMOTE AUDIO STREAM');
            // handle remote audio elements
            const remoteAudioWrap = document.createElement('div');
            const remoteAudioMedia = document.createElement('audio');
            const remoteAudioVolumeId = peer_id + '_audioVolume';
            const remoteAudioVolumeEl = getId(remoteAudioVolumeId);
            remoteAudioMedia.id = peer_id + '___audio';
            remoteAudioMedia.volume = 1.0;
            remoteAudioMedia.autoplay = true;
            remoteAudioMedia.controls = false;

            if (!hasAudioTrack(stream)) {
                remoteAudioMedia.muted = true;
            }

            remoteAudioWrap.appendChild(remoteAudioMedia);
            audioMediaContainer.appendChild(remoteAudioWrap);
            attachMediaStream(remoteAudioMedia, stream);
            peerAudioMediaElements[remoteAudioMedia.id] = remoteAudioWrap;

            // Explicitly play audio to ensure it starts (handles autoplay policies)
            remoteAudioMedia.play().catch((err) => {
                console.warn('[AUDIO] Autoplay prevented for ' + peer_name + ', waiting for user interaction:', err);
                handleAudioFallback(remoteAudioMedia, peer_name);
            });

            // Only wire volume control if the element exists
            if (remoteAudioVolumeEl && !isMobileDevice) {
                try {
                    handleAudioVolume(remoteAudioVolumeId, remoteAudioMedia.id);
                    elemDisplay(remoteAudioVolumeEl, peer_audio_status);
                } catch (e) {
                    console.warn('[AUDIO] handleAudioVolume failed for ' + peer_name, e);
                }
            }

            // Change audio output if supported and audioOutputSelect is present
            if (sinkId && audioOutputSelect && audioOutputSelect.value) {
                try {
                    await changeAudioDestination(remoteAudioMedia, false);
                } catch (e) {
                    console.warn('[AUDIO] changeAudioDestination failed for ' + peer_name, e);
                }
            }
            break;
        default:
            break;
    }
}

/**
 * Create a dropdown item for the navbar dropdown menu
 * @param {HTMLElement} btnEl the button element to trigger the action
 * @param {string} label the text label for the dropdown item
 * @param {HTMLElement} dropdownContent the dropdown content panel (appended to body)
 * @param {string} [color] optional color for the button and label
 */
function createDropdownItem(btnEl, label, dropdownContent, color) {
    const item = document.createElement('div');
    item.className = 'navbar-dropdown-item';
    item.appendChild(btnEl);
    const span = document.createElement('span');
    span.textContent = label;
    item.appendChild(span);
    if (color) {
        btnEl.style.setProperty('color', color, 'important');
        span.style.setProperty('color', color, 'important');
    }
    let dispatching = false;
    item.addEventListener('click', (e) => {
        if (dispatching) return;
        e.stopPropagation();
        dispatching = true;
        btnEl.click();
        dispatching = false;
        if (dropdownContent) dropdownContent.classList.remove('show');
    });
    return item;
}

/**
 * Handle dropdown hover/touch events for navbar dropdown menus
 * @param {HTMLElement} dropdownDiv the wrapper div
 * @param {HTMLElement} dropdownBtn the trigger button
 * @param {HTMLElement} dropdownContent the dropdown content panel (appended to body)
 */
function handleDropdownEvents(dropdownDiv, dropdownBtn, dropdownContent) {
    let closeTimer = null;

    function showDropdown() {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
        const rect = dropdownBtn.getBoundingClientRect();
        dropdownContent.style.top = rect.bottom + 2 + 'px';
        dropdownContent.style.right = window.innerWidth - rect.right + 'px';
        dropdownContent.style.left = 'auto';
        document.querySelectorAll('.navbar-dropdown-content.show').forEach((el) => {
            if (el !== dropdownContent) el.classList.remove('show');
        });
        dropdownContent.classList.add('show');
    }

    function scheduleClose() {
        if (closeTimer) clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
            dropdownContent.classList.remove('show');
            closeTimer = null;
        }, 200);
    }

    // Desktop: open on hover
    dropdownDiv.addEventListener('mouseenter', () => showDropdown());

    // Close with delay when mouse leaves both the button and the dropdown content
    dropdownDiv.addEventListener('mouseleave', (e) => {
        if (!dropdownContent.contains(e.relatedTarget)) {
            scheduleClose();
        }
    });
    dropdownContent.addEventListener('mouseenter', () => {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
    });
    dropdownContent.addEventListener('mouseleave', (e) => {
        if (!dropdownDiv.contains(e.relatedTarget)) {
            scheduleClose();
        }
    });

    // Mobile: toggle on tap
    dropdownBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropdownContent.classList.contains('show')) {
            dropdownContent.classList.remove('show');
        } else {
            showDropdown();
        }
    });
}

/**
 * Handle remote audio fallback
 * @param {object} audioMedia
 * @param {string} peer_name
 */
function handleAudioFallback(audioMedia, peer_name) {
    if (!audioMedia) return;
    // Fallback: play audio on first user interaction
    const playOnInteraction = () => {
        audioMedia
            .play()
            .then(() => {
                console.log('[AUDIO] Audio started after user interaction for ' + peer_name);
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('touchstart', playOnInteraction);
                document.removeEventListener('keydown', playOnInteraction);
            })
            .catch((e) => console.error('[AUDIO] Failed to play audio:', e));
    };
    document.addEventListener('click', playOnInteraction, { once: true });
    document.addEventListener('touchstart', playOnInteraction, { once: true });
    document.addEventListener('keydown', playOnInteraction, { once: true });
}

/**
 * Log stream settings info
 * @param {string} name function name called from
 * @param {object} stream media stream audio - video
 */
function logStreamSettingsInfo(name, stream) {
    if ((useVideo || isScreenStreaming) && hasVideoTrack(stream)) {
        const videoTrack = getVideoTrack(stream);
        if (videoTrack) {
            console.log(name, {
                video: {
                    label: videoTrack.label,
                    settings: videoTrack.getSettings(),
                },
            });
        }
    }
    if (useAudio && hasAudioTrack(stream)) {
        const audioTrack = getAudioTrack(stream);
        if (audioTrack) {
            console.log(name, {
                audio: {
                    label: audioTrack.label,
                    settings: audioTrack.getSettings(),
                },
            });
        }
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

    // Update the participants count badge
    if (participantsCountBadge) {
        participantsCountBadge.textContent = participantsCount;
        participantsCount > 1
            ? elemDisplay(participantsCountBadge, true, 'flex')
            : elemDisplay(participantsCountBadge, false);
    }

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
 * @param {string} peerAvatar
 */
function setPeerAvatarImgName(videoAvatarImageId, peerName, peerAvatar) {
    const videoAvatarImageElement = getId(videoAvatarImageId);
    if (!videoAvatarImageElement) return;
    videoAvatarImageElement.style.pointerEvents = 'none';

    // If a valid avatar image URL is provided
    if (peerAvatar && isValidAvatarURL(peerAvatar)) {
        videoAvatarImageElement.setAttribute('src', peerAvatar);
    }
    // If not, use SVG based on the email validity
    else if (useAvatarSvg) {
        const avatarImgSize = isMobileDevice ? 128 : 256;
        const avatarImgSvg = isValidEmail(peerName) ? genGravatar(peerName) : genAvatarSvg(peerName, avatarImgSize);
        videoAvatarImageElement.setAttribute('src', avatarImgSvg);
    }
    // Default fallback avatar
    else {
        videoAvatarImageElement.setAttribute('src', images.avatar);
    }
}

/**
 * Set Chat avatar image by peer name
 * @param {string} avatar position left/right
 * @param {string} peerName me or peer name
 * @param {string} peerAvatar me or peer avatar
 */
function setPeerChatAvatarImgName(avatar, peerName, peerAvatar) {
    const avatarImg =
        peerAvatar && isValidAvatarURL(peerAvatar)
            ? peerAvatar
            : isValidEmail(peerName)
              ? genGravatar(peerName)
              : genAvatarSvg(peerName, 32);

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

    if (!videoPlayer || !videoFullScreenBtn) return;

    // Prefer fullscreen on the wrapper tile (.Camera/.Screen) to avoid browser-specific fullscreen video behaviors
    const videoWrap = videoPlayer.closest('.Camera, .Screen') || videoPlayer.parentElement;
    const fsTarget = videoWrap || videoPlayer;

    // Detect if this fullscreen handler is attached to a screen-share tile
    const isScreenTile =
        !!videoPlayer.closest('.Screen') ||
        String(videoId).includes('___screen') ||
        String(videoPlayer.style?.name || '').includes('typeScreen');

    const getFsElement = () =>
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        null;

    const requestFs = (el) => {
        if (!el) return;
        if (el.requestFullscreen) return el.requestFullscreen();
        if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
        if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
        if (el.msRequestFullscreen) return el.msRequestFullscreen();
    };

    const exitFs = () => {
        if (document.exitFullscreen) return document.exitFullscreen();
        if (document.webkitCancelFullScreen) return document.webkitCancelFullScreen();
        if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
        if (document.msExitFullscreen) return document.msExitFullscreen();
    };

    const sync = () => {
        // if Controls enabled, or document on FS do nothing
        if (videoPlayer.controls || isDocumentOnFullScreen) return;

        const fsEl = getFsElement();
        isVideoOnFullScreen = !!fsEl;

        const isThisTargetFullscreen = fsEl === fsTarget || fsEl === videoPlayer;
        videoPlayer.style.pointerEvents = isThisTargetFullscreen ? 'none' : 'auto';
    };

    // Attach fullscreen sync listeners once per video element
    if (!videoPlayer.dataset.fsSyncAttached) {
        videoPlayer.dataset.fsSyncAttached = '1';
        document.addEventListener('fullscreenchange', sync);
        document.addEventListener('webkitfullscreenchange', sync);
        document.addEventListener('mozfullscreenchange', sync);
        document.addEventListener('MSFullscreenChange', sync);
    }

    // on button click go on FS mobile/desktop
    videoFullScreenBtn.addEventListener('click', (e) => {
        if (videoPlayer.classList.contains('videoCircle')) {
            return userLog('toast', 'Full Screen not allowed if video on privacy mode');
        }
        gotoFS();
        setTimeout(sync, 0);
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
        // handle remote peer video/screen fs
        if (peer_id !== null) {
            if (isScreenTile) {
                const remoteScreenStatusBtn = getId(peer_id + '_screenStatus');
                if (!remoteScreenStatusBtn || remoteScreenStatusBtn.className === className.videoOn) {
                    handleFSVideo();
                } else {
                    showMsg();
                }
                return;
            }

            const remoteVideoStatusBtn = getId(peer_id + '_videoStatus');
            if (remoteVideoStatusBtn && remoteVideoStatusBtn.className === className.videoOn) {
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

        const fsEl = getFsElement();
        const isThisTargetFullscreen = fsEl === fsTarget || fsEl === videoPlayer;

        if (!fsEl) {
            requestFs(fsTarget);
        } else if (isThisTargetFullscreen) {
            exitFs();
        } else {
            // Exit the current fullscreen first, then enter fullscreen for this target
            Promise.resolve(exitFs()).finally(() => requestFs(fsTarget));
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
                cam.className = isScreen ? 'Screen' : 'Camera';
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
function handleVideoZoomInOut(statusId, videoWrapId, zoomInBtnId, zoomOutBtnId, mediaId, peerId = null) {
    const id = statusId;
    const videoWrap = getId(videoWrapId);
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
        return videoStatusBtn && videoStatusBtn.className === className.videoOff;
    }
    function isVideoPrivacyMode() {
        return video && video.classList.contains('videoCircle');
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
    if (video) {
        video.addEventListener('leavepictureinpicture', (event) => {
            console.log('Exited PiP mode');
            // Check if the video is paused
            if (video.paused) {
                // Play the video again
                video.play().catch((error) => {
                    console.error('Error playing video after exit PIP mode:', error);
                });
            }
        });
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
        (isVideoPinned &&
            (pinnedVideoPlayerId == peer_id + '___video' ||
                pinnedVideoPlayerId == peer_id + '___screen' ||
                pinnedVideoPlayerId == peer_id)) ||
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
    const videoTIBtn = getId(videoToImgBtn);
    const video = getId(videoStream);
    videoTIBtn.addEventListener('click', () => {
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
    let callStartTime = Date.now();
    let callElapsedSecondsTime = 0;
    elemDisplay(mySessionTime, true);
    setInterval(function printTime() {
        callElapsedSecondsTime++;
        let callElapsedTime = Date.now() - callStartTime;
        mySessionTime.innerText = getTimeToString(callElapsedTime);
        const myCurrentSessionTime = getId('myCurrentSessionTime');
        if (myCurrentSessionTime) {
            myCurrentSessionTime.innerText = secondsToHms(callElapsedSecondsTime);
        }
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
    setParticipantsBtn();
    setCaptionRoomBtn();
    setRoomEmojiButton();
    setChatEmojiBtn();
    setMyWhiteboardBtn();
    setSnapshotRoomBtn();
    setMyFileShareBtn();
    setDocumentPiPBtn();
    setMySettingsBtn();
    setMySettingsExtraBtns();
    setAboutBtn();

    // Buttons bottom
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
    shareRoomBtn.addEventListener('mouseenter', () => {
        if (isMobileDevice || !buttons.main.showShareQr) return;
        elemDisplay(qrRoomPopupContainer, true);
        screenReaderAccessibility.announceMessage('Room QR code displayed');
    });
    shareRoomBtn.addEventListener('mouseleave', () => {
        if (isMobileDevice || !buttons.main.showShareQr) return;
        elemDisplay(qrRoomPopupContainer, false);
        screenReaderAccessibility.announceMessage('Room QR code hidden');
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
        displayElements([
            { element: initScreenShareBtn, display: false },
            { element: screenShareBtn, display: false },
            { element: screenFpsDiv, display: false },
        ]);
    }
}

/**
 * Start - Stop Stream recording
 */
function setRecordStreamBtn() {
    recordStreamBtn.addEventListener('click', (e) => {
        isStreamRecording ? stopStreamRecording() : startStreamRecording();
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
        buttons.main.showFullScreenBtn &&
        (document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.mozFullScreenEnabled ||
            document.msFullscreenEnabled);

    if (fsSupported) {
        // detect esc from full screen mode
        document.addEventListener('fullscreenchange', (e) => {
            const fullScreenIcon = fullScreenBtn.querySelector('i');

            let fullscreenElement = document.fullscreenElement;
            if (!fullscreenElement) {
                fullScreenIcon.className = className.fsOff;
                isDocumentOnFullScreen = false;
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
    setActiveConversation('public');
    ensureChatGPTConversationEntry();

    msgerRoomChatItem?.addEventListener('click', () => {
        setActiveConversation('public');
        msgerDraggable.classList.remove('msger-pinned-sidebar-open');
        msgerCPBtn.classList.remove('active');
        syncChatToolbarButtons();
        msgerInput.focus();
        msgerChat.scrollTop = msgerChat.scrollHeight;
    });

    msgerSidebarCloseBtn?.addEventListener('click', () => {
        msgerDraggable.classList.remove('msger-pinned-sidebar-open');
        msgerCPBtn.classList.remove('active');
        syncChatToolbarButtons();
        closeAllMsgerParticipantDropdownMenus();
    });

    window.addEventListener('resize', () => {
        closeAllMsgerParticipantDropdownMenus();
        if (isChatRoomVisible) {
            if (isMobileDevice) {
                if (isChatPinned) {
                    chatUnpin();
                }
                setSP('--msger-width', '99%');
                setSP('--msger-height', '99%');
                elemDisplay(msgerTogglePin, false);
            }
            syncParticipantsPanelVisibility();
        }
    });

    // Search peer by name
    searchPeerBarName.addEventListener('keyup', () => {
        searchPeer();
    });
    document.addEventListener('pointerdown', handleMsgerDropdownOutsidePress);
    document.addEventListener('click', handleMsgerDropdownOutsidePress);
    document.addEventListener('pointerdown', handleMsgerParticipantDropdownDocumentClick);
    document.addEventListener('click', handleMsgerParticipantDropdownDocumentClick);
    msgerCPList?.addEventListener('scroll', closeAllMsgerParticipantDropdownMenus);

    // open hide chat room
    chatRoomBtn.addEventListener('click', (e) => {
        !isChatRoomVisible ? showChatRoomDraggable() : hideChatRoomAndEmojiPicker();
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

    // dropdown participants menus
    msgerCPDropDownMenuBtn?.addEventListener('click', () => {
        toggleParticipantsDropDownMenu(msgerCPDropDownContent, msgerSidebarDropDownContent);
    });

    msgerSidebarDropDownMenuBtn?.addEventListener('click', () => {
        toggleParticipantsDropDownMenu(msgerSidebarDropDownContent, msgerCPDropDownContent);
    });

    // show msger participants section
    msgerCPBtn.addEventListener('click', () => {
        if (isChatPinned) {
            const isOpen = msgerDraggable.classList.toggle('msger-pinned-sidebar-open');
            msgerCPBtn.classList.toggle('active', isOpen);
            syncChatToolbarButtons();
            if (isOpen) {
                searchPeerBarName?.focus();
            } else {
                closeAllMsgerParticipantDropdownMenus();
            }
            return;
        }
        if (shouldDockParticipantsPanel()) {
            syncParticipantsPanelVisibility(true);
            return;
        }
        syncParticipantsPanelVisibility(!isParticipantsVisible);
    });

    // hide msger participants section
    msgerCPCloseBtn.addEventListener('click', () => {
        syncParticipantsPanelVisibility(false);
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

    // share file from chat
    msgerShareFileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const shareTarget = getConversationShareTarget('a file');
        if (!shareTarget) return;
        selectFileToShare(shareTarget.peerId, shareTarget.broadcast, shareTarget.peerName);
    });

    // open Video Url Player
    msgerVideoUrlBtn.addEventListener('click', (e) => {
        const shareTarget = getConversationShareTarget('video or audio');
        if (!shareTarget) return;
        sendVideoUrl(shareTarget.videoPeerId, shareTarget.peerName, shareTarget.broadcast);
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
        if (isChatPasteTxt) return;
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
 * Participants room buttons click event
 */
function setParticipantsBtn() {
    participantsBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const openedChatForParticipants = !isChatRoomVisible;

        if (!isMobileDevice && canBePinned()) {
            if (isCaptionPinned) {
                userLog('toast', 'Please unpin the Caption that appears to be currently pinned');
                return;
            }

            if (isChatRoomVisible && isChatPinned && msgerDraggable.classList.contains('msger-pinned-sidebar-open')) {
                if (isChatOpenedByParticipantsBtn) {
                    hideChatRoomAndEmojiPicker();
                    isChatOpenedByParticipantsBtn = false;
                    return;
                }

                msgerDraggable.classList.remove('msger-pinned-sidebar-open');
                msgerCPBtn.classList.remove('active');
                syncChatToolbarButtons();
                closeAllMsgerParticipantDropdownMenus();
                screenReaderAccessibility.announceMessage('Participants list closed');
                return;
            }

            msgerDraggable.classList.add('msger-pinned-sidebar-open');

            isOpeningParticipants = true;
            msgerCPBtn.classList.add('active');

            !isChatRoomVisible ? showChatRoomDraggable() : syncChatToolbarButtons();

            isChatOpenedByParticipantsBtn = openedChatForParticipants;

            if (!isChatPinned) {
                chatPin();
            }

            // Wait for the panel-slide-in animation to play before overlaying the participants sidebar.
            await sleep(500);

            msgerCPBtn.classList.add('active');
            isOpeningParticipants = false;
            syncChatToolbarButtons();
            searchPeerBarName?.focus();
            screenReaderAccessibility.announceMessage('Participants list opened');
            return;
        }

        if (!isChatRoomVisible) {
            showChatRoomDraggable();
        }

        const shouldShowParticipants = !isParticipantsVisible;
        const shouldHideChatWithParticipants = !shouldShowParticipants && isChatOpenedByParticipantsBtn;

        if (shouldHideChatWithParticipants) {
            hideChatRoomAndEmojiPicker();
            isChatOpenedByParticipantsBtn = false;
            return;
        }

        isChatOpenedByParticipantsBtn = shouldShowParticipants ? openedChatForParticipants : false;

        syncParticipantsPanelVisibility(shouldShowParticipants);

        if (shouldShowParticipants) {
            searchPeerBarName?.focus();
            screenReaderAccessibility.announceMessage('Participants list opened');
            return;
        }

        screenReaderAccessibility.announceMessage('Participants list closed');
    });
}

function openPinnedParticipantsSidebar(announce = false) {
    if (!isChatPinned) {
        return;
    }

    msgerDraggable.classList.add('msger-pinned-sidebar-open');
    msgerCPBtn.classList.add('active');
    searchPeerBarName?.focus();

    if (announce) {
        screenReaderAccessibility.announceMessage('Pinned chat participants opened');
    }
}

/**
 * Caption room buttons click event
 */
function setCaptionRoomBtn() {
    if (buttons.main.showCaptionRoomBtn) {
        // open hide caption
        captionBtn.addEventListener('click', (e) => {
            !isCaptionBoxVisible ? showCaptionDraggable() : hideCaptionBox();
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

        // dropdown caption menu
        // Prevent drag handler on captionHeader from intercepting dropdown interactions
        captionDropDownContent.addEventListener('mousedown', (e) => e.stopPropagation());
        captionDropDownMenuBtn.addEventListener('mousedown', (e) => e.stopPropagation());

        captionDropDownMenuBtn.addEventListener('click', () => {
            toggleCaptionDropDownMenu();
        });

        // transcript show on message
        transcriptShowOnMsgEl.addEventListener('change', (e) => {
            playSound('switch');
            transcriptShowOnMsg = e.currentTarget.checked;
            transcriptShowOnMsg
                ? msgPopup('info', 'Caption will be shown, when you receive a new transcript', 'top-end', 3000)
                : msgPopup('info', 'Caption will not be shown, when you receive a new transcript', 'top-end', 3000);
            lsSettings.transcript_show_on_msg = transcriptShowOnMsg;
            lS.setSettings(lsSettings);
        });

        // transcript send to all
        transcriptSendToAllEl.addEventListener('change', (e) => {
            playSound('switch');
            transcriptSendToAll = e.currentTarget.checked;
            transcriptSendToAll
                ? msgPopup('info', 'Transcription will be sent to all participants', 'top-end', 3000)
                : msgPopup('info', 'Transcription will not be sent to participants', 'top-end', 3000);
            lsSettings.transcript_send_to_all = transcriptSendToAll;
            lS.setSettings(lsSettings);
        });

        // close caption box - show left button and status menu if hide
        captionClose.addEventListener('click', (e) => {
            captionMinimize();
            hideCaptionBox();
            showButtonsBarAndMenu();
        });

        // hide it
        elemDisplay(speechRecognitionStop, false);

        if (speechRecognition) {
            // start recognition speech
            speechRecognitionStart.addEventListener('click', (e) => {
                startSpeech();
            });
            // stop recognition speech
            speechRecognitionStop.addEventListener('click', (e) => {
                stopSpeech();
            });
        } else {
            elemDisplay(captionFooter, false);
        }
    } else {
        elemDisplay(captionBtn, false);
        // https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API#browser_compatibility
    }
}

/**
 * Set room emoji reaction button
 */
function setRoomEmojiButton() {
    // Map sound emojis to their shortcodes for sound playback
    const soundEmojis = [
        { emoji: '👍', shortcodes: ':+1:' },
        { emoji: '👎', shortcodes: ':-1:' },
        { emoji: '👌', shortcodes: ':ok_hand:' },
        { emoji: '😀', shortcodes: ':grinning:' },
        { emoji: '😃', shortcodes: ':smiley:' },
        { emoji: '😂', shortcodes: ':joy:' },
        { emoji: '😘', shortcodes: ':kissing_heart:' },
        { emoji: '❤️', shortcodes: ':heart:' },
        { emoji: '🎺', shortcodes: ':trumpet:' },
        { emoji: '🎉', shortcodes: ':tada:' },
        { emoji: '😮', shortcodes: ':open_mouth:' },
        { emoji: '👏', shortcodes: ':clap:' },
        { emoji: '✨', shortcodes: ':sparkles:' },
        { emoji: '⭐', shortcodes: ':star:' },
        { emoji: '🌟', shortcodes: ':star2:' },
        { emoji: '💫', shortcodes: ':dizzy:' },
        { emoji: '🚀', shortcodes: ':rocket:' },
    ];

    // Header with close button
    const header = document.createElement('div');
    header.className = 'room-emoji-header';

    const title = document.createElement('span');
    title.textContent = 'Emoji Picker';
    title.className = 'room-emoji-title';

    // Create a close button for the emoji picker
    const closeBtn = document.createElement('button');
    closeBtn.className = 'room-emoji-close-btn';
    closeBtn.innerHTML = icons.close;

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Tabs (less invasive style)
    const tabContainer = document.createElement('div');
    tabContainer.className = 'room-emoji-tab-container';

    const allTab = document.createElement('button');
    allTab.textContent = 'All';
    allTab.className = 'room-emoji-tab active';

    const soundTab = document.createElement('button');
    soundTab.textContent = 'Sounds';
    soundTab.className = 'room-emoji-tab';

    tabContainer.appendChild(allTab);
    tabContainer.appendChild(soundTab);

    // EmojiMart picker (default)
    const emojiMartDiv = document.createElement('div');
    emojiMartDiv.className = 'room-emoji-mart';
    const pickerRoomOptions = {
        theme: 'dark',
        onEmojiSelect: sendEmojiToRoom,
    };
    const emojiRoomPicker = new EmojiMart.Picker(pickerRoomOptions);
    emojiMartDiv.appendChild(emojiRoomPicker);

    // Custom sound emoji grid (6 per row, circular hover effect)
    const emojiGrid = document.createElement('div');
    emojiGrid.className = 'room-emoji-grid';

    // Set grid layout only when visible
    function showEmojiGrid() {
        emojiGrid.classList.add('visible');
    }
    function hideEmojiGrid() {
        emojiGrid.classList.remove('visible');
    }

    soundEmojis.forEach(({ emoji, shortcodes }) => {
        const btn = document.createElement('button');
        btn.textContent = emoji;
        btn.className = 'room-emoji-btn';
        btn.onclick = () => sendEmojiToRoom({ native: emoji, shortcodes });
        emojiGrid.appendChild(btn);
    });

    // Tab switching
    allTab.onclick = () => {
        allTab.classList.add('active');
        soundTab.classList.remove('active');
        emojiMartDiv.style.display = 'block';
        hideEmojiGrid();
    };
    soundTab.onclick = () => {
        soundTab.classList.add('active');
        allTab.classList.remove('active');
        emojiMartDiv.style.display = 'none';
        showEmojiGrid();
    };

    // Picker container
    emojiPickerContainer.innerHTML = '';
    emojiPickerContainer.appendChild(header);
    emojiPickerContainer.appendChild(tabContainer);
    emojiPickerContainer.appendChild(emojiMartDiv);
    emojiPickerContainer.appendChild(emojiGrid);
    elemDisplay(emojiPickerContainer, false);

    if (!isMobileDevice) {
        dragElement(emojiPickerContainer, header);
    }

    roomEmojiPickerBtn.addEventListener('click', (e) => {
        toggleEmojiPicker();
    });
    closeBtn.addEventListener('click', (e) => {
        toggleEmojiPicker();
    });

    function sendEmojiToRoom(data) {
        const message = {
            type: 'roomEmoji',
            room_id: roomId,
            peer_name: myPeerName,
            emoji: data.native,
            shortcodes: data.shortcodes,
        };
        if (thereArePeerConnections()) {
            sendToServer('message', message);
        }
        handleEmoji(message);
    }

    function toggleEmojiPicker() {
        const roomEmojiPickerIcon = roomEmojiPickerBtn.querySelector('i');
        if (emojiPickerContainer.style.display === 'block') {
            elemDisplay(emojiPickerContainer, false);
            setColor(roomEmojiPickerIcon, 'var(--btn-bar-bg-color)');
        } else {
            emojiPickerContainer.style.display = 'block';
            setColor(roomEmojiPickerIcon, 'yellow');
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

    handleClickOutside(emojiPicker, msgerEmojiBtn, () => {
        if (isChatEmojiVisible) {
            elemDisplay(msgerEmojiPicker, false);
            setColor(msgerEmojiBtn, '#FFFFFF');
            isChatEmojiVisible = false;
        }
    });
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
        whiteboardResetAllMode();
        whiteboardIsPencilMode(true);
    });
    whiteboardObjectBtn.addEventListener('click', (e) => {
        whiteboardResetAllMode();
        whiteboardIsObjectMode(true);
    });
    whiteboardStickyNoteBtn.addEventListener('click', (e) => {
        whiteboardAddObj('stickyNote');
    });
    whiteboardVanishingBtn.addEventListener('click', (e) => {
        whiteboardResetAllMode();
        whiteboardIsVanishingMode(true);
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
        whiteboardResetAllMode();
        whiteboardIsEraserMode(true);
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
        whiteboardResetAllMode();
        whiteboardIsPencilMode(true);
    });
    wbBackgroundColorEl.addEventListener('change', (e) => {
        setWhiteboardBgColor(wbBackgroundColorEl.value);
    });
    whiteboardGhostButton.addEventListener('click', (e) => {
        wbIsBgTransparent = !wbIsBgTransparent;
        //setWhiteboardBgColor(wbIsBgTransparent ? 'rgba(0, 0, 0, 0.100)' : wbBackgroundColorEl.value);
        wbIsBgTransparent ? wbCanvasBackgroundColor('rgba(0, 0, 0, 0.100)') : setTheme();
    });
    // Canvas Grid
    if (isDesktopDevice) {
        whiteboardGridBtn.addEventListener('click', (e) => {
            toggleCanvasGrid();
        });
    } else {
        elemDisplay(whiteboardGridBtn, false);
    }
    whiteboardShortcutsBtn.addEventListener('click', (e) => {
        showWhiteboardShortcuts();
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
        dragElement(sendFileDiv, sendFileDragHandle);
        dragElement(receiveFileDiv, receiveFileDragHandle);
    }

    fileShareBtn.addEventListener('click', (e) => {
        //window.open("https://fromsmash.com"); // for Big Data
        const shareTarget = getConversationShareTarget('a file');
        if (!shareTarget) return;
        selectFileToShare(shareTarget.peerId, shareTarget.broadcast, shareTarget.peerName);
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
 * Restart documentPictureInPicture
 * @returns void
 */
async function documentPictureInPictureRestart() {
    if (!showDocumentPipBtn || !documentPictureInPicture.window) return;
    documentPictureInPictureClose();
    setTimeout(async () => {
        await documentPictureInPictureOpen();
    }, 300);
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

                // get video element
                const videoPlayer = getId(video.id);

                const isLocalVideo = video.id === 'myVideo';

                const isPIPAllowed = !videoPlayer.classList.contains('videoCircle'); // not in privacy mode

                // Check if video can be add on pipVideo
                isLocalVideo
                    ? console.log('DOCUMENT PIP LOCAL: PiP allowed? -----> ' + isPIPAllowed)
                    : console.log('DOCUMENT PIP REMOTE: PiP allowed? -----> ' + isPIPAllowed);

                if (!isPIPAllowed) return;

                // Video is ON and not in privacy mode continue....

                foundVideo = true;

                const pipVideo = document.createElement('video');

                pipVideo.classList.add('pipVideo');
                pipVideo.classList.toggle('mirror', video.classList.contains('mirror'));
                pipVideo.srcObject = video.srcObject;
                pipVideo.autoplay = true;
                pipVideo.muted = true;

                pipVideoContainer.append(pipVideo);

                function observeElementClassChanges(element, observerName) {
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                                console.log(
                                    `${observerName}: Element ${mutation.target.id} class changed:`,
                                    mutation.target.className
                                );
                                cloneVideoElements(); // Or other desired function
                            }
                        });
                    });

                    observer.observe(element, { attributes: true, attributeFilter: ['class'] });
                    return observer;
                }

                // Start observing for new videos and class changes (Video Privacy ON/OFF)
                if (video) observeElementClassChanges(video, 'Video');

                // Get videoStatus...
                const parts = video.id.split('___');
                const peer_id = parts[0];
                const videoStatus = getId(isLocalVideo ? 'myVideoStatusIcon' : peer_id + '_videoStatus');

                // Start observing for new videosStatus and class changes (video ON/OFF)
                if (videoStatus) observeElementClassChanges(videoStatus, 'VideoStatus');
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
            elemDisplay(bottomButtons, false);
            isButtonsVisible = false;
        }
        hideShowMySettings();
    });
    mySettingsCloseBtn.addEventListener('click', (e) => {
        hideShowMySettings();
    });
    speakerTestBtn.addEventListener('click', (e) => {
        playSpeaker(audioOutputSelect?.value, 'speaker');
    });
    myPeerNameSetBtn.addEventListener('click', (e) => {
        updateMyPeerName();
    });
    myProfileAvatarUploadBtn.addEventListener('click', async () => {
        await updateMyPeerAvatarByUrl();
    });
    myProfileAvatarResetBtn.addEventListener('click', () => {
        resetMyPeerAvatarInMemory();
    });
    updateMyAvatarResetButtonVisibility();
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
    switchKeepButtonsVisible.addEventListener('change', (e) => {
        isButtonsBarOver = isKeepButtonsVisible = e.currentTarget.checked;
        lsSettings.keep_buttons_visible = isButtonsBarOver;
        lS.setSettings(lsSettings);
        const status = isButtonsBarOver ? 'enabled' : 'disabled';
        userLog('toast', `Buttons always visible ${status}`);
        playSound('switch');
    });

    if (!isDesktopDevice) {
        elemDisplay(pinChatByDefaultRow, false);
    } else {
        switchPinChatByDefault.addEventListener('change', (e) => {
            pinChatByDefault = e.currentTarget.checked;
            lsSettings.pin_chat_by_default = pinChatByDefault;
            lS.setSettings(lsSettings);
            userLog('toast', `Chat opens pinned by default ${pinChatByDefault ? 'ON' : 'OFF'}`);
            playSound('switch');
        });
    }

    // WakeLock for mobile/tablet
    if (!isDesktopDevice && isWakeLockSupported()) {
        switchKeepAwake.addEventListener('change', (e) => {
            applyKeepAwake(e.currentTarget.checked);
            playSound('switch');
        });
    } else {
        elemDisplay(keepAwakeButton, false);
    }

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

    // Recording pause/resume
    pauseRecBtn.addEventListener('click', (e) => {
        pauseRecording();
    });
    resumeRecBtn.addEventListener('click', (e) => {
        resumeRecording();
    });
    // Styles
    keepCustomTheme.onchange = (e) => {
        themeCustom.keep = e.currentTarget.checked;
        themeSelect.disabled = themeCustom.keep;
        updateThemeCardsDisabled();
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
 * Settings extra buttons
 */
function setMySettingsExtraBtns() {
    // Settings Split Dropdown logic (desktop hover support)
    if (settingsSplit && settingsExtraDropdown && settingsExtraToggle && settingsExtraMenu) {
        let showTimeout;
        let hideTimeout;
        function showMenu() {
            clearTimeout(hideTimeout);
            updateSettingsExtraGroups();
            settingsExtraMenu.classList.remove('hidden');
            settingsExtraMenu.classList.add('show');
        }
        function hideMenu() {
            clearTimeout(showTimeout);
            settingsExtraMenu.classList.remove('show');
            settingsExtraMenu.classList.add('hidden');
        }
        // Toggle on click (arrow button)
        settingsExtraToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            !settingsExtraMenu.classList.contains('hidden') ? hideMenu() : showMenu();
        });

        // Desktop hover support
        const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (supportsHover) {
            let closeTimeout;
            const cancelClose = () => {
                if (!closeTimeout) return;
                clearTimeout(closeTimeout);
                closeTimeout = null;
            };
            const scheduleClose = () => {
                cancelClose();
                closeTimeout = setTimeout(() => hideMenu(), 180);
            };
            settingsExtraToggle.addEventListener('mouseenter', () => {
                cancelClose();
                showMenu();
            });
            settingsExtraToggle.addEventListener('mouseleave', scheduleClose);
            settingsExtraMenu.addEventListener('mouseenter', cancelClose);
            settingsExtraMenu.addEventListener('mouseleave', scheduleClose);
        }

        // Optional: close on click outside
        document.addEventListener('click', function (e) {
            if (!settingsExtraToggle.contains(e.target) && !settingsExtraMenu.contains(e.target)) {
                hideMenu();
            }
        });
    }
}

function updateSettingsExtraGroups() {
    settingsExtraMenu.querySelectorAll('.extra-menu-group').forEach((header) => {
        const ids = (header.dataset.buttons || '').split(',');
        const anyVisible = ids.some((id) => {
            const btn = document.getElementById(id.trim());
            return btn && !btn.classList.contains('hidden') && btn.style.display !== 'none';
        });
        header.style.display = anyVisible ? '' : 'none';
    });
    settingsExtraMenu.querySelectorAll('.extra-menu-divider').forEach((div) => {
        let prev = div.previousElementSibling;
        while (prev && !prev.classList.contains('extra-menu-group')) {
            prev = prev.previousElementSibling;
        }
        let next = div.nextElementSibling;
        while (next && !next.classList.contains('extra-menu-group')) {
            next = next.nextElementSibling;
        }
        const prevVisible = prev && prev.style.display !== 'none';
        const nextVisible = next && next.style.display !== 'none';
        div.style.display = prevVisible && nextVisible ? '' : 'none';
    });
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
        if (e && e.shiftKey) return leaveRoom();
        if (!isPresenter) return leaveRoom();
        toggleExitMenu();
    });
    if (exitLeaveBtn) exitLeaveBtn.onclick = handleExitLeave;
    if (exitLeaveAllBtn) exitLeaveAllBtn.onclick = handleExitLeaveForAll;
    document.addEventListener('click', handleExitMenuOutsideClick);
}

/**
 * Toggle the exit dropdown menu. The "End room for all" entry is
 * only available to the presenter.
 */
function toggleExitMenu() {
    if (!exitMenu) return leaveRoom();
    if (exitLeaveAllBtn) {
        isPresenter ? exitLeaveAllBtn.classList.remove('hidden') : exitLeaveAllBtn.classList.add('hidden');
    }
    exitMenu.classList.toggle('hidden');
}

function handleExitLeave() {
    if (exitMenu) exitMenu.classList.add('hidden');
    leaveRoom();
}

function handleExitLeaveForAll() {
    if (exitMenu) exitMenu.classList.add('hidden');
    leaveRoomForAll();
}

function handleExitMenuOutsideClick(e) {
    if (!exitDropdown || !exitMenu) return;
    if (exitMenu.classList.contains('hidden')) return;
    if (!exitDropdown.contains(e.target)) exitMenu.classList.add('hidden');
}

/**
 * Presenter: kick out all other peers, then leave the room.
 */
function leaveRoomForAll() {
    if (!isPresenter) return leaveRoom();
    try {
        if (allPeers && typeof allPeers === 'object') {
            for (const peer_id in allPeers) {
                if (!allPeers[peer_id]) continue;
                if (peer_id === myPeerId) continue;
                sendToServer('kickOut', {
                    room_id: roomId,
                    peer_id: peer_id,
                    peer_uuid: myPeerUUID,
                    peer_name: myPeerName,
                });
            }
        }
    } catch (err) {
        console.warn('[leaveRoomForAll] failed to kick all peers', err);
    }
    leaveRoom();
}

/**
 * Handle left buttons - status menù show - hide on body mouse move
 */
function handleBodyOnMouseMove() {
    document.body.addEventListener('mousemove', (e) => {
        showButtonsBarAndMenu();
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
    tabProfileBtn.addEventListener('click', (e) => {
        openTab(e, 'tabProfile');
    });
    tabShortcutsBtn.addEventListener('click', (e) => {
        openTab(e, 'tabShortcuts');
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
    // Fetch and display all active rooms with their participant counts
    activeRoomsBtn.addEventListener('click', () => {
        getActiveRooms();
    });
    // send invite by email to join room in a specified data-time
    roomSendEmailBtn.addEventListener('click', () => {
        shareRoomByEmail();
    });
    // tab media
    shareMediaAudioVideoBtn.addEventListener('click', (e) => {
        const shareTarget = getConversationShareTarget('video or audio');
        if (!shareTarget) return;
        sendVideoUrl(shareTarget.videoPeerId, shareTarget.peerName, shareTarget.broadcast);
    });
    // select audio input
    audioInputSelect.addEventListener('change', async () => {
        detectBluetoothHeadset();
        await changeLocalMicrophone(audioInputSelect.value);
        refreshLsDevices();
    });

    // audio options
    switchNoiseSuppression.onchange = async (e) => {
        if (!buttons.settings.customNoiseSuppression) return;
        const desired = e.currentTarget.checked;

        if (desired) {
            lsSettings.mic_noise_suppression = true;
            lS.setSettings(lsSettings);

            const ok = await enableNoiseSuppression();
            if (!ok) {
                lsSettings.mic_noise_suppression = false;
                lS.setSettings(lsSettings);
                switchNoiseSuppression.checked = false;
            } else {
                toastMessage('success', 'Noise suppression enabled');
            }
        } else {
            lsSettings.mic_noise_suppression = false;
            lS.setSettings(lsSettings);
            await disableNoiseSuppression(true);
            toastMessage('info', 'Noise suppression disabled');
        }
        switchNoiseSuppression.blur();
    };

    // select audio output
    audioOutputSelect.addEventListener('change', async () => {
        await changeAudioDestination();
        refreshLsDevices();
    });
    // select video input
    videoSelect.addEventListener('change', async () => {
        await changeLocalCamera(videoSelect.value);
        await handleLocalCameraMirror();
        await documentPictureInPictureRestart();
        refreshLsDevices();
    });
    // select video quality
    videoQualitySelect.addEventListener('change', async (e) => {
        await setLocalVideoQuality();
    });

    // Firefox may not handle well...
    if (isFirefox) {
        elemDisplay(videoFpsDiv, false);
    }

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

    document.querySelectorAll('.theme-card').forEach((card) => {
        card.onclick = () => {
            if (card.classList.contains('disabled')) return;
            const index = parseInt(card.dataset.index);
            themeSelect.selectedIndex = index;
            updateThemeCardsActive();
            if (themeCardDebounce) clearTimeout(themeCardDebounce);
            themeCardDebounce = setTimeout(() => {
                themeCardDebounce = null;
                themeSelect.dispatchEvent(new Event('change'));
            }, 200);
        };
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
    captionEveryoneBtn.addEventListener('click', (e) => {
        sendToServer('caption', {
            room_id: roomId,
            peer_name: myPeerName,
            action: 'start',
            data: {
                recognitionLanguageIndex: recognitionLanguage.selectedIndex,
                recognitionDialectIndex: recognitionDialect.selectedIndex,
            },
        });
        syncCaptionEveryoneButtons(true);
    });
    captionEveryoneStopBtn.addEventListener('click', (e) => {
        sendToServer('caption', {
            room_id: roomId,
            peer_name: myPeerName,
            action: 'stop',
        });
        syncCaptionEveryoneButtons(false);
    });
    muteEveryoneBtn.addEventListener('click', (e) => {
        disableAllPeers('audio');
    });
    hideEveryoneBtn.addEventListener('click', (e) => {
        disableAllPeers('video');
    });
    ejectEveryoneBtn.addEventListener('click', (e) => {
        ejectEveryone();
    });
    captionEveryoneBtnDesktop?.addEventListener('click', () => captionEveryoneBtn.click());
    captionEveryoneStopBtnDesktop?.addEventListener('click', () => captionEveryoneStopBtn.click());
    muteEveryoneBtnDesktop?.addEventListener('click', () => muteEveryoneBtn.click());
    hideEveryoneBtnDesktop?.addEventListener('click', () => hideEveryoneBtn.click());
    ejectEveryoneBtnDesktop?.addEventListener('click', () => ejectEveryoneBtn.click());
    syncCaptionEveryoneButtons(false);
    lockRoomBtn.addEventListener('click', (e) => {
        handleRoomAction({ action: 'lock' }, true);
    });
    unlockRoomBtn.addEventListener('click', (e) => {
        handleRoomAction({ action: 'unlock' }, true);
    });
}

/**
 * Handle keyboard shortcuts
 */
function handleShortcuts() {
    if (!isDesktopDevice || !buttons.settings.showShortcutsBtn) {
        elemDisplay(tabShortcutsBtn, false);
        setKeyboardShortcuts(false);
    } else {
        switchShortcuts.addEventListener('change', (e) => {
            const status = setKeyboardShortcuts(e.currentTarget.checked);
            userLog('toast', `Keyboard shortcuts ${status}`);
            playSound('switch');
        });

        document.addEventListener('keydown', (event) => {
            if (!isShortcutsEnabled || isChatRoomVisible || wbIsOpen) return;

            const notPresenter = isRulesActive && !isPresenter;

            const key = event.key.toLowerCase(); // Convert to lowercase for simplicity

            console.log(`Detected shortcut: ${key}`);

            switch (key) {
                case 'a':
                    if (notPresenter && !buttons.main.showAudioBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to enable audio');
                        break;
                    }
                    audioBtn.click();
                    break;
                case 'v':
                    if (notPresenter && !buttons.main.showVideoBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to enable video');
                        break;
                    }
                    videoBtn.click();
                    break;
                case 's':
                    if (notPresenter && !buttons.main.showScreenBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to share the screen');
                        break;
                    }
                    screenShareBtn.click();
                    break;
                case 'h':
                    if (notPresenter && !buttons.main.showMyHandBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to raise your hand');
                        break;
                    }
                    myHandBtn.click();
                    break;
                case 'c':
                    if (notPresenter && !buttons.main.showChatRoomBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to open the chat');
                        break;
                    }
                    chatRoomBtn.click();
                    break;
                case 'o':
                    if (notPresenter && !buttons.main.showMySettingsBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to open the settings');
                        break;
                    }
                    mySettingsBtn.click();
                    break;
                case 'x':
                    if (notPresenter && !buttons.main.showHideMeBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to hide yourself');
                        break;
                    }
                    hideMeBtn.click();
                    break;
                case 'r':
                    if (notPresenter && !buttons.main.showRecordStreamBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to start recording');
                        break;
                    }
                    recordStreamBtn.click();
                    break;
                case 'e':
                    if (notPresenter && !buttons.main.showRoomEmojiPickerBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to open the room emoji');
                        break;
                    }
                    roomEmojiPickerBtn.click();
                    break;
                case 'k':
                    if (notPresenter && !buttons.main.showCaptionRoomBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to start transcription');
                        break;
                    }
                    captionBtn.click();
                    break;
                case 'w':
                    if (notPresenter && !buttons.main.showWhiteboardBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to open the whiteboard');
                        break;
                    }
                    whiteboardBtn.click();
                    break;
                case 'd':
                    if (!showDocumentPipBtn) {
                        toastMessage('warning', 'The document PIP is not supported in this browser');
                        break;
                    }
                    if (notPresenter && !buttons.main.showDocumentPipBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to open the document PIP');
                        break;
                    }
                    documentPiPBtn.click();
                    break;
                case 't':
                    if (notPresenter && !buttons.main.showSnapshotRoomBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to take a snapshot');
                        break;
                    }
                    snapshotRoomBtn.click();
                    break;
                case 'f':
                    if (notPresenter && !buttons.settings.showFileShareBtn) {
                        toastMessage('warning', 'The presenter has disabled your ability to share files');
                        break;
                    }
                    fileShareBtn.click();
                    break;
                //...
                default:
                    console.log(`Unhandled shortcut key: ${key}`);
            }
        });
    }
}

/**
 * Set Keyboard Shortcuts enabled
 * @param {boolean} enabled
 * @return {String} enabled/disabled
 */
function setKeyboardShortcuts(enabled) {
    isShortcutsEnabled = enabled;
    lsSettings.keyboard_shortcuts = isShortcutsEnabled;
    lS.setSettings(lsSettings);
    return isShortcutsEnabled ? 'enabled' : 'disabled';
}

/**
 * Load settings from local storage
 */
function loadSettingsFromLocalStorage() {
    showChatOnMessage = lsSettings.show_chat_on_msg;
    transcriptShowOnMsg = lsSettings.transcript_show_on_msg !== undefined ? lsSettings.transcript_show_on_msg : true;
    transcriptSendToAll = lsSettings.transcript_send_to_all !== undefined ? lsSettings.transcript_send_to_all : true;
    speechInMessages = lsSettings.speech_in_msg;
    pinChatByDefault = lsSettings.pin_chat_by_default;
    msgerShowChatOnMsg.checked = showChatOnMessage;
    msgerSpeechMsg.checked = speechInMessages;
    transcriptShowOnMsgEl.checked = transcriptShowOnMsg;
    transcriptSendToAllEl.checked = transcriptSendToAll;
    screenFpsSelect.selectedIndex = lsSettings.screen_fps;
    videoFpsSelect.selectedIndex = lsSettings.video_fps;
    screenFpsSelectedIndex = screenFpsSelect.selectedIndex;
    videoFpsSelectedIndex = videoFpsSelect.selectedIndex;
    screenMaxFrameRate = parseInt(getSelectedIndexValue(screenFpsSelect), 10);
    videoMaxFrameRate = parseInt(getSelectedIndexValue(videoFpsSelect), 10);
    notifyBySound = lsSettings.sounds;
    isKeepButtonsVisible = lsSettings.keep_buttons_visible;
    isAudioPitchBar = lsSettings.pitch_bar;
    isShortcutsEnabled = lsSettings.keyboard_shortcuts;
    switchSounds.checked = notifyBySound;
    switchShare.checked = notify;
    switchKeepButtonsVisible.checked = isKeepButtonsVisible;
    switchPinChatByDefault.checked = pinChatByDefault;
    switchAudioPitchBar.checked = isAudioPitchBar;
    switchShortcuts.checked = isShortcutsEnabled;
    keepCustomTheme.checked = themeCustom.keep;
    themeSelect.disabled = themeCustom.keep;
    updateThemeCardsDisabled();
    themeCustom.input.value = themeCustom.color;

    switchNoiseSuppression.checked = lsSettings.mic_noise_suppression;

    videoObjFitSelect.selectedIndex = lsSettings.video_obj_fit;
    btnsBarSelect.selectedIndex = lsSettings.buttons_bar;
    pinVideoPositionSelect.selectedIndex = lsSettings.pin_grid;
    setSP('--video-object-fit', videoObjFitSelect.value);
    setButtonsBarPosition(btnsBarSelect.value);
    toggleVideoPin(pinVideoPositionSelect.value);
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
    if (camera === 'environment') {
        // Back camera → No mirror
        initVideo.classList.remove('mirror');
        myVideo.classList.remove('mirror');
    } else {
        // Disable mirror for rear camera
        initVideo.classList.add('mirror');
        myVideo.classList.add('mirror');
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

    handleClickOutside(emojiUsernamePicker, initUsernameEmojiButton, () => {
        if (usernameEmoji && !usernameEmoji.classList.contains('hidden')) {
            usernameEmoji.classList.add('hidden');
        }
    });
}

/**
 * Toggle vide mirror
 */
function toggleInitVideoMirror() {
    initVideo.classList.toggle('mirror');
    // myVideo may not exist yet before joining/creating local tile
    if (typeof myVideo !== 'undefined' && myVideo) {
        myVideo.classList.toggle('mirror');
    }
}

/**
 * Get audio - video constraints
 * @returns {object} audio - video constraints
 */
function getAudioVideoConstraints() {
    const audioSource = audioInputSelect.value;
    const videoSource = videoSelect.value;
    let videoConstraints = useVideo;
    if (videoConstraints) {
        videoConstraints = getVideoConstraints(videoQualitySelect.value ? videoQualitySelect.value : 'default');
        videoConstraints['deviceId'] = videoSource ? { exact: videoSource } : undefined;
    }
    let audioConstraints = { audio: false };
    if (useAudio) {
        audioConstraints = getAudioConstraints(audioSource);
    }
    return {
        audioConstraints,
        video: videoConstraints,
    };
}

/**
 * Get Resolution Map
 * https://webrtc.github.io/samples/src/content/getusermedia/resolution/
 */
function getResolutionMap() {
    return {
        qvga: [320, 240],
        vga: [640, 480],
        hd: [1280, 720],
        fhd: [1920, 1080],
        '2k': [2560, 1440],
        '4k': [3840, 2160],
        '6k': [6144, 3456],
        '8k': [7680, 4320],
    };
}

/**
 * Get safe cross-browser video constraints
 * @param {string} videoQuality desired video quality
 * @returns {object} video constraints
 */
function getVideoConstraints(videoQuality) {
    const frameRate = videoMaxFrameRate || 30;

    const resolutionMap = getResolutionMap();

    // Default HD
    let width = 1280;
    let height = 720;

    if (videoQuality === 'default') {
        // Default 4k
        if (forceCamMaxResolutionAndFps) {
            width = 3840;
            height = 2160;
        }
    } else if (resolutionMap[videoQuality]) {
        [width, height] = resolutionMap[videoQuality];
    }

    const constraints = {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: frameRate },
    };

    console.log('Get Video constraints', constraints);
    return constraints;
}

/**
 * Get audio constraints
 * @param {string} deviceId audio input device ID
 * @returns {object} audio constraints
 */
function getAudioConstraints(deviceId = null) {
    // If custom RNNoise is enabled but not supported, fall back to built-in WebRTC noise suppression
    const useBuiltInNoiseSuppression = !buttons.settings.customNoiseSuppression || !isRNNoiseSupported;

    // Enhanced audio constraints for better quality and volume on all devices
    // On mobile, use { ideal: true } so getUserMedia succeeds even if the
    // device's built-in mic cannot honour a constraint (e.g. iOS Safari may
    // silently suppress audio when echoCancellation is strictly required).
    const audioConstraints = {
        echoCancellation: isMobileDevice ? { ideal: true } : true,
        autoGainControl: isMobileDevice ? { ideal: true } : true,
        noiseSuppression: useBuiltInNoiseSuppression,
    };
    /* 
    deviceId handling is platform-dependent:
        - iOS Safari: routing is OS-controlled; ignore deviceId.
        - Mobile (Android): best-effort with `ideal`.
        - Desktop: `exact` is reliable.
    */
    if (deviceId) {
        if (isMobileSafari) {
            // ignore
        } else if (isMobileDevice) {
            audioConstraints.deviceId = { ideal: deviceId };
        } else {
            audioConstraints.deviceId = { exact: deviceId };
        }
    }

    return {
        audio: audioConstraints,
    };
}

/**
 * Set local max fps: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/applyConstraints
 * @param {string} maxFrameRate desired max frame rate
 * @param {string} type camera/screen default camera
 */
async function setLocalMaxFps(maxFrameRate, type = 'camera') {
    if (!useVideo || isFirefox) return;

    const videoTrack = getVideoTrack(localVideoMediaStream);
    const screenTrack = getVideoTrack(localScreenMediaStream);

    if (!videoTrack && !screenTrack) return;

    (isScreenStreaming ? screenTrack : videoTrack)
        .applyConstraints({ frameRate: maxFrameRate })
        .then(() => {
            logStreamSettingsInfo('setLocalMaxFps', videoTrack ? localVideoMediaStream : localScreenMediaStream);
            type === 'camera'
                ? (videoFpsSelectedIndex = videoFpsSelect.selectedIndex)
                : (screenFpsSelectedIndex = screenFpsSelect.selectedIndex);
        })
        .catch((err) => {
            console.error('setLocalMaxFps', err);
            type === 'camera'
                ? (videoFpsSelect.selectedIndex = videoFpsSelectedIndex)
                : (screenFpsSelect.selectedIndex = screenFpsSelectedIndex);
            userLog('toast', "Your device doesn't support the selected fps, please select the another one.");
        });
}

/**
 * Set local video quality: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/applyConstraints
 */
async function setLocalVideoQuality() {
    const videoTrack = getVideoTrack(localVideoMediaStream);
    const screenTrack = getVideoTrack(localScreenMediaStream);

    if (!videoTrack && !screenTrack) return;

    const videoQuality = videoQualitySelect.value ? videoQualitySelect.value : 'default';
    const videoConstraints = getVideoConstraints(videoQuality);

    (isScreenStreaming ? screenTrack : videoTrack)
        .applyConstraints(videoConstraints)
        .then(() => {
            logStreamSettingsInfo('setLocalVideoQuality', videoTrack ? localVideoMediaStream : localScreenMediaStream);
            videoQualitySelectedIndex = videoQualitySelect.selectedIndex;
        })
        .catch((err) => {
            videoQualitySelect.selectedIndex = videoQualitySelectedIndex;
            console.error('setLocalVideoQuality', err);
            userLog('toast', "Your device doesn't support the selected video quality, please select the another one.");
        });
}

/**
 * Change audio output (Speaker)
 */
async function changeAudioDestination(audioElement = false, deferUntilUserActivation = true) {
    const audioDestination = audioOutputSelect.value;
    if (audioElement) {
        // change audio output to specified participant audio
        await attachSinkId(audioElement, audioDestination, deferUntilUserActivation);
    } else {
        const audioElements = audioMediaContainer.querySelectorAll('audio');
        // change audio output for all participants audio
        const promises = [];
        audioElements.forEach((audioElement) => {
            // discard my own audio on this device, so I won't hear myself.
            if (audioElement.id != 'myAudio') {
                promises.push(attachSinkId(audioElement, audioDestination, deferUntilUserActivation));
            }
        });
        // Wait for all audio outputs to be changed
        await Promise.allSettled(promises);
    }
}

/**
 * Attach audio output device to audio element using device/sink ID.
 * @param {object} element audio element to attach the audio output
 * @param {string} sinkId uuid audio output device
 * @param {boolean} deferUntilUserActivation when true, defer applying setSinkId() until the next user gesture if no user activation is present
 */
async function attachSinkId(element, sinkId, deferUntilUserActivation = true) {
    if (typeof element.sinkId === 'undefined') {
        console.warn('Browser does not support output device selection.');
        return;
    }

    // Helper to actually set the sinkId and handle errors uniformly
    const doSetSinkId = async () => {
        try {
            await element.setSinkId(sinkId);
            console.log(`Success, audio output device attached: ${sinkId}`);
        } catch (err) {
            let errorMessage = err;
            if (err.name === 'SecurityError') {
                errorMessage = 'SecurityError: You need to use HTTPS for selecting audio output device';
            } else if (err.name === 'NotAllowedError') {
                errorMessage = 'NotAllowedError: Permission to use audio output device is not granted';
            } else if (err.name === 'NotFoundError') {
                errorMessage = 'NotFoundError: The specified audio output device was not found';
            } else if (err.message) {
                errorMessage = `Error: ${err.message}`;
            } else {
                errorMessage = `Error: ${err}`;
            }
            console.error(`attachSinkId error: ${errorMessage}`);
            // Jump back to first output device in the list as it's the default.
            if (typeof audioOutputSelect !== 'undefined' && audioOutputSelect) {
                audioOutputSelect.selectedIndex = 0;
            }
            throw err;
        }
    };

    // If a user gesture is required (Chrome policy), defer until the next interaction
    const needsUserGesture = !!(navigator.userActivation && !navigator.userActivation.isActive);
    if (needsUserGesture) {
        // Automatic calls (e.g. on new audio consumer) must NOT register a global
        // user-activation listener: applying setSinkId() on an unrelated click resets
        // the audio pipeline and breaks echo cancellation. The selected speaker is
        // re-applied the next time the user explicitly interacts with the speaker select.
        if (!deferUntilUserActivation) return;
        // Show a single notification prompting the user to click
        if (!window.__sinkGestureNotified) {
            window.__sinkGestureNotified = true;
            console.warn('Click anywhere to apply the speaker change');
        }

        return new Promise((resolve) => {
            const applyOnGesture = async () => {
                try {
                    await doSetSinkId();
                    resolve(true);
                } catch (e) {
                    resolve(false);
                } finally {
                    // Clean up all event listeners
                    window.removeEventListener('pointerdown', applyOnGesture);
                    window.removeEventListener('keydown', applyOnGesture);
                    window.removeEventListener('touchstart', applyOnGesture);
                    window.__sinkGestureNotified = false;
                }
            };
            const opts = { once: true };
            // Use pointerdown (covers mouse/touch/pen), touchstart (fallback for older browsers), and keydown
            window.addEventListener('pointerdown', applyOnGesture, opts);
            window.addEventListener('keydown', applyOnGesture, opts);
            window.addEventListener('touchstart', applyOnGesture, opts);
        });
    }

    // Otherwise, set immediately
    return doSetSinkId();
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
 * Create a loading spinner overlay inside a video wrap element.
 * The spinner is automatically hidden once the video starts playing.
 * @param {HTMLElement} wrap - The parent wrapper div (.Camera or .Screen)
 * @param {HTMLVideoElement} videoEl - The video element to monitor
 */
function createVideoLoadingSpinner(wrap, videoEl) {
    const spinnerWrap = document.createElement('div');
    spinnerWrap.className = 'video-loading-spinner';

    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-spinner';

    const spinnerRing = document.createElement('div');
    spinnerRing.className = 'spinner-ring';

    const spinnerLogo = document.createElement('img');
    spinnerLogo.className = 'spinner-logo';
    spinnerLogo.src = '../images/logo.svg';
    spinnerLogo.alt = 'logo';

    loadingSpinner.appendChild(spinnerRing);
    loadingSpinner.appendChild(spinnerLogo);
    spinnerWrap.appendChild(loadingSpinner);
    wrap.appendChild(spinnerWrap);

    let fallbackTimer = null;

    function hideSpinner() {
        if (spinnerWrap.style.display === 'none') return;
        spinnerWrap.style.display = 'none';
        videoEl.removeEventListener('playing', hideSpinner);
        videoEl.removeEventListener('loadeddata', hideSpinner);
        videoEl.removeEventListener('loadedmetadata', hideSpinner);
        videoEl.removeEventListener('canplay', hideSpinner);
        if (fallbackTimer) {
            clearInterval(fallbackTimer);
            fallbackTimer = null;
        }
    }

    videoEl.addEventListener('playing', hideSpinner);
    videoEl.addEventListener('loadeddata', hideSpinner);
    videoEl.addEventListener('loadedmetadata', hideSpinner);
    videoEl.addEventListener('canplay', hideSpinner);

    fallbackTimer = window.setInterval(() => {
        if (videoEl.readyState >= HTMLMediaElement.HAVE_METADATA || videoEl.videoWidth > 0 || videoEl.currentTime > 0) {
            hideSpinner();
        }
    }, 250);

    // If the video is already playing or has data, hide immediately
    if (videoEl.readyState >= HTMLMediaElement.HAVE_METADATA || videoEl.videoWidth > 0) {
        hideSpinner();
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
        wbIsBgTransparent ||
        isButtonsBarOver ||
        isButtonsVisible ||
        (isMobileDevice && isChatRoomVisible) ||
        (isMobileDevice && isCaptionBoxVisible) ||
        (isMobileDevice && isMySettingsVisible)
    )
        return;
    toggleClassElements('navbar', 'block');
    toggleClassElements('videoPeerName', 'flex');
    elemDisplay(bottomButtons, true, 'flex');
    isButtonsVisible = true;
}

/**
 * Check every 10 sec if need to hide buttons bar and status menu
 */
function checkButtonsBarAndMenu() {
    if (lsSettings.keep_buttons_visible) {
        toggleClassElements('navbar', 'block');
        toggleClassElements('videoPeerName', 'flex');
        elemDisplay(bottomButtons, true, 'flex');
        isButtonsVisible = true;
    } else {
        if (!isButtonsBarOver) {
            toggleClassElements('navbar', 'none');
            toggleClassElements('videoPeerName', 'none');
            elemDisplay(bottomButtons, false);
            isButtonsVisible = false;
        }
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
        html: renderRoomTemplate('tpl-share-room-modal', {
            text: {
                roomURL,
            },
        }),
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
    const qr = new QRious({
        element: getId('qrRoom'),
        value: myRoomUrl,
    });
    qr.set({
        size: 256,
    });
}

/**
 * Make Room Popup QR
 */
function makeRoomPopupQR() {
    const qr = new QRious({
        element: document.getElementById('qrRoomPopup'),
        value: myRoomUrl,
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

    myAudioStatus = audioStatus;

    // Safely enable/disable audio track
    const audioTrack = getAudioTrack(localAudioMediaStream);
    if (audioTrack) {
        audioTrack.enabled = audioStatus;
    } else {
        console.warn('[handleAudio] No audio track found');
    }

    // Update button classes
    if (force != null) {
        setMediaButtonsClass([{ element: e, status: audioStatus, mediaType: 'audio' }]);
    } else {
        setMediaButtonsClass([{ element: e.target, status: audioStatus, mediaType: 'audio' }]);
    }

    setMediaButtonsClass([{ element: audioBtn, status: audioStatus, mediaType: 'audio' }]);

    if (init) {
        setMediaButtonsClass([{ element: initAudioBtn, status: audioStatus, mediaType: 'audio' }]);
        setTippy(initAudioBtn, audioStatus ? 'Stop the audio' : 'Start the audio', 'right');
        initMicrophoneSelect.disabled = !audioStatus;
        initSpeakerSelect.disabled = !audioStatus;
        lS.setInitConfig(lS.MEDIA_TYPE.audio, audioStatus);
    } else {
        applyKeepAwake(myAudioStatus);
    }

    setMyAudioStatus(myAudioStatus);

    // Screen reader announcement
    screenReaderAccessibility.announceMessage(audioStatus ? 'Microphone on' : 'Microphone off');
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

    myVideoStatus = videoStatus;

    const videoTrack = getVideoTrack(localVideoMediaStream);
    if (videoTrack) {
        videoTrack.enabled = videoStatus;
    }

    // Update button classes
    if (force != null) {
        setMediaButtonsClass([{ element: e, status: videoStatus, mediaType: 'video' }]);
    } else {
        setMediaButtonsClass([{ element: e.target, status: videoStatus, mediaType: 'video' }]);
    }

    setMediaButtonsClass([{ element: videoBtn, status: videoStatus, mediaType: 'video' }]);

    if (init) {
        setMediaButtonsClass([{ element: initVideoBtn, status: videoStatus, mediaType: 'video' }]);
        setTippy(initVideoBtn, videoStatus ? 'Stop the video' : 'Start the video', 'top');
        displayElements([
            { element: initVideo, display: videoStatus, mode: 'block' },
            { element: initVideoMirrorBtn, display: videoStatus },
        ]);
        initVideoSelect.disabled = !videoStatus;
        lS.setInitConfig(lS.MEDIA_TYPE.video, videoStatus);
        initVideoContainerShow(videoStatus);
    } else {
        applyKeepAwake(myVideoStatus);
    }

    if (!videoStatus) {
        if (!isScreenStreaming) {
            // Stop the video track based on the condition
            init
                ? await stopVideoTracks(initStream) // Stop init video track (camera LED off)
                : await stopVideoTracks(localVideoMediaStream); // Stop local video track (camera LED off)
        }
    } else {
        init
            ? await changeInitCamera(initVideoSelect.value) // Resume the video track for the init camera (camera LED on)
            : await changeLocalCamera(videoSelect.value); // Resume the video track for the local camera (camera LED on)
    }

    setMyVideoStatus(videoStatus);

    // Screen reader announcement
    screenReaderAccessibility.announceMessage(videoStatus ? 'Camera on' : 'Camera off');
}

/**
 * Handle initVideoContainer
 * @param {boolean} show
 */
function initVideoContainerShow(show = true) {
    initVideoContainer.style.width = show ? '100%' : 'auto';
    initVideoContainer.style.padding = show ? '10px' : '0px';
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

    // Show loading spinner while switching camera
    const myVideoWrap = getId('myVideoWrap');
    const spinner = myVideoWrap ? myVideoWrap.querySelector('.video-loading-spinner') : null;
    if (spinner) elemDisplay(spinner, true, 'flex');

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
    } finally {
        if (spinner) elemDisplay(spinner, false);
    }
}

/**
 * Stop Local Video Track
 */
async function stopLocalVideoTrack() {
    if (useVideo || !isScreenStreaming) {
        const localVideoTrack = getVideoTrack(localVideoMediaStream);
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
    const localAudioTrack = getAudioTrack(localAudioMediaStream);
    if (localAudioTrack) {
        console.log('stopLocalAudioTrack', localAudioTrack);
        localAudioTrack.stop();
    }
}

/**
 * Load Screen media to video element
 */
async function loadScreenMedia() {
    // If user started screen sharing before joining, create the screen tile now
    if (myScreenStatus && localScreenMediaStream) {
        await loadLocalMedia(localScreenMediaStream, 'screen');
    }
}

/**
 * Toggle screen sharing and handle related actions
 * @param {boolean} init - Indicates if it's the initial screen share state
 */
async function toggleScreenSharing(init = false) {
    try {
        screenMaxFrameRate = parseInt(screenFpsSelect.value, 10);
        const constraints = getScreenShareConstraints();
        isVideoPrivacyActive = false;
        if (!init) emitPeerStatus('privacy', isVideoPrivacyActive);

        !isScreenStreaming ? await startScreenSharing(constraints, init) : await stopScreenSharing(init);

        updateScreenSharingUI(isScreenStreaming, init);
    } catch (err) {
        if (err && err.name === 'NotAllowedError') {
            console.error('[ScreenShare] Screen sharing permission was denied by the user.');
        } else {
            await handleToggleScreenException(`[Warning] Unable to share the screen: ${err}`, init);
        }
        if (init) return;
    }
}

/**
 * Get screen share constraints
 */
function getScreenShareConstraints() {
    return {
        audio: true,
        video: { frameRate: screenMaxFrameRate },
    };
}

/**
 * Start screen sharing with given constraints
 * @param {object} constraints - MediaStreamConstraints for screen sharing
 * @param {boolean} init - Indicates if it's the initial screen share
 */
async function startScreenSharing(constraints, init) {
    const displayStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    if (!displayStream) return;
    localScreenDisplayStream = displayStream;
    const screenVideoTrack = getVideoTrack(displayStream);
    if (!screenVideoTrack) {
        console.error('[ScreenShare] No video track in display stream');
        return;
    }
    const screenAudioTrack = getAudioTrack(displayStream);
    const micAudioTrack =
        myAudioStatus && hasAudioTrack(localAudioMediaStream) ? getAudioTrack(localAudioMediaStream) : null;
    if (screenShareAudioContext) {
        try {
            await screenShareAudioContext.close();
        } catch (_) {}
        screenShareAudioContext = null;
    }
    const outgoingAudioTrack = await mixScreenAndMicAudio(screenAudioTrack, micAudioTrack);
    localScreenMediaStream = outgoingAudioTrack
        ? new MediaStream([screenVideoTrack, outgoingAudioTrack])
        : new MediaStream([screenVideoTrack]);
    isScreenStreaming = true;
    myScreenStatus = true;
    const extras = getLocalScreenExtras();
    if (extras) {
        try {
            peerInfo.extras = { ...(peerInfo.extras || {}), ...extras };
        } catch (_) {}
        await emitPeerStatus('screen', true, extras);
    }
    if (!init) {
        emitPeersAction('screenStart', extras);
        await loadScreenMedia();
        await refreshMyStreamToPeers(undefined, true);
    }
    screenVideoTrack.onended = () => {
        if (isScreenStreaming) toggleScreenSharing(init);
    };
    if (init) {
        if (initStream) await stopTracks(initStream);
        initStream = displayStream;
        const initVideoTrack = getVideoTrack(initStream);
        if (initVideoTrack) {
            const newInitStream = new MediaStream([initVideoTrack]);
            elemDisplay(initVideo, true, 'block');
            initVideo.classList.toggle('mirror');
            initVideo.srcObject = newInitStream;
            const initVideoLoader = getId('initVideoLoader');
            if (initVideoLoader) initVideoLoader.style.display = 'none';
            disable(initVideoSelect, true);
            disable(initVideoBtn, true);
        } else {
            elemDisplay(initVideo, false);
        }
        initVideoContainerShow();
    }
    if (!init) {
        screenReaderAccessibility.announceMessage('Screen sharing started');
    }
}

/**
 * Stop screen sharing and clean up resources
 * @param {boolean} init - Indicates if it's the initial screen share
 */
async function stopScreenSharing(init) {
    const myScreenWrap = getId('myScreenWrap');
    const myScreenPinBtn = getId('myScreenPinBtn');
    if (!init && myScreenWrap && isVideoPinned && pinnedVideoPlayerId === 'myScreen') {
        console.log('[ScreenShare] Unpinning my screen before removal');
        if (myScreenPinBtn) myScreenPinBtn.click();
    }
    if (!init && myScreenWrap) myScreenWrap.remove();
    if (localScreenMediaStream) {
        localScreenMediaStream.getTracks().forEach((t) => t.stop());
    }
    if (localScreenDisplayStream) {
        localScreenDisplayStream.getTracks().forEach((t) => t.stop());
    }
    localScreenDisplayStream = null;
    if (screenShareAudioContext) {
        try {
            await screenShareAudioContext.close();
        } catch (_) {}
        screenShareAudioContext = null;
    }
    localScreenMediaStream = null;
    if (!init) adaptAspectRatio();
    isScreenStreaming = false;
    myScreenStatus = false;
    if (!init) {
        emitPeersAction('screenStop');
        try {
            peerInfo.extras = {};
        } catch (_) {}
        await emitPeerStatus('screen', false, {});
        const micTrack = getAudioTrack(localAudioMediaStream);
        if (useAudio && (!micTrack || micTrack.readyState === 'ended')) {
            try {
                await changeLocalMicrophone(audioInputSelect.value);
                console.log('[ScreenShare] Require microphone after screen share stop');
            } catch (err) {
                console.error('[ScreenShare] Failed to reacquire microphone after screen share stop:', err);
            }
        } else {
            if (micTrack) {
                micTrack.enabled = true;
                await refreshMyStreamToPeers(localAudioMediaStream, true);
                console.log('[ScreenShare] Refreshing mic audio after screen share stop');
            }
        }
        screenReaderAccessibility.announceMessage('Screen sharing stopped');
    }
    if (init) {
        if (initStream) await stopTracks(initStream);
        if (useVideo && myVideoStatus) {
            try {
                await changeInitCamera(initVideoSelect.value);
                initVideo.classList.toggle('mirror');
            } catch (err) {
                console.error('[ScreenShare] Error restarting camera after screen share stop:', err);
                initStream = null;
                elemDisplay(initVideo, false);
            }
        } else {
            initStream = null;
            elemDisplay(initVideo, false);
            initVideoContainerShow(false);
        }
        disable(initVideoSelect, false);
        disable(initVideoBtn, false);
    }
}

/**
 * Mix screen and microphone audio tracks into a single audio track
 * @param {MediaStreamTrack} screenAudioTrack - The audio track from the screen share
 * @param {MediaStreamTrack} micAudioTrack - The audio track from the microphone
 * @returns {Promise<MediaStreamTrack|null>} - The mixed audio track or null if none available
 */
async function mixScreenAndMicAudio(screenAudioTrack, micAudioTrack) {
    if (screenAudioTrack && micAudioTrack) {
        try {
            screenShareAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            const destination = screenShareAudioContext.createMediaStreamDestination();
            const screenSource = screenShareAudioContext.createMediaStreamSource(new MediaStream([screenAudioTrack]));
            screenSource.connect(destination);
            const micSource = screenShareAudioContext.createMediaStreamSource(new MediaStream([micAudioTrack]));
            micSource.connect(destination);
            try {
                await screenShareAudioContext.resume();
            } catch (_) {}
            return destination.stream.getAudioTracks()[0] || null;
        } catch (err) {
            console.warn('[ScreenShare] Unable to mix screen+mic audio, falling back to screen audio only:', err);
            return screenAudioTrack;
        }
    } else if (screenAudioTrack) {
        return screenAudioTrack;
    } else if (micAudioTrack) {
        return micAudioTrack;
    }
    return null;
}

/**
 * Update Screen Sharing UI
 * @param {boolean} isScreenStreaming - Indicates if screen sharing is active
 * @param {boolean} init - Indicates if it's the initial screen share
 */
function updateScreenSharingUI(isScreenStreaming, init) {
    setScreenSharingStatus(isScreenStreaming);
    if (!init && myVideoAvatarImage && !useVideo) {
        elemDisplay(myVideo, false);
        elemDisplay(myVideoAvatarImage, true, 'block');
    }

    isScreenStreaming
        ? setColor(init ? initScreenShareBtn : screenShareBtn, 'orange')
        : setColor(init ? initScreenShareBtn : screenShareBtn, 'white');

    screenReaderAccessibility.announceMessage(isScreenStreaming ? 'Screen sharing started' : 'Screen sharing stopped');
}

/**
 *  Get local screen extras for deterministic routing
 */
function getLocalScreenExtras() {
    try {
        const track = getVideoTrack(localScreenMediaStream);
        return track ? { screen_track_id: track.id, screen_stream_id: localScreenMediaStream.id } : undefined;
    } catch (e) {
        return undefined;
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
        peerInfo.extras = {};
        await emitPeerStatus('screen', false, {});

        // Stop the local video track
        await stopLocalVideoTrack();

        // Toggle the 'mirror' class on myVideo (guard if not yet created)
        if (typeof myVideo !== 'undefined' && myVideo) {
            myVideo.classList.toggle('mirror');
        }

        // Handle video avatar image and privacy button visibility
        if (myVideoAvatarImage && !useVideo) {
            isScreenStreaming ? elemDisplay(myVideoAvatarImage, false) : elemDisplay(myVideoAvatarImage, true, 'block');
        }

        // Automatically pin the video if screen sharing or video is pinned
        if ((isScreenStreaming || isVideoPinned) && typeof myScreenPinBtn !== 'undefined' && myScreenPinBtn) {
            myScreenPinBtn.click();
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
    setMediaButtonsClass([
        { element: initScreenShareBtn, status, mediaType: 'screen' },
        { element: screenShareBtn, status, mediaType: 'screen' },
    ]);
    setTippy(screenShareBtn, status ? 'Stop screen sharing (S)' : 'Start screen sharing (S)', placement);
    if (screenShareBtn && screenShareBtn.setAttribute) screenShareBtn.setAttribute('aria-pressed', String(!!status));
}

/**
 * Set myVideoStatus true
 */
async function setMyVideoStatusTrue() {
    if (myVideoStatus || !useVideo) return;

    // Enable video track
    const videoTrack = getVideoTrack(localVideoMediaStream);
    if (videoTrack) {
        videoTrack.enabled = true;
    }

    myVideoStatus = true;

    // Update multiple buttons
    setMediaButtonsClass([
        { element: initVideoBtn, status: true, mediaType: 'video' },
        { element: videoBtn, status: true, mediaType: 'video' },
        { element: myVideoStatusIcon, status: true, mediaType: 'video' },
    ]);

    // Update display elements
    displayElements([
        { element: myVideoAvatarImage, display: false },
        { element: myVideo, display: true, mode: 'block' },
    ]);

    // Update tooltips
    setTippy(videoBtn, 'Stop the video', placement);
    setTippy(initVideoBtn, 'Stop the video', 'top');

    emitPeerStatus('video', myVideoStatus);
}

/**
 * Enter - esc on full screen mode
 * https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
 */
function toggleFullScreen() {
    const fullScreenIcon = fullScreenBtn.querySelector('i');
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        fullScreenIcon.className = className.fsOn;
        isDocumentOnFullScreen = true;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            fullScreenIcon.className = className.fsOff;
            isDocumentOnFullScreen = false;
        }
    }
    const fullScreenLabel = isDocumentOnFullScreen ? 'Exit full screen' : 'View full screen';
    screenReaderAccessibility.announceMessage(fullScreenLabel);
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

    // Enable/disable local audio as requested by caller
    if (useAudio && localAudioTrackChange && localAudioMediaStream) {
        const audioTrack = getAudioTrack(localAudioMediaStream);
        if (audioTrack) {
            audioTrack.enabled = myAudioStatus;
        }
    }

    // Current local tracks
    const cameraTrack = getVideoTrack(localVideoMediaStream);
    const screenTrack = getVideoTrack(localScreenMediaStream);

    // Determine which audio track to use.
    // While screen sharing, prefer the screen-share audio track (which may be mixed screen+mic).
    // Always prefer mic audio when not screen sharing
    let audioTrack, audioStream;
    if (isScreenStreaming && hasAudioTrack(localScreenMediaStream)) {
        audioTrack = getAudioTrack(localScreenMediaStream);
        audioStream = localScreenMediaStream;
    } else {
        audioTrack = getAudioTrack(localAudioMediaStream);
        audioStream = localAudioMediaStream;
    }

    // Push tracks to every peer
    for (const peer_id in peerConnections) {
        const pc = peerConnections[peer_id];
        const peer_name = allPeers[peer_id]['peer_name'];

        const senders = pc.getSenders();
        const videoSenders = senders.filter((s) => s.track && s.track.kind === 'video');
        const audioSender = senders.find((s) => s.track && s.track.kind === 'audio');

        // Camera track management (sender index 0)
        if (cameraTrack) {
            if (videoSenders.length >= 1) {
                await videoSenders[0].replaceTrack(cameraTrack);
                console.log('REPLACE CAMERA TRACK TO', { peer_id, peer_name, cameraTrack });
            } else {
                pc.addTrack(cameraTrack, localVideoMediaStream);
                await handleRtcOffer(peer_id);
                console.log('ADD CAMERA TRACK TO', { peer_id, peer_name, cameraTrack });
            }
        } else {
            if (videoSenders.length >= 1 && !screenTrack) {
                try {
                    await videoSenders[0].replaceTrack(null);
                    console.log('REMOVE CAMERA TRACK FROM', { peer_id, peer_name });
                } catch (e) {
                    console.warn('REMOVE CAMERA TRACK FAILED', e);
                }
            }
        }

        // Screen track management (sender index 1)
        if (screenTrack) {
            if (videoSenders.length >= 2) {
                await videoSenders[1].replaceTrack(screenTrack);
                console.log('REPLACE SCREEN TRACK TO', { peer_id, peer_name, screenTrack });
            } else {
                pc.addTrack(screenTrack, localScreenMediaStream);
                await handleRtcOffer(peer_id);
                console.log('ADD SCREEN TRACK TO', { peer_id, peer_name, screenTrack });
            }
        } else {
            if (videoSenders.length >= 2) {
                try {
                    pc.removeTrack(videoSenders[1]);
                    await handleRtcOffer(peer_id);
                    console.log('REMOVE SCREEN SENDER FROM', { peer_id, peer_name });
                } catch (e) {
                    console.warn('REMOVE SCREEN SENDER FAILED', e);
                }
            }
        }

        // Audio track management
        if (audioTrack) {
            if (audioSender) {
                await audioSender.replaceTrack(audioTrack);
                console.log('REPLACE AUDIO TRACK TO', { peer_id, peer_name, audioTrack });
            } else {
                pc.addTrack(audioTrack, audioStream || new MediaStream([audioTrack]));
                await handleRtcOffer(peer_id);
                console.log('ADD AUDIO TRACK TO', { peer_id, peer_name, audioTrack });
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
    if (stream && (useVideo || isScreenStreaming)) {
        const videoTrack = getVideoTrack(stream);
        if (videoTrack) {
            videoTrack.enabled = true;
        }
    }

    const tracksToInclude = [];

    const videoTrack = stream && hasVideoTrack(stream) ? getVideoTrack(stream) : getVideoTrack(localVideoMediaStream);

    const audioTrack =
        hasAudioTrack(stream) && localAudioTrackChange ? getAudioTrack(stream) : getAudioTrack(localAudioMediaStream);

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
    if (useVideo || isScreenStreaming) {
        console.log('Refresh my local media stream VIDEO - AUDIO', { isScreenStreaming: isScreenStreaming });
        if (videoTrack) {
            tracksToInclude.push(videoTrack);
            // Avoid overwriting camera when screen sharing uses a separate tile
            if (!isScreenStreaming) {
                localVideoMediaStream = new MediaStream([videoTrack]);
                attachMediaStream(myVideo, localVideoMediaStream);
                logStreamSettingsInfo('refreshMyLocalStream-localVideoMediaStream', localVideoMediaStream);
            }
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

    // Keep camera tile object-fit consistent with the selected theme setting
    myVideo.style.objectFit = 'var(--video-object-fit)';
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
 * Safely get first video track from MediaStream
 * @param {MediaStream} mediaStream
 * @returns {MediaStreamTrack|null}
 */
function getVideoTrack(mediaStream) {
    if (!mediaStream) return null;
    const tracks = mediaStream.getVideoTracks();
    return tracks.length > 0 ? tracks[0] : null;
}

/**
 * Safely get first audio track from MediaStream
 * @param {MediaStream} mediaStream
 * @returns {MediaStreamTrack|null}
 */
function getAudioTrack(mediaStream) {
    if (!mediaStream) return null;
    const tracks = mediaStream.getAudioTracks();
    return tracks.length > 0 ? tracks[0] : null;
}

/**
 * Check if recording is active, if yes,
 * on disconnect, remove peer, kick out or leave room, we going to save it
 */
function checkRecording() {
    if (isStreamRecording || myVideoPeerName.innerText.includes('REC')) {
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
 * Get time to string HH:MM:SS
 * @param {number} time in milliseconds
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
            myVideoPeerName.innerText = myPeerName + ' 🔴 REC ' + recTimeElapsed;
            recordingTime.innerText = '🔴 REC ' + recTimeElapsed;
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
                .map((track) => new MediaStream([track]))
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
        text: 'Select the recording type you want to start. Audio will be recorded from all participants.',
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
        if (audio.srcObject) {
            const audioTrack = getAudioTrack(audio.srcObject);
            if (audioTrack) {
                audioStream.addTrack(audioTrack);
            }
        }
    });
    return audioStream;
}

/**
 * Notify me if someone start to recording they camera/screen/window + audio
 * @param {string} fromId peer_id
 * @param {string} from peer_name
 * @param {string} fromAvatar peer_avatar
 * @param {string} action recording action
 */
function notifyRecording(fromId, from, fromAvatar, action) {
    const msg = '🔴 ' + action + ' conference recording';
    const chatMessage = {
        from: from,
        fromAvatar: fromAvatar,
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
            6000
        );
    }
}

/**
 * Toggle Video and Audio tabs
 * @param {boolean} disabled - If true, disable the tabs; otherwise, enable them
 */
function toggleVideoAudioTabs(disabled = false) {
    tabVideoBtn.disabled = disabled;
    tabAudioBtn.disabled = disabled;
}

/**
 * Handle Media Recorder
 * @param {object} mediaRecorder
 */
function handleMediaRecorder(mediaRecorder) {
    // Always pass a timeslice so the browser flushes encoded chunks into
    // recordedBlobs periodically instead of buffering the entire recording
    // in renderer memory. This makes long (>1h) recordings stable and
    // avoids MediaRecorder auto-stops caused by memory pressure.
    mediaRecorder.start(1000);
    mediaRecorder.addEventListener('start', handleMediaRecorderStart);
    mediaRecorder.addEventListener('dataavailable', handleMediaRecorderData);
    mediaRecorder.addEventListener('stop', handleMediaRecorderStop);
}

/**
 * Handle Media Recorder onstart event
 * @param {object} event of media recorder
 */
function handleMediaRecorderStart(event) {
    toggleVideoAudioTabs(true);
    startRecordingTimer();
    emitPeersAction('recStart');
    emitPeerStatus('rec', true);
    console.log('MediaRecorder started: ', event);
    isStreamRecording = true;
    const recordStreamIcon = recordStreamBtn.querySelector('i');
    recordStreamIcon.style.setProperty('color', '#ff4500');
    if (isMobileDevice) elemDisplay(swapCameraBtn, false);
    recStartTs = performance.now();
    playSound('recStart');
    screenReaderAccessibility.announceMessage('Recording started');
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
    toggleVideoAudioTabs(false);
    console.log('MediaRecorder stopped: ', event);
    console.log('MediaRecorder Blobs: ', recordedBlobs);
    stopRecordingTimer();
    emitPeersAction('recStop');
    emitPeerStatus('rec', false);
    isStreamRecording = false;
    myVideoPeerName.innerText = myPeerName + ' (me)';
    if (isRecScreenStream) {
        recScreenStream.getTracks().forEach((track) => {
            if (track.kind === 'video') track.stop();
        });
        isRecScreenStream = false;
    }

    const recordStreamIcon = recordStreamBtn.querySelector('i');
    recordStreamIcon.style.setProperty('color', '#ffffff');
    downloadRecordedStream();

    if (isMobileDevice) elemDisplay(swapCameraBtn, true, 'block');

    playSound('recStop');
    screenReaderAccessibility.announceMessage('Recording stopped');
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
    displayElements([
        { element: pauseRecBtn, display: false },
        { element: resumeRecBtn, display: true },
    ]);
}
/**
 * Resume recording display buttons
 */
function resumeRecButtons() {
    displayElements([
        { element: resumeRecBtn, display: false },
        { element: pauseRecBtn, display: true },
    ]);
}
/**
 * Reset recording display buttons
 */
function resetRecButtons() {
    displayElements([
        { element: pauseRecBtn, display: false },
        { element: resumeRecBtn, display: false },
    ]);
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
 * Get WebM duration fixer function
 * @returns {Function|null}
 */
function getWebmFixerFn() {
    const fn = window.FixWebmDuration;
    return typeof fn === 'function' ? fn : null;
}

/**
 * Download recorded stream
 */
async function downloadRecordedStream() {
    try {
        // Check if we have recorded data
        if (!recordedBlobs || recordedBlobs.length === 0) {
            console.error('No recorded data available');
            userLog('error', 'Recording failed: No data was recorded', 6000);
            return;
        }

        const type = recordedBlobs[0].type.includes('mp4') ? 'mp4' : 'webm';
        const rawBlob = new Blob(recordedBlobs, { type: 'video/' + type });
        const recFileName = getDataTimeString() + '-REC.' + type;
        const currentDevice = isMobileDevice ? 'MOBILE' : 'PC';
        const blobFileSize = bytesToSize(rawBlob.size);

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
        lastRecordingInfo.innerHTML = renderRoomTemplate('tpl-last-recording-info', {
            html: {
                recordingInfo,
            },
        });
        recordingTime.innerText = '';

        msgHTML(
            null,
            null,
            'Recording',
            `<div style="text-align: left;">
                🔴 &nbsp; Recording Info:
                ${recordingInfo}
                Please wait to be processed, then will be downloaded to your ${currentDevice} device.
            </div>`,
            'top'
        );

        // Fix WebM duration to make it seekable
        const fixWebmDuration = async (blob) => {
            if (type !== 'webm') return blob;
            try {
                const fix = getWebmFixerFn();
                const durationMs = recStartTs ? performance.now() - recStartTs : undefined;
                const fixed = await fix(blob, durationMs);
                return fixed || blob;
            } catch (e) {
                console.warn('WEBM duration fix failed, saving original blob:', e);
                return blob;
            } finally {
                recStartTs = null;
            }
        };

        (async () => {
            const finalBlob = await fixWebmDuration(rawBlob);
            saveBlobToFile(finalBlob, recFileName);
        })();
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
        // make chat room participants draggable for desktop
        dragElement(msgerDraggable, msgerCPHeader);
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
        elemDisplay(bottomButtons, false);
        isButtonsVisible = false;
        if (isChatPinned) {
            chatUnpin();
        }
        setSP('--msger-width', '99%');
        setSP('--msger-height', '99%');
    }
    //chatLeftCenter();
    chatCenter();

    isChatRoomVisible = true;

    if (!isMobileDevice && canBePinned() && pinChatByDefault && !isChatPinned && !isCaptionPinned) {
        chatPin();
    }

    syncParticipantsPanelVisibility();
    syncChatToolbarButtons();

    setTippy(chatRoomBtn, 'Close the chat (C)', bottomButtonsPlacement);
    screenReaderAccessibility.announceMessage('Chat opened');
}

/**
 * Sync the active visual state of the chat / participants toolbar buttons
 * with the current chat & participants panel visibility.
 */
function syncChatToolbarButtons() {
    const participantsActive = isOpeningParticipants || !!(msgerCPBtn && msgerCPBtn.classList.contains('active'));
    const chatActive = !!isChatRoomVisible && !participantsActive;
    if (chatRoomBtn) {
        chatRoomBtn.classList.toggle('is-active', chatActive);
        chatRoomBtn.setAttribute('aria-pressed', chatActive ? 'true' : 'false');
    }
    if (participantsBtn) {
        participantsBtn.classList.toggle('is-active', participantsActive);
        participantsBtn.setAttribute('aria-pressed', participantsActive ? 'true' : 'false');
        participantsBtn.setAttribute('aria-expanded', participantsActive ? 'true' : 'false');
    }
}

function shouldDockParticipantsPanel() {
    return !isMobileDevice && window.innerWidth > 1200;
}

function syncParticipantsListContainer(showParticipantsPanel = false) {
    if (!msgerCPList || !msgerCPChat || !msgerPrivateChatsEmpty?.parentElement) {
        return;
    }

    const sidebarContainer = msgerPrivateChatsEmpty.parentElement;
    const useMobilePanel = isChatRoomVisible && (isMobileDevice || window.innerWidth <= 820) && showParticipantsPanel;

    if (useMobilePanel) {
        if (msgerCPList.parentElement !== msgerCPChat) {
            msgerCPChat.appendChild(msgerCPList);
        }
        return;
    }

    if (msgerCPList.parentElement !== sidebarContainer) {
        msgerPrivateChatsEmpty.insertAdjacentElement('afterend', msgerCPList);
    }
}

function syncParticipantsPanelVisibility(forceVisible = null) {
    if (!msgerCP || !msgerMain) {
        return;
    }

    const canShowParticipantsPanel = isChatRoomVisible && (isMobileDevice || window.innerWidth <= 820);
    const shouldShow = forceVisible === null ? isParticipantsVisible : forceVisible;

    if (!canShowParticipantsPanel) {
        syncParticipantsListContainer(false);
        elemDisplay(msgerMain, true, 'flex');
        elemDisplay(msgerCP, false);
        msgerCP.setAttribute('aria-hidden', 'true');
        msgerDraggable.classList.remove('msger-mobile-participants-open');
        msgerCPBtn.classList.remove('active');
        closeAllMsgerParticipantDropdownMenus();
        isParticipantsVisible = false;
        syncChatToolbarButtons();
        return;
    }

    syncParticipantsListContainer(shouldShow);
    elemDisplay(msgerMain, !shouldShow, 'flex');
    elemDisplay(msgerCP, shouldShow, 'flex');
    msgerCP.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    msgerDraggable.classList.toggle('msger-mobile-participants-open', shouldShow);
    msgerCPBtn.classList.toggle('active', shouldShow);

    if (shouldShow) {
        if (isMobileDevice || window.innerWidth <= 820) {
            msgerCPCloseBtn?.focus();
        } else {
            searchPeerBarName?.focus();
        }
    } else {
        closeAllMsgerParticipantDropdownMenus();
    }

    isParticipantsVisible = shouldShow;
    syncChatToolbarButtons();
    toggleMsgerParticipantsEmptyNotice();
}

/**
 * Show caption box draggable on center screen position
 */
function showCaptionDraggable() {
    playSound('newMessage');
    if (isMobileDevice) {
        elemDisplay(bottomButtons, false);
        isButtonsVisible = false;
    }

    captionCenter();

    const captionIcon = captionBtn.querySelector('i');
    captionIcon.className = 'far fa-closed-captioning';

    isCaptionBoxVisible = true;

    if (isDesktopDevice && canBePinned() && !isChatPinned && !isCaptionPinned) {
        captionPin();
    }

    screenReaderAccessibility.announceMessage('Caption opened');
}

/**
 * Toggle Chat dropdown menu
 */
function toggleChatDropDownMenu() {
    msgerDropDownContent.style.display === 'block'
        ? (msgerDropDownContent.style.display = 'none')
        : (msgerDropDownContent.style.display = 'block');
}

function toggleCaptionDropDownMenu() {
    captionDropDownContent.style.display === 'block'
        ? (captionDropDownContent.style.display = 'none')
        : (captionDropDownContent.style.display = 'block');
}

function closeMsgerDropdownMenus() {
    [msgerDropDownContent, msgerCPDropDownContent, msgerSidebarDropDownContent, captionDropDownContent].forEach(
        (menuEl) => {
            if (menuEl) {
                elemDisplay(menuEl, false);
            }
        }
    );
}

function isEventInsideElements(target, ...elements) {
    return elements.some((element) => element && (element === target || element.contains(target)));
}

function handleMsgerDropdownOutsidePress(event) {
    if (
        isEventInsideElements(
            event.target,
            msgerDropDownMenuBtn,
            msgerDropDownContent,
            msgerCPDropDownMenuBtn,
            msgerCPDropDownContent,
            msgerSidebarDropDownMenuBtn,
            msgerSidebarDropDownContent,
            captionDropDownMenuBtn,
            captionDropDownContent
        )
    ) {
        return;
    }

    closeMsgerDropdownMenus();
}

function toggleParticipantsDropDownMenu(activeMenu, siblingMenu = null) {
    if (!activeMenu) {
        return;
    }

    if (siblingMenu) {
        siblingMenu.style.display = 'none';
    }

    activeMenu.style.display === 'block' ? (activeMenu.style.display = 'none') : (activeMenu.style.display = 'block');
}

function syncCaptionEveryoneButtons(isActive) {
    elemDisplay(captionEveryoneBtn, !isActive, 'inline');
    elemDisplay(captionEveryoneStopBtn, isActive, 'inline');
    elemDisplay(captionEveryoneBtnDesktop, !isActive, 'inline');
    elemDisplay(captionEveryoneStopBtnDesktop, isActive, 'inline');

    elemDisplay(captionEveryoneBtn?.closest('li'), !isActive);
    elemDisplay(captionEveryoneStopBtn?.closest('li'), isActive);
    elemDisplay(captionEveryoneBtnDesktop?.closest('li'), !isActive);
    elemDisplay(captionEveryoneStopBtnDesktop?.closest('li'), isActive);
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
            setSP('--msger-width', 'min(1120px, 92vw)');
            setSP('--msger-height', 'min(760px, 92vh)');
        }
    } else {
        setSP('--msger-width', '25%');
        setSP('--msger-height', '100%');
    }
}

function setChatPinnedLayout(isPinned) {
    msgerDraggable.classList.toggle('msger-pinned', isPinned);
    if (!isPinned) {
        msgerDraggable.classList.remove('msger-pinned-sidebar-open');
    }
    msgerCPBtn.classList.toggle('active', false);
    msgerTogglePin.classList.toggle('active', isPinned);
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
    setChatPinnedLayout(true);
    setColor(msgerTogglePin, 'lime');
    resizeVideoMedia();
    if (!isMobileDevice) {
        undragElement(msgerDraggable, msgerHeader);
    }
    msgerDraggable.classList.remove('panel-slide-in');
    void msgerDraggable.offsetWidth; // force reflow so the animation always restarts
    msgerDraggable.classList.add('panel-slide-in');
}

/**
 * Handle chat unpin
 */
function chatUnpin() {
    videoMediaContainerUnpin();
    msgerDraggable.classList.remove('panel-slide-in');
    setSP('--msger-width', 'min(1120px, 92vw)');
    setSP('--msger-height', 'min(760px, 92vh)');
    elemDisplay(msgerMinBtn, false);
    buttons.chat.showMaxBtn && elemDisplay(msgerMaxBtn, true);
    isChatPinned = false;
    setChatPinnedLayout(false);
    //chatLeftCenter();
    chatCenter();
    setColor(msgerTogglePin, 'white');
    resizeVideoMedia();
    if (!isMobileDevice) {
        dragElement(msgerDraggable, msgerHeader);
    }
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
    captionDraggable.classList.add('caption-pinned');
    setColor(captionTogglePin, 'lime');
    resizeVideoMedia();
    if (!isMobileDevice) undragElement(captionDraggable, captionHeader);
    captionDraggable.classList.remove('panel-slide-in');
    void captionDraggable.offsetWidth; // force reflow so the animation always restarts
    captionDraggable.classList.add('panel-slide-in');
}

/**
 * Handle caption unpin
 */
function captionUnpin() {
    videoMediaContainerUnpin();
    captionDraggable.classList.remove('panel-slide-in');
    setSP('--caption-width', '420px');
    setSP('--caption-height', '680px');
    elemDisplay(captionMinBtn, false);
    buttons.caption.showMaxBtn && elemDisplay(captionMaxBtn, true);
    isCaptionPinned = false;
    captionDraggable.classList.remove('caption-pinned');
    //captionRightCenter();
    captionCenter();
    setColor(captionTogglePin, 'white');
    resizeVideoMedia();
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
        position: 'top',
        title: 'Chat',
        text: 'Clean up chat messages?',
        imageUrl: images.delete,
        showDenyButton: true,
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        // clean chat messages
        if (result.isConfirmed) {
            // Remove only elements with class 'msg' inside msgerChat
            const messages = msgerChat.querySelectorAll('.msg');
            messages.forEach((msg) => msgerChat.removeChild(msg));
            // clean chat messages
            chatMessages = [];
            // clean chatGPT context
            chatGPTcontext = [];
            // show empty messages
            toggleMsgerEmptyNotice();
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
        position: 'top',
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
            // Remove only elements with class 'msg' inside captionChat
            const captions = Array.from(captionChat.querySelectorAll('.msg'));
            captions.forEach((caption) => captionChat.removeChild(caption));
            // clean object
            transcripts = [];
            // show empty caption
            showCaptionEmptyNoticeIfNoCaptions();
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
    elemDisplay(msgerCP, false);
    elemDisplay(msgerEmojiPicker, false);
    setColor(msgerEmojiBtn, '#FFFFFF');
    isChatRoomVisible = false;
    isParticipantsVisible = false;
    isChatOpenedByParticipantsBtn = false;
    isChatEmojiVisible = false;
    setTippy(chatRoomBtn, 'Open the chat (C)', bottomButtonsPlacement);
    syncChatToolbarButtons();
    screenReaderAccessibility.announceMessage('Chat closed');
}

/**
 * Hide chat room and emoji picker
 */
function hideCaptionBox() {
    if (isCaptionPinned) {
        captionUnpin();
    }
    elemDisplay(captionDraggable, false);

    const captionIcon = captionBtn.querySelector('i');
    captionIcon.className = 'fas fa-closed-captioning';

    isCaptionBoxVisible = false;
}

/**
 * Send Chat messages to peers in the room
 */
async function sendChatMessage() {
    if (!thereArePeerConnections() && !isChatGPTConversationActive()) {
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

    const msgId = createChatMessageId();

    if (activeConversation.type === 'private' && activeConversation.peerId === CHAT_GPT_PEER_ID) {
        appendMessage(myPeerName, rightChatAvatar, 'right', msg, true, msgId, CHAT_GPT_NAME);
        await getChatGPTmessage(msg);
    } else if (activeConversation.type === 'private' && activeConversation.peerName) {
        emitMsg(myPeerName, myPeerAvatar, activeConversation.peerName, msg, true, myPeerId, msgId);
        appendMessage(myPeerName, rightChatAvatar, 'right', msg, true, msgId, activeConversation.peerName);
    } else {
        emitMsg(myPeerName, myPeerAvatar, 'toAll', msg, false, myPeerId, msgId);
        appendMessage(myPeerName, rightChatAvatar, 'right', msg, false, msgId);
    }
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
    const msgFromAvatar = filterXSS(dataMessage.fromAvatar);
    const msgFromId = filterXSS(dataMessage.fromId);
    const msgTo = filterXSS(dataMessage.to);
    const msg = filterXSS(dataMessage.msg);
    const msgPrivate = filterXSS(dataMessage.privateMsg);
    const msgId = filterXSS(dataMessage.msg_id || '');

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

    if (msgPrivate) {
        if (!isConversationCurrentlyVisible('private', msgFrom, msgFromId)) {
            addUnreadMessage('private', msgFromId);

            if (isChatRoomVisible && isChatPinned) {
                openPinnedParticipantsSidebar();
            }
        }
    } else if (!isConversationCurrentlyVisible('public')) {
        addUnreadMessage('public');
    }

    setPeerChatAvatarImgName('left', msgFrom, msgFromAvatar);
    appendMessage(msgFrom, leftChatAvatar, 'left', msg, msgPrivate, msgId, msgFrom);
    speechInMessages ? speechMessage(true, msgFrom, msg) : playSound('chatMessage');

    // Screen reader announcement for incoming chat message
    if (!speechInMessages) {
        screenReaderAccessibility.announceMessage(`New message from ${msgFrom}`);
    }
}

/**
 * Clean input txt message
 */
function cleanMessageInput() {
    msgerInput.value = '';
    checkLineBreaks();
}

/**
 * Create a unique message id used by chat reactions.
 * @returns {string}
 */
function createChatMessageId() {
    return `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Ensure a safe, non-empty message id.
 * @param {string|null} msgId
 * @returns {string}
 */
function normalizeChatMessageId(msgId) {
    const raw = String(msgId || '').trim();
    const safe = raw.replace(/[^a-zA-Z0-9:_-]/g, '');
    return safe || createChatMessageId();
}

/**
 * Find rendered chat message element by message id.
 * @param {string} msgId
 * @returns {HTMLElement|null}
 */
function getChatMessageElement(msgId) {
    const normalizedId = normalizeChatMessageId(msgId);
    return msgerChat?.querySelector(`.msg[data-msg-id="${normalizedId}"]`) || null;
}

/**
 * Toggle emoji reaction picker for a message bubble.
 * @param {string} msgId
 * @param {HTMLElement|null} triggerElement
 */
function toggleReactionPicker(msgId, triggerElement = null) {
    const messageElement = getChatMessageElement(msgId);
    if (!messageElement) return;

    const footer = messageElement.querySelector('.msg-footer');
    if (!footer) return;

    const existingPicker = footer.querySelector('.reaction-picker');
    if (existingPicker) {
        existingPicker.remove();
        triggerElement?.blur();
        return;
    }

    // Close any other open pickers
    msgerChat.querySelectorAll('.reaction-picker').forEach((picker) => picker.remove());

    const picker = document.createElement('div');
    picker.className = 'reaction-picker';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', 'Reaction emoji picker');

    const buttons = [];

    CHAT_REACTION_EMOJIS.forEach((emoji, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'reaction-emoji-btn';
        button.textContent = emoji;
        button.setAttribute('data-emoji', emoji);
        button.setAttribute('aria-label', `React with ${emoji}`);
        button.onclick = (e) => sendChatReaction(msgId, emoji, e);

        button.onkeydown = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                buttons[(index + 1) % buttons.length]?.focus();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                picker.remove();
                triggerElement?.focus();
            }
        };

        buttons.push(button);
        picker.appendChild(button);
    });

    footer.appendChild(picker);

    // Focus first button
    setTimeout(() => picker.querySelector('.reaction-emoji-btn')?.focus(), 0);
}

/**
 * Send reaction to peers and update local bubble.
 * @param {string} msgId
 * @param {string} emoji
 * @param {Event} event
 */
function sendChatReaction(msgId, emoji, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const normalizedMsgId = normalizeChatMessageId(msgId);
    if (!normalizedMsgId || !emoji) return;

    const messageElement = getChatMessageElement(normalizedMsgId);
    if (!messageElement) return;

    const currentBadge = messageElement.querySelector(`.reaction-badge[data-emoji="${emoji}"]`);
    const currentPeers = currentBadge?.dataset.peers
        ? currentBadge.dataset.peers
              .split(',')
              .map((peer) => peer.trim())
              .filter(Boolean)
        : [];
    const action = currentPeers.includes(myPeerName) ? 'remove' : 'add';

    applyReactionToElement(messageElement, emoji, myPeerName, action);

    sendToDataChannel({
        type: 'chatReaction',
        msg_id: normalizedMsgId,
        emoji: emoji,
        peer_name: myPeerName,
        fromId: myPeerId,
        action: action,
    });

    msgerChat.querySelectorAll('.reaction-picker').forEach((picker) => picker.remove());
}

/**
 * Handle incoming data channel chat reactions.
 * @param {object} dataMessage
 */
function handleDataChannelChatReaction(dataMessage) {
    if (!dataMessage) return;

    const fromId = filterXSS(dataMessage.fromId || '');
    const peerName = filterXSS(dataMessage.peer_name || '');

    if (fromId && allPeers[fromId]?.peer_name && allPeers[fromId].peer_name !== peerName) {
        console.log('Fake reaction detected', {
            realFrom: allPeers[fromId].peer_name,
            fakeFrom: peerName,
            msgId: dataMessage.msg_id,
            emoji: dataMessage.emoji,
        });
        return;
    }

    handleChatReaction(dataMessage);
}

/**
 * Apply reaction updates to a message element with smart badge display.
 * @param {HTMLElement} messageElement
 * @param {string} emoji
 * @param {string} peerName
 * @param {string} action
 */
function applyReactionToElement(messageElement, emoji, peerName, action = 'add') {
    if (!messageElement || !emoji || !peerName) return;

    const footer = messageElement.querySelector('.msg-footer');
    if (!footer) return;

    let reactionsContainer = footer.querySelector('.message-reactions');
    if (!reactionsContainer && action === 'add') {
        reactionsContainer = document.createElement('div');
        reactionsContainer.className = 'message-reactions';
        footer.appendChild(reactionsContainer);
    }

    if (!reactionsContainer) return;

    let badge = reactionsContainer.querySelector(`.reaction-badge[data-emoji="${emoji}"]`);
    let peers = badge?.dataset.peers
        ? badge.dataset.peers
              .split(',')
              .map((peer) => peer.trim())
              .filter(Boolean)
        : [];

    if (action === 'remove') {
        peers = peers.filter((peer) => peer !== peerName);
    } else if (!peers.includes(peerName)) {
        peers.push(peerName);
    }

    if (peers.length === 0) {
        if (badge) badge.remove();
        if (!reactionsContainer.querySelector('.reaction-badge')) reactionsContainer.remove();
        return;
    }

    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'reaction-badge';
        badge.dataset.emoji = emoji;
        const msgId = messageElement.dataset.msgId || '';
        badge.dataset.msgId = msgId;
        badge.onclick = (event) => sendChatReaction(msgId, emoji, event);
        reactionsContainer.appendChild(badge);
    }

    badge.dataset.peers = peers.join(', ');
    badge.textContent = `${emoji} ${peers.length}`;
    badge.classList.toggle('my-reaction', peers.includes(myPeerName));
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
    config.peer_avatar = filterXSS(config.peer_avatar);

    const { peer_name, peer_avatar, text_data } = config;

    const time_stamp = getFormatDate(new Date());

    const avatar_image =
        peer_avatar && isValidAvatarURL(peer_avatar)
            ? peer_avatar
            : isValidEmail(peer_name)
              ? genGravatar(peer_name)
              : genAvatarSvg(peer_name, 32);

    if (!isCaptionBoxVisible && transcriptShowOnMsg) showCaptionDraggable();

    // avatar_image is a user-controlled URL; do NOT interpolate it into
    // insertAdjacentHTML — filterXSS encodes " to &quot; which the HTML
    // parser decodes back to " in attribute context (double-decode XSS).
    // Use a temporary id and setAttribute instead.
    const captionAvatarTmpId = `capt-av-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const msgHTML = renderRoomTemplate('tpl-caption-message', {
        text: {
            captionInfoText: `${peer_name} : ${time_stamp}`,
            captionText: text_data,
        },
        attrs: {
            captionAvatarTmpId,
        },
    });
    captionChat.insertAdjacentHTML('beforeend', msgHTML);
    const captionAvatarEl = document.getElementById(captionAvatarTmpId);
    if (captionAvatarEl) {
        captionAvatarEl.setAttribute('src', avatar_image);
        captionAvatarEl.removeAttribute('id');
    }
    captionChat.scrollTop += 500;
    transcripts.push({
        time: time_stamp,
        name: peer_name,
        caption: text_data,
    });

    showCaptionEmptyNoticeIfNoCaptions();
    playSound('speech');
}

/**
 * Hide empty caption notice
 */
function showCaptionEmptyNoticeIfNoCaptions() {
    const captions = captionChat.querySelectorAll('.msg');
    captions.length === 0 ? captionEmptyNotice.classList.remove('hidden') : captionEmptyNotice.classList.add('hidden');
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
 * @param {string} to peer name
 */
function appendMessage(from, img, side, msg, privateMsg, msgId = null, to = '') {
    let time = getFormatDate(new Date());

    // sanitize all params
    const getFrom = filterXSS(from);
    const getTo = filterXSS(to);
    const getSide = filterXSS(side);
    // img is always internally computed (isValidAvatarURL / genAvatarSvg / genGravatar) and is
    // set via setAttribute — no XSS risk. filterXSS must NOT be applied here because it encodes
    // '<', '>' and '&' which breaks SVG data URIs produced by genAvatarSvg.
    const getImg =
        getFrom === CHAT_GPT_NAME && getSide === 'left'
            ? images.chatgpt
            : isValidAvatarURL(img) || (typeof img === 'string' && img.startsWith('data:image/'))
              ? img
              : '';
    const getMsg = filterXSS(msg);
    const getPrivateMsg = filterXSS(privateMsg);
    const normalizedMsgId = normalizeChatMessageId(msgId);

    // collect chat messages to save it later
    const conversationPeer = getPrivateMsg ? (getSide === 'left' ? getFrom : getTo) : '';
    chatMessages.push({
        time: time,
        from: getFrom,
        to: getTo,
        msg: getMsg,
        privateMsg: getPrivateMsg,
        conversationPeer: conversationPeer,
    });

    // check if i receive a private message
    let msgBubble = getPrivateMsg ? 'private-msg-bubble' : 'msg-bubble';

    // getImg is a user-controlled URL; use a temporary id and setAttribute
    // after insertion to avoid double-decode XSS via insertAdjacentHTML.
    const msgAvatarTmpId = `msg-av-${chatMessagesId}`;
    let messageActionsHTML = `
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
                    onclick="copyToClipboard('message-${chatMessagesId}')"
                ></button>`;
    messageActionsHTML += `
                <button
                    id="msg-reaction-${chatMessagesId}"
                    class="reaction-toggle-btn"
                    style="color:#fff; border:none; background:transparent;"
                    onclick="toggleReactionPicker('${normalizedMsgId}', this)"
                >😊</button>`;
    if (isSpeechSynthesisSupported) {
        messageActionsHTML += `
                <button
                    id="msg-speech-${chatMessagesId}"
                    class="${className.speech}" 
                    style="color:#fff; border:none; background:transparent;"
                    onclick="speechElementText(false, '${escapeJsString(getFrom)}', 'message-${chatMessagesId}')"
                ></button>`;
    }

    const msgHTML = renderRoomTemplate('tpl-msger-chat-message', {
        text: {
            senderName: getFrom,
            messageTime: time,
        },
        html: {
            messageActions: messageActionsHTML,
        },
        attrs: {
            messageContainerId: `msg-${chatMessagesId}`,
            messageContainerClass: `msg ${getSide}-msg`,
            chatType: getPrivateMsg ? 'private' : 'public',
            chatPeer: conversationPeer,
            messageId: normalizedMsgId,
            messageAvatarTmpId: msgAvatarTmpId,
            messageBubbleClass: msgBubble,
            messageTextId: `message-${chatMessagesId}`,
        },
    });

    msgerChat.insertAdjacentHTML('beforeend', msgHTML);
    const msgAvatarEl = document.getElementById(msgAvatarTmpId);
    if (msgAvatarEl) {
        msgAvatarEl.setAttribute('src', getImg);
        msgAvatarEl.removeAttribute('id');
    }

    const message = getId(`message-${chatMessagesId}`);
    if (message) {
        if (getFrom === 'ChatGPT') {
            // Stream the message for ChatGPT
            streamMessage(message, getMsg, 100);
        } else {
            // Process the message for other senders
            message.innerHTML = processMessage(getMsg);
            hljs.highlightAll();
        }
    }

    msgerChat.scrollTop += 500;
    filterMessagesByConversation();
    refreshMessageGrouping();
    if (!isMobileDevice) {
        setTippy(getId('msg-delete-' + chatMessagesId), 'Delete', 'top');
        setTippy(getId('msg-copy-' + chatMessagesId), 'Copy', 'top');
        setTippy(getId('msg-reaction-' + chatMessagesId), 'React', 'top');
        setTippy(getId('msg-speech-' + chatMessagesId), 'Speech', 'top');
    }
    chatMessagesId++;
    toggleMsgerEmptyNotice();
}

/**
 * Toggle empty chat notice
 */
function toggleMsgerEmptyNotice() {
    const messages = Array.from(msgerChat.querySelectorAll('.msg')).filter(
        (message) => message.style.display !== 'none'
    );
    messages.length === 0 ? msgerEmptyNotice.classList.remove('hidden') : msgerEmptyNotice.classList.add('hidden');
}

function refreshMessageGrouping() {
    const messages = Array.from(msgerChat.querySelectorAll('.msg')).filter(
        (message) => message.style.display !== 'none'
    );
    let previousKey = '';

    messages.forEach((message) => {
        const sender = message.dataset.sender || '';
        const chatType = message.dataset.chatType || 'public';
        const chatPeer = message.dataset.chatPeer || '';
        const side = message.classList.contains('right-msg') ? 'right' : 'left';
        const currentKey = `${side}:${sender}:${chatType}:${chatPeer}`;
        const isGrouped = currentKey === previousKey;

        message.classList.toggle('msg-grouped', isGrouped);
        previousKey = currentKey;
    });
}

function formatUnreadCount(count) {
    return count > 99 ? '99+' : String(count);
}

function updateUnreadBadge(element, count) {
    if (!element) return;
    element.textContent = formatUnreadCount(count);
    element.classList.toggle('hidden', count <= 0);
}

function refreshUnreadBadges() {
    updateUnreadBadge(msgerRoomChatBadge, unreadMessages.public);

    msgerCPList.querySelectorAll('.msger-chat-item').forEach((item) => {
        const peerId = item.dataset.peerId;
        if (!peerId) return;
        const badge = getId(peerId + '_pMsgBadge');
        updateUnreadBadge(badge, unreadMessages.private[peerId] || 0);
    });
}

function clearUnreadMessages(type = 'public', peerId = '') {
    if (type === 'private' && peerId) {
        unreadMessages.private[peerId] = 0;
    } else {
        unreadMessages.public = 0;
    }
    refreshUnreadBadges();
}

function addUnreadMessage(type = 'public', peerId = '') {
    if (type === 'private' && peerId) {
        unreadMessages.private[peerId] = (unreadMessages.private[peerId] || 0) + 1;
    } else {
        unreadMessages.public += 1;
    }
    refreshUnreadBadges();
}

function isConversationCurrentlyVisible(type = 'public', peerName = '', peerId = '') {
    if (!isChatRoomVisible) return false;
    if (type === 'private') {
        return (
            activeConversation.type === 'private' &&
            ((peerId && activeConversation.peerId === peerId) ||
                (peerName && activeConversation.peerName.toLowerCase() === peerName.toLowerCase()))
        );
    }
    return activeConversation.type === 'public';
}

function getConversationMeta() {
    if (activeConversation.type === 'private' && activeConversation.peerId === CHAT_GPT_PEER_ID) {
        return {
            label: 'AI assistant',
            title: CHAT_GPT_NAME,
            meta: `Direct messages with ${CHAT_GPT_NAME}.`,
            placeholder: `Ask ${CHAT_GPT_NAME}...`,
        };
    }

    if (activeConversation.type === 'private' && activeConversation.peerName) {
        return {
            label: 'Private chat',
            title: activeConversation.peerName,
            meta: `Direct messages with ${activeConversation.peerName}.`,
            placeholder: `Message ${activeConversation.peerName}...`,
        };
    }

    return {
        label: 'Current view',
        title: 'All messages',
        meta: 'Public messages appear here.',
        placeholder: 'Write a message...',
    };
}

function updateConversationUi() {
    const conversation = getConversationMeta();

    if (msgerConversationLabel) msgerConversationLabel.textContent = conversation.label;
    if (msgerConversationTitle) msgerConversationTitle.textContent = conversation.title;
    if (msgerConversationMeta) msgerConversationMeta.textContent = conversation.meta;
    if (msgerInput) msgerInput.placeholder = conversation.placeholder;

    if (msgerRoomChatItem) {
        msgerRoomChatItem.classList.toggle('active', activeConversation.type === 'public');
    }

    msgerCPList.querySelectorAll('.msger-chat-item').forEach((item) => {
        const isActive =
            activeConversation.type === 'private' &&
            item.value &&
            item.value.toLowerCase() === activeConversation.peerName.toLowerCase();
        item.classList.toggle('active', isActive);
    });
}

function filterMessagesByConversation() {
    const conversationPeer = activeConversation.peerName.toLowerCase();

    msgerChat.querySelectorAll('.msg').forEach((message) => {
        const chatType = message.dataset.chatType || 'public';
        const chatPeer = (message.dataset.chatPeer || '').toLowerCase();
        const shouldShow =
            activeConversation.type === 'private'
                ? chatType === 'private' && chatPeer === conversationPeer
                : chatType === 'public';

        elemDisplay(message, shouldShow, 'flex');
    });

    refreshMessageGrouping();
    toggleMsgerEmptyNotice();
    msgerChat.scrollTop = msgerChat.scrollHeight;
}

function setActiveConversation(type = 'public', peerName = '', peerId = '') {
    activeConversation = {
        type,
        peerName: filterXSS(peerName || ''),
        peerId: peerId || '',
    };

    if (type === 'private' && peerId) {
        clearUnreadMessages('private', peerId);
    } else {
        clearUnreadMessages('public');
    }

    updateConversationUi();
    filterMessagesByConversation();
}

function isChatGPTConversationActive() {
    return activeConversation.type === 'private' && activeConversation.peerId === CHAT_GPT_PEER_ID;
}

function resolvePeerNameById(peerId = '') {
    if (!peerId) return '';
    if (peerId === CHAT_GPT_PEER_ID) return CHAT_GPT_NAME;

    const privateChatButton = getId(peerId + '_pMsgBtn');
    const privatePeerName = privateChatButton?.dataset?.value || privateChatButton?.getAttribute('data-value');
    if (privatePeerName) {
        return privatePeerName;
    }

    return allPeers[peerId]?.peer_name || '';
}

function getConversationShareTarget(actionLabel = 'this item') {
    if (activeConversation.type !== 'private') {
        return {
            broadcast: true,
            peerId: myPeerId,
            videoPeerId: null,
            peerName: '',
        };
    }

    if (!activeConversation.peerId || activeConversation.peerId === CHAT_GPT_PEER_ID) {
        userLog('info', `Switch to a participant chat to share ${actionLabel}`);
        return null;
    }

    return {
        broadcast: false,
        peerId: activeConversation.peerId,
        videoPeerId: activeConversation.peerId,
        peerName: activeConversation.peerName || resolvePeerNameById(activeConversation.peerId),
    };
}

function ensureChatGPTConversationEntry() {
    if (!msgerCPList || !buttons.chat.showChatGPTBtn || getId(CHAT_GPT_PEER_ID + '_pMsgDiv')) {
        return;
    }

    const chatGPTEntry = renderRoomTemplate('tpl-chatgpt-participant-entry', {
        text: {
            participantName: CHAT_GPT_NAME,
            participantSubtitle: 'Ask anything',
        },
        attrs: {
            participantName: CHAT_GPT_NAME,
            entryId: `${CHAT_GPT_PEER_ID}_pMsgDiv`,
            entryPeerName: CHAT_GPT_NAME.toLowerCase(),
            buttonId: `${CHAT_GPT_PEER_ID}_pMsgBtn`,
            participantPeerId: CHAT_GPT_PEER_ID,
            avatarId: `${CHAT_GPT_PEER_ID}_pMsgAvatar`,
            avatarSrc: images.chatgpt,
            badgeId: `${CHAT_GPT_PEER_ID}_pMsgBadge`,
        },
    });

    msgerCPList.insertAdjacentHTML('afterbegin', chatGPTEntry);

    const msgerPrivateBtn = getId(CHAT_GPT_PEER_ID + '_pMsgBtn');

    addMsgerPrivateBtn(msgerPrivateBtn, null, null, null, null, null, null, null, null, myPeerId, CHAT_GPT_PEER_ID);

    toggleMsgerParticipantsEmptyNotice();
    refreshUnreadBadges();
    updateConversationUi();
}

/**
 * Toggle empty participants notice
 */
function toggleMsgerParticipantsEmptyNotice() {
    const privateChats = msgerCPList.querySelectorAll('.msger-private-chat-entry');
    const hasPrivateChats = privateChats.length !== 0;
    const isMobileParticipantsView = msgerCPList.parentElement === msgerCPChat;

    msgerEmptyParticipantsNotice?.classList.toggle('hidden', hasPrivateChats || !isMobileParticipantsView);
    msgerPrivateChatsEmpty?.classList.toggle('hidden', hasPrivateChats || isMobileParticipantsView);
    elemDisplay(msgerCPList, hasPrivateChats, 'flex');
    elemDisplay(msgerParticipantsList, false);
}

/**
 * Escape a value for safe embedding inside a single-quoted JavaScript string
 * literal that lives in an HTML attribute (e.g. an inline onclick handler).
 *
 * filterXSS() / DOMPurify do NOT encode characters that break out of a JS
 * string context (single-quote, backslash, newline). Embedding user-controlled
 * data such as a peer name directly in an inline handler without this escape
 * allows a stored XSS where a crafted name like `X', alert(1), '` would close
 * the string argument and inject an arbitrary JS expression as a new argument.
 *
 * @param {*} value
 * @returns {string}
 */
function escapeJsString(value) {
    return String(value == null ? '' : value)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029')
        .replace(/</g, '\\x3C')
        .replace(/>/g, '\\x3E')
        .replace(/&/g, '\\x26');
}

/**
 * Process Messages
 * @param {string} message
 * @returns string message processed
 */
function processMessage(message) {
    const codeBlockRegex = /```([a-zA-Z0-9]+)?\n([\s\S]*?)```/g;
    let parts = [];
    let lastIndex = 0;

    message.replace(codeBlockRegex, (match, lang, code, offset) => {
        if (offset > lastIndex) {
            parts.push({ type: 'text', value: message.slice(lastIndex, offset) });
        }
        parts.push({ type: 'code', lang, value: code });
        lastIndex = offset + match.length;
    });

    if (lastIndex < message.length) {
        parts.push({ type: 'text', value: message.slice(lastIndex) });
    }

    return parts
        .map((part) => {
            if (part.type === 'text') {
                return part.value;
            } else if (part.type === 'code') {
                return `<pre><code class="language-${part.lang || ''}">${part.value}</code></pre>`;
            }
        })
        .join('');
}

/**
 * Stream message
 * @param {string} element
 * @param {string} message
 * @param {integer} speed
 */
function streamMessage(element, message, speed = 100) {
    const parts = processMessage(message);
    const words = parts.split(' ');

    let textBuffer = '';
    let wordIndex = 0;

    const interval = setInterval(() => {
        if (wordIndex < words.length) {
            textBuffer += words[wordIndex] + ' ';
            element.innerHTML = textBuffer;
            wordIndex++;
        } else {
            clearInterval(interval);
            highlightCodeBlocks(element);
        }
    }, speed);

    function highlightCodeBlocks(element) {
        const codeBlocks = element.querySelectorAll('pre code');
        codeBlocks.forEach((block) => {
            hljs.highlightElement(block);
        });
    }
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
 * Speech element text
 * @param {boolean} newMsg true/false
 * @param {string} from peer_name
 * @param {string} elemId
 */
function speechElementText(newMsg = true, from, elemId) {
    const element = getId(elemId);
    speechMessage(newMsg, from, element.innerText);
}

/**
 * Delete message
 * @param {string} id msg id
 */
function deleteMessage(id) {
    playSound('newMessage');
    Swal.fire({
        background: swBg,
        position: 'top',
        title: 'Chat',
        text: 'Delete this messages?',
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
            refreshMessageGrouping();
            toggleMsgerEmptyNotice();
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

function closeAllMsgerParticipantDropdownMenus() {
    document
        .querySelectorAll('.msger-private-chat-entry .dropdown-menu-custom-list, .dropdown-menu-custom-list.floating')
        .forEach((menu) => {
            const placeholder = menu._msgerDropdownPlaceholder;
            if (placeholder?.parentNode) {
                placeholder.parentNode.insertBefore(menu, placeholder);
                placeholder.remove();
                menu._msgerDropdownPlaceholder = null;
            }
            menu.classList.remove('show', 'floating');
            menu.style.left = '';
            menu.style.top = '';
            menu.style.visibility = '';
            const toggle = menu._msgerDropdownToggle || menu.parentElement?.querySelector('.dropdown-toggle');
            toggle?.setAttribute('aria-expanded', 'false');
        });
    activeMsgerParticipantDropdown = null;
}

function positionMsgerParticipantDropdownMenu(toggleEl, menuEl) {
    if (!toggleEl || !menuEl) return;

    const gap = 8;
    const viewportPadding = 12;

    if (!menuEl._msgerDropdownPlaceholder && menuEl.parentNode) {
        const placeholder = document.createElement('span');
        placeholder.style.display = 'none';
        menuEl.parentNode.insertBefore(placeholder, menuEl);
        menuEl._msgerDropdownPlaceholder = placeholder;
    }

    menuEl._msgerDropdownToggle = toggleEl;
    document.body.appendChild(menuEl);

    menuEl.classList.add('show', 'floating');
    menuEl.style.visibility = 'hidden';
    menuEl.style.left = '0px';
    menuEl.style.top = '0px';
    menuEl.style.maxHeight = `${Math.max(260, window.innerHeight - viewportPadding * 2)}px`;

    const toggleRect = toggleEl.getBoundingClientRect();
    const menuWidth = Math.max(menuEl.offsetWidth, 220);
    const menuHeight = menuEl.offsetHeight;

    const maxLeft = window.innerWidth - menuWidth - viewportPadding;
    const preferredLeft = toggleRect.right - menuWidth;
    const left = Math.max(viewportPadding, Math.min(preferredLeft, maxLeft));

    const fitsBelow = toggleRect.bottom + gap + menuHeight <= window.innerHeight - viewportPadding;
    const top = fitsBelow ? toggleRect.bottom + gap : Math.max(viewportPadding, toggleRect.top - menuHeight - gap);

    menuEl.style.left = `${left}px`;
    menuEl.style.top = `${top}px`;
    menuEl.style.visibility = '';
}

function supportsHoverPointer() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function openMsgerParticipantDropdownMenu(toggleEl, menuEl) {
    if (!toggleEl || !menuEl) return;

    if (activeMsgerParticipantDropdown?.menuEl === menuEl) {
        return;
    }

    closeAllMsgerParticipantDropdownMenus();
    positionMsgerParticipantDropdownMenu(toggleEl, menuEl);
    toggleEl.setAttribute('aria-expanded', 'true');
    activeMsgerParticipantDropdown = { toggleEl, menuEl };
}

function toggleMsgerParticipantDropdownMenu(toggleEl, menuEl) {
    if (!toggleEl || !menuEl) return;

    const isOpen = menuEl.classList.contains('show');
    closeAllMsgerParticipantDropdownMenus();

    if (isOpen) return;

    openMsgerParticipantDropdownMenu(toggleEl, menuEl);
}

function handleMsgerParticipantDropdownDocumentClick(event) {
    if (!activeMsgerParticipantDropdown) return;

    const { toggleEl, menuEl } = activeMsgerParticipantDropdown;
    if (toggleEl?.contains(event.target) || menuEl?.contains(event.target)) {
        return;
    }

    closeAllMsgerParticipantDropdownMenus();
}

function getMsgerParticipantDropdownActionMarkup(buttonId, iconClass, label, variant = 'default') {
    const actionClass =
        variant === 'danger'
            ? 'dropdown-item app-dropdown-action msger-participant-action msger-participant-action-danger'
            : 'dropdown-item app-dropdown-action msger-participant-action';

    return `
        <li>
            <button id="${buttonId}" class="${actionClass}">
                <span class="msger-participant-action-icon"><i class="${iconClass}"></i></span>
                <span class="msger-participant-action-label">${label}</span>
            </button>
        </li>
    `;
}

function getMsgerParticipantDropdownDividerMarkup() {
    return `<li class="msger-dropdown-divider" aria-hidden="true"></li>`;
}

function getMsgerRoomActionsDropdownMarkup(idSuffix = '') {
    return `
        ${getMsgerParticipantDropdownActionMarkup(`captionEveryoneBtn${idSuffix}`, 'fas fa-play', 'Start captions')}
        ${getMsgerParticipantDropdownActionMarkup(`captionEveryoneStopBtn${idSuffix}`, 'fas fa-stop', 'Stop captions')}
        ${getMsgerParticipantDropdownDividerMarkup()}
        ${getMsgerParticipantDropdownActionMarkup(`muteEveryoneBtn${idSuffix}`, 'fas fa-microphone', 'Mute everyone', 'danger')}
        ${getMsgerParticipantDropdownActionMarkup(`hideEveryoneBtn${idSuffix}`, 'fas fa-video', 'Hide everyone', 'danger')}
        ${getMsgerParticipantDropdownActionMarkup(`ejectEveryoneBtn${idSuffix}`, 'fas fa-right-from-bracket', 'Eject everyone', 'danger')}
    `;
}

function renderMsgerRoomActionsDropdown(dropdownContent, idSuffix = '') {
    if (!dropdownContent) return;
    dropdownContent.innerHTML = getMsgerRoomActionsDropdownMarkup(idSuffix);
}

/**
 * Add participants in the chat room lists
 * @param {object} peers all peers info connected to the same room
 */
async function msgerAddPeers(peers) {
    // console.log("peers", peers);

    // Check if I am a presenter
    const peer_presenter = peers[myPeerId] && peers[myPeerId]['peer_presenter'];

    // add all current Participants
    for (const peer_id in peers) {
        const peer_name = peers[peer_id]['peer_name'];
        const peer_avatar = peers[peer_id]['peer_avatar'];
        // bypass insert to myself in the list :)
        if (peer_id != myPeerId && peer_name) {
            const exsistMsgerPrivateDiv = getId(peer_id + '_pMsgDiv');
            // if there isn't add it....
            if (!exsistMsgerPrivateDiv) {
                const chatAvatar =
                    peer_avatar && isValidAvatarURL(peer_avatar)
                        ? peer_avatar
                        : isValidEmail(peer_name)
                          ? genGravatar(peer_name)
                          : genAvatarSvg(peer_name, 24);

                // Dropdown menu options based on isPresenter
                let dropdownOptions = '';

                if (peer_presenter) {
                    dropdownOptions = `
                        ${getMsgerParticipantDropdownActionMarkup(`${peer_id}_pKickOut`, 'fas fa-user-slash', 'Eject participant', 'danger')}
                        ${getMsgerParticipantDropdownActionMarkup(`${peer_id}_pToggleAudio`, 'fas fa-microphone', 'Mute microphone', 'danger')}
                        ${getMsgerParticipantDropdownActionMarkup(`${peer_id}_pToggleVideo`, 'fas fa-video', 'Stop video', 'danger')}
                        ${getMsgerParticipantDropdownActionMarkup(`${peer_id}_pToggleScreen`, 'fas fa-desktop', 'Stop screen', 'danger')}
                        ${getMsgerParticipantDropdownActionMarkup(`${peer_id}_pSelectFile`, 'fas fa-upload', 'Send file')}
                        ${getMsgerParticipantDropdownActionMarkup(`${peer_id}_pSendVideoUrl`, 'fab fa-youtube', 'Share video or audio')}
                        ${getMsgerParticipantDropdownActionMarkup(`${peer_id}_pRequestGeo`, 'fas fa-location-dot', 'Request geolocation')}
                    `;
                } else {
                    elemDisplay(msgerCPDropDownMenuBtn, false);
                    elemDisplay(msgerSidebarDropDownMenuBtn, false);
                    dropdownOptions = `
                        ${getMsgerParticipantDropdownActionMarkup(`${peer_id}_pSelectFile`, 'fas fa-upload', 'Send file')}
                        ${getMsgerParticipantDropdownActionMarkup(`${peer_id}_pSendVideoUrl`, 'fab fa-youtube', 'Share video or audio')}
                    `;
                }

                const msgerPrivateDiv = renderRoomTemplate('tpl-msger-private-entry', {
                    text: {
                        participantName: peer_name,
                        participantSubtitle: 'Open private conversation',
                    },
                    html: {
                        dropdownOptions,
                    },
                    attrs: {
                        participantName: peer_name,
                        entryId: `${peer_id}_pMsgDiv`,
                        entryPeerName: peer_name.toLowerCase(),
                        buttonId: `${peer_id}_pMsgBtn`,
                        participantPeerId: peer_id,
                        avatarTmpId: `${peer_id}_pMsgAvatar`,
                        badgeId: `${peer_id}_pMsgBadge`,
                        dropdownMenuId: `${peer_id}_pDropdownMenu`,
                        dropdownToggleId: `${peer_id}_pDropdownToggle`,
                        dropdownListId: `${peer_id}_pDropdownMenuList`,
                    },
                });

                msgerCPList.insertAdjacentHTML('beforeend', msgerPrivateDiv);
                const participantAvatar = getId(`${peer_id}_pMsgAvatar`);
                if (participantAvatar) {
                    participantAvatar.setAttribute('src', chatAvatar);
                }
                msgerCPList.scrollTop += 500;

                const msgerPrivateBtn = getId(peer_id + '_pMsgBtn');
                const msgerPrivateKickOutBtn = getId(peer_id + '_pKickOut');
                const msgerPrivateToggleAudioBtn = getId(peer_id + '_pToggleAudio');
                const msgerPrivateToggleVideoBtn = getId(peer_id + '_pToggleVideo');
                const msgerPrivateToggleScreenBtn = getId(peer_id + '_pToggleScreen');
                const msgerPrivateSelectFileBtn = getId(peer_id + '_pSelectFile');
                const msgerPrivateSendVideoUrlBtn = getId(peer_id + '_pSendVideoUrl');
                const msgerPrivateRequestGeoBtn = getId(peer_id + '_pRequestGeo');

                addMsgerPrivateBtn(
                    msgerPrivateBtn,
                    null,
                    msgerPrivateKickOutBtn,
                    msgerPrivateToggleAudioBtn,
                    msgerPrivateToggleVideoBtn,
                    msgerPrivateToggleScreenBtn,
                    msgerPrivateSelectFileBtn,
                    msgerPrivateSendVideoUrlBtn,
                    msgerPrivateRequestGeoBtn,
                    myPeerId,
                    peer_id
                );

                updateConversationUi();

                // Dropdown toggle logic
                const dropdownDiv = getId(peer_id + '_pMsgDiv').querySelector('.dropdown-menu-custom');
                const dropdownToggle = dropdownDiv.querySelector('.dropdown-toggle');
                const dropdownContent = dropdownDiv.querySelector('.dropdown-menu-custom-list');
                if (dropdownToggle && dropdownContent) {
                    let hideTimeoutId;

                    const showDropdown = () => {
                        if (!supportsHoverPointer()) return;
                        clearTimeout(hideTimeoutId);
                        openMsgerParticipantDropdownMenu(dropdownToggle, dropdownContent);
                    };

                    const hideDropdown = () => {
                        if (!supportsHoverPointer()) return;
                        hideTimeoutId = setTimeout(() => {
                            if (activeMsgerParticipantDropdown?.menuEl === dropdownContent) {
                                closeAllMsgerParticipantDropdownMenus();
                            }
                        }, 180);
                    };

                    dropdownToggle.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (supportsHoverPointer()) return;
                        toggleMsgerParticipantDropdownMenu(dropdownToggle, dropdownContent);
                    });
                    dropdownToggle.addEventListener('mouseenter', showDropdown);
                    dropdownToggle.addEventListener('mouseleave', hideDropdown);
                    dropdownContent.addEventListener('mouseenter', () => clearTimeout(hideTimeoutId));
                    dropdownContent.addEventListener('mouseleave', hideDropdown);
                }

                refreshUnreadBadges();
            }
        }
    }
    toggleMsgerParticipantsEmptyNotice();
}

/**
 * Search peer by name in chat room lists to send the private messages
 */
function searchPeer() {
    const peerSearchValue = getId('searchPeerBarName').value.toLowerCase().trim();
    const privateEntries = msgerCPList.querySelectorAll('.msger-private-chat-entry');

    privateEntries.forEach((entry) => {
        const peerName = entry.dataset.peerName || '';
        elemDisplay(entry, peerName.includes(peerSearchValue), 'flex');
    });
}

/**
 * Remove participant from chat room lists
 * @param {string} peer_id socket.id
 */
function msgerRemovePeer(peer_id) {
    const msgerPrivateDiv = getId(peer_id + '_pMsgDiv');
    const isActiveConversation = activeConversation.type === 'private' && activeConversation.peerId === peer_id;
    if (msgerPrivateDiv) {
        let peerToRemove = msgerPrivateDiv.firstChild;
        while (peerToRemove) {
            msgerPrivateDiv.removeChild(peerToRemove);
            peerToRemove = msgerPrivateDiv.firstChild;
        }
        msgerPrivateDiv.remove();
    }
    delete unreadMessages.private[peer_id];
    refreshUnreadBadges();
    if (isActiveConversation) setActiveConversation('public');
    toggleMsgerParticipantsEmptyNotice();
}

/**
 * Setup msger buttons to send private messages
 * @param {object} msgerPrivateBtn chat private message send button
 * @param {object} msgerPrivateMsgInput chat private message text input
 * @param {string} peerId chat peer_id
 */
function addMsgerPrivateBtn(
    msgerPrivateBtn,
    msgerPrivateMsgInput,
    msgerPrivateKickOutBtn,
    msgerPrivateToggleAudioBtn,
    msgerPrivateToggleVideoBtn,
    msgerPrivateToggleScreenBtn,
    msgerPrivateSelectFileBtn,
    msgerPrivateSendVideoUrlBtn,
    msgerPrivateRequestGeoBtn,
    myPeerId,
    peerId
) {
    // Send private message button
    msgerPrivateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.closest('.dropdown-menu-custom')) return;
        if (msgerPrivateMsgInput) {
            sendPrivateMessage();
            return;
        }
        const selectedPeerId = msgerPrivateBtn.dataset.peerId || peerId;
        setActiveConversation('private', msgerPrivateBtn.dataset.value, selectedPeerId);
        msgerDraggable.classList.remove('msger-pinned-sidebar-open');
        if (shouldDockParticipantsPanel()) {
            msgerCPBtn.classList.remove('active');
            isParticipantsVisible = false;
        } else {
            syncParticipantsPanelVisibility(false);
        }
        msgerInput.focus();
    });

    // Enter key to send private message
    if (msgerPrivateMsgInput) {
        msgerPrivateMsgInput.addEventListener('keyup', (e) => {
            if (e.keyCode === 13) {
                e.preventDefault();
                sendPrivateMessage();
            }
        });

        msgerPrivateMsgInput.onpaste = () => {
            isChatPasteTxt = true;
        };
    }

    function sendPrivateMessage() {
        msgerPrivateMsgInput.value = filterXSS(msgerPrivateMsgInput.value.trim());
        const pMsg = checkMsg(msgerPrivateMsgInput.value);
        if (!pMsg) {
            msgerPrivateMsgInput.value = '';
            isChatPasteTxt = false;
            return;
        }
        // sanitization to prevent XSS
        msgerPrivateBtn.dataset.value = filterXSS(msgerPrivateBtn.dataset.value);
        myPeerName = filterXSS(myPeerName);

        if (isHtml(myPeerName) && isHtml(msgerPrivateBtn.dataset.value)) {
            msgerPrivateMsgInput.value = '';
            isChatPasteTxt = false;
            return;
        }

        const toPeerName = msgerPrivateBtn.dataset.value;
        const msgId = createChatMessageId();
        emitMsg(myPeerName, myPeerAvatar, toPeerName, pMsg, true, myPeerId, msgId);
        appendMessage(myPeerName, rightChatAvatar, 'right', pMsg, true, msgId, toPeerName);
        msgerPrivateMsgInput.value = '';
        if (!shouldDockParticipantsPanel()) {
            syncParticipantsPanelVisibility(false);
        }
    }

    // Dropdown actions
    if (msgerPrivateKickOutBtn) {
        msgerPrivateKickOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            kickOut(peerId);
        });
    }
    if (msgerPrivateToggleAudioBtn) {
        msgerPrivateToggleAudioBtn.addEventListener('click', (e) => {
            e.preventDefault();
            disablePeer(peerId, 'audio');
        });
    }
    if (msgerPrivateToggleVideoBtn) {
        msgerPrivateToggleVideoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            disablePeer(peerId, 'video');
        });
    }
    if (msgerPrivateToggleScreenBtn) {
        msgerPrivateToggleScreenBtn.addEventListener('click', (e) => {
            e.preventDefault();
            disablePeer(peerId, 'screen');
        });
    }
    if (msgerPrivateSelectFileBtn) {
        msgerPrivateSelectFileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            selectFileToShare(peerId);
        });
    }
    if (msgerPrivateSendVideoUrlBtn) {
        msgerPrivateSendVideoUrlBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sendVideoUrl(peerId);
        });
    }
    if (msgerPrivateRequestGeoBtn) {
        msgerPrivateRequestGeoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            geo.askPeerGeoLocation(peerId);
        });
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
function isValidHttpURL(input) {
    try {
        new URL(input);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Check if url passed is a image
 * @param {string} url to check
 * @returns {boolean} true/false
 */
function isImageURL(input) {
    if (!input || typeof input !== 'string') return false;
    // Data URLs can still be valid images for generic content handling.
    if (input.startsWith('data:image/')) return true;
    try {
        const url = new URL(input);
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'].some((ext) =>
            url.pathname.toLowerCase().endsWith(ext)
        );
    } catch (e) {
        return false;
    }
}

/**
 * Check if a URL is a valid HTTP/HTTPS avatar URL.
 * Unlike isImageURL, this does NOT require a file extension,
 * so it accepts dynamic avatar endpoints (e.g. GitHub, Gravatar, DiceBear).
 * @param {string} input
 * @returns {boolean}
 */
function isValidAvatarURL(input) {
    if (!input || typeof input !== 'string') return false;
    if (input.startsWith('data:')) return false;
    try {
        const url = new URL(input);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Check if Image File
 * @return boolean
 */
function isImageFile(filename) {
    return /(\.jpg|\.jpeg|\.png|\.gif|\.webp|\.bmp|\.tiff|\.svg)$/i.test(filename);
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
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
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
    if (!msgerInput) return;

    msgerInput.style.height = 'auto';

    const minHeight = 52;
    const maxHeight = 160;
    const nextHeight = Math.min(Math.max(msgerInput.scrollHeight, minHeight), maxHeight);

    msgerInput.style.height = `${nextHeight}px`;
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
 * @param {string} fromAvatar peer avatar
 * @param {string} to peer name
 * @param {string} msg message to send
 * @param {boolean} privateMsg if is a private message
 * @param {string} id peer_id
 */
function emitMsg(from, fromAvatar, to, msg, privateMsg, id, msgId = '') {
    if (!msg) return;

    // sanitize all params
    const getFrom = filterXSS(from);
    const getFromAvatar = filterXSS(fromAvatar);
    const getFromId = filterXSS(myPeerId);
    const getTo = filterXSS(to);
    const getMsg = filterXSS(msg);
    const getPrivateMsg = filterXSS(privateMsg);
    const getId = filterXSS(id);
    const getMsgId = normalizeChatMessageId(filterXSS(msgId));

    const chatMessage = {
        type: 'chat',
        from: getFrom,
        fromAvatar: getFromAvatar,
        fromId: getFromId,
        id: getId,
        msg_id: getMsgId,
        to: getTo,
        msg: getMsg,
        privateMsg: getPrivateMsg,
    };
    console.log('Send msg', chatMessage);
    sendToDataChannel(chatMessage);
}

/**
 * Show AI typing indicator animation in the chat
 * @param {string} aiName
 */
function showAITypingIndicator(aiName) {
    const existing = getId(`ai-typing-${aiName}`);
    if (existing) return;
    const typingHTML = renderRoomTemplate('tpl-ai-typing-indicator', {
        attrs: {
            typingIndicatorId: `ai-typing-${aiName}`,
        },
    });
    msgerChat.insertAdjacentHTML('beforeend', typingHTML);
    msgerChat.scrollTop = msgerChat.scrollHeight;
}

/**
 * Hide AI typing indicator animation from the chat
 * @param {string} aiName
 */
function hideAITypingIndicator(aiName) {
    const indicator = getId(`ai-typing-${aiName}`);
    if (indicator) indicator.remove();
}

/**
 * Read ChatGPT incoming message
 * https://platform.openai.com/docs/introduction
 * @param {string} msg
 */
async function getChatGPTmessage(msg) {
    console.log('Send ChatGPT message:', msg);

    showAITypingIndicator('ChatGPT');

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
                hideAITypingIndicator('ChatGPT');
                if (!completion) return;
                const { message, context } = completion;
                chatGPTcontext = context ? context : [];
                ensureChatGPTConversationEntry();
                setPeerChatAvatarImgName('left', CHAT_GPT_NAME);
                appendMessage(CHAT_GPT_NAME, images.chatgpt, 'left', message, true, null, myPeerName);
                cleanMessageInput();
                speechInMessages ? speechMessage(true, CHAT_GPT_NAME, message) : playSound('message');
            }.bind(this)
        )
        .catch((err) => {
            hideAITypingIndicator('ChatGPT');
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
 * Download chat messages grouped by conversation and participant in JSON format
 */
function downloadChatMsgs() {
    const groupedConversations = [];
    const groupedMessages = new Map();

    chatMessages.forEach((message) => {
        const isPrivate =
            message.privateMsg === true ||
            message.privateMsg === 'true' ||
            message.privateMsg === 1 ||
            message.privateMsg === '1';
        const conversationPeer = message.conversationPeer || '';
        const conversationKey = isPrivate && conversationPeer ? `private:${conversationPeer}` : 'public:room';

        if (!groupedMessages.has(conversationKey)) {
            groupedMessages.set(conversationKey, {
                type: isPrivate ? 'private' : 'public',
                title: isPrivate && conversationPeer ? `Private chat with ${conversationPeer}` : 'Room chat',
                peer: conversationPeer || null,
                participants: new Map(),
            });
        }

        const conversation = groupedMessages.get(conversationKey);
        if (!conversation.participants.has(message.from)) {
            conversation.participants.set(message.from, []);
        }

        conversation.participants.get(message.from).push({
            time: message.time,
            from: message.from,
            to: message.to || '',
            msg: message.msg,
            privateMsg: isPrivate,
        });
    });

    groupedMessages.forEach((conversation) => {
        const participants = [];

        conversation.participants.forEach((messages, sender) => {
            participants.push({
                name: sender,
                messages,
            });
        });

        groupedConversations.push({
            type: conversation.type,
            title: conversation.title,
            peer: conversation.peer,
            participants,
        });
    });

    const exportContent = JSON.stringify(
        {
            exportedAt: new Date().toISOString(),
            roomId,
            conversations: groupedConversations,
        },
        null,
        2
    );
    let a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(exportContent);
    a.download = getDataTimeString() + '-CHAT.json';
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
        setTippy(mySettingsBtn, 'Close the settings', bottomButtonsPlacement);
        isMySettingsVisible = true;
        videoMediaContainer.style.opacity = 0.3;
        screenReaderAccessibility.announceMessage('Settings opened');
        return;
    }
    elemDisplay(mySettings, false);
    setTippy(mySettingsBtn, 'Open the settings', bottomButtonsPlacement);
    isMySettingsVisible = false;
    videoMediaContainer.style.opacity = 1;
    screenReaderAccessibility.announceMessage('Settings closed');
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
    myVideoPeerName.innerText = myPeerName + ' (me)';

    myScreenPeerName = getId('myScreenPeerName');
    if (myScreenPeerName) myScreenPeerName.innerText = myPeerName + ' (me)';

    sendToServer('peerName', {
        room_id: roomId,
        peer_name_old: myOldPeerName,
        peer_name_new: myPeerName,
        peer_avatar: myPeerAvatar,
    });

    myPeerNameSet.value = '';
    myPeerNameSet.placeholder = myPeerName;

    window.localStorage.peer_name = myPeerName;

    setPeerAvatarImgName('myVideoAvatarImage', myPeerName, myPeerAvatar);
    setPeerAvatarImgName('myProfileAvatar', myPeerName, myPeerAvatar);
    setPeerChatAvatarImgName('right', myPeerName, myPeerAvatar);
    userLog('toast', 'My name changed to ' + myPeerName);
}

/**
 * Update my avatar from URL in-memory only (cleared on page refresh)
 */
async function updateMyPeerAvatarByUrl() {
    const result = await Swal.fire({
        background: swBg,
        title: 'Set avatar URL',
        input: 'url',
        inputLabel: 'Public image URL',
        inputPlaceholder: 'https://example.com/avatar.jpg',
        confirmButtonText: 'Apply',
        showCancelButton: true,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
        inputValidator: (value) => {
            if (!value) return 'Please enter an image URL';
            if (value.startsWith('data:')) return 'Base64 avatars are not supported';
            if (!isValidAvatarURL(value)) return 'Only http/https URLs are supported';
            return null;
        },
        preConfirm: (url) =>
            new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => {
                    Swal.showValidationMessage(
                        'Could not load the image, the URL may be invalid, restricted, or not an image'
                    );
                    resolve(false); // keep dialog open
                };
                img.src = url;
            }),
        didOpen: () => {
            const input = document.querySelector('.swal2-input');
            if (!input) return;

            const preview = document.createElement('img');
            preview.style.cssText =
                'display:none;width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid #4caf50;margin:8px auto 4px;';
            input.parentNode.insertBefore(preview, input);

            function updatePreview(url) {
                if (!url) {
                    preview.style.display = 'none';
                    return;
                }
                preview.src = url;
                preview.style.display = 'block';
            }

            input.addEventListener('input', (e) => updatePreview(e.target.value.trim()));

            function makeAvatarImg(url) {
                const img = document.createElement('img');
                img.src = url;
                img.title = 'Click to use this avatar';
                img.style.cssText =
                    'width:48px;height:48px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:border-color 0.2s;object-fit:cover;background:#222;flex-shrink:0;';
                img.addEventListener('mouseover', () => (img.style.borderColor = '#4caf50'));
                img.addEventListener('mouseout', () => (img.style.borderColor = 'transparent'));
                img.addEventListener('click', () => {
                    input.value = url;
                    input.dispatchEvent(new Event('input'));
                    updatePreview(url);
                });
                return img;
            }

            // Self-hosted avatars
            const localLabel = document.createElement('p');
            localLabel.textContent = 'Pick an avatar:';
            localLabel.style.cssText = 'color:#aaa;font-size:12px;margin:10px 0 6px;text-align:center;';

            const localGrid = document.createElement('div');
            localGrid.style.cssText =
                'display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-height:120px;overflow-y:scroll;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:4px 2px;margin-bottom:4px;';
            localGrid.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });

            for (let i = 1; i <= 25; i++) {
                const url = `${window.location.origin}/images/avatars/avatar_${String(i).padStart(2, '0')}.png`;
                localGrid.appendChild(makeAvatarImg(url));
            }

            // DiceBear random avatars
            const randomAvatarLabel = document.createElement('p');
            randomAvatarLabel.textContent = 'Or pick a random avatar:';
            randomAvatarLabel.style.cssText = 'color:#aaa;font-size:12px;margin:10px 0 6px;text-align:center;';

            const randomAvatarGrid = document.createElement('div');
            randomAvatarGrid.style.cssText =
                'display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:4px;';
            const dicebearStyles = [
                'bottts-neutral',
                'adventurer-neutral',
                'thumbs',
                'initials',
                'identicon',
                'shapes',
            ];

            for (let i = 0; i < 6; i++) {
                const seed = Math.random().toString(36).substring(2, 10);
                const style = dicebearStyles[i % dicebearStyles.length];
                const url = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
                randomAvatarGrid.appendChild(makeAvatarImg(url));
            }

            let insertAfter = input;
            for (const el of [localLabel, localGrid, randomAvatarLabel, randomAvatarGrid]) {
                insertAfter.parentNode.insertBefore(el, insertAfter.nextSibling);
                insertAfter = el;
            }
        },
    });

    if (!result.isConfirmed || !result.value) return;

    try {
        myPeerAvatar = result.value;
        hasTemporaryAvatar = true;
        lsSettings.peer_avatar = myPeerAvatar;
        lS.setSettings(lsSettings);

        setPeerAvatarImgName('myVideoAvatarImage', myPeerName, myPeerAvatar);
        setPeerAvatarImgName('myProfileAvatar', myPeerName, myPeerAvatar);
        setPeerChatAvatarImgName('right', myPeerName, myPeerAvatar);
        updateMyAvatarResetButtonVisibility();

        emitMyPeerProfile();

        userLog('toast', 'Avatar saved and will persist across sessions');
    } catch (err) {
        console.error('Failed to set avatar URL', err);
        userLog('error', 'Unable to apply avatar URL');
    }
}

/**
 * Reset in-memory avatar to default generated/fallback avatar
 */
function resetMyPeerAvatarInMemory() {
    myPeerAvatar = false;
    hasTemporaryAvatar = false;
    lsSettings.peer_avatar = '';
    lS.setSettings(lsSettings);
    setPeerAvatarImgName('myVideoAvatarImage', myPeerName, myPeerAvatar);
    setPeerAvatarImgName('myProfileAvatar', myPeerName, myPeerAvatar);
    setPeerChatAvatarImgName('right', myPeerName, myPeerAvatar);
    updateMyAvatarResetButtonVisibility();

    emitMyPeerProfile();

    userLog('toast', 'Avatar reset and removed from storage');
}

/**
 * Show reset avatar button only for uploaded temporary avatars
 */
function updateMyAvatarResetButtonVisibility() {
    if (!myProfileAvatarResetBtn) return;
    myProfileAvatarResetBtn.classList.toggle('hidden', !hasTemporaryAvatar);
    if (myProfileAvatarUploadBtn) myProfileAvatarUploadBtn.classList.toggle('hidden', hasTemporaryAvatar);
}

/**
 * Append updated peer name to video player
 * @param {object} config data
 */
function handlePeerName(config) {
    const peer_id = config.peer_id;
    const peer_name = filterXSS(config.peer_name);
    const peer_avatar = filterXSS(config.peer_avatar);

    // Keep the latest profile in memory so late DOM creation still uses updated data.
    if (allPeers && allPeers[peer_id]) {
        allPeers[peer_id]['peer_name'] = peer_name;
        allPeers[peer_id]['peer_avatar'] = peer_avatar;
    }

    const videoName = getId(peer_id + '_name');
    const screenName = getId(peer_id + '_screen_name');
    if (videoName) videoName.innerText = peer_name;
    if (screenName) screenName.innerText = peer_name + ' (screen)';
    // change also avatar and btn value - name on chat lists....
    const msgerPeerName = getId(peer_id + '_pMsgBtn');
    const msgerPeerAvatar = getId(peer_id + '_pMsgAvatar');
    if (msgerPeerName) msgerPeerName.value = peer_name;

    if (msgerPeerAvatar) {
        msgerPeerAvatar.src =
            peer_avatar && isValidAvatarURL(peer_avatar)
                ? peer_avatar
                : isValidEmail(peer_name)
                  ? genGravatar(peer_name)
                  : genAvatarSvg(peer_name, 32);
    }

    // refresh also peer video avatar name
    setPeerAvatarImgName(peer_id + '_avatar', peer_name, peer_avatar);
}

/**
 * Send my Video-Audio-Hand... status
 * @param {string} element typo
 * @param {boolean} status true/false
 */
async function emitPeerStatus(element, status, extras = {}) {
    sendToServer('peerStatus', {
        room_id: roomId,
        peer_name: myPeerName,
        peer_id: myPeerId,
        element: element,
        status: status,
        extras: extras,
    });
}

/**
 * Handle hide myself from room view
 * @param {boolean} isHideMeActive
 */
function handleHideMe(isHideMeActive) {
    const hideMeIcon = hideMeBtn.querySelector('i');
    if (isHideMeActive) {
        if (isVideoPinned) myVideoPinBtn.click();
        elemDisplay(myVideoWrap, false);
        setColor(hideMeIcon, 'red');
        hideMeIcon.className = className.hideMeOn;
        playSound('off');
    } else {
        elemDisplay(myVideoWrap, true, 'inline-block');
        hideMeIcon.className = className.hideMeOff;
        setColor(hideMeIcon, 'var(--btn-bar-bg-color)');
        playSound('on');
    }
    resizeVideoMedia();
    screenReaderAccessibility.announceMessage(
        isHideMeActive ? 'You are hidden from the room' : 'You are visible in the room'
    );
}

/**
 * Set my Hand Status and Icon
 */
function setMyHandStatus() {
    myHandStatus = !myHandStatus;
    if (myHandStatus) {
        // Raise hand
        setColor(myHandBtn, '#FFD700');
        elemDisplay(myHandStatusIcon, true);
        setTippy(myHandBtn, 'Lower your hand (H)', bottomButtonsPlacement);
        playSound('raiseHand');
    } else {
        // Lower hand
        setColor(myHandBtn, 'var(--btn-bar-bg-color)');
        elemDisplay(myHandStatusIcon, false);
        setTippy(myHandBtn, 'Raise your hand (H)', bottomButtonsPlacement);
    }
    if (myHandBtn && myHandBtn.setAttribute) myHandBtn.setAttribute('aria-pressed', String(!!myHandStatus));
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
    const audioStatusLabel = status ? 'My audio is on' : 'My audio is off';
    setTippy(myAudioStatusIcon, audioStatusLabel, 'bottom');
    setTippy(audioBtn, status ? 'Stop the audio (A)' : 'Start the audio (A)', bottomButtonsPlacement);
    if (audioBtn && audioBtn.setAttribute) audioBtn.setAttribute('aria-pressed', String(!!status));
    status ? playSound('on') : playSound('off');
    screenReaderAccessibility.announceMessage(audioStatusLabel);
}

/**
 * Set My Video Status Icon and Title
 * @param {boolean} status of my video
 */
function setMyVideoStatus(status) {
    console.log('My video status', status);

    // On video OFF display my video avatar name
    if (myVideoAvatarImage) {
        elemDisplay(myVideoAvatarImage, status ? false : true, status ? undefined : 'block');
    }

    if (myVideoStatusIcon) {
        setMediaButtonsClass([{ element: myVideoStatusIcon, status, mediaType: 'video' }]);
    }

    // send my video status to all peers in the room
    emitPeerStatus('video', status);

    const videoStatusLabel = status ? 'My video is on' : 'My video is off';

    if (!isMobileDevice) {
        if (myVideoStatusIcon) setTippy(myVideoStatusIcon, videoStatusLabel, 'bottom');
        setTippy(videoBtn, status ? 'Stop the video (V)' : 'Start the video (V)', bottomButtonsPlacement);
    }
    if (videoBtn && videoBtn.setAttribute) videoBtn.setAttribute('aria-pressed', String(!!status));

    if (status) {
        displayElements([
            { element: myVideo, display: true, mode: 'block' },
            { element: initVideo, display: true, mode: 'block' },
        ]);
        playSound('on');
    } else {
        displayElements([
            { element: myVideo, display: false },
            { element: initVideo, display: false },
        ]);
        const myVideoWrap = getId('myVideoWrap');
        const spinner = myVideoWrap ? myVideoWrap.querySelector('.video-loading-spinner') : null;
        if (spinner) elemDisplay(spinner, false);
        playSound('off');
    }

    screenReaderAccessibility.announceMessage(videoStatusLabel);
}

/**
 * Handle peer audio - video - hand - privacy status
 * @param {object} config data
 */
function handlePeerStatus(config) {
    //
    const { peer_id, peer_name, element, status, extras } = config;

    switch (element) {
        case 'video':
            setPeerVideoStatus(peer_id, status);
            break;
        case 'screen':
            setPeerScreenStatus(peer_id, status, extras);
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
        setMediaButtonsClass([{ element: peerAudioStatus, status, mediaType: 'audio' }]);
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

function handlePeerGeoLocation(peer_id) {
    const remoteGeoLocationBtn = getId(peer_id + '_geoLocation');
    remoteGeoLocationBtn.onclick = () => {
        isPresenter
            ? geo.askPeerGeoLocation(peer_id)
            : msgPopup('warning', 'Only the presenter can ask geolocation to the participants', 'top-end', 4000);
    };
}

/**
 * Send Private Message to specific peer
 * @param {string} peer_id socket.id
 * @param {string} toPeerName peer name to send message
 * @param {string} privateMsgBtnId private message button id
 */
function handlePeerPrivateMsg(peer_id, toPeerName, privateMsgBtnId) {
    const peerPrivateMsg = getId(privateMsgBtnId);
    peerPrivateMsg.onclick = (e) => {
        e.preventDefault();
        sendPrivateMsgToPeer(peer_id, toPeerName);
    };
}

/**
 * Send Private messages to peers
 * @param {string} toPeerId
 * @param {string} toPeerName
 */
function sendPrivateMsgToPeer(toPeerId, toPeerName) {
    if (!isChatRoomVisible) {
        showChatRoomDraggable();
    }

    setActiveConversation('private', toPeerName, toPeerId);
    if (!isMobileDevice && canBePinned() && !isCaptionPinned) {
        if (!isChatPinned) {
            chatPin();
        }

        msgerDraggable.classList.remove('msger-pinned-sidebar-open');
        msgerCPBtn.classList.remove('active');
        isParticipantsVisible = false;
    } else {
        syncParticipantsPanelVisibility(false);
    }

    msgerInput.focus();
}

/**
 * Handle peer send file
 * @param {string} peer_id
 * @param {string} fileShareBtnId
 */
function handlePeerSendFile(peer_id, fileShareBtnId) {
    const peerFileSendBtn = getId(fileShareBtnId);
    peerFileSendBtn.onclick = () => {
        selectFileToShare(peer_id);
    };
}

/**
 * Send video - audio URL to specific peer
 * @param {string} peer_id socket.id
 * @param {string} peerYoutubeBtnId youtube button id
 */
function handlePeerVideoAudioUrl(peer_id, peerYoutubeBtnId) {
    const peerYoutubeBtn = getId(peerYoutubeBtnId);
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
    const peerVideoWrap = getId(peer_id + '_videoWrap');

    if (status) {
        displayElements([
            { element: peerVideoPlayer, display: true, mode: 'block' },
            { element: peerVideoAvatarImage, display: false },
        ]);
        // Safari requires explicit play() when a video element becomes visible again
        if (peerVideoPlayer) peerVideoPlayer.play().catch(() => {});
        if (peerVideoStatus) {
            setMediaButtonsClass([{ element: peerVideoStatus, status: true, mediaType: 'video' }]);
            setTippy(peerVideoStatus, 'Participant video is on', 'bottom');
            playSound('on');
        }
    } else {
        displayElements([
            { element: peerVideoPlayer, display: false },
            { element: peerVideoAvatarImage, display: true, mode: 'block' },
        ]);
        const spinner = peerVideoWrap ? peerVideoWrap.querySelector('.video-loading-spinner') : null;
        if (spinner) elemDisplay(spinner, false);
        if (peerVideoStatus) {
            setMediaButtonsClass([{ element: peerVideoStatus, status: false, mediaType: 'video' }]);
            setTippy(peerVideoStatus, 'Participant video is off', 'bottom');
            playSound('off');
        }
    }
}

function setPeerScreenStatus(peer_id, status, extras) {
    // Track screen status on the peer model
    if (!allPeers[peer_id]) allPeers[peer_id] = {};
    allPeers[peer_id]['peer_screen_status'] = !!status;

    // Initialize extras object if not already present
    if (!allPeers[peer_id]['extras']) {
        allPeers[peer_id]['extras'] = {};
    }
    // Merge provided extras if any
    if (extras && (extras.screen_track_id || extras.screen_stream_id)) {
        allPeers[peer_id]['extras'].screen_track_id = extras.screen_track_id;
        allPeers[peer_id]['extras'].screen_stream_id = extras.screen_stream_id;
    }
}

/**
 * Emit actions to all peers in the same room except yourself
 * @param {object} peerAction to all peers
 * @param {object} extras additional data
 */
async function emitPeersAction(peerAction, extras = {}) {
    if (!thereArePeerConnections()) return;

    sendToServer('peerAction', {
        room_id: roomId,
        peer_name: myPeerName,
        peer_avatar: myPeerAvatar,
        peer_id: myPeerId,
        peer_uuid: myPeerUUID,
        peer_use_video: useVideo,
        peer_action: peerAction,
        extras: extras,
        send_to_all: true,
    });
}

/**
 * Emit actions to specified peer in the same room
 * @param {string} peer_id socket.id
 * @param {object} peerAction to specified peer
 * @param {object} extras additional data
 */
async function emitPeerAction(peer_id, peerAction, extras = {}) {
    if (!thereArePeerConnections()) return;

    sendToServer('peerAction', {
        room_id: roomId,
        peer_id: peer_id,
        peer_avatar: myPeerAvatar,
        peer_use_video: useVideo,
        peer_name: myPeerName,
        peer_action: peerAction,
        extras: extras,
        send_to_all: false,
    });
}

/**
 * Handle received peer actions
 * @param {object} config data
 */
function handlePeerAction(config) {
    console.log('Handle peer action: ', config);
    const { peer_id, peer_name, peer_avatar, peer_use_video, peer_action, extras } = config;

    switch (peer_action) {
        case 'muteAudio':
            setMyAudioOff(peer_name);
            break;
        case 'hideVideo':
            setMyVideoOff(peer_name);
            break;
        case 'stopScreen':
            setMyScreenOff(peer_name);
            break;
        case 'recStart':
            notifyRecording(peer_id, peer_name, peer_avatar, 'Start');
            break;
        case 'recStop':
            notifyRecording(peer_id, peer_name, peer_avatar, 'Stop');
            break;
        case 'screenStart':
            handleScreenStart(peer_id, extras);
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
 * Handle commands from the server
 * @param {object} config data
 */
function handleCmd(config) {
    console.log('Handle cmd: ', config);

    const { action, data } = config;

    switch (action) {
        case 'geoLocation':
            // Peer is requesting your location
            geo.confirmPeerGeoLocation(data);
            break;
        case 'geoLocationOK':
        case 'geoLocationKO':
            // Peer responded with their location or an error/denial
            geo.handleGeoPeerLocation(config);
            break;
        //....
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
 * Handle incoming chat reactions.
 * @param {object} data
 */
function handleChatReaction(data) {
    if (!data) return;

    const rawMsgId = String(data.msg_id || '').trim();
    const msgId = rawMsgId.replace(/[^a-zA-Z0-9:_-]/g, '');
    const emoji = filterXSS(data.emoji || '');
    const peerName = filterXSS(data.peer_name || '');
    const action = data.action === 'remove' ? 'remove' : 'add';

    if (!msgId || !emoji || !peerName) return;
    if (!CHAT_REACTION_EMOJIS.includes(emoji)) return;

    const messageElement = getChatMessageElement(msgId);
    if (!messageElement) return;

    applyReactionToElement(messageElement, emoji, peerName, action);
}

document.addEventListener('click', (event) => {
    const target = event.target;
    if (target?.closest('.reaction-picker') || target?.closest('.reaction-toggle-btn')) return;
    msgerChat?.querySelectorAll('.reaction-picker').forEach((picker) => picker.remove());
});

function getRoomEmojiPlacement() {
    const viewportWidth = Math.max(window.innerWidth || 0, 320);
    const viewportHeight = Math.max(window.innerHeight || 0, 320);
    const isCompactViewport = viewportWidth < 640;
    const now = Date.now();
    const burstWindow = 900;
    const maxBurstSize = isCompactViewport ? 4 : 6;
    const marginX = isCompactViewport ? 18 : 34;
    const marginY = isCompactViewport ? 96 : 124;
    const minAnchorX = viewportWidth * 0.2;
    const maxAnchorX = viewportWidth * 0.8;
    const minAnchorY = viewportHeight * 0.42;
    const maxAnchorY = viewportHeight * 0.76;

    if (now - roomEmojiBurstState.startedAt > burstWindow || roomEmojiBurstState.count >= maxBurstSize) {
        roomEmojiBurstState.startedAt = now;
        roomEmojiBurstState.count = 0;
        roomEmojiBurstState.anchorX = minAnchorX + Math.random() * Math.max(1, maxAnchorX - minAnchorX);
        roomEmojiBurstState.anchorY = minAnchorY + Math.random() * Math.max(1, maxAnchorY - minAnchorY);
    }

    const burstIndex = roomEmojiBurstState.count;
    roomEmojiBurstState.count += 1;

    const baseAngle = -90 + (burstIndex - (maxBurstSize - 1) / 2) * (isCompactViewport ? 24 : 18);
    const jitterAngle = Math.random() * 12 - 6;
    const angle = ((baseAngle + jitterAngle) * Math.PI) / 180;
    const radius = (isCompactViewport ? 18 : 24) + burstIndex * (isCompactViewport ? 14 : 18) + Math.random() * 14;
    const left = Math.min(
        viewportWidth - marginX,
        Math.max(marginX, roomEmojiBurstState.anchorX + Math.cos(angle) * radius)
    );
    const top = Math.min(
        viewportHeight - marginY,
        Math.max(marginY, roomEmojiBurstState.anchorY + Math.sin(angle) * radius * 0.6)
    );
    const drift = `${(Math.cos(angle) * (radius * 0.95) + (Math.random() * 18 - 9)).toFixed(0)}px`;
    const rise = `-${(Math.abs(Math.sin(angle)) * 70 + Math.random() * 70 + (isCompactViewport ? 120 : 165)).toFixed(0)}px`;
    const rotation = `${(Math.random() * 16 - 8).toFixed(1)}deg`;

    return {
        left,
        top,
        drift,
        rise,
        rotation,
    };
}

/**
 * Handle room emoji reaction
 * @param {object} message
 * @param {integer} duration time in ms
 */
function handleEmoji(message, duration = 5000) {
    if (userEmoji) {
        const emojiDisplay = document.createElement('div');
        const placement = getRoomEmojiPlacement();
        const label = message.peer_name || 'Guest';
        const emojiIcon = document.createElement('span');
        const emojiName = document.createElement('span');

        emojiDisplay.className = 'user-emoji-burst';
        emojiDisplay.style.left = `${placement.left}px`;
        emojiDisplay.style.top = `${placement.top}px`;
        emojiDisplay.style.setProperty('--emoji-drift', placement.drift);
        emojiDisplay.style.setProperty('--emoji-rise', placement.rise);
        emojiDisplay.style.setProperty('--emoji-rotation', placement.rotation);
        emojiIcon.className = 'user-emoji-burst__icon';
        emojiIcon.textContent = message.emoji;
        emojiName.className = 'user-emoji-burst__name';
        emojiName.textContent = label;
        emojiDisplay.appendChild(emojiIcon);
        emojiDisplay.appendChild(emojiName);
        userEmoji.appendChild(emojiDisplay);

        setTimeout(() => {
            emojiDisplay.remove();
        }, duration);

        handleEmojiSound(message);
    }
}

/**
 * Play emoji sound
 * https://freesound.org/
 * https://cloudconvert.com
 * @param {object} message
 */
function handleEmojiSound(message) {
    const path = '../sounds/emoji/';
    const force = true; // play even if sound effects are off
    switch (message.shortcodes) {
        case ':+1:':
        case ':ok_hand:':
            playSound('ok', force, path);
            break;
        case ':-1:':
            playSound('boo', force, path);
            break;
        case ':clap:':
            playSound('applause', force, path);
            break;
        case ':smiley:':
        case ':grinning:':
            playSound('smile', force, path);
            break;
        case ':joy:':
            playSound('laughs', force, path);
            break;
        case ':tada:':
            playSound('congrats', force, path);
            break;
        case ':open_mouth:':
            playSound('woah', force, path);
            break;
        case ':trumpet:':
            playSound('trombone', force, path);
            break;
        case ':kissing_heart:':
            playSound('kiss', force, path);
            break;
        case ':heart:':
        case ':hearts:':
            playSound('heart', force, path);
            break;
        case ':rocket:':
            playSound('rocket', force, path);
            break;
        case ':sparkles:':
        case ':star:':
        case ':star2:':
        case ':dizzy:':
            playSound('tinkerbell', force, path);
            break;
        // ...
        default:
            break;
    }
}

/**
 * Handle Screen Start
 * @param {string} peer_id
 * @param {object} extras
 */
function handleScreenStart(peer_id, extras) {
    const remoteScreenAvatarImage = getId(peer_id + '_screen_avatar');
    const remoteScreenStatusBtn = getId(peer_id + '_screenStatus');

    if (extras) {
        // Initialize extras object if not already present
        if (!allPeers[peer_id]) allPeers[peer_id] = {};
        if (!allPeers[peer_id]['extras']) {
            allPeers[peer_id]['extras'] = {};
        }

        allPeers[peer_id]['extras']['screen_track_id'] = extras.screen_track_id;
        allPeers[peer_id]['extras']['screen_stream_id'] = extras.screen_stream_id;

        // Also update peer screen status flag for fallback classification
        allPeers[peer_id]['peer_screen_status'] = true;

        console.log('[HANDLE SCREEN START] Stored screen IDs for', peer_id, extras);
    }

    if (remoteScreenStatusBtn) {
        remoteScreenStatusBtn.className = className.videoOn;
        setTippy(remoteScreenStatusBtn, 'Participant screen share is on', 'bottom');
    }
    if (remoteScreenAvatarImage) elemDisplay(remoteScreenAvatarImage, false);
}

/**
 * Handle Screen Stop
 * @param {string} peer_id
 * @param {boolean} peer_use_video
 */
function handleScreenStop(peer_id, peer_use_video) {
    const remoteScreenStream = getId(peer_id + '___screen');
    const remoteScreenWrap = getId(peer_id + '_screenWrap');
    const remoteScreenAvatarImage = getId(peer_id + '_screen_avatar');
    const remoteScreenStatusBtn = getId(peer_id + '_screenStatus');
    const remoteScreenPinUnpin = getId(peer_id + '_screen_pinUnpin');

    if (remoteScreenStatusBtn) {
        remoteScreenStatusBtn.className = className.videoOff;
        setTippy(remoteScreenStatusBtn, 'Participant screen share is off', 'bottom');
    }

    // If the screen is pinned, unpin it first to restore grid layout
    if (
        remoteScreenWrap &&
        isVideoPinned &&
        pinnedVideoPlayerId === (remoteScreenStream ? remoteScreenStream.id : null)
    ) {
        console.log('[STOP SCREEN] Unpinning remote screen before removal', peer_id);
        if (remoteScreenPinUnpin) remoteScreenPinUnpin.click();
    }

    // Remove dedicated remote screen tile if present
    if (remoteScreenWrap) {
        remoteScreenWrap.remove();
        adaptAspectRatio();
    }
    if (remoteScreenAvatarImage && remoteScreenStream && !peer_use_video) {
        elemDisplay(remoteScreenAvatarImage, true, 'block');
        remoteScreenStream.srcObject.getVideoTracks().forEach((track) => {
            track.stop();
            // track.enabled = false;
        });
        elemDisplay(remoteScreenStream, false);
    } else {
        if (remoteScreenAvatarImage) elemDisplay(remoteScreenAvatarImage, false);
    }
    // Clean up screen extras from allPeers
    if (allPeers[peer_id]) {
        if (allPeers[peer_id]['extras']) {
            delete allPeers[peer_id]['extras']['screen_track_id'];
            delete allPeers[peer_id]['extras']['screen_stream_id'];
        }
        // Update screen status flag
        allPeers[peer_id]['peer_screen_status'] = false;

        console.log('[HANDLE SCREEN STOP] Cleared screen IDs for', peer_id);
    }
}

function confirmAudioOn(config) {
    const { peer_name } = config;
}

function confirmVideoOn(config) {
    const { peer_name } = config;
}

function confirmScreenOn(config) {
    const { peer_name } = config;
}

/**
 * Set my Audio off and Popup the peer name that performed this action
 * @param {string} peer_name peer name
 */
function setMyAudioOff(peer_name) {
    if (myAudioStatus === false || !useAudio) return;
    const audioTrack = getAudioTrack(localAudioMediaStream);
    if (audioTrack) {
        audioTrack.enabled = false;
        myAudioStatus = audioTrack.enabled;
    } else {
        myAudioStatus = false;
    }
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
    const audioTrack = getAudioTrack(localAudioMediaStream);
    if (audioTrack) {
        audioTrack.enabled = true;
        myAudioStatus = audioTrack.enabled;
    } else {
        myAudioStatus = false;
    }
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
    const videoTrack = getVideoTrack(localVideoMediaStream);
    if (videoTrack) {
        videoTrack.enabled = false;
        myVideoStatus = videoTrack.enabled;
    } else {
        myVideoStatus = false;
    }
    videoBtn.className = className.videoOff;
    setMyVideoStatus(myVideoStatus);
    userLog('toast', `${icons.user} ${peer_name} \n has disabled your video`);
    playSound('off');
}

/**
 * Set my Screen off and Popup the peer name that performed this action
 * @param {string} peer_name peer name
 */
function setMyScreenOff(peer_name) {
    if (isScreenStreaming) {
        toggleScreenSharing();
        userLog('toast', `${icons.user} ${peer_name} \n has stopped your screen sharing`);
        playSound('off');
    }
}

/**
 * Mute or Hide everyone except yourself
 * @param {string} element type audio/video
 */
function disableAllPeers(element) {
    if (!thereArePeerConnections()) {
        return toastMessage('info', 'No participants detected', '', 'top');
    }
    Swal.fire({
        background: swBg,
        position: 'top',
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
        return toastMessage('info', 'No participants detected', '', 'top');
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
 * Get active rooms from the server
 */
function getActiveRooms() {
    openURL('/activeRooms', true);
}

/**
 * Mute or Hide specific peer
 * @param {string} peer_id socket.id
 * @param {string} element type audio/video/screen
 */
function disablePeer(peer_id, element) {
    if (!thereArePeerConnections()) {
        return toastMessage('info', 'No participants detected', '', 'top');
    }
    let text, imageUrl, title, confirmButtonText;

    switch (element) {
        case 'audio':
            imageUrl = images.audioOff;
            title = 'Mute this participant?';
            text = "Once muted, you won't be able to unmute them, but they can unmute themselves at any time.";
            confirmButtonText = 'Mute';
            break;
        case 'video':
            title = 'Hide this participant?';
            imageUrl = images.videoOff;
            text = "Once hided, you won't be able to unhide them, but they can unhide themselves at any time.";
            confirmButtonText = 'Hide';
            break;
        case 'screen':
            title = 'Stop screen sharing?';
            imageUrl = images.screenOff;
            text = "Once stopped, you wan't be able to start then, but they can start screen themselves at any time.";
            confirmButtonText = 'Stop';
            break;
        default:
            break;
    }

    Swal.fire({
        background: swBg,
        position: 'top',
        imageUrl: imageUrl,
        title: title,
        text: text,
        showDenyButton: true,
        confirmButtonText: confirmButtonText,
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
                case 'screen':
                    userLog('toast', 'Stop screen 👍');
                    emitPeerAction(peer_id, 'stopScreen');
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
            screenReaderAccessibility.announceMessage(`${peer_name} locked the room`);
            break;
        case 'unlock':
            userLog('toast', `${icons.user} ${peer_name} \n has 🔓 UNLOCKED the room`, 'top-end');
            elemDisplay(unlockRoomBtn, false);
            elemDisplay(lockRoomBtn, true);
            isRoomLocked = false;
            screenReaderAccessibility.announceMessage(`${peer_name} unlocked the room`);
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
 * Handle whiteboard toggle
 */
function handleWhiteboardToggle() {
    const action = wbIsOpen ? 'close' : 'open';
    thereArePeerConnections() ? whiteboardAction(getWhiteboardAction(action)) : toggleWhiteboard();
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
    }

    if (wbIsBgTransparent) setTheme();

    whiteboard.classList.toggle('show');

    centerWhiteboard();

    wbIsOpen = !wbIsOpen;
    screenReaderAccessibility.announceMessage(wbIsOpen ? 'Whiteboard opened' : 'Whiteboard closed');
}

/**
 * Whiteboard: setup
 */
function setupWhiteboard() {
    setupWhiteboardCanvas();
    setupWhiteboardCanvasSize();
    setupWhiteboardLocalListeners();
    setupWhiteboardShortcuts();
    setupWhiteboardDragAndDrop();
    setupWhiteboardResizeListener();
}

/**
 * Whiteboard: setup resize listener for responsive behavior
 */
function setupWhiteboardResizeListener() {
    let resizeFrame;
    window.addEventListener('resize', () => {
        if (resizeFrame) cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
            if (wbCanvas && wbIsOpen) {
                setupWhiteboardCanvasSize();
            }
        });
    });
    // Also handle orientation change for mobile devices
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (wbCanvas && wbIsOpen) {
                setupWhiteboardCanvasSize();
            }
        }, 300);
    });
}

/**
 * Whiteboard: draw grid on canvas
 */
function drawCanvasGrid() {
    // Use reference dimensions for grid, zoom will handle scaling
    const width = wbReferenceWidth;
    const height = wbReferenceHeight;

    removeCanvasGrid();

    // Draw vertical lines
    for (let i = 0; i <= width; i += wbGridSize) {
        wbGridLines.push(createGridLine(i, 0, i, height));
    }
    // Draw horizontal lines
    for (let i = 0; i <= height; i += wbGridSize) {
        wbGridLines.push(createGridLine(0, i, width, i));
    }

    // Create a group for grid lines and send it to the back
    const gridGroup = new fabric.Group(wbGridLines, { selectable: false, evented: false });
    wbCanvas.add(gridGroup);
    gridGroup.sendToBack();
    wbCanvas.renderAll();
    setColor(whiteboardGridBtn, 'green');
}

/**
 * Create a grid line
 */
function createGridLine(x1, y1, x2, y2) {
    return new fabric.Line([x1, y1, x2, y2], {
        stroke: wbStroke,
        selectable: false,
        evented: false,
    });
}

/**
 * Whiteboard: remove grid lines from canvas
 */
function removeCanvasGrid() {
    wbGridLines.forEach((line) => {
        line.set({ stroke: wbGridVisible ? wbStroke : 'rgba(255, 255, 255, 0)' });
        wbCanvas.remove(line);
    });
    wbGridLines = [];
    wbCanvas.renderAll();
    setColor(whiteboardGridBtn, 'white');
}

/**
 * Whiteboard: toggle grid
 */
function toggleCanvasGrid() {
    wbGridVisible = !wbGridVisible;
    wbGridVisible ? drawCanvasGrid() : removeCanvasGrid();
    wbCanvasToJson();
}

/**
 * Whiteboard: setup canvas
 */
function setupWhiteboardCanvas() {
    wbCanvas = new fabric.Canvas('wbCanvas');
    wbCanvas.freeDrawingBrush.color = '#FFFFFF';
    wbCanvas.freeDrawingBrush.width = 3;
    whiteboardIsPencilMode(true);
}

/**
 * Whiteboard: setup canvas size to always fit full screen with proper scaling
 */
function setupWhiteboardCanvasSize() {
    // Get available viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Account for whiteboard container padding
    const containerPadding = isMobileDevice ? 10 : 20; // 5px * 2 for mobile, 10px * 2 for desktop

    // Header height varies by device
    const headerHeight = isMobileDevice ? 40 : 60; // Smaller header on mobile

    const extraMargin = 20; // Small margin to avoid any overflow

    const availableWidth = viewportWidth - containerPadding - extraMargin;
    const availableHeight = viewportHeight - containerPadding - headerHeight - extraMargin;

    // Calculate scale factor to fit the viewport while maintaining aspect ratio
    const scaleX = availableWidth / wbReferenceWidth;
    const scaleY = availableHeight / wbReferenceHeight;
    const scale = Math.min(scaleX, scaleY);

    // Set canvas dimensions to scaled reference size
    const canvasWidth = wbReferenceWidth * scale;
    const canvasHeight = wbReferenceHeight * scale;

    // Update canvas dimensions and zoom
    wbCanvas.setWidth(canvasWidth);
    wbCanvas.setHeight(canvasHeight);
    wbCanvas.setZoom(scale);

    // Update CSS variables for whiteboard container
    // Add padding and header to get total container size
    setWhiteboardSize(canvasWidth + containerPadding, canvasHeight + headerHeight + containerPadding);

    // Recenter whiteboard on screen
    centerWhiteboard();

    // Recalculate offsets and render
    wbCanvas.calcOffset();
    wbCanvas.renderAll();
}

/**
 * Whiteboard: center on screen
 */
function centerWhiteboard() {
    if (whiteboard) {
        // Force reflow to ensure centering is applied
        whiteboard.style.top = '50%';
        whiteboard.style.left = '50%';
        whiteboard.style.transform = 'translate(-50%, -50%)';
    }
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
 * Reset all whiteboard mode
 */
function whiteboardResetAllMode() {
    whiteboardIsPencilMode(false);
    whiteboardIsVanishingMode(false);
    whiteboardIsObjectMode(false);
    whiteboardIsEraserMode(false);
}

/**
 * Set whiteboard Pencil mode
 */
function whiteboardIsPencilMode(status) {
    wbCanvas.isDrawingMode = status;
    wbIsPencil = status;
    setColor(whiteboardPencilBtn, wbIsPencil ? 'green' : 'white');
}

/**
 * Set whiteboard Vanishing mode
 */
function whiteboardIsVanishingMode(status) {
    wbCanvas.isDrawingMode = status;
    wbIsVanishing = status;
    wbCanvas.freeDrawingBrush.color = wbIsVanishing ? 'yellow' : wbDrawingColorEl.value;
    setColor(whiteboardVanishingBtn, wbIsVanishing ? 'green' : 'white');
}

/**
 * Set whiteboard Object mode
 */
function whiteboardIsObjectMode(status) {
    wbIsObject = status;
    setColor(whiteboardObjectBtn, status ? 'green' : 'white');
}

/**
 * Set whiteboard Eraser mode
 */
function whiteboardIsEraserMode(status) {
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
    wbCanvas.freeDrawingBrush.color = wbDrawingColorEl.value;

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
        case 'stickyNote':
            createStickyNote();
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
 * Whiteboard delte object
 */
function whiteboardDeleteObject() {
    const obj = wbCanvas?.getActiveObject?.();
    if (!obj) return;
    // Ignore if typing in input (unless editing Fabric text)
    const tag = document.activeElement?.tagName;
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && !obj.isEditing) return;
    if (obj.isEditing && obj.exitEditing) obj.exitEditing();
    whiteboardEraseObject();
    return;
}

/**
 * Whiteboard erase object
 */
function whiteboardEraseObject() {
    if (wbCanvas && typeof wbCanvas.getActiveObjects === 'function') {
        const activeObjects = wbCanvas.getActiveObjects();
        if (activeObjects && activeObjects.length > 0) {
            // Remove all selected objects
            activeObjects.forEach((obj) => {
                wbCanvas.remove(obj);
            });
            wbCanvas.discardActiveObject();
            wbCanvas.requestRenderAll();
            wbCanvasToJson();
        }
    }
}

/**
 * Whoteboard clone object
 */
function whiteboardCloneObject() {
    if (wbCanvas && typeof wbCanvas.getActiveObjects === 'function') {
        const activeObjects = wbCanvas.getActiveObjects();
        if (activeObjects && activeObjects.length > 0) {
            activeObjects.forEach((obj, idx) => {
                obj.clone((cloned) => {
                    // Offset each clone for visibility
                    cloned.set({
                        left: obj.left + 30 + idx * 10,
                        top: obj.top + 30 + idx * 10,
                        evented: true,
                    });
                    wbCanvas.add(cloned);
                    wbCanvas.setActiveObject(cloned);
                    wbCanvasToJson();
                });
            });
            wbCanvas.requestRenderAll();
        }
    }
}

/**
 * Whiteboard vanishong objects
 */
function wbHandleVanishingObjects() {
    if (wbIsVanishing && wbCanvas._objects.length > 0) {
        const obj = wbCanvas._objects[wbCanvas._objects.length - 1];
        if (obj && obj.type === 'path') {
            wbVanishingObjects.push(obj);
            const fadeDuration = 1000,
                vanishTimeout = 5000;
            setTimeout(() => {
                const start = performance.now();
                function fade(ts) {
                    const p = Math.min((ts - start) / fadeDuration, 1);
                    obj.set('opacity', 1 - p);
                    wbCanvas.requestRenderAll();
                    if (p < 1) requestAnimationFrame(fade);
                }
                requestAnimationFrame(fade);
            }, vanishTimeout - fadeDuration);
            setTimeout(() => {
                wbCanvas.remove(obj);
                wbCanvas.renderAll();
                wbCanvasToJson();
                wbVanishingObjects.splice(wbVanishingObjects.indexOf(obj), 1);
            }, vanishTimeout);
        }
    }
}

/**
 * Whoteboard create sticky note
 */
function createStickyNote() {
    Swal.fire({
        background: swBg,
        title: 'Create Sticky Note',
        html: renderRoomTemplate('tpl-sticky-note-form'),
        showCancelButton: true,
        confirmButtonText: 'Create',
        cancelButtonText: 'Cancel',
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
        preConfirm: () => {
            return {
                text: getId('stickyNoteText').value,
                color: getId('stickyNoteColor').value,
                textColor: getId('stickyNoteTextColor').value,
            };
        },
        didOpen: () => {
            // Focus textarea for quick typing
            setTimeout(() => {
                getId('stickyNoteText').focus();
            }, 100);
        },
    }).then((result) => {
        if (result.isConfirmed) {
            const noteData = result.value;

            // Create sticky note background (rectangle)
            const noteRect = new fabric.Rect({
                left: 100,
                top: 100,
                width: 220,
                height: 160,
                fill: noteData.color,
                shadow: 'rgba(0,0,0,0.18) 0px 4px 12px',
                rx: 14,
                ry: 14,
            });

            // Create text for sticky note
            const noteText = new fabric.Textbox(noteData.text, {
                left: 110,
                top: 110,
                width: 200,
                fontSize: 18,
                fontFamily: 'Segoe UI, Arial, sans-serif',
                fill: noteData.textColor,
                textAlign: 'left',
                editable: true,
                fontWeight: 'bold',
                shadow: new fabric.Shadow({
                    color: 'rgba(255,255,255,0.18)',
                    blur: 2,
                    offsetX: 1,
                    offsetY: 1,
                }),
                padding: 8,
                cornerSize: 8,
            });

            // Group rectangle and text together
            const stickyNoteGroup = new fabric.Group([noteRect, noteText], {
                left: 100,
                top: 100,
                selectable: true,
                hasControls: true,
                hoverCursor: 'pointer',
            });

            // Make the text editable by handling double-click events
            stickyNoteGroup.on('mousedblclick', function () {
                noteText.enterEditing();
                noteText.hiddenTextarea && noteText.hiddenTextarea.focus();
            });

            // Exit editing when clicking outside the noteText
            wbCanvas.on('mouse:down', function (e) {
                if (noteText.isEditing && e.target !== noteText) {
                    noteText.exitEditing();
                }
            });

            addWbCanvasObj(stickyNoteGroup);
        }
    });
}

/**
 * Format accepted file types for UI helper text
 * @param {string} accept
 * @returns {string}
 */
function formatAcceptedFileTypes(accept = '*') {
    if (!accept || accept === '*') return 'any file type';

    return accept
        .split(',')
        .map((type) => type.trim())
        .filter(Boolean)
        .map((type) => {
            if (type.startsWith('.')) return type.slice(1).toUpperCase();
            if (type.endsWith('/*')) return `${type.slice(0, -2).toUpperCase()} files`;
            if (type.includes('/')) return type.split('/')[1].toUpperCase();
            return type.toUpperCase();
        })
        .join(', ');
}

/**
 * Open a styled file picker modal with drag-and-drop support
 * @param {object} config
 * @returns {Promise<File|null>}
 */
async function openFilePickerModal(config) {
    const {
        title,
        accept = '*',
        confirmButtonText = 'OK',
        emptyStateTitle = 'Drop file here',
        emptyStateSubtitle = 'or browse from your device',
        helperText = `Supports ${formatAcceptedFileTypes(accept)}`,
    } = config;

    let selectedFile = null;

    const result = await Swal.fire({
        allowOutsideClick: false,
        background: swBg,
        position: 'center',
        title: title,
        input: 'file',
        html: renderRoomTemplate('tpl-file-picker-modal', {
            text: {
                emptyStateTitle,
                emptyStateSubtitle,
                helperText,
            },
        }),
        inputAttributes: {
            accept: accept,
            'aria-label': title,
        },
        customClass: {
            htmlContainer: 'mirotalk-file-picker-html',
        },
        didOpen: () => {
            const input = Swal.getInput();
            const confirmButton = Swal.getConfirmButton();
            const dropzone = getId('mirotalkFileDropzone');
            const dropzoneTitle = getId('mirotalkFileDropzoneTitle');
            const dropzoneSubtitle = getId('mirotalkFileDropzoneSubtitle');
            const preview = getId('mirotalkFilePreview');
            const fileName = getId('mirotalkFileName');
            const fileDetails = getId('mirotalkFileDetails');
            const browseBtn = getId('mirotalkFileBrowseBtn');
            const removeBtn = getId('mirotalkFileRemoveBtn');

            if (
                !input ||
                !confirmButton ||
                !dropzone ||
                !preview ||
                !fileName ||
                !fileDetails ||
                !browseBtn ||
                !removeBtn
            )
                return;

            input.classList.add('mirotalk-hidden-file-input');
            input.setAttribute('tabindex', '-1');
            confirmButton.disabled = true;

            const resetSelection = () => {
                selectedFile = null;
                input.value = '';
                preview.hidden = true;
                dropzone.classList.remove('has-file', 'is-dragover');
                dropzoneTitle.textContent = emptyStateTitle;
                dropzoneSubtitle.textContent = emptyStateSubtitle;
                browseBtn.textContent = 'Browse files';
                confirmButton.disabled = true;
                Swal.resetValidationMessage();
            };

            const applySelection = (file) => {
                if (!file) return resetSelection();
                if (file.size <= 0) {
                    resetSelection();
                    return Swal.showValidationMessage('The selected file is empty.');
                }

                selectedFile = file;
                fileName.textContent = file.name;
                fileDetails.textContent = `${bytesToSize(file.size)}${file.type ? ` • ${file.type}` : ''}`;
                preview.hidden = false;
                dropzone.classList.add('has-file');
                dropzone.classList.remove('is-dragover');
                dropzoneTitle.textContent = 'File ready';
                dropzoneSubtitle.textContent = 'Drop another file here or browse to replace it';
                browseBtn.textContent = 'Browse another file';
                Swal.resetValidationMessage();
                confirmButton.disabled = false;
            };

            const openSystemPicker = (event) => {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                input.click();
            };

            const handleDragState = (event, isActive) => {
                event.preventDefault();
                event.stopPropagation();
                dropzone.classList.toggle('is-dragover', isActive);
                if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
            };

            browseBtn.addEventListener('click', openSystemPicker);
            dropzone.addEventListener('click', openSystemPicker);
            removeBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                resetSelection();
            });

            input.addEventListener('change', () => {
                applySelection(input.files && input.files.length ? input.files[0] : null);
            });

            dropzone.addEventListener('dragenter', (event) => handleDragState(event, true));
            dropzone.addEventListener('dragover', (event) => handleDragState(event, true));
            dropzone.addEventListener('dragleave', (event) => handleDragState(event, false));
            dropzone.addEventListener('drop', (event) => {
                handleDragState(event, false);

                const transfer = event.dataTransfer;
                if (!transfer) return;

                if (transfer.items && transfer.items.length > 1) {
                    resetSelection();
                    return Swal.showValidationMessage('Please choose a single file.');
                }

                const item = transfer.items && transfer.items.length ? transfer.items[0] : null;
                const entry = item && typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;

                if (entry && entry.isDirectory) {
                    resetSelection();
                    return Swal.showValidationMessage('Folders are not supported.');
                }

                if (item && item.kind && item.kind !== 'file') {
                    resetSelection();
                    return Swal.showValidationMessage('Only files can be uploaded here.');
                }

                const file = item && typeof item.getAsFile === 'function' ? item.getAsFile() : transfer.files[0];

                if (!file) {
                    resetSelection();
                    return Swal.showValidationMessage('Could not read the selected file.');
                }

                applySelection(file);
            });
        },
        showDenyButton: true,
        confirmButtonText: confirmButtonText,
        denyButtonText: 'Cancel',
        preConfirm: () => {
            if (!selectedFile) {
                Swal.showValidationMessage('Choose a file to continue.');
                return false;
            }
            return selectedFile;
        },
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    });

    return result.isConfirmed ? result.value || selectedFile : null;
}

/**
 * Setup Canvas file selections
 * @param {string} title
 * @param {string} accept
 * @param {object} renderToCanvas
 */
async function setupFileSelection(title, accept, renderToCanvas) {
    const file = await openFilePickerModal({
        title,
        accept,
        confirmButtonText: 'OK',
    });

    if (file) renderToCanvas(file);
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
            whiteboardResetAllMode();
            whiteboardIsObjectMode(false);
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
            })
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
                })
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
        whiteboardResetAllMode();
        whiteboardIsObjectMode(true);
        wbCanvasToJson();
    } else {
        console.error('Invalid input. Expected an obj of canvas elements');
    }
}

/**
 * Whiteboard: Local listners
 */
function setupWhiteboardLocalListeners() {
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
        // Don't add vanishing objects to redo stack
        if (!wbVanishingObjects.includes(e.target)) {
            wbPop.push(e.target); // To allow redo
        }
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
    wbHandleVanishingObjects();
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
        const obj = wbCanvas._objects.pop();
        // Don't add vanishing objects to redo stack
        if (!wbVanishingObjects.includes(obj)) {
            wbPop.push(obj);
        }
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
 * Whiteboard: clear
 */
function wbCanvasClear() {
    wbCanvas.clear();
    wbCanvas.renderAll();
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
            peer_name: myPeerName,
            peer_uuid: myPeerUUID,
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
    wbIsRedoing = true;

    // Parse the JSON and load it
    wbCanvas.loadFromJSON(config.wbCanvasJson, function () {
        // After loading, ensure proper scaling is maintained
        setupWhiteboardCanvasSize();
        wbIsRedoing = false;
    });

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
        peer_uuid: myPeerUUID,
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
        position: 'top',
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
        // Security: peer_name is attacker-controllable in upstream payloads and
        // the Swal toast renders the title as HTML. Escape angle brackets /
        // quotes so a crafted name like `<img src=//attacker/track>` can't
        // trigger outbound requests in every recipient's browser.
        const safePeerName = String(peer_name || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        userLog('toast', `${icons.user} ${safePeerName} \n whiteboard action: ${action}`);
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
            wbCanvasClear();
            removeCanvasGrid();
            break;
        case 'open':
            if (!wbIsOpen) toggleWhiteboard();
            break;
        case 'close':
            if (wbIsOpen) toggleWhiteboard();
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
                elemDisplay(whiteboardOptions, true, 'flex');
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
 * Show whiteboard shortcuts
 */
function showWhiteboardShortcuts() {
    if (!whiteboardShortcutsContent) {
        console.error('Whiteboard shortcuts content not found');
        return;
    }
    Swal.fire({
        background: swBg,
        position: 'center',
        title: 'Whiteboard Shortcuts',
        html: whiteboardShortcutsContent.innerHTML,
        confirmButtonText: 'Got it!',
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    });
}

/**
 * Setup whiteboard drag and drop
 * @returns void
 */
function setupWhiteboardDragAndDrop() {
    if (!wbCanvas) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        wbCanvas.upperCanvasEl.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area
    ['dragenter', 'dragover'].forEach((eventName) => {
        wbCanvas.upperCanvasEl.addEventListener(
            eventName,
            () => {
                wbCanvas.upperCanvasEl.style.border = '1px dashed #fff';
            },
            false
        );
    });

    ['dragleave', 'drop'].forEach((eventName) => {
        wbCanvas.upperCanvasEl.addEventListener(
            eventName,
            () => {
                wbCanvas.upperCanvasEl.style.border = '';
            },
            false
        );
    });

    // Handle dropped files
    wbCanvas.upperCanvasEl.addEventListener('drop', handleWhiteboardDrop, false);
}

/**
 * Handle whiteboard drop
 * @param {object} e event
 */
function handleWhiteboardDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length === 0) return;

    const file = files[0];
    const fileType = file.type;

    switch (true) {
        case fileType.startsWith('image/'):
            renderImageToCanvas(file);
            break;
        case fileType === 'application/pdf':
            renderPdfToCanvas(file);
            break;
        default:
            userLog('warning', `Unsupported file type: ${fileType}. Please drop an image or PDF file.`, 6000);
            break;
    }
}

/**
 * Setup whiteboard keyboard shortcuts
 */
function setupWhiteboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        if (!wbIsOpen) return;

        // Whiteboard clone shortcut: Cmd+C/Ctrl+C
        if ((event.key === 'c' || event.key === 'C') && (event.ctrlKey || event.metaKey)) {
            whiteboardCloneObject();
            event.preventDefault();
            return;
        }
        // Whiteboard erase shortcut: Cmd+X/Ctrl+X
        if ((event.key === 'x' || event.key === 'X') && (event.ctrlKey || event.metaKey)) {
            whiteboardEraseObject();
            event.preventDefault();
            return;
        }

        // Whiteboard undo shortcuts: Cmd+Z/Ctrl+Z
        if ((event.key === 'z' || event.key === 'Z') && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
            whiteboardAction(getWhiteboardAction('undo'));
            event.preventDefault();
            return;
        }
        // Whiteboard Redo shortcuts: Cmd+Shift+Z/Ctrl+Shift+Z or Cmd+Y/Ctrl+Y
        if (
            ((event.key === 'z' || event.key === 'Z') && (event.ctrlKey || event.metaKey) && event.shiftKey) ||
            ((event.key === 'y' || event.key === 'Y') && (event.ctrlKey || event.metaKey))
        ) {
            whiteboardAction(getWhiteboardAction('redo'));
            event.preventDefault();
            return;
        }
        // Whiteboard delete shortcut: Delete / Backspace
        if (event.key === 'Delete' || event.key === 'Backspace') {
            whiteboardDeleteObject();
            event.preventDefault();
            return;
        }

        // Use event.code and check for Alt+Meta (Mac) or Alt+Ctrl (Windows/Linux)
        if (event.code && event.altKey && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
            switch (event.code) {
                case 'KeyT': // Text
                    whiteboardAddObj('text');
                    event.preventDefault();
                    break;
                case 'KeyL': // Line
                    whiteboardAddObj('line');
                    event.preventDefault();
                    break;
                case 'KeyC': // Circle
                    whiteboardAddObj('circle');
                    event.preventDefault();
                    break;
                case 'KeyR': // Rectangle
                    whiteboardAddObj('rect');
                    event.preventDefault();
                    break;
                case 'KeyG': // Triangle (G for Geometry)
                    whiteboardAddObj('triangle');
                    event.preventDefault();
                    break;
                case 'KeyN': // Sticky Note
                    whiteboardAddObj('stickyNote');
                    event.preventDefault();
                    break;
                case 'KeyU': // Image (from URL)
                    whiteboardAddObj('imgUrl');
                    event.preventDefault();
                    break;
                case 'KeyV': // Vanishing Pen
                    whiteboardResetAllMode();
                    whiteboardIsVanishingMode(!wbIsVanishing);
                    event.preventDefault();
                    break;
                case 'KeyI': // Image (from file)
                    whiteboardAddObj('imgFile');
                    event.preventDefault();
                    break;
                case 'KeyP': // PDF (from file)
                    whiteboardAddObj('pdfFile');
                    event.preventDefault();
                    break;
                case 'KeyQ': // Clear Board
                    confirmCleanBoard();
                    event.preventDefault();
                    break;
                default:
                    break;
            }
        }
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
async function selectFileToShare(peer_id, broadcast = false, peerName = '') {
    playSound('newMessage');

    const targetLabel = !broadcast && peerName ? ` with ${peerName}` : '';

    const file = await openFilePickerModal({
        title: `Share file${targetLabel}`,
        accept: fileSharingInput,
        confirmButtonText: 'Send',
        helperText:
            fileSharingInput === '*'
                ? 'Any file type supported'
                : `Supports ${formatAcceptedFileTypes(fileSharingInput)}`,
    });

    if (file) sendFileInformations(file, peer_id, broadcast, peerName);
}

/**
 * Send file informations
 * @param {object} file data
 * @param {string} peer_id
 * @param {boolean} broadcast send to all (default false)
 * @returns
 */
function sendFileInformations(file, peer_id, broadcast = false, peerName = '') {
    fileToSend = file;
    // check if valid
    if (fileToSend && fileToSend.size > 0) {
        // no peers in the room
        if (!thereArePeerConnections()) {
            return toastMessage('info', 'No participants detected', '', 'top');
        }

        // prevent XSS injection to remote peer (fileToSend.name is read only)
        if (isHtml(fileToSend.name) || !isValidFileName(fileToSend.name))
            return userLog('warning', 'Invalid file name!');

        const targetPeerName = !broadcast ? filterXSS(peerName || resolvePeerNameById(peer_id) || 'Participant') : '';
        const fileInfo = {
            room_id: roomId,
            broadcast: broadcast,
            peer_name: myPeerName,
            peer_avatar: myPeerAvatar,
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
            !broadcast,
            null,
            targetPeerName
        );

        // send some metadata about our file to peers in the room
        sendToServer('fileInfo', fileInfo);

        // send the File
        setTimeout(() => {
            sendFileData(peer_id, broadcast);
        }, 1000);

        // Screen reader announcement for file sharing
        screenReaderAccessibility.announceMessage(`Sending file ${fileToSend.name}`);
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
    setPeerChatAvatarImgName('left', incomingFileInfo.peer_name, incomingFileInfo.peer_avatar);
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
        incomingFileInfo.peer_id
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
    if (isImageFile(incomingFileInfo.file.fileName)) {
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
function sendVideoUrl(peer_id = null, peer_name = '', broadcast = !peer_id) {
    playSound('newMessage');

    const targetPeerName = !broadcast ? filterXSS(peer_name || resolvePeerNameById(peer_id) || 'Participant') : '';
    const targetLabel = !broadcast && targetPeerName ? ` with ${targetPeerName}` : '';

    Swal.fire({
        background: swBg,
        position: 'center',
        imageUrl: images.vaShare,
        title: `Share a Video or Audio${targetLabel}`,
        text: `Paste a Video or audio URL${targetLabel}`,
        input: 'text',
        showCancelButton: true,
        confirmButtonText: `Share`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.value) {
            result.value = filterXSS(result.value);
            if (!thereArePeerConnections()) {
                return toastMessage('info', 'No participants detected', '', 'top');
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
                broadcast: broadcast,
            };
            openVideoUrlPlayer(config);
            emitVideoPlayer('open', config);
            appendMessage(
                myPeerName,
                rightChatAvatar,
                'right',
                `${icons.share} Shared media: <br/><a href="${video_url}" target="_blank" rel="noopener noreferrer">${video_url}</a>`,
                !broadcast,
                null,
                targetPeerName
            );
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
        broadcast: config.broadcast,
    });
}

/**
 * Handle Video Player
 * @param {object} config data
 */
function handleVideoPlayer(config) {
    const { peer_name, video_action, video_src, broadcast } = config;
    //
    switch (video_action) {
        case 'open':
            userLog('toast', `${icons.user} ${peer_name} \n open video player`);
            openVideoUrlPlayer(config);
            appendMessage(
                peer_name,
                leftChatAvatar,
                'left',
                `${icons.share} Shared media: <br/><a href="${video_src}" target="_blank" rel="noopener noreferrer">${video_src}</a>`,
                !broadcast,
                null,
                peer_name
            );
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
        position: 'top',
        imageUrl: images.leave,
        title: 'Kick out',
        text: `Are you sure you want to kick out ${pName}?`,
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
 * Start caption if not already started
 * @param {object} config data
 */
function handleCaptionActions(config) {
    const { peer_name, action } = config;

    switch (action) {
        case 'start':
            if (!speechRecognition) {
                userLog(
                    'info',
                    `${peer_name} wants to start captions for this session, but your browser does not support it. Please use a Chromium-based browser like Google Chrome, Microsoft Edge, or Brave.`
                );
                return;
            }

            if (recognitionRunning || !buttons.main.showCaptionRoomBtn) return;

            Swal.fire({
                allowOutsideClick: false,
                allowEscapeKey: false,
                showDenyButton: true,
                background: swBg,
                imageUrl: images.caption,
                title: 'Start Captions',
                text: `${peer_name} wants to start the captions for this session. Would you like to enable them?`,
                confirmButtonText: `Yes`,
                denyButtonText: `No`,
                showClass: { popup: 'animate__animated animate__fadeInDown' },
                hideClass: { popup: 'animate__animated animate__fadeOutUp' },
            }).then((result) => {
                if (result.isConfirmed) {
                    if (!isCaptionBoxVisible) {
                        captionBtn.click();
                    }
                    if (!recognitionRunning) {
                        const { recognitionLanguageIndex, recognitionDialectIndex } = config.data;
                        recognitionLanguage.selectedIndex = recognitionLanguageIndex;
                        updateCountry();
                        recognitionDialect.selectedIndex = recognitionDialectIndex;
                        speechRecognitionStart.click();
                    }
                }
            });
            break;
        case 'stop':
            if (!recognitionRunning || !buttons.main.showCaptionRoomBtn) return;
            toastMessage(
                'warning',
                'Stop captions',
                `${peer_name} has stopped the captions for this session`,
                'top-end',
                6000
            );
            if (recognitionRunning) {
                speechRecognitionStop.click();
            }
            break;
        default:
            break;
    }
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
        html: renderRoomTemplate('tpl-kicked-out-modal', {
            text: {
                peerName: peer_name,
            },
        }),
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

    const aboutHtml = brand.about.html;

    Swal.fire({
        background: swBg,
        position: 'center',
        title: brand.about?.title && brand.about.title.trim() !== '' ? brand.about.title : 'WebRTC P2P v1.8.62',
        imageUrl: brand.about?.imageUrl && brand.about.imageUrl.trim() !== '' ? brand.about.imageUrl : images.about,
        customClass: { image: 'img-about' },
        html: renderRoomTemplate('tpl-about-modal', {
            html: {
                aboutHtml,
            },
        }),
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    });
}

/**
 * Init Exit Meeting
 */
function initExitMeeting() {
    openURL('/newcall');
}

/**
 * Leave the Room and create a new one
 */
function leaveRoom() {
    checkRecording();
    surveyActive ? leaveFeedback() : redirectOnLeave();
}

/**
 * Exit the Room
 */
function exitRoom() {
    checkRecording();
    redirectOnLeave();
}

/**
 * Ask for feedback when room exit
 */
function leaveFeedback() {
    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonColor: 'green',
        denyButtonColor: 'red',
        cancelButtonColor: 'gray',
        background: swBg,
        imageUrl: images.feedback,
        position: 'top',
        title: 'Leave a feedback',
        text: 'Do you want to rate your MiroTalk experience?',
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        cancelButtonText: `Cancel`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.isConfirmed) {
            openURL(surveyURL);
        } else if (result.isDenied) {
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
 * Map volume level to a display color
 * @param {number} volume 0-100
 * @returns {string} hex color
 */
function getVolumeColor(volume) {
    if (volume >= 80) return '#FF0000'; // Red
    if (volume >= 50) return '#FFA500'; // Orange
    return '#19bb5c'; // Green
}

/**
 * Handle peer audio volume
 * @param {object} data peer audio
 */
function handlePeerVolume(data) {
    const { peer_id, volume } = data;

    if (volume === 0) return;

    const audioColorTmp = getVolumeColor(volume);

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
    clearTimeout(peerVolumeTimers[peer_id]);
    peerVolumeTimers[peer_id] = setTimeout(function () {
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

    if (volume === 0) return;

    const audioColorTmp = getVolumeColor(volume);

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
    clearTimeout(myVolumeTimer);
    myVolumeTimer = setTimeout(function () {
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
 * Show a persistent banner indicating the signaling server connection was lost.
 */
function showDisconnectBanner() {
    if (!banner) return;
    banner.classList.remove('reconnected');
    icon.className = 'fa-solid fa-wifi-exclamation';
    title.textContent = 'Connection lost';
    msg.innerHTML = 'Reconnecting to signaling server\u2026';
    spinner.style.opacity = '1';
    if (disconnectBannerRafId) cancelAnimationFrame(disconnectBannerRafId);
    disconnectBannerRafId = requestAnimationFrame(() => {
        disconnectBannerRafId = null;
        banner.classList.add('visible');
    });
}

/**
 * Hide the disconnect banner (or briefly show a reconnected confirmation).
 */
function hideDisconnectBanner() {
    if (!banner) return;
    if (disconnectBannerRafId) {
        cancelAnimationFrame(disconnectBannerRafId);
        disconnectBannerRafId = null;
    }
    if (!banner.classList.contains('visible')) return;
    banner.classList.add('reconnected');
    icon.className = 'fa-solid fa-circle-check';
    title.textContent = 'Back online';
    msg.textContent = 'Connection restored successfully';
    setTimeout(() => {
        banner.classList.remove('visible');
        setTimeout(() => banner.classList.remove('reconnected'), 420);
    }, 2800);
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
    if (['warning', 'error'].includes(icon)) playSound('alert');

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
    if (['warning', 'error'].includes(icon)) playSound('alert');

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
    if (['warning', 'error'].includes(icon)) playSound('alert');

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
 * @param {string} path of sound files
 */
async function playSound(name, force = false, path = '../sounds/') {
    if (!notifyBySound && !force) return;
    const sound = path + name + '.mp3';
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
 * Test speaker by playing a sound through the selected audio output device
 * @param {string} deviceId - Optional audio output device ID. If not provided, uses the currently selected speaker
 * @param {string} name audio to play
 * @param {string} path od sound files
 */
async function playSpeaker(deviceId = null, name, path = '../sounds/') {
    const selectedDeviceId = deviceId || audioOutputSelect?.value;
    if (selectedDeviceId) {
        const sound = path + name + '.mp3';
        const audioToPlay = new Audio(sound);
        try {
            if (typeof audioToPlay.setSinkId === 'function') {
                await audioToPlay.setSinkId(selectedDeviceId);
            }
            audioToPlay.volume = 0.5;
            await audioToPlay.play();
        } catch (err) {
            console.error('Cannot play test sound:', err);
        }
    } else {
        playSound(name, true);
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
 * Check if WebRTC supported
 * @return {boolean} true/false
 */
function checkWebRTCSupported() {
    return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
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
 * Remove Border Radius
 */
function restoreSplitButtonsBorderRadius() {
    // On mobile we skip dropdown behavior, but ensure split buttons still look rounded.
    document.querySelectorAll('#bottomButtons .split-btn').forEach((group) => {
        group.querySelectorAll('button').forEach((button) => {
            // Hack: Exclude settingsExtraToggle extra buttons...
            if (button.id != 'settingsExtraToggle' && button.id != 'mySettingsBtn') {
                button.style.setProperty('border-radius', '10px', 'important');
            }
        });
        const toggle = group.querySelector('.device-dropdown-toggle');
        if (toggle) toggle.style.setProperty('border-left', 'none', 'important');
    });
}

/**
 * Setup Quick audio/video device switch dropdowns
 */
function setupQuickDeviceSwitchDropdowns() {
    // For now keep this feature only for desktop devices
    if (!isDesktopDevice) {
        restoreSplitButtonsBorderRadius();
        return;
    }

    if (!videoBtn || !audioBtn || !videoDropdown || !audioDropdown || !videoToggle || !audioToggle) {
        return;
    }

    function syncVisibility() {
        // Keep dropdown visible while the corresponding button is visible
        const showVideo = !!videoBtn && window.getComputedStyle(videoBtn).display !== 'none';
        const showAudio = !!audioBtn && window.getComputedStyle(audioBtn).display !== 'none';
        videoDropdown.classList.toggle('hidden', !showVideo);
        audioDropdown.classList.toggle('hidden', !showAudio);
    }

    function isMenuOpen(menuEl) {
        return !!menuEl && menuEl.classList.contains('show');
    }

    function closeMenu(toggleEl, menuEl) {
        if (!toggleEl || !menuEl) return;
        menuEl.classList.remove('show');
        toggleEl.setAttribute('aria-expanded', 'false');
    }

    function openMenu(toggleEl, menuEl, rebuildFn) {
        if (!toggleEl || !menuEl) return;
        if (typeof rebuildFn === 'function') rebuildFn();
        menuEl.classList.add('show');
        toggleEl.setAttribute('aria-expanded', 'true');
    }

    function toggleMenu(toggleEl, menuEl, rebuildFn) {
        const open = isMenuOpen(menuEl);
        // only one open at a time
        closeMenu(videoToggle, videoMenu);
        closeMenu(audioToggle, audioMenu);
        if (!open) openMenu(toggleEl, menuEl, rebuildFn);
    }

    function appendMenuHeader(menuEl, iconClass, title) {
        if (!menuEl) return;
        const header = document.createElement('div');
        header.className = 'device-menu-header';

        const icon = document.createElement('i');
        icon.className = iconClass;

        const text = document.createElement('span');
        text.textContent = title;

        header.appendChild(icon);
        header.appendChild(text);
        menuEl.appendChild(header);
    }

    function appendMenuDivider(menuEl) {
        if (!menuEl) return;
        const divider = document.createElement('div');
        divider.className = 'device-menu-divider';
        menuEl.appendChild(divider);
    }

    function appendSelectOptions(menuEl, selectEl, emptyLabel, rebuildFn) {
        if (!menuEl || !selectEl) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'app-dropdown-action';
            btn.disabled = true;
            btn.textContent = emptyLabel;
            menuEl.appendChild(btn);
            return;
        }

        const options = Array.from(selectEl.options || []).filter((o) => o && o.value);

        if (options.length === 0) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'app-dropdown-action';
            btn.disabled = true;
            btn.textContent = emptyLabel;
            menuEl.appendChild(btn);
            return;
        }

        options.forEach((opt) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'app-dropdown-action';

            const isSelected = opt.value === selectEl.value;
            const label = opt.textContent || opt.label || opt.value;

            btn.replaceChildren();
            if (isSelected) {
                const icon = document.createElement('i');
                icon.className = 'fas fa-check';
                icon.style.marginRight = '0.5em';
                btn.appendChild(icon);
                btn.appendChild(document.createTextNode(` ${label}`));
            } else {
                const spacer = document.createElement('span');
                spacer.style.display = 'inline-block';
                spacer.style.width = '1.25em';
                btn.appendChild(spacer);
                btn.appendChild(document.createTextNode(label));
            }

            btn.addEventListener('click', () => {
                if (selectEl.value === opt.value) return;
                selectEl.value = opt.value;
                selectEl.dispatchEvent(new Event('change'));
                if (typeof rebuildFn === 'function') rebuildFn();
            });

            menuEl.appendChild(btn);
        });
    }

    function rebuildVideoMenu() {
        if (!videoMenu) return;
        videoMenu.innerHTML = '';

        appendMenuHeader(videoMenu, 'fas fa-video', 'Cameras');
        appendSelectOptions(videoMenu, videoSelect, 'No cameras found', rebuildVideoMenu);

        // Add settings button
        appendMenuDivider(videoMenu);
        const settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.className = 'app-dropdown-action device-menu-action-btn';
        const settingsIcon = document.createElement('i');
        settingsIcon.className = 'fas fa-cog';
        settingsBtn.appendChild(settingsIcon);
        settingsBtn.appendChild(document.createTextNode(' Open Video Settings'));
        settingsBtn.addEventListener('click', () => {
            hideShowMySettings();
            // Simulate tab click to open video devices tab
            setTimeout(() => {
                tabVideoBtn.click();
            }, 100);
        });
        videoMenu.appendChild(settingsBtn);
    }

    function rebuildAudioMenu() {
        if (!audioMenu) return;
        audioMenu.innerHTML = '';

        appendMenuHeader(audioMenu, 'fas fa-microphone', 'Microphones');
        appendSelectOptions(audioMenu, audioInputSelect, 'No microphones found', rebuildAudioMenu);

        appendMenuDivider(audioMenu);

        appendMenuHeader(audioMenu, 'fas fa-volume-high', 'Speakers');
        if (!audioOutputSelect || audioOutputSelect.disabled) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'app-dropdown-action';
            btn.disabled = true;
            btn.textContent = 'Speaker selection not supported';
            audioMenu.appendChild(btn);
            return;
        }
        appendSelectOptions(audioMenu, audioOutputSelect, 'No speakers found', rebuildAudioMenu);

        // Add action buttons
        appendMenuDivider(audioMenu);

        // Test speaker button
        const testBtn = document.createElement('button');
        testBtn.type = 'button';
        testBtn.className = 'app-dropdown-action device-menu-action-btn';
        const testIcon = document.createElement('i');
        testIcon.className = 'fa-solid fa-circle-play';
        testBtn.appendChild(testIcon);
        testBtn.appendChild(document.createTextNode(' Test Speaker'));
        testBtn.addEventListener('click', () => playSpeaker(audioOutputSelect?.value, 'speaker'));
        audioMenu.appendChild(testBtn);

        // Settings button
        const settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.className = 'app-dropdown-action device-menu-action-btn';
        const settingsIcon = document.createElement('i');
        settingsIcon.className = 'fas fa-cog';
        settingsBtn.appendChild(settingsIcon);
        settingsBtn.appendChild(document.createTextNode(' Open Audio Settings'));
        settingsBtn.addEventListener('click', () => {
            hideShowMySettings();
            // Simulate tab click to open audio devices tab
            setTimeout(() => {
                tabAudioBtn.click();
            }, 100);
        });
        audioMenu.appendChild(settingsBtn);
    }

    // Hover behavior (desktop only). Note: rebuilding alone is invisible if the menu isn't opened.
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (supportsHover) {
        const attachHoverDropdown = (toggleEl, menuEl, rebuildFn, closeOtherFn) => {
            if (!toggleEl || !menuEl) return;

            let closeTimeout;
            const cancelClose = () => {
                if (!closeTimeout) return;
                clearTimeout(closeTimeout);
                closeTimeout = null;
            };
            const scheduleClose = () => {
                cancelClose();
                closeTimeout = setTimeout(() => closeMenu(toggleEl, menuEl), 180);
            };

            toggleEl.addEventListener('mouseenter', () => {
                cancelClose();
                if (typeof closeOtherFn === 'function') closeOtherFn();
                openMenu(toggleEl, menuEl, rebuildFn);
            });
            toggleEl.addEventListener('mouseleave', scheduleClose);
            menuEl.addEventListener('mouseenter', cancelClose);
            menuEl.addEventListener('mouseleave', scheduleClose);
        };

        attachHoverDropdown(videoToggle, videoMenu, rebuildVideoMenu, () => closeMenu(audioToggle, audioMenu));
        attachHoverDropdown(audioToggle, audioMenu, rebuildAudioMenu, () => closeMenu(videoToggle, videoMenu));
    }

    videoToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu(videoToggle, videoMenu, rebuildVideoMenu);
    });

    audioToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu(audioToggle, audioMenu, rebuildAudioMenu);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        const t = e.target;
        const inVideo = videoDropdown && (videoDropdown === t || videoDropdown.contains(t));
        const inAudio = audioDropdown && (audioDropdown === t || audioDropdown.contains(t));
        if (!inVideo) closeMenu(videoToggle, videoMenu);
        if (!inAudio) closeMenu(audioToggle, audioMenu);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        closeMenu(videoToggle, videoMenu);
        closeMenu(audioToggle, audioMenu);
    });

    // Close after selecting an item
    if (videoMenu) videoMenu.addEventListener('click', () => closeMenu(videoToggle, videoMenu));
    if (audioMenu) audioMenu.addEventListener('click', () => closeMenu(audioToggle, audioMenu));

    // Keep UI synced when settings panel changes device
    if (videoSelect) videoSelect.addEventListener('change', rebuildVideoMenu);
    if (audioInputSelect) audioInputSelect.addEventListener('change', rebuildAudioMenu);
    if (audioOutputSelect) audioOutputSelect.addEventListener('change', rebuildAudioMenu);

    // Keep arrow buttons visible only when Start buttons are visible
    syncVisibility();
    const observer = new MutationObserver(syncVisibility);
    observer.observe(videoBtn, { attributes: true, attributeFilter: ['class', 'style'] });
    observer.observe(audioBtn, { attributes: true, attributeFilter: ['class', 'style'] });

    // Re-enumerate & refresh lists on hardware changes
    if (navigator.mediaDevices) {
        let deviceChangeFrame;
        let lastChangeTime = 0;

        navigator.mediaDevices.addEventListener('devicechange', async () => {
            const now = Date.now();

            // Debounce: ignore rapid-fire changes
            if (now - lastChangeTime < 1000) return;
            lastChangeTime = now;

            if (deviceChangeFrame) cancelAnimationFrame(deviceChangeFrame);
            deviceChangeFrame = requestAnimationFrame(async () => {
                console.log('🔄 Audio devices changed - refreshing...');
                // Give OS time to finish routing (especially important on mobile)
                await new Promise((resolve) => setTimeout(resolve, isMobileDevice ? 1500 : 500));
                try {
                    await refreshMyAudioVideoDevices();
                } catch (err) {
                    console.warn('Device refresh failed:', err);
                }
                setTimeout(() => {
                    rebuildVideoMenu();
                    rebuildAudioMenu();
                }, 50);
            });
        });
    }
}

/**
 * Handle dropdown menus on hover (for non-touch devices)
 */
function handleDropdownHover() {
    // Detect if device supports hover (pointer: fine) - works on desktop, tablets with mouse, etc.
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (!supportsHover) {
        // Touch-only devices - use click behavior only (already handled elsewhere)
        return;
    }

    // Handle Chat dropdown menu hover
    if (msgerDropDownMenuBtn && msgerDropDownContent) {
        let chatTimeoutId;

        const showChatDropdown = () => {
            clearTimeout(chatTimeoutId);
            elemDisplay(msgerDropDownContent, true, 'block');
        };

        const hideChatDropdown = () => {
            chatTimeoutId = setTimeout(() => {
                elemDisplay(msgerDropDownContent, false);
            }, 200);
        };

        msgerDropDownMenuBtn.addEventListener('mouseenter', showChatDropdown);
        msgerDropDownMenuBtn.addEventListener('mouseleave', hideChatDropdown);
        msgerDropDownContent.addEventListener('mouseenter', () => clearTimeout(chatTimeoutId));
        msgerDropDownContent.addEventListener('mouseleave', hideChatDropdown);
    }

    // Handle MsgerCP dropdown menu hover
    if (msgerCPDropDownMenuBtn && msgerCPDropDownContent) {
        let msgerCPTimeoutId;

        const showMsgerCPDropdown = () => {
            clearTimeout(msgerCPTimeoutId);
            elemDisplay(msgerCPDropDownContent, true, 'block');
            elemDisplay(msgerSidebarDropDownContent, false);
        };

        const hideMsgerCPDropdown = () => {
            msgerCPTimeoutId = setTimeout(() => {
                elemDisplay(msgerCPDropDownContent, false);
            }, 200);
        };

        msgerCPDropDownMenuBtn.addEventListener('mouseenter', showMsgerCPDropdown);
        msgerCPDropDownMenuBtn.addEventListener('mouseleave', hideMsgerCPDropdown);
        msgerCPDropDownContent.addEventListener('mouseenter', () => clearTimeout(msgerCPTimeoutId));
        msgerCPDropDownContent.addEventListener('mouseleave', hideMsgerCPDropdown);
    }

    if (msgerSidebarDropDownMenuBtn && msgerSidebarDropDownContent) {
        let msgerSidebarTimeoutId;

        const showMsgerSidebarDropdown = () => {
            clearTimeout(msgerSidebarTimeoutId);
            elemDisplay(msgerSidebarDropDownContent, true, 'block');
            elemDisplay(msgerCPDropDownContent, false);
        };

        const hideMsgerSidebarDropdown = () => {
            msgerSidebarTimeoutId = setTimeout(() => {
                elemDisplay(msgerSidebarDropDownContent, false);
            }, 200);
        };

        msgerSidebarDropDownMenuBtn.addEventListener('mouseenter', showMsgerSidebarDropdown);
        msgerSidebarDropDownMenuBtn.addEventListener('mouseleave', hideMsgerSidebarDropdown);
        msgerSidebarDropDownContent.addEventListener('mouseenter', () => clearTimeout(msgerSidebarTimeoutId));
        msgerSidebarDropDownContent.addEventListener('mouseleave', hideMsgerSidebarDropdown);
    }

    // Handle Whiteboard dropdown menu hover
    if (whiteboardDropDownMenuBtn && whiteboardDropdownMenu) {
        let wbTimeoutId;

        const showWhiteboardDropdown = () => {
            clearTimeout(wbTimeoutId);
            elemDisplay(whiteboardDropdownMenu, true, 'block');
        };

        const hideWhiteboardDropdown = () => {
            wbTimeoutId = setTimeout(() => {
                elemDisplay(whiteboardDropdownMenu, false);
            }, 200);
        };

        whiteboardDropDownMenuBtn.addEventListener('mouseenter', showWhiteboardDropdown);
        whiteboardDropDownMenuBtn.addEventListener('mouseleave', hideWhiteboardDropdown);
        whiteboardDropdownMenu.addEventListener('mouseenter', () => clearTimeout(wbTimeoutId));
        whiteboardDropdownMenu.addEventListener('mouseleave', hideWhiteboardDropdown);
    }

    // Handle Caption dropdown menu hover
    if (captionDropDownMenuBtn && captionDropDownContent) {
        let captionTimeoutId;

        const showCaptionDropdown = () => {
            clearTimeout(captionTimeoutId);
            elemDisplay(captionDropDownContent, true, 'block');
        };

        const hideCaptionDropdown = () => {
            captionTimeoutId = setTimeout(() => {
                elemDisplay(captionDropDownContent, false);
            }, 200);
        };

        captionDropDownMenuBtn.addEventListener('mouseenter', showCaptionDropdown);
        captionDropDownMenuBtn.addEventListener('mouseleave', hideCaptionDropdown);
        captionDropDownContent.addEventListener('mouseenter', () => clearTimeout(captionTimeoutId));
        captionDropDownContent.addEventListener('mouseleave', hideCaptionDropdown);
    }
}

/**
 * Handle click outside of an element
 * @param {object} targetElement
 * @param {object} triggerElement
 * @param {function} callback
 * @param {number} minWidth
 */
function handleClickOutside(targetElement, triggerElement, callback, minWidth = 0) {
    document.addEventListener('click', (e) => {
        if (minWidth && window.innerWidth > minWidth) return;
        let el = e.target;
        let shouldExclude = false;
        while (el) {
            if (el instanceof HTMLElement && (el === targetElement || el === triggerElement)) {
                shouldExclude = true;
                break;
            }
            el = el.parentElement;
        }
        if (!shouldExclude) callback();
    });
}

/**
 * Set media button class based on status
 * @param {object} button - Button element
 * @param {boolean} status - Media status (on/off)
 * @param {string} mediaType - 'audio', 'video', or 'screen'
 */
function setMediaButtonClass(button, status, mediaType) {
    if (!button) return;
    const classMap = {
        audio: status ? className.audioOn : className.audioOff,
        video: status ? className.videoOn : className.videoOff,
        screen: status ? className.screenOff : className.screenOn,
    };
    button.className = classMap[mediaType] || button.className;
}

/**
 * Set multiple media button classes at once
 * @param {Array} buttons - Array of {element, status, mediaType}
 */
function setMediaButtonsClass(buttons) {
    buttons.forEach(({ element, status, mediaType }) => {
        setMediaButtonClass(element, status, mediaType);
    });
}

/**
 * Display multiple elements at once
 * @param {Array} elements - Array of {element, display, mode}
 */
function displayElements(elements) {
    elements.forEach(({ element, display, mode = 'inline' }) => {
        if (element) elemDisplay(element, display, mode);
    });
}

/**
 * Sleep in ms
 * @param {integer} ms milleseconds
 * @returns Promise
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// renderRoomTemplate is defined in roomTemplate.js
