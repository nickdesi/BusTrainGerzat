'use client';

import { useEffect, useState } from 'react';
import { Clock, Calendar } from 'lucide-react';
import SplitFlapDisplay from './SplitFlapDisplay';

export default function ClockWidget() {
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatClock = () => {
        if (!currentTime) return '00:00:00';
        return currentTime.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const formatDate = () => {
        if (!currentTime) return '';
        return currentTime.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
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
