'use client';

import TransitBoardPage, { TransitBoardPageTheme } from './TransitBoardPage';

const departuresTheme: TransitBoardPageTheme = {
  main: 'min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(253,195,0,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_28%),linear-gradient(135deg,var(--color-background),var(--color-surface-dark)_48%,#050505)] text-gray-100 font-sans',
  skipFocus: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-yellow-500 focus:text-black focus:rounded-lg focus:font-bold',
  topLine: 'pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent',
  headerBorder: 'mb-4 relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-black/25 p-2.5 shadow-xl shadow-black/25 backdrop-blur-xl md:mb-5 md:rounded-[1.75rem] md:p-4',
  headerGlow: 'absolute -right-16 -top-16 h-28 w-28 rounded-full bg-yellow-500/10 blur-3xl',
  badge: 'mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-yellow-300 md:text-[10px]',
  title: 'flex items-center justify-center gap-1.5 font-mono text-xl font-bold uppercase tracking-wider text-yellow-500 text-glow md:gap-2 md:text-3xl lg:justify-start',
  logoShadow: 'h-6 w-6 drop-shadow-[0_0_14px_rgba(253,195,0,0.35)] md:h-8 md:w-8',
  subtitle: 'mt-0.5 hidden truncate text-xs font-medium uppercase tracking-widest text-yellow-500/70 sm:block',
  activityIcon: 'h-3 w-3 text-yellow-400',
  fetchingPing: 'animate-ping bg-yellow-400',
  fetchingDot: 'bg-yellow-500',
  allFilterActive: 'bg-yellow-600 text-black',
  refreshButton: 'bg-yellow-600 hover:bg-yellow-500 text-black',
  boardBorder: 'overflow-hidden rounded-[2rem] border border-yellow-500/20 bg-surface-elevated shadow-2xl shadow-black/40 ring-1 ring-white/5',
  boardHeader: 'bg-gradient-to-r from-yellow-500 via-yellow-400 to-amber-500 px-4 md:px-6 py-4 border-b-4 border-black',
  boardTitle: 'text-lg md:text-xl font-black text-black uppercase tracking-widest flex items-center gap-3 font-mono',
  boardPulseDot: 'w-3 h-3 bg-black rounded-full animate-pulse',
  boardFilterBadge: 'rounded-full bg-black/10 px-2 py-1 text-xs font-bold opacity-80',
};

export default function Home() {
  return (
    <TransitBoardPage
      boardType="departures"
      title="DÉPARTS • GERZAT"
      badgeLabel="Live multimodal"
      skipHref="#departures-board"
      skipLabel="Aller au tableau des départs"
      boardTitle="Tableau des Départs"
      primaryStatLabel="Passages"
      theme={departuresTheme}
      enableSmartAlert
    />
  );
}
