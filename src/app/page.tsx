import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Brain, Github, Zap, TrainFront, Smartphone } from 'lucide-react';
import { BackgroundBeams } from "@/components/ui/background-beams";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { promises as fs } from 'fs';
import path from 'path';

// Server Component for fetching version
async function getAppVersion() {
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const fileContents = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(fileContents);
        return packageJson.version || '3.x.x';
    } catch (error) {
        console.error("Failed to read package.json version:", error);
        return 'LIVE';
    }
}

export default async function LandingPage() {
    const version = await getAppVersion();

    return (
        <div className="min-h-screen bg-neutral-950 text-white selection:bg-yellow-500/30 font-sans overflow-x-hidden relative antialiased">

            {/* Background Beams - The "Transit Noir" Effect */}
            <BackgroundBeams className="opacity-40" />

            {/* Navbar */}
            <header className="relative z-50 p-6 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center gap-3 group cursor-default">
                    <div className="relative">
                        <div className="absolute inset-0 bg-yellow-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity rounded-xl"></div>
                        <Image src="/icon-512.png" alt="Logo" width={48} height={48} className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl shadow-2xl" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-display font-bold text-xl md:text-2xl tracking-tight leading-none">
                            GERZAT<span className="text-yellow-500">LIVE</span>
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-bold hidden md:block">
                            Multimodal Hub
                        </span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <Link
                        href="https://github.com/nickdesi/BusTrainGerzat"
                        target="_blank"
                        className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-neutral-900/50 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-sm font-medium transition-all group backdrop-blur-md"
                    >
                        <Github className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                        <span>Source</span>
                    </Link>
                    <Link
                        href="/app"
                        className="relative inline-flex h-10 overflow-hidden rounded-xl p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
                    >
                        <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                        <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-slate-950 px-6 py-1 text-sm font-medium text-white backdrop-blur-3xl gap-2 hover:bg-slate-900 transition-colors">
                            Lancer l&apos;App <ArrowRight className="w-4 h-4" />
                        </span>
                    </Link>
                </div>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24 flex flex-col items-center">

                {/* Hero Section */}
                <div className="text-center mb-32 relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/50 border border-neutral-800 backdrop-blur-md mb-8 ring-1 ring-white/10">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-mono text-neutral-400 font-medium tracking-wide">
                            v{version} LIVE
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-display font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50">
                        Le Futur du <br />
                        <span className="text-yellow-500">Transit Urbain.</span>
                    </h1>

                    <p className="mt-4 font-normal text-base md:text-lg text-neutral-300 max-w-lg mx-auto leading-relaxed">
                        L&apos;application ultime pour les résidents de Gerzat. Données temps réel T2C & SNCF, design premium et intelligence artificielle.
                    </p>
                </div>

                {/* Bento Grid Showcase */}
                <BentoGrid className="max-w-6xl mx-auto md:auto-rows-[22rem]">
                    {/* Feature 1: Realtime Map */}
                    <BentoGridItem
                        title="Cartographie Live"
                        description="Suivez vos bus et trains en temps réel sur une carte interactive fluide."
                        header={
                            <div className="relative w-full h-full min-h-[6rem] rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900">
                                <div className="absolute inset-0 bg-[url('/screenshots/app-map.png')] bg-cover bg-center opacity-80 hover:scale-105 transition-transform duration-500"></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                            </div>
                        }
                        icon={<Smartphone className="h-4 w-4 text-neutral-500" />}
                        className="md:col-span-2"
                    />

                    {/* Feature 2: AI Predictions */}
                    <BentoGridItem
                        title="Intelligence Artificielle"
                        description="Algorithmes prédictifs pour estimer les retards avant les canaux officiels."
                        header={
                            <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-900/20 to-neutral-900 border border-neutral-800 flex-col items-center justify-center relative overflow-hidden group">
                                <Brain className="w-16 h-16 text-purple-500/50 group-hover:text-purple-400 transition-colors" />
                                <div className="absolute inset-0 bg-purple-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        }
                        icon={<Brain className="h-4 w-4 text-neutral-500" />}
                        className="md:col-span-1"
                    />

                    {/* Feature 3: Train Data */}
                    <BentoGridItem
                        title="Expertise Ferroviaire"
                        description="Connexion directe aux API SNCF pour une précision à la seconde."
                        header={
                            <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-neutral-900 border border-neutral-800 p-4 flex-col gap-2 relative overflow-hidden">
                                <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 w-2/3 animate-pulse"></div>
                                </div>
                                <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden delay-75">
                                    <div className="h-full bg-blue-500 w-1/2 animate-pulse"></div>
                                </div>
                                <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden delay-150">
                                    <div className="h-full bg-green-500 w-3/4 animate-pulse"></div>
                                </div>
                            </div>
                        }
                        icon={<TrainFront className="h-4 w-4 text-neutral-500" />}
                        className="md:col-span-1"
                    />

                    {/* Feature 4: Speed */}
                    <BentoGridItem
                        title="Performance Extrême"
                        description="Architecture Next.js optimisée. Chargement instantané."
                        header={
                            <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-neutral-900 border border-neutral-800 items-center justify-center relative overflow-hidden">
                                <Zap className="w-20 h-20 text-yellow-500/20" />
                                <div className="absolute inset-0 bg-yellow-500/5 blur-2xl"></div>
                            </div>
                        }
                        icon={<Zap className="h-4 w-4 text-neutral-500" />}
                        className="md:col-span-2"
                    />
                </BentoGrid>

                {/* Footer */}
                <div className="mt-32 pt-12 border-t border-neutral-800 w-full flex flex-col md:flex-row justify-between items-center text-sm text-neutral-500 gap-6">
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

