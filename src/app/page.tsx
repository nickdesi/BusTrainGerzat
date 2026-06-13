import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { APP_VERSION } from '@/lib/app-version';
import {
    ArrowRight,
    BusFront,
    Clock3,
    ExternalLink,
    MapPinned,
    Navigation,
    Radio,
    Route,
    ShieldCheck,
    Sparkles,
    TrainFront,
} from 'lucide-react';

const highlights = [
    { value: 'E1', label: 'ligne bus suivie', icon: <BusFront className="h-4 w-4" /> },
    { value: 'TER', label: 'gare de Gerzat', icon: <TrainFront className="h-4 w-4" /> },
    { value: 'Live', label: 'données terrain', icon: <Radio className="h-4 w-4" /> },
];

const features = [
    {
        icon: <Clock3 className="h-5 w-5" />,
        title: 'Départs lisibles',
        description: 'Bus et trains rassemblés dans un tableau clair, pensé pour décider vite avant de partir.',
    },
    {
        icon: <MapPinned className="h-5 w-5" />,
        title: 'Carte temps réel',
        description: 'Visualisation de la ligne E1, des arrêts importants et des véhicules actifs.',
    },
    {
        icon: <Navigation className="h-5 w-5" />,
        title: 'Favoris utiles',
        description: 'Vos trajets ressortent en priorité pour éviter de chercher la même information chaque jour.',
    },
    {
        icon: <ShieldCheck className="h-5 w-5" />,
        title: 'Mobile d’abord',
        description: 'Interface contrastée, rapide et utilisable dehors, même en consultation rapide.',
    },
];

function Pill({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-zinc-300 backdrop-blur-xl">
            {children}
        </span>
    );
}

