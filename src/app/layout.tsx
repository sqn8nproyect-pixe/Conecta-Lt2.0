import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://conecta-lt.losteques.app";
const ogImage = "/images/hero.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CONECTA-LT | Guía Nocturna de Los Teques",
    template: "%s | CONECTA-LT",
  },
  description:
    "El directorio premium de vida nocturna de Los Teques, Miranda. Descubre las 21 mejores licorerías, tascas y discotecas, oferta exclusivas, reseñas reales y planifica tu salida perfecta.",
  keywords: [
    "Los Teques",
    "vida nocturna Los Teques",
    "licorerías Los Teques",
    "tascas Los Teques",
    "discotecas Los Teques",
    "bares Miranda",
    "rumba Venezuela",
    "CONECTA-LT",
    "guía nocturna",
    "ofertas tragos",
  ],
  authors: [{ name: "CONECTA-LT" }],
  creator: "CONECTA-LT",
  publisher: "CONECTA-LT",
  applicationName: "CONECTA-LT",
  category: "lifestyle",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/images/logo.png", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  },
  openGraph: {
    title: "CONECTA-LT | Guía Nocturna de Los Teques",
    description:
      "La vida nocturna, redescubierta. Explora los 21 locales más selectos de Los Teques: licorerías, tascas y discotecas con ofertas exclusivas y reseñas reales.",
    siteName: "CONECTA-LT",
    url: siteUrl,
    type: "website",
    locale: "es_VE",
    images: [
      {
        url: ogImage,
        width: 1344,
        height: 768,
        alt: "Vida nocturna en Los Teques — CONECTA-LT",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CONECTA-LT | Guía Nocturna de Los Teques",
    description:
      "La vida nocturna, redescubierta. 21 locales selectos de Los Teques con ofertas y reseñas.",
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#090d1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
