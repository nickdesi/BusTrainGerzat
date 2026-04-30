'use client';

import { useEffect, useState } from 'react';

export default function ServiceWorkerRegistration() {
    const [showOfflineBanner, setShowOfflineBanner] = useState(false);
    const [showUpdateBanner, setShowUpdateBanner] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let updateInterval: ReturnType<typeof setInterval> | undefined;
        let reloadedForControllerChange = false;

        const handleControllerChange = () => {
            if (reloadedForControllerChange) return;
            reloadedForControllerChange = true;
            window.location.reload();
        };

        try {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/service-worker.js')
                    .then((registration) => {
                        registration.update();

                        updateInterval = setInterval(() => registration.update(), 60 * 60 * 1000);

                        if (registration.waiting) {
                            setWaitingWorker(registration.waiting);
                            setShowUpdateBanner(true);
                        }

                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            if (!newWorker) return;

                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    setWaitingWorker(newWorker);
                                    setShowUpdateBanner(true);
                                }
                            });
                        });
                    })
                    .catch((error) => {
                        console.warn('SW registration failed:', error);
                    });

                navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
            }

            const handleOnline = () => setShowOfflineBanner(false);
            const handleOffline = () => setShowOfflineBanner(true);

            const checkOnline = setTimeout(() => {
                if (!navigator.onLine) setShowOfflineBanner(true);
            }, 0);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                if (updateInterval) clearInterval(updateInterval);
                clearTimeout(checkOnline);
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
                }
            };
        } catch (error) {
            console.warn('ServiceWorker setup error:', error);
        }
    }, []);

    const applyUpdate = () => {
        waitingWorker?.postMessage('skipWaiting');
    };

    return (
        <>
            {showOfflineBanner && (
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 
                                bg-orange-500/90 backdrop-blur-sm rounded-lg p-4 shadow-lg 
                                flex items-center gap-3 animate-slideUp">
                    <div className="w-3 h-3 bg-orange-200 rounded-full animate-pulse" />
                    <div className="flex-1">
                        <p className="text-white font-medium text-sm">Mode hors-ligne</p>
                        <p className="text-white/80 text-xs">Affichage des dernières données</p>
                    </div>
                </div>
            )}

            {showUpdateBanner && (
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 
                                bg-zinc-950/95 border border-yellow-400/30 backdrop-blur-sm rounded-lg p-4 shadow-lg 
                                flex items-center gap-3 animate-slideUp">
                    <div className="flex-1">
                        <p className="text-white font-medium text-sm">Nouvelle version disponible</p>
                        <p className="text-zinc-400 text-xs">Rechargez pour utiliser la dernière version de Gerzat Live.</p>
                    </div>
                    <button
                        type="button"
                        onClick={applyUpdate}
                        className="rounded-md bg-yellow-400 px-3 py-2 text-xs font-bold text-black hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200"
                    >
                        Recharger
                    </button>
                </div>
            )}
        </>
    );
}
