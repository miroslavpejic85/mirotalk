'use strict';

module.exports = {
    // Branding and customizations require a license: https://codecanyon.net/item/mirotalk-p2p-webrtc-realtime-video-conferences/38376661
    brand: {
        app: {
            name: 'MiroTalk',
            title: 'MiroTalk<br />Free browser based Real-time video calls.<br />Simple, Secure, Fast.',
            description:
                'Start your next video call with a single click. No download, plug-in, or login is required. Just get straight to talking, messaging, and sharing your screen.',
        },
        site: {
            landingTitle: 'MiroTalk a Free Secure Video Calls, Chat & Screen Sharing.',
            newCallTitle: 'MiroTalk a Free Secure Video Calls, Chat & Screen Sharing.',
            loginTitle: 'MiroTalk - Host Protected login required.',
            clientTitle: 'MiroTalk WebRTC Video call, Chat Room & Screen Sharing.',
            privacyPolicyTitle: 'MiroTalk - privacy and policy.',
            stunTurnTitle: 'Test Stun/Turn Servers.',
            notFoundTitle: 'MiroTalk - 404 Page not found.',
            shortcutIcon: '../images/logo.svg',
            appleTouchIcon: '../images/logo.svg',
        },
        html: {
            features: true,
            browsers: true,
            teams: true, // please keep me always true ;)
            tryEasier: true,
            poweredBy: true,
            sponsors: true,
            advertisers: true,
            footer: true,
        },
        //...
    },
    /**
     * Configuration for controlling the visibility of buttons in the MiroTalk P2P client.
     * Set properties to true to show the corresponding buttons, or false to hide them.
     * captionBtn, showSwapCameraBtn, showScreenShareBtn, showFullScreenBtn, showVideoPipBtn, showDocumentPipBtn -> (auto-detected).
     */
    buttons: {
        main: {
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
        },
        local: {
            showSnapShotBtn: true,
            showVideoCircleBtn: true,
            showZoomInOutBtn: false,
        },
        whiteboard: {
            whiteboardLockBtn: false,
        },
    },
};
