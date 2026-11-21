'use strict';

/**
 * Server-authoritative room quizzes.
 *
 * A quiz is a sequence of multiple-choice questions with one correct option each. Like the
 * polls, the server keeps the single source of truth (one answer per participant, keyed by a
 * server-bound voter key) and serializes the state per recipient:
 *  - the quiz managers (creator or presenter) see every question, the correct options and
 *    who answered what, live;
 *  - the participants only see the questions asked so far and their own answer; the correct
 *    option, the results and (unless anonymous) the names are sent once a question is revealed.
 *
 * Modes:
 *  - 'step': the manager opens one question at a time, reveals it, then moves to the next one;
 *  - 'all':  every question is open at once until the manager finishes the quiz.
 *
 * Texts are stored as plain text and must be rendered with textContent on the client.
 */

const crypto = require('crypto');
const { cleanText, cleanName } = require('./roomPolls');

const LIMITS = Object.freeze({
    MAX_QUIZZES_PER_ROOM: 10,
    MIN_QUESTIONS: 1,
    MAX_QUESTIONS: 30,
    MIN_OPTIONS: 2,
    MAX_OPTIONS: 6,
    MAX_TITLE_LENGTH: 120,
    MAX_QUESTION_LENGTH: 300,
    MAX_OPTION_LENGTH: 120,
});

const MODES = Object.freeze(['step', 'all']);
const MAX_AVATAR_URL_LENGTH = 2048;

const rooms = new Map(); // roomId -> Map(quizId -> quiz)

/**
 * Participant avatar URL, shared with the names (only http(s), like the peer avatar of the room)
 * @param {*} value
 * @returns {string} normalized URL, '' when none or unsafe
 */
function cleanAvatar(value) {
    if (typeof value !== 'string' || !value || value.length > MAX_AVATAR_URL_LENGTH) return '';
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch {
        return '';
    }
}

function getRoom(roomId, create = false) {
    let room = rooms.get(roomId);
    if (!room && create) {
        room = new Map();
        rooms.set(roomId, room);
    }
    return room;
}

/**
 * @param {string} roomId
 * @param {string} quizId
 * @returns {object|undefined} internal quiz
 */
function get(roomId, quizId) {
    if (typeof quizId !== 'string') return undefined;
    return getRoom(roomId)?.get(quizId);
}

/**
 * @param {string} roomId
 * @returns {object[]} internal quizzes, oldest first
 */
function list(roomId) {
    const room = getRoom(roomId);
    return room ? [...room.values()] : [];
}

/**
 * Validate one question of the builder
 * @param {*} raw { question, options, correct }
 * @returns {{ question?: object, error?: string }}
 */
function parseQuestion(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.options)) return { error: 'Invalid request' };
    const text = cleanText(raw.question, LIMITS.MAX_QUESTION_LENGTH);
    if (!text) return { error: 'Every question needs a text' };
    if (!Number.isInteger(raw.correct)) return { error: 'Mark the correct answer of every question' };

    const options = [];
    const seen = new Map(); // lowercased text -> kept index
    let correct = -1;
    // Bound the work done on untrusted input before validating
    raw.options.slice(0, LIMITS.MAX_OPTIONS * 2).forEach((value, rawIndex) => {
        const option = cleanText(value, LIMITS.MAX_OPTION_LENGTH);
        if (!option) return;
        const key = option.toLowerCase();
        if (!seen.has(key)) {
            seen.set(key, options.length);
            options.push(option);
        }
        // A duplicate of the correct option points to the kept one
        if (rawIndex === raw.correct) correct = seen.get(key);
    });
    if (options.length < LIMITS.MIN_OPTIONS) return { error: 'At least 2 different options are required' };
    if (options.length > LIMITS.MAX_OPTIONS) return { error: 'Too many options' };
    if (correct < 0) return { error: 'Mark the correct answer of every question' };

    return { question: { text, options, correct, state: 'pending', answers: new Map() } };
}

