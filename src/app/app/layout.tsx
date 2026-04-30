import BottomNav from "@/components/BottomNav";

export default function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <div className="pb-24 md:pb-6 md:pt-24">
                {children}
            </div>
            <BottomNav />
        </>
    );
}
