'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, Bus, Train, RefreshCw, ArrowRight, MapPin, Calendar } from 'lucide-react';

interface Update {
  tripId: string;
  arrival: number;
  delay: number;
  isRealtime: boolean;
  headsign: string;
  direction: number;
}

interface TrainUpdate {
  tripId: string;
  trainNumber: string;
  direction: string;
  arrival: { time: string; delay: number };
  departure: { time: string; delay: number };
  delay: number;
  isRealtime: boolean;
}

export default function Home() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [trainUpdates, setTrainUpdates] = useState<TrainUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch Bus Data
      const resBus = await fetch('/api/realtime');
      if (!resBus.ok) throw new Error('Failed to fetch bus data');
      const dataBus = await resBus.json();

      const uniqueUpdates = dataBus.updates.filter((update: Update, index: number, self: Update[]) =>
        index === self.findIndex((t) => (
          t.tripId === update.tripId && t.arrival === update.arrival
        ))
      );
      setUpdates(uniqueUpdates);

      // Fetch Train Data
      const resTrain = await fetch('/api/trains');
      if (resTrain.ok) {
        const dataTrain = await resTrain.json();
        setTrainUpdates(dataTrain.updates);
      }

      setLastUpdated(Date.now());
      setError(null);
    } catch (err) {
      setError('Erreur de chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLastUpdated(Date.now());
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDelay = (delay: number, isRealtime: boolean) => {
    if (!isRealtime) return <span className="text-gray-500 text-xs font-medium bg-gray-800 px-2 py-1 rounded-full">Théorique</span>;
    if (delay === 0) return <span className="text-green-400 text-xs font-bold bg-green-500/10 px-2 py-1 rounded-full">À l'heure</span>;
    if (delay > 0) return <span className="text-red-400 text-xs font-bold bg-red-500/10 px-2 py-1 rounded-full">+{Math.floor(delay / 60)} min</span>;
    return <span className="text-blue-400 text-xs font-bold bg-blue-500/10 px-2 py-1 rounded-full">Avance</span>;
  };

  const trainsToClermont = trainUpdates.filter(t => t.direction === 'To Clermont');
  const trainsFromClermont = trainUpdates.filter(t => t.direction === 'From Clermont');

  return (
    <main className="min-h-screen bg-[#0f1115] text-gray-100 p-4 md:p-8 font-sans selection:bg-red-500/30">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-800 pb-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
              Gerzat Live
            </h1>
            <p className="text-gray-400 mt-1 flex items-center justify-center md:justify-start gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4" /> Gare & Arrêt Champfleuri
            </p>
          </div>

          <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-2xl border border-gray-800/50 backdrop-blur-sm">
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Dernière mise à jour</div>
              <div className="text-sm font-mono text-gray-300">
                {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('fr-FR') : '--:--:--'}
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className={`p-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* BUS SECTION */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-red-600 to-red-700 p-2.5 rounded-xl shadow-lg shadow-red-900/20">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-100">Bus T2C</h2>
                <p className="text-xs text-red-400 font-medium uppercase tracking-wide">Ligne 20</p>
              </div>
            </div>

            <div className="space-y-3">
              {loading && updates.length === 0 ? (
                <div className="h-32 rounded-2xl bg-gray-900/50 animate-pulse border border-gray-800" />
              ) : updates.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-900/30 rounded-2xl border border-gray-800/50 border-dashed">
                  <Bus className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>Aucun bus prévu.</p>
                </div>
              ) : (
                updates.map((update) => (
                  <div
                    key={`${update.tripId}-${update.arrival}`}
                    className="group relative bg-gray-900/60 hover:bg-gray-800/80 backdrop-blur-md border border-gray-800/60 hover:border-red-500/30 rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-red-900/10"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold tracking-tighter text-white group-hover:text-red-400 transition-colors">
                            {formatTime(update.arrival)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                          <span className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-500 border border-gray-700">
                            {update.direction === 0 ? 'Vers' : 'Terminus'}
                          </span>
                          <span className="truncate max-w-[180px] font-medium">{update.headsign}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {formatDelay(update.delay, update.isRealtime)}
                        {update.isRealtime && (
                          <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* TRAIN SECTION */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl shadow-lg shadow-blue-900/20">
                <Train className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-100">Trains TER</h2>
                <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">Gare de Gerzat</p>
              </div>
            </div>

            <div className="grid gap-4">
              {/* Vers Clermont */}
              <div className="bg-gray-900/40 rounded-3xl p-1 border border-gray-800/50">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-800/50 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vers Clermont-Fd</h3>
                </div>
                <div className="p-2 space-y-2">
                  {trainsToClermont.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4 italic">Aucun train affiché</p>
                  ) : (
                    trainsToClermont.map((train) => (
                      <div key={train.tripId} className="flex justify-between items-center bg-gray-800/40 hover:bg-gray-800/80 p-3 rounded-xl border border-transparent hover:border-blue-500/20 transition-all duration-200">
                        <div className="flex items-center gap-4">
                          <div className="text-xl font-bold font-mono text-blue-100">{formatTime(Number(train.arrival.time))}</div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">TER</span>
                            <span className="text-xs text-gray-400 font-mono">{train.trainNumber}</span>
                          </div>
                        </div>
                        <div>{formatDelay(train.delay, train.isRealtime)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Vers Riom/Moulins */}
              <div className="bg-gray-900/40 rounded-3xl p-1 border border-gray-800/50">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-800/50 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vers Riom / Moulins</h3>
                </div>
                <div className="p-2 space-y-2">
                  {trainsFromClermont.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4 italic">Aucun train affiché</p>
                  ) : (
                    trainsFromClermont.map((train) => (
                      <div key={train.tripId} className="flex justify-between items-center bg-gray-800/40 hover:bg-gray-800/80 p-3 rounded-xl border border-transparent hover:border-indigo-500/20 transition-all duration-200">
                        <div className="flex items-center gap-4">
                          <div className="text-xl font-bold font-mono text-indigo-100">{formatTime(Number(train.arrival.time))}</div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">TER</span>
                            <span className="text-xs text-gray-400 font-mono">{train.trainNumber}</span>
                          </div>
                        </div>
                        <div>{formatDelay(train.delay, train.isRealtime)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
