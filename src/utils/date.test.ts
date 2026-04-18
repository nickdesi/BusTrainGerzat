import { parseParisTime, getParisMidnight, getParisOffset, getNowUnix, getParisDateString } from './date';

describe('Date Utilities - Paris Timezone', () => {

    describe('getParisOffset', () => {
        it('should return +01:00 for Winter time (January)', () => {
            expect(getParisOffset(2024, 1, 15)).toBe('+01:00');
        });

        it('should return +02:00 for Summer time (July)', () => {
            expect(getParisOffset(2024, 7, 15)).toBe('+02:00');
        });

        it('should handle Spring DST transition (Winter -> Summer) in 2024', () => {
            // March 31, 2024 is the transition day
            expect(getParisOffset(2024, 3, 30)).toBe('+01:00'); // Day before
            expect(getParisOffset(2024, 3, 31)).toBe('+02:00'); // Transition day
        });

        it('should handle Autumn DST transition (Summer -> Winter) in 2024', () => {
            // October 27, 2024 is the transition day
            expect(getParisOffset(2024, 10, 26)).toBe('+02:00'); // Day before
            expect(getParisOffset(2024, 10, 27)).toBe('+01:00'); // Transition day
        });

        it('should handle Spring DST transition (Winter -> Summer) in 2023', () => {
            // March 26, 2023 is the transition day
            expect(getParisOffset(2023, 3, 25)).toBe('+01:00'); // Day before
            expect(getParisOffset(2023, 3, 26)).toBe('+02:00'); // Transition day
        });

        it('should handle Autumn DST transition (Summer -> Winter) in 2023', () => {
            // October 29, 2023 is the transition day
            expect(getParisOffset(2023, 10, 28)).toBe('+02:00'); // Day before
            expect(getParisOffset(2023, 10, 29)).toBe('+01:00'); // Transition day
        });
    });

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

    describe('getNowUnix', () => {
        it('should return the current Unix timestamp in seconds', () => {
            // Setup mock
            const mockTimeMs = 1713348000123; // Some arbitrary timestamp in ms
            const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(mockTimeMs);

            // Execute
            const result = getNowUnix();

            // Verify
            const expectedSeconds = Math.floor(mockTimeMs / 1000);
            expect(result).toBe(expectedSeconds);
            expect(dateSpy).toHaveBeenCalled();

            // Restore
            dateSpy.mockRestore();
        });
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

describe('getParisDateString', () => {
    beforeAll(() => {
        jest.useFakeTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('should format normal date correctly', () => {
        jest.setSystemTime(new Date('2024-05-15T12:00:00Z'));
        expect(getParisDateString()).toBe('20240515');
    });

    it('should handle year boundary correctly (late night UTC)', () => {
        // 23:30 UTC on Dec 31 = 00:30 on Jan 1 in Paris (UTC+1)
        jest.setSystemTime(new Date('2023-12-31T23:30:00Z'));
        expect(getParisDateString()).toBe('20240101');
    });

    it('should handle day boundary correctly (summer time)', () => {
        // 22:30 UTC on Aug 15 = 00:30 on Aug 16 in Paris (UTC+2)
        jest.setSystemTime(new Date('2024-08-15T22:30:00Z'));
        expect(getParisDateString()).toBe('20240816');
    });
});
