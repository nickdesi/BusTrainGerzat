import { memo } from 'react';
import SplitFlapDisplay from './SplitFlapDisplay';
import { useColorblind } from '@/context/ColorblindContext';

interface StatusDisplayProps {
    delay: number;
    isRealtime: boolean;
    isCancelled?: boolean;
}

const StatusDisplay = memo(function StatusDisplay({ delay, isRealtime, isCancelled }: StatusDisplayProps) {
    const { isColorblindMode } = useColorblind();

    // Color mappings
    const colors = {
        cancelled: isColorblindMode ? 'text-orange-500' : 'text-red-600',
        onTime: isColorblindMode ? 'text-blue-400' : 'text-emerald-400',
        late: isColorblindMode ? 'text-amber-500' : 'text-red-500',
        early: isColorblindMode ? 'text-cyan-400' : 'text-blue-400'
    };

    // Show cancellation status first
    if (isCancelled) {
        return <SplitFlapDisplay text="ANNULÉ" size="xs" color={colors.cancelled} />;
    }

    if (!isRealtime) {
        return <SplitFlapDisplay text="THEORIQUE" size="xs" color="text-gray-400" />;
    }

    const minutes = Math.floor(Math.abs(delay) / 60);

    // Less than 1 minute delay = on time
    if (minutes === 0) {
        return <SplitFlapDisplay text="A L'HEURE" size="xs" color={colors.onTime} />;
    }

    if (delay > 0) {
        return <SplitFlapDisplay text={`RETARD ${minutes}M`} size="xs" color={colors.late} />;
    }

    return <SplitFlapDisplay text={`AVANCE ${minutes}M`} size="xs" color={colors.early} />;
});

export default StatusDisplay;
