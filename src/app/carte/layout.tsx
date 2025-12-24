import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "🗺️ Carte Temps Réel Ligne E1 - Gerzat Live",
    description: "Visualisez la position en direct des bus de la ligne E1 (T2C) sur la carte. Suivez votre bus en temps réel à Gerzat.",
};

export default function CarteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
