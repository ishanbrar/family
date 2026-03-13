import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, Source_Serif_4, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { THEME_PALETTE_STORAGE_KEY, THEME_STORAGE_KEY } from "@/lib/theme";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
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
  title: "Legacy — Ancestry & Health Platform",
  description:
    "A luxury platform for exploring your family tree, genetic connections, and hereditary health insights.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var modeKey='${THEME_STORAGE_KEY}';var paletteKey='${THEME_PALETTE_STORAGE_KEY}';var storedMode=localStorage.getItem(modeKey);var mode=storedMode==='light'||storedMode==='dark'?storedMode:'light';var storedPalette=localStorage.getItem(paletteKey);var palette=(storedPalette==='gold'||storedPalette==='blue'||storedPalette==='red'||storedPalette==='yellow')?storedPalette:'gold';var root=document.documentElement;root.classList.remove('light','dark');root.classList.remove('theme-gold','theme-blue','theme-red','theme-yellow');root.classList.add(mode);root.classList.add('theme-'+palette);}catch(e){var root=document.documentElement;root.classList.add('light');root.classList.add('theme-gold');}})();`,
          }}
        />
      </head>
      <body
        className={`${playfair.variable} ${inter.variable} ${sourceSerif.variable} ${sourceSans.variable} antialiased app-page-bg`}
      >
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
