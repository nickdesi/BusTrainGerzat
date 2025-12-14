'use client';

import { useEffect, useState } from 'react';

export default function ServiceWorkerRegistration() {
    const [showOfflineBanner, setShowOfflineBanner] = useState(false);

    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return;

        try {
            // Register service worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/service-worker.js')
                    .then((registration) => {
                        console.log('SW registered:', registration.scope);
                    })
                    .catch((error) => {
                        console.warn('SW registration failed:', error);
                    });
            }

            // Online/offline detection
            const handleOnline = () => setShowOfflineBanner(false);
            const handleOffline = () => setShowOfflineBanner(true);

            // Check initial state
            if (!navigator.onLine) {
                setShowOfflineBanner(true);
            }

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        } catch (error) {
            console.warn('ServiceWorker setup error:', error);
        }
    }, []);

    if (!showOfflineBanner) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 
                        bg-orange-500/90 backdrop-blur-sm rounded-lg p-4 shadow-lg 
                        flex items-center gap-3 animate-slideUp">
            <div className="w-3 h-3 bg-orange-200 rounded-full animate-pulse" />
            <div className="flex-1">
                <p className="text-white font-medium text-sm">Mode hors-ligne</p>
                <p className="text-white/80 text-xs">Affichage des dernières données</p>
            </div>
        </div>
    );
}
