'use client';

import { useState, useRef, useCallback, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const THRESHOLD = 80;

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (containerRef.current?.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
            setIsPulling(true);
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        if (diff > 0 && containerRef.current?.scrollTop === 0) {
            setPullDistance(Math.min(diff * 0.5, THRESHOLD * 1.5));
        }
    }, [isPulling, isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling) return;

        if (pullDistance >= THRESHOLD && !isRefreshing) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }

        setIsPulling(false);
        setPullDistance(0);
    }, [isPulling, pullDistance, isRefreshing, onRefresh]);

    return (
        <div
            ref={containerRef}
            className="relative h-full overflow-auto"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-200 z-50"
                style={{
                    top: pullDistance - 40,
                    opacity: pullDistance / THRESHOLD
                }}
            >
                <div className={`p-3 rounded-full bg-yellow-500/20 border border-yellow-500/50 ${isRefreshing ? 'animate-spin' : ''}`}>
                    <RefreshCw
                        className="w-5 h-5 text-yellow-500"
                        style={{
                            transform: `rotate(${pullDistance * 2}deg)`
                        }}
                    />
                </div>
            </div>

            {/* Content with pull offset */}
            <div
                className="transition-transform duration-200"
                style={{
                    transform: `translateY(${isPulling || isRefreshing ? pullDistance : 0}px)`
                }}
            >
                {children}
            </div>
        </div>
    );
}
