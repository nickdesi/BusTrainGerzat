

export interface Prediction {
    probability: 'LOW' | 'MEDIUM' | 'HIGH';
    estimatedDelay: number; // in minutes
    reason: string;
}

export function usePredictiveDelay() {
    const getPrediction = (line: string, hour: number, day: number): Prediction => {
        // 0 = Sunday, 6 = Saturday
        const isWeekend = day === 0 || day === 6;
        const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);

        // Simulate historical data analysis
        if (line === '20') {
            if (isRushHour && !isWeekend) {
                return {
                    probability: 'HIGH',
                    estimatedDelay: 5,
                    reason: 'Pointe matin/soir (Hist. +5min)'
                };
            }
            if (hour >= 12 && hour <= 14 && !isWeekend) {
                return {
                    probability: 'MEDIUM',
                    estimatedDelay: 2,
                    reason: 'Sortie scolaire (Hist. +2min)'
                };
            }
        }

        if (line === 'TER') {
            if (isRushHour) {
                return {
                    probability: 'MEDIUM',
                    estimatedDelay: 3,
                    reason: 'Trafic dense (Hist. +3min)'
                };
            }
        }

        return {
            probability: 'LOW',
            estimatedDelay: 0,
            reason: 'Trafic fluide'
        };
    };

    return { getPrediction };
}
