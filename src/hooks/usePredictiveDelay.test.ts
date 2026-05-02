import { renderHook } from '@testing-library/react';
import { usePredictiveDelay } from './usePredictiveDelay';

describe('usePredictiveDelay', () => {
    // Helper to get the hook instance
    const getHook = () => {
        const { result } = renderHook(() => usePredictiveDelay());
        return result.current.getPrediction;
    };

    describe('Line E1', () => {
        it('should return HIGH probability and 5 min delay during morning rush hour on a weekday', () => {
            const getPrediction = getHook();
            // Wednesday (3), 8 AM
            const result = getPrediction('E1', 8, 3);
            expect(result).toEqual({
                probability: 'HIGH',
                estimatedDelay: 5,
                reason: 'Heures de pointe estimées (+5 min)',
            });
        });

        it('should return HIGH probability and 5 min delay during evening rush hour on a weekday', () => {
            const getPrediction = getHook();
            // Thursday (4), 18 (6 PM)
            const result = getPrediction('E1', 18, 4);
            expect(result).toEqual({
                probability: 'HIGH',
                estimatedDelay: 5,
                reason: 'Heures de pointe estimées (+5 min)',
            });
        });

        it('should return MEDIUM probability and 2 min delay during school exit on a weekday', () => {
            const getPrediction = getHook();
            // Tuesday (2), 13 (1 PM)
            const result = getPrediction('E1', 13, 2);
            expect(result).toEqual({
                probability: 'MEDIUM',
                estimatedDelay: 2,
                reason: 'Sortie scolaire estimée (+2 min)',
            });
        });

        it('should return LOW probability outside rush hour and school exit on a weekday', () => {
            const getPrediction = getHook();
            // Friday (5), 10 AM
            const result = getPrediction('E1', 10, 5);
            expect(result).toEqual({
                probability: 'LOW',
                estimatedDelay: 0,
                reason: 'Trafic fluide',
            });
        });

        it('should return LOW probability during morning rush hour on a weekend', () => {
            const getPrediction = getHook();
            // Sunday (0), 8 AM
            const result = getPrediction('E1', 8, 0);
            expect(result).toEqual({
                probability: 'LOW',
                estimatedDelay: 0,
                reason: 'Trafic fluide',
            });
        });

        it('should return LOW probability during school exit time on a weekend', () => {
            const getPrediction = getHook();
            // Saturday (6), 12 PM
            const result = getPrediction('E1', 12, 6);
            expect(result).toEqual({
                probability: 'LOW',
                estimatedDelay: 0,
                reason: 'Trafic fluide',
            });
        });
    });

    describe('Line TER', () => {
        it('should return MEDIUM probability and 3 min delay during rush hour on a weekday', () => {
            const getPrediction = getHook();
            // Wednesday (3), 17 (5 PM)
            const result = getPrediction('TER', 17, 3);
            expect(result).toEqual({
                probability: 'MEDIUM',
                estimatedDelay: 3,
                reason: 'Trafic dense estimé (+3 min)',
            });
        });

        it('should return MEDIUM probability and 3 min delay during rush hour on a weekend', () => {
            const getPrediction = getHook();
            // Saturday (6), 8 AM (TER logic does not check weekend for rush hour)
            const result = getPrediction('TER', 8, 6);
            expect(result).toEqual({
                probability: 'MEDIUM',
                estimatedDelay: 3,
                reason: 'Trafic dense estimé (+3 min)',
            });
        });

        it('should return LOW probability outside rush hour', () => {
            const getPrediction = getHook();
            // Wednesday (3), 14 (2 PM)
            const result = getPrediction('TER', 14, 3);
            expect(result).toEqual({
                probability: 'LOW',
                estimatedDelay: 0,
                reason: 'Trafic fluide',
            });
        });
    });

    describe('Other Lines', () => {
        it('should return LOW probability for unknown lines during rush hour', () => {
            const getPrediction = getHook();
            // Monday (1), 8 AM
            const result = getPrediction('A', 8, 1);
            expect(result).toEqual({
                probability: 'LOW',
                estimatedDelay: 0,
                reason: 'Trafic fluide',
            });
        });

        it('should return LOW probability for unknown lines outside rush hour', () => {
            const getPrediction = getHook();
            // Monday (1), 14 (2 PM)
            const result = getPrediction('A', 14, 1);
            expect(result).toEqual({
                probability: 'LOW',
                estimatedDelay: 0,
                reason: 'Trafic fluide',
            });
        });
    });
});
