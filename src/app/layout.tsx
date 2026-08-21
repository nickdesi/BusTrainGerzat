import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";


import StructuredData from "@/components/StructuredData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#fbbf24",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://gerzatlive.desimone.fr'),
  title: {
    default: "Gerzat Live • Horaires Temps Réel Bus T2C & Trains TER",
    template: "%s • Gerzat Live",
  },
  description: "Consultez en temps réel les horaires des bus T2C (ligne E1) et des trains TER SNCF en gare de Gerzat. Hub multimodal, carte live des véhicules et départs en direct.",
  applicationName: "Gerzat Live",
  authors: [{ name: "Nicolas De Simone", url: "https://github.com/nickdesi" }],
  creator: "Nicolas De Simone",
  publisher: "Gerzat Live",
  category: "transportation",
  formatDetection: {
    telephone: false,
  },
  keywords: [
    "horaires bus Gerzat", "bus T2C ligne E1", "train TER Gerzat", "gare de Gerzat",
    "temps réel T2C", "SNCF Gerzat", "Champfleuri", "Patural", "transports Clermont-Ferrand",
    "Clermont Auvergne Métropole", "mobilité Gerzat", "prochains départs bus train"
  ],
  alternates: {
    canonical: "https://gerzatlive.desimone.fr",
    languages: {
      "fr-FR": "https://gerzatlive.desimone.fr",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
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
    title: "Gerzat Live • Horaires Temps Réel Bus T2C & Trains TER",
    description: "Le hub multimodal en direct pour Gerzat : bus T2C (Ligne E1) et trains TER SNCF. Départs, arrivées et carte live.",
    siteName: "Gerzat Live",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Gerzat Live - Hub multimodal bus et trains en temps réel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gerzat Live • Horaires Temps Réel Bus & Trains",
    description: "Suivez vos bus T2C (Ligne E1) et trains TER SNCF à Gerzat en temps réel.",
    images: ["/icon-512.png"],
  },
  other: {
    "geo.region": "FR-63",
    "geo.placename": "Gerzat, Puy-de-Dôme, France",
    "geo.position": "45.8236;3.1444",
    "ICBM": "45.8236, 3.1444",
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
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`}
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-yellow-500 focus:text-black focus:font-bold focus:rounded-md"
        >
          Aller au contenu principal
        </a>
        <StructuredData />
        <QueryProvider>
          <main id="main-content">
            {children}
          </main>
        </QueryProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
