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
        } catch (e) {
            console.error('Failed to parse favorites', e);
            return [];
        }
    });

    // Save favorites to local storage whenever they change
    useEffect(() => {
        localStorage.setItem('gerzat_favorites', JSON.stringify(favorites));
    }, [favorites]);

    const toggleFavorite = (item: Omit<Favorite, 'id'>) => {
        const id = `${item.line}-${item.destination}`;
        setFavorites(prev => {
            const exists = prev.some(f => f.id === id);
            if (exists) {
                return prev.filter(f => f.id !== id);
            } else {
                return [...prev, { ...item, id }];
            }
        });
    };

    const isFavorite = (line: string, destination: string) => {
        const id = `${line}-${destination}`;
        return favorites.some(f => f.id === id);
    };

    return { favorites, toggleFavorite, isFavorite };
}
