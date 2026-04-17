import { parseParisTime, getParisMidnight, getParisDateString } from './date';

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
