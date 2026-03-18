import type { Metadata } from "next";
import {
  Bodoni_Moda,
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  Inter,
  Literata,
  Oxanium,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-head",
  subsets: ["latin"],
});

const bodoniModa = Bodoni_Moda({
  variable: "--font-mobile-display",
  subsets: ["latin"],
  display: "swap",
});

const literata = Literata({
  variable: "--font-mobile-body",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mobile-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const oxanium = Oxanium({
  variable: "--font-mobile-signal-title",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "chloeverse.io",
  description: "chloeverse.io",
  applicationName: "chloeverse.io",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${spaceGrotesk.variable} ${bodoniModa.variable} ${literata.variable} ${ibmPlexMono.variable} ${oxanium.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
