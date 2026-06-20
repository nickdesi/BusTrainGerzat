'use client';

import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SearchWidgetProps {
    onSearch: (query: string) => void;
    placeholder?: string;
    ariaLabel?: string;
}

export default function SearchWidget({
    onSearch,
    placeholder = 'Rechercher ligne, destination...',
    ariaLabel = 'Rechercher une ligne ou une destination',
}: SearchWidgetProps) {
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
                className="block h-10 w-full rounded-xl border border-white/10 bg-black/35 pl-10 pr-10 text-sm leading-5 text-gray-100 placeholder-gray-500 shadow-inner shadow-black/30 transition-all duration-200 focus:border-yellow-400 focus:bg-black/55 focus:outline-none focus:ring-2 focus:ring-yellow-400/25 md:h-11 md:rounded-2xl md:pl-11 md:pr-11 md:text-base"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={ariaLabel}
            />
            {query && (
                <button
                    onClick={() => setQuery('')}
                    className="absolute inset-y-1 right-1 flex w-8 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 md:w-9 md:rounded-xl"
                    aria-label="Effacer la recherche"
                >
                    <X className="h-5 w-5" />
                </button>
            )}
        </div>
    );
}
