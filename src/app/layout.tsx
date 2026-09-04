import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import MistBackground from "@/components/mist-background";
import SiteMenu from "@/components/site-menu";
import ThemeToggle from "@/components/theme-toggle";
import DebugGui from "@/debug/debug-gui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Underworld Studios",
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
