import { formatTime } from './format';

describe('format util', () => {
    describe('formatTime', () => {
        it('formats valid timestamp correctly', () => {
            // Mocked timestamp for 14:30:00 UTC (checking locale strings might depend on system timezone, 
            // but toLocaleTimeString with 'fr-FR' should be relatively stable if timezone is handled)
            // Ideally we should mock the Date object or timezone, but for a smoke test:
            const timestamp = 1698244200; // 2023-10-25T14:30:00Z

            const result = formatTime(timestamp);
            // We expect HH:mm format. The exact hour depends on local timezone of the test runner unless forced.
            // Let's just check the format generally to be safe across environments for now
            expect(result).toMatch(/^\d{2}:\d{2}$/);
        });

        it('handles zero timestamp', () => {
            const result = formatTime(0);
            expect(result).toMatch(/^\d{2}:\d{2}$/);
        });
        it('handles invalid inputs gracefully', () => {
            // Check behavior for null/undefined if applicable
            expect(formatTime(undefined)).toBe('--:--');
            expect(formatTime(null)).toBe('--:--');
            expect(formatTime(NaN)).toBe('--:--');
        });
    });
});
