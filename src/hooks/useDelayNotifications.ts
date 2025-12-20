'use client';

import { useEffect, useRef, useCallback } from 'react';
import { UnifiedEntry } from '@/types';

const DELAY_THRESHOLD_MINUTES = 5;
const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between same notifications

export function useDelayNotifications(departures: UnifiedEntry[], arrivals: UnifiedEntry[]) {
    const notifiedIds = useRef<Map<string, number>>(new Map());
    const permissionGranted = useRef(false);

    // Request notification permission on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().then((permission) => {
                    permissionGranted.current = permission === 'granted';
                }).catch(() => {
                    // Permission request failed, ignore
                });
            } else if ('Notification' in window) {
                permissionGranted.current = Notification.permission === 'granted';
            }
        } catch (error) {
            console.warn('Notification setup error:', error);
        }
    }, []);

    const showNotification = useCallback(async (entry: UnifiedEntry, type: 'departure' | 'arrival') => {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const delayMinutes = Math.floor(entry.delay / 60);
        const title = `${entry.type === 'BUS' ? '🚌' : '🚆'} Retard ${type === 'departure' ? 'départ' : 'arrivée'}`;
        const body = `${entry.line} vers ${entry.destination}: +${delayMinutes} min`;

        // Check cooldown
        const lastNotified = notifiedIds.current.get(entry.id);
        if (lastNotified && Date.now() - lastNotified < NOTIFICATION_COOLDOWN_MS) {
            return;
        }

        try {
            // Use ServiceWorker API for notifications (required on mobile)
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, {
                    body,
                    icon: '/icon-512.png',
                    badge: '/icon-512.png',
                    tag: entry.id,
                    silent: false
                });
            } else {
                // Fallback for desktop browsers without ServiceWorker
                new Notification(title, {
                    body,
                    icon: '/icon-512.png',
                    badge: '/icon-512.png',
                    tag: entry.id,
                    silent: false
                });
            }
            notifiedIds.current.set(entry.id, Date.now());
        } catch (error) {
            console.warn('Failed to show notification:', error);
        }
    }, []);

    // Check for significant delays
    useEffect(() => {
        const allEntries = [...departures, ...arrivals];

        allEntries.forEach((entry) => {
            const delayMinutes = Math.floor(entry.delay / 60);
            if (delayMinutes >= DELAY_THRESHOLD_MINUTES && entry.isRealtime) {
                const type = departures.includes(entry) ? 'departure' : 'arrival';
                showNotification(entry, type);
            }
        });
    }, [departures, arrivals, showNotification]);

    // Function to manually request permission
    const requestPermission = useCallback(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            permissionGranted.current = permission === 'granted';
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }, []);

    return { requestPermission };
}
