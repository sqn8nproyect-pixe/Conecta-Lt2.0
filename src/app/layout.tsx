import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CONECTA-LT · Vida nocturna de Los Teques",
  description: "Directorio premium de licorerías, tascas y discotecas de Los Teques, Miranda. Descubre ofertas únicas y planifica tu salida perfecta.",
  keywords: ["Los Teques", "vida nocturna", "licorerías", "tascas", "discotecas", "Miranda", "Venezuela"],
  authors: [{ name: "CONECTA-LT" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "CONECTA-LT · Vida nocturna de Los Teques",
    description: "La vida nocturna, redescubierta.",
    siteName: "CONECTA-LT",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
