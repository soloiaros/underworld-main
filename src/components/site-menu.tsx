"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";

export default function SiteMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
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
          aria-expanded={isOpen}
          aria-controls="site-menu"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="site-menu-button__line" aria-hidden="true" />
          <span className="site-menu-button__line" aria-hidden="true" />
          <span className="site-menu-button__line" aria-hidden="true" />
        </button>
      </header>

      <nav
        id="site-menu"
        className="site-menu"
        data-open={isOpen}
        aria-hidden={!isOpen}
        aria-label="Site"
      >
        <ul className="site-menu__list">
          <li
            className="site-menu__item site-menu__item--empty"
            aria-hidden="true"
          ></li>

          <li className="site-menu__item">
            <a className="site-menu__link" href="#" onClick={handleLinkClick}>
              [ item one ]
            </a>
          </li>

          <li className="site-menu__item">
            <a className="site-menu__link" href="#" onClick={handleLinkClick}>
              [ item two ]
            </a>
          </li>

          <li
            className="site-menu__item site-menu__item--empty"
            aria-hidden="true"
          ></li>

          <li
            className="site-menu__item site-menu__item--empty"
            aria-hidden="true"
          ></li>

          <li className="site-menu__item">
            <a className="site-menu__link" href="#" onClick={handleLinkClick}>
              [ item three ]
            </a>
          </li>

          <li
            className="site-menu__item site-menu__item--empty"
            aria-hidden="true"
          ></li>

          <li className="site-menu__item">
            <a className="site-menu__link" href="#" onClick={handleLinkClick}>
              [ item four ]
            </a>
          </li>

          <li
            className="site-menu__item site-menu__item--empty"
            aria-hidden="true"
          ></li>

          <li
            className="site-menu__item site-menu__item--empty"
            aria-hidden="true"
          ></li>

          <li className="site-menu__item">
            <a className="site-menu__link" href="#" onClick={handleLinkClick}>
              [ item five ]
            </a>
          </li>

          <li
            className="site-menu__item site-menu__item--empty"
            aria-hidden="true"
          ></li>

          <li
            className="site-menu__item site-menu__item--empty"
            aria-hidden="true"
          ></li>

          <li
            className="site-menu__item site-menu__item--empty"
            aria-hidden="true"
          ></li>

          <li
            className="site-menu__item site-menu__item--empty"
            aria-hidden="true"
          ></li>

          <li
            className="site-menu__item site-menu__item--empty"
            aria-hidden="true"
          ></li>
        </ul>
      </nav>
    </>
  );
}
