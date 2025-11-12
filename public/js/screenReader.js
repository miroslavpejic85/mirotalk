'use strict';

class ScreenReaderAccessibility {
    constructor() {
        this.liveRegion = null;
        this.initialized = false;
    }

    /**
     * Initialize screen reader accessibility
     */
    init() {
        if (this.initialized) return;

        // Create ARIA live region for announcements
        this.createLiveRegion();

        this.initialized = true;
    }

    /**
     * Create ARIA live region for screen reader announcements
     */
    createLiveRegion() {
        if (!this.liveRegion) {
            this.liveRegion = document.createElement('div');
            this.liveRegion.setAttribute('role', 'status');
            this.liveRegion.setAttribute('aria-live', 'polite');
            this.liveRegion.setAttribute('aria-atomic', 'true');
            this.liveRegion.style.position = 'absolute';
            this.liveRegion.style.left = '-10000px';
            this.liveRegion.style.width = '1px';
            this.liveRegion.style.height = '1px';
            this.liveRegion.style.overflow = 'hidden';
            document.body.appendChild(this.liveRegion);
        }
    }

    /**
     * Announce a message to screen readers
     * @param {string} message Message to announce
     */
    announce(message) {
        if (!this.liveRegion) return;
        this.liveRegion.textContent = '';
        setTimeout(() => {
            this.liveRegion.textContent = message;
        }, 100);
    }

    /**
     * Announce a generic message
     * @param {string} message Message to announce
     * @param {string} priority 'polite' or 'assertive'
     * polite: Default priority for non-urgent messages.
     * assertive: Higher priority for urgent messages that require immediate attention.
     */
    announceMessage(message, priority = 'polite') {
        this.liveRegion.setAttribute('aria-live', priority);
        this.announce(message);
    }
}

// Create global instance
const screenReaderAccessibility = new ScreenReaderAccessibility();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        screenReaderAccessibility.init();
    });
} else {
    screenReaderAccessibility.init();
}