/**
 * Create a quiz (not started yet)
 * @param {string} roomId
 * @param {object} data { title, mode, anonymous, questions: [{ question, options, correct }] }
 * @param {object} creator { key, name }
 * @returns {{ quiz?: object, error?: string }}
 */
function create(roomId, data, creator) {
    if (!roomId || !creator?.key) return { error: 'Invalid request' };
    if (!data || typeof data !== 'object') return { error: 'Invalid request' };

    const title = cleanText(data.title, LIMITS.MAX_TITLE_LENGTH);
    if (!title) return { error: 'The quiz title is required' };
    if (!MODES.includes(data.mode)) return { error: 'Invalid request' };

    if (!Array.isArray(data.questions)) return { error: 'Invalid request' };
    if (data.questions.length < LIMITS.MIN_QUESTIONS) return { error: 'At least one question is required' };
    if (data.questions.length > LIMITS.MAX_QUESTIONS) return { error: 'Too many questions' };
    const questions = [];
    for (const raw of data.questions) {
        const { question, error } = parseQuestion(raw);
        if (error) return { error };
        questions.push(question);
    }

    const room = getRoom(roomId, true);
    if (room.size >= LIMITS.MAX_QUIZZES_PER_ROOM) return { error: 'The maximum number of quizzes has been reached' };

    const quiz = {
        id: crypto.randomUUID(),
        title,
        mode: data.mode,
        // Anonymous for the participants only: the managers always see who answered what
        anonymous: data.anonymous === true,
        status: 'ready', // 'ready' | 'running' | 'finished'
        current: -1, // step mode: index of the question being asked
        creatorKey: creator.key,
        creatorName: cleanName(creator.name),
        createdAt: Date.now(),
        questions,
        participants: new Map(), // voterKey -> { name, avatar } (everyone who answered at least once)
    };
    room.set(quiz.id, quiz);
    return { quiz };
}

/**
 * Start the quiz: open the first question (step) or every question (all)
 * @param {object} quiz internal quiz
 * @returns {{ quiz?: object, error?: string }}
 */
function start(quiz) {
    if (!quiz) return { error: 'Quiz not found' };
    if (quiz.status !== 'ready') return { error: 'The quiz has already started' };
    quiz.status = 'running';
    if (quiz.mode === 'step') {
        quiz.current = 0;
        quiz.questions[0].state = 'open';
    } else {
        quiz.questions.forEach((question) => (question.state = 'open'));
    }
    return { quiz };
}

/**
 * Step mode: stop the answers to the current question and show its correct option
 * @param {object} quiz internal quiz
 * @returns {{ quiz?: object, error?: string }}
 */
function reveal(quiz) {
    if (!quiz) return { error: 'Quiz not found' };
    if (quiz.status !== 'running' || quiz.mode !== 'step') return { error: 'Invalid request' };
    const question = quiz.questions[quiz.current];
    if (question.state !== 'open') return { error: 'Invalid request' };
    question.state = 'revealed';
    return { quiz };
}

/**
 * Step mode: reveal the current question (if still open) and open the next one
 * @param {object} quiz internal quiz
 * @returns {{ quiz?: object, error?: string }}
 */
function next(quiz) {
    if (!quiz) return { error: 'Quiz not found' };
    if (quiz.status !== 'running' || quiz.mode !== 'step') return { error: 'Invalid request' };
    if (quiz.current >= quiz.questions.length - 1) return { error: 'This is the last question' };
    quiz.questions[quiz.current].state = 'revealed';
    quiz.current++;
    quiz.questions[quiz.current].state = 'open';
    return { quiz };
}

/**
 * Finish the quiz: every asked question is revealed, the questions never asked stay hidden
 * @param {object} quiz internal quiz
 * @returns {{ quiz?: object, error?: string }}
 */
