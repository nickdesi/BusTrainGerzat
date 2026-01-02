import { formatTime, normalizeText, getDisplayTime } from './format';

describe('formatTime', () => {
    it('formats timestamp to HH:MM French format', () => {
        // 2024-01-15 14:30:00 UTC => 15:30 in Paris (winter time)
        const timestamp = 1705329000; // Mon Jan 15 2024 14:30:00 UTC
        const result = formatTime(timestamp);
        // Result depends on timezone, just check format
        expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('handles midnight correctly', () => {
        const midnight = 1705276800; // Mon Jan 15 2024 00:00:00 UTC
        const result = formatTime(midnight);
        expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
});

describe('normalizeText', () => {
    it('removes accents', () => {
        expect(normalizeText('Café')).toBe('CAFE');
        expect(normalizeText('Gerzat Champfleuri')).toBe('GERZAT CHAMPFLEURI');
    });

    it('converts to uppercase', () => {
        expect(normalizeText('hello world')).toBe('HELLO WORLD');
    });

    it('handles special characters', () => {
        expect(normalizeText('Saint-Éloi')).toBe('SAINT-ELOI');
        expect(normalizeText("L'Hôpital")).toBe("L'HOPITAL");
    });

    it('replaces invalid chars with spaces', () => {
        expect(normalizeText('Test@#$%')).toBe('TEST    ');
    });
});

describe('getDisplayTime', () => {
    const busEntry = {
        type: 'BUS',
        arrivalTime: 1705329000,
        departureTime: 1705329060,
    };

    const terEntry = {
        type: 'TER',
        arrivalTime: 1705329000,
        departureTime: 1705329060,
    };

    it('returns departure time for departures board with BUS', () => {
        expect(getDisplayTime(busEntry, 'departures')).toBe(1705329060);
    });

    it('returns arrival time for arrivals board with BUS', () => {
        expect(getDisplayTime(busEntry, 'arrivals')).toBe(1705329000);
    });

    it('returns null for TER (shows both times)', () => {
        expect(getDisplayTime(terEntry, 'departures')).toBeNull();
        expect(getDisplayTime(terEntry, 'arrivals')).toBeNull();
    });
});
