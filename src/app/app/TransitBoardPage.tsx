'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Activity, AlertTriangle, Bus, ExternalLink, Filter, RefreshCw, Sparkles, Star, Train, WifiOff } from 'lucide-react';
import ClockWidget from '@/components/ClockWidget';
import { DataFreshnessWarning } from '@/components/DataFreshnessWarning';
import DeparturesBoard from '@/components/DeparturesBoard';
import DeparturesList from '@/components/DeparturesList';
import RelativeTime from '@/components/RelativeTime';
import SearchWidget from '@/components/SearchWidget';
import { useDelayNotifications } from '@/hooks/useDelayNotifications';
import { useDepartures } from '@/hooks/useDepartures';
import { useFavorites } from '@/hooks/useFavorites';
import { usePredictiveDelay } from '@/hooks/usePredictiveDelay';
import { APP_VERSION } from '@/lib/app-version';
import { TransportFilter } from '@/types';

export interface TransitBoardPageTheme {
    main: string;
    skipFocus: string;
    topLine: string;
    headerBorder: string;
    headerGlow: string;
    badge: string;
    title: string;
    logoShadow: string;
    subtitle: string;
    activityIcon: string;
    fetchingPing: string;
    fetchingDot: string;
    allFilterActive: string;
    refreshButton: string;
    boardBorder: string;
    boardHeader: string;
    boardTitle: string;
    boardPulseDot: string;
    boardFilterBadge: string;
}

interface TransitBoardPageProps {
    boardType: 'departures' | 'arrivals';
    title: string;
    badgeLabel: string;
    skipHref: string;
    skipLabel: string;
    boardTitle: string;
    primaryStatLabel: string;
    theme: TransitBoardPageTheme;
    enableSmartAlert?: boolean;
    showTicker?: boolean;
}