function finish(quiz) {
    if (!quiz) return { error: 'Quiz not found' };
    if (quiz.status !== 'running') return { error: 'Invalid request' };
    quiz.status = 'finished';
    quiz.questions.forEach((question) => {
        if (question.state === 'open') question.state = 'revealed';
    });
    return { quiz };
}

/**
 * Answer, change (option index) or retract (-1) the answer to an open question
 * @param {string} roomId
 * @param {string} quizId
 * @param {object} voter { key, name }
 * @param {number} questionIndex
 * @param {number} option
 * @returns {{ quiz?: object, error?: string }}
 */
function answer(roomId, quizId, voter, questionIndex, option) {
    const quiz = get(roomId, quizId);
    if (!quiz) return { error: 'Quiz not found' };
    if (!voter?.key || !Number.isInteger(questionIndex) || !Number.isInteger(option)) {
        return { error: 'Invalid request' };
    }
    // The creator knows the answers
    if (isCreator(quiz, voter.key)) return { error: 'Invalid request' };
    const question = quiz.questions[questionIndex];
    if (quiz.status !== 'running' || !question || question.state !== 'open') {
        return { error: 'This question is no longer accepting answers' };
    }
    if (option < -1 || option >= question.options.length) return { error: 'Invalid request' };
    if (option === -1) {
        question.answers.delete(voter.key);
    } else {
        const name = cleanName(voter.name);
        const avatar = cleanAvatar(voter.avatar);
        question.answers.set(voter.key, { option, name, avatar });
        quiz.participants.set(voter.key, { name, avatar });
    }
    return { quiz };
}

/**
 * @param {string} roomId
 * @param {string} quizId
 * @returns {boolean} removed
 */
function remove(roomId, quizId) {
    const room = getRoom(roomId);
    if (!room || typeof quizId !== 'string') return false;
    const removed = room.delete(quizId);
    if (room.size === 0) rooms.delete(roomId);
    return removed;
}

/**
 * @param {object} quiz internal quiz
 * @param {string} key voter key
 * @returns {boolean}
 */
function isCreator(quiz, key) {
    return !!quiz && !!key && quiz.creatorKey === key;
}

/**
 * Scores on the revealed questions
 * @param {object} quiz internal quiz
 * @returns {object[]} [{ key, name, avatar, score }] best first, then by name
 */
