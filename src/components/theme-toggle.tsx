"use client";

import { useTheme } from "./theme-provider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
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
