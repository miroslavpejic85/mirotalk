'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const CalendarInvite = require('../public/js/calendarInvite.js');

const root = path.join(__dirname, '..');
const clientSource = fs.readFileSync(path.join(root, 'public/js/client.js'), 'utf8');
const clientHtml = fs.readFileSync(path.join(root, 'public/views/client.html'), 'utf8');

describe('calendarInvite', () => {
    describe('parseLocalDateTime', () => {
        it('parses the flatpickr Y-m-d H:i value as local time', () => {
            const date = CalendarInvite.parseLocalDateTime('2026-11-20 14:30');
            assert.ok(date instanceof Date);
            assert.deepEqual(
                [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()],
                [2026, 10, 20, 14, 30]
            );
        });

        it('rejects empty, malformed and impossible dates', () => {
            for (const value of [
                '',
                null,
                undefined,
                'tomorrow',
                '2026-11-20',
                '2026-02-30 10:00',
                '2026-11-20 25:00',
            ]) {
                assert.equal(CalendarInvite.parseLocalDateTime(value), null, String(value));
            }
        });
    });

    describe('parseDuration', () => {
        it('accepts whole minutes between 1 and 1440', () => {
            assert.equal(CalendarInvite.parseDuration('1'), 1);
            assert.equal(CalendarInvite.parseDuration(' 60 '), 60);
            assert.equal(CalendarInvite.parseDuration(1440), 1440);
        });

        it('rejects out of range or non-integer values', () => {
            for (const value of ['0', '1441', '-5', '1.5', 'abc', '', null, undefined]) {
                assert.equal(CalendarInvite.parseDuration(value), null, String(value));
            }
        });
    });

    describe('buildIcs', () => {
        const start = new Date(Date.UTC(2026, 10, 20, 13, 30));
        const now = new Date(Date.UTC(2026, 10, 18, 8, 0, 5));

        it('builds a valid VEVENT with UTC times and CRLF line endings', () => {
            const ics = CalendarInvite.buildIcs({
                title: 'MiroTalk P2P meeting: room',
                description: 'Click to join: https://p2p.mirotalk.com/join/room\nPassword: a,b;c',
                url: 'https://p2p.mirotalk.com/join/room',
                start,
                durationMinutes: 45,
                uid: 'uid-1@example.com',
                now,
            });
            assert.ok(ics.endsWith('\r\n'));
            assert.ok(!/[^\r]\n/.test(ics), 'all line breaks must be CRLF');
            const unfolded = ics.replace(/\r\n /g, '');
            assert.match(
                unfolded,
                /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\nPRODID:-\/\/MiroTalk P2P\/\/Meeting Invite\/\/EN\r\n/
            );
            assert.match(unfolded, /\r\nUID:uid-1@example\.com\r\n/);
            assert.match(unfolded, /\r\nDTSTAMP:20261118T080005Z\r\n/);
            assert.match(unfolded, /\r\nDTSTART:20261120T133000Z\r\n/);
            assert.match(unfolded, /\r\nDTEND:20261120T141500Z\r\n/);
            assert.match(unfolded, /\r\nSUMMARY:MiroTalk P2P meeting: room\r\n/);
            assert.match(
                unfolded,
                /\r\nDESCRIPTION:Click to join: https:\/\/p2p\.mirotalk\.com\/join\/room\\nPassword: a\\,b\\;c\r\n/
            );
            assert.match(unfolded, /\r\nURL:https:\/\/p2p\.mirotalk\.com\/join\/room\r\n/);
            assert.match(unfolded, /END:VEVENT\r\nEND:VCALENDAR\r\n$/);
        });

        it('throws on invalid start or duration', () => {
            assert.throws(() => CalendarInvite.buildIcs({ title: 't', start: new Date('x'), durationMinutes: 30 }));
            assert.throws(() => CalendarInvite.buildIcs({ title: 't', start, durationMinutes: 0 }));
        });
    });

    describe('foldLine', () => {
        it('folds lines to 75 octets without splitting multi-byte characters', () => {
            const line = 'SUMMARY:' + 'é'.repeat(80);
            const parts = CalendarInvite.foldLine(line).split('\r\n');
            assert.ok(parts.length > 1);
            parts.forEach((part) => assert.ok(Buffer.byteLength(part, 'utf8') <= 75));
            assert.equal(parts.map((part, i) => (i ? part.slice(1) : part)).join(''), line);
        });
    });

    describe('toFileName', () => {
        it('produces a safe .ics file name', () => {
            assert.equal(CalendarInvite.toFileName('my room/../x'), 'my_room_x.ics');
            assert.equal(CalendarInvite.toFileName(''), 'meeting.ics');
        });
    });

    describe('formatMeetingTime', () => {
        it('formats date, time range, time zone and duration', () => {
            const when = CalendarInvite.formatMeetingTime({
                start: new Date(Date.UTC(2026, 10, 20, 13, 30)),
                durationMinutes: 90,
                timeZone: 'Europe/Rome',
                hour12: false,
            });
            assert.equal(when.date, 'Friday, November 20, 2026');
            assert.equal(when.time, '14:30 – 16:00');
            assert.equal(when.timeZone, 'GMT+01:00, Europe/Rome');
            assert.equal(when.duration, '1 hour 30 minutes');
        });

        it('marks meetings ending on the next day', () => {
            const when = CalendarInvite.formatMeetingTime({
                start: new Date(Date.UTC(2026, 10, 20, 23, 0)),
                durationMinutes: 120,
                timeZone: 'UTC',
                hour12: false,
            });
            assert.equal(when.time, '23:00 – 01:00 (next day)');
            assert.equal(when.timeZone, 'GMT+00:00, UTC');
        });
    });

    describe('client integration', () => {
        it('loads calendarInvite.js before client.js', () => {
            const calendarIndex = clientHtml.indexOf('src="../js/calendarInvite.js"');
            assert.ok(calendarIndex > 0);
            assert.ok(calendarIndex < clientHtml.indexOf('src="../js/client.js"'));
        });

        it('wires the participants email invite button and .ics download', () => {
            assert.match(clientHtml, /id="participantsEmailInviteBtn"/);
            assert.match(
                clientSource,
                /participantsEmailInviteBtn\.addEventListener\('click', \(\) => \{\s*shareRoomByEmail\(\);/
            );
            assert.match(clientSource, /denyButtonText: translateDialogText\('Download \.ics'\)/);
            assert.match(clientSource, /preDeny: \(\) => \{/);
        });
    });
});
