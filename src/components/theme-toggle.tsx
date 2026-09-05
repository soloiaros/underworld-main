"use client";

import { useRef } from "react";
import { useBackdropTone } from "@/lib/backdrop-tone";
import { useTheme } from "./theme-provider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const ref = useRef<HTMLButtonElement>(null);
  const tone = useBackdropTone(ref);
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      ref={ref}
      type="button"
      className="theme-toggle"
      data-tone={tone}
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
    >
      <span
        className="theme-toggle__icon"
        data-icon={theme === "dark" ? "sun" : "moon"}
        aria-hidden="true"
      />
    </button>
  );
}
