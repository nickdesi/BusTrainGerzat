export const formatTime = (timestamp: number) => {
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
