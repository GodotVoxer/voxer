import type { Metadata, Viewport } from "next";
import { Creepster, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header/Header";
import { getSitePublicOriginUrl } from "@/lib/http/sitePublicOrigin";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme/themeBootstrapScript";
import { THEME_COLOR_META } from "@/lib/theme/themePreference";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
/** Seasonal theme lettering; not preloaded, so it only downloads when an element uses it. */
const spooky = Creepster({
  variable: "--font-spooky",
  weight: "400",
  subsets: ["latin"],
  preload: false,
});
const siteOrigin = getSitePublicOriginUrl();

export const metadata: Metadata = {
  ...(siteOrigin ? { metadataBase: siteOrigin } : {}),
  // `template` applies to each page's title; pages without one fall back to `default` ("Voxer").
  title: {
    default: "Voxer",
    template: "Voxer | %s",
  },
  description: "Voxer — un imageboard como la gente.",
};
/** Dark by default; `ThemeApplier` updates `theme-color` when the user chose another theme. */
export const viewport: Viewport = {
  themeColor: THEME_COLOR_META.dark,
  colorScheme: "dark",
  viewportFit: "cover",
};
const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="es" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Without JS the server's dark theme stays; with JS the stored theme applies before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spooky.variable} antialiased`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
};
export default RootLayout;
