'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RefreshCw, Bus, Train, Filter, WifiOff, Activity, Star, Sparkles } from 'lucide-react';
import DeparturesBoard from '@/components/DeparturesBoard';
import DeparturesList from '@/components/DeparturesList';
import ClockWidget from '@/components/ClockWidget';
import RelativeTime from '@/components/RelativeTime';
import SearchWidget from '@/components/SearchWidget';
import { useDepartures } from '@/hooks/useDepartures';
import { useDelayNotifications } from '@/hooks/useDelayNotifications';
import { useFavorites } from '@/hooks/useFavorites';
import { usePredictiveDelay } from '@/hooks/usePredictiveDelay';
import { TransportFilter } from '@/types';
import { AlertTriangle, Github } from 'lucide-react';
import { DataFreshnessWarning } from '@/components/DataFreshnessWarning';
import { APP_VERSION } from '@/lib/app-version';

export default function Home() {
  const { departures, arrivals, isLoading, isFetching, error, lastUpdated, refetch } = useDepartures();
  const [filter, setFilter] = useState<TransportFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { favorites, toggleFavorite } = useFavorites();
  const { getPrediction } = usePredictiveDelay();

  // Estimated delay advisory for favorited trips.
  const smartAlert = useMemo(() => {
    if (favorites.length === 0) return null;

    for (const departure of departures) {
      if (!favorites.some(f => f.id === departure.id)) continue;

      const dTime = new Date(departure.departureTime * 1000);
      const prediction = getPrediction(departure.line, dTime.getHours(), dTime.getDay());

      if (prediction.probability === 'HIGH') {
        return {
          line: departure.line,
          destination: departure.destination,
          delay: prediction.estimatedDelay,
          reason: prediction.reason
        };
      }
    }
    return null;
  }, [departures, favorites, getPrediction]);

  // Memoize favorite IDs for stable reference
  const favoriteIds = useMemo(() => favorites.map(f => f.id), [favorites]);

  // Stable callback for toggle favorite
  const handleToggleFavorite = useCallback((id: string, line: string, dest: string, type: 'BUS' | 'TER') => {
    toggleFavorite({ id, line, destination: dest, type });
  }, [toggleFavorite]);

  // Enable delay notifications
  useDelayNotifications(departures, arrivals, favoriteIds);

  // Filter departures and arrivals based on transport type and search query
  const filteredDepartures = useMemo(() => {
    let result = departures;

    // Type filter
    if (filter === 'bus') result = result.filter(d => d.type === 'BUS');
    else if (filter === 'train') result = result.filter(d => d.type === 'TER');

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.line.toLowerCase().includes(q) ||
        d.destination.toLowerCase().includes(q)
      );
    }
    return result;
  }, [departures, filter, searchQuery]);

  const departureStats = useMemo(() => {
    let realtimeCount = 0;
    let favoritesCount = 0;

    // ⚡ Bolt: Convert favorites to Set for O(1) lookups instead of O(N) array includes
    const favSet = new Set(favoriteIds);

    // ⚡ Bolt: Calculate stats in a single pass to avoid creating multiple intermediate arrays with filter()
    for (const d of filteredDepartures) {
      if (d.isRealtime) realtimeCount++;
      if (favSet.has(d.id)) favoritesCount++;
    }

    return {
      total: filteredDepartures.length,
      realtime: realtimeCount,
      favorites: favoritesCount,
    };
  }, [filteredDepartures, favoriteIds]);

  return (
    <main id="main-content" className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(253,195,0,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_28%),linear-gradient(135deg,var(--color-background),var(--color-surface-dark)_48%,#050505)] text-gray-100 font-sans">
      {/* Skip Link for accessibility */}
      <a
        href="#departures-board"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-yellow-500 focus:text-black focus:rounded-lg focus:font-bold"
      >
        Aller au tableau des départs
      </a>
      <div className="relative max-w-7xl mx-auto px-4 py-5 md:py-8">
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" aria-hidden="true" />

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-400 font-medium">Connexion impossible</p>
              <p className="text-red-400/70 text-sm">Les données affichées peuvent être obsolètes.</p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 text-sm transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Data Freshness Warning */}
        <DataFreshnessWarning />

        {/* Airport-style Header */}
        <header className="mb-4 relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-black/25 p-2.5 shadow-xl shadow-black/25 backdrop-blur-xl md:mb-5 md:rounded-[1.75rem] md:p-4">
          <div className="absolute -right-16 -top-16 h-28 w-28 rounded-full bg-yellow-500/10 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-center lg:text-left">
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-yellow-300 md:text-[10px]">
                <Sparkles className="h-2.5 w-2.5 md:h-3 md:w-3" aria-hidden="true" />
                Live multimodal
              </div>
              <h1 className="flex items-center justify-center gap-1.5 font-mono text-xl font-bold uppercase tracking-wider text-yellow-500 text-glow md:gap-2 md:text-3xl lg:justify-start">
                <Image src="/icon-512.png" alt="Logo Gerzat Live" width={32} height={32} priority className="h-6 w-6 drop-shadow-[0_0_14px_rgba(253,195,0,0.35)] md:h-8 md:w-8" />
                DÉPARTS • GERZAT
              </h1>
              <p className="mt-0.5 hidden truncate text-xs font-medium uppercase tracking-widest text-yellow-500/70 sm:block">
                Gare SNCF • Bus Champfleuri / Patural (Express)
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[260px] lg:items-end">
              <ClockWidget />
              <SearchWidget onSearch={setSearchQuery} />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 md:gap-2">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 md:rounded-xl md:px-3 md:py-2">
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 md:text-[10px]"><Activity className="h-3 w-3 text-yellow-400" /> Passages</div>
              <p className="text-lg font-black leading-none text-white md:text-2xl">{departureStats.total}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 md:rounded-xl md:px-3 md:py-2">
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 md:text-[10px]"><WifiOff className="h-3 w-3 text-green-400 rotate-180" /> Live</div>
              <p className="text-lg font-black leading-none text-white md:text-2xl">{departureStats.realtime}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 md:rounded-xl md:px-3 md:py-2">
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 md:text-[10px]"><Star className="h-3 w-3 text-yellow-300" /> Favoris</div>
              <p className="text-lg font-black leading-none text-white md:text-2xl">{departureStats.favorites}</p>
            </div>
          </div>

          {/* Estimated Delay Advisory */}
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
                  Ligne <span className="font-bold text-white">{smartAlert.line}</span> vers {smartAlert.destination} :
                  Risque de <span className="font-bold text-white">+{smartAlert.delay} min</span> ({smartAlert.reason})
                </p>
              </div>
            </div>
          )}

          {/* Controls Row */}
          <div className="mt-3 flex flex-col sm:flex-row justify-between items-center gap-2 rounded-xl border border-white/10 bg-black/35 p-2 shadow-inner shadow-black/30 md:mt-4">
            {/* Status - fixed width to prevent layout shift */}
            <div className="flex items-center gap-2 text-sm text-gray-400 min-w-[180px]" role="status" aria-live="polite">
              <div className="flex h-2 w-2 relative">
                <span className={`absolute inline-flex h-2 w-2 rounded-full opacity-75 ${isFetching ? 'animate-ping bg-yellow-400' : 'bg-green-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isFetching ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
              </div>
              <span className="font-medium whitespace-nowrap">
                MAJ : <RelativeTime timestamp={lastUpdated} />
              </span>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" aria-hidden="true" />
              <div className="flex rounded-lg overflow-hidden border border-gray-700">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${filter === 'all' ? 'bg-yellow-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  aria-pressed={filter === 'all'}
                >
                  TOUS
                </button>
                <button
                  onClick={() => setFilter('bus')}
                  className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors ${filter === 'bus' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  aria-pressed={filter === 'bus'}
                >
                  <Bus className="w-3 h-3" /> BUS
                </button>
                <button
                  onClick={() => setFilter('train')}
                  className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors ${filter === 'train' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  aria-pressed={filter === 'train'}
                >
                  <Train className="w-3 h-3" /> TER
                </button>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={refetch}
              disabled={isFetching}
              aria-label="Actualiser les données"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-black font-bold transition-all ${isFetching ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{isFetching ? 'ACTUALISATION...' : 'ACTUALISER'}</span>
            </button>
          </div>
        </header>


        {/* Departures Board */}
        <div id="departures-board" className="overflow-hidden rounded-[2rem] border border-yellow-500/20 bg-surface-elevated shadow-2xl shadow-black/40 ring-1 ring-white/5">
          <div className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-amber-500 px-4 md:px-6 py-4 border-b-4 border-black">
            <h2 className="text-lg md:text-xl font-black text-black uppercase tracking-widest flex items-center gap-3 font-mono">
              <div className="w-3 h-3 bg-black rounded-full animate-pulse" aria-hidden="true"></div>
              Tableau des Départs
              {filter !== 'all' && <span className="rounded-full bg-black/10 px-2 py-1 text-xs font-bold opacity-80">{filter === 'bus' ? 'Bus uniquement' : 'TER uniquement'}</span>}
            </h2>
          </div>
          <DeparturesBoard
            departures={filteredDepartures}
            loading={isLoading}
            favorites={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
          />
          <DeparturesList
            departures={filteredDepartures}
            loading={isLoading}
            favorites={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>

        {/* Version Footer */}
        <div className="w-full text-center py-4 mt-8 opacity-40 hover:opacity-100 transition-opacity duration-300">
          <div className="flex flex-col items-center gap-2">
            <Link
              href="https://github.com/nickdesi/BusTrainGerzat"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/20 group"
            >
              <Github className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
              <span className="text-xs font-medium text-white/50 group-hover:text-white transition-colors">
                Code source sur GitHub
              </span>
            </Link>
            <p className="text-[10px] font-mono text-white/30 tracking-widest uppercase mt-2">
              Gerzat Live v{APP_VERSION} • 2026
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
