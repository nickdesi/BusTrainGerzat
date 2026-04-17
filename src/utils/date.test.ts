import { parseParisTime, getParisMidnight, getParisOffset } from './date';

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

});
