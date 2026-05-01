import { buildTrainFreshnessStatus } from './train.service';

describe('train.service freshness', () => {
    const nowMs = 1_700_000_000_000;
    const nowSec = Math.floor(nowMs / 1000);

    it('reports critical status when SNCF API key is missing', () => {
        const status = buildTrainFreshnessStatus({
            hasApiKey: false,
            hasCachedResponse: false,
            cacheExpiry: 0,
            cachedTimestamp: null,
            nowMs,
        });

        expect(status.isValid).toBe(false);
        expect(status.warningLevel).toBe('critical');
    });

    it('reports info status before first on-demand fetch', () => {
        const status = buildTrainFreshnessStatus({
            hasApiKey: true,
            hasCachedResponse: false,
            cacheExpiry: 0,
            cachedTimestamp: null,
            nowMs,
        });

        expect(status.isValid).toBe(true);
        expect(status.warningLevel).toBe('info');
        expect(status.lastFetchAge).toBeNull();
    });

    it('reports valid cached data while cache is fresh', () => {
        const status = buildTrainFreshnessStatus({
            hasApiKey: true,
            hasCachedResponse: true,
            cacheExpiry: nowMs + 60_000,
            cachedTimestamp: nowSec - 30,
            nowMs,
        });

        expect(status.isValid).toBe(true);
        expect(status.isCached).toBe(true);
        expect(status.cacheExpiresIn).toBe(60);
        expect(status.lastFetchAge).toBe(30);
        expect(status.warningLevel).toBe('none');
    });

    it('warns when last SNCF fetch is old', () => {
        const status = buildTrainFreshnessStatus({
            hasApiKey: true,
            hasCachedResponse: true,
            cacheExpiry: nowMs - 1,
            cachedTimestamp: nowSec - 601,
            nowMs,
        });

        expect(status.isValid).toBe(false);
        expect(status.isCached).toBe(false);
        expect(status.warningLevel).toBe('warning');
    });
});
