'use strict';

// npx mocha tests/test-handGesture.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const handGestureSource = fs.readFileSync(path.join(ROOT, 'public/js/handGesture.js'), 'utf8');
const clientHtml = fs.readFileSync(path.join(ROOT, 'public/views/client.html'), 'utf8');
const localStorageSource = fs.readFileSync(path.join(ROOT, 'public/js/localStorage.js'), 'utf8');

const HandGesture = require('../public/js/handGesture.js');

describe('Hand Gesture Raise-Hand Detection', () => {
    describe('GestureTracker state machine', () => {
        let tracker;

        beforeEach(() => {
            tracker = new HandGesture.GestureTracker({
                holdDurationMs: 2000,
                cooldownMs: 4000,
            });
        });

        it('starts in idle state with 0 progress', () => {
            const res = tracker.update(false, 1000);
            assert.equal(res.status, 'idle');
            assert.equal(res.progress, 0);
        });

        it('tracks holding state and increases progress as time elapses', () => {
            let res = tracker.update(true, 1000);
            assert.equal(res.status, 'holding');
            assert.equal(res.progress, 0);

            res = tracker.update(true, 2000); // 1000ms elapsed out of 2000ms
            assert.equal(res.status, 'holding');
            assert.equal(res.progress, 0.5);

            res = tracker.update(true, 2500); // 1500ms elapsed
            assert.equal(res.status, 'holding');
            assert.equal(res.progress, 0.75);
        });

        it('cancels and resets progress if hand is dropped before 2 seconds', () => {
            tracker.update(true, 1000);
            tracker.update(true, 2000); // at 50%
            const dropped = tracker.update(false, 2500); // hand lowered
            assert.equal(dropped.status, 'idle');
            assert.equal(dropped.progress, 0);

            // Resuming later starts fresh from 0
            const restarted = tracker.update(true, 3000);
            assert.equal(restarted.status, 'holding');
            assert.equal(restarted.progress, 0);
        });

        it('triggers when held for the full 2 seconds', () => {
            tracker.update(true, 1000);
            tracker.update(true, 2000);
            const triggered = tracker.update(true, 3000); // 2000ms elapsed!
            assert.equal(triggered.status, 'triggered');
            assert.equal(triggered.progress, 1.0);
        });

        it('enters cooldown after triggering and ignores further palms until cooldown expires', () => {
            tracker.update(true, 1000);
            tracker.update(true, 3000); // Triggered at t=3000

            // During cooldown (4000ms duration, until t=7000)
            const cooling = tracker.update(true, 4000);
            assert.equal(cooling.status, 'cooldown');
            assert.equal(cooling.progress, 0);

            const stillCooling = tracker.update(true, 6999);
            assert.equal(stillCooling.status, 'cooldown');

            // After cooldown expires
            const fresh = tracker.update(true, 7001);
            assert.equal(fresh.status, 'holding');
            assert.equal(fresh.progress, 0);
        });
    });

    describe('HandGestureManager UI integration', () => {
        let dom;
        let document;
        let progressContainer;
        let progressFill;
        let manager;

        beforeEach(() => {
            dom = new JSDOM(`<!doctype html><html><body>
                <div id="videoMediaContainer">
                    <div id="myVideoWrap">
                        <video id="myVideo"></video>
                        <div id="gestureProgress" class="gesture-hand-progress" hidden>
                            <svg><circle class="gesture-hand-circle-fill"></circle></svg>
                        </div>
                    </div>
                </div>
            </body></html>`);
            document = dom.window.document;
            progressContainer = document.getElementById('gestureProgress');
            progressFill = progressContainer.querySelector('.gesture-hand-circle-fill');

            manager = new HandGesture.HandGestureManager();
            manager.attachElements({
                video: document.getElementById('myVideo'),
                progressContainer,
                progressFill,
            });
        });

        it('shows progress UI and updates stroke offset while holding', () => {
            manager.updateUI(0.5, true);
            assert.equal(progressContainer.hasAttribute('hidden'), false);
            assert.equal(progressContainer.classList.contains('visible'), true);
            assert.equal(progressFill.style.strokeDashoffset, '50');

            manager.updateUI(0.9, true);
            assert.equal(progressFill.style.strokeDashoffset, '10');
        });

        it('hides progress UI when reset or not holding', () => {
            manager.updateUI(0.5, true);
            assert.equal(progressContainer.classList.contains('visible'), true);

            manager.updateUI(0, false);
            assert.equal(progressContainer.hasAttribute('hidden'), true);
            assert.equal(progressContainer.classList.contains('visible'), false);
        });

        it('fires onTrigger callback when driven by tick() with stubbed recognizer', () => {
            let triggered = false;
            manager.onTrigger = () => {
                triggered = true;
            };

            const video = document.getElementById('myVideo');
            Object.defineProperty(video, 'readyState', { value: 4, configurable: true });

            manager.recognizer = {
                recognize: sinon.stub().returns({
                    gestures: [[{ categoryName: 'Open_Palm', score: 0.95 }]],
                }),
            };

            manager.running = true;
            manager.enabled = true;

            const clock = sinon.useFakeTimers(1000);
            try {
                // Starts ticking
                manager.tick();
                assert.equal(triggered, false);
                assert.equal(manager.recognizer.recognize.calledOnce, true);

                // Advance clock by 1000ms (50% progress -> holding UI visible)
                clock.tick(1000);
                assert.equal(triggered, false);
                assert.equal(progressContainer.classList.contains('visible'), true);

                // Advance clock past 2000ms hold threshold -> triggered!
                clock.tick(1200);
                assert.equal(triggered, true);
            } finally {
                manager.stop();
                clock.restore();
            }
        });

        it('guards against concurrent start/stop loops via runToken', async () => {
            let tickCalls = 0;
            manager.tick = () => {
                tickCalls++;
            };
            manager.initRecognizer = () => new Promise((resolve) => setTimeout(resolve, 50));

            // Fast toggle: start, stop, start
            const p1 = manager.start();
            manager.stop();
            const p2 = manager.start();
            await Promise.all([p1, p2]);

            assert.equal(tickCalls, 1);
            manager.stop();
        });
    });

    describe('Presenter permissions and pre-join guard in client.js', () => {
        const clientSource = fs.readFileSync(path.join(ROOT, 'public/js/client.js'), 'utf8');

        it('checks presenter permissions in onTrigger before calling setMyHandStatus', () => {
            assert.match(clientSource, /if\s*\(notPresenter\s*&&\s*!buttons\.main\.showMyHandBtn\)/);
            assert.match(clientSource, /The presenter has disabled your ability to raise your hand/);
        });

        it('guards onTrigger and syncGestureHandRaise against firing in pre-join preview', () => {
            assert.match(clientSource, /Swal\.getPopup\?\.\(\)\?\.contains\(initUser\)/);
        });

        it('hides the gesture setting when the room has no video', () => {
            assert.match(clientSource, /gestureHandRaiseDiv\.hidden\s*=\s*!useVideo\s*\|\|\s*!buttons\.main\.showVideoBtn/);
        });
    });

    describe('Settings and markup wiring', () => {
        it('includes the gesture raise hand toggle in client.html settings', () => {
            assert.match(clientHtml, /id="switchGestureHandRaise"/);
            assert.match(clientHtml, /Raise hand by gesture/);
        });

        it('loads handGesture.js after background-effects.js and before client.js in client.html', () => {
            assert.match(clientHtml, /<script defer src="\.\.\/js\/handGesture\.js"><\/script>/);
            const gesturePos = clientHtml.indexOf('handGesture.js');
            const bgEffectsPos = clientHtml.indexOf('background-effects.js');
            const clientPos = clientHtml.indexOf('client.js');
            assert.ok(gesturePos > bgEffectsPos, 'handGesture.js must load after background-effects.js to share version');
            assert.ok(clientPos > gesturePos, 'handGesture.js must load before client.js');
        });

        it('defines gesture_hand_raise in LocalStorage P2P_SETTINGS defaults', () => {
            assert.match(localStorageSource, /gesture_hand_raise:\s*false/);
        });

        it('uses plain await import without new Function for CSP safety', () => {
            assert.match(handGestureSource, /await\s+import\(/);
            assert.doesNotMatch(handGestureSource, /new\s+Function\(/);
        });

        it('reuses BG_TASKS_VISION_VERSION for consistent MediaPipe release', () => {
            assert.match(handGestureSource, /BG_TASKS_VISION_VERSION/);
        });
    });
});
