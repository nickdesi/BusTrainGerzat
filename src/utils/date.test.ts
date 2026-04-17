import { parseParisTime, getParisMidnight } from './date';

describe('Date Utilities - Paris Timezone', () => {

    it('should parse Winter time correctly (GMT+1)', () => {
        // 20 Jan 2024, 10:00:00 Paris -> 09:00:00 UTC
        const parisStr = '20240120T100000';
        const timestamp = parseParisTime(parisStr);

        // Expected: 2024-01-20T09:00:00Z
        const expected = new Date('2024-01-20T09:00:00Z').getTime() / 1000;
        expect(timestamp).toBe(expected);
    });

    it('should parse Summer time correctly (GMT+2)', () => {
        // 20 Jul 2024, 10:00:00 Paris -> 08:00:00 UTC
        const parisStr = '20240720T100000';
        const timestamp = parseParisTime(parisStr);

        // Expected: 2024-07-20T08:00:00Z
        const expected = new Date('2024-07-20T08:00:00Z').getTime() / 1000;
        expect(timestamp).toBe(expected);
    });

    it('should handle midnight correctly', () => {
        const parisStr = '20240120T000000';
        const timestamp = parseParisTime(parisStr);
        const expected = new Date('2024-01-19T23:00:00Z').getTime() / 1000; // Winter: Midnight Paris = 23h prev day UTC
        expect(timestamp).toBe(expected);
    });

    it('should get realistic midnight for today', () => {
        const midnight = getParisMidnight();
        const now = Math.floor(Date.now() / 1000);

        // Midnight should be in the past (or exactly now if executed at 00:00:00)
        // And not more than 24h ago
        expect(midnight).toBeLessThanOrEqual(now);
        expect(now - midnight).toBeLessThan(24 * 3600 + 10); // +10s margin
    });

    describe('getParisDateString', () => {
        const { getParisDateString } = require('./date');

        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return YYYYMMDD for a standard date', () => {
            // Set time to July 20, 2024, 12:00:00 UTC -> Paris is 14:00:00 on same day
            jest.setSystemTime(new Date('2024-07-20T12:00:00Z'));
            expect(getParisDateString()).toBe('20240720');
        });

        it('should correctly handle year boundaries when Paris is ahead of UTC', () => {
            // Set time to Dec 31, 2023, 23:30:00 UTC
            // Paris is UTC+1 (Winter time), so it is Jan 1, 2024, 00:30:00 in Paris
            jest.setSystemTime(new Date('2023-12-31T23:30:00Z'));
            expect(getParisDateString()).toBe('20240101');
        });

        it('should correctly handle leap years', () => {
            // Set time to Feb 29, 2024, 12:00:00 UTC -> Paris is 13:00:00 on same day
            jest.setSystemTime(new Date('2024-02-29T12:00:00Z'));
            expect(getParisDateString()).toBe('20240229');
        });

        it('should handle single digit month and day correctly with padding', () => {
            // Set time to Jan 5, 2024, 12:00:00 UTC
            jest.setSystemTime(new Date('2024-01-05T12:00:00Z'));
            expect(getParisDateString()).toBe('20240105');
        });
    });

});
