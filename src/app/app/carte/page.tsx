'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Bus, Eye, EyeOff, Radar, RefreshCw } from 'lucide-react';
import { useVehiclePositions } from '@/hooks/useVehiclePositions';
import { useLineE1Data } from '@/hooks/useLineE1Data';
import { useQueryClient } from '@tanstack/react-query';

// ⚡ Bolt: Cache Intl.DateTimeFormat instance to avoid expensive recreation on every render
const TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
});

const BusMap = dynamic(() => import('@/components/BusMap'), {
    ssr: false,
    loading: () => <MapLoadingState />,
});

function MapLoadingState() {
    return (
        <div className="flex h-full min-h-[min(68dvh,640px)] items-center justify-center overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/45 shadow-2xl shadow-black/40 backdrop-blur-xl md:min-h-[420px] md:rounded-[1.75rem]">
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

function MetricCard({ icon: Icon, label, value, tone, description }: { icon: typeof Bus; label: string; value: number | string; tone: 'green' | 'yellow' | 'blue' | 'neutral'; description?: string }) {
    return (
        <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3 shadow-xl shadow-black/25 md:rounded-3xl md:p-4 ${getMetricToneClasses(tone)}`}>
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-current opacity-10 blur-2xl" aria-hidden="true" />
            <div className="relative flex items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">{label}</p>
                    <p className="mt-1.5 text-2xl font-black leading-none text-white md:mt-2 md:text-4xl">{value}</p>
                    {description ? <p className="mt-2 text-xs font-semibold leading-4 text-white/55">{description}</p> : null}
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
        let gpsCount = 0;
        let realtimeInterpolatedCount = 0;
        let staticCount = 0;
        for (const vehicle of vehicles) {
            if (vehicle.source === 'gps') {
                gpsCount++;
            } else if (vehicle.source === 'realtime_interpolated') {
                realtimeInterpolatedCount++;
            } else {
                staticCount++;
            }
        }

        return {
            total: vehicleData?.count ?? vehicles.length,
            realtime: gpsCount + realtimeInterpolatedCount,
            staticEstimated: staticCount,
            stops: lineData?.stops.length ?? 0,
        };
    }, [lineData?.stops.length, vehicleData?.count, vehicleData?.vehicles]);

    const lastUpdate = dataUpdatedAt
        ? TIME_FORMATTER.format(dataUpdatedAt)
        : '—';

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['vehicle-positions'] });
    };

    return (
        <main id="main-content" className="min-h-screen overflow-hidden bg-[#050505] px-2 py-3 text-gray-100 md:px-6 md:py-6">
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.22),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(253,195,0,0.18),transparent_24%),linear-gradient(135deg,#050505_0%,#101014_52%,#050505_100%)]" aria-hidden="true" />
            <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20 [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" aria-hidden="true" />

            <a
                href="#live-map"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-emerald-400 focus:px-4 focus:py-2 focus:font-bold focus:text-black"
            >
                Aller à la carte live
            </a>

            <div className="relative mx-auto max-w-[1800px] gap-3 md:gap-4 xl:grid xl:grid-cols-[22rem_minmax(0,1fr)] xl:min-h-[calc(100vh-3rem)]">
                {/* Desktop-only Sidebar */}
                <aside className="hidden xl:flex xl:flex-col gap-3 md:gap-4">
                    <header className="overflow-hidden rounded-[1.5rem] border border-emerald-300/20 bg-black/55 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl md:rounded-[2rem] md:p-5">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100 md:mb-5">
                            <Radar className="h-3.5 w-3.5" aria-hidden="true" /> Live Ops
                        </div>
                        <h1 className="font-mono text-3xl font-black uppercase leading-none tracking-tight text-white md:text-5xl">
                            Ligne<br /><span className="text-emerald-300 text-glow">E1</span>
                        </h1>
                        <p className="mt-3 text-xs font-semibold uppercase leading-5 tracking-[0.14em] text-gray-400">
                            Positions en direct et estimations horaires T2C.
                        </p>
                    </header>

                    <div className="grid grid-cols-1 gap-2">
                        <MetricCard icon={Bus} label="Flotte active" value={`${stats.realtime}/${stats.total}`} tone="green" description="Bus suivis en direct" />
                    </div>

                    {/* Active vehicles list in sidebar */}
                    <section className="flex-1 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/55 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl flex flex-col">
                        <div className="mb-3 flex items-center justify-between px-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">Bus en circulation</p>
                            <span className="text-xs text-emerald-400 font-bold">{stats.total} bus</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[380px]">
                            {(vehicleData?.vehicles || []).map((v) => {
                                const delayMin = Math.round(v.delay / 60);
                                return (
                                    <div key={v.tripId} className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] transition-colors text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${v.direction === 1 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]'}`} />
                                            <span className="font-bold text-white">
                                                {v.direction === 1 ? 'Vers Gerzat' : 'Vers Aubière'}
                                            </span>
                                        </div>
                                        <span className={`font-mono font-bold ${delayMin > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {delayMin > 0 ? `+${delayMin}m` : 'À l’heure'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
                            <span>MAJ : {lastUpdate}</span>
                            <button onClick={handleRefresh} disabled={isFetching} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold cursor-pointer">
                                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                                Actualiser
                            </button>
                        </div>
                    </section>
                </aside>

                {/* Main Full-Viewport Map Section */}
                <section id="live-map" aria-label="Carte live de la ligne E1" className="relative z-0 h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-6rem)] xl:h-[calc(100vh-3rem)] w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-black shadow-2xl shadow-black/60 md:rounded-[2.25rem]">
                    <div className="pointer-events-none absolute inset-0 z-[2] rounded-[1.5rem] ring-1 ring-inset ring-white/10 md:rounded-[2.25rem]" aria-hidden="true" />

                    {/* Mobile Floating HUD Top Bar */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-[10] flex items-center justify-between gap-2 p-3 md:p-5" aria-hidden="true">
                        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-xl backdrop-blur-xl">
                            <span className="relative flex h-2 w-2">
                                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isFetching ? 'animate-ping bg-yellow-300' : 'bg-emerald-300'}`} />
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isFetching ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
                            </span>
                            <span className="text-emerald-300 font-mono">E1</span>
                            <span className="text-gray-400">·</span>
                            <span>{stats.total} bus</span>
                        </div>

                        <div className="pointer-events-auto flex items-center gap-2">
                            <button
                                onClick={() => setShowStops((value) => !value)}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-gray-300 shadow-xl backdrop-blur-xl hover:text-white cursor-pointer"
                                aria-label={showStops ? "Masquer les arrêts" : "Afficher les arrêts"}
                            >
                                {showStops ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4" />}
                            </button>

                            <button
                                onClick={handleRefresh}
                                disabled={isFetching}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-emerald-300 shadow-xl backdrop-blur-xl hover:text-emerald-200 cursor-pointer disabled:opacity-50"
                                aria-label="Actualiser la flotte"
                            >
                                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                            </button>
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
