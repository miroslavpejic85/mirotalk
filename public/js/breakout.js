'use strict';

/**
 * Breakout rooms UI. The signaling server owns the breakout state and moves the peers:
 * this module only sends the presenter intents and renders the state pushed by the server.
 * Moving to another room reloads the client on that room (handled by the onMove callback).
 * User texts are always rendered with textContent.
 *
 * Server -> client messages ('breakout' event):
 *  - { action: 'state', active, is_manager, is_main, room, ends_at, allow_return, help_requested,
 *      main_members, rooms: [{ index, name, members, help }], reason }
 *  - { action: 'move', room_id, room_name, is_main, reason, token }   go to another room
 *  - { action: 'ticket', room_id, token }                              ticket to rejoin my room after a reload
 *  - { action: 'message', message, peer_name }                         presenter message (one or all rooms)
 *  - { action: 'help', room_index, room_name, peer_name }              presenters: a room asks for help
 *  - { action: 'error', message }                                      request rejected
 */
class RoomBreakouts {
    static MIN_ROOMS = 1;
    static MAX_ROOMS = 20;
    static DEFAULT_ROOMS = 2;
    static MAX_NAME_LENGTH = 40;
    static WARNING_MS = 60 * 1000;

    /**
     * @param {object} options
     * @param {object} options.elements { setup, roomCount, duration, allowReturn, shuffleBtn, names, peers,
     *   active, activeRooms, broadcastBtn, endBtn, timer, banner, bannerName, bannerTimer, returnBtn, helpBtn }
     * @param {function} options.send (action, payload) => void
     * @param {function} options.getMyPeerId () => string
     * @param {function} options.onMove (data) => void
     * @param {function} [options.onTicket] (data) => void
     * @param {function} [options.onMessage] (data) => void
     * @param {function} [options.onHelp] (data) => void presenters: { room_index, room_name, peer_name }
     * @param {function} [options.onNotice] (text) => void
     * @param {function} [options.onError] (message) => void
     * @param {function} [options.onManagerChange] (isManager) => void
     * @param {function} [options.confirmClose] () => Promise<boolean>
     * @param {function} [options.promptBroadcast] (roomName) => Promise<string|null> roomName unset for all rooms
     * @param {function} [options.translate] (text) => string
     */
    constructor(options) {
        this.el = options.elements;
        this.send = options.send;
        this.getMyPeerId = options.getMyPeerId || (() => '');
        this.onMove = options.onMove || (() => {});
        this.onTicket = options.onTicket || (() => {});
        this.onMessage = options.onMessage || (() => {});
        this.onHelp = options.onHelp || (() => {});
        this.onNotice = options.onNotice || (() => {});
        this.onError = options.onError || (() => {});
        this.onManagerChange = options.onManagerChange || (() => {});
        this.confirmClose = options.confirmClose || (() => Promise.resolve(true));
        this.promptBroadcast = options.promptBroadcast || (() => Promise.resolve(null));
        this.translate = options.translate || ((text) => window.i18n?.t?.(text, 'labels') || text);

        this.state = null;
        this.clockOffset = 0;
        this.names = [];
        this.assignments = new Map(); // peer_id -> room index
        this.clock = null;
        this.warned = false;

        this.el.setup.addEventListener('submit', (e) => {
            e.preventDefault();
            this.open();
        });
        this.el.roomCount.addEventListener('change', () => this.setRoomCount(this.el.roomCount.value));
        this.el.shuffleBtn.addEventListener('click', () => this.shuffle());
        this.el.broadcastBtn.addEventListener('click', () => this.broadcast());
        this.el.endBtn.addEventListener('click', () => this.close());
        this.el.returnBtn.addEventListener('click', () => this.send('return'));
        this.el.helpBtn.addEventListener('click', () => this.askHelp());

        this.setRoomCount(RoomBreakouts.DEFAULT_ROOMS);
        this.render();
    }

    t(text) {
        return this.translate(text);
    }

    /**
     * Translate a (server) error message. Literal keys so the UI language extractor finds them.
     * @param {string} message
     * @returns {string}
     */
    errorMessage(message) {
        const messages = {
            'Invalid request': this.t('Invalid request'),
            'Breakout rooms cannot be nested': this.t('Breakout rooms cannot be nested'),
            'Breakout rooms are already open': this.t('Breakout rooms are already open'),
            'At least 1 room is required': this.t('At least 1 room is required'),
            'Too many rooms': this.t('Too many rooms'),
            'Invalid duration': this.t('Invalid duration'),
            'Room not found': this.t('Room not found'),
            'Not allowed': this.t('Not allowed'),
            'The message is required': this.t('The message is required'),
            'A presenter is already in this room': this.t('A presenter is already in this room'),
            'No presenter is available': this.t('No presenter is available'),
        };
        return Object.hasOwn(messages, message) ? messages[message] : message;
    }

