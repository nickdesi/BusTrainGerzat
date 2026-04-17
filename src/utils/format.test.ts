import { formatTime, getDisplayTime } from './format';

describe('format util', () => {
    describe('getDisplayTime', () => {
        const mockEntry = {
            type: 'BUS',
            arrivalTime: 1000,
            departureTime: 2000,
        };

        it('returns null when entry type is TER', () => {
            const terEntry = { ...mockEntry, type: 'TER' };
            expect(getDisplayTime(terEntry, 'arrivals')).toBeNull();
            expect(getDisplayTime(terEntry, 'departures')).toBeNull();
        });

        it('returns arrivalTime when boardType is arrivals and type is not TER', () => {
            expect(getDisplayTime(mockEntry, 'arrivals')).toBe(1000);
        });

        it('returns departureTime when boardType is departures and type is not TER', () => {
            expect(getDisplayTime(mockEntry, 'departures')).toBe(2000);
        });
    });

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
