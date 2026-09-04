import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import MistBackground from "@/components/mist-background";
import ThemeToggle from "@/components/theme-toggle";
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
          {children}
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
