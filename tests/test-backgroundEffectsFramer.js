'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');

function loadFraming() {
    const context = vm.createContext({ navigator: { userAgent: 'node' } });
    vm.runInContext(
        fs.readFileSync(path.join(__dirname, '../public/js/background-effects-framer.js'), 'utf8'),
        context
    );
    return context.BackgroundFraming;
}

const close = (actual, expected, tolerance, message) =>
    assert.ok(Math.abs(actual - expected) <= tolerance, message || `expected ${actual} to be close to ${expected}`);
const sameCrop = (actual, expected, message) => {
    for (const key of ['x', 'y', 'width', 'height']) close(actual[key], expected[key], 1e-3, message);
};
// Objects created inside a vm context have other prototypes: compare their structure only
const plain = (value) => JSON.parse(JSON.stringify(value));

describe('camera auto framing', () => {
    const W = 1280;
    const H = 720;
    let Framing;

    beforeEach(() => {
        Framing = loadFraming();
    });

    // A face box (pixels) centered on (cx, cy)
    const face = (cx, cy, size = 120) => ({
        x: (cx - size / 2) / W,
        y: (cy - size / 2) / H,
        width: size / W,
        height: size / H,
    });

    // Detections every 100 ms, frames every 33 ms
    function run(framer, faces, from, to) {
        let crop = null;
        for (let t = from; t <= to; t += 33) {
            if (faces !== undefined && Math.floor(t / 100) !== Math.floor((t - 33) / 100)) framer.observe(faces, t);
            crop = framer.update(W, H, t);
        }
        return crop;
    }

    it('starts from the whole frame, then centers and zooms on a person off to the side', () => {
        const framer = new Framing.AutoFramer({ maxZoom: 2 });
        assert.deepEqual(plain(framer.update(W, H, 0)), { x: 0, y: 0, width: 1, height: 1 });
        const crop = run(framer, [face(400, 300)], 33, 4000);
        assert.ok(crop.width < 0.8, `zoomed in (crop ${crop.width})`);
        assert.ok(crop.width >= 0.5 - 1e-6, 'never beyond the maximum zoom');
        close(crop.width, crop.height, 1e-9, 'keeps the camera aspect ratio');
        close(crop.x + crop.width / 2, 400 / W, 0.01, 'face centered horizontally');
        const faceY = (300 / H - crop.y) / crop.height;
        close(faceY, 0.42, 0.02, 'face slightly above the middle (headroom)');
        // Head and shoulders: the face box is about 28% of the crop height
        close(120 / H / crop.height, 0.28, 0.02);
    });

    it('keeps the crop inside the frame and limits the zoom', () => {
        const framer = new Framing.AutoFramer({ maxZoom: 2 });
        const crop = run(framer, [face(40, 30, 20)], 0, 4000);
        close(crop.width, 0.5, 1e-3, 'a tiny face is zoomed only up to maxZoom');
        assert.ok(crop.x >= 0 && crop.y >= 0);
        assert.ok(crop.x + crop.width <= 1 + 1e-9 && crop.y + crop.height <= 1 + 1e-9);
    });

    it('frames everyone when several people are in view', () => {
        const framer = new Framing.AutoFramer({ maxZoom: 2 });
        const crop = run(framer, [face(300, 360), face(900, 360)], 0, 4000);
        assert.ok(crop.x <= (300 - 60) / W && crop.x + crop.width >= (900 + 60) / W, 'both faces inside the crop');
        close(crop.x + crop.width / 2, 600 / W, 0.02, 'centered between them');
    });

    it('stays still for small moves (dead zone) and follows bigger ones smoothly', () => {
        const framer = new Framing.AutoFramer({ maxZoom: 2 });
        const settled = run(framer, [face(640, 360)], 0, 4000);
        sameCrop(run(framer, [face(655, 365)], 4033, 6000), settled, 'a small move does not re-frame');

        framer.observe([face(860, 360)], 6033);
        const first = framer.update(W, H, 6033);
        assert.ok(first.x - settled.x < 0.02, 'no jump on the first frame');
        const moved = run(framer, [face(860, 360)], 6066, 9000);
        close(moved.x + moved.width / 2, 860 / W, 0.01, 'then re-centers on the person');
    });

    it('remembers a face missed by a detection, so the frame does not jump', () => {
        const framer = new Framing.AutoFramer({ maxZoom: 2, faceMemoryMs: 800 });
        const framed = run(framer, [face(400, 300)], 0, 4000);
        framer.observe([], 4100);
        sameCrop(run(framer, undefined, 4133, 4600), framed, 'one missed detection keeps the frame');
        assert.equal(framer.faces.length, 1);
        framer.observe([face(402, 300)], 4700);
        assert.equal(framer.faces.length, 1, 'the same person, not a second face');
    });

    it('holds the frame when everyone is briefly gone, then zooms back out', () => {
        const framer = new Framing.AutoFramer({ maxZoom: 2, holdMs: 1500, faceMemoryMs: 800 });
        const framed = run(framer, [face(640, 360)], 0, 4000);
        sameCrop(run(framer, [], 4033, 5300), framed, 'kept during the hold time');
        assert.deepEqual(plain(run(framer, [], 5333, 12000)), { x: 0, y: 0, width: 1, height: 1 });
    });

    it('restarts from the whole frame when the camera aspect ratio changes', () => {
        const framer = new Framing.AutoFramer();
        run(framer, [face(400, 300)], 0, 4000);
        assert.deepEqual(plain(framer.update(720, 1280, 4033)), { x: 0, y: 0, width: 1, height: 1 });
    });

    it('reads MediaPipe face detections in normalized units, dropping weak ones', () => {
        const result = {
            detections: [
                { boundingBox: { originX: 100, originY: 50, width: 64, height: 64 }, categories: [{ score: 0.9 }] },
                { boundingBox: { originX: 10, originY: 10, width: 20, height: 20 }, categories: [{ score: 0.2 }] },
                { boundingBox: { originX: 0, originY: 0, width: 0, height: 10 }, categories: [{ score: 0.9 }] },
            ],
        };
        assert.deepEqual(plain(Framing.normalizeDetections(result, 455, 256)), [
            { x: 100 / 455, y: 50 / 256, width: 64 / 455, height: 64 / 256 },
        ]);
        assert.deepEqual(plain(Framing.normalizeDetections(null, 455, 256)), []);
    });

    it('draws the crop of the source over the whole output', () => {
        const ctx = { drawImage: sinon.spy() };
        const source = {};
        Framing.drawCrop(ctx, source, 1920, 1080, { x: 0.25, y: 0.1, width: 0.5, height: 0.5 }, 1280, 720);
        assert.deepEqual(ctx.drawImage.firstCall.args, [source, 480, 108, 960, 540, 0, 0, 1280, 720]);
        assert.equal(Framing.isFullFrame(Framing.FULL_FRAME), true);
        assert.equal(Framing.isFullFrame({ x: 0, y: 0, width: 0.5, height: 0.5 }), false);
    });
});
