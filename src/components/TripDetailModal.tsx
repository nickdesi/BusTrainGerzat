'use client';

import { useEffect, useCallback } from 'react';
import { X, Bus, AlertCircle, Route } from 'lucide-react';
import { useTripDetails } from '@/hooks/useTripDetails';
import TripTimeline from './TripTimeline';

// Stable empty array reference to prevent defeating TripTimeline's React.memo()
const EMPTY_STOPS_ARRAY: React.ComponentProps<typeof TripTimeline>['stops'] = [];

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
        <div className="fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:items-center sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-950/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-gray-950/95 shadow-2xl shadow-black/50 ring-1 ring-white/5 sm:max-h-[90vh] sm:rounded-[2rem]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-yellow-400/10 via-emerald-400/5 to-transparent" />

                {/* Header */}
                <div className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div
                            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg shadow-yellow-500/20 ring-1 ring-white/20 sm:h-12 sm:w-12"
                            style={{ backgroundColor: '#fdc300' }}
                        >
                            <Bus className="h-6 w-6 text-black" />
                        </div>
                        <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2">
                                <span className="rounded-full bg-yellow-400 px-2.5 py-1 text-[11px] font-black text-black shadow-sm sm:text-xs">
                                    Ligne {lineName}
                                </span>
                                {tripData?.isRealtime && (
                                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                                        live
                                    </span>
                                )}
                            </div>
                            {tripData ? (
                                <div className="min-w-0 text-sm text-gray-400">
                                    <p className="truncate text-[11px] uppercase tracking-[0.14em] text-gray-500 sm:text-xs sm:tracking-[0.18em]">Départ · {tripData.origin}</p>
                                    <p className="truncate text-sm font-bold text-white sm:text-base">→ {tripData.headsign}</p>
                                </div>
                            ) : (
                                <h2 className="text-lg font-bold text-white">Détail du trajet</h2>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                        aria-label="Fermer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="relative flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-5">
                    {error ? (
                        <div className="flex flex-col items-center justify-center rounded-3xl border border-red-400/15 bg-red-500/[0.06] py-14 text-red-300">
                            <AlertCircle className="mb-3 h-10 w-10" />
                            <p className="font-semibold">Erreur de chargement</p>
                            <p className="mt-1 text-sm text-gray-500">
                                Impossible de récupérer les détails du trajet
                            </p>
                        </div>
                    ) : (
                        <TripTimeline
                            stops={tripData?.stops || EMPTY_STOPS_ARRAY}
                            isLoading={isLoading}
                            isRealtime={tripData?.isRealtime}
                            routeColor="#fdc300"
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="relative border-t border-white/10 bg-white/[0.03] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-3">
                    <div className="flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            {tripData?.isRealtime ? (
                                <span className="flex items-center gap-1.5 text-emerald-300">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse" />
                                    Données temps réel
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <Route className="h-3.5 w-3.5" />
                                    Horaires théoriques
                                </span>
                            )}
                        </span>
                        <span>Mise à jour automatique toutes les 15s</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
