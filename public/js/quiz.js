'use strict';

/**
 * Room quizzes UI. The signaling server owns the quiz state (questions, correct options,
 * one answer per participant, scores) and serializes it per recipient: the managers (creator
 * or presenter) get the answers live, the participants only what was revealed. This module
 * only sends user intents and renders that state. User texts are always rendered with textContent.
 *
 * Server -> client messages ('quiz' event):
 *  - { action: 'list', quizzes }                   full snapshot (on join / rejoin)
 *  - { action: 'update', quiz, created_by? }       quiz created or answered
 *  - { action: 'update', quiz, event, by }         quiz started, revealed, next question or finished
 *  - { action: 'delete', quiz_id }                 quiz removed
 *  - { action: 'error', message }                  request rejected
 */
class RoomQuizzes {
    static MIN_QUESTIONS = 1;
    static MAX_QUESTIONS = 30;
    static MIN_OPTIONS = 2;
    static MAX_OPTIONS = 6;
    static MAX_TITLE_LENGTH = 120;
    static MAX_QUESTION_LENGTH = 300;
    static MAX_OPTION_LENGTH = 120;
    static FILE_TYPE = 'mirotalk-quiz';
    static FILE_VERSION = 1;
    static MAX_FILE_SIZE = 512 * 1024;

