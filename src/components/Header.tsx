import { MapPin, RefreshCw } from 'lucide-react';

interface HeaderProps {
    lastUpdated: number | null;
    loading: boolean;
    onRefresh: () => void;
}

export function Header({ lastUpdated, loading, onRefresh }: HeaderProps) {
    return (
        <header className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 animate-fade-in">

            <div className="space-y-2 text-center md:text-left">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-rose-400 drop-shadow-lg">
                    Gerzat Live
                </h1>
                <p className="text-gray-400 flex items-center justify-center md:justify-start gap-2 font-medium">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="tracking-wide">HUB MULTIMODAL</span>
                </p>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Dernière actualisation</div>
                    <div className="text-xl font-mono text-white font-bold tracking-wider">
                        {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('fr-FR') : '--:--:--'}
                    </div>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className={`p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'}`}
                >
                    <RefreshCw className={`w-6 h-6 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </header>
    );
}
