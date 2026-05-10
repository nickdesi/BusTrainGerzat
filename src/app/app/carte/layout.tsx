import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "🗺️ Carte estimée Ligne E1 - Gerzat Live",
    description: "Visualisez les bus de la ligne E1 (T2C) sur la carte avec positions estimées depuis GTFS-RT Trip Updates, horaires et tracé officiel.",
};

export default function CarteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
