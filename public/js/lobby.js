'use strict';

/**
 * Room lobby UI for presenters. The signaling server keeps the waiting list and decides who
 * gets in: this module renders the list pushed by the server and sends the presenter choices.
 * Peer names are always rendered with textContent.
 *
 * Server -> client messages ('lobby' event):
 *  - { action: 'list', peers }   (presenters) waiting peers [{ peer_id, peer_name, peer_avatar, joined_at }]
 *  - { action: 'waiting' }       (guest) waiting to be admitted
 *  - { action: 'admitted' }      (guest) admitted by a presenter
 *  - { action: 'rejected' }      (guest) rejected by a presenter
 */
class RoomLobby {
    /**
     * @param {object} options
     * @param {object} options.elements { panel, header, count, toggleBtn, list, acceptAllBtn, rejectAllBtn }
     * @param {function} options.send (action, peer_id?) => void, action: 'accept' | 'reject' | 'acceptAll' | 'rejectAll'
     * @param {function} [options.getAvatar] (peer) => string image src
     * @param {function} [options.onNewPeers] (peers) => void, peers that just entered the lobby
     * @param {function} [options.translate] (text) => string
     */
    constructor(options) {
        this.el = options.elements;
        this.send = options.send;
        this.getAvatar = options.getAvatar || (() => '');
        this.onNewPeers = options.onNewPeers || (() => {});
        this.translate = options.translate || ((text) => window.i18n?.t?.(text, 'labels') || text);
        this.peers = [];
        this.collapsed = false;

        this.el.toggleBtn.addEventListener('click', () => this.setCollapsed(!this.collapsed));
        this.el.acceptAllBtn.addEventListener('click', () => this.send('acceptAll'));
        this.el.rejectAllBtn.addEventListener('click', () => this.send('rejectAll'));

        this.render();
    }

    t(text) {
        return this.translate(text);
    }

    /**
     * Server waiting list (replaces the current one)
     * @param {object[]} peers
     */
    update(peers) {
        const list = Array.isArray(peers)
            ? peers.filter((peer) => peer && typeof peer.peer_id === 'string' && peer.peer_id)
            : [];
        const known = new Set(this.peers.map((peer) => peer.peer_id));
        const added = list.filter((peer) => !known.has(peer.peer_id));
        this.peers = list;
        if (added.length > 0) {
            this.collapsed = false;
            this.onNewPeers(added);
        }
        this.render();
    }

    clear() {
        this.peers = [];
        this.render();
    }

    get size() {
        return this.peers.length;
    }

    setCollapsed(collapsed) {
        this.collapsed = collapsed === true;
        this.render();
    }

    render() {
        const { panel, count, toggleBtn, list, acceptAllBtn, rejectAllBtn } = this.el;
        const size = this.peers.length;

        panel.classList.toggle('hidden', size === 0);
        panel.classList.toggle('collapsed', this.collapsed);
        count.textContent = String(size);
        toggleBtn.setAttribute('aria-expanded', String(!this.collapsed));
        toggleBtn.setAttribute('aria-label', this.collapsed ? this.t('Expand lobby') : this.t('Collapse lobby'));
        toggleBtn.querySelector('i')?.classList.toggle('fa-chevron-down', this.collapsed);
        toggleBtn.querySelector('i')?.classList.toggle('fa-chevron-up', !this.collapsed);

        list.replaceChildren(...this.peers.map((peer) => this.renderPeer(peer)));
        acceptAllBtn.hidden = size < 2;
        rejectAllBtn.hidden = size < 2;
    }

    renderPeer(peer) {
        const name = peer.peer_name || this.t('Guest');

        const item = document.createElement('li');
        item.className = 'lobby-peer';

        const avatar = document.createElement('img');
        avatar.className = 'lobby-peer-avatar';
        avatar.alt = '';
        const src = this.getAvatar(peer);
        if (src) avatar.src = src;

        const label = document.createElement('span');
        label.className = 'lobby-peer-name notranslate';
        label.setAttribute('translate', 'no');
        label.textContent = name;
        label.title = name;

        const acceptBtn = this.actionButton('lobby-accept-btn', 'fas fa-check', this.t('Accept'), () =>
            this.send('accept', peer.peer_id)
        );
        const rejectBtn = this.actionButton('lobby-reject-btn', 'fas fa-xmark', this.t('Reject'), () =>
            this.send('reject', peer.peer_id)
        );

        item.append(avatar, label, acceptBtn, rejectBtn);
        return item;
    }

    actionButton(className, iconClass, label, onClick) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = className;
        btn.title = label;
        btn.setAttribute('aria-label', label);
        const icon = document.createElement('i');
        icon.className = iconClass;
        icon.setAttribute('aria-hidden', 'true');
        btn.appendChild(icon);
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.disabled = true;
            onClick();
        });
        return btn;
    }
}
