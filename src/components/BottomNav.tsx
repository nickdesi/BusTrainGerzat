'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ArrowDownLeft, Map } from 'lucide-react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    { href: '/app', label: 'Départs', icon: <ArrowUpRight size={24} /> },
    { href: '/app/arrivees', label: 'Arrivées', icon: <ArrowDownLeft size={24} /> },
    { href: '/app/carte', label: 'Carte', icon: <Map size={24} /> },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav
            className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] px-3 pb-3 pt-2 safe-area-bottom md:bottom-auto md:top-4 md:px-4 md:pb-0"
            aria-label="Navigation principale"
        >
            <div className="mx-auto flex h-[72px] max-w-md items-center justify-between rounded-[1.75rem] glass-strong p-2 md:h-16 md:max-w-lg">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={`group relative flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs font-bold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:flex-row md:gap-2 md:text-sm ${isActive
                                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/25'
                                : 'text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <span className={`transition-transform duration-200 ${isActive ? '-translate-y-0.5 md:translate-y-0' : 'group-hover:-translate-y-0.5 group-active:translate-y-0 md:group-hover:translate-y-0'}`} aria-hidden="true">
                                {item.icon}
                            </span>
                            <span className="leading-none">{item.label}</span>
                            {isActive && <span className="absolute -bottom-1 h-1 w-8 rounded-full bg-black/60 md:bottom-1" aria-hidden="true" />}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
