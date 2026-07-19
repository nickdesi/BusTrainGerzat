import { mapT2CItinerariesToBusUpdates } from './t2c-itineraries.service';

describe('t2c-itineraries fallback mapper', () => {
    it('maps E1 transport steps to BusUpdate payload', () => {
        const updates = mapT2CItinerariesToBusUpdates([
            {
                id: '1',
                departure_time: '08:05',
                arrival_time: '08:44',
                departure_place_name: 'Gerzat',
                steps: [
                    { type: 'walk' },
                    {
                        type: 'transport',
                        line_short_name: 'E1',
                        line_direction: 'AUBIÈRE Pl. des Ramacles',
                        departure_time: '08:06',
                        arrival_time: '08:44',
                        departure_stop_name: 'GERZAT Champfleuri',
                    },
                ],
            },
        ], '20260720');

        expect(updates).toHaveLength(1);
        expect(updates[0]).toMatchObject({
            tripId: 't2c-itinerary-1-1',
            headsign: 'AUBIÈRE Pl. des Ramacles',
            direction: 0,
            origin: 'GERZAT Champfleuri',
            isRealtime: true,
            isCancelled: false,
            delay: 0,
        });
        expect(updates[0].departure).toBeGreaterThan(0);
        expect(updates[0].arrival).toBeGreaterThan(updates[0].departure);
    });

    it('ignores non-E1 transport steps', () => {
        const updates = mapT2CItinerariesToBusUpdates([
            {
                id: '2',
                steps: [
                    {
                        type: 'transport',
                        line_short_name: 'B',
                        departure_time: '08:00',
                        arrival_time: '08:10',
                    },
                ],
            },
        ], '20260720');

        expect(updates).toEqual([]);
    });
});
