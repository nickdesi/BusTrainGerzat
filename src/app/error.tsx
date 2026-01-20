'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex bg-black items-center justify-center min-h-screen p-4 text-center">
            <div className="space-y-4 max-w-md">
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-red-900/20 rounded-full border border-red-500/30">
                        <AlertCircle className="w-12 h-12 text-red-500 animate-pulse" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold font-display text-white">Oups ! Une erreur est survenue.</h2>
                <p className="text-gray-400">
                    Nous n&apos;avons pas pu charger cette page. Essayez de rafraîchir ou revenez plus tard.
                </p>
                <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-6 py-3 mt-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors"
                >
                    <RotateCcw className="w-5 h-5" />
                    Réessayer
                </button>
            </div>
        </div>
    );
}
