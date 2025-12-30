import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "🛬 Arrivées en Gare de Gerzat - Bus & TER",
    description: "Consultez les horaires d'arrivées en temps réel pour les bus T2C et les trains TER à Gerzat. Ne manquez jamais une correspondance.",
};

export default function ArriveesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
