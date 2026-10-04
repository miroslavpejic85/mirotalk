'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../public/js/swal.js'), 'utf8');

function luminance(channels) {
    return channels.reduce((sum, channel, index) => {
        const value = channel / 255;
        const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        return sum + linear * [0.2126, 0.7152, 0.0722][index];
    }, 0);
}

function contrast(channels, whiteInk) {
    const value = luminance(channels);
    return whiteInk ? 1.05 / (value + 0.05) : (value + 0.05) / 0.05;
}

describe('SweetAlert theme color pipeline', () => {
    let dom;
    let window;
    let canvasContext;

    beforeEach(() => {
        dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
        window = dom.window;
        window.Swal = { mixin: sinon.stub().returns({}) };
        window.CSS = { supports: (_property, color) => color !== 'not-a-color' };
        window.console.warn = sinon.spy();
        canvasContext = sinon.stub(window.HTMLCanvasElement.prototype, 'getContext').callsFake(() => ({
            fillStyle: '',
            fillRect() {},
            getImageData() {
                return {
                    data: Uint8ClampedArray.from([
                        ...this.fillStyle
                            .match(/[\d.]+/g)
                            .slice(0, 3)
                            .map(Number),
                        255,
                    ]),
                };
            },
        }));
        vm.runInContext(source, dom.getInternalVMContext());
    });

    afterEach(() => dom.window.close());

    for (const color of ['#000000', '#ffffff', '#777777', '#808080', '#ff0000', '#ffff00', '#315bd6', '#c62828']) {
        it(`preserves accessible primary and Join palettes for ${color}`, () => {
            const channels = window.getSwalColorChannels(color, '#315bd6');
            const original = Array.from(channels);
            const palette = window.getSwalButtonPalette(channels);
            assert.deepEqual(Object.keys(palette), ['background', 'ink', 'hover']);
            assert.equal(palette.background, `rgb(${channels.join(', ')})`);
            const whiteInk = palette.ink === '#ffffff';
            assert.ok(contrast(channels, whiteInk) >= 4.5);
            assert.equal(palette.hover, whiteInk ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)');
            const overlay = whiteInk ? 0 : 255;
            assert.ok(
                contrast(
                    channels.map((channel) => Math.round(channel * 0.9 + overlay * 0.1)),
                    whiteInk
                ) >= 4.5
            );

            const join = window.getSwalJoinPalette(channels);
            assert.deepEqual(Object.keys(join), ['background', 'hoverBackground']);
            const baseContrast = contrast(join.background.match(/\d+/g).map(Number), true);
            const hoverContrast = contrast(join.hoverBackground.match(/\d+/g).map(Number), true);
            assert.ok(baseContrast >= 6);
            assert.ok(hoverContrast >= 4.5 && hoverContrast < baseContrast);
            assert.deepEqual(Array.from(channels), original);
            assert.equal(canvasContext.callCount, 1);
        });
    }

    it('resolves only primary and neutral colors when Join has no overrides', () => {
        window.setSwalTheme({});
        assert.equal(canvasContext.callCount, 2);
        const style = window.document.documentElement.style;
        assert.equal(style.getPropertyValue('--swal-confirm-bg'), 'rgb(49, 91, 214)');
        assert.equal(style.getPropertyValue('--swal-confirm-ink'), '#ffffff');
        assert.equal(style.getPropertyValue('--swal-neutral-bg'), 'rgb(80, 88, 102)');
        assert.equal(style.getPropertyValue('--swal-join-bg'), 'rgb(48, 89, 209)');
        assert.equal(style.getPropertyValue('--swal-join-hover-bg'), 'rgb(65, 102, 213)');
    });

    it('preserves primary precedence and explicit Join background and hover overrides', () => {
        window.setSwalTheme({
            '--swal-confirm-bg': '#315bd6',
            '--room-switch-accent': '#ff0000',
            '--dd-color': '#ffff00',
            '--swal-neutral-bg': '#ffffff',
            '--select-bg': '#000000',
            '--swal-join-bg': '#000000',
            '--swal-join-hover-bg': '#ffffff',
        });
        assert.equal(canvasContext.callCount, 4);
        const style = window.document.documentElement.style;
        assert.equal(style.getPropertyValue('--swal-confirm-bg'), 'rgb(49, 91, 214)');
        assert.equal(style.getPropertyValue('--swal-neutral-bg'), 'rgb(255, 255, 255)');
        assert.equal(style.getPropertyValue('--swal-neutral-ink'), '#000000');
        assert.equal(style.getPropertyValue('--swal-join-bg'), 'rgb(0, 0, 0)');
        assert.ok(contrast(style.getPropertyValue('--swal-join-hover-bg').match(/\d+/g).map(Number), true) >= 4.5);
    });

    it('uses the room accent before the dropdown accent', () => {
        window.setSwalTheme({ '--room-switch-accent': '#ff0000', '--dd-color': '#ffff00' });
        assert.equal(window.document.documentElement.style.getPropertyValue('--swal-confirm-bg'), 'rgb(255, 0, 0)');
        window.setSwalTheme({ '--dd-color': '#ffff00' });
        assert.equal(window.document.documentElement.style.getPropertyValue('--swal-confirm-bg'), 'rgb(255, 255, 0)');
    });

    it('warns and normalizes the fallback for invalid colors', () => {
        const channels = window.getSwalColorChannels('not-a-color', '#315bd6');
        assert.deepEqual(Array.from(channels), [49, 91, 214]);
        sinon.assert.calledWithExactly(window.console.warn, 'Invalid dialog theme color:', 'not-a-color');
        assert.equal(window.document.body.children.length, 0);
    });

    it('reports an unavailable canvas explicitly', () => {
        canvasContext.returns(null);
        assert.throws(
            () => window.getSwalColorChannels('#315bd6', '#315bd6'),
            /Could not resolve dialog theme colors: canvas is unavailable/
        );
        assert.equal(window.document.body.children.length, 0);
    });
});
