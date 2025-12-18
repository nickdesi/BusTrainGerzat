'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { RefreshCw, Bus, Train, Filter, WifiOff, Map, Eye, EyeOff } from 'lucide-react';
import DeparturesBoard from '@/components/DeparturesBoard';
import DeparturesList from '@/components/DeparturesList';
import ClockWidget from '@/components/ClockWidget';
import RelativeTime from '@/components/RelativeTime';
import SearchWidget from '@/components/SearchWidget';
import { useDepartures } from '@/hooks/useDepartures';
import { useDelayNotifications } from '@/hooks/useDelayNotifications';
import { useFavorites } from '@/hooks/useFavorites';
import { useColorblind } from '@/context/ColorblindContext';
import { usePredictiveDelay } from '@/hooks/usePredictiveDelay';
import { TransportFilter } from '@/types';
import { AlertTriangle } from 'lucide-react';

export default function Home() {
  const { departures, arrivals, isLoading, isFetching, error, lastUpdated, refetch } = useDepartures();
  const [filter, setFilter] = useState<TransportFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { favorites, toggleFavorite } = useFavorites();
  const { isColorblindMode, toggleColorblindMode } = useColorblind();
  const { getPrediction } = usePredictiveDelay();

  // Smart Alert Logic: Check if any favorited line has a predicted delay
  const smartAlert = useMemo(() => {
    if (favorites.length === 0) return null;

    // Check next departures for favorites
    for (const departure of departures) {
      if (!favorites.some(f => f.id === `${departure.line}-${departure.destination}`)) continue;

      const dTime = new Date(departure.departureTime);
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
  }, [departures, favorites]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enable delay notifications

  useDelayNotifications(departures, arrivals);

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

  const filteredArrivals = useMemo(() => {
    let result = arrivals;

    // Type filter
    if (filter === 'bus') result = result.filter(a => a.type === 'BUS');
    else if (filter === 'train') result = result.filter(a => a.type === 'TER');

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.line.toLowerCase().includes(q) ||
        (a.provenance && a.provenance.toLowerCase().includes(q))
      );
    }
    return result;
  }, [arrivals, filter, searchQuery]);

  return (
    <main id="main-content" className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] text-gray-100 font-sans">
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
            <div className="flex flex-col gap-4 items-end">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleColorblindMode}
                  className={`p-2 rounded-lg border transition-colors ${isColorblindMode ? 'bg-blue-900/50 border-blue-500 text-blue-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'}`}
                  title={isColorblindMode ? "Désactiver mode daltonien" : "Activer mode daltonien"}
                  aria-label={isColorblindMode ? "Désactiver le mode daltonien" : "Activer le mode daltonien"}
                  aria-pressed={isColorblindMode}
                >
                  {isColorblindMode ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                <ClockWidget />
              </div>
              <div className="w-full max-w-[200px] lg:max-w-xs">
                <SearchWidget onSearch={setSearchQuery} />
              </div>
            </div>
          </div>

          {/* Smart Alert Banner */}
          {smartAlert && (
            <div className="mt-6 p-4 rounded-lg bg-purple-900/40 border border-purple-500/50 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="p-2 bg-purple-900/50 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-purple-200 font-bold flex items-center gap-2">
                  Perturbation probable sur vos favoris
                  <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 border border-purple-500/30 uppercase">IA</span>
                </h3>
                <p className="text-purple-300/80 text-sm mt-1">
                  Ligne <span className="font-bold text-white">{smartAlert.line}</span> vers {smartAlert.destination} :
                  Risque de <span className="font-bold text-white">+{smartAlert.delay} min</span> ({smartAlert.reason})
                </p>
              </div>
            </div>
          )}

          {/* Controls Row */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-900/50 rounded-lg p-4 border border-gray-800">
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

            {/* Carte Live Button */}
            <Link
              href="/carte"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold transition-all hover:scale-105 active:scale-95"
            >
              <Map className="w-3 h-3" />
              <span>CARTE LIVE</span>
            </Link>

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
        <div className="bg-[#1a1a1a] rounded-lg border-2 border-gray-800 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 px-4 md:px-6 py-3 border-b-4 border-black">
            <h2 className="text-lg md:text-xl font-black text-black uppercase tracking-widest flex items-center gap-3 font-mono">
              <div className="w-3 h-3 bg-black rounded-full animate-pulse" aria-hidden="true"></div>
              Tableau des Départs
              {filter !== 'all' && <span className="text-sm font-normal opacity-70">({filter === 'bus' ? 'Bus uniquement' : 'TER uniquement'})</span>}
            </h2>
          </div>
          <DeparturesBoard
            departures={filteredDepartures}
            loading={isLoading}
            favorites={favorites.map(f => f.id)}
            onToggleFavorite={(line, dest, type) => toggleFavorite({ line, destination: dest, type })}
          />
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
          <DeparturesBoard
            departures={filteredArrivals}
            loading={isLoading}
            boardType="arrivals"
            favorites={favorites.map(f => f.id)}
            onToggleFavorite={(line, dest, type) => toggleFavorite({ line, destination: dest, type })}
          />
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
  );
}
