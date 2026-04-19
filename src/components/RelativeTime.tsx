'use client';

import { useState, useEffect } from 'react';

// ⚡ Bolt: Cache Intl.DateTimeFormat instance to avoid expensive recreation on every render (every second)
const TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
});

interface RelativeTimeProps {
    timestamp: number;
    className?: string;
}

export default function RelativeTime({ timestamp, className = '' }: RelativeTimeProps) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatRelativeTime = (ts: number): string => {
        if (!ts) return '--:--:--';
        const seconds = Math.floor((now - ts) / 1000);
        if (seconds < 5) return 'À l\'instant';
        if (seconds < 60) return `il y a ${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `il y a ${minutes}min`;
        return TIME_FORMATTER.format(ts);
    };

    return <span className={className}>{formatRelativeTime(timestamp)}</span>;
}
