'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlaneTakeoff, PlaneLanding, Map } from 'lucide-react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    { href: '/', label: 'Départs', icon: <PlaneTakeoff size={24} /> },
    { href: '/arrivees', label: 'Arrivées', icon: <PlaneLanding size={24} /> },
    { href: '/carte', label: 'Carte', icon: <Map size={24} /> },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-t border-white/10 safe-area-bottom">
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                    ? 'text-yellow-400'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {item.icon}
                            <span className="text-xs mt-1 font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
