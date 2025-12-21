'use client';

import { useEffect, useCallback } from 'react';
import { X, Bus, AlertCircle } from 'lucide-react';
import { useTripDetails } from '@/hooks/useTripDetails';
import TripTimeline from './TripTimeline';

interface TripDetailModalProps {
    tripId: string | null;
    lineName: string;
    onClose: () => void;
}

export default function TripDetailModal({ tripId, lineName, onClose }: TripDetailModalProps) {
    const { data: tripData, isLoading, error } = useTripDetails(tripId);

    // Handle escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (tripId) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [tripId, handleKeyDown]);

    if (!tripId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg max-h-[85vh] bg-gray-900 rounded-xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 flex items-center justify-center rounded-lg shadow-lg"
                            style={{ backgroundColor: '#fdc300' }}
                        >
                            <Bus className="w-5 h-5 text-black" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Ligne {lineName}
                            </h2>
                            {tripData && (
                                <p className="text-sm text-gray-400">
                                    → {tripData.headsign}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        aria-label="Fermer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {error ? (
                        <div className="flex flex-col items-center justify-center py-12 text-red-400">
                            <AlertCircle className="w-10 h-10 mb-3" />
                            <p className="font-medium">Erreur de chargement</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Impossible de récupérer les détails du trajet
                            </p>
                        </div>
                    ) : (
                        <TripTimeline
                            stops={tripData?.stops || []}
                            isLoading={isLoading}
                            isRealtime={tripData?.isRealtime}
                            routeColor="#fdc300"
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-700 bg-gray-800/50">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                            {tripData?.isRealtime ? (
                                <span className="flex items-center gap-1.5 text-green-400">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    Données temps réel
                                </span>
                            ) : (
                                'Horaires théoriques'
                            )}
                        </span>
                        <span>
                            Mise à jour automatique toutes les 15s
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
