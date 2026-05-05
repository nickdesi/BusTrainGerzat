import { Sun, Moon, Info, X } from 'lucide-react';
import { Route } from '@/hooks/useLineE1Data';

type RouteDirectionFilter = 'all' | '0' | '1';

interface MapLegendProps {
    lineData?: { route?: Route };
    isDarkMode: boolean;
    setIsDarkMode: (value: boolean) => void;
    isLegendOpen: boolean;
    setIsLegendOpen: (value: boolean) => void;
    routeDirection: RouteDirectionFilter;
    setRouteDirection: (value: RouteDirectionFilter) => void;
}

export default function MapLegend({
    lineData,
    isDarkMode,
    setIsDarkMode,
    isLegendOpen,
    setIsLegendOpen,
    routeDirection,
    setRouteDirection
}: MapLegendProps) {
    const directionOptions: Array<{ value: RouteDirectionFilter; label: string; tone: string }> = [
        { value: 'all', label: 'Tous', tone: 'text-white' },
        { value: '1', label: 'Gerzat', tone: 'text-emerald-200' },
        { value: '0', label: 'Aubière', tone: 'text-blue-200' },
    ];

    return (
        <div className="absolute inset-x-3 bottom-3 z-[calc(var(--z-modal)+1)] flex flex-col items-end gap-2 pointer-events-none md:inset-x-auto md:bottom-auto md:right-4 md:top-4">
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className="pointer-events-auto flex min-h-12 min-w-12 items-center justify-center rounded-[1.25rem] border border-white/10 bg-slate-950/80 text-emerald-200 shadow-[0_18px_50px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition-[transform,background-color,border-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:hidden"
                aria-label={isLegendOpen ? "Masquer la légende" : "Afficher la légende"}
                aria-expanded={isLegendOpen}
            >
                <Info className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Legend Content */}
            <div className={`
                pointer-events-auto max-h-[min(72dvh,32rem)] w-full overflow-y-auto rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] origin-bottom md:w-[19rem] md:origin-top-right
                ${isLegendOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none md:opacity-100 md:translate-y-0 md:pointer-events-auto'}
            `}>
                <div className="overflow-hidden rounded-[calc(1.5rem-0.375rem)] border border-white/10 bg-slate-950/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.045] px-4 py-3">
                        <div>
                            <span className="font-display text-[10px] font-black uppercase tracking-[0.26em] text-emerald-200">Ligne live</span>
                            <div className="mt-1 text-xs font-medium text-white/45">Mode {isDarkMode ? 'nuit' : 'clair'} · T2C</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                aria-label={isDarkMode ? 'Passer la carte en mode clair' : 'Passer la carte en mode sombre'}
                                aria-pressed={isDarkMode}
                            >
                                {isDarkMode ? <Sun className="w-5 h-5 text-yellow-300" aria-hidden="true" /> : <Moon className="w-5 h-5 text-blue-100" aria-hidden="true" />}
                            </button>
                            {/* Mobile Close Button */}
                            <button
                                onClick={() => setIsLegendOpen(false)}
                                className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-gray-300 transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:hidden"
                                aria-label="Fermer la légende"
                            >
                                <X className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3 p-3 md:space-y-4 md:p-4">
                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/10 p-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/25 bg-slate-950/50">
                                <span className="font-display text-lg font-black text-emerald-200">{lineData?.route?.routeShortName ?? 'E1'}</span>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-emerald-100/45 font-mono tracking-[0.18em]">Ligne actuelle</div>
                                <div className="font-display text-base font-black text-white leading-none">T2C {lineData?.route?.routeShortName ?? 'E1'}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[10px] uppercase text-gray-500 font-mono tracking-[0.18em]">Trajet affiché</span>
                            <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/[0.035] p-1" role="radiogroup" aria-label="Trajet affiché sur la carte">
                                {directionOptions.map(option => {
                                    const isSelected = routeDirection === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            onClick={() => setRouteDirection(option.value)}
                                            className={`min-h-11 rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-[transform,background-color,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${isSelected ? 'bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]' : `${option.tone} bg-transparent opacity-70 hover:bg-white/[0.08] hover:opacity-100`}`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent w-full"></div>

                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2 rounded-xl bg-white/[0.035] px-3 py-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.65)]"></div>
                                <span className="text-xs font-medium text-gray-300">Vers Gerzat Champfleuri</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl bg-white/[0.035] px-3 py-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.65)]"></div>
                                <span className="text-xs font-medium text-gray-300">Vers Aubière / Romagnat</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[10px] uppercase text-gray-500 font-mono tracking-[0.18em]">État du bus</span>
                            <div className="grid grid-cols-3 gap-1.5">
                                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.045] px-2 py-2">
                                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]"></div>
                                    <span className="text-[9px] uppercase text-gray-400">OK</span>
                                </div>
                                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.045] px-2 py-2">
                                    <div className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.7)]"></div>
                                    <span className="text-[9px] uppercase text-gray-400">5-10</span>
                                </div>
                                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.045] px-2 py-2">
                                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]"></div>
                                    <span className="text-[9px] uppercase text-gray-400">+10</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
