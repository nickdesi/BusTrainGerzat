import {
    findRelevantStopUpdate,
    removeCancelledTripsWithReplacement,
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
            isRealtime: true, isCancelled: true, headsign: 'Aubière', direction: 0,
        };
        const replacement: BusUpdate = {
            tripId: 'replacement', arrival: 1_500, departure: 1_500, delay: 0,
            isRealtime: true, isCancelled: false, headsign: 'Aubière', direction: 0,
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
});
