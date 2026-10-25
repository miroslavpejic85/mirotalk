'use strict';

/**
 * Room polls UI. The signaling server owns the poll state (one vote per participant,
 * results computed server-side): this module only sends user intents and renders the
 * state pushed by the server. User texts are always rendered with textContent.
 *
 * Server -> client messages ('poll' event):
 *  - { action: 'list', polls }                 full snapshot (on join / rejoin)
 *  - { action: 'update', poll, created_by? }   poll created, voted or closed
 *  - { action: 'delete', poll_id }             poll removed
 *  - { action: 'error', message }              request rejected
 */
class RoomPolls {
    static MIN_OPTIONS = 2;
    static MAX_OPTIONS = 10;
    static MAX_QUESTION_LENGTH = 300;
    static MAX_OPTION_LENGTH = 120;

    /**
     * @param {object} options
     * @param {object} options.elements { list, empty, form, question, options, addOptionBtn, anonymous, cancelBtn, count }
     * @param {function} options.send (action, payload) => void
     * @param {function} options.getMyPeerId () => string
     * @param {function} options.isPresenter () => boolean
     * @param {function} [options.onPollCreated] (poll, isMine) => void
     * @param {function} [options.onError] (message) => void
     * @param {function} [options.confirmDelete] (poll) => Promise<boolean>
     * @param {function} [options.translate] (text) => string
     */
    constructor(options) {
        this.el = options.elements;
        this.send = options.send;
        this.getMyPeerId = options.getMyPeerId || (() => '');
        this.isPresenter = options.isPresenter || (() => false);
        this.onPollCreated = options.onPollCreated || (() => {});
        this.onError = options.onError || (() => {});
        this.confirmDelete = options.confirmDelete || (() => Promise.resolve(true));
        this.translate = options.translate || ((text) => window.i18n?.t?.(text, 'labels') || text);
        this.polls = new Map();

        this.el.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm();
        });
        this.el.addOptionBtn.addEventListener('click', () => this.addOptionInput('', true));
        this.el.cancelBtn.addEventListener('click', () => this.hideForm());

        this.resetForm();
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
            'The question is required': this.t('The question is required'),
            'At least 2 different options are required': this.t('At least 2 different options are required'),
            'Too many options': this.t('Too many options'),
            'The maximum number of polls has been reached': this.t('The maximum number of polls has been reached'),
            'Poll not found': this.t('Poll not found'),
            'The poll is closed': this.t('The poll is closed'),
        };
        return Object.hasOwn(messages, message) ? messages[message] : message;
    }

    /**
     * @returns {object[]} polls, newest first
     */
    getPolls() {
        return [...this.polls.values()].sort((a, b) => b.created_at - a.created_at);
    }

    /**
     * @param {object} poll public poll
     * @returns {boolean} local peer can close/delete it
     */
    canManage(poll) {
        return !!poll?.is_mine || !!this.isPresenter();
    }

    static isValidPoll(poll) {
        return (
            !!poll &&
            typeof poll === 'object' &&
            typeof poll.id === 'string' &&
            typeof poll.question === 'string' &&
            Array.isArray(poll.options)
        );
    }

    // ####################################################
    // SERVER MESSAGES
    // ####################################################

    /**
     * Handle a 'poll' message from the signaling server
     * @param {object} data
     */
    handle(data) {
        if (!data || typeof data !== 'object') return;
        switch (data.action) {
            case 'list':
                this.polls.clear();
                for (const poll of Array.isArray(data.polls) ? data.polls : []) {
                    if (RoomPolls.isValidPoll(poll)) this.polls.set(poll.id, poll);
                }
                this.render();
                break;
            case 'update': {
                if (!RoomPolls.isValidPoll(data.poll)) return;
                const isNew = !this.polls.has(data.poll.id);
                this.polls.set(data.poll.id, data.poll);
                this.render();
                if (isNew && data.created_by) {
                    this.onPollCreated(data.poll, data.created_by === this.getMyPeerId());
                }
                break;
            }
            case 'delete':
                if (this.polls.delete(data.poll_id)) this.render();
                break;
            case 'error':
                if (typeof data.message === 'string') this.onError(this.errorMessage(data.message));
                break;
            default:
                break;
        }
    }

    // ####################################################
    // USER ACTIONS
    // ####################################################

    vote(pollId, option) {
        const poll = this.polls.get(pollId);
        if (!poll || !poll.open) return;
        // Clicking the current choice again retracts the vote
        this.send('vote', { poll_id: pollId, option: poll.my_vote === option ? -1 : option });
    }

    close(pollId) {
        const poll = this.polls.get(pollId);
        if (!poll || !poll.open || !this.canManage(poll)) return;
        this.send('close', { poll_id: pollId });
    }

    async remove(pollId) {
        const poll = this.polls.get(pollId);
        if (!poll || !this.canManage(poll)) return;
        if (await this.confirmDelete(poll)) this.send('delete', { poll_id: pollId });
    }

    // ####################################################
    // CREATE FORM
    // ####################################################

    isFormOpen() {
        return !this.el.form.classList.contains('hidden');
    }

    showForm() {
        this.el.form.classList.remove('hidden');
        this.el.empty.classList.add('hidden');
        this.el.question.focus();
    }

    hideForm() {
        this.el.form.classList.add('hidden');
        this.resetForm();
        this.render();
    }

    resetForm() {
        this.el.question.value = '';
        this.el.anonymous.checked = true;
        this.el.options.replaceChildren();
        for (let i = 0; i < RoomPolls.MIN_OPTIONS; i++) this.addOptionInput('');
    }

    getOptionInputs() {
        return [...this.el.options.querySelectorAll('input')];
    }

    addOptionInput(value = '', focus = false) {
        if (this.getOptionInputs().length >= RoomPolls.MAX_OPTIONS) return;
        const row = document.createElement('div');
        row.className = 'poll-form-option';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = RoomPolls.MAX_OPTION_LENGTH;
        input.value = value;
        input.addEventListener('keydown', (e) => {
            // Enter on the last option adds a new one instead of submitting the form
            if (e.key === 'Enter' && input === this.getOptionInputs().at(-1) && input.value.trim()) {
                e.preventDefault();
                this.addOptionInput('', true);
            }
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'fas fa-times poll-form-option-remove';
        removeBtn.setAttribute('aria-label', this.t('Remove option'));
        removeBtn.addEventListener('click', () => {
            if (this.getOptionInputs().length <= RoomPolls.MIN_OPTIONS) return;
            row.remove();
            this.updateOptionInputs();
        });

        row.append(input, removeBtn);
        this.el.options.appendChild(row);
        this.updateOptionInputs();
        if (focus) input.focus();
    }

    updateOptionInputs() {
        const inputs = this.getOptionInputs();
        inputs.forEach((input, index) => {
            input.placeholder = this.t('Option {n}').replace('{n}', index + 1);
            input.nextSibling.disabled = inputs.length <= RoomPolls.MIN_OPTIONS;
        });
        this.el.addOptionBtn.disabled = inputs.length >= RoomPolls.MAX_OPTIONS;
    }

    /**
     * Validate the form locally (the server validates again)
     * @returns {object|null} create payload
     */
    getFormData() {
        const question = this.el.question.value.trim();
        if (!question) {
            this.onError(this.errorMessage('The question is required'));
            return null;
        }
        const seen = new Set();
        const options = [];
        for (const input of this.getOptionInputs()) {
            const text = input.value.trim();
            if (!text || seen.has(text.toLowerCase())) continue;
            seen.add(text.toLowerCase());
            options.push(text);
        }
        if (options.length < RoomPolls.MIN_OPTIONS) {
            this.onError(this.errorMessage('At least 2 different options are required'));
            return null;
        }
        return { question, options, anonymous: this.el.anonymous.checked };
    }

    submitForm() {
        const data = this.getFormData();
        if (!data) return;
        this.send('create', data);
        this.hideForm();
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

    static percent(votes, total) {
        return total > 0 ? Math.round((votes / total) * 100) : 0;
    }

    votesLabel(count) {
        return count === 1 ? this.t('1 vote') : this.t('{count} votes').replace('{count}', count);
    }

    render() {
        const polls = this.getPolls();
        const cards = polls.map((poll) => this.renderPoll(poll));
        this.el.list.replaceChildren(...cards);
        this.el.empty.classList.toggle('hidden', polls.length > 0 || this.isFormOpen());
        if (this.el.count) {
            const open = polls.filter((poll) => poll.open).length;
            this.el.count.textContent = open > 0 ? String(open) : '';
            this.el.count.classList.toggle('hidden', open === 0);
        }
    }

    renderPoll(poll) {
        const { createEl } = RoomPolls;
        const card = createEl('article', 'poll-card');
        card.dataset.pollId = poll.id;
        card.classList.toggle('is-closed', !poll.open);
        card.classList.toggle('has-voted', poll.my_vote >= 0);

        const head = createEl('div', 'poll-card-head');
        const question = createEl('h4', 'poll-question notranslate', poll.question);
        question.setAttribute('translate', 'no');
        head.appendChild(question);
        if (!poll.open) head.appendChild(createEl('span', 'poll-badge poll-badge-closed', this.t('Closed')));
        card.appendChild(head);

        const meta = createEl('div', 'poll-meta');
        const creator = createEl('span', 'poll-creator notranslate', poll.creator_name);
        creator.setAttribute('translate', 'no');
        meta.append(
            creator,
            createEl('span', 'poll-meta-sep', '·'),
            createEl('span', 'poll-total', this.votesLabel(poll.total_votes || 0))
        );
        if (poll.anonymous) {
            meta.append(
                createEl('span', 'poll-meta-sep', '·'),
                createEl('span', 'poll-anonymous', this.t('Anonymous'))
            );
        }
        card.appendChild(meta);

        const list = createEl('ol', 'poll-options');
        poll.options.forEach((option, index) => list.appendChild(this.renderOption(poll, option, index)));
        card.appendChild(list);

        if (this.canManage(poll)) {
            const actions = createEl('div', 'poll-card-actions');
            if (poll.open) {
                const closeBtn = createEl('button', 'poll-btn poll-btn-small');
                closeBtn.type = 'button';
                closeBtn.append(createEl('i', 'fas fa-lock'), document.createTextNode(' ' + this.t('Close poll')));
                closeBtn.addEventListener('click', () => this.close(poll.id));
                actions.appendChild(closeBtn);
            }
            const deleteBtn = createEl('button', 'poll-btn poll-btn-small poll-btn-danger');
            deleteBtn.type = 'button';
            deleteBtn.append(createEl('i', 'fas fa-trash'), document.createTextNode(' ' + this.t('Delete')));
            deleteBtn.addEventListener('click', () => this.remove(poll.id));
            actions.appendChild(deleteBtn);
            card.appendChild(actions);
        }
        return card;
    }

    renderOption(poll, option, index) {
        const { createEl } = RoomPolls;
        const votes = Number(option.votes) || 0;
        const pct = RoomPolls.percent(votes, poll.total_votes || 0);
        const selected = poll.my_vote === index;

        const item = createEl('li', 'poll-option-item');
        const btn = createEl('button', 'poll-option');
        btn.type = 'button';
        btn.disabled = !poll.open;
        btn.classList.toggle('is-selected', selected);
        btn.setAttribute('aria-pressed', String(selected));
        btn.addEventListener('click', () => this.vote(poll.id, index));

        const bar = createEl('span', 'poll-option-bar');
        bar.style.width = pct + '%';
        const check = createEl(
            'i',
            selected ? 'fas fa-circle-check poll-option-check' : 'far fa-circle poll-option-check'
        );
        const text = createEl('span', 'poll-option-text notranslate', option.text);
        text.setAttribute('translate', 'no');
        const result = createEl('span', 'poll-option-result', `${pct}% (${votes})`);
        btn.append(bar, check, text, result);
        item.appendChild(btn);

        if (Array.isArray(option.voters) && option.voters.length > 0) {
            const voters = createEl('div', 'poll-voters notranslate', option.voters.join(', '));
            voters.setAttribute('translate', 'no');
            item.appendChild(voters);
        }
        return item;
    }
}
