import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import MistBackground from "@/components/mist-background";
import SiteMenu from "@/components/site-menu";
import LoadingScreen from "@/components/loading-screen";
import DebugGui from "@/debug/debug-gui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Underworld Studios",
  description:
    "Underworld Studios — driving the style from the outskirts of London since Y2K. Limited drops, no compromises.",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <LoadingScreen />
          <MistBackground />
          <SiteMenu />
          {children}
          <DebugGui />
        </ThemeProvider>
      </body>
    </html>
  );
}
