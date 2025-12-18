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
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-10 py-2 border border-gray-700 rounded-lg leading-5 bg-gray-900/50 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-gray-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 sm:text-sm transition-colors"
                placeholder="Rechercher ligne, destination..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechercher une ligne ou une destination"
            />
            {query && (
                <button
                    onClick={() => setQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 "
                    aria-label="Effacer la recherche"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
