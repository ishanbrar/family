import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
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
    <html lang="en" className="dark theme-gold" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var modeKey='${THEME_STORAGE_KEY}';var paletteKey='${THEME_PALETTE_STORAGE_KEY}';var storedMode=localStorage.getItem(modeKey);var mode=storedMode==='light'||storedMode==='dark'?storedMode:(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');var storedPalette=localStorage.getItem(paletteKey);var palette=(storedPalette==='gold'||storedPalette==='blue'||storedPalette==='red'||storedPalette==='yellow')?storedPalette:'gold';var root=document.documentElement;root.classList.remove('light','dark');root.classList.remove('theme-gold','theme-blue','theme-red','theme-yellow');root.classList.add(mode);root.classList.add('theme-'+palette);}catch(e){var root=document.documentElement;root.classList.add('dark');root.classList.add('theme-gold');}})();`,
          }}
        />
      </head>
      <body
        className={`${playfair.variable} ${inter.variable} antialiased bg-[#0a0a0a] text-white`}
      >
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