    /**
     * @param {object} options
     * @param {object} options.elements { list, empty, form, title, modeStep, modeAll, anonymous, questions, addQuestionBtn, cancelBtn, count, loadBtn?, saveBtn?, fileInput? }
     * @param {function} options.send (action, payload) => void
     * @param {function} options.getMyPeerId () => string
     * @param {function} [options.onQuizEvent] (quiz, event, isMine) => void, event: 'created' | 'start' | 'reveal' | 'next' | 'finish'
     * @param {function} [options.onError] (message) => void
     * @param {function} [options.onLoaded] (title) => void, a quiz file was loaded into the builder
     * @param {function} [options.confirmDelete] (quiz) => Promise<boolean>
     * @param {function} [options.translate] (text) => string
     * @param {function} [options.download] (blob, fileName) => void
     */
    constructor(options) {
        this.el = options.elements;
        this.send = options.send;
        this.getMyPeerId = options.getMyPeerId || (() => '');
        this.onQuizEvent = options.onQuizEvent || (() => {});
        this.onError = options.onError || (() => {});
        this.onLoaded = options.onLoaded || (() => {});
        this.confirmDelete = options.confirmDelete || (() => Promise.resolve(true));
        this.translate = options.translate || ((text) => window.i18n?.t?.(text, 'labels') || text);
        this.download = options.download || RoomQuizzes.saveBlob;
        this.quizzes = new Map();
        this.expanded = new Set(); // quiz ids with the question review open
        this.formSeq = 0; // unique radio group names in the builder

        this.el.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm();
        });
        this.el.addQuestionBtn.addEventListener('click', () => this.addQuestion(true));
        this.el.cancelBtn.addEventListener('click', () => this.hideForm());
        this.el.saveBtn?.addEventListener('click', () => this.saveForm());
        this.el.loadBtn?.addEventListener('click', () => this.el.fileInput?.click());
        this.el.fileInput?.addEventListener('change', () => {
            const [file] = this.el.fileInput.files || [];
            // Same file can be picked again
            this.el.fileInput.value = '';
            if (file) this.loadFile(file);
        });

        this.resetForm();
        this.render();
    }

    t(text) {
        return this.translate(text);
    }

    /**
     * Translate with {placeholders}
     * @param {string} translated already translated text
     * @param {object} values
     * @returns {string}
     */
    static format(translated, values) {
        return translated.replace(/\{(\w+)\}/g, (match, key) => (Object.hasOwn(values, key) ? values[key] : match));
    }

    /**
     * Translate a (server) error message. Literal keys so the UI language extractor finds them.
     * @param {string} message
     * @returns {string}
     */
    errorMessage(message) {
        const messages = {
            'Invalid request': this.t('Invalid request'),
            'The quiz title is required': this.t('The quiz title is required'),
            'Every question needs a text': this.t('Every question needs a text'),
            'Mark the correct answer of every question': this.t('Mark the correct answer of every question'),
            'At least 2 different options are required': this.t('At least 2 different options are required'),
            'Too many options': this.t('Too many options'),
            'At least one question is required': this.t('At least one question is required'),
            'Too many questions': this.t('Too many questions'),
            'The maximum number of quizzes has been reached': this.t('The maximum number of quizzes has been reached'),
            'Quiz not found': this.t('Quiz not found'),
            'The quiz has already started': this.t('The quiz has already started'),
            'This is the last question': this.t('This is the last question'),
            'This question is no longer accepting answers': this.t('This question is no longer accepting answers'),
            'Invalid quiz file': this.t('Invalid quiz file'),
            'The quiz is empty': this.t('The quiz is empty'),
        };
        return Object.hasOwn(messages, message) ? messages[message] : message;
    }

    /**
     * @returns {object[]} quizzes, newest first
     */
    getQuizzes() {
        return [...this.quizzes.values()].sort((a, b) => b.created_at - a.created_at);
    }

    static isValidQuiz(quiz) {
        return (
            !!quiz &&
            typeof quiz === 'object' &&
            typeof quiz.id === 'string' &&
            typeof quiz.title === 'string' &&
            Array.isArray(quiz.questions) &&
            quiz.questions.every(
                (question) =>
                    !!question &&
                    typeof question.text === 'string' &&
                    Number.isInteger(question.index) &&
                    Array.isArray(question.options)
            )
        );
    }

    // ####################################################
    // SERVER MESSAGES
    // ####################################################

    /**
     * Handle a 'quiz' message from the signaling server
     * @param {object} data
     */
    handle(data) {
        if (!data || typeof data !== 'object') return;
        switch (data.action) {
            case 'list':
                this.quizzes.clear();
                for (const quiz of Array.isArray(data.quizzes) ? data.quizzes : []) {
                    if (RoomQuizzes.isValidQuiz(quiz)) this.quizzes.set(quiz.id, quiz);
                }
                this.render();
                break;
            case 'update': {
                if (!RoomQuizzes.isValidQuiz(data.quiz)) return;
                const isNew = !this.quizzes.has(data.quiz.id);
                this.quizzes.set(data.quiz.id, data.quiz);
                this.render();
                const myPeerId = this.getMyPeerId();
                if (isNew && data.created_by) {
                    this.onQuizEvent(data.quiz, 'created', data.created_by === myPeerId);
                }
                if (typeof data.event === 'string') {
                    this.onQuizEvent(data.quiz, data.event, data.by === myPeerId);
                }
                break;
            }
            case 'delete':
                this.expanded.delete(data.quiz_id);
                if (this.quizzes.delete(data.quiz_id)) this.render();
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

    static canAnswer(quiz, question) {
        return quiz.status === 'running' && question?.state === 'open' && !quiz.can_manage;
    }

    answer(quizId, questionIndex, option) {
        const quiz = this.quizzes.get(quizId);
        const question = quiz?.questions.find((item) => item.index === questionIndex);
        if (!quiz || !RoomQuizzes.canAnswer(quiz, question)) return;
        // Clicking the current choice again retracts the answer
        this.send('answer', {
            quiz_id: quizId,
            question: questionIndex,
            option: question.my_answer === option ? -1 : option,
        });
    }

    /**
     * Manager actions: 'start' | 'reveal' | 'next' | 'finish'
     * @param {string} quizId
     * @param {string} action
     */
    manage(quizId, action) {
        const quiz = this.quizzes.get(quizId);
        if (!quiz || !quiz.can_manage) return;
        this.send(action, { quiz_id: quizId });
    }

    async remove(quizId) {
        const quiz = this.quizzes.get(quizId);
        if (!quiz || !quiz.can_manage) return;
        if (await this.confirmDelete(quiz)) this.send('delete', { quiz_id: quizId });
    }

    toggleReview(quizId) {
        this.expanded.has(quizId) ? this.expanded.delete(quizId) : this.expanded.add(quizId);
        this.render();
    }

    // ####################################################
    // BUILDER FORM
    // ####################################################

    isFormOpen() {
        return !this.el.form.classList.contains('hidden');
    }

    showForm() {
        this.el.form.classList.remove('hidden');
        this.el.empty.classList.add('hidden');
        this.el.title.focus();
    }

    hideForm() {
        this.el.form.classList.add('hidden');
        this.resetForm();
        this.render();
    }

    resetForm() {
        this.el.title.value = '';
        this.el.modeStep.checked = true;
        this.el.modeAll.checked = false;
        this.el.anonymous.checked = true;
        this.el.questions.replaceChildren();
        this.addQuestion();
    }

    getQuestionBlocks() {
        return [...this.el.questions.querySelectorAll('.quiz-form-question')];
    }

    static getOptionRows(block) {
        return [...block.querySelectorAll('.quiz-form-option')];
    }

    addQuestion(focus = false) {
        if (this.getQuestionBlocks().length >= RoomQuizzes.MAX_QUESTIONS) return;
        const { createEl } = RoomQuizzes;
        const block = createEl('div', 'quiz-form-question');
        block.setAttribute('role', 'group');
        block.dataset.group = `quiz-correct-${++this.formSeq}`;

        const head = createEl('div', 'quiz-form-question-head');
        const label = createEl('span', 'poll-form-label quiz-form-question-label');
        const removeBtn = createEl('button', 'fas fa-trash poll-form-option-remove quiz-form-question-remove');
        removeBtn.type = 'button';
        removeBtn.setAttribute('aria-label', this.t('Remove question'));
        removeBtn.addEventListener('click', () => {
            if (this.getQuestionBlocks().length <= RoomQuizzes.MIN_QUESTIONS) return;
            block.remove();
            this.updateQuestionBlocks();
        });
        head.append(label, removeBtn);

        const text = createEl('input', 'quiz-form-question-text');
        text.type = 'text';
        text.maxLength = RoomQuizzes.MAX_QUESTION_LENGTH;
        text.placeholder = this.t('Ask a question');

        const hint = createEl('span', 'quiz-form-hint', this.t('Select the correct answer'));
        const options = createEl('div', 'poll-form-options quiz-form-options');

        const addOptionBtn = createEl('button', 'poll-link-btn quiz-form-add-option');
        addOptionBtn.type = 'button';
        addOptionBtn.append(createEl('i', 'fas fa-plus'), document.createTextNode(' ' + this.t('Add option')));
        addOptionBtn.addEventListener('click', () => this.addOption(block, '', true));

        block.append(head, text, hint, options, addOptionBtn);
        this.el.questions.appendChild(block);
        for (let i = 0; i < RoomQuizzes.MIN_OPTIONS; i++) this.addOption(block, '');
        this.updateQuestionBlocks();
        if (focus) text.focus();
        return block;
    }

    addOption(block, value = '', focus = false) {
        if (RoomQuizzes.getOptionRows(block).length >= RoomQuizzes.MAX_OPTIONS) return;
        const { createEl } = RoomQuizzes;
        const row = createEl('div', 'poll-form-option quiz-form-option');

        const correct = createEl('input', 'quiz-form-correct');
        correct.type = 'radio';
        correct.name = block.dataset.group;
        correct.setAttribute('aria-label', this.t('Correct answer'));

        const input = createEl('input', 'quiz-form-option-text');
        input.type = 'text';
        input.maxLength = RoomQuizzes.MAX_OPTION_LENGTH;
        input.value = value;
        input.addEventListener('keydown', (e) => {
            // Enter on the last option adds a new one instead of submitting the form
            const inputs = RoomQuizzes.getOptionRows(block).map((item) => item.querySelector('.quiz-form-option-text'));
            if (e.key === 'Enter' && input === inputs.at(-1) && input.value.trim()) {
                e.preventDefault();
                this.addOption(block, '', true);
            }
        });

        const removeBtn = createEl('button', 'fas fa-times poll-form-option-remove');
        removeBtn.type = 'button';
        removeBtn.setAttribute('aria-label', this.t('Remove option'));
        removeBtn.addEventListener('click', () => {
            if (RoomQuizzes.getOptionRows(block).length <= RoomQuizzes.MIN_OPTIONS) return;
            row.remove();
            this.updateOptionRows(block);
        });

        row.append(correct, input, removeBtn);
        block.querySelector('.quiz-form-options').appendChild(row);
        this.updateOptionRows(block);
        if (focus) input.focus();
        return row;
    }

    updateQuestionBlocks() {
        const blocks = this.getQuestionBlocks();
        blocks.forEach((block, index) => {
            const label = this.t('Question {n}').replace('{n}', index + 1);
            block.querySelector('.quiz-form-question-label').textContent = label;
            block.setAttribute('aria-label', label);
            block.querySelector('.quiz-form-question-remove').disabled = blocks.length <= RoomQuizzes.MIN_QUESTIONS;
        });
        this.el.addQuestionBtn.disabled = blocks.length >= RoomQuizzes.MAX_QUESTIONS;
    }

    updateOptionRows(block) {
        const rows = RoomQuizzes.getOptionRows(block);
        rows.forEach((row, index) => {
            row.querySelector('.quiz-form-option-text').placeholder = this.t('Option {n}').replace('{n}', index + 1);
            row.querySelector('.poll-form-option-remove').disabled = rows.length <= RoomQuizzes.MIN_OPTIONS;
        });
        block.querySelector('.quiz-form-add-option').disabled = rows.length >= RoomQuizzes.MAX_OPTIONS;
    }

    /**
     * Report a builder error and focus the field to fix
     * @param {string} message server error key
     * @param {HTMLElement} [field]
     * @returns {null}
     */
    formError(message, field) {
        this.onError(this.errorMessage(message));
        field?.focus?.();
        return null;
    }

    /**
     * Validate the builder locally (the server validates again)
     * @returns {object|null} create payload
     */
    getFormData() {
        const title = this.el.title.value.trim();
        if (!title) return this.formError('The quiz title is required', this.el.title);

        const questions = [];
        for (const block of this.getQuestionBlocks()) {
            const textInput = block.querySelector('.quiz-form-question-text');
            const question = textInput.value.trim();
            if (!question) return this.formError('Every question needs a text', textInput);

            const options = [];
            const seen = new Map(); // lowercased text -> index in options
            let correct = -1;
            let firstOption = null;
            for (const row of RoomQuizzes.getOptionRows(block)) {
                const input = row.querySelector('.quiz-form-option-text');
                firstOption = firstOption || input;
                const text = input.value.trim();
                if (!text) continue;
                const key = text.toLowerCase();
                if (!seen.has(key)) {
                    seen.set(key, options.length);
                    options.push(text);
                }
                if (row.querySelector('.quiz-form-correct').checked) correct = seen.get(key);
            }
            if (options.length < RoomQuizzes.MIN_OPTIONS) {
                return this.formError('At least 2 different options are required', firstOption);
            }
            if (correct < 0) {
                return this.formError(
                    'Mark the correct answer of every question',
                    block.querySelector('.quiz-form-correct')
                );
            }
            questions.push({ question, options, correct });
        }
        if (questions.length < RoomQuizzes.MIN_QUESTIONS) return this.formError('At least one question is required');

        return {
            title,
            mode: this.el.modeAll.checked ? 'all' : 'step',
            anonymous: this.el.anonymous.checked,
            questions,
        };
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

    static noTranslate(el) {
        el.classList.add('notranslate');
        el.setAttribute('translate', 'no');
        return el;
    }

    countLabel(count, one, many) {
        return count === 1 ? one : many.replace('{count}', count);
    }

    button(label, icon, className, onClick) {
        const btn = RoomQuizzes.createEl('button', 'poll-btn poll-btn-small' + (className ? ' ' + className : ''));
        btn.type = 'button';
        btn.append(RoomQuizzes.createEl('i', icon), document.createTextNode(' ' + label));
        btn.addEventListener('click', onClick);
        return btn;
    }

    render() {
        const quizzes = this.getQuizzes();
        const cards = quizzes.map((quiz) => this.renderQuiz(quiz));
        this.el.list.replaceChildren(...cards);
        this.el.empty.classList.toggle('hidden', quizzes.length > 0 || this.isFormOpen());
        if (this.el.count) {
            const running = quizzes.filter((quiz) => quiz.status === 'running').length;
            this.el.count.textContent = running > 0 ? String(running) : '';
            this.el.count.classList.toggle('hidden', running === 0);
        }
    }

    renderQuiz(quiz) {
        const { createEl } = RoomQuizzes;
        const card = createEl('article', 'poll-card quiz-card');
        card.dataset.quizId = quiz.id;
        card.dataset.status = quiz.status;
        card.classList.toggle('is-closed', quiz.status === 'finished');

        const head = createEl('div', 'poll-card-head');
        head.appendChild(RoomQuizzes.noTranslate(createEl('h4', 'poll-question quiz-title', quiz.title)));
        const badges = {
            ready: ['quiz-badge-ready', this.t('Not started')],
            running: ['quiz-badge-live', this.t('In progress')],
            finished: ['poll-badge-closed', this.t('Finished')],
        };
        const [badgeClass, badgeText] = badges[quiz.status] || badges.ready;
        head.appendChild(createEl('span', 'poll-badge ' + badgeClass, badgeText));
        card.appendChild(head);

        card.appendChild(this.renderMeta(quiz));

        if (quiz.status === 'ready') this.renderReady(card, quiz);
        else if (quiz.status === 'running') this.renderRunning(card, quiz);
        else this.renderFinished(card, quiz);

        if (quiz.can_manage) card.appendChild(this.renderActions(quiz));
        return card;
    }

    renderMeta(quiz) {
        const { createEl } = RoomQuizzes;
        const meta = createEl('div', 'poll-meta');
        const parts = [
            RoomQuizzes.noTranslate(createEl('span', 'poll-creator', quiz.creator_name)),
            createEl(
                'span',
                'quiz-question-count',
                this.countLabel(quiz.question_count, this.t('1 question'), this.t('{count} questions'))
            ),
            createEl('span', 'quiz-mode-label', quiz.mode === 'all' ? this.t('All at once') : this.t('One at a time')),
        ];
        if (quiz.anonymous) parts.push(createEl('span', 'poll-anonymous', this.t('Anonymous')));
        parts.forEach((part, index) => {
            if (index > 0) meta.appendChild(createEl('span', 'poll-meta-sep', '·'));
            meta.appendChild(part);
        });
        return meta;
    }

    renderNote(text, className = '') {
        return RoomQuizzes.createEl('p', 'quiz-note' + (className ? ' ' + className : ''), text);
    }

    renderReady(card, quiz) {
        if (!quiz.can_manage) {
            card.appendChild(this.renderNote(this.t('The quiz will start soon')));
            return;
        }
        card.appendChild(this.renderNote(this.t('Participants will see the questions once you start the quiz')));
        this.renderReview(card, quiz, quiz.questions);
    }

    renderRunning(card, quiz) {
        const { createEl } = RoomQuizzes;
        const total = quiz.question_count;
        if (quiz.mode === 'step') {
            const question = quiz.questions.find((item) => item.index === quiz.current);
            card.appendChild(
                createEl(
                    'div',
                    'quiz-progress',
                    RoomQuizzes.format(this.t('Question {n} of {total}'), { n: quiz.current + 1, total })
                )
            );
            if (question) card.appendChild(this.renderQuestion(quiz, question, false));
            if (!quiz.can_manage && question?.state === 'revealed') {
                card.appendChild(
                    this.renderNote(
                        quiz.current + 1 < total
                            ? this.t('Waiting for the next question')
                            : this.t('Waiting for the results')
                    )
                );
            }
        } else {
            if (!quiz.can_manage) {
                const answered = quiz.questions.filter((question) => question.my_answer >= 0).length;
                card.appendChild(
                    createEl(
                        'div',
                        'quiz-progress',
                        RoomQuizzes.format(this.t('{n} of {total} answered'), { n: answered, total })
                    )
                );
            }
            const list = createEl('div', 'quiz-questions');
            quiz.questions.forEach((question) => list.appendChild(this.renderQuestion(quiz, question, true)));
            card.appendChild(list);
        }

        // Scores count the revealed questions only: nothing to rank before the first reveal.
        // No ranking for the creator of an anonymous quiz who is not a presenter (no names sent).
        if (quiz.can_manage) {
            if (quiz.revealed_count > 0 && Array.isArray(quiz.leaderboard)) {
                card.appendChild(this.renderLeaderboard(quiz, true));
            }
        } else if (quiz.revealed_count > 0 && RoomQuizzes.hasAnswered(quiz)) {
            card.appendChild(this.renderScore(quiz));
        }
    }

    /**
     * @param {object} quiz public quiz
     * @returns {boolean} the local participant answered at least one question
     */
    static hasAnswered(quiz) {
        return quiz.questions.some((question) => question.my_answer >= 0);
    }

    renderFinished(card, quiz) {
        if (!quiz.can_manage && RoomQuizzes.hasAnswered(quiz)) card.appendChild(this.renderScore(quiz));
        card.appendChild(this.renderSummary(quiz));
        if (Array.isArray(quiz.leaderboard)) card.appendChild(this.renderLeaderboard(quiz, false));
        this.renderReview(
            card,
            quiz,
            quiz.questions.filter((question) => question.state === 'revealed')
        );
    }

    /**
     * Collapsible list of questions (builder preview, final review)
     */
    renderReview(card, quiz, questions) {
        if (questions.length === 0) return;
        const { createEl } = RoomQuizzes;
        const open = this.expanded.has(quiz.id);
        const toggle = createEl('button', 'poll-link-btn quiz-review-toggle');
        toggle.type = 'button';
        toggle.setAttribute('aria-expanded', String(open));
        toggle.append(
            createEl('i', open ? 'fas fa-chevron-up' : 'fas fa-chevron-down'),
            document.createTextNode(' ' + (open ? this.t('Hide questions') : this.t('Show questions')))
        );
        toggle.addEventListener('click', () => this.toggleReview(quiz.id));
        card.appendChild(toggle);
        if (!open) return;
        const list = createEl('div', 'quiz-questions');
        questions.forEach((question) => list.appendChild(this.renderQuestion(quiz, question, true)));
        card.appendChild(list);
    }

    renderScore(quiz) {
        const { createEl } = RoomQuizzes;
        const total = quiz.revealed_count;
        const score = createEl('div', 'quiz-score');
        score.append(
            createEl('i', 'fas fa-star'),
            createEl(
                'span',
                'quiz-score-text',
                RoomQuizzes.format(this.t('Your score: {score}/{total}'), { score: quiz.my_score, total })
            )
        );
        score.classList.toggle('is-perfect', total > 0 && quiz.my_score === total);
        return score;
    }

    renderSummary(quiz) {
        const { createEl } = RoomQuizzes;
        const summary = createEl('div', 'quiz-summary');
        summary.append(
            createEl(
                'span',
                'quiz-summary-participants',
                this.countLabel(quiz.participant_count, this.t('1 participant'), this.t('{count} participants'))
            )
        );
        if (quiz.participant_count > 0) {
            summary.append(
                createEl('span', 'poll-meta-sep', '·'),
                createEl(
                    'span',
                    'quiz-summary-average',
                    RoomQuizzes.format(this.t('Average score: {score}/{total}'), {
                        score: quiz.average_score,
                        total: quiz.revealed_count,
                    })
                )
            );
        }
        return summary;
    }

    renderLeaderboard(quiz, live) {
        const { createEl } = RoomQuizzes;
        const wrap = createEl('div', 'quiz-leaderboard-wrap');
        wrap.appendChild(createEl('div', 'poll-form-label', live ? this.t('Live ranking') : this.t('Leaderboard')));
        const entries = Array.isArray(quiz.leaderboard) ? quiz.leaderboard : [];
        if (entries.length === 0) {
            wrap.appendChild(this.renderNote(this.t('No answers yet')));
            return wrap;
        }
        const list = createEl('ol', 'quiz-leaderboard');
        const ranks = RoomQuizzes.getRanks(entries);
        entries.forEach((entry, index) => {
            const rank = ranks[index];
            const item = createEl('li', 'quiz-leaderboard-item');
            item.dataset.rank = String(rank);
            item.append(
                createEl('span', 'quiz-rank', String(rank)),
                RoomQuizzes.noTranslate(createEl('span', 'quiz-leaderboard-name', String(entry.name))),
                createEl('span', 'quiz-leaderboard-score', `${Number(entry.score) || 0}/${quiz.revealed_count}`)
            );
            list.appendChild(item);
        });
        wrap.appendChild(list);
        return wrap;
    }

    renderQuestion(quiz, question, numbered) {
        const { createEl } = RoomQuizzes;
        const block = createEl('section', 'quiz-question');
        block.dataset.index = String(question.index);
        block.dataset.state = question.state;

        const head = createEl('div', 'quiz-question-head');
        if (numbered) {
            head.appendChild(
                createEl('span', 'quiz-question-number', this.t('Question {n}').replace('{n}', question.index + 1))
            );
        }
        if (quiz.can_manage && quiz.status !== 'ready') {
            const states = {
                pending: this.t('Not asked yet'),
                open: this.t('Accepting answers'),
                revealed: this.t('Answer revealed'),
            };
            head.appendChild(createEl('span', 'quiz-question-state', states[question.state] || ''));
            if (Number.isInteger(question.total_answers)) {
                head.appendChild(
                    createEl(
                        'span',
                        'quiz-question-answers',
                        this.countLabel(question.total_answers, this.t('1 answer'), this.t('{count} answers'))
                    )
                );
            }
        }
        if (head.childNodes.length > 0) block.appendChild(head);

        block.appendChild(RoomQuizzes.noTranslate(createEl('h5', 'quiz-question-text', question.text)));

        const list = createEl('ol', 'poll-options');
        question.options.forEach((option, index) => list.appendChild(this.renderOption(quiz, question, option, index)));
        block.appendChild(list);
        return block;
    }

    renderOption(quiz, question, option, index) {
        const { createEl } = RoomQuizzes;
        const hasResults = Number.isInteger(option.votes);
        const votes = hasResults ? option.votes : 0;
        const pct = RoomQuizzes.percent(votes, question.total_answers || 0);
        const selected = question.my_answer === index;
        const known = question.correct >= 0;
        const isCorrect = known && question.correct === index;

        const item = createEl('li', 'poll-option-item');
        const btn = createEl('button', 'poll-option quiz-option');
        btn.type = 'button';
        btn.disabled = !RoomQuizzes.canAnswer(quiz, question);
        btn.classList.toggle('is-selected', selected);
        btn.classList.toggle('is-correct', isCorrect);
        btn.classList.toggle('is-wrong', known && selected && !isCorrect);
        btn.setAttribute('aria-pressed', String(selected));
        btn.addEventListener('click', () => this.answer(quiz.id, question.index, index));

        const bar = createEl('span', 'poll-option-bar');
        bar.style.width = pct + '%';
        const check = createEl(
            'i',
            selected ? 'fas fa-circle-check poll-option-check' : 'far fa-circle poll-option-check'
        );
        const text = RoomQuizzes.noTranslate(createEl('span', 'poll-option-text', option.text));
        btn.append(bar, check, text);
        if (known && (isCorrect || selected)) {
            const mark = createEl('i', isCorrect ? 'fas fa-check quiz-option-mark' : 'fas fa-xmark quiz-option-mark');
            mark.setAttribute('aria-label', isCorrect ? this.t('Correct answer') : this.t('Wrong answer'));
            mark.setAttribute('role', 'img');
            btn.appendChild(mark);
        }
        if (hasResults) btn.appendChild(createEl('span', 'poll-option-result', `${pct}% (${votes})`));
        item.appendChild(btn);

        // Names: color coded once the correct option is known (always for the managers)
        if (Array.isArray(option.voters) && option.voters.length > 0) {
            const voters = RoomQuizzes.noTranslate(createEl('div', 'quiz-voters'));
            option.voters.forEach((name) => {
                const chip = createEl('span', 'quiz-voter', String(name));
                if (known) chip.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
                voters.appendChild(chip);
            });
            item.appendChild(voters);
        }
        return item;
    }

    renderActions(quiz) {
        const actions = RoomQuizzes.createEl('div', 'poll-card-actions');
        const add = (label, icon, className, action) =>
            actions.appendChild(this.button(label, icon, className, () => this.manage(quiz.id, action)));

        if (quiz.status === 'ready') {
            add(this.t('Start quiz'), 'fas fa-play', 'poll-btn-primary', 'start');
        } else if (quiz.status === 'running') {
            const current = quiz.questions.find((item) => item.index === quiz.current);
            const isLast = quiz.current >= quiz.question_count - 1;
            if (quiz.mode === 'step' && current?.state === 'open') {
                add(this.t('Reveal answer'), 'fas fa-eye', 'poll-btn-primary', 'reveal');
            } else if (quiz.mode === 'step' && !isLast) {
                add(this.t('Next question'), 'fas fa-forward', 'poll-btn-primary', 'next');
            }
            const finishPrimary = quiz.mode === 'all' || (isLast && current?.state === 'revealed');
            add(this.t('Finish quiz'), 'fas fa-flag-checkered', finishPrimary ? 'poll-btn-primary' : '', 'finish');
        } else if (quiz.status === 'finished' && Array.isArray(quiz.leaderboard)) {
            actions.appendChild(
                this.button(this.t('Download results'), 'fas fa-download', 'poll-btn-primary', () =>
                    this.downloadResults(quiz.id)
                )
            );
        }
        actions.appendChild(
            this.button(this.t('Save to file'), 'fas fa-floppy-disk', '', () => this.saveQuiz(quiz.id))
        );
        actions.appendChild(
            this.button(this.t('Delete'), 'fas fa-trash', 'poll-btn-danger', () => this.remove(quiz.id))
        );
        return actions;
    }

    // ####################################################
    // SAVE / LOAD (quiz files, to reuse a quiz later)
    // ####################################################

    /**
     * @param {string} title
     * @returns {string} file name friendly title, '' when nothing is left
     */
    static slug(title) {
        return String(title || '')
            .normalize('NFKC')
            .replace(/[^\p{L}\p{N}]+/gu, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40);
    }

    /**
     * @param {object} definition { title, mode, anonymous, questions: [{ question, options, correct }] }
     * @returns {string} quiz file content
     */
    static serializeDefinition(definition) {
        const file = {
            type: RoomQuizzes.FILE_TYPE,
            version: RoomQuizzes.FILE_VERSION,
            title: definition.title,
            mode: definition.mode,
            anonymous: definition.anonymous,
            questions: definition.questions.map(({ question, options, correct }) => ({ question, options, correct })),
        };
        return JSON.stringify(file, null, 2) + '\n';
    }

    saveDefinition(definition) {
        const json = RoomQuizzes.serializeDefinition(definition);
        const name = `Quiz-${RoomQuizzes.slug(definition.title) || 'quiz'}.json`;
        this.download(new Blob([json], { type: 'application/json' }), name);
    }

    /**
     * The builder content as it is (a draft can be saved): empty options are left out
     * @returns {object|null} definition, null when the builder is empty
     */
    getFormDefinition() {
        const questions = this.getQuestionBlocks()
            .map((block) => {
                const options = [];
                let correct = -1;
                for (const row of RoomQuizzes.getOptionRows(block)) {
                    const text = row.querySelector('.quiz-form-option-text').value.trim();
                    if (!text) continue;
                    if (row.querySelector('.quiz-form-correct').checked) correct = options.length;
                    options.push(text);
                }
                return { question: block.querySelector('.quiz-form-question-text').value.trim(), options, correct };
            })
            .filter((question) => question.question || question.options.length > 0);
        const title = this.el.title.value.trim();
        if (!title && questions.length === 0) return null;
        return {
            title,
            mode: this.el.modeAll.checked ? 'all' : 'step',
            anonymous: this.el.anonymous.checked,
            questions,
        };
    }

    saveForm() {
        const definition = this.getFormDefinition();
        if (!definition) return this.formError('The quiz is empty', this.el.title);
        this.saveDefinition(definition);
    }

    /**
     * Save a quiz of the room (managers see every question and its correct option)
     * @param {string} quizId
     */
    saveQuiz(quizId) {
        const quiz = this.quizzes.get(quizId);
        if (!quiz?.can_manage || quiz.questions.length !== quiz.question_count) return;
        this.saveDefinition({
            title: quiz.title,
            mode: quiz.mode,
            anonymous: quiz.anonymous,
            questions: [...quiz.questions]
                .sort((a, b) => a.index - b.index)
                .map((question) => ({
                    question: question.text,
                    options: question.options.map((option) => option.text),
                    correct: question.correct,
                })),
        });
    }

    /**
     * Validate an untrusted quiz file, clamped to the builder limits
     * @param {string} text file content
     * @returns {object|null} definition
     */
    static parseDefinition(text) {
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            return null;
        }
        if (!data || typeof data !== 'object' || data.type !== RoomQuizzes.FILE_TYPE) return null;
        if (!Array.isArray(data.questions) || data.questions.length < RoomQuizzes.MIN_QUESTIONS) return null;
        if (data.questions.length > RoomQuizzes.MAX_QUESTIONS) return null;

        const toText = (value, max) =>
            typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : '';
        const questions = [];
        for (const raw of data.questions) {
            if (!raw || typeof raw !== 'object' || !Array.isArray(raw.options)) return null;
            const options = raw.options
                .slice(0, RoomQuizzes.MAX_OPTIONS)
                .map((option) => toText(option, RoomQuizzes.MAX_OPTION_LENGTH));
            const correct =
                Number.isInteger(raw.correct) &&
                raw.correct >= 0 &&
                raw.correct < options.length &&
                options[raw.correct]
                    ? raw.correct
                    : -1;
            questions.push({ question: toText(raw.question, RoomQuizzes.MAX_QUESTION_LENGTH), options, correct });
        }
        return {
            title: toText(data.title, RoomQuizzes.MAX_TITLE_LENGTH),
            mode: data.mode === 'all' ? 'all' : 'step',
            anonymous: data.anonymous !== false,
            questions,
        };
    }

    /**
     * Fill the builder with a definition (replaces its content), to review it before creating the quiz
     * @param {object} definition parsed definition
     */
    loadDefinition(definition) {
        this.el.title.value = definition.title;
        this.el.modeStep.checked = definition.mode !== 'all';
        this.el.modeAll.checked = definition.mode === 'all';
        this.el.anonymous.checked = definition.anonymous;
        this.el.questions.replaceChildren();
        for (const { question, options, correct } of definition.questions) {
            const block = this.addQuestion();
            block.querySelector('.quiz-form-question-text').value = question;
            while (RoomQuizzes.getOptionRows(block).length < options.length) this.addOption(block, '');
            const rows = RoomQuizzes.getOptionRows(block);
            options.forEach((text, index) => (rows[index].querySelector('.quiz-form-option-text').value = text));
            if (correct >= 0) rows[correct].querySelector('.quiz-form-correct').checked = true;
        }
        this.showForm();
    }

    /**
     * @param {File} file
     * @returns {Promise<boolean>} loaded
     */
    async loadFile(file) {
        if (!file || file.size > RoomQuizzes.MAX_FILE_SIZE) {
            this.onError(this.errorMessage('Invalid quiz file'));
            return false;
        }
        let definition = null;
        try {
            definition = RoomQuizzes.parseDefinition(await RoomQuizzes.readText(file));
        } catch {
            definition = null;
        }
        if (!definition) {
            this.onError(this.errorMessage('Invalid quiz file'));
            return false;
        }
        this.loadDefinition(definition);
        this.onLoaded(definition.title);
        return true;
    }

    static readText(file) {
        if (typeof file.text === 'function') return file.text();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    // ####################################################
    // RESULTS EXPORT (managers, finished quiz)
    // ####################################################

    /**
     * Ranks of a score sorted leaderboard: same score, same rank
     * @param {object[]} entries [{ score }] best first
     * @returns {number[]}
     */
    static getRanks(entries) {
        let rank = 0;
        let previous = null;
        return entries.map((entry, index) => {
            if (entry.score !== previous) rank = index + 1;
            previous = entry.score;
            return rank;
        });
    }

    /**
     * One CSV field. Values starting like a formula are prefixed with a quote, so a crafted
     * participant name or answer cannot run as a formula in a spreadsheet (CSV injection).
     * @param {*} value
     * @returns {string}
     */
    static csvField(value) {
        let text = value === undefined || value === null ? '' : String(value);
        if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
    }

    /**
     * Results table: one row per participant with the chosen option of every asked question,
     * preceded by the correct answers.
     * @param {object} quiz public quiz (manager view)
     * @returns {string|null} CSV, null when the results are not available
     */
    buildResultsCsv(quiz) {
        if (!quiz?.can_manage || !Array.isArray(quiz.leaderboard)) return null;
        const questions = quiz.questions.filter((question) => question.state !== 'pending');
        const optionText = (question, option) => (option >= 0 ? question.options[option]?.text || '' : '');
        const entries = quiz.leaderboard;
        const ranks = RoomQuizzes.getRanks(entries);

        const rows = [
            [
                this.t('Rank'),
                this.t('Participant'),
                RoomQuizzes.format(this.t('Score (out of {total})'), { total: quiz.revealed_count }),
                ...questions.map((question) => `${question.index + 1}. ${question.text}`),
            ],
            ['', this.t('Correct answer'), '', ...questions.map((question) => optionText(question, question.correct))],
            ...entries.map((entry, index) => [
                ranks[index],
                entry.name,
                Number(entry.score) || 0,
                ...questions.map((question) =>
                    optionText(question, Array.isArray(entry.answers) ? entry.answers[question.index] : -1)
                ),
            ]),
        ];
        // BOM: spreadsheet apps then read the file as UTF-8
        return '\uFEFF' + rows.map((row) => row.map(RoomQuizzes.csvField).join(',')).join('\r\n') + '\r\n';
    }

    /**
     * @param {string} title quiz title
     * @returns {string} file name
     */
    static resultsFileName(title) {
        const date = new Date().toISOString().slice(0, 10);
        return `Quiz-${RoomQuizzes.slug(title) || 'results'}-${date}.csv`;
    }

    downloadResults(quizId) {
        const quiz = this.quizzes.get(quizId);
        if (!quiz || quiz.status !== 'finished') return;
        const csv = this.buildResultsCsv(quiz);
        if (!csv) return;
        this.download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), RoomQuizzes.resultsFileName(quiz.title));
    }

    static saveBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            link.remove();
            URL.revokeObjectURL(url);
        }, 100);
    }
}
