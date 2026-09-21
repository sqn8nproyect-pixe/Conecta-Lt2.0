import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/providers";
import { SessionProvider } from "@/components/session-provider";
import { WhatsAppFloat } from "@/components/conecta/WhatsAppFloat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://conectalt.com";
const ogImage = "/images/hero.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CONECTA-LT | Guía Nocturna de Los Teques",
    template: "%s | CONECTA-LT",
  },
  description:
    "El directorio premium de vida nocturna de Los Teques, Miranda. Descubre licorerías, tascas, licobares y discotecas reales con horarios verificados, ofertas exclusivas, reseñas de la zona y planifica tu salida perfecta.",
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
      "La vida nocturna, redescubierta. Explora los locales más selectos de Los Teques: licorerías, tascas, discotecas y licobares con ofertas exclusivas y reseñas reales.",
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
      "La vida nocturna, redescubierta. Licorerías, tascas, discotecas y licobares de Los Teques con ofertas y reseñas.",
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

// ── JSON-LD global (GEO) ────────────────────────────────────
// Organization + WebSite para que los buscadores y los modelos
// de IA (ChatGPT, Perplexity, Gemini) identifiquen la entidad
// detrás del dominio. Las páginas de ficha ya emiten su propio
// LocalBusiness (@graph), este bloque es el nivel superior.
const siteJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      url: siteUrl,
      name: "CONECTA-LT",
      alternateName: "Guía Nocturna de Los Teques",
      description:
        "Directorio nocturno de Los Teques: licorerías, tascas, licobares y discotecas con horarios verificados, ofertas y reseñas.",
      inLanguage: "es-VE",
      publisher: { "@id": `${siteUrl}#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: "CONECTA-LT",
      url: siteUrl,
      logo: `${siteUrl}/images/logo.png`,
    },
  ],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: siteJsonLd }}
        />
        <QueryProvider>
          <SessionProvider>{children}</SessionProvider>
        </QueryProvider>
        {/* Canal directo con el equipo CONECTA-LT — presente en todas las páginas */}
        <WhatsAppFloat />
        <Toaster />
      </body>
    </html>
  );
}
