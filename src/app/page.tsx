import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Bus, Train, Clock, Brain, Accessibility } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-yellow-500/30">

            {/* Background Gradients */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Header / Nav */}
            <header className="relative z-10 p-6 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <Image src="/icon-512.png" alt="Logo" width={40} height={40} className="w-8 h-8 md:w-10 md:h-10" />
                    <span className="font-bold text-xl tracking-wider">GERZAT<span className="text-yellow-500">LIVE</span></span>
                </div>
                <Link
                    href="/app"
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-all hover:scale-105"
                >
                    Accéder à l&apos;app
                </Link>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto px-6">

                {/* Hero Section */}
                <div className="flex flex-col items-center text-center py-20 md:py-32">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold uppercase tracking-widest mb-6 animate-fade-in-up">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                        Version 3.2.0 Disponible
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        Le futur de vos <br />
                        <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">trajets quotidiens</span>
                    </h1>

                    <p className="max-w-2xl text-lg md:text-xl text-gray-400 mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        L&apos;assistant multimodal ultime pour Gerzat. Horaires en temps réel, prédictions IA et accessibilité renforcée. Tout ça, gratuitement.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <Link
                            href="/app"
                            className="group relative px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg rounded-full transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(234,179,8,0.4)] flex items-center gap-2"
                        >
                            Lancer l&apos;application
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="https://github.com/nickdesi/BusTrainGerzat"
                            target="_blank"
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-full transition-all border border-white/10 hover:border-white/20"
                        >
                            Voir le code source
                        </Link>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-20">

                    <FeatureCard
                        icon={<Clock className="w-6 h-6 text-blue-400" />}
                        title="Temps Réel SNCF & T2C"
                        description="Connecté directement aux API officielles pour une précision à la seconde près. Ne ratez plus jamais votre train."
                        delay="0.4s"
                    />

                    <FeatureCard
                        icon={<Brain className="w-6 h-6 text-purple-400" />}
                        title="Intelligence Artificielle"
                        description="Notre algorithme prédictif analyse les tendances pour anticiper les retards avant même qu'ils ne soient annoncés."
                        delay="0.5s"
                    />

                    <FeatureCard
                        icon={<Accessibility className="w-6 h-6 text-green-400" />}
                        title="Accessible WCAG 2.1"
                        description="Conforme RGAA 4 et WCAG 2.1 AA. Contrastes optimisés, navigation clavier, skip links et focus visible pour tous."
                        delay="0.6s"
                    />

                </div>

                {/* SEO Content Section */}
                <div className="py-20 border-t border-white/5">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold mb-6">Pourquoi Gerzat Live ?</h2>
                            <div className="space-y-4 text-gray-400">
                                <p>
                                    Située au carrefour des échanges, la <strong>Gare de Gerzat</strong> est un point névralgique pour les navetteurs vers Clermont-Ferrand et Riom.
                                </p>
                                <p>
                                    Que vous preniez le <strong>TER SNCF</strong> ou la ligne de <strong>Bus T2C (Ligne E1)</strong>, Gerzat Live centralise toutes les informations.
                                    Fini, jongler entre plusieurs applications.
                                </p>
                                <ul className="list-disc pl-5 space-y-2 mt-4 text-gray-300">
                                    <li>Horaires des trains TER Auvergne-Rhône-Alpes</li>
                                    <li>Prochains passages Bus T2C (Arrêts Champfleuri, Patural)</li>
                                    <li>Info trafic et perturbations en direct</li>
                                </ul>
                            </div>
                        </div>

                        <div className="relative h-[400px] w-full rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-gray-900 to-black p-8 group">
                            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>

                            {/* Abstract Visual Representation */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-yellow-500/20 rounded-full blur-[50px] group-hover:bg-yellow-500/30 transition-all duration-700"></div>

                            <div className="relative z-10 h-full flex flex-col justify-center items-center gap-6">
                                <div className="flex items-center gap-8">
                                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 w-32">
                                        <Bus className="w-8 h-8 text-red-500" />
                                        <span className="font-mono font-bold">BUS E1</span>
                                        <span className="text-green-400 text-sm font-mono">14:02</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 w-32">
                                        <Train className="w-8 h-8 text-blue-500" />
                                        <span className="font-mono font-bold">TER 859</span>
                                        <span className="text-orange-400 text-sm font-mono">Retard 5&apos;</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-400 font-mono mt-4">Données live synchronisées</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </main >

            {/* Footer */}
            < footer className="border-t border-white/5 py-12 relative z-10 bg-black" >
                <div className="max-w-7xl mx-auto px-6 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <p className="font-bold text-lg mb-2">GERZAT<span className="text-yellow-500">LIVE</span></p>
                        <p className="text-sm text-gray-500">
                            Développé avec ❤️ par Nicolas De Simone.<br />
                            Non affilié à T2C ou SNCF.
                        </p>
                    </div>
                    <div className="flex gap-6 text-sm text-gray-400">
                        <Link href="/app" className="hover:text-white transition-colors">Application</Link>
                        <Link href="https://github.com/nickdesi/BusTrainGerzat" className="hover:text-white transition-colors">GitHub</Link>
                        <Link href="mailto:contact@desimone.fr" className="hover:text-white transition-colors">Contact</Link>
                    </div>
                </div>
            </footer >
        </div >
    );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: string }) {
    return (
        <div
            className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all hover:-translate-y-1 hover:bg-white/10 animate-fade-in-up"
            style={{ animationDelay: delay, opacity: 0, animationFillMode: 'forwards' }}
        >
            <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center mb-4 border border-white/10">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
                {description}
            </p>
        </div>
    );
}
