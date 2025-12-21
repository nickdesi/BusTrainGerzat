'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ColorblindContextType {
    isColorblindMode: boolean;
    toggleColorblindMode: () => void;
}

const ColorblindContext = createContext<ColorblindContextType | undefined>(undefined);

export function ColorblindProvider({ children }: { children: ReactNode }) {
    const [isColorblindMode, setIsColorblindMode] = useState(() => {
        if (typeof window === 'undefined') return false;
        try {
            const saved = localStorage.getItem('gerzat_colorblind_mode');
            return saved ? JSON.parse(saved) : false;
        } catch {
            return false;
        }
    });

    const toggleColorblindMode = () => {
        setIsColorblindMode((prev: boolean) => {
            const newValue = !prev;
            localStorage.setItem('gerzat_colorblind_mode', JSON.stringify(newValue));
            return newValue;
        });
    };

    return (
        <ColorblindContext.Provider value={{ isColorblindMode, toggleColorblindMode }}>
            {children}
        </ColorblindContext.Provider>
    );
}

export function useColorblind() {
    const context = useContext(ColorblindContext);
    if (context === undefined) {
        throw new Error('useColorblind must be used within a ColorblindProvider');
    }
    return context;
}
