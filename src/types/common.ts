/**
 * Common/shared type definitions
 * Types used across both bus and train domains
 */

/**
 * Unified entry for display in departure boards
 * Combines bus and train data into a common format
 */
export interface UnifiedEntry {
    id: string;
    tripId?: string; // Original trip ID for API calls
    type: 'BUS' | 'TER';
    time: number;
    arrivalTime: number;
    departureTime: number;
    line: string;
    destination: string;
    provenance?: string; // For arrivals: where it comes from
    delay: number;
    isRealtime: boolean;
    isCancelled: boolean;
    platform?: string;
}

/**
 * Filter options for transport type
 */
export type TransportFilter = 'all' | 'bus' | 'train';

/**
 * API response status
 */
export interface ApiResponse<T> {
    data: T;
    timestamp: number;
    isStale: boolean;
}

/**
 * Error response from API
 */
export interface ApiError {
    code: string;
    message: string;
    details?: unknown;
}
