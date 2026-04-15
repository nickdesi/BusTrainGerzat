import { isRetryableError } from './api-client';

describe('api-client', () => {
    describe('isRetryableError', () => {
        it('returns true for network errors (undefined status)', () => {
            expect(isRetryableError(undefined)).toBe(true);
        });

        it('returns true for network errors (status 0)', () => {
            expect(isRetryableError(0)).toBe(true);
        });

        it('returns true for 5xx server errors', () => {
            expect(isRetryableError(500)).toBe(true);
            expect(isRetryableError(503)).toBe(true);
        });

        it('returns true for 429 rate limit errors', () => {
            expect(isRetryableError(429)).toBe(true);
        });

        it('returns false for other 4xx client errors', () => {
            expect(isRetryableError(400)).toBe(false);
            expect(isRetryableError(404)).toBe(false);
        });

        it('returns false for 2xx success statuses', () => {
            expect(isRetryableError(200)).toBe(false);
        });
    });
});
