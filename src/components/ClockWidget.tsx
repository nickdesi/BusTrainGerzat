'use client';

import { useEffect, useState } from 'react';
import { Clock, Calendar } from 'lucide-react';
import SplitFlapDisplay from './SplitFlapDisplay';

// ⚡ Bolt: Cache Intl.DateTimeFormat instances to avoid expensive recreation on every render (every second)
const TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
});

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
});

export default function ClockWidget() {
    // Use lazy initial state to avoid hydration mismatch and set initial value in effect callback
    const [currentTime, setCurrentTime] = useState<Date | null>(() => {
        // Return null during SSR to avoid hydration mismatch
        if (typeof window === 'undefined') return null;
        return null; // We'll set it in the interval callback
    });

    useEffect(() => {
        // Set initial time via interval callback (not synchronously)
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        // Trigger first update immediately via timeout (async, not sync)
        const immediate = setTimeout(() => setCurrentTime(new Date()), 0);
        return () => {
            clearInterval(timer);
            clearTimeout(immediate);
        };
    }, []);

    const formatClock = () => {
        if (!currentTime) return '00:00:00';
        return TIME_FORMATTER.format(currentTime);
    };

    const formatDate = () => {
        if (!currentTime) return '';
        return DATE_FORMATTER.format(currentTime);
    };

    return (
        <div className="flex flex-col items-center lg:items-end gap-3">
            <div className="flex items-center gap-4 bg-black/30 p-4 rounded-xl border border-yellow-500/10 box-glow">
                <Clock className="w-8 h-8 text-yellow-500 animate-pulse" />
                <div className="tabular-nums">
                    <SplitFlapDisplay text={formatClock()} size="2xl" color="text-yellow-500" />
                </div>
            </div>
            <div className="flex items-center gap-3 text-yellow-500/60 font-mono text-sm tracking-widest uppercase">
                <Calendar className="w-4 h-4" />
                <p>{formatDate()}</p>
            </div>
        </div>
    );
}