export default function TransitBoardPage({
    boardType,
    title,
    badgeLabel,
    skipHref,
    skipLabel,
    boardTitle,
    primaryStatLabel,
    theme,
    enableSmartAlert = false,
    showTicker = false,
}: TransitBoardPageProps) {
    const { departures, arrivals, isLoading, isFetching, error, lastUpdated, refetch } = useDepartures();
    const [filter, setFilter] = useState<TransportFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const { favorites, toggleFavorite } = useFavorites();
    const { getPrediction } = usePredictiveDelay();

    const entries = boardType === 'arrivals' ? arrivals : departures;
    const favoriteIds = useMemo(() => favorites.map(f => f.id), [favorites]);

    const handleToggleFavorite = useCallback((id: string, line: string, dest: string, type: 'BUS' | 'TER') => {
        toggleFavorite({ id, line, destination: dest, type });
    }, [toggleFavorite]);

    useDelayNotifications(departures, arrivals, favoriteIds);

    const filteredEntries = useMemo(() => {
        if (filter === 'all' && !searchQuery) return entries;

        const q = searchQuery ? searchQuery.toLowerCase() : '';

        return entries.filter(entry => {
            if (filter === 'bus' && entry.type !== 'BUS') return false;
            if (filter === 'train' && entry.type !== 'TER') return false;

            if (q) {
                const location = boardType === 'arrivals'
                    ? entry.provenance ?? ''
                    : entry.destination;

                if (!entry.line.toLowerCase().includes(q) && !location.toLowerCase().includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [boardType, entries, filter, searchQuery]);

    const stats = useMemo(() => {
        let realtimeCount = 0;
        let favoritesCount = 0;
        const favSet = new Set(favoriteIds);

        for (const entry of filteredEntries) {
            if (entry.isRealtime) realtimeCount++;
            if (favSet.has(entry.id)) favoritesCount++;
        }

        return {
            total: filteredEntries.length,
            realtime: realtimeCount,
            favorites: favoritesCount,
        };
    }, [favoriteIds, filteredEntries]);

    const smartAlert = useMemo(() => {
        if (!enableSmartAlert || favorites.length === 0) return null;

        for (const departure of departures) {
            if (!favorites.some(f => f.id === departure.id)) continue;

            const dTime = new Date(departure.departureTime * 1000);
            const prediction = getPrediction(departure.line, dTime.getHours(), dTime.getDay());

            if (prediction.probability === 'HIGH') {
                return {
                    line: departure.line,
                    destination: departure.destination,
                    delay: prediction.estimatedDelay,
                    reason: prediction.reason,
                };
            }
        }

        return null;
    }, [departures, enableSmartAlert, favorites, getPrediction]);

    return (
        <main id="main-content" className={theme.main}>
            <a href={skipHref} className={theme.skipFocus}>{skipLabel}</a>
            <div className="relative max-w-7xl mx-auto px-4 py-5 md:py-8">
                <div className={theme.topLine} aria-hidden="true" />

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3">
                        <WifiOff className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-red-400 font-medium">Connexion impossible</p>
                            <p className="text-red-400/70 text-sm">Les données affichées peuvent être obsolètes.</p>
                        </div>
                        <button onClick={() => refetch()} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 text-sm transition-colors">
                            Réessayer
                        </button>
                    </div>
                )}

                <DataFreshnessWarning />

                <header className={theme.headerBorder}>
                    <div className={theme.headerGlow} aria-hidden="true" />
                    <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="text-center lg:text-left">
                            <div className={theme.badge}>
                                <Sparkles className="h-2.5 w-2.5 md:h-3 md:w-3" aria-hidden="true" />
                                {badgeLabel}
                            </div>
                            <h1 className={theme.title}>
                                <Image src="/icon-512.png" alt="Logo Gerzat Live" width={32} height={32} priority className={theme.logoShadow} />
                                {title}
                            </h1>
                            <p className={theme.subtitle}>Gare SNCF • Bus Champfleuri / Patural (Express)</p>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[260px] lg:items-end">
                            <ClockWidget />
                            <SearchWidget
                                onSearch={setSearchQuery}
                                placeholder={boardType === 'arrivals' ? 'Rechercher ligne, provenance...' : 'Rechercher ligne, destination...'}
                                ariaLabel={boardType === 'arrivals' ? 'Rechercher une ligne ou une provenance' : 'Rechercher une ligne ou une destination'}
                            />
                        </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-1.5 md:gap-2">
                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 md:rounded-xl md:px-3 md:py-2">
                            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 md:text-[10px]"><Activity className={theme.activityIcon} /> {primaryStatLabel}</div>
                            <p className="text-lg font-black leading-none text-white md:text-2xl">{stats.total}</p>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 md:rounded-xl md:px-3 md:py-2">
                            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 md:text-[10px]"><WifiOff className="h-3 w-3 text-green-400 rotate-180" /> Live</div>
                            <p className="text-lg font-black leading-none text-white md:text-2xl">{stats.realtime}</p>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 md:rounded-xl md:px-3 md:py-2">
                            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 md:text-[10px]"><Star className="h-3 w-3 text-yellow-300" /> Favoris</div>
                            <p className="text-lg font-black leading-none text-white md:text-2xl">{stats.favorites}</p>
                        </div>
                    </div>

                    {smartAlert && (
                        <div className="mt-6 p-4 rounded-lg bg-purple-900/40 border border-purple-500/50 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="p-2 bg-purple-900/50 rounded-full shrink-0">
                                <AlertTriangle className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-purple-200 font-bold flex items-center gap-2">
                                    Perturbation probable sur vos favoris
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 border border-purple-500/30 uppercase">Prévision</span>
                                </h3>
                                <p className="text-purple-300/80 text-sm mt-1">
                                    Ligne <span className="font-bold text-white">{smartAlert.line}</span> vers {smartAlert.destination} : Risque de <span className="font-bold text-white">+{smartAlert.delay} min</span> ({smartAlert.reason})
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-3 flex flex-col sm:flex-row justify-between items-center gap-2 rounded-xl border border-white/10 bg-black/35 p-2 shadow-inner shadow-black/30 md:mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400 min-w-[180px]" role="status" aria-live="polite">
                            <div className="flex h-2 w-2 relative">
                                <span className={`absolute inline-flex h-2 w-2 rounded-full opacity-75 ${isFetching ? theme.fetchingPing : 'bg-green-400'}`} />
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isFetching ? theme.fetchingDot : 'bg-green-500'}`} />
                            </div>
                            <span className="font-medium whitespace-nowrap">MAJ : <RelativeTime timestamp={lastUpdated} /></span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-500" aria-hidden="true" />
                            <div className="flex rounded-lg overflow-hidden border border-gray-700">
                                <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs font-bold transition-colors ${filter === 'all' ? theme.allFilterActive : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`} aria-pressed={filter === 'all'}>TOUS</button>
                                <button onClick={() => setFilter('bus')} className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors ${filter === 'bus' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`} aria-pressed={filter === 'bus'}><Bus className="w-3 h-3" /> BUS</button>
                                <button onClick={() => setFilter('train')} className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors ${filter === 'train' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`} aria-pressed={filter === 'train'}><Train className="w-3 h-3" /> TER</button>
                            </div>
                        </div>

                        <button onClick={refetch} disabled={isFetching} aria-label="Actualiser les données" className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${theme.refreshButton} ${isFetching ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}>
                            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                            <span>{isFetching ? 'ACTUALISATION...' : 'ACTUALISER'}</span>
                        </button>
                    </div>
                </header>

                <div id={skipHref.slice(1)} className={theme.boardBorder}>
                    <div className={theme.boardHeader}>
                        <h2 className={theme.boardTitle}>
                            <div className={theme.boardPulseDot} aria-hidden="true" />
                            {boardTitle}
                            {filter !== 'all' && <span className={theme.boardFilterBadge}>{filter === 'bus' ? 'Bus uniquement' : 'TER uniquement'}</span>}
                        </h2>
                    </div>
                    <DeparturesBoard departures={filteredEntries} loading={isLoading} boardType={boardType} favorites={favoriteIds} onToggleFavorite={handleToggleFavorite} />
                    <DeparturesList departures={filteredEntries} loading={isLoading} boardType={boardType} favorites={favoriteIds} onToggleFavorite={handleToggleFavorite} />
                </div>

                {showTicker && (
                    <div className="mt-8 overflow-hidden rounded-2xl border border-blue-500/20 bg-blue-500/10 py-3 shadow-lg shadow-black/20 group" role="marquee" aria-label="Informations défilantes">
                        <div className="animate-marquee group-hover:pause whitespace-nowrap text-blue-400 font-mono text-lg font-bold tracking-widest uppercase flex items-center gap-12">
                            <span>Bienvenue en Gare de Gerzat</span>
                            <span aria-hidden="true">•</span>
                            <span>Retrouvez vos proches sur le quai</span>
                            <span aria-hidden="true">•</span>
                            <span>Stationnement minute disponible</span>
                            <span aria-hidden="true">•</span>
                            <span>T2C & SNCF vous souhaitent une agréable journée</span>
                        </div>
                    </div>
                )}

                <div className="w-full text-center py-4 mt-8 opacity-40 hover:opacity-100 transition-opacity duration-300">
                    <div className="flex flex-col items-center gap-2">
                        <Link href="https://github.com/nickdesi/BusTrainGerzat" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/20 group">
                            <ExternalLink className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                            <span className="text-xs font-medium text-white/50 group-hover:text-white transition-colors">Code source sur GitHub</span>
                        </Link>
                        <p className="text-[10px] font-mono text-white/30 tracking-widest uppercase mt-2">Gerzat Live v{APP_VERSION} • 2026</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
