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
            const exists = prev.some(f => f.id === item.id);
            return exists
                ? prev.filter(f => f.id !== item.id)
                : [...prev, item];
        });
    }, []);

    const isFavorite = useCallback((id: string) => {
        return favorites.some(f => f.id === id);
    }, [favorites]);

    return { favorites, toggleFavorite, isFavorite };
}

