'use client';

import { useState, useMemo, useCallback } from 'react';
import { RefreshCw, AlertTriangle, Bus, Train, Filter, WifiOff } from 'lucide-react';
import DeparturesBoard from '@/components/DeparturesBoard';
import DeparturesList from '@/components/DeparturesList';
import ClockWidget from '@/components/ClockWidget';
import RelativeTime from '@/components/RelativeTime';
import PullToRefresh from '@/components/PullToRefresh';
import { useDepartures } from '@/hooks/useDepartures';
import { useDelayNotifications } from '@/hooks/useDelayNotifications';
import { TransportFilter } from '@/types';

export default function Home() {
  const { departures, arrivals, isLoading, isFetching, error, lastUpdated, refetch } = useDepartures();
  const [filter, setFilter] = useState<TransportFilter>('all');

  // Enable delay notifications
  useDelayNotifications(departures, arrivals);

  // Filter departures and arrivals based on transport type
  const filteredDepartures = useMemo(() => {
    if (filter === 'all') return departures;
    if (filter === 'bus') return departures.filter(d => d.type === 'BUS');
    return departures.filter(d => d.type === 'TER');
  }, [departures, filter]);

  const filteredArrivals = useMemo(() => {
    if (filter === 'all') return arrivals;
    if (filter === 'bus') return arrivals.filter(a => a.type === 'BUS');
    return arrivals.filter(a => a.type === 'TER');
  }, [arrivals, filter]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] text-gray-100 font-sans">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">

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

          {/* Airport-style Header */}
          <header className="mb-8 border-b-2 border-yellow-500/30 pb-6 relative">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              <div className="text-center lg:text-left">
                <h1 className="text-3xl md:text-5xl font-bold tracking-wider text-yellow-500 uppercase mb-2 font-mono text-glow">
                  GERZAT
                </h1>
                <p className="text-sm md:text-base text-yellow-500/80 uppercase tracking-[0.5em] font-medium pl-1">
                  Départs & Arrivées
                </p>
              </div>
              <ClockWidget />
            </div>

            {/* Controls Row */}
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              {/* Status */}
              <div className="flex items-center gap-2 text-sm text-gray-400" role="status" aria-live="polite">
                <div className="flex h-2 w-2 relative">
                  <span className={`absolute inline-flex h-2 w-2 rounded-full opacity-75 ${isFetching ? 'animate-ping bg-yellow-400' : 'bg-green-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isFetching ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                </div>
                <span className="font-medium">
                  Dernière MAJ : <RelativeTime timestamp={lastUpdated} />
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

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/20 border-2 border-red-500/50 rounded-lg p-4 flex items-center gap-3 text-red-400 slide-up" role="alert">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <p className="font-bold uppercase tracking-wide">Erreur de chargement des données</p>
            </div>
          )}

          {/* Departures Board */}
          <div className="bg-[#1a1a1a] rounded-lg border-2 border-gray-800 overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 px-4 md:px-6 py-3 border-b-4 border-black">
              <h2 className="text-lg md:text-xl font-black text-black uppercase tracking-widest flex items-center gap-3 font-mono">
                <div className="w-3 h-3 bg-black rounded-full animate-pulse" aria-hidden="true"></div>
                Tableau des Départs
                {filter !== 'all' && <span className="text-sm font-normal opacity-70">({filter === 'bus' ? 'Bus uniquement' : 'TER uniquement'})</span>}
              </h2>
            </div>
            <DeparturesBoard departures={filteredDepartures} loading={isLoading} />
            <DeparturesList departures={filteredDepartures} loading={isLoading} />
          </div>

          {/* Arrivals Board */}
          <div className="mt-8 bg-[#1a1a1a] rounded-lg border-2 border-gray-800 overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 md:px-6 py-3 border-b-4 border-black">
              <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-widest flex items-center gap-3 font-mono">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" aria-hidden="true"></div>
                Tableau des Arrivées
                {filter !== 'all' && <span className="text-sm font-normal opacity-70">({filter === 'bus' ? 'Bus uniquement' : 'TER uniquement'})</span>}
              </h2>
            </div>
            <DeparturesBoard departures={filteredArrivals} loading={isLoading} boardType="arrivals" />
            <DeparturesList departures={filteredArrivals} loading={isLoading} boardType="arrivals" />
          </div>

          {/* Scrolling Ticker */}
          <div className="mt-8 bg-yellow-500/10 border-y border-yellow-500/20 py-3 overflow-hidden relative group" role="marquee" aria-label="Informations défilantes">
            <div className="animate-marquee group-hover:pause whitespace-nowrap text-yellow-500 font-mono text-lg font-bold tracking-widest uppercase flex items-center gap-12">
              <span>Bienvenue en Gare de Gerzat</span>
              <span aria-hidden="true">•</span>
              <span>N&apos;oubliez pas de valider votre titre de transport</span>
              <span aria-hidden="true">•</span>
              <span>Signalez tout colis abandonné</span>
              <span aria-hidden="true">•</span>
              <span>Bon voyage sur nos lignes</span>
              <span aria-hidden="true">•</span>
              <span>T2C & SNCF vous souhaitent une agréable journée</span>
            </div>
          </div>
        </div>
      </main>
    </PullToRefresh>
  );
}