function getScores(quiz) {
    const revealed = quiz.questions.filter((question) => question.state === 'revealed');
    const scores = [...quiz.participants].map(([key, { name, avatar }]) => ({
        key,
        name,
        avatar,
        score: revealed.filter((question) => question.answers.get(key)?.option === question.correct).length,
    }));
    return scores.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/**
 * Recipient independent results, computed once per update and shared by every toPublic call of it
 * (a room broadcast would otherwise recount every answer for every recipient).
 * @param {object} quiz internal quiz
 * @returns {object} summary
 */
function summarize(quiz) {
    const scores = getScores(quiz);
    const total = scores.reduce((sum, entry) => sum + entry.score, 0);
    return {
        scores,
        scoreByKey: new Map(scores.map((entry) => [entry.key, entry.score])),
        averageScore: scores.length > 0 ? Math.round((total / scores.length) * 10) / 10 : 0,
        askedCount: quiz.questions.filter((question) => question.state !== 'pending').length,
        revealedCount: quiz.questions.filter((question) => question.state === 'revealed').length,
        // Per question: votes, voter names and their avatars by option
        tallies: quiz.questions.map((question) => {
            const votes = question.options.map(() => 0);
            const voters = question.options.map(() => []);
            const avatars = question.options.map(() => []);
            for (const { option, name, avatar } of question.answers.values()) {
                votes[option]++;
                voters[option].push(name);
                avatars[option].push(avatar || '');
            }
            return { votes, voters, avatars };
        }),
    };
}

/**
 * Serialize one question for one recipient
 * @param {object} question internal question
 * @param {number} index
 * @param {object} tally { votes, voters } of the question
 * @param {string} viewerKey
 * @param {boolean} manager
 * @param {boolean} seesNames recipient may see who answered what
 * @param {boolean} anonymous
 * @returns {object}
 */
function questionToPublic(question, index, tally, viewerKey, manager, seesNames, anonymous) {
    const revealed = question.state === 'revealed';
    const showResults = manager || revealed;
    const showNames = (manager && seesNames) || (revealed && !anonymous);
    const options = question.options.map((text, option) => {
        const view = { text };
        if (showResults) view.votes = tally.votes[option];
        if (showNames) {
            view.voters = [...tally.voters[option]];
            // Same order as voters ('' when the participant has no avatar)
            view.voter_avatars = [...tally.avatars[option]];
        }
        return view;
    });
    const myAnswer = viewerKey ? question.answers.get(viewerKey) : undefined;
    return {
        index,
        text: question.text,
        state: question.state,
        correct: showResults ? question.correct : -1,
        my_answer: myAnswer ? myAnswer.option : -1,
        total_answers: showResults ? question.answers.size : undefined,
        options,
    };
}

/**
 * Serialize a quiz for one recipient: voter keys never leave the server, the correct options
 * and the other answers only reach the participants once revealed.
 * Who answered what: presenters always; the creator (who may be a regular participant) only
 * when the quiz is not anonymous; everyone once revealed when the quiz is not anonymous.
 * @param {object} quiz internal quiz
 * @param {string} viewerKey recipient voter key
 * @param {boolean} [isPresenter] recipient is a presenter of the room
 * @param {object} [summary] summarize(quiz), to share it between the recipients of one update
 * @returns {object}
 */
function toPublic(quiz, viewerKey, isPresenter = false, summary = summarize(quiz)) {
    const isMine = isCreator(quiz, viewerKey);
    const manager = isMine || isPresenter === true;
    const seesNames = isPresenter === true || !quiz.anonymous;
    const finished = quiz.status === 'finished';
    const questions = [];
    quiz.questions.forEach((question, index) => {
        if (manager || question.state !== 'pending') {
            questions.push(
                questionToPublic(question, index, summary.tallies[index], viewerKey, manager, seesNames, quiz.anonymous)
            );
        }
    });

    const view = {
        id: quiz.id,
        title: quiz.title,
        mode: quiz.mode,
        anonymous: quiz.anonymous,
        status: quiz.status,
        current: quiz.current,
        created_at: quiz.createdAt,
        creator_name: quiz.creatorName,
        is_mine: isMine,
        can_manage: manager,
        question_count: quiz.questions.length,
        asked_count: summary.askedCount,
        revealed_count: summary.revealedCount,
        participant_count: quiz.participants.size,
        my_score: summary.scoreByKey.get(viewerKey) || 0,
        average_score: summary.averageScore,
        questions,
    };
    // Live ranking for the managers allowed to see the names, final ranking for everyone unless anonymous
    if (manager && seesNames) {
        // Per participant answers (option index or -1, by question index) for the results export
        view.leaderboard = summary.scores.map(({ key, name, avatar, score }) => ({
            name,
            avatar,
            score,
            answers: quiz.questions.map((question) => question.answers.get(key)?.option ?? -1),
        }));
    } else if (finished && !quiz.anonymous) {
        view.leaderboard = summary.scores.map(({ name, avatar, score }) => ({ name, avatar, score }));
    }
    return view;
}

/**
 * Drop all quizzes of a room (room closed)
 * @param {string} roomId
 */
function clear(roomId) {
    rooms.delete(roomId);
}

function reset() {
    rooms.clear();
}

module.exports = {
    LIMITS,
    MODES,
    create,
    start,
    reveal,
    next,
    finish,
    answer,
    remove,
    get,
    list,
    isCreator,
    getScores,
    summarize,
    toPublic,
    clear,
    reset,
};
