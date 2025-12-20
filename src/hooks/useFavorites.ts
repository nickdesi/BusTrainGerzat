import { useState, useEffect } from 'react';

// Favorite is uniquely identified by line + destination + stop
export interface Favorite {
    id: string; // generated from line + destination
    line: string;
    destination: string;
    type: 'BUS' | 'TER';
}

export function useFavorites() {
    const [favorites, setFavorites] = useState<Favorite[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = localStorage.getItem('gerzat_favorites');
            const parsed = saved ? JSON.parse(saved) : [];

            // Migration: Clear old "line-dest" favorites if they don't look like specific IDs
            // or just let them be naturally phased out or manually removed.
            // But to avoid confusion, let's keep them valid for now, but new ones will be specific.

            // CLEANUP: Remove favorites older than 24 hours (if they have timestamp equivalent)
            // Since we don't store timestamp yet, we'll start now.
            // For now, no cleanup of legacy data.
            return parsed;
        } catch (e) {
            console.error('Failed to parse favorites', e);
            return [];
        }
    });

    // Save favorites to local storage whenever they change
    useEffect(() => {
        localStorage.setItem('gerzat_favorites', JSON.stringify(favorites));
    }, [favorites]);

    const toggleFavorite = (item: Favorite) => {
        // Use the specific item.id provided (bus-123-1200) instead of generating one
        const id = item.id;

        setFavorites(prev => {
            const exists = prev.some(f => f.id === id);
            if (exists) {
                return prev.filter(f => f.id !== id);
            } else {
                return [...prev, item];
            }
        });
    };

    const isFavorite = (id: string) => {
        return favorites.some(f => f.id === id);
    };

    return { favorites, toggleFavorite, isFavorite };
}
