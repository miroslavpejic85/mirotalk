'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const client = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');

function extractFunction(name) {
    const start = client.search(new RegExp(`^(async )?function ${name}\\(`, 'm'));
    assert.notEqual(start, -1, `${name} not found`);
    const end = client.indexOf('\n}\n', start);
    return client.slice(start, end + 3);
}

function createContext() {
    const calls = [];
    const context = {
        console: { log() {} },
        alert: () => calls.push({ type: 'alert' }),
        userLog: (type, message) => calls.push({ type, message }),
        initMicrophoneSelect: { options: [], selectedIndex: -1 },
        audioInputSelect: { options: [], selectedIndex: -1 },
        calls,
    };
    vm.createContext(context);
    vm.runInContext(
        [
            'const bluetoothWarnedMics = new Set();',
            extractFunction('isLowQualityBluetoothMic'),
            extractFunction('getSelectedOptionText'),
            extractFunction('detectBluetoothHeadset'),
        ].join('\n'),
        context
    );
    return context;
}

function select(ctx, el, text) {
    ctx[el].options = [{ text }];
    ctx[el].selectedIndex = 0;
}

describe('Bluetooth headset detection', () => {
    const ctx = createContext();

    it('does not flag wired, USB or dongle headsets', () => {
        for (const name of [
            'Headset Microphone (Jabra Evolve2 30)',
            'Headset Microphone (Jabra Link 380)',
            'Microphone (Jabra SPEAK 510 USB)',
            'Headset Microphone (Poly Blackwire 3220 Series)',
            'Headset (Logitech USB Headset H390)',
            'Logitech USB Headset Mono',
            'Echo Cancelling Speakerphone (Jabra Speak 750)',
            'MacBook Pro Microphone',
            'Default',
            '',
        ]) {
            assert.equal(ctx.isLowQualityBluetoothMic(name), false, name);
        }
    });

    it('flags Bluetooth hands-free profiles', () => {
        for (const name of [
            'Headset (WH-1000XM4 Hands-Free AG Audio)',
            'Headset (Jabra Evolve2 65 Hands-Free)',
            'Headset (bluez_input.XX)',
            'HSP/HFP Headset',
            'Bluetooth SCO',
            'Bluetooth headset',
            'AirPods Pro',
        ]) {
            assert.equal(ctx.isLowQualityBluetoothMic(name), true, name);
        }
    });

    it('uses a native alert and warns once per device', () => {
        select(ctx, 'initMicrophoneSelect', 'Headset Microphone (Jabra Evolve2 30)');
        ctx.detectBluetoothHeadset(true);
        assert.equal(ctx.calls.length, 0);

        select(ctx, 'initMicrophoneSelect', 'AirPods Pro');
        ctx.detectBluetoothHeadset(true);
        select(ctx, 'audioInputSelect', 'AirPods Pro');
        ctx.detectBluetoothHeadset();
        assert.equal(ctx.calls.length, 1);
        assert.equal(ctx.calls[0].type, 'alert');
    });
});
