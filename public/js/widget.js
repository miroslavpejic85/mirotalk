'use strict';

/**
 * MiroTalk Widget Factory - Main class for creating and managing widgets
 */
class MiroTalkWidget {
    static DEFAULT_OPTIONS = {
        autoJoin: true,
        theme: 'dark',
        widgetState: 'normal', // 'normal', 'minimized', 'closed'
        widgetType: 'support', // 'support', 'meeting', 'chat' (future)
        supportWidget: {
            draggable: false,
            position: 'bottom-right',
            expertImages: [
                'https://i.pravatar.cc/40?img=1',
                'https://i.pravatar.cc/40?img=2',
                'https://i.pravatar.cc/40?img=3',
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
                heading: 'Need a hand?',
                subheading:
                    'Hop on a <span style="font-weight: bold">Free 1:1 or Group Consultation</span> with a MiroTalk Expert right now!',
                connectText: 'connect in < 10 seconds',
                onlineText: 'We are online',
                offlineText: 'We are offline',
                poweredBy: 'Powered by <span class="mirotalk-powered-by">MiroTalk</span>',
            },
        },
    };

    constructor(domain, roomId, userName, options = {}) {
        this.validateRequiredParams(domain, roomId, userName);

        this.protocol = 'https';
        this.domain = domain;
        this.roomId = roomId;
        this.userName = userName;
        this.options = this.mergeDeep(MiroTalkWidget.DEFAULT_OPTIONS, options);

        // Initialize widget state and status
        this.widgetState = this.options.widgetState;
        this.isOnline = this.options.supportWidget.isOnline;
        this.isInitialized = true;

        // Initialize widget registry
        this.initWidgetRegistry();

        if (this.options.autoJoin) {
            this.init();
        }
    }

    // ============================================================================
    // INITIALIZATION METHODS
    // ============================================================================

    validateRequiredParams(domain, roomId, userName) {
        if (!domain) throw new Error('Domain is required');
        if (!roomId) throw new Error('Room ID is required');
        if (!userName) throw new Error('User name is required');
    }

    initWidgetRegistry() {
        if (!window.miroTalkWidgets) {
            window.miroTalkWidgets = new Map();
        }
    }

