import { useState, useEffect, useCallback } from 'react';
import { BusUpdate, TrainUpdate, TransportData } from '@/types/transport';

export function useTransportData(refreshInterval = 30000) {
    const [data, setData] = useState<TransportData>({
        bus: [],
        train: [],
        lastUpdated: null,
        loading: true,
        error: null,
    });

    const [refreshProgress, setRefreshProgress] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            setData(prev => ({ ...prev, loading: true, error: null }));

            const [resBus, resTrain] = await Promise.all([
                fetch('/api/realtime'),
                fetch('/api/trains')
            ]);

            let busUpdates: BusUpdate[] = [];
            let trainUpdates: TrainUpdate[] = [];

            if (resBus.ok) {
                const busData = await resBus.json();
                // Filter unique bus updates
                busUpdates = busData.updates.filter((update: BusUpdate, index: number, self: BusUpdate[]) =>
                    index === self.findIndex((t) => (
                        t.tripId === update.tripId && t.arrival === update.arrival
                    ))
                );
            }

            if (resTrain.ok) {
                const trainData = await resTrain.json();
                trainUpdates = trainData.updates;
            }

            if (!resBus.ok && !resTrain.ok) {
                throw new Error('Impossible de récupérer les données');
            }

            setData({
                bus: busUpdates,
                train: trainUpdates,
                lastUpdated: Date.now(),
                loading: false,
                error: null,
            });

            // Reset progress on successful fetch
            setRefreshProgress(0);

        } catch (err) {
            console.error(err);
            setData(prev => ({
                ...prev,
                loading: false,
                error: 'Erreur de chargement des données',
            }));
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / refreshInterval) * 100, 100);
            setRefreshProgress(progress);

            if (elapsed >= refreshInterval) {
                fetchData();
            }
        }, 100); // Update progress every 100ms

        return () => clearInterval(interval);
    }, [fetchData, refreshInterval, data.lastUpdated]); // Reset timer when data updates

    return { ...data, refreshProgress, refresh: fetchData };
}
