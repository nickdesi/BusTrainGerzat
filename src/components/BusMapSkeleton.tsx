import { Map } from 'lucide-react';

export default function BusMapSkeleton() {
    return (
        <div className="relative w-full h-full min-h-[420px] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),transparent_34%),linear-gradient(135deg,#07110f,#050505)] animate-pulse">
            <div className="absolute inset-0 opacity-15" aria-hidden="true">
                <div className="absolute top-1/4 left-1/5 w-32 h-32 rounded-full border-4 border-emerald-300/40" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rotate-45 rounded-[3rem] border-4 border-yellow-300/30" />
                <div className="absolute top-1/2 left-0 h-1 w-full -translate-y-1/2 rotate-12 bg-emerald-300/40" />
                <div className="absolute top-1/3 left-0 h-1 w-full rotate-[-8deg] bg-white/20" />
            </div>

            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-emerald-100/45">
                <Map size={64} strokeWidth={1.25} aria-hidden="true" />
                <span className="mt-3 text-xs font-bold uppercase tracking-[0.24em]">Carte live</span>
            </div>

            <div className="absolute left-4 top-4 h-12 w-36 rounded-2xl bg-black/60 border border-white/10" />
            <div className="absolute right-4 top-4 hidden h-80 w-72 rounded-2xl bg-black/60 border border-white/10 md:block" />
            <div className="absolute bottom-4 left-1/2 h-12 w-56 -translate-x-1/2 rounded-2xl bg-black/60 border border-white/10" />
        </div>
    );
}
