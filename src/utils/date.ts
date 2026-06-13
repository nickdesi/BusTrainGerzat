/**
 * Date utilities for handling Europe/Paris timezone correctly
 * Handles Daylight Saving Time (DST) transitions automatically via Intl API
 */

// Cache Intl.DateTimeFormat instances at the module level to avoid expensive
// object creation on each function call.
const PARIS_OFFSET_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    timeZoneName: 'longOffset'
});

const PARIS_MIDNIGHT_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
});

const PARIS_DATE_STRING_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

const PARIS_LOCAL_DATETIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hour12: false,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
});

type ParisDateTime = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

function parseOffsetToMinutes(offset: string): number | null {
    const match = offset.match(/^([+-])(\d{2}):(\d{2})$/);
    if (!match) return null;

    const sign = match[1] === '-' ? -1 : 1;
    const hours = Number.parseInt(match[2], 10);
    const minutes = Number.parseInt(match[3], 10);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

    return sign * (hours * 60 + minutes);
}

function parseParisPartsFromDate(utcMillis: number): ParisDateTime | null {
    const parts = PARIS_LOCAL_DATETIME_FORMATTER.formatToParts(new Date(utcMillis));

    let yearStr = '', monthStr = '', dayStr = '', hourStr = '', minuteStr = '', secondStr = '';
    for (const p of parts) {
        if (p.type === 'year') yearStr = p.value;
        else if (p.type === 'month') monthStr = p.value;
        else if (p.type === 'day') dayStr = p.value;
        else if (p.type === 'hour') hourStr = p.value;
        else if (p.type === 'minute') minuteStr = p.value;
        else if (p.type === 'second') secondStr = p.value;
    }

    const year = Number.parseInt(yearStr, 10);
    const month = Number.parseInt(monthStr, 10);
    const day = Number.parseInt(dayStr, 10);
    const hour = Number.parseInt(hourStr, 10);
    const minute = Number.parseInt(minuteStr, 10);
    const second = Number.parseInt(secondStr, 10);

    if (![year, month, day, hour, minute, second].every(Number.isFinite)) return null;

    return { year, month, day, hour, minute, second };
}

function matchesParisLocalTime(utcMillis: number, target: ParisDateTime): boolean {
    const parsed = parseParisPartsFromDate(utcMillis);
    if (!parsed) return false;

    return parsed.year === target.year
        && parsed.month === target.month
        && parsed.day === target.day
        && parsed.hour === target.hour
        && parsed.minute === target.minute
        && parsed.second === target.second;
}

/**
 * Get the UTC offset string for Paris at a given date (e.g., "+01:00" or "+02:00")
 * We verify the offset at NOON on that day to avoid edge cases around 2am/3am transitions
 */
export function getParisOffset(year: number, month: number, day: number): string {
    // Create a date at noon UTC to check the offset
    // This avoids the ambiguous hour during DST switch (2am-3am)
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    // Get timeZoneName in "longOffset" format (e.g. "GMT+01:00" or "GMT+1" depending on node version)
    // We strictly default to "longOffset" but normalize the output just in case
    const parts = PARIS_OFFSET_FORMATTER.formatToParts(date);

    const tzPart = parts.find(p => p.type === 'timeZoneName');

    // Extract offset from "GMT+01:00" or "GMT+1"
    // eslint-disable-next-line security/detect-unsafe-regex
    const match = tzPart?.value.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);

    if (match) {
        const rawHours = match[1];
        const sign = rawHours.startsWith('-') ? '-' : '+';
        const hours = rawHours.replace(/[+-]/, '').padStart(2, '0');
        const minutes = (match[2] || '00').padStart(2, '0');
        return `${sign}${hours}:${minutes}`;
    }

    return '+01:00'; // Default fallback (Winter)
}

/**
 * Parse a Navitia/SNCF style date string "YYYYMMDDTHHMMSS"
 * interpreting it as LOCAL PARIS TIME
 * returns Unix timestamp (seconds)
 */
export function parseParisTime(dateStr: string): number {
    if (!dateStr) return 0;

    // eslint-disable-next-line security/detect-unsafe-regex
    const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?$/);
    if (!match) return 0;

    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    const hour = Number.parseInt(match[4] || '00', 10);
    const minute = Number.parseInt(match[5] || '00', 10);
    const second = Number.parseInt(match[6] || '00', 10);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)
        || !Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) {
        return 0;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
        return 0;
    }

    const localDateTime: ParisDateTime = { year, month, day, hour, minute, second };
    const baseUtcMillis = Date.UTC(year, month - 1, day, hour, minute, second);

    const candidateOffsets = new Set<number>();
    const dayOffsetMinutes = parseOffsetToMinutes(getParisOffset(year, month, day));
    if (dayOffsetMinutes !== null) candidateOffsets.add(dayOffsetMinutes);
    candidateOffsets.add(120);
    candidateOffsets.add(60);

    for (const offsetMinutes of candidateOffsets) {
        const utcMillis = baseUtcMillis - offsetMinutes * 60_000;
        if (matchesParisLocalTime(utcMillis, localDateTime)) {
            return Math.floor(utcMillis / 1000);
        }
    }

    return 0;
}

/**
 * Get Unix timestamp for Midnight (00:00:00) today in Paris time
 */
export function getParisMidnight(): number {
    const now = new Date();
    const parts = PARIS_MIDNIGHT_FORMATTER.formatToParts(now);

    let yearStr = '1970', monthStr = '1', dayStr = '1';
    for (const p of parts) {
        if (p.type === 'year') yearStr = p.value;
        else if (p.type === 'month') monthStr = p.value;
        else if (p.type === 'day') dayStr = p.value;
    }

    const year = Number.parseInt(yearStr, 10);
    const month = Number.parseInt(monthStr, 10);
    const day = Number.parseInt(dayStr, 10);

    // Reuse parse logic
    const dateStr = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}T000000`;
    return parseParisTime(dateStr);
}

/**
 * Get current Unix timestamp in seconds (centralized utility)
 * Use this instead of Math.floor(Date.now() / 1000) for consistency
 */
export function getNowUnix(): number {
    return Math.floor(Date.now() / 1000);
}

/**
 * Get current Paris date as string in YYYYMMDD format
 * Useful for comparing with GTFS static schedule dates
 */
export function getParisDateString(): string {
    const now = new Date();
    const parts = PARIS_DATE_STRING_FORMATTER.formatToParts(now);

    let year = '1970', month = '01', day = '01';
    for (const p of parts) {
        if (p.type === 'year') year = p.value;
        else if (p.type === 'month') month = p.value;
        else if (p.type === 'day') day = p.value;
    }

    return `${year}${month}${day}`;
}

/**
 * T2C does not operate bus/tram services on May 1st (Labour Day) in Clermont-Ferrand.
 * Keep this runtime guard because GTFS static/RT feeds can still expose stale or theoretical trips.
 */
export function isT2CNoServiceDay(date = new Date()): boolean {
    const parts = PARIS_DATE_STRING_FORMATTER.formatToParts(date);
    let month, day;
    for (const p of parts) {
        if (p.type === 'month') month = p.value;
        else if (p.type === 'day') day = p.value;
    }

    return month === '05' && day === '01';
}
