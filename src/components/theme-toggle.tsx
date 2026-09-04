"use client";

import { useTheme } from "./theme-provider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="fixed bottom-5 right-5 z-10 rounded-full border border-foreground/15 bg-background/60 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted backdrop-blur transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
