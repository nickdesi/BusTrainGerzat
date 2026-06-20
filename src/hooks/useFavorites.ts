import { useState, useEffect, useCallback } from 'react';

/**
 * Represents a user's favorite trip
 */
export interface Favorite {
    id: string;
    line: string;
    destination: string;
    type: 'BUS' | 'TER';
}

/**
 * Hook for managing user favorites with localStorage persistence.
 * Uses unique trip IDs for granular selection.
 */
export function useFavorites() {
    const [favorites, setFavorites] = useState<Favorite[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = localStorage.getItem('gerzat_favorites');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('gerzat_favorites', JSON.stringify(favorites));
    }, [favorites]);

    const toggleFavorite = useCallback((item: Favorite) => {
        setFavorites(prev => {
            // ⚡ Bolt: Use a single pass with findIndex and slice to avoid creating multiple intermediate
            // arrays and closures from chained .some() and .filter() calls.
            const index = prev.findIndex(f => f.id === item.id);
            if (index !== -1) {
                const next = prev.slice();
                next.splice(index, 1);
                return next;
            }
            return [...prev, item];
        });
    }, []);

    const isFavorite = useCallback((id: string) => {
        // ⚡ Bolt: Use a simple for...of loop instead of .some() to avoid closure overhead on every call
        for (const f of favorites) {
            if (f.id === id) return true;
        }
        return false;
    }, [favorites]);

    return { favorites, toggleFavorite, isFavorite };
}