    isActive() {
        return !!this.state?.active;
    }

    isManager() {
        return !!this.state?.is_manager;
    }

    defaultName(index) {
        return this.t('Room {n}').replace('{n}', index + 1);
    }

    // ####################################################
    // SERVER MESSAGES
    // ####################################################

    /**
     * Handle a 'breakout' message from the signaling server
     * @param {object} data
     */
    handle(data) {
        if (!data || typeof data !== 'object') return;
        switch (data.action) {
            case 'state':
                this.setState(data);
                break;
            case 'move':
                if (typeof data.room_id === 'string' && data.room_id && typeof data.token === 'string') {
                    this.onMove(data);
                }
                break;
            case 'ticket':
                if (typeof data.room_id === 'string' && data.room_id && typeof data.token === 'string') {
                    this.onTicket(data);
                }
                break;
            case 'message':
                if (typeof data.message === 'string' && data.message) this.onMessage(data);
                break;
            case 'help':
                if (this.isManager() && Number.isInteger(data.room_index) && data.room_index >= 0) {
                    this.onHelp(data);
                }
                break;
            case 'error':
                if (typeof data.message === 'string') this.onError(this.errorMessage(data.message));
                break;
            default:
                break;
        }
    }

    setState(data) {
        const wasManager = this.isManager();
        const wasActive = this.isActive();
        const wasHelpRequested = wasActive && !!this.state?.help_requested;
        this.state = {
            ...data,
            main_members: Array.isArray(data.main_members) ? data.main_members : [],
            rooms: Array.isArray(data.rooms) ? data.rooms : [],
        };
        if (Number.isFinite(data.now)) this.clockOffset = data.now - Date.now();
        if (!wasActive && this.isActive()) this.warned = false;

        if (data.reason === 'opened' && data.is_main && !this.isManager()) {
            this.onNotice(this.t('Breakout rooms are open'));
        } else if (['closed', 'timeout', 'idle'].includes(data.reason) && wasActive && !this.isActive()) {
            this.onNotice(this.t('Breakout rooms have been closed'));
        } else if (this.isActive() && data.help_requested && !wasHelpRequested && !this.isManager()) {
            this.onNotice(this.t('The presenter has been asked for help'));
        }

        this.render();
        this.updateClock();
        if (wasManager !== this.isManager()) this.onManagerChange(this.isManager());
    }

    // ####################################################
    // USER ACTIONS
    // ####################################################

    setRoomCount(value) {
        const count = Math.min(
            RoomBreakouts.MAX_ROOMS,
            Math.max(RoomBreakouts.MIN_ROOMS, parseInt(value, 10) || RoomBreakouts.MIN_ROOMS)
        );
        this.el.roomCount.value = String(count);
        this.names = Array.from({ length: count }, (_, i) => this.names[i] ?? '');
        for (const [peerId, index] of this.assignments) {
            if (index >= count) this.assignments.delete(peerId);
        }
        this.renderNames();
        this.renderPeers();
    }

    /**
     * @returns {object[]} main room peers that can be assigned (everyone but me)
     */
    getAssignablePeers() {
        const myPeerId = this.getMyPeerId();
        return (this.state?.main_members || []).filter((member) => member.peer_id !== myPeerId);
    }

    shuffle() {
        const peers = this.getAssignablePeers().map((member) => member.peer_id);
        for (let i = peers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [peers[i], peers[j]] = [peers[j], peers[i]];
        }
        this.assignments.clear();
        peers.forEach((peerId, i) => this.assignments.set(peerId, i % this.names.length));
        this.renderPeers();
    }

    open() {
        if (!this.isManager() || this.isActive()) return;
        const assignable = new Set(this.getAssignablePeers().map((member) => member.peer_id));
        const assignments = {};
        for (const [peerId, index] of this.assignments) {
            if (assignable.has(peerId) && index >= 0) assignments[peerId] = index;
        }
        this.send('open', {
            rooms: this.names.map(
                (name, i) => name.trim().slice(0, RoomBreakouts.MAX_NAME_LENGTH) || this.defaultName(i)
            ),
            duration: parseInt(this.el.duration.value, 10) || 0,
            allow_return: this.el.allowReturn.checked,
            assignments,
        });
        this.assignments.clear();
    }

