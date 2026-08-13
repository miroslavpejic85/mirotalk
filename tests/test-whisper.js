'use strict';

const should = require('should');
const whisper = require('../app/src/lib/whisper');

/**
 * Unit tests for the Whisper transcription helpers.
 *
 * These cover the server-side logic that protects against invalid/oversized
 * audio, silence and Whisper hallucinations. They intentionally do NOT touch
 * the WebRTC media path: Whisper is an async side-channel only.
 */
describe('Whisper transcription helpers', () => {
    describe('normalizeWhisperText', () => {
        it('lowercases and strips spaces/punctuation/emoji', () => {
            whisper.normalizeWhisperText('Thanks, for watching! 🎬').should.equal('thanksforwatching');
        });
        it('returns empty string for punctuation-only input', () => {
            whisper.normalizeWhisperText('... !!! ---').should.equal('');
        });
        it('handles null/undefined safely', () => {
            whisper.normalizeWhisperText(null).should.equal('');
            whisper.normalizeWhisperText(undefined).should.equal('');
        });
    });

    describe('resolveAudioExtension', () => {
        it('maps common audio mime types to extensions', () => {
            whisper.resolveAudioExtension('audio/webm;codecs=opus').should.equal('webm');
            whisper.resolveAudioExtension('audio/mp4').should.equal('mp4');
            whisper.resolveAudioExtension('audio/wav').should.equal('wav');
            whisper.resolveAudioExtension('audio/mpeg').should.equal('mp3');
            whisper.resolveAudioExtension('audio/ogg;codecs=opus').should.equal('ogg');
        });
        it('falls back to webm for unknown/unsupported types', () => {
            whisper.resolveAudioExtension('video/mp4').should.equal('webm');
            whisper.resolveAudioExtension('').should.equal('webm');
            whisper.resolveAudioExtension(undefined).should.equal('webm');
        });
    });

    describe('decodeAudioPayload', () => {
        const maxBytes = 1024;

        it('decodes a valid base64 payload', () => {
            const original = Buffer.from('hello whisper');
            const b64 = original.toString('base64');
            const decoded = whisper.decodeAudioPayload(b64, maxBytes);
            Buffer.isBuffer(decoded).should.be.true();
            decoded.toString().should.equal('hello whisper');
        });
        it('rejects a non-string / missing payload (invalid audio)', () => {
            (() => whisper.decodeAudioPayload(undefined, maxBytes)).should.throw(/Invalid audio payload/);
            (() => whisper.decodeAudioPayload(12345, maxBytes)).should.throw(/Invalid audio payload/);
        });
        it('rejects an empty payload', () => {
            (() => whisper.decodeAudioPayload('', maxBytes)).should.throw(/Invalid audio payload/);
        });
        it('rejects oversized audio', () => {
            const big = Buffer.alloc(maxBytes + 1).toString('base64');
            (() => whisper.decodeAudioPayload(big, maxBytes)).should.throw(/too large/);
        });
    });

    describe('filterTranscript', () => {
        it('returns real speech unchanged (trimmed)', () => {
            whisper.filterTranscript('  Hello, how are you?  ', []).should.equal('Hello, how are you?');
        });
        it('drops known hallucination phrases (silence)', () => {
            whisper.filterTranscript('Thanks for watching!', []).should.equal('');
            whisper.filterTranscript('Please subscribe', []).should.equal('');
        });
        it('drops punctuation-only output', () => {
            whisper.filterTranscript('...', []).should.equal('');
        });
        it('drops low-confidence / high no-speech segments', () => {
            const segments = [
                { no_speech_prob: 0.9, avg_logprob: -0.8 },
                { no_speech_prob: 0.7, avg_logprob: -0.6 },
            ];
            whisper.filterTranscript('some uncertain words', segments).should.equal('');
        });
        it('keeps text when segments indicate real speech', () => {
            const segments = [{ no_speech_prob: 0.05, avg_logprob: -0.1 }];
            whisper.filterTranscript('clearly spoken words', segments).should.equal('clearly spoken words');
        });
        it('handles empty/whitespace input', () => {
            whisper.filterTranscript('   ', []).should.equal('');
            whisper.filterTranscript('', []).should.equal('');
        });
    });
});
