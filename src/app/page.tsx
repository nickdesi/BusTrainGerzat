'use client';

import { AlertTriangle } from 'lucide-react';
import { useTransportData } from '@/hooks/useTransportData';
import { Header } from '@/components/Header';
import { BusSection } from '@/components/BusSection';
import { TrainSection } from '@/components/TrainSection';

export default function Home() {
  const { bus, train, lastUpdated, loading, error, refresh } = useTransportData();

  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">

        <Header
          lastUpdated={lastUpdated}
          loading={loading}
          onRefresh={refresh}
        />

        {error && (
          <div className="glass-panel bg-rose-500/10 border-rose-500/20 rounded-2xl p-4 flex items-center gap-3 text-rose-400 animate-fade-in">
            <AlertTriangle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <BusSection updates={bus} loading={loading} />
          <TrainSection updates={train} loading={loading} />
        </div>
      </div>
    </main>
  );
}
