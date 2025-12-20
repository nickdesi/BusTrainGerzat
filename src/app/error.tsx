'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Application error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
            <div className="bg-[#1a1a1a] rounded-xl p-8 max-w-md w-full text-center border border-gray-800">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">
                    Une erreur est survenue
                </h2>
                <p className="text-gray-400 mb-6 text-sm">
                    L&apos;application a rencontré un problème. Veuillez réessayer.
                </p>
                <button
                    onClick={() => reset()}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
                >
                    <RefreshCw className="w-5 h-5" />
                    Réessayer
                </button>
                <p className="text-gray-600 text-xs mt-4">
                    Si le problème persiste, rechargez la page.
                </p>
            </div>
        </div>
    );
}
