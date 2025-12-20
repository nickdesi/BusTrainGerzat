import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#fbbf24",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "🚉 Gerzat Live - Hub Multimodal",
  description: "Application Next.js pour suivre en temps réel les bus T2C (uniquement ligne E1) et les trains TER à Gerzat.",
  applicationName: "Gerzat Live",
  authors: [{ name: "Nicolas De Simone" }],
  keywords: ["bus", "train", "Gerzat", "horaires", "temps réel", "T2C", "SNCF", "TER", "ligne E1"],
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-512.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gerzat Live",
  },
  verification: {
    google: "TuCtfpsMfaMi13jU8fbz5LFA1vxzqeLZMHc74ulWRig",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://gerzatlive.desimone.fr",
    title: "🚉 Gerzat Live - Hub Multimodal",
    description: "Application Next.js pour suivre en temps réel les bus T2C (uniquement ligne E1) et les trains TER à Gerzat.",
    siteName: "Gerzat Live",
  },
  twitter: {
    card: "summary_large_image",
    title: "🚉 Gerzat Live - Hub Multimodal",
    description: "Application Next.js pour suivre en temps réel les bus T2C (uniquement ligne E1) et les trains TER à Gerzat.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-yellow-500 focus:text-black focus:font-bold focus:rounded-md"
        >
          Aller au contenu principal
        </a>
        <QueryProvider>
          {children}
        </QueryProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
