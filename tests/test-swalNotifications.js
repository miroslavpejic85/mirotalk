'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');

const read = (file) => fs.readFileSync(path.join(__dirname, '../', file), 'utf8');
const client = read('public/js/client.js');
const swalStyles = read('public/css/client.css');
const start = client.indexOf('function userLog(');
const end = client.indexOf('async function playSound(', start);

describe('SweetAlert notification UX', () => {
    let dom;
    let clock;
    let context;
    let swal;
    let visible;
    let close;
    let sound;

    beforeEach(() => {
        dom = new JSDOM('<!doctype html><body><button id="outside">Outside</button></body>');
        clock = sinon.useFakeTimers();
        visible = false;
        sound = sinon.spy();
        swal = {
            mixin: sinon.stub(),
            isVisible: () => visible,
            stopTimer: sinon.spy(),
            resumeTimer: sinon.spy(),
            fire: sinon.stub().callsFake(() => {
                visible = true;
                return new Promise((resolve) => {
                    close = (result = { isDismissed: true }) => {
                        visible = false;
                        resolve(result);
                    };
                });
            }),
        };
        swal.mixin.returns(swal);
        context = vm.createContext({
            window: { Swal: swal },
            Swal: swal,
            document: dom.window.document,
            setTimeout,
            swBg: '#161b22',
            playSound: sound,
            alert: sinon.spy(),
        });
        vm.runInContext(read('public/js/swal.js'), context);
        vm.runInContext(client.slice(start, end), context);
        vm.runInContext(read('public/js/utils.js'), context);
    });

    afterEach(() => {
        clock.restore();
        dom.window.close();
    });

    it('centers acknowledgement errors without an auto-dismiss timer', () => {
        context.userLog('error', 'Camera unavailable');
        const options = swal.fire.firstCall.args[0];
        assert.equal(options.position, 'center');
        assert.equal(options.icon, 'error');
        assert.equal(options.title, 'Error');
        assert.equal(options.text, 'Camera unavailable');
        assert.equal(options.timer, undefined);
        assert.equal(options.toast, undefined);
        sinon.assert.calledWithExactly(sound, 'alert');
    });

    for (const type of ['info', 'success', 'warning']) {
        it(`shows ${type} feedback unobtrusively with readable duration`, () => {
            context.userLog(type, 'Action feedback');
            const options = swal.fire.firstCall.args[0];
            assert.equal(options.toast, true);
            assert.equal(options.position, 'top-end');
            assert.equal(options.titleText, 'Action feedback');
            assert.equal(options.showConfirmButton, false);
            assert.equal(options.showCloseButton, true);
            assert.equal(options.timerProgressBar, true);
            assert.equal(options.timer, type === 'warning' ? 6000 : 4000);
        });
    }

    it('allows an explicit centered warning', () => {
        context.userLog('warning', 'Please acknowledge', 'center');
        const options = swal.fire.firstCall.args[0];
        assert.equal(options.title, 'Warning');
        assert.equal(options.position, 'center');
        assert.equal(options.toast, undefined);
    });

    it('honors position and fourth-argument duration for recoverable errors', () => {
        context.userLog('error', 'Whisper microphone error', 'top-end', 6000);
        const options = swal.fire.firstCall.args[0];
        assert.equal(options.toast, true);
        assert.equal(options.position, 'top-end');
        assert.equal(options.timer, 6000);
    });

    it('preserves numeric duration and rich HTML for legacy toast callers', () => {
        context.userLog('toast', '<b>Meeting status</b>', 5000);
        const options = swal.fire.firstCall.args[0];
        assert.equal(options.html, '<b>Meeting status</b>');
        assert.equal(options.timer, 5000);
    });

    it('honors top-center placement without treating the position as a timer', () => {
        context.userLog('toast', 'Room locked', 'top', 6000);
        const options = swal.fire.firstCall.args[0];
        assert.equal(options.position, 'top');
        assert.equal(options.timer, 6000);
    });

    it('keeps rich success content centered for careful reading', () => {
        context.userLog('success-html', '<p>Details</p>');
        const options = swal.fire.firstCall.args[0];
        assert.equal(options.position, 'center');
        assert.equal(options.title, 'Success');
        assert.equal(options.html, '<p>Details</p>');
        assert.equal(options.timer, undefined);
    });

    it('gives short clipboard feedback at least three seconds', () => {
        context.msgPopup('success', 'Message copied!', 'top-end', 1000);
        assert.equal(swal.fire.firstCall.args[0].timer, 3000);
    });

    it('dismisses immediate switch feedback after two seconds without a progress bar', () => {
        context.userLog('switch', 'Notify & sounds OFF');
        const options = swal.fire.firstCall.args[0];
        assert.equal(options.toast, true);
        assert.equal(options.position, 'top-end');
        assert.equal(options.html, 'Notify & sounds OFF');
        assert.equal(options.timer, 2000);
        assert.equal(options.timerProgressBar, false);
        assert.equal(options.showCloseButton, true);
    });

    it('preserves longer switch durations when requested', () => {
        context.userLog('switch', 'Setting changed', 5000);
        assert.equal(swal.fire.firstCall.args[0].timer, 5000);
        assert.equal(swal.fire.firstCall.args[0].timerProgressBar, false);
    });

    for (const label of [
        'Notify & sounds',
        'Share room on join',
        'Buttons always visible',
        'Chat opens pinned by default',
        'Push to talk',
        'Audio pitch bar',
        'Custom theme keep',
        'Keyboard shortcuts',
        'Chat will be shown, when you receive a new message',
        'You have disabled speech messages',
        'Caption will be shown, when you receive a new transcript',
        'Transcription will be sent to all participants',
        'Server-side Whisper transcription enabled',
    ]) {
        it(`uses immediate feedback for ${label}`, () => {
            const line = client.split('\n').find((line) => line.includes('userLog(') && line.includes(label));
            assert.ok(line?.includes("userLog('switch',"), `Missing switch feedback for ${label}`);
        });
    }

    it('reserves room for the close button beside multi-line toast messages', () => {
        assert.match(
            swalStyles,
            /\.swal2-popup\.swal2-toast \.swal2-title,\s*\.swal2-popup\.swal2-toast \.swal2-html-container \{[^}]*box-sizing:\s*border-box;[^}]*padding-inline-end:\s*4\.5em !important;/s
        );
        assert.match(swalStyles, /\.swal2-popup\.swal2-toast \.swal2-close \{[^}]*position:\s*absolute !important;/);
    });

    it('preserves an explicitly persistent toast', () => {
        context.toastMessage('info', 'Status', '', 'top', 0);
        assert.equal(swal.fire.firstCall.args[0].timer, 0);
    });

    it('retains titled rich toast content and longer warning defaults', () => {
        context.toastMessage('warning', 'Stop captions', '<b>Session notice</b>', 'top');
        const options = swal.fire.firstCall.args[0];
        assert.equal(options.title, 'Stop captions');
        assert.equal(options.html, '<b>Session notice</b>');
        assert.equal(options.position, 'top');
        assert.equal(options.timer, 6000);
    });

    it('queues feedback instead of replacing an active input or confirmation', async () => {
        visible = true;
        const first = context.userLog('toast', 'First update');
        const second = context.userLog('info', 'Second update');
        await clock.tickAsync(1000);
        sinon.assert.notCalled(swal.fire);
        visible = false;
        await clock.tickAsync(250);
        assert.equal(swal.fire.callCount, 1);
        assert.equal(swal.fire.firstCall.args[0].html, 'First update');
        close({ isDismissed: true });
        assert.equal((await first).isDismissed, true);
        await clock.tickAsync(250);
        assert.equal(swal.fire.callCount, 2);
        assert.equal(swal.fire.secondCall.args[0].titleText, 'Second update');
        close();
        await second;
        await clock.tickAsync(250);
        assert.equal(clock.countTimers(), 0);
    });

    it('pauses on hover or focus and resumes after leaving', () => {
        context.msgPopup('info', 'Readable feedback');
        const popup = dom.window.document.createElement('div');
        popup.innerHTML = '<button>Dismiss</button>';
        dom.window.document.body.appendChild(popup);
        const didOpen = sinon.spy();
        close();
        context.showSwalToast({ titleText: 'Test', didOpen });
        swal.fire.lastCall.args[0].didOpen(popup);
        sinon.assert.calledWithExactly(didOpen, popup);
        popup.dispatchEvent(new dom.window.Event('mouseenter'));
        sinon.assert.calledOnce(swal.stopTimer);
        popup.dispatchEvent(new dom.window.Event('mouseleave'));
        sinon.assert.calledOnce(swal.resumeTimer);
        popup.querySelector('button').focus();
        assert.equal(swal.stopTimer.callCount, 2);
        popup.dispatchEvent(new dom.window.Event('mouseleave'));
        assert.equal(swal.resumeTimer.callCount, 1);
        dom.window.document.getElementById('outside').focus();
        assert.equal(swal.resumeTimer.callCount, 2);
    });

    it('uses a non-blocking success toast on entry pages and centered validation', () => {
        context.popup('success', 'Room link copied to clipboard');
        assert.equal(swal.fire.firstCall.args[0].toast, true);
        assert.equal(swal.fire.firstCall.args[0].position, 'top-end');
        close();
        context.popup('warning', 'Room name empty!');
        assert.equal(swal.fire.lastCall.args[0].position, 'center');
        assert.equal(swal.fire.lastCall.args[0].title, 'Warning');
        assert.equal(swal.fire.lastCall.args[0].text, 'Room name empty!');
    });

    for (const confirmed of [false, true]) {
        it(`${confirmed ? 'performs' : 'cancels'} message deletion only after the centered confirmation`, async () => {
            const remove = sinon.spy();
            context.images = { delete: 'delete.svg' };
            context.getId = sinon.stub().returns({ remove });
            context.refreshMessageGrouping = sinon.spy();
            context.toggleMsgerEmptyNotice = sinon.spy();
            const functionStart = client.indexOf('function deleteMessage(');
            const functionEnd = client.indexOf('\nfunction copyToClipboard(', functionStart);
            vm.runInContext(client.slice(functionStart, functionEnd), context);
            context.deleteMessage('message-1');
            const options = swal.fire.firstCall.args[0];
            assert.equal(options.position, 'center');
            assert.equal(options.title, 'Delete');
            assert.equal(options.focusCancel, true);
            assert.equal(options.customClass.confirmButton, 'mirotalk-swal-destructive');
            sinon.assert.notCalled(remove);
            close({ isConfirmed: confirmed });
            await Promise.resolve();
            assert.equal(remove.callCount, confirmed ? 1 : 0);
            assert.equal(context.refreshMessageGrouping.callCount, confirmed ? 1 : 0);
        });
    }

    for (const confirmed of [false, true]) {
        it(`${confirmed ? 'sends' : 'does not send'} an eject action after confirmation`, async () => {
            context.images = { leave: 'leave.svg' };
            context.getId = sinon.stub().returns({ innerText: 'Participant' });
            context.sendToServer = sinon.spy();
            context.roomId = 'room-1';
            context.myPeerUUID = 'presenter-1';
            context.myPeerName = 'Presenter';
            const functionStart = client.indexOf('function kickOut(');
            const functionEnd = client.indexOf('\nfunction handleCaptionActions(', functionStart);
            vm.runInContext(client.slice(functionStart, functionEnd), context);
            context.kickOut('peer-1');
            const options = swal.fire.firstCall.args[0];
            assert.equal(options.position, 'center');
            assert.equal(options.focusCancel, true);
            assert.equal(options.inputPlaceholder, 'Reason (optional)');
            assert.equal(options.confirmButtonText, 'Eject participant');
            close({ isConfirmed: confirmed, value: '  Meeting ended  ' });
            await Promise.resolve();
            assert.equal(context.sendToServer.callCount, confirmed ? 1 : 0);
            if (confirmed) {
                assert.equal(context.sendToServer.firstCall.args[0], 'kickOut');
                assert.equal(context.sendToServer.firstCall.args[1].peer_id, 'peer-1');
                assert.equal(context.sendToServer.firstCall.args[1].peer_kicked_reason, 'Meeting ended');
            }
        });
    }

    for (const name of [
        'cleanMessages',
        'cleanCaptions',
        'deleteMessage',
        'disableAllPeers',
        'disablePeer',
        'confirmCleanBoard',
        'kickOut',
    ]) {
        it(`centers ${name} while preserving confirmation controls`, () => {
            const functionStart = client.indexOf(`function ${name}(`);
            const functionEnd = client.indexOf('\nfunction ', functionStart + 1);
            const source = client.slice(functionStart, functionEnd);
            assert.match(source, /position: 'center'/);
            assert.match(source, /showCancelButton: true/);
            assert.match(source, /if \(result.isConfirmed\)/);
        });
    }

    for (const view of ['landing', 'newcall', 'login']) {
        it(`loads the shared renderer before utility alerts on ${view}`, () => {
            const html = read(`public/views/${view}.html`);
            const shared = html.indexOf('src="../js/swal.js"');
            assert.ok(shared > html.indexOf('sweetalert2@'));
            assert.ok(shared < html.indexOf('src="../js/utils.js"'));
        });
    }
});
