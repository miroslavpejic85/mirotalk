'use strict';

/**
 * Configuration for controlling the visibility of buttons in the MiroTalk P2P client.
 * Set properties to true to show the corresponding buttons, or false to hide them.
 * captionBtn, showSwapCameraBtn, showScreenShareBtn, showFullScreenBtn, showVideoPipBtn, showDocumentPipBtn -> (auto-detected).
 */
let buttons = {
    main: {
        showShareQr: true,
        showShareRoomBtn: true, // For guests
        showHideMeBtn: true,
        showAudioBtn: true,
        showVideoBtn: true,
        showScreenBtn: true, // autodetected
        showRecordStreamBtn: true,
        showChatRoomBtn: true,
        showCaptionRoomBtn: true,
        showRoomEmojiPickerBtn: true,
        showMyHandBtn: true,
        showWhiteboardBtn: true,
        showSnapshotRoomBtn: true,
        showFileShareBtn: true,
        showDocumentPipBtn: true,
        showMySettingsBtn: true,
        showAboutBtn: true, // Please keep me always true, Thank you!
    },
    chat: {
        showTogglePinBtn: true,
        showMaxBtn: true,
        showSaveMessageBtn: true,
        showMarkDownBtn: true,
        showChatGPTBtn: true,
        showFileShareBtn: true,
        showShareVideoAudioBtn: true,
        showParticipantsBtn: true,
    },
    caption: {
        showTogglePinBtn: true,
        showMaxBtn: true,
    },
    settings: {
        showMicOptionsBtn: true,
        showTabRoomPeerName: true,
        showTabRoomParticipants: true,
        showTabRoomSecurity: true,
        showTabEmailInvitation: true,
        showCaptionEveryoneBtn: true,
        showMuteEveryoneBtn: true,
        showHideEveryoneBtn: true,
        showEjectEveryoneBtn: true,
        showLockRoomBtn: true,
        showUnlockRoomBtn: true,
        showShortcutsBtn: true,
    },
    remote: {
        showAudioVolume: true,
        audioBtnClickAllowed: true,
        videoBtnClickAllowed: true,
        showVideoPipBtn: true,
        showKickOutBtn: true,
        showSnapShotBtn: true,
        showFileShareBtn: true,
        showShareVideoAudioBtn: true,
        showGeoLocationBtn: true,
        showPrivateMessageBtn: true,
        showZoomInOutBtn: false,
        showVideoFocusBtn: true,
    },
    local: {
        showVideoPipBtn: true,
        showSnapShotBtn: true,
        showVideoCircleBtn: true,
        showZoomInOutBtn: false,
    },
    whiteboard: {
        whiteboardLockBtn: false,
    },
};
