'use strict';

// Brand
const brandDataKey = 'brandDataP2P';
const brandData = window.sessionStorage.getItem(brandDataKey);

// Html pages
const landingTitle = document.getElementById('landingTitle');
const newCallTitle = document.getElementById('newCallTitle');
const newCallRoomTitle = document.getElementById('newCallRoomTitle');
const newCallRoomDescription = document.getElementById('newCallRoomDescription');
const loginTitle = document.getElementById('loginTitle');
const privacyPolicyTitle = document.getElementById('privacyPolicyTitle');
const stunTurnTitle = document.getElementById('stunTurnTitle');
const clientTitle = document.getElementById('clientTitle');
const notFoundTitle = document.getElementById('stunTurnTitle');

const shortcutIcon = document.getElementById('shortcutIcon');
const appleTouchIcon = document.getElementById('appleTouchIcon');

const appTitle = document.getElementById('appTitle');
const appDescription = document.getElementById('appDescription');
const appJoinDescription = document.getElementById('appJoinDescription');
const joinRoomBtn = document.getElementById('joinRoomButton');
const appJoinLastRoom = document.getElementById('appJoinLastRoom');

const topSponsors = document.getElementById('topSponsors');
const features = document.getElementById('features');
const browsers = document.getElementById('browsers');
const teams = document.getElementById('teams');
const tryEasier = document.getElementById('tryEasier');
const poweredBy = document.getElementById('poweredBy');
const sponsors = document.getElementById('sponsors');
const advertisers = document.getElementById('advertisers');
const footer = document.getElementById('footer');
//...

// Brand customizations...

let brand = {
    app: {
        language: 'en',
        name: 'MiroTalk',
        title: 'MiroTalk<br />Free browser based Real-time video calls.<br />Simple, Secure, Fast.',
        description:
            'Start your next video call with a single click. No download, plug-in, or login is required. Just get straight to talking, messaging, and sharing your screen.',
        joinDescription: 'Pick a room name.<br />How about this one?',
        joinButtonLabel: 'JOIN ROOM',
        joinLastLabel: 'Your recent room:',
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
        topSponsors: true,
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
        title: 'WebRTC P2P v1.6.26',
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
            <br /><br />
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
    widget: {
        enabled: false,
        roomId: 'support-room',
        theme: 'dark',
        widgetState: 'minimized',
        widgetType: 'support',
        supportWidget: {
            position: 'top-right',
            expertImages: [
                'https://photo.cloudron.pocketsolution.net/uploads/original/95/7d/a5f7f7a2c89a5fee7affda5f013c.jpeg',
            ],
            buttons: {
                audio: true,
                video: true,
                screen: true,
                chat: true,
                join: true,
            },
            checkOnlineStatus: false,
            isOnline: true,
            customMessages: {
                heading: 'Need Help?',
                subheading: 'Get instant support from our expert team!',
                connectText: 'connect in < 5 seconds',
                onlineText: 'We are online',
                offlineText: 'We are offline',
                poweredBy: 'Powered by MiroTalk',
            },
        },
    },
    //...
};

/**
 * Get started
 */
async function initBrand() {
    await getBrand();

    handleBrand();

    handleWidget();
}

/**
 * Get brand from server
 */
async function getBrand() {
    if (brandData) {
        setBrand(JSON.parse(brandData));
    } else {
        try {
            const response = await fetch('/brand', { timeout: 5000 });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            const serverBrand = data.message;
            if (serverBrand) {
                setBrand(serverBrand);
                console.log('FETCH BRAND SETTINGS', {
                    serverBrand: serverBrand,
                    clientBrand: brand,
                });
                window.sessionStorage.setItem(brandDataKey, JSON.stringify(serverBrand));
            } else {
                console.warn('FETCH BRAND SETTINGS - DISABLED');
            }
        } catch (error) {
            console.error('FETCH GET BRAND ERROR', error.message);
        }
    }
}

/**
 * Set brand
 * @param {object} data
 */
function setBrand(data) {
    brand = data;
    console.log('Set Brand done');
}

/**
 * Handle Brand
 */
function handleBrand() {
    if (landingTitle && brand.site?.landingTitle) landingTitle.textContent = brand.site.landingTitle;

    if (newCallTitle && brand.site?.newCallTitle) newCallTitle.textContent = brand.site.newCallTitle;
    if (newCallRoomTitle && brand.site?.newCallRoomTitle) newCallRoomTitle.innerHTML = brand.site.newCallRoomTitle;
    if (newCallRoomDescription && brand.site?.newCallRoomDescription)
        newCallRoomDescription.textContent = brand.site.newCallRoomDescription;

    if (loginTitle && brand.site?.loginTitle) loginTitle.textContent = brand.site.loginTitle;
    if (privacyPolicyTitle && brand.site?.privacyPolicyTitle)
        privacyPolicyTitle.textContent = brand.site.privacyPolicyTitle;
    if (stunTurnTitle && brand.site?.stunTurnTitle) stunTurnTitle.textContent = brand.site.stunTurnTitle;
    if (clientTitle && brand.site?.clientTitle) clientTitle.textContent = brand.site.clientTitle;
    if (notFoundTitle && brand.site?.notFoundTitle) notFoundTitle.textContent = brand.site.notFoundTitle;

    if (shortcutIcon && brand.site?.shortcutIcon) shortcutIcon.href = brand.site.shortcutIcon;
    if (appleTouchIcon && brand.site?.appleTouchIcon) appleTouchIcon.href = brand.site.appleTouchIcon;

    if (appTitle && brand.app?.title) appTitle.innerHTML = brand.app.title;
    if (appDescription && brand.app?.description) appDescription.textContent = brand.app.description;
    if (appJoinDescription && brand.app?.joinDescription) appJoinDescription.innerHTML = brand.app.joinDescription;
    if (joinRoomBtn && brand.app?.joinButtonLabel) joinRoomBtn.innerText = brand.app.joinButtonLabel;
    if (appJoinLastRoom && brand.app?.joinLastLabel) appJoinLastRoom.innerText = brand.app.joinLastLabel;

    // helper to toggle multiple elements
    const displayElements = (list) => list.forEach(([el, show]) => elementDisplay(el, !!show));

    displayElements([
        [topSponsors, brand.html?.topSponsors],
        [features, brand.html?.features],
        [browsers, brand.html?.browsers],
        [teams, brand.html?.teams],
        [tryEasier, brand.html?.tryEasier],
        [poweredBy, brand.html?.poweredBy],
        [sponsors, brand.html?.sponsors],
        [advertisers, brand.html?.advertisers],
        [footer, brand.html?.footer],
    ]);
}

// WIDGET customize
function handleWidget() {
    if (brand.widget?.enabled) {
        const domain = window.location.host;
        const roomId = brand.widget?.roomId || 'support-room';
        const userName = 'guest-' + Math.floor(Math.random() * 10000);
        if (typeof MiroTalkWidget !== 'undefined') {
            new MiroTalkWidget(domain, roomId, userName, brand.widget);
        } else {
            console.warn('MiroTalkWidget is not defined. Please check widget.js loading.', {
                domain,
                roomId,
                userName,
                widget: brand.widget,
            });
        }
    }
}

/**
 * Handle Element display
 * @param {object} element
 * @param {boolean} display
 * @param {string} mode
 */
function elementDisplay(element, display, mode = 'block') {
    if (!element) return;
    element.style.display = display ? mode : 'none';
}

initBrand();
