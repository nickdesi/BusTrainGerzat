'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Eye, EyeOff, RefreshCw, Map } from 'lucide-react';
import { useVehiclePositions } from '@/hooks/useVehiclePositions';
import { useQueryClient } from '@tanstack/react-query';

// Dynamic import of BusMap to avoid SSR issues with Leaflet
const BusMap = dynamic(() => import('@/components/BusMap'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Chargement de la carte...</p>
            </div>
        </div>
    ),
});

export default function CartePage() {
    const [showStops, setShowStops] = useState(true);
    const { isFetching } = useVehiclePositions();
    const queryClient = useQueryClient();

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['vehicle-positions'] });
    };

    return (
        <main className="h-screen flex flex-col bg-gray-900">
            {/* Header */}
            <header className="flex-shrink-0 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 px-4 py-3">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    {/* Left: Back button and title */}
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="hidden sm:inline">Retour</span>
                        </Link>
                        <div className="h-6 w-px bg-gray-700"></div>
                        <div className="flex items-center gap-3">
                            <Map className="w-6 h-6 text-green-500" />
                            <h1 className="text-xl font-bold text-white">
                                Ligne E1 <span className="text-green-500">Live</span>
                            </h1>
                        </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-2">
                        {/* Toggle stops visibility */}
                        <button
                            onClick={() => setShowStops(!showStops)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${showStops
                                ? 'bg-green-600/20 text-green-400 border border-green-600/50'
                                : 'bg-gray-800 text-gray-400 border border-gray-700'
                                }`}
                            title={showStops ? 'Masquer les arrêts' : 'Afficher les arrêts'}
                        >
                            {showStops ? (
                                <Eye className="w-4 h-4" />
                            ) : (
                                <EyeOff className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline text-sm">Arrêts</span>
                        </button>

                        {/* Refresh button */}
                        <button
                            onClick={handleRefresh}
                            disabled={isFetching}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors ${isFetching ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline text-sm">Actualiser</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Map container */}
            <div className="flex-1 relative">
                <BusMap showStops={showStops} />
            </div>
        </main>
    );
}
