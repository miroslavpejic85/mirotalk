'use strict';

// Builds RFC 5545 iCalendar (.ics) meeting invites in the browser. Pure (no DOM): browser + Node tests.

(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.CalendarInvite = api;
})(typeof self !== 'undefined' ? self : this, function () {
    const CRLF = '\r\n';
    const MAX_LINE_OCTETS = 75;
    const MAX_DURATION_MINUTES = 24 * 60;

    // Parses the flatpickr 'Y-m-d H:i' value as local time.
    function parseLocalDateTime(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(String(value || '').trim());
        if (!match) return null;
        const [year, month, day, hours, minutes] = match.slice(1).map(Number);
        const date = new Date(year, month - 1, day, hours, minutes);
        const isSameDate =
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day &&
            date.getHours() === hours &&
            date.getMinutes() === minutes;
        return isSameDate ? date : null;
    }

    function parseDuration(value) {
        const text = String(value ?? '').trim();
        if (!/^\d+$/.test(text)) return null;
        const minutes = Number(text);
        return minutes >= 1 && minutes <= MAX_DURATION_MINUTES ? minutes : null;
    }

    function toUtcStamp(date) {
        return date
            .toISOString()
            .replace(/[-:]/g, '')
            .replace(/\.\d{3}/, '');
    }

    function escapeText(value) {
        return String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\r\n|\r|\n/g, '\\n');
    }

    function utf8Length(codePoint) {
        if (codePoint < 0x80) return 1;
        if (codePoint < 0x800) return 2;
        if (codePoint < 0x10000) return 3;
        return 4;
    }

    // Folds lines longer than 75 octets without splitting multi-byte characters.
    function foldLine(line) {
        const parts = [];
        let current = '';
        let octets = 0;
        for (const char of line) {
            const size = utf8Length(char.codePointAt(0));
            if (octets + size > MAX_LINE_OCTETS) {
                parts.push(current);
                current = ' ';
                octets = 1;
            }
            current += char;
            octets += size;
        }
        parts.push(current);
        return parts.join(CRLF);
    }

    function createUid(domain = 'mirotalk') {
        const random = Math.random().toString(36).slice(2, 12);
        return `${Date.now().toString(36)}-${random}@${domain}`;
    }

    function buildIcs({
        title,
        description = '',
        url = '',
        start,
        durationMinutes,
        uid = createUid(),
        now = new Date(),
        productName = 'MiroTalk P2P',
    }) {
        if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
            throw new Error('Invalid start date');
        }
        const duration = parseDuration(durationMinutes);
        if (!duration) {
            throw new Error('Invalid duration');
        }
        const end = new Date(start.getTime() + duration * 60 * 1000);

        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            `PRODID:-//${escapeText(productName)}//Meeting Invite//EN`,
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `UID:${escapeText(uid)}`,
            `DTSTAMP:${toUtcStamp(now)}`,
            `DTSTART:${toUtcStamp(start)}`,
            `DTEND:${toUtcStamp(end)}`,
            `SUMMARY:${escapeText(title)}`,
        ];
        if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
        if (url) {
            lines.push(`URL:${String(url).replace(/[\r\n]/g, '')}`);
            lines.push(`LOCATION:${escapeText(url)}`);
        }
        lines.push('STATUS:CONFIRMED', 'TRANSP:OPAQUE', 'END:VEVENT', 'END:VCALENDAR');

        return lines.map(foldLine).join(CRLF) + CRLF;
    }

    function toFileName(name) {
        const safe = String(name || '')
            .replace(/[^\w-]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 64);
        return `${safe || 'meeting'}.ics`;
    }

    function formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const rest = minutes % 60;
        const parts = [];
        if (hours) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
        if (rest) parts.push(`${rest} ${rest === 1 ? 'minute' : 'minutes'}`);
        return parts.join(' ');
    }

    function getTimeZoneOffset(date, timeZone) {
        try {
            const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
                .formatToParts(date)
                .find((p) => p.type === 'timeZoneName');
            return part?.value === 'GMT' ? 'GMT+00:00' : part?.value || '';
        } catch {
            return '';
        }
    }

    // Human-readable meeting time, e.g. "Friday, November 20, 2026" / "14:30 – 15:15" / "GMT+01:00, Europe/Rome".
    function formatMeetingTime({ start, durationMinutes, timeZone, hour12, locale = 'en-US' }) {
        if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
            throw new Error('Invalid start date');
        }
        const duration = parseDuration(durationMinutes);
        if (!duration) {
            throw new Error('Invalid duration');
        }
        const end = new Date(start.getTime() + duration * 60 * 1000);
        const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        const dateFormat = new Intl.DateTimeFormat(locale, {
            timeZone: zone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const timeOptions = { timeZone: zone, hour: hour12 === false ? '2-digit' : 'numeric', minute: '2-digit' };
        if (typeof hour12 === 'boolean') timeOptions.hourCycle = hour12 ? 'h12' : 'h23';
        const timeFormat = new Intl.DateTimeFormat(locale, timeOptions);

        const date = dateFormat.format(start);
        const endsNextDay = dateFormat.format(end) !== date;
        const time = `${timeFormat.format(start)} – ${timeFormat.format(end)}${endsNextDay ? ' (next day)' : ''}`;
        const offset = getTimeZoneOffset(start, zone);

        return {
            date,
            time,
            timeZone: offset ? `${offset}, ${zone}` : zone,
            duration: formatDuration(duration),
        };
    }

    return {
        buildIcs,
        formatMeetingTime,
        formatDuration,
        parseLocalDateTime,
        parseDuration,
        escapeText,
        foldLine,
        toUtcStamp,
        toFileName,
        MAX_DURATION_MINUTES,
    };
});
