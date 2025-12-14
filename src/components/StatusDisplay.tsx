import SplitFlapDisplay from './SplitFlapDisplay';

interface StatusDisplayProps {
    delay: number;
    isRealtime: boolean;
}

export default function StatusDisplay({ delay, isRealtime }: StatusDisplayProps) {
    if (!isRealtime) {
        return <SplitFlapDisplay text="THEORIQUE" size="xs" color="text-gray-400" />;
    }
    if (delay === 0) {
        return <SplitFlapDisplay text="A L'HEURE" size="xs" color="text-emerald-400" />;
    }
    if (delay > 0) {
        const minutes = Math.floor(delay / 60);
        return <SplitFlapDisplay text={`RETARD ${minutes}M`} size="xs" color="text-red-500" />;
    }
    return <SplitFlapDisplay text="EN AVANCE" size="xs" color="text-blue-400" />;
}