function ProductPreview() {
    const rows = [
        { mode: 'BUS', line: 'E1', destination: 'Champratel', time: '08:12', status: 'Live' },
        { mode: 'TER', line: 'Clermont', destination: 'Vichy', time: '08:27', status: 'À quai' },
        { mode: 'BUS', line: 'E1', destination: 'Romagnat', time: '08:34', status: '+2 min' },
    ];

    return (
        <div className="relative mx-auto w-full max-w-[560px]">
            <div className="absolute -inset-6 rounded-[3rem] bg-yellow-400/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.25rem] border border-white/15 bg-zinc-950/90 p-4 shadow-2xl shadow-black/60 backdrop-blur-2xl">
                <div className="rounded-[1.75rem] border border-white/10 bg-black p-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-300">Gerzat Live</p>
                            <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Prochains passages</h2>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-lg shadow-yellow-400/25">
                            <Radio className="h-5 w-5" />
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        {rows.map((row) => (
                            <div key={`${row.mode}-${row.time}`} className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.07]">
                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${row.mode === 'BUS' ? 'bg-yellow-400 text-black' : 'bg-blue-500 text-white'}`}>
                                    {row.mode === 'BUS' ? row.line : <TrainFront className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-white">{row.destination}</p>
                                    <p className="text-xs text-zinc-500">{row.mode === 'BUS' ? 'Ligne E1 · arrêt favori' : row.line}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-xl font-black text-yellow-300">{row.time}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">{row.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">
                            <Route className="h-4 w-4" /> Carte E1
                        </div>
                        <div className="relative h-28 rounded-xl bg-[radial-gradient(circle_at_30%_20%,rgba(253,224,71,0.28),transparent_30%),linear-gradient(135deg,rgba(39,39,42,1),rgba(9,9,11,1))]">
                            <div className="absolute left-6 right-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-yellow-400 shadow-[0_0_28px_rgba(250,204,21,0.55)]" />
                            <div className="absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-black bg-yellow-300" />
                            <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-black bg-white shadow-lg" />
                            <div className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-black bg-yellow-300" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
    return (
        <div className="group rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl transition-colors hover:border-yellow-300/40 hover:bg-yellow-300/[0.06]">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-300/15 text-yellow-300 ring-1 ring-yellow-300/20 transition-transform group-hover:-translate-y-1">
                {icon}
            </div>
            <h3 className="text-lg font-black tracking-tight text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
        </div>
    );
}

export default function LandingPage() {
    const version = APP_VERSION;

    return (
        <main className="min-h-screen overflow-hidden bg-[#050505] text-white selection:bg-yellow-300/30">
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(250,204,21,0.20),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.16),transparent_24%),linear-gradient(180deg,#050505_0%,#09090b_48%,#050505_100%)]" />
            <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:64px_64px]" />

            <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
                <Link href="/" className="flex items-center gap-3" aria-label="Accueil Gerzat Live">
                    <Image src="/icon-512.png" alt="Gerzat Live" width={48} height={48} className="h-11 w-11 rounded-2xl shadow-xl shadow-yellow-400/10" priority />
                    <div>
                        <p className="font-display text-xl font-black tracking-tight">Gerzat<span className="text-yellow-300">Live</span></p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-zinc-500">Bus · TER · Carte</p>
                    </div>
                </Link>

                <nav className="hidden items-center gap-6 text-sm font-semibold text-zinc-400 md:flex" aria-label="Navigation landing">
                    <Link href="#fonctionnalites" className="hover:text-white">Fonctionnalités</Link>
                    <Link href="#apercu" className="hover:text-white">Aperçu</Link>
                    <Link href="https://github.com/nickdesi/BusTrainGerzat" target="_blank" className="inline-flex items-center gap-1 hover:text-white">
                        Source <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                </nav>

                <Link href="/app" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-black transition-transform hover:-translate-y-0.5 hover:bg-yellow-300">
                    Ouvrir <ArrowRight className="h-4 w-4" />
                </Link>
            </header>

            <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 md:grid-cols-[1.02fr_0.98fr] md:px-8 md:pb-28 md:pt-20">
                <div>
                    <div className="flex flex-wrap gap-3">
                        <Pill><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,.8)]" /> v{version}</Pill>
                        <Pill><Sparkles className="h-3.5 w-3.5 text-yellow-300" /> Nouvelle interface</Pill>
                    </div>

                    <h1 className="mt-8 max-w-4xl bg-gradient-to-br from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-5xl font-extrabold leading-[1.05] tracking-[-0.025em] text-transparent md:text-7xl md:leading-[1.02]">
                        Les transports de Gerzat, enfin lisibles.
                    </h1>
                    <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">
                        Une app rapide pour savoir quand partir : prochains bus E1, trains TER, favoris et carte live dans une interface pensée pour le quotidien.
                    </p>

                    <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                        <Link href="/app" className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-yellow-300 px-6 py-4 text-base font-black text-black shadow-2xl shadow-yellow-400/20 transition-transform hover:-translate-y-1">
                            Voir les prochains départs
                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link href="/app/carte" className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-6 py-4 text-base font-black text-white backdrop-blur-xl transition-colors hover:bg-white/[0.1]">
                            Ouvrir la carte <MapPinned className="h-5 w-5 text-yellow-300" />
                        </Link>
                    </div>

                    <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
                        {highlights.map((item) => (
                            <div key={item.label} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
                                <div className="mb-3 text-yellow-300">{item.icon}</div>
                                <p className="text-2xl font-black tracking-tight text-white">{item.value}</p>
                                <p className="mt-1 text-xs font-semibold text-zinc-500">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div id="apercu" className="relative">
                    <ProductPreview />
                </div>
            </section>

            <section id="fonctionnalites" className="relative z-10 mx-auto max-w-7xl px-5 pb-20 md:px-8 md:pb-28">
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.28em] text-yellow-300">Conçu pour le terrain</p>
                        <h2 className="mt-3 max-w-2xl font-display text-4xl font-black tracking-tight text-white md:text-6xl">
                            Moins de bruit, plus de décision.
                        </h2>
                    </div>
                    <p className="max-w-md text-sm leading-6 text-zinc-400">
                        Consultez l’essentiel en quelques secondes : horaires, favoris et carte live restent accessibles sans détour.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    {features.map((feature) => (
                        <FeatureCard key={feature.title} {...feature} />
                    ))}
                </div>
            </section>

            <section className="relative z-10 mx-auto max-w-7xl px-5 pb-12 md:px-8">
                <div className="overflow-hidden rounded-[2.25rem] border border-yellow-300/20 bg-yellow-300 p-[1px] shadow-2xl shadow-yellow-500/10">
                    <div className="grid gap-8 rounded-[2.2rem] bg-black p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
                        <div>
                            <p className="text-sm font-black uppercase tracking-[0.28em] text-yellow-300">Prêt maintenant</p>
                            <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-white md:text-5xl">Accède directement au tableau live.</h2>
                            <p className="mt-3 max-w-2xl text-zinc-400">Départs, arrivées et carte sont accessibles sans friction depuis l’app.</p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                            <Link href="/app" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-black hover:bg-yellow-300">
                                Lancer l’app <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link href="https://github.com/nickdesi/BusTrainGerzat" target="_blank" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-6 py-4 font-black text-white hover:bg-white/10">
                                <ExternalLink className="h-4 w-4" /> GitHub
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="relative z-10 mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 px-5 py-8 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between md:px-8">
                <p>© 2026 Nicolas De Simone · GerzatLive</p>
                <div className="flex gap-5">
                    <Link href="mailto:contact@desimone.fr" className="hover:text-white">Contact</Link>
                    <Link href="https://github.com/nickdesi" className="hover:text-white">GitHub</Link>
                </div>
            </footer>
        </main>
    );
}
