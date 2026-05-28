import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Serif_4, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { FamilyDataProvider } from "@/hooks/use-family-data";
import {
  THEME_EXPLICIT_KEY,
  THEME_PALETTE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "@/lib/theme";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
const siteTitle = "Legatree — Ancestry & Health Platform";
const siteDescription =
  "Explore your family tree, genetic connections, and heritage with Legatree.";
const ogImage = "/og-image.png";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s · Legatree",
  },
  description: siteDescription,
  applicationName: "Legatree",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Legatree",
  },
  // Browser/PWA icons are served from src/app/favicon.ico, icon.png, and apple-icon.png.
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Legatree",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Legatree — family tree platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light theme-gold" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var modeKey='${THEME_STORAGE_KEY}';var explicitKey='${THEME_EXPLICIT_KEY}';var paletteKey='${THEME_PALETTE_STORAGE_KEY}';var explicit=localStorage.getItem(explicitKey)==='1';var storedMode=localStorage.getItem(modeKey);var mode=(explicit&&(storedMode==='light'||storedMode==='dark'))?storedMode:'light';var storedPalette=localStorage.getItem(paletteKey);var palette=(storedPalette==='gold'||storedPalette==='blue'||storedPalette==='red'||storedPalette==='yellow')?storedPalette:'gold';var root=document.documentElement;root.classList.remove('light','dark');root.classList.remove('theme-gold','theme-blue','theme-red','theme-yellow');root.classList.add(mode);root.classList.add('theme-'+palette);root.style.colorScheme=mode;}catch(e){var root=document.documentElement;root.classList.add('light');root.classList.add('theme-gold');root.style.colorScheme='light';}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')});}`,
          }}
        />
      </head>
      <body
        className={`${playfair.variable} ${sourceSerif.variable} ${sourceSans.variable} antialiased app-page-bg`}
      >
        <FamilyDataProvider>{children}</FamilyDataProvider>
        <ThemeToggle />
      </body>
    </html>
  );
}
