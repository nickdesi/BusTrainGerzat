import { Sun, Moon, Info, X } from 'lucide-react';
import { Route } from '@/hooks/useLineE1Data';

interface MapLegendProps {
    lineData?: { route?: Route };
    isDarkMode: boolean;
    setIsDarkMode: (value: boolean) => void;
    isLegendOpen: boolean;
    setIsLegendOpen: (value: boolean) => void;
}

export default function MapLegend({
    lineData,
    isDarkMode,
    setIsDarkMode,
    isLegendOpen,
    setIsLegendOpen
}: MapLegendProps) {
    return (
        <div className="absolute top-20 right-4 z-[calc(var(--z-modal)+1)] flex flex-col items-end gap-2 pointer-events-none">
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className="md:hidden w-11 h-11 flex items-center justify-center rounded-full bg-black/80 backdrop-blur-xl border border-white/10 shadow-lg text-yellow-500 pointer-events-auto"
                aria-label={isLegendOpen ? "Masquer la légende" : "Afficher la légende"}
            >
                <Info className="w-6 h-6" />
            </button>

            {/* Legend Content */}
            <div className={`
                w-64 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden shadow-2xl transition-all duration-300 origin-top-right
                ${isLegendOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-4 pointer-events-none md:opacity-100 md:scale-100 md:translate-y-0 md:pointer-events-auto'}
            `}>
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-display uppercase tracking-widest text-yellow-500">STATUT LIGNE</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="w-11 h-11 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors"
                            aria-label={isDarkMode ? 'Mode clair' : 'Mode sombre'}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-400" />}
                        </button>
                        {/* Mobile Close Button */}
                        <button
                            onClick={() => setIsLegendOpen(false)}
                            className="md:hidden w-11 h-11 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors text-gray-400 border border-white/5"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded border border-white/10 bg-white/5">
                            <span className="font-bold text-yellow-500">{lineData?.route?.routeShortName}</span>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase text-gray-500 font-mono tracking-wider">Ligne Actuelle</div>
                            <div className="text-sm font-bold text-white leading-none">T2C {lineData?.route?.routeShortName}</div>
                        </div>
                    </div>

                    <div className="h-px bg-white/10 w-full"></div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-sm bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            <span className="text-xs text-gray-400 uppercase tracking-wide">Vers Gerzat Champfleuri</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-sm bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                            <span className="text-xs text-gray-400 uppercase tracking-wide">Vers Aubière / Romagnat</span>
                        </div>
                    </div>

                    <div className="h-px bg-white/10 w-full"></div>

                    {/* Pulse color legend */}
                    <div className="space-y-1.5">
                        <span className="text-[10px] uppercase text-gray-500 font-mono tracking-wider">État du bus</span>
                        <div className="grid grid-cols-3 gap-1.5">
                            <div className="flex flex-col items-center gap-1 px-2 py-1.5 rounded border border-white/5 bg-white/5">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                <span className="text-[9px] uppercase text-gray-400">À l&apos;heure</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 px-2 py-1.5 rounded border border-white/5 bg-white/5">
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                                <span className="text-[9px] uppercase text-gray-400">5-10 min</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 px-2 py-1.5 rounded border border-white/5 bg-white/5">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                                <span className="text-[9px] uppercase text-gray-400">&gt;10 min</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