    async close() {
        if (!this.isManager() || !this.isActive()) return;
        if (await this.confirmClose()) this.send('close');
    }

    /**
     * Send a message to one room, or to every room when no room is given
     * @param {object} [room] { index, name } -1 for the main room
     */
    async broadcast(room) {
        if (!this.isManager() || !this.isActive()) return;
        const message = await this.promptBroadcast(room?.name);
        if (typeof message !== 'string' || !message.trim()) return;
        if (!room) return this.send('broadcast', { message: message.trim() });
        this.send('broadcast', { message: message.trim(), room_index: room.index });
        this.onNotice(this.t('Message sent to {room}').replace('{room}', room.name));
    }

    /**
     * Presenter: go to a room of the session
     * @param {number} index -1 for the main room
     */
    join(index) {
        if (this.isManager() && this.isActive() && Number.isInteger(index)) this.send('join', { room_index: index });
    }

    /**
     * Participant in a breakout room: call the presenters over
     */
    askHelp() {
        if (!this.isActive() || this.isManager() || !this.state.room || this.state.help_requested) return;
        this.send('help');
    }

    // ####################################################
    // RENDER
    // ####################################################

    static createEl(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }

    render() {
        const manager = this.isManager();
        const active = this.isActive();
        this.el.setup.classList.toggle('hidden', !manager || active);
        this.el.active.classList.toggle('hidden', !manager || !active);
        if (manager && active) {
            this.renderActive();
        } else if (manager) {
            this.renderPeers();
        }
        this.renderBanner();
    }

    renderNames() {
        const { createEl } = RoomBreakouts;
        const rows = this.names.map((name, index) => {
            const input = createEl('input');
            input.type = 'text';
            input.maxLength = RoomBreakouts.MAX_NAME_LENGTH;
            input.value = name;
            input.placeholder = this.defaultName(index);
            input.setAttribute('aria-label', this.defaultName(index));
            input.addEventListener('input', () => {
                this.names[index] = input.value;
            });
            input.addEventListener('change', () => this.renderPeers());
            return input;
        });
        this.el.names.replaceChildren(...rows);
    }

    getRoomLabel(index) {
        return (this.names[index] || '').trim() || this.defaultName(index);
    }

    renderPeers() {
        const { createEl } = RoomBreakouts;
        const members = this.getAssignablePeers();
        const ids = new Set(members.map((member) => member.peer_id));
        for (const peerId of [...this.assignments.keys()]) {
            if (!ids.has(peerId)) this.assignments.delete(peerId);
        }
        if (members.length === 0) {
            this.el.peers.replaceChildren(createEl('p', 'breakout-empty', this.t('No participants to assign')));
            return;
        }
        const rows = members.map((member) => {
            const select = this.createRoomSelect(
                [{ value: -1, label: this.t('Unassigned') }].concat(
                    this.names.map((_, index) => ({ value: index, label: this.getRoomLabel(index) }))
                ),
                this.assignments.has(member.peer_id) ? this.assignments.get(member.peer_id) : -1
            );
            select.setAttribute('aria-label', this.t('Assign to room'));
            select.addEventListener('change', () => {
                const index = parseInt(select.value, 10);
                if (index >= 0) this.assignments.set(member.peer_id, index);
                else this.assignments.delete(member.peer_id);
            });
            return this.createMemberRow(member, select);
        });
        this.el.peers.replaceChildren(...rows);
    }

