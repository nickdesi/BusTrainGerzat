import SplitFlapDisplay from './SplitFlapDisplay';

interface StatusDisplayProps {
    delay: number;
    isRealtime: boolean;
    isCancelled?: boolean;
}

export default function StatusDisplay({ delay, isRealtime, isCancelled }: StatusDisplayProps) {
    // Show cancellation status first
    if (isCancelled) {
        return <SplitFlapDisplay text="ANNULÉ" size="xs" color="text-red-600" />;
    }

    if (!isRealtime) {
        return <SplitFlapDisplay text="THEORIQUE" size="xs" color="text-gray-400" />;
    }

    const minutes = Math.floor(Math.abs(delay) / 60);

    // Less than 1 minute delay = on time
    if (minutes === 0) {
        return <SplitFlapDisplay text="A L'HEURE" size="xs" color="text-emerald-400" />;
    }

    if (delay > 0) {
        return <SplitFlapDisplay text={`RETARD ${minutes}M`} size="xs" color="text-red-500" />;
    }

    return <SplitFlapDisplay text={`AVANCE ${minutes}M`} size="xs" color="text-blue-400" />;
}
