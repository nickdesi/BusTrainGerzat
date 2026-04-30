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
        <div className="absolute bottom-4 right-4 top-auto z-[calc(var(--z-modal)+1)] flex flex-col items-end gap-2 pointer-events-none md:bottom-auto md:top-4">
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-black/80 text-emerald-200 shadow-lg backdrop-blur-xl transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black pointer-events-auto md:hidden"
                aria-label={isLegendOpen ? "Masquer la légende" : "Afficher la légende"}
                aria-expanded={isLegendOpen}
            >
                <Info className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Legend Content */}
            <div className={`
                w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl transition-all duration-200 origin-bottom-right md:origin-top-right
                ${isLegendOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none md:opacity-100 md:translate-y-0 md:pointer-events-auto'}
            `}>
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-display uppercase tracking-widest text-emerald-200">STATUT LIGNE</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-white/5 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            aria-label={isDarkMode ? 'Passer la carte en mode clair' : 'Passer la carte en mode sombre'}
                            aria-pressed={isDarkMode}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-300" aria-hidden="true" /> : <Moon className="w-5 h-5 text-gray-300" aria-hidden="true" />}
                        </button>
                        {/* Mobile Close Button */}
                        <button
                            onClick={() => setIsLegendOpen(false)}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-gray-300 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:hidden"
                            aria-label="Fermer la légende"
                        >
                            <X className="w-5 h-5" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl border border-emerald-300/25 bg-emerald-300/10">
                            <span className="font-black text-emerald-200">{lineData?.route?.routeShortName ?? 'E1'}</span>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase text-gray-500 font-mono tracking-wider">Ligne Actuelle</div>
                            <div className="text-sm font-bold text-white leading-none">T2C {lineData?.route?.routeShortName ?? 'E1'}</div>
                        </div>
                    </div>

                    <div className="h-px bg-white/10 w-full"></div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-sm bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
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
