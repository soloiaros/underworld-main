import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import MistBackground from "@/components/mist-background";
import SiteMenu from "@/components/site-menu";
import ThemeToggle from "@/components/theme-toggle";
import DebugGui from "@/debug/debug-gui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Underworld Studios",
  description:
    "Underworld Studios — driving the style from the outskirts of London since Y2K. Limited drops, no compromises.",
};

/* Matches the default dark theme so the browser chrome blends into the page
   (the in-app toggle restyles the page itself). */
export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <MistBackground />
          <SiteMenu />
          {children}
          <ThemeToggle />
          <DebugGui />
        </ThemeProvider>
      </body>
    </html>
  );
}
