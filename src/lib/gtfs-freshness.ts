/**
 * GTFS Data Freshness Validation
 * Detects stale/expired calendar data at runtime
 */

import staticSchedule from '@/data/static_schedule.json';
import { isT2CNoServiceDay } from '@/utils/date';

interface StaticScheduleItem {
    date: string;
    tripId: string;
}

// ⚡ Bolt: Cache calendar metadata at module scope to avoid O(N) array scans
// on every API request. This reduces CPU and memory overhead significantly.
const VALID_DATES = new Set<string>();
let CALENDAR_END_DATE: string | null = null;

const schedule = staticSchedule as StaticScheduleItem[];
if (schedule.length > 0) {
    CALENDAR_END_DATE = schedule[0].date;
    for (const item of schedule) {
        VALID_DATES.add(item.date);
        if (item.date > CALENDAR_END_DATE) {
            CALENDAR_END_DATE = item.date;
        }
    }
}

const PARIS_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

/**
 * Get today's date in YYYYMMDD format (Paris timezone)
 */
function getTodayDateStr(): string {
    try {
        const parts = PARIS_DATE_FORMATTER.formatToParts(new Date());
        let year, month, day;
        for (const p of parts) {
            if (p.type === 'year') year = p.value;
            else if (p.type === 'month') month = p.value;
            else if (p.type === 'day') day = p.value;
        }
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
    if (isT2CNoServiceDay()) return true;

    const todayStr = getTodayDateStr();

    // ⚡ Bolt: Use O(1) set lookup instead of O(N) array scan
    return VALID_DATES.has(todayStr);
}

/**
 * Get the latest date in the calendar
 */
export function getCalendarEndDate(): string | null {
    return CALENDAR_END_DATE;
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
    warningLevel: 'none' | 'info' | 'warning' | 'critical';
    message?: string;
} {
    const isValid = isCalendarValid();
    const daysRemaining = getDaysUntilExpiry();

    if (isT2CNoServiceDay()) {
        return {
            isValid: true,
            daysRemaining,
            warningLevel: 'info',
            message: "Aucun bus ni tram ne circule le 1er mai sur l'agglomération clermontoise"
        };
    }

    if (!isValid || daysRemaining < 0) {
        return {
            isValid: true,
            daysRemaining,
            warningLevel: 'info',
            message: 'Horaires statiques expirés, fallback temps réel T2C actif'
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
