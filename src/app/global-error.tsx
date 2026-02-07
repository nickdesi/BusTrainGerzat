'use client';

import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function GlobalError({
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="fr">
            <body className="bg-surface-darker">
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="bg-surface-elevated rounded-xl p-8 max-w-md w-full text-center border border-gray-800">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">
                            Erreur critique
                        </h2>
                        <p className="text-gray-400 mb-6 text-sm">
                            L&apos;application a rencontré une erreur inattendue.
                        </p>
                        <button
                            onClick={() => reset()}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Recharger l&apos;application
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
