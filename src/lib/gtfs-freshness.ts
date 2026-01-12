/**
 * GTFS Data Freshness Validation
 * Detects stale/expired calendar data at runtime
 */

import staticSchedule from '@/data/static_schedule.json';

interface StaticScheduleItem {
    date: string;
    tripId: string;
}

/**
 * Get today's date in YYYYMMDD format (Paris timezone)
 */
function getTodayDateStr(): string {
    try {
        const formatter = new Intl.DateTimeFormat('fr-FR', {
            timeZone: 'Europe/Paris',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(new Date());
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        return `${year}${month}${day}`;
    } catch {
        const today = new Date();
        return today.getFullYear().toString() +
            (today.getMonth() + 1).toString().padStart(2, '0') +
            today.getDate().toString().padStart(2, '0');
    }
}

/**
 * Check if calendar has valid data for today
 */
export function isCalendarValid(): boolean {
    const todayStr = getTodayDateStr();
    const schedule = staticSchedule as StaticScheduleItem[];
    return schedule.some(item => item.date === todayStr);
}

/**
 * Get the latest date in the calendar
 */
export function getCalendarEndDate(): string | null {
    const schedule = staticSchedule as StaticScheduleItem[];
    if (schedule.length === 0) return null;

    const dates = [...new Set(schedule.map(item => item.date))].sort();
    return dates[dates.length - 1] || null;
}

/**
 * Get number of days until calendar expires
 * Returns negative if already expired
 */
export function getDaysUntilExpiry(): number {
    const endDateStr = getCalendarEndDate();
    if (!endDateStr) return -999;

    const todayStr = getTodayDateStr();

    // Parse YYYYMMDD to Date
    const parseDate = (str: string) => new Date(
        parseInt(str.slice(0, 4)),
        parseInt(str.slice(4, 6)) - 1,
        parseInt(str.slice(6, 8))
    );

    const today = parseDate(todayStr);
    const endDate = parseDate(endDateStr);

    const diffMs = endDate.getTime() - today.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get freshness status for UI display
 */
export function getFreshnessStatus(): {
    isValid: boolean;
    daysRemaining: number;
    warningLevel: 'none' | 'warning' | 'critical';
    message?: string;
} {
    const isValid = isCalendarValid();
    const daysRemaining = getDaysUntilExpiry();

    if (!isValid || daysRemaining < 0) {
        return {
            isValid: false,
            daysRemaining,
            warningLevel: 'critical',
            message: 'Données bus potentiellement obsolètes'
        };
    }

    if (daysRemaining <= 2) {
        return {
            isValid: true,
            daysRemaining,
            warningLevel: 'warning',
            message: `Données bus expirent dans ${daysRemaining} jour(s)`
        };
    }

    return {
        isValid: true,
        daysRemaining,
        warningLevel: 'none'
    };
}
