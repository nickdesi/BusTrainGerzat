'use client';

import { useState, useRef, useCallback, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const isPulling = useRef(false);
    const hasMoved = useRef(false);

    // Higher threshold to prevent accidental triggers
    const THRESHOLD = 120;
    // Minimum Y movement before we consider it a pull
    const MIN_PULL_START = 20;

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Only enable if already at top of page
        if (window.scrollY <= 0 && !isRefreshing) {
            startY.current = e.touches[0].clientY;
            isPulling.current = false;
            hasMoved.current = false;
        }
    }, [isRefreshing]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        // Must be at top of page AND pulling down
        if (window.scrollY <= 0 && diff > MIN_PULL_START) {
            // Start pull mode only after clear downward movement
            if (!isPulling.current && !hasMoved.current) {
                isPulling.current = true;
            }

            if (isPulling.current) {
                // Apply resistance to make it feel intentional
                const resistance = 0.4;
                const distance = Math.min((diff - MIN_PULL_START) * resistance, THRESHOLD * 1.2);
                setPullDistance(distance);
            }
        } else if (diff < 0) {
            // Scrolling up - cancel any pull
            isPulling.current = false;
            setPullDistance(0);
        }

        hasMoved.current = true;
    }, [isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling.current) {
            setPullDistance(0);
            return;
        }

        if (pullDistance >= THRESHOLD && !isRefreshing) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }

        isPulling.current = false;
        setPullDistance(0);
    }, [pullDistance, isRefreshing, onRefresh]);

    const showIndicator = pullDistance > 10 || isRefreshing;

    return (
        <div className="relative min-h-screen">
            {/* Pull indicator - only visible when actively pulling */}
            {showIndicator && (
                <div
                    className="fixed left-1/2 -translate-x-1/2 flex items-center justify-center z-50 transition-opacity duration-200"
                    style={{
                        top: Math.max(pullDistance - 50, 10),
                        opacity: Math.min(pullDistance / THRESHOLD, 1)
                    }}
                >
                    <div className={`p-3 rounded-full bg-yellow-500/20 border border-yellow-500/50 backdrop-blur-sm ${isRefreshing ? 'animate-spin' : ''}`}>
                        <RefreshCw
                            className="w-5 h-5 text-yellow-500"
                            style={{
                                transform: `rotate(${pullDistance * 3}deg)`
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Content - no transform to avoid scroll issues */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    );
}
