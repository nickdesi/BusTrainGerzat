import { formatTime, normalizeText } from './format';

describe('format util', () => {
    describe('normalizeText', () => {
        it('capitalizes basic text', () => {
            expect(normalizeText('hello')).toBe('HELLO');
        });

        it('removes accents', () => {
            expect(normalizeText('éàçùëî')).toBe('EACUEI');
            expect(normalizeText('Clermont-Ferrand')).toBe('CLERMONT-FERRAND');
            expect(normalizeText('Médiathèque Hugo')).toBe('MEDIATHEQUE HUGO');
        });

        it('preserves allowed special characters and numbers', () => {
            expect(normalizeText("L'arrêt 1-2")).toBe("L'ARRET 1-2");
            expect(normalizeText('123 ABC')).toBe('123 ABC');
            expect(normalizeText('Station - Mairie')).toBe('STATION - MAIRIE');
        });

        it('replaces unallowed special characters with space', () => {
            expect(normalizeText('hello@world.com')).toBe('HELLO WORLD COM');
            expect(normalizeText('A_B*C+D=E')).toBe('A B C D E');
        });

        it('handles empty string', () => {
            expect(normalizeText('')).toBe('');
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