    renderActive() {
        const { createEl } = RoomBreakouts;
        const state = this.state;
        const myRoomIndex = state.is_main ? -1 : state.room?.index;
        const rooms = [{ index: -1, name: this.t('Main room'), members: state.main_members }].concat(
            state.rooms.map((room) => ({ ...room, members: Array.isArray(room.members) ? room.members : [] }))
        );
        const targets = rooms.map((room) => ({ value: room.index, label: room.name }));

        const cards = rooms.map((room) => {
            const card = createEl('article', 'breakout-card');
            card.classList.toggle('is-main', room.index < 0);
            card.classList.toggle('is-mine', room.index === myRoomIndex);
            card.classList.toggle('needs-help', !!room.help);

            const head = createEl('div', 'breakout-card-head');
            const title = createEl('h4', 'breakout-card-title notranslate', room.name);
            title.setAttribute('translate', 'no');
            head.append(title, createEl('span', 'breakout-card-count', String(room.members.length)));
            if (room.help) {
                const help = createEl('span', 'breakout-card-help');
                help.append(createEl('i', 'fas fa-hand'), document.createTextNode(' ' + this.t('Help requested')));
                help.title = `${this.t('Help requested')}: ${room.help.peer_name || ''}`;
                head.appendChild(help);
            }
            const messageBtn = createEl('button', 'poll-btn poll-btn-small');
            messageBtn.type = 'button';
            messageBtn.title = this.t('Message this room');
            messageBtn.setAttribute('aria-label', this.t('Message this room'));
            messageBtn.appendChild(createEl('i', 'fas fa-envelope'));
            messageBtn.addEventListener('click', () => this.broadcast({ index: room.index, name: room.name }));
            head.appendChild(messageBtn);
            if (room.index === myRoomIndex) {
                head.appendChild(createEl('span', 'breakout-card-here', this.t('You are here')));
            } else {
                const joinBtn = createEl('button', 'poll-btn poll-btn-small');
                joinBtn.type = 'button';
                joinBtn.append(createEl('i', 'fas fa-right-to-bracket'), document.createTextNode(' ' + this.t('Join')));
                joinBtn.addEventListener('click', () => this.join(room.index));
                head.appendChild(joinBtn);
            }
            card.appendChild(head);

            const list = createEl('div', 'breakout-members');
            if (room.members.length === 0) list.appendChild(createEl('p', 'breakout-empty', this.t('Empty')));
            for (const member of room.members) {
                if (member.peer_id === this.getMyPeerId()) {
                    list.appendChild(this.createMemberRow(member, createEl('span', 'breakout-you', this.t('(you)'))));
                    continue;
                }
                const select = this.createRoomSelect(targets, room.index);
                select.setAttribute('aria-label', this.t('Move to room'));
                select.addEventListener('change', () => {
                    this.send('move', { peer_id: member.peer_id, room_index: parseInt(select.value, 10) });
                });
                list.appendChild(this.createMemberRow(member, select));
            }
            card.appendChild(list);
            return card;
        });
        this.el.activeRooms.replaceChildren(...cards);
    }

    createRoomSelect(options, selected) {
        const select = RoomBreakouts.createEl('select', 'breakout-select');
        for (const option of options) {
            const el = RoomBreakouts.createEl('option', 'notranslate', option.label);
            el.value = String(option.value);
            el.selected = option.value === selected;
            select.appendChild(el);
        }
        return select;
    }

    createMemberRow(member, control) {
        const { createEl } = RoomBreakouts;
        const row = createEl('div', 'breakout-member');
        const name = createEl('span', 'breakout-member-name notranslate', member.peer_name);
        name.setAttribute('translate', 'no');
        if (member.presenter) name.appendChild(createEl('i', 'fas fa-star breakout-member-presenter'));
        row.append(name, control);
        return row;
    }

    renderBanner() {
        const room = this.isActive() ? this.state.room : null;
        this.el.banner.classList.toggle('hidden', !room);
        if (!room) return;
        this.el.bannerName.textContent = room.name;
        this.el.returnBtn.classList.toggle('hidden', !(this.state.allow_return || this.isManager()));

        const requested = !!this.state.help_requested;
        const { createEl } = RoomBreakouts;
        this.el.helpBtn.classList.toggle('hidden', this.isManager());
        this.el.helpBtn.disabled = requested;
        this.el.helpBtn.classList.toggle('is-requested', requested);
        this.el.helpBtn.replaceChildren(
            createEl('i', 'fas fa-hand'),
            document.createTextNode(' ' + (requested ? this.t('Help requested') : this.t('Ask for help')))
        );
    }

    // ####################################################
    // TIMER
    // ####################################################

    getRemainingMs() {
        if (!this.isActive() || !this.state.ends_at) return null;
        return Math.max(0, this.state.ends_at - (Date.now() + this.clockOffset));
    }

    static formatTime(ms) {
        const total = Math.ceil(ms / 1000);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const seconds = String(total % 60).padStart(2, '0');
        return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
    }

    updateClock() {
        const remaining = this.getRemainingMs();
        const show = remaining !== null;
        const text = show ? RoomBreakouts.formatTime(remaining) : '';
        for (const el of [this.el.timer, this.el.bannerTimer]) {
            el.textContent = text;
            el.classList.toggle('hidden', !show);
        }
        if (show && remaining > 0 && remaining <= RoomBreakouts.WARNING_MS && !this.warned) {
            this.warned = true;
            this.onNotice(this.t('Breakout rooms will close in 1 minute'));
        }
        if (show && remaining > 0) {
            if (!this.clock) this.clock = setInterval(() => this.updateClock(), 1000);
        } else if (this.clock) {
            clearInterval(this.clock);
            this.clock = null;
        }
    }
}
