'use strict';

// Html pages
const poweredBy = document.getElementById('poweredBy');
const sponsors = document.getElementById('sponsors');
const advertisers = document.getElementById('advertisers');
const footer = document.getElementById('footer');
//...

// Common config...
const config = {
    html: {
        poweredBy: true,
        sponsors: true,
        advertisers: true,
        footer: true,
    },
    //...
};

// Handle config...
!config.html.poweredBy && elementDisplay(poweredBy, false);
!config.html.sponsors && elementDisplay(sponsors, false);
!config.html.advertisers && elementDisplay(advertisers, false);
!config.html.footer && elementDisplay(footer, false);
//...

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
