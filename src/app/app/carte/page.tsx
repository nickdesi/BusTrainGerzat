'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Bus, Clock3, Eye, EyeOff, MapPin, Navigation, Radar, RefreshCw, Satellite } from 'lucide-react';
import { useVehiclePositions } from '@/hooks/useVehiclePositions';
import { useLineE1Data } from '@/hooks/useLineE1Data';
import { useQueryClient } from '@tanstack/react-query';

const BusMap = dynamic(() => import('@/components/BusMap'), {
    ssr: false,
    loading: () => <MapLoadingState />,
});

function MapLoadingState() {
    return (
        <div className="flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/45 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10">
                    <RefreshCw className="h-7 w-7 animate-spin text-emerald-300" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-200">Chargement carte live</p>
                <p className="mt-2 text-sm text-gray-400">Préparation des arrêts, tracés et véhicules E1…</p>
            </div>
        </div>
    );
}

function getMetricToneClasses(tone: 'green' | 'yellow' | 'blue' | 'neutral') {
    switch (tone) {
        case 'green':
            return 'from-emerald-400/25 to-emerald-400/5 text-emerald-200 border-emerald-300/20';
        case 'yellow':
            return 'from-yellow-400/25 to-yellow-400/5 text-yellow-100 border-yellow-300/20';
        case 'blue':
            return 'from-sky-400/25 to-sky-400/5 text-sky-100 border-sky-300/20';
        case 'neutral':
            return 'from-white/12 to-white/5 text-white border-white/10';
    }
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof Bus; label: string; value: number | string; tone: 'green' | 'yellow' | 'blue' | 'neutral' }) {
    return (
        <div className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br p-4 shadow-xl shadow-black/25 ${getMetricToneClasses(tone)}`}>
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-current opacity-10 blur-2xl" aria-hidden="true" />
            <div className="relative flex items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">{label}</p>
                    <p className="mt-2 text-3xl font-black leading-none text-white md:text-4xl">{value}</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}

export default function CartePage() {
    const [showStops, setShowStops] = useState(true);
    const { data: vehicleData, isFetching, dataUpdatedAt } = useVehiclePositions();
    const { data: lineData } = useLineE1Data();
    const queryClient = useQueryClient();

    const stats = useMemo(() => {
        const vehicles = vehicleData?.vehicles ?? [];

        // ⚡ Bolt: Calculate stats in a single pass to avoid creating multiple intermediate arrays with filter()
        let realtimeCount = 0;
        let estimatedCount = 0;
        for (const vehicle of vehicles) {
            if (vehicle.isRealtime) {
                realtimeCount++;
            } else {
                estimatedCount++;
            }
        }

        return {
            total: vehicleData?.count ?? vehicles.length,
            realtime: realtimeCount,
            estimated: estimatedCount,
            stops: lineData?.stops.length ?? 0,
        };
    }, [lineData?.stops.length, vehicleData?.count, vehicleData?.vehicles]);

    const lastUpdate = dataUpdatedAt
        ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(dataUpdatedAt)
        : '—';

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['vehicle-positions'] });
    };

    return (
        <main id="main-content" className="min-h-screen overflow-hidden bg-[#050505] px-3 py-4 text-gray-100 md:px-6 md:py-6">
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.22),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(253,195,0,0.18),transparent_24%),linear-gradient(135deg,#050505_0%,#101014_52%,#050505_100%)]" aria-hidden="true" />
            <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20 [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" aria-hidden="true" />

            <a
                href="#live-map"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-emerald-400 focus:px-4 focus:py-2 focus:font-bold focus:text-black"
            >
                Aller à la carte live
            </a>

            <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1800px] gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
                <aside className="relative z-10 flex flex-col gap-4 xl:min-h-[calc(100vh-3rem)]">
                    <header className="overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-black/55 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100">
                            <Radar className="h-3.5 w-3.5" aria-hidden="true" /> Live Ops
                        </div>
                        <h1 className="font-mono text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl xl:text-6xl">
                            Ligne<br /><span className="text-emerald-300 text-glow">E1</span>
                        </h1>
                        <p className="mt-4 text-sm font-semibold uppercase leading-6 tracking-[0.18em] text-gray-400">
                            Carte temps réel Gerzat, Clermont, Aubière et Romagnat.
                        </p>
                    </header>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <MetricCard icon={Bus} label="Bus visibles" value={stats.total} tone="green" />
                        <MetricCard icon={Satellite} label="Signal GPS" value={stats.realtime} tone="yellow" />
                        <MetricCard icon={MapPin} label="Arrêts" value={stats.stops} tone="blue" />
                        <MetricCard icon={Clock3} label="Estimées" value={stats.estimated} tone="neutral" />
                    </div>

                    <section className="rounded-[2rem] border border-white/10 bg-black/55 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Console</p>
                                <p className="mt-1 text-sm font-bold text-white">MAJ : {lastUpdate}</p>
                            </div>
                            <span className={`relative flex h-3 w-3 ${isFetching ? 'text-yellow-300' : 'text-emerald-300'}`}>
                                <span className={`absolute inline-flex h-3 w-3 rounded-full opacity-75 ${isFetching ? 'animate-ping bg-yellow-300' : 'bg-emerald-300'}`} />
                                <span className={`relative inline-flex h-3 w-3 rounded-full ${isFetching ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
                            </span>
                        </div>

                        <div className="grid gap-2">
                            <button
                                onClick={() => setShowStops((value) => !value)}
                                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${showStops
                                    ? 'border-emerald-400/35 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/20'
                                    : 'border-white/10 bg-white/[0.04] text-gray-300 hover:bg-white/10'
                                    }`}
                                aria-pressed={showStops}
                            >
                                {showStops ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                                {showStops ? 'Arrêts affichés' : 'Arrêts masqués'}
                            </button>

                            <button
                                onClick={handleRefresh}
                                disabled={isFetching}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 text-sm font-black uppercase tracking-wider text-black transition-colors hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
                                Actualiser la flotte
                            </button>
                        </div>
                    </section>
                </aside>

                <section id="live-map" aria-label="Carte live de la ligne E1" className="relative z-0 min-h-[68vh] overflow-hidden rounded-[2.25rem] border border-white/10 bg-black shadow-2xl shadow-black/60 md:min-h-[760px] xl:min-h-[calc(100vh-3rem)]">
                    <div className="pointer-events-none absolute inset-0 z-[2] rounded-[2.25rem] ring-1 ring-inset ring-white/10" aria-hidden="true" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 via-black/25 to-transparent p-4 md:p-6" aria-hidden="true">
                        <div className="rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-white/80 backdrop-blur-xl">
                            <Navigation className="mr-2 inline h-4 w-4 text-emerald-300" />Carte opérationnelle
                        </div>
                        <div className="hidden rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-white/60 backdrop-blur-xl md:block">
                            {stats.stops} arrêts • {stats.total} bus
                        </div>
                    </div>
                    <div className="absolute inset-0">
                        <BusMap showStops={showStops} />
                    </div>
                </section>
            </div>
        </main>
    );
}
