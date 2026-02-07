/**
 * Date utilities for handling Europe/Paris timezone correctly
 * Handles Daylight Saving Time (DST) transitions automatically via Intl API
 */

/**
 * Get the UTC offset string for Paris at a given date (e.g., "+01:00" or "+02:00")
 * We verify the offset at NOON on that day to avoid edge cases around 2am/3am transitions
 */
function getParisOffset(year: number, month: number, day: number): string {
    // Create a date at noon UTC to check the offset
    // This avoids the ambiguous hour during DST switch (2am-3am)
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    // Get timeZoneName in "longOffset" format (e.g. "GMT+01:00" or "GMT+1" depending on node version)
    // We strictly default to "longOffset" but normalize the output just in case
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Paris',
        timeZoneName: 'longOffset'
    }).formatToParts(date);

    const tzPart = parts.find(p => p.type === 'timeZoneName');

    // Extract offset from "GMT+01:00" or "GMT+1"
    // eslint-disable-next-line security/detect-unsafe-regex
    const match = tzPart?.value.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);

    if (match) {
        const hours = match[1];
        const minutes = match[3] || '00';
        // Normalize to +HH:mm format
        return `${hours.startsWith('+') || hours.startsWith('-') ? '' : '+'}${hours.padStart(3, hours.startsWith('-') || hours.startsWith('+') ? '0' : '+0')}:${minutes}`;
    }

    return '+01:00'; // Default fallback (Winter)
}

/**
 * Parse a Navitia/SNCF style date string "YYYYMMDDTHHMMSS"
 * interpreting it as LOCAL PARIS TIME
 * returns Unix timestamp (seconds)
 */
export function parseParisTime(dateStr: string): number {
    if (!dateStr || dateStr.length < 8) return 0;

    // Extract parts
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)); // 1-12
    const day = parseInt(dateStr.slice(6, 8));

    let hour = 0, minute = 0, second = 0;

    if (dateStr.includes('T')) {
        const timePart = dateStr.split('T')[1];
        if (timePart.length >= 2) hour = parseInt(timePart.slice(0, 2));
        if (timePart.length >= 4) minute = parseInt(timePart.slice(2, 4));
        if (timePart.length >= 6) second = parseInt(timePart.slice(4, 6));
    }

    // Get offset for this specific day
    const offset = getParisOffset(year, month, day); // e.g. "+01:00"

    // Construct ISO string with explicit offset: "2024-01-20T08:00:00+01:00"
    const isoString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}${offset}`;

    return Math.floor(new Date(isoString).getTime() / 1000);
}

/**
 * Get Unix timestamp for Midnight (00:00:00) today in Paris time
 */
export function getParisMidnight(): number {
    const now = new Date();
    // Get current Paris time parts
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Paris',
        hour12: false,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    }).formatToParts(now);

    const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '1');
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');

    // Reuse parse logic
    const dateStr = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}T000000`;
    return parseParisTime(dateStr);
}
