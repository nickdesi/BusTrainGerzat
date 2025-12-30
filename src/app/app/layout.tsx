import BottomNav from "@/components/BottomNav";

export default function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <main className="pb-20">
                {children}
            </main>
            <BottomNav />
        </>
    );
}
