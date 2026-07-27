import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
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
  title: "🚉 Gerzat Live - Bus T2C & TER SNCF",
  description: "Suivez en temps réel les horaires des bus T2C (ligne E1) et des trains TER à la gare de Gerzat. Hub multimodal complet pour vos déplacements.",
  applicationName: "Gerzat Live",
  authors: [{ name: "Nicolas De Simone" }],
  keywords: [
    "bus", "train", "Gerzat", "horaires", "temps réel", "T2C", "SNCF", "TER",
    "ligne E1", "Champfleuri", "Patural", "transports Clermont-Ferrand", "gare Gerzat"
  ],
  alternates: {
    canonical: "https://gerzatlive.desimone.fr",
  },
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
    title: "🚉 Gerzat Live - Horaires Temps Réel Bus & Trains",
    description: "Le hub multimodal indispensable pour les habitants de Gerzat : bus T2C (Ligne E1 Express) et trains TER SNCF en direct.",
    siteName: "Gerzat Live",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Gerzat Live App Icon",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "🚉 Gerzat Live - Horaires Temps Réel Bus & Trains",
    description: "Suivez vos bus T2C et trains TER à Gerzat en temps réel.",
    images: ["/icon-512.png"],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "GerzatLive",
              url: "https://gerzatlive.desimone.fr/",
              applicationCategory: "Travel",
              operatingSystem: "All",
              description:
                "Horaires bus T2C et trains SNCF en temps réel à Gerzat.",
            }),
          }}
        />
        <QueryProvider>
          <main id="main-content">
            {children}
          </main>
        </QueryProvider>
        <ServiceWorkerRegistration />
      </body>
    </html >
  );
}
