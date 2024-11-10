'use strict';

/**
 * Configuration for controlling the visibility of buttons in the MiroTalk P2P client.
 * Set properties to true to show the corresponding buttons, or false to hide them.
 * captionBtn, showSwapCameraBtn, showScreenShareBtn, showFullScreenBtn, showVideoPipBtn, showDocumentPipBtn -> (auto-detected).
 */
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
        showRoomEmojiPickerBtn: true,
        showMyHandBtn: true,
        showWhiteboardBtn: true,
        showSnapshotRoomBtn: true,
        showFileShareBtn: true,
        showDocumentPipBtn: showDocumentPipBtn,
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
        showZoomInOutBtn: false,
        showVideoFocusBtn: true,
        showVideoPipBtn: showVideoPipBtn,
    },
    local: {
        showSnapShotBtn: true,
        showVideoCircleBtn: true,
        showZoomInOutBtn: false,
        showVideoPipBtn: showVideoPipBtn,
    },
    whiteboard: {
        whiteboardLockBtn: false,
    },
};
