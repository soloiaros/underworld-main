"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { useBackdropTone } from "@/lib/backdrop-tone";
import ThemeToggle from "./theme-toggle";
import Attributions from "./attributions";

const ROWS: {
  width: string;
  delay: string;
  duration: string;
  label?: string;
  action?: "attributions";
}[] = [
  { width: "38%", delay: "0.18s", duration: "0.32s" },
  { width: "16%", delay: "0.06s", duration: "0.28s", label: "[ item one ]" },
  { width: "19%", delay: "0.28s", duration: "0.4s", label: "[ item two ]" },
  { width: "32%", delay: "0s", duration: "0.26s" },
  { width: "24%", delay: "0.14s", duration: "0.36s" },
  { width: "20%", delay: "0.22s", duration: "0.3s", label: "[ item three ]" },
  { width: "28%", delay: "0.02s", duration: "0.42s" },
  { width: "21%", delay: "0.3s", duration: "0.25s", label: "[ item four ]" },
  { width: "44%", delay: "0.1s", duration: "0.38s" },
  { width: "30%", delay: "0.24s", duration: "0.29s" },
  { width: "17%", delay: "0.04s", duration: "0.44s", label: "[ item five ]" },
  {
    width: "36%",
    delay: "0.16s",
    duration: "0.34s",
    label: "[ attributions ]",
    action: "attributions",
  },
  { width: "22%", delay: "0.26s", duration: "0.27s" },
  { width: "40%", delay: "0.08s", duration: "0.39s" },
  { width: "26%", delay: "0.2s", duration: "0.31s" },
  { width: "34%", delay: "0.12s", duration: "0.45s" },
];

export default function SiteMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [attributionsOpen, setAttributionsOpen] = useState(false);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const menuTone = useBackdropTone(toggleButtonRef);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    toggleButtonRef.current?.focus();
  }, []);

  const openAttributions = useCallback(() => {
    setIsOpen(false);
    setAttributionsOpen(true);
  }, []);

  const closeAttributions = useCallback(() => {
    setAttributionsOpen(false);
    toggleButtonRef.current?.focus();
  }, []);

  const handleLinkClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      closeMenu();
    },
    [closeMenu]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeMenu]);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", isOpen);
    return () => document.documentElement.classList.remove("menu-open");
  }, [isOpen]);

  return (
    <>
      <header className="site-header">
        <button
          ref={toggleButtonRef}
          type="button"
          className="site-menu-button"
          data-open={isOpen}
          data-tone={menuTone}
          aria-expanded={isOpen}
          aria-controls="site-menu"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="site-menu-button__line" aria-hidden="true" />
          <span className="site-menu-button__line" aria-hidden="true" />
          <span className="site-menu-button__line" aria-hidden="true" />
        </button>
        <ThemeToggle />
      </header>

      <nav
        id="site-menu"
        className="site-menu"
        data-open={isOpen}
        aria-hidden={!isOpen}
        aria-label="Site"
      >
        <ul className="site-menu__list">
          {ROWS.map((row, i) => (
            <li
              key={i}
              className="site-menu__item"
              style={
                {
                  "--w": row.width,
                  "--d": row.delay,
                  "--t": row.duration,
                } as CSSProperties
              }
              aria-hidden={row.label ? undefined : true}
            >
              {row.action === "attributions" ? (
                <button
                  type="button"
                  className="site-menu__link"
                  aria-haspopup="dialog"
                  aria-expanded={attributionsOpen}
                  onClick={openAttributions}
                >
                  {row.label}
                </button>
              ) : (
                row.label && (
                  <a
                    className="site-menu__link"
                    href="#"
                    onClick={handleLinkClick}
                  >
                    {row.label}
                  </a>
                )
              )}
            </li>
          ))}
        </ul>
      </nav>
      <Attributions
        open={attributionsOpen}
        onClose={closeAttributions}
      />
    </>
  );
}
