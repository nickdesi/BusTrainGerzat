import TransitBoardPage, { TransitBoardPageTheme } from '../TransitBoardPage';

const arrivalsTheme: TransitBoardPageTheme = {
    main: 'min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(253,195,0,0.10),transparent_28%),linear-gradient(135deg,var(--color-background),var(--color-surface-dark)_48%,#050505)] text-gray-100 font-sans',
    skipFocus: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-500 focus:text-white focus:rounded-lg focus:font-bold',
    topLine: 'pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent',
    headerBorder: 'mb-4 relative overflow-hidden rounded-2xl border border-blue-500/20 bg-black/25 p-2.5 shadow-xl shadow-black/25 backdrop-blur-xl md:mb-5 md:rounded-[1.75rem] md:p-4',
    headerGlow: 'absolute -right-16 -top-16 h-28 w-28 rounded-full bg-blue-500/10 blur-3xl',
    badge: 'mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-blue-300 md:text-[10px]',
    title: 'flex items-center justify-center gap-1.5 font-mono text-xl font-bold uppercase tracking-wider text-blue-400 text-glow md:gap-2 md:text-3xl lg:justify-start',
    logoShadow: 'h-6 w-6 drop-shadow-[0_0_14px_rgba(96,165,250,0.35)] md:h-8 md:w-8',
    subtitle: 'mt-0.5 hidden truncate text-xs font-medium uppercase tracking-widest text-blue-400/70 sm:block',
    activityIcon: 'h-3 w-3 text-blue-400',
    fetchingPing: 'animate-ping bg-blue-400',
    fetchingDot: 'bg-blue-500',
    allFilterActive: 'bg-blue-600 text-white',
    refreshButton: 'bg-blue-600 hover:bg-blue-500 text-white',
    boardBorder: 'overflow-hidden rounded-[2rem] border border-blue-500/20 bg-surface-elevated shadow-2xl shadow-black/40 ring-1 ring-white/5',
    boardHeader: 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 px-4 md:px-6 py-4 border-b-4 border-black',
    boardTitle: 'text-lg md:text-xl font-black text-white uppercase tracking-widest flex items-center gap-3 font-mono',
    boardPulseDot: 'w-3 h-3 bg-white rounded-full animate-pulse',
    boardFilterBadge: 'rounded-full bg-white/10 px-2 py-1 text-xs font-bold opacity-90',
};

export default function Arrivees() {
    return (
        <TransitBoardPage
            boardType="arrivals"
            title="ARRIVÉES • GERZAT"
            badgeLabel="Suivi des arrivées"
            skipHref="#arrivals-board"
            skipLabel="Aller au tableau des arrivées"
            boardTitle="Tableau des Arrivées"
            primaryStatLabel="Arrivées"
            theme={arrivalsTheme}
            showTicker
        />
    );
}
