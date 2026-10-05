import type { Metadata, Viewport } from "next";
import Script from "next/script";
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

// ── Google Analytics (gtag.js) ──────────────────────────────
// ID de medición público (no es un secreto: viaja en el HTML de
// todas las páginas que usan GA). Se carga con afterInteractive
// (equivalente async) para no bloquear la carga de la página.
const GA_MEASUREMENT_ID = "G-F1VY2L3FN6";

// ── Google Tag Manager ──────────────────────────────────────
// Contenedor GTM (ID público). Mientras el contenedor no tenga
// etiquetas internas, no mide nada y convive con gtag.js. AVISO:
// si se crea dentro de GTM una etiqueta GA4 con el mismo ID de
// medición, HAY QUE quitar el gtag.js directo para no duplicar
// el conteo de visitas.
const GTM_CONTAINER_ID = "GTM-PRP5ZP49";

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
        {/* Google Tag Manager (noscript) — SSR: cubre visitantes sin JavaScript */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* Google Tag Manager (gtm.js) — presente en todas las páginas */}
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`}
        </Script>
        {/* Google Analytics (gtag.js) — presente en todas las páginas */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
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
