import {
    findGerzatStopForAddedTrip,
    findRelevantStopUpdate,
    removeCancelledTripsWithReplacement,
    shouldApplyRealtimeUpdate,
    shouldKeepPaturalTrip,
} from './bus.service';
import { BusUpdate } from '@/types/transport';

const rtStop = { delay: 0, isSkipped: false };

describe('bus.service helpers', () => {
    it('finds exact stop updates first', () => {
        const exact = { delay: 60, isSkipped: false };
        const stops = new Map([
            ['GECHR', exact],
            ['GECH', rtStop],
        ]);

        expect(findRelevantStopUpdate(stops, 'GECHR', {
            champfleuri: ['GECHR', 'GECH'],
            patural: ['PATU'],
        })).toBe(exact);
    });

    it('falls back to stop group aliases', () => {
        const stops = new Map([['GECH', rtStop]]);

        expect(findRelevantStopUpdate(stops, 'GECHR', {
            champfleuri: ['GECHR', 'GECH'],
            patural: ['PATU'],
        })).toBe(rtStop);
    });

    it('keeps only valid inbound Patural exceptions', () => {
        const patural = new Set(['PATU']);

        expect(shouldKeepPaturalTrip({ stopId: 'PATU', direction: 0, headsign: 'Aubière' }, patural)).toBe(true);
        expect(shouldKeepPaturalTrip({ stopId: 'PATU', direction: 1, headsign: 'Gerzat' }, patural)).toBe(false);
        expect(shouldKeepPaturalTrip({ stopId: 'PATU', direction: 1, headsign: 'Le Patural' }, patural)).toBe(true);
        expect(shouldKeepPaturalTrip({ stopId: 'OTHER', direction: 1, headsign: 'Gerzat' }, patural)).toBe(true);
    });

    it('removes cancelled trips when a close replacement exists', () => {
        const cancelled: BusUpdate = {
            tripId: 'cancelled', arrival: 1_000, departure: 1_000, delay: 0,
            isRealtime: true, isCancelled: true, headsign: 'Aubière', direction: 0, origin: 'Gerzat',
        };
        const replacement: BusUpdate = {
            tripId: 'replacement', arrival: 1_500, departure: 1_500, delay: 0,
            isRealtime: true, isCancelled: false, headsign: 'Aubière', direction: 0, origin: 'Gerzat',
        };
        const farCancelled: BusUpdate = {
            ...cancelled,
            tripId: 'far-cancelled',
            arrival: 10_000,
            departure: 10_000,
        };

        expect(removeCancelledTripsWithReplacement([cancelled, replacement, farCancelled]))
            .toEqual([replacement, farCancelled]);
    });

    it('applies realtime updates without startDate only within a 3h window', () => {
        expect(shouldApplyRealtimeUpdate(undefined, '20260502', 10_000 + 3 * 60 * 60, 10_000)).toBe(true);
        expect(shouldApplyRealtimeUpdate(undefined, '20260502', 10_000 + 3 * 60 * 60 + 1, 10_000)).toBe(false);
        expect(shouldApplyRealtimeUpdate(undefined, '20260502', 0, 10_000)).toBe(false);
    });

    it('uses startDate first when present for realtime matching', () => {
        expect(shouldApplyRealtimeUpdate('20260502', '20260502', 0, 10_000)).toBe(true);
        expect(shouldApplyRealtimeUpdate('20260503', '20260502', 10_000, 10_000)).toBe(false);
    });

    it('selects explicit Gerzat/Patural stops for added trips', () => {
        const stops = [
            { stopId: 'OTHER1', predictedTime: 1_000, delay: 0 },
            { stopId: 'GECHR', predictedTime: 2_000, delay: 60 },
            { stopId: 'PATU', predictedTime: 3_000, delay: 120 },
            { stopId: 'OTHER2', predictedTime: 4_000, delay: 0 },
        ];
        const stopGroups = { champfleuri: ['GECHR'], patural: ['PATU'] };

        expect(findGerzatStopForAddedTrip(stops, 0, stopGroups)?.stopId).toBe('GECHR');
        expect(findGerzatStopForAddedTrip(stops, 1, stopGroups)?.stopId).toBe('PATU');
        expect(findGerzatStopForAddedTrip([{ stopId: 'OTHER', predictedTime: 1_000, delay: 0 }], 0, stopGroups)).toBeUndefined();
    });
});
