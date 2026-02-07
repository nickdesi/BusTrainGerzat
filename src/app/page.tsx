import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Brain, Github, Smartphone, Zap } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-surface-darkest text-foreground selection:bg-yellow-500/30 font-sans overflow-x-hidden">

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay"></div>
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-yellow-500/5 rounded-full blur-[120px] animate-pulse duration-1000"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] animate-pulse duration-[4000ms]"></div>
            </div>

            {/* Navbar */}
            <header className="relative z-50 p-6 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center gap-3 group cursor-default">
                    <div className="relative">
                        <div className="absolute inset-0 bg-yellow-500 blur-sm opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <Image src="/icon-512.png" alt="Logo" width={48} height={48} className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl" />
                    </div>
                    <div>
                        <span className="font-display font-bold text-xl md:text-2xl tracking-tight leading-none block">GERZAT<span className="text-yellow-500">LIVE</span></span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold hidden md:block">Multimodal Hub</span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <Link
                        href="https://github.com/nickdesi/BusTrainGerzat"
                        target="_blank"
                        className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl text-sm font-medium transition-all group"
                    >
                        <Github className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                        <span>Source</span>
                    </Link>
                    <Link
                        href="/app"
                        className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                    >
                        <span>Lancer l&apos;App</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24">

                {/* Hero Section */}
                <div className="flex flex-col items-center text-center mb-24 md:mb-32">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 animate-fade-in-up">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-mono text-gray-300 font-medium">v3.6.0 LIVE</span>
                    </div>

                    <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] mb-8 animate-fade-in-up md:whitespace-nowrap bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
                        NEXT GEN <br className="md:hidden" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">TRANSIT</span>
                    </h1>

                    <p className="max-w-xl text-lg md:text-xl text-gray-400 mb-12 leading-relaxed animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                        L&apos;expérience de transport ultime pour <strong className="text-white">Gerzat</strong>.
                        Données ultra-précises, design premium et intelligence artificielle.
                    </p>

                    {/* Real App Screenshots Showcase */}
                    <div className="relative w-full max-w-5xl mx-auto animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-end">
                            {/* Card 1: Home/Arrivals */}
                            <div className="relative group rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-surface-dark transform hover:-translate-y-2 transition-transform duration-500">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10 pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 pointer-events-none">
                                    <h3 className="text-xl font-bold text-white mb-1">Temps Réel</h3>
                                    <p className="text-sm text-gray-400">Horaires en direct</p>
                                </div>
                                <div className="relative aspect-[9/16] w-full bg-surface-elevated">
                                    <Image src="/screenshots/app-home.png" alt="App Home" fill className="object-contain p-1 opacity-90 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>

                            {/* Card 2: Map (Center, slightly larger/higher) */}
                            <div className="relative group rounded-3xl overflow-hidden border-2 border-yellow-500/20 shadow-[0_0_50px_rgba(234,179,8,0.1)] bg-surface-dark z-20 transform scale-105 hover:-translate-y-2 transition-transform duration-500">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10 pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-center pointer-events-none">
                                    <h3 className="text-2xl font-bold text-white mb-1">Carte Interactive</h3>
                                    <p className="text-sm text-yellow-500 font-medium">Suivi Live Bus & Train</p>
                                </div>
                                <div className="relative aspect-[9/16] w-full bg-surface-elevated">
                                    <Image src="/screenshots/app-map.png" alt="App Map" fill className="object-contain p-1 opacity-100 transition-opacity" />
                                </div>
                            </div>

                            {/* Card 3: Details/Timeline */}
                            <div className="relative group rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-surface-dark transform hover:-translate-y-2 transition-transform duration-500">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10 pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 pointer-events-none">
                                    <h3 className="text-xl font-bold text-white mb-1">Détails Trajet</h3>
                                    <p className="text-sm text-gray-400">Timeline & Arrêts</p>
                                </div>
                                <div className="relative aspect-[9/16] w-full bg-surface-elevated">
                                    <Image src="/screenshots/app-details.png" alt="App Details" fill className="object-contain p-1 opacity-90 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BENTO GRID */}
                <div className="mb-24">
                    <h2 className="font-display text-4xl font-bold mb-12 text-center text-glow">Fonctionnalités Clés</h2>

                    <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-4 gap-4 md:grid-rows-2 h-auto md:h-[600px]">

                        {/* FEATURE 1: REALTIME (Large) */}
                        <div className="col-span-1 md:col-span-4 lg:col-span-2 row-span-2 bg-surface-dark rounded-3xl p-8 border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all flex flex-col">
                            <div className="absolute top-0 right-0 p-32 bg-yellow-500/5 rounded-full blur-[80px] group-hover:bg-yellow-500/10 transition-colors"></div>

                            <div className="relative z-10 mb-auto">
                                <div className="w-12 h-12 rounded-2xl bg-yellow-500 flex items-center justify-center mb-6 text-black">
                                    <Zap className="w-6 h-6 fill-current" />
                                </div>
                                <h3 className="text-3xl font-display font-bold mb-4">Temps Réel Ultra-Précis</h3>
                                <p className="text-gray-400 text-lg leading-relaxed">
                                    Connexion directe aux API Open Data de T2C et SNCF. Rafraîchissement toutes les 30 secondes.
                                    Soyez informé de la position exacte de votre véhicule.
                                </p>
                            </div>

                            {/* Mockup UI element */}
                            <div className="relative mt-8 h-[200px] w-full bg-surface rounded-xl border border-white/5 overflow-hidden flex flex-col p-4 gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 font-bold text-xs">E1</div>
                                        <div className="text-sm font-medium">Les Vergnes</div>
                                    </div>
                                    <div className="text-green-400 text-xs font-bold px-2 py-1 bg-green-500/10 rounded">LIVE</div>
                                </div>
                                <div className="h-full flex items-end gap-1 pb-2">
                                    {[40, 65, 45, 80, 55, 70, 40, 60, 50, 75, 55, 85].map((h, i) => (
                                        <div key={i} className="flex-1 bg-yellow-500/20 rounded-t-sm relative group/bar">
                                            <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 rounded-t-sm transition-all duration-1000" style={{ height: `${h}%` }}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* FEATURE 2: AI PREDICTIONS (Medium) */}
                        <div className="col-span-1 md:col-span-3 lg:col-span-2 bg-surface-dark rounded-3xl p-8 border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all">
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-[50px] group-hover:bg-purple-500/20 transition-colors"></div>
                            <div className="relative z-10">
                                <Brain className="w-10 h-10 text-purple-400 mb-6" />
                                <h3 className="text-2xl font-display font-bold mb-2">Prédictions par IA</h3>
                                <p className="text-gray-400 text-sm">Notre algorithme anticipe les retards avant qu&apos;ils ne soient officiels sur les apps classiques.</p>
                            </div>
                        </div>

                        {/* FEATURE 3: OPEN SOURCE (Medium) */}
                        <div className="col-span-1 md:col-span-3 lg:col-span-1 bg-surface-accent rounded-3xl p-8 border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/grid.svg')] opacity-10"></div>
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <Github className="w-10 h-10 text-white mb-6" />
                                <div>
                                    <h3 className="text-2xl font-display font-bold mb-2">Open Source</h3>
                                    <p className="text-gray-400 text-xs mb-4">Code transparent, audit public et respect de la vie privée.</p>
                                    <Link href="https://github.com/nickdesi/BusTrainGerzat" className="text-yellow-500 text-sm font-bold hover:underline">Voir le repo→</Link>
                                </div>
                            </div>
                        </div>

                        {/* FEATURE 4: MOBILE FIRST (Medium) */}
                        <div className="col-span-1 md:col-span-6 lg:col-span-1 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-3xl p-8 text-black relative overflow-hidden group transition-all">
                            <div className="absolute inset-0 bg-noise opacity-20 mix-blend-multiply"></div>
                            <Smartphone className="w-10 h-10 mb-6 relative z-10" />
                            <h3 className="text-2xl font-display font-black mb-2 relative z-10 w-full">PWA Ready</h3>
                            <p className="font-medium relative z-10 text-black/80 text-sm">Installez l&apos;app sur iOS et Android comme une app native. Sans App Store.</p>
                        </div>

                    </div>
                </div>

                {/* Footer Section - Simplified */}
                <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 gap-6">
                    <p>© 2026 Nicolas De Simone. Open Source MIT.</p>
                    <div className="flex items-center gap-6">
                        <Link href="mailto:contact@desimone.fr" className="hover:text-white transition-colors">Contact</Link>

                        <Link href="https://github.com/nickdesi" className="hover:text-white transition-colors">GitHub Profile</Link>
                    </div>
                </div>

            </main>
        </div>
    );
}
