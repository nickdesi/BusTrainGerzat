import {
    extractTripPattern,
    getEffectiveDelay,
    getFirstStop,
    getLastStop,
    getLineE1StaticTrip,
    getLineE1StaticTrips,
    getStopAt,
} from './t2c-line-e1.service';

describe('t2c-line-e1.service', () => {
    it('extracts the stable route/time suffix from T2C trip ids', () => {
        expect(extractTripPattern('1132_1000005_03GC.AR_183100')).toBe('03GC.AR_183100');
        expect(extractTripPattern('unexpected')).toBe('unexpected');
    });

    it('returns static trips and can lookup by exact id or suffix-compatible id', () => {
        const [trip] = getLineE1StaticTrips();
        expect(trip).toBeDefined();

        const exact = getLineE1StaticTrip(trip.tripId);
        expect(exact?.tripId).toBe(trip.tripId);

        const pattern = extractTripPattern(trip.tripId);
        const fuzzy = getLineE1StaticTrip(`9999_8888888_${pattern}`);
        expect(fuzzy?.tripId).toBe(trip.tripId);
    });

    it('returns stops by index helpers safely', () => {
        const [trip] = getLineE1StaticTrips();
        expect(getFirstStop(trip)).toBe(trip.stops[0]);
        expect(getLastStop(trip)).toBe(trip.stops.at(-1));
        expect(getStopAt(trip, 0)).toBe(trip.stops[0]);
        expect(getStopAt(trip, 99999)).toBeUndefined();
    });

    it('computes effective delay from predicted time when reported delay is zero', () => {
        expect(getEffectiveDelay(120, 1_000, 900)).toBe(120);
        expect(getEffectiveDelay(0, 1_120, 1_000)).toBe(120);
        expect(getEffectiveDelay(0, 1_030, 1_000)).toBe(0);
        expect(getEffectiveDelay(0, undefined, 1_000)).toBe(0);
    });
});