    mergeDeep(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeDeep(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createWidget());
        } else {
            this.createWidget();
        }
    }

    async createWidget() {
        try {
            await this.loadWidgetAssets();

            const widget = this.createWidgetHTML();
            const parentNode = this.getParentNode() || document.body;

            if (parentNode !== document.body) {
                this.clearParentNode(parentNode);
            }

            parentNode.appendChild(widget);

            // Start status checking if enabled
            this.initStatusChecking();

            // Make widget draggable if enabled
            if (this.options.supportWidget.draggable) {
                this.makeDraggable(widget);
            }

            // Automatically minimize on creation
            if (this.options.widgetState === 'minimized' && this.isInitialized) {
                window.miroTalkWidgetAction('minimize', widget);
            }

            // Automatically close on creation
            if (this.options.widgetState === 'closed' && this.isInitialized) {
                window.miroTalkWidgetAction('close', widget);
            }

            this.isInitialized = false; // Prevent re-initialization

            console.log(`${this.options.widgetType} widget created successfully`);
        } catch (error) {
            console.error('Failed to create widget:', error);
        }
    }

    initStatusChecking() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
        if (this.options.supportWidget.checkOnlineStatus) {
            this.checkOnlineStatus();
            this.statusCheckInterval = setInterval(() => this.checkOnlineStatus(), 30000); // Check every 30s
        }
    }

    // ============================================================================
    // WIDGET DRAGGABLE
    // ============================================================================

    makeDraggable(element) {
        let isDragging = false;
        let startX = 0,
            startY = 0,
            startLeft = 0,
            startTop = 0;
        let rafId = null;
        let pendingLeft = null,
            pendingTop = null;
        const dragHandle = element.querySelector('.online-indicator') || element;
        dragHandle.style.cursor = 'move';

        element.style.position = 'fixed';
        element.style.left = element.offsetLeft + 'px';
        element.style.top = element.offsetTop + 'px';
        element.style.transform = 'translate(0,0)';

        dragHandle.addEventListener('pointerdown', onPointerDown);

        function onPointerDown(e) {
            if (e.button !== 0) return;
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = element.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            element.setPointerCapture(e.pointerId);
            element.style.zIndex = 9999;
            element.style.willChange = 'left, top';
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            scheduleMove(startLeft + dx, startTop + dy);
        }

        function onPointerUp(e) {
            if (!isDragging) return;
            isDragging = false;
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            element.style.willChange = '';
            try {
                element.releasePointerCapture(e.pointerId);
            } catch (err) {}
        }

        function scheduleMove(left, top) {
            // Prevent dragging out of viewport
            const minLeft = 0;
            const minTop = 0;
            const maxLeft = window.innerWidth - element.offsetWidth;
            const maxTop = window.innerHeight - element.offsetHeight;
            left = Math.max(minLeft, Math.min(left, maxLeft));
            top = Math.max(minTop, Math.min(top, maxTop));
            pendingLeft = left;
            pendingTop = top;
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                element.style.left = pendingLeft + 'px';
                element.style.top = pendingTop + 'px';
                element.style.transform = 'translate(0,0)';
                rafId = null;
            });
        }
    }

    // ============================================================================
    // WIDGET CREATION METHODS
    // ============================================================================

    async loadWidgetAssets() {
        const assetLoaders = {
            support: () => this.loadSupportWidgetAssets(),
            // Future widget types can be added here
            // 'meeting': () => this.loadMeetingWidgetAssets(),
            // 'chat': () => this.loadChatWidgetAssets(),
        };

        const loader = assetLoaders[this.options.widgetType];
        if (loader) {
            await loader();
        } else {
            throw new Error(`Unknown widget type: ${this.options.widgetType}`);
        }
    }

    async loadSupportWidgetAssets() {
        await this.injectExternalCSS(
            `${this.protocol}://${this.domain}/css/widgets/support.css`,
            'mirotalk-support-css'
        );
    }

    createWidgetHTML() {
        const widgetCreators = {
            support: () => this.createSupportWidgetHTML(),
            // Future widget types can be added here
            // 'meeting': () => this.createMeetingWidgetHTML(),
            // 'chat': () => this.createChatWidgetHTML(),
        };

        const creator = widgetCreators[this.options.widgetType];
        if (creator) {
            return creator();
        } else {
            throw new Error(`Unknown widget type: ${this.options.widgetType}`);
        }
    }

    createSupportWidgetHTML() {
        const { supportWidget, theme } = this.options;
        const { customMessages, expertImages, position } = supportWidget;

        const widget = document.createElement('div');
        widget.className = `mirotalk-support-widget ${position} ${theme === 'light' ? 'light-theme' : ''}`;
        widget.innerHTML = this.getSupportWidgetTemplate({ customMessages, expertImages });

        const widgetId = this.generateWidgetId('widget');
        this.registerWidget(widgetId, widget);

        return widget;
    }

    getSupportWidgetTemplate({ customMessages, expertImages }) {
        return `
            <div class="online-indicator">
                <div class="status-dot ${this.isOnline ? 'online' : 'offline'}"></div>
                <div class="online-text" style="display: ${this.isOnline ? 'inline' : 'none'}">${customMessages.onlineText}</div>
                <div class="offline-text" style="display: ${this.isOnline ? 'none' : 'inline'}">${customMessages.offlineText}</div>
                <div class="widget-controls">
                    <button class="minimize-btn" onclick="miroTalkWidgetAction('minimize', this)" title="Minimize">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13H5v-2h14v2z"/>
                        </svg>
                    </button>
                    <div class="close-btn" onclick="miroTalkWidgetAction('close', this)" title="Close">&times;</div>
                </div>
            </div>
            <h2 class="main-heading">${customMessages.heading}</h2>
            <p class="subheading">${customMessages.subheading}</p>
            <div class="expert-images">
                ${expertImages
                    .map(
                        (img, i) => `
                    <img src="${img}" class="expert-img" alt="Expert consultant ${i + 1}" loading="lazy" />
                `
                    )
                    .join('')}
            </div>
            <div class="connect-text">${customMessages.connectText}</div>
            ${this.createActionButtons()}
            <div class="footer-text">${customMessages.poweredBy}</div>
        `;
    }

    createActionButtons() {
        const flags = this.options.supportWidget.buttons || {};
        const buttons = [];

        if (flags.audio) {
            buttons.push({ action: 'startAudioCall', icon: this.getAudioIcon(), text: 'Start Audio Call' });
        }
        if (flags.video) {
            buttons.push({ action: 'startVideoCall', icon: this.getVideoIcon(), text: 'Start Video Call' });
        }
        if (flags.screen && navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
            buttons.push({ action: 'startScreenShare', icon: this.getScreenIcon(), text: 'Start Screen Share' });
        }
        if (flags.chat) {
            buttons.push({ action: 'startChat', icon: this.getChatIcon(), text: 'Start Chat' });
        }
        if (flags.join) {
            buttons.push({ action: 'joinRoom', icon: this.getJoinIcon(), text: 'Join Room' });
        }

        if (!buttons.length) {
            return `<div class="no-actions">No actions available</div>`;
        }

        return buttons
            .map(
                (btn) => `
            <button class="btn" onclick="miroTalkWidgetAction('${btn.action}', this)">
                <div class="btn-icon">${btn.icon}</div>
                <span class="btn-text">${btn.text}</span>
            </button>`
            )
            .join('');
    }

    // ============================================================================
    // STATE MANAGEMENT METHODS
    // ============================================================================

    minimizeWidget() {
        const widget = document.querySelector('.mirotalk-support-widget');
        if (!widget) {
            console.warn('Widget not found for minimizing');
            return;
        }

        widget.classList.add('minimized');
        this.widgetState = 'minimized';
        this.createMinimizedButton();
        console.log('Widget minimized');
    }

    restoreWidget() {
        const widget = document.querySelector('.mirotalk-support-widget');
        const minimizedBtn = document.querySelector('.mirotalk-minimized-btn');

        if (widget) {
            widget.classList.remove('minimized');
            this.widgetState = 'normal';
        }
        if (minimizedBtn) {
            minimizedBtn.remove();
        }
        console.log('Widget restored');
    }

    closeWidget() {
        this.removeAllWidgetElements();
        this.widgetState = 'closed';
        this.createReopenerButton();
        console.log('Widget closed');
    }

    reopenWidget() {
        const reopenerBtn = document.querySelector('.mirotalk-reopener-btn');
        if (reopenerBtn) reopenerBtn.remove();
        this.createWidget();
        console.log('Widget reopened');
    }

    // ============================================================================
    // BUTTON CREATION METHODS
    // ============================================================================

    createMinimizedButton() {
        this.removeExistingElement('.mirotalk-minimized-btn');

        if (!this.options.supportWidget?.position) {
            console.error('Support widget position not defined');
            return;
        }

        const minimizedBtn = this.createElement('div', {
            className: this.buildClassNames([
                'mirotalk-minimized-btn',
                this.options.supportWidget.position,
                this.options.theme === 'light' ? 'light-theme' : '',
            ]),
        });

        const widgetId = this.generateWidgetId('minimized');
        this.registerWidget(widgetId, minimizedBtn);

        const content = this.createMinimizedContent();
        minimizedBtn.appendChild(content);
        minimizedBtn.addEventListener('click', () => this.restoreWidget());

        document.body.appendChild(minimizedBtn);
        console.log('Minimized button created');
    }

    createMinimizedContent() {
        const contentDiv = this.createElement('div', { className: 'minimized-content' });
        const statusDot = this.createElement('div', {
            className: `status-dot ${this.isOnline ? 'online' : 'offline'}`,
        });
        const textSpan = this.createElement('span', { textContent: 'Support' });

        contentDiv.appendChild(statusDot);
        contentDiv.appendChild(textSpan);
        return contentDiv;
    }

    createReopenerButton() {
        this.removeExistingElement('.mirotalk-reopener-btn');

        if (!this.options.supportWidget?.position) {
            console.error('Support widget position not defined');
            return;
        }

        const reopenerBtn = this.createElement('div', {
            className: this.buildClassNames([
                'mirotalk-reopener-btn',
                this.options.supportWidget.position,
                this.options.theme === 'light' ? 'light-theme' : 'dark-theme',
            ]),
        });

        const widgetId = this.generateWidgetId('reopener');
        this.registerWidget(widgetId, reopenerBtn);

        reopenerBtn.innerHTML = `
            <div class="reopener-content">
                ${this.getUserIcon()}
                <span>Support</span>
            </div>
        `;

        reopenerBtn.addEventListener('click', () => this.reopenWidget());
        document.body.appendChild(reopenerBtn);
        console.log('Reopener button created');
    }

    // ============================================================================
    // STATUS MANAGEMENT METHODS
    // ============================================================================

    async checkOnlineStatus() {
        try {
            const response = await fetch(`${this.protocol}://${this.domain}/isWidgetRoomActive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: this.roomId }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const online = data.message;
            this.updateOnlineStatus(online);
        } catch (error) {
            console.warn('Failed to check room status:', error.message);
            this.updateOnlineStatus(false);
        }
    }

    updateOnlineStatus(online) {
        this.isOnline = online;

        const elementsToUpdate = ['.mirotalk-support-widget', '.mirotalk-minimized-btn'];

        elementsToUpdate.forEach((selector) => {
            const element = document.querySelector(selector);
            if (element) {
                this.updateStatusInElement(element, online);
            }
        });

        console.log('Online status updated:', online);
    }

    updateStatusInElement(element, online) {
        const statusDot = element.querySelector('.status-dot');
        const onlineText = element.querySelector('.online-text');
        const offlineText = element.querySelector('.offline-text');

        if (statusDot) {
            statusDot.classList.toggle('online', online);
            statusDot.classList.toggle('offline', !online);
        }

        if (onlineText && offlineText) {
            onlineText.style.display = online ? 'inline' : 'none';
            offlineText.style.display = online ? 'none' : 'inline';
        }
    }

    // ============================================================================
    // ACTION METHODS
    // ============================================================================

    startAudioCall() {
        if (this.isOnline) {
            console.log('Starting audio call...');
            this.openMeetingWindow({ audio: 1, video: 0, screen: 0, chat: 0 });
        } else {
            this.supportOffline();
        }
    }

    startVideoCall() {
        if (this.isOnline) {
            console.log('Starting video call...');
            this.openMeetingWindow({ audio: 0, video: 1, screen: 0, chat: 0 });
        } else {
            this.supportOffline();
        }
    }

    startChat() {
        if (this.isOnline) {
            console.log('Starting chat...');
            this.openMeetingWindow({ audio: 0, video: 0, screen: 0, chat: 1 });
        } else {
            this.supportOffline();
        }
    }

    startScreenShare() {
        if (this.isOnline) {
            console.log('Starting screen share...');
            this.openMeetingWindow({ audio: 0, video: 0, screen: 1, chat: 0 });
        } else {
            this.supportOffline();
        }
    }

    joinRoom() {
        if (this.isOnline) {
            console.log('Joining room...');
            window.open(`${this.protocol}://${this.domain}/join?room=${this.roomId}`, '_blank');
        } else {
            this.supportOffline();
        }
    }

    openMiroTalk() {
        window.open(`https://${this.domain}`, '_blank');
    }

    openMeetingWindow(params) {
        const queryParams = new URLSearchParams({
            room: this.roomId,
            name: this.userName,
            ...params,
        });
        window.open(`${this.protocol}://${this.domain}/join?${queryParams}`, '_blank');
    }

    supportOffline() {
        alert('Sorry, support is currently offline.');
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    async injectExternalCSS(url, id) {
        if (document.getElementById(id)) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = () => {
                console.log(`CSS loaded successfully: ${url}`);
                resolve();
            };
            link.onerror = () => {
                console.error(`Failed to load CSS: ${url}`);
                reject(new Error(`Failed to load CSS: ${url}`));
            };
            document.head.appendChild(link);
        });
    }

    createElement(tag, properties = {}) {
        const element = document.createElement(tag);
        Object.assign(element, properties);
        return element;
    }

    generateWidgetId(prefix = 'widget') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    registerWidget(widgetId, element) {
        window.miroTalkWidgets.set(widgetId, this);
        element.setAttribute('data-widget-id', widgetId);
    }

    buildClassNames(classes) {
        return classes.filter(Boolean).join(' ');
    }

    removeExistingElement(selector) {
        const existingElement = document.querySelector(selector);
        if (existingElement) existingElement.remove();
    }

    removeAllWidgetElements() {
        const selectors = ['.mirotalk-support-widget', '.mirotalk-minimized-btn', '.mirotalk-reopener-btn'];
        selectors.forEach((selector) => {
            document.querySelectorAll(selector).forEach((element) => element.remove());
        });
    }

    getParentNode() {
        return document.querySelector('#mirotalk-widget') || document.body;
    }

    clearParentNode(parentNode) {
        parentNode.innerHTML = '';
    }

    getWidgetFromElement(element) {
        const widget = element.closest('.mirotalk-support-widget, .mirotalk-minimized-btn, .mirotalk-reopener-btn');
        if (widget) {
            const widgetId = widget.getAttribute('data-widget-id');
            return window.miroTalkWidgets ? window.miroTalkWidgets.get(widgetId) : this;
        }
        return this;
    }

    // ============================================================================
    // ICON METHODS
    // ============================================================================

    getAudioIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="white" width="16" height="16" viewBox="0 0 24 24">
            <path d="M6.6,10.8c1.3,2.6,3.5,4.8,6.1,6.1l2-2c0.4-0.4,1-0.5,1.5-0.3c1.6,0.5,3.3,0.8,5,0.8c0.6,0,1,0.4,1,1V21c0,0.6-0.4,1-1,1C10.1,22,2,13.9,2,4c0-0.6,0.4-1,1-1h4c0.6,0,1,0.4,1,1c0,1.7,0.3,3.4,0.8,5C7.1,9.8,7,10.4,6.6,10.8z"></path>
        </svg>`;
    }

    getVideoIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="white" width="16" height="16" viewBox="0 0 24 24">
            <path d="M17 10.5V7c0-1.1-.9-2-2-2H5C3.9 5 3 5.9 3 7v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-3.5l4 4v-11l-4 4z"></path>
        </svg>`;
    }

    getScreenIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="white" width="16" height="16" viewBox="0 0 24 24">
            <path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
            <circle cx="12" cy="11" r="2"/>
        </svg>`;
    }

    getChatIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="white" width="16" height="16" viewBox="0 0 24 24">
            <path d="M21 6.5a2.5 2.5 0 0 0-2.5-2.5h-13A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20H6v2l3-2h9.5A2.5 2.5 0 0 0 21 17.5v-11zm-2.5-.5a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5H8.17L7 19.17V18H5.5a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5h13z"/>
        </svg>`;
    }

    getJoinIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="white" width="16" height="16" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>`;
    }

    getUserIcon() {
        return `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>`;
    }

    // ============================================================================
    // PUBLIC API METHODS
    // ============================================================================

    join() {
        if (!this.getParentNode()) {
            this.createWidget();
        }
    }

    destroy() {
        this.removeAllWidgetElements();

        const parentNode = this.getParentNode();
        if (parentNode && parentNode !== document.body) {
            this.clearParentNode(parentNode);
        }

        if (window.miroTalkWidgets) {
            for (const [key, widget] of window.miroTalkWidgets.entries()) {
                if (widget === this) {
                    window.miroTalkWidgets.delete(key);
                    break;
                }
            }
        }

        console.log('Widget destroyed');
    }

    updateRoom(newRoomId) {
        this.roomId = newRoomId;
        this.createWidget();
    }

    updateUser(newUserName) {
        this.userName = newUserName;
        this.createWidget();
    }

    getState() {
        return this.widgetState;
    }

    isVisible() {
        return this.widgetState === 'normal';
    }
}

// ============================================================================
// GLOBAL ACTION HANDLER
// ============================================================================

window.miroTalkWidgetAction = function (action, element) {
    try {
        const widgetElement = element.closest(
            '.mirotalk-support-widget, .mirotalk-minimized-btn, .mirotalk-reopener-btn'
        );

        if (!widgetElement) {
            console.error('Widget element not found');
            return;
        }

        const widgetId = widgetElement.getAttribute('data-widget-id');
        const widget = window.miroTalkWidgets?.get(widgetId);

        if (!widget) {
            console.error('Widget instance not found');
            return;
        }

        const actions = {
            minimize: () => widget.minimizeWidget(),
            close: () => widget.closeWidget(),
            restore: () => widget.restoreWidget(),
            reopen: () => widget.reopenWidget(),
            startAudioCall: () => widget.startAudioCall(),
            startVideoCall: () => widget.startVideoCall(),
            startChat: () => widget.startChat(),
            startScreenShare: () => widget.startScreenShare(),
            joinRoom: () => widget.joinRoom(),
        };

        const actionHandler = actions[action];
        if (actionHandler) {
            actionHandler();
        } else {
            console.warn('Unknown action:', action);
        }
    } catch (error) {
        console.error('Error executing widget action:', error);
    }
};

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    const autoInit = document.querySelector('[data-mirotalk-auto]');
    if (!autoInit) return;

    try {
        const buttonsAttr = autoInit.getAttribute('data-buttons');
        let buttonsConfig = { ...MiroTalkWidget.DEFAULT_OPTIONS.supportWidget.buttons };
        if (buttonsAttr) {
            // Normalize and map
            const requested = buttonsAttr
                .split(',')
                .map((b) => b.trim().toLowerCase())
                .filter(Boolean);
            // Start all false then enable requested valid keys
            buttonsConfig = { audio: false, video: false, screen: false, chat: false, join: false };
            requested.forEach((key) => {
                if (key in buttonsConfig) buttonsConfig[key] = true;
            });
        }

        const config = {
            domain: autoInit.getAttribute('data-domain') || window.location.host,
            roomId: autoInit.getAttribute('data-room') || 'support-room',
            userName: autoInit.getAttribute('data-user') || `guest-${Math.floor(Math.random() * 10000)}`,
            theme: autoInit.getAttribute('data-theme') || MiroTalkWidget.DEFAULT_OPTIONS.theme,
            widgetState: autoInit.getAttribute('data-widget-state') || MiroTalkWidget.DEFAULT_OPTIONS.widgetState,
            draggable:
                autoInit.getAttribute('data-draggable') === 'true' ||
                MiroTalkWidget.DEFAULT_OPTIONS.supportWidget.draggable,
            position: autoInit.getAttribute('data-position') || MiroTalkWidget.DEFAULT_OPTIONS.supportWidget.position,
            checkOnline: autoInit.getAttribute('data-check-online') === 'true',
            expertImages: autoInit.getAttribute('data-expert-images')
                ? autoInit
                      .getAttribute('data-expert-images')
                      .split(',')
                      .map((url) => url.trim())
                      .filter(Boolean)
                : MiroTalkWidget.DEFAULT_OPTIONS.supportWidget.expertImages,
            customMessages: {
                heading:
                    autoInit.getAttribute('data-heading') ||
                    MiroTalkWidget.DEFAULT_OPTIONS.supportWidget.customMessages.heading,
                subheading:
                    autoInit.getAttribute('data-subheading') ||
                    MiroTalkWidget.DEFAULT_OPTIONS.supportWidget.customMessages.subheading,
                connectText:
                    autoInit.getAttribute('data-connect-text') ||
                    MiroTalkWidget.DEFAULT_OPTIONS.supportWidget.customMessages.connectText,
                onlineText:
                    autoInit.getAttribute('data-online-text') ||
                    MiroTalkWidget.DEFAULT_OPTIONS.supportWidget.customMessages.onlineText,
                offlineText:
                    autoInit.getAttribute('data-offline-text') ||
                    MiroTalkWidget.DEFAULT_OPTIONS.supportWidget.customMessages.offlineText,
                poweredBy:
                    autoInit.getAttribute('data-powered-by') ||
                    MiroTalkWidget.DEFAULT_OPTIONS.supportWidget.customMessages.poweredBy,
            },
        };

        if (config.domain) {
            new MiroTalkWidget(config.domain, config.roomId, config.userName, {
                widgetState: config.widgetState,
                theme: config.theme,
                supportWidget: {
                    ...MiroTalkWidget.DEFAULT_OPTIONS.supportWidget,
                    draggable: config.draggable,
                    position: config.position,
                    expertImages: config.expertImages,
                    checkOnlineStatus: config.checkOnline,
                    customMessages: config.customMessages,
                    buttons: buttonsConfig,
                },
            });
        }
    } catch (error) {
        console.error('Failed to auto-initialize MiroTalk Widget:', error);
    }
});
