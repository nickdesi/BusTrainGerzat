'use client';

import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SearchWidgetProps {
    onSearch: (query: string) => void;
}

export default function SearchWidget({ onSearch }: SearchWidgetProps) {
    const [query, setQuery] = useState('');

    // Debounce search update
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, onSearch]);

    return (
        <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search className="h-4 w-4 text-gray-500" />
            </div>
            <input
                type="text"
                className="block h-12 w-full rounded-2xl border border-white/10 bg-black/35 pl-12 pr-12 text-base leading-5 text-gray-100 placeholder-gray-500 shadow-inner shadow-black/30 transition-colors focus:border-yellow-400 focus:bg-black/55 focus:outline-none focus:ring-2 focus:ring-yellow-400/25"
                placeholder="Rechercher ligne, destination..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechercher une ligne ou une destination"
            />
            {query && (
                <button
                    onClick={() => setQuery('')}
                    className="absolute inset-y-1 right-1 flex w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                    aria-label="Effacer la recherche"
                >
                    <X className="h-5 w-5" />
                </button>
            )}
        </div>
    );
}
