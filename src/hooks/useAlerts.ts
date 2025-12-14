'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UnifiedEntry } from '@/types';

const ALERTS_STORAGE_KEY = 'gerzat-alerts';

export function useAlerts(departures: UnifiedEntry[], arrivals: UnifiedEntry[]) {
    const [alertedIds, setAlertedIds] = useState<Set<string>>(new Set());
    const lastSpokenRef = useRef<Map<string, string>>(new Map());
    const audioContextRef = useRef<AudioContext | null>(null);

    // Load alerts from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
        if (stored) {
            try {
                setAlertedIds(new Set(JSON.parse(stored)));
            } catch (e) {
                console.error('Failed to parse alerts:', e);
            }
        }
    }, []);

    // Save alerts to localStorage when they change
    useEffect(() => {
        localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify([...alertedIds]));
    }, [alertedIds]);

    // Toggle alert for a specific entry
    const toggleAlert = useCallback((id: string) => {
        setAlertedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    // Check if entry is alerted
    const isAlerted = useCallback((id: string) => {
        return alertedIds.has(id);
    }, [alertedIds]);

    // Play notification sound using Web Audio API
    const playNotificationSound = useCallback(() => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
            const ctx = audioContextRef.current;

            // Create a pleasant notification sound
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
            oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.1); // C6
            oscillator.frequency.setValueAtTime(1319, ctx.currentTime + 0.2); // E6

            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.4);
        } catch (e) {
            console.error('Failed to play sound:', e);
        }
    }, []);

    // Speak the status using Speech Synthesis
    const speakStatus = useCallback((entry: UnifiedEntry) => {
        if (!('speechSynthesis' in window)) return;

        const type = entry.type === 'BUS' ? 'Bus' : 'Train';
        const line = entry.line;

        let statusText: string;
        if (entry.isCancelled) {
            statusText = 'supprimé';
        } else if (entry.delay === 0 || Math.abs(entry.delay) < 60) {
            statusText = 'à l\'heure';
        } else {
            const minutes = Math.abs(Math.floor(entry.delay / 60));
            statusText = entry.delay > 0 ? `retard ${minutes} minutes` : `avance ${minutes} minutes`;
        }

        const message = `${type} ${line}, ${statusText}`;

        // Avoid repeating the same message
        const lastMessage = lastSpokenRef.current.get(entry.id);
        if (lastMessage === message) return;
        lastSpokenRef.current.set(entry.id, message);

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.1;
        utterance.pitch = 1;

        speechSynthesis.speak(utterance);
    }, []);

    // Check alerted entries and announce their status
    useEffect(() => {
        if (alertedIds.size === 0) return;

        const allEntries = [...departures, ...arrivals];

        allEntries.forEach(entry => {
            if (alertedIds.has(entry.id) && entry.isRealtime) {
                playNotificationSound();
                speakStatus(entry);
            }
        });
    }, [departures, arrivals, alertedIds, playNotificationSound, speakStatus]);

    // Clear expired alerts (entries that no longer exist)
    useEffect(() => {
        const allIds = new Set([...departures, ...arrivals].map(e => e.id));
        const expiredIds = [...alertedIds].filter(id => !allIds.has(id));

        if (expiredIds.length > 0) {
            setAlertedIds(prev => {
                const newSet = new Set(prev);
                expiredIds.forEach(id => newSet.delete(id));
                return newSet;
            });
            // Clean up spoken messages for expired entries
            expiredIds.forEach(id => lastSpokenRef.current.delete(id));
        }
    }, [departures, arrivals, alertedIds]);

    return {
        toggleAlert,
        isAlerted,
        alertedCount: alertedIds.size
    };
}
