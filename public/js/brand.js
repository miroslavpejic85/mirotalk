'use strict';

// Brand
const brandDataKey = 'brandDataP2P';
const brandData = window.sessionStorage.getItem(brandDataKey);

// Html pages
const landingTitle = document.getElementById('landingTitle');
const newCallTitle = document.getElementById('newCallTitle');
const loginTitle = document.getElementById('loginTitle');
const privacyPolicyTitle = document.getElementById('privacyPolicyTitle');
const stunTurnTitle = document.getElementById('stunTurnTitle');
const clientTitle = document.getElementById('clientTitle');
const notFoundTitle = document.getElementById('stunTurnTitle');

const shortcutIcon = document.getElementById('shortcutIcon');
const appleTouchIcon = document.getElementById('appleTouchIcon');

const appTitle = document.getElementById('appTitle');
const appDescription = document.getElementById('appDescription');

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
};

/**
 * Get started
 */
async function initBrand() {
    await getBrand();

    handleBrand();
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
    if (landingTitle) landingTitle.textContent = brand.site.landingTitle;
    if (newCallTitle) newCallTitle.textContent = brand.site.newCallTitle;
    if (loginTitle) loginTitle.textContent = brand.site.loginTitle;
    if (privacyPolicyTitle) privacyPolicyTitle.textContent = brand.site.privacyPolicyTitle;
    if (stunTurnTitle) stunTurnTitle.textContent = brand.site.stunTurnTitle;
    if (clientTitle) clientTitle.textContent = brand.site.clientTitle;
    if (notFoundTitle) notFoundTitle.textContent = brand.site.notFoundTitle;

    if (shortcutIcon) shortcutIcon.href = brand.site.shortcutIcon;
    if (appleTouchIcon) appleTouchIcon.href = brand.site.appleTouchIcon;

    if (appTitle) appTitle.innerHTML = brand.app.title;
    if (appDescription) appDescription.textContent = brand.app.description;

    !brand.html.features && elementDisplay(features, false);
    !brand.html.browsers && elementDisplay(browsers, false);
    !brand.html.teams && elementDisplay(teams, false);
    !brand.html.tryEasier && elementDisplay(tryEasier, false);
    !brand.html.poweredBy && elementDisplay(poweredBy, false);
    !brand.html.sponsors && elementDisplay(sponsors, false);
    !brand.html.advertisers && elementDisplay(advertisers, false);
    !brand.html.footer && elementDisplay(footer, false);
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
