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
            return saved ? JSON.parse(saved) : [];
        } catch {
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
