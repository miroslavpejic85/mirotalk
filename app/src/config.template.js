'use strict';

const packageJson = require('../../package.json');

module.exports = {
    // Branding and customizations require a license: https://codecanyon.net/item/mirotalk-p2p-webrtc-realtime-video-conferences/38376661
    brand: {
        app: {
            language: 'en', // https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes
            name: 'MiroTalk',
            title: '<h1>MiroTalk</h1>Free browser based Real-time video calls.<br />Simple, Secure, Fast.',
            description:
                'Start your next video call with a single click. No download, plug-in, or login is required. Just get straight to talking, messaging, and sharing your screen.',
            joinDescription: 'Pick a room name.<br />How about this one?',
            joinButtonLabel: 'JOIN ROOM',
            joinLastLabel: 'Your recent room:',
        },
        og: {
            type: 'app-webrtc',
            siteName: 'MiroTalk',
            title: 'Click the link to make a call.',
            description:
                'MiroTalk calling provides real-time HD quality and latency simply not available with traditional technology.',
            image: 'https://p2p.mirotalk.com/images/preview.png',
            url: 'https://p2p.mirotalk.com',
        },
        site: {
            shortcutIcon: '../images/logo.svg',
            appleTouchIcon: '../images/logo.svg',
            landingTitle: 'MiroTalk a Free Secure Video Calls, Chat & Screen Sharing.',
            newCallTitle: 'MiroTalk a Free Secure Video Calls, Chat & Screen Sharing.',
            newCallRoomTitle: 'Pick name. <br />Share URL. <br />Start conference.',
            newCallRoomDescription:
                "Each room has its disposable URL. Just pick a room name and share your custom URL. It's that easy.",
            loginTitle: 'MiroTalk - Host Protected login required.',
            clientTitle: 'MiroTalk WebRTC Video call, Chat Room & Screen Sharing.',
            privacyPolicyTitle: 'MiroTalk - privacy and policy.',
            stunTurnTitle: 'Test Stun/Turn Servers.',
            notFoundTitle: 'MiroTalk - 404 Page not found.',
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
        about: {
            imageUrl: '../images/mirotalk-logo.gif',
            title: `WebRTC P2P v${packageJson.version}`,
            html: `
                <button 
                    id="support-button" 
                    data-umami-event="Support button" 
                    onclick="window.open('https://codecanyon.net/user/miroslavpejic85')">
                    <i class="fas fa-heart" ></i>&nbsp;Support
                </button>
                <br /><br /><br />
                Author:<a 
                    id="linkedin-button" 
                    data-umami-event="Linkedin button" 
                    href="https://www.linkedin.com/in/miroslav-pejic-976a07101/" target="_blank"> 
                    Miroslav Pejic
                </a>
                <br />
                Email:<a 
                    id="email-button" 
                    data-umami-event="Email button" 
                    href="mailto:miroslav.pejic.85@gmail.com?subject=MiroTalk P2P info"> 
                    miroslav.pejic.85@gmail.com
                </a>
                <br /><br />
                <hr />
                <span>&copy; 2025 MiroTalk P2P, all rights reserved</span>
                <hr />
            `,
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
    },
};
