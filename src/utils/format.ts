export const formatTime = (timestamp: number | null | undefined): string => {
    if (timestamp === null || timestamp === undefined || isNaN(timestamp)) return '--:--';
    return new Date(timestamp * 1000).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const normalizeText = (text: string) => {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9 \-']/g, ' ');
};

// Shared helper to get display time based on board type
export const getDisplayTime = (
    entry: { type: string; arrivalTime: number; departureTime: number },
    boardType: 'departures' | 'arrivals'
): number | null => {
    if (entry.type === 'TER') return null; // TER shows both times
    return boardType === 'arrivals' ? entry.arrivalTime : entry.departureTime;
};
