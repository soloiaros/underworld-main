"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { hoverTapProps } from "@/lib/hover-tap";
import ChromeStars from "./chrome-stars";

interface FlyoutNote {
  kind: "note";
  title: string;
  sub: string;
  dx: number;
  dy: number;
  rot: number;
}

interface FlyoutPhoto {
  kind: "photo";
  src: string;
  alt: string;
  width: number;
  height: number;
  dx: number;
  dy: number;
  rot: number;
}

type FlyoutItem = FlyoutNote | FlyoutPhoto;

interface Sequence {
  phrase: string;
  items: FlyoutItem[];
}

const SEQUENCES: Sequence[] = [
  {
    phrase: "outskirts of London",
    items: [
      {
        kind: "note",
        title: "First HQ",
        sub: "archive, 2001",
        dx: -230,
        dy: -130,
        rot: -6,
      },
      {
        kind: "photo",
        src: "/img/hq.png",
        alt: "The first Underworld Studios HQ, 2001",
        width: 770,
        height: 516,
        dx: 210,
        dy: 110,
        rot: 4,
      },
    ],
  },
  {
    phrase: "underground artisis",
    items: [
      {
        kind: "note",
        title: "Yuri Vex",
        sub: "silkscreen zines — Kyiv",
        dx: -260,
        dy: -150,
        rot: -7,
      },
      {
        kind: "note",
        title: "Nadia Riot",
        sub: "rave flyer art — Berlin",
        dx: 0,
        dy: -195,
        rot: 2,
      },
      {
        kind: "note",
        title: "Kofi Marrow",
        sub: "noise soundscapes — Lagos",
        dx: 260,
        dy: -150,
        rot: 6,
      },
    ],
  },
  {
    phrase: "street angels",
    items: [
      {
        kind: "photo",
        src: "/img/customer1.png",
        alt: "A street angel wearing Underworld Studios",
        width: 836,
        height: 638,
        dx: -290,
        dy: -140,
        rot: -8,
      },
      {
        kind: "photo",
        src: "/img/customer2.png",
        alt: "A street angel wearing Underworld Studios",
        width: 790,
        height: 788,
        dx: 0,
        dy: -200,
        rot: 3,
      },
      {
        kind: "photo",
        src: "/img/customer3.png",
        alt: "A street angel wearing Underworld Studios",
        width: 946,
        height: 706,
        dx: 290,
        dy: -140,
        rot: 8,
      },
    ],
  },
];

const EXIT_MS = 500;
const PHOTO_SIZES = "clamp(9rem, 24vw, 16rem)";
const NOTE_HALF_HEIGHT = 40;

function photoHalfHeight(item: FlyoutPhoto) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const renderedWidth =
    vh <= 512
      ? Math.min(256, Math.max(96, vh * 0.22))
      : Math.min(256, Math.max(144, vw * 0.24));
  return (renderedWidth * item.height) / item.width / 2 + 8;
}

interface FlyoutOffset {
  dx: number;
  dy: number;
  rot: number;
}

interface OverlayOrigin {
  sequence: number;
  x: number;
  y: number;
  offsets: FlyoutOffset[];
}

export default function Manifesto() {
  const [active, setActive] = useState<number | null>(null);
  const [overlay, setOverlay] = useState<OverlayOrigin | null>(null);
  const [shown, setShown] = useState(false);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const closeTimer = useRef<number | null>(null);

  const measure = useCallback((index: number): OverlayOrigin | null => {
    const button = buttonRefs.current[index];
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const items = SEQUENCES[index].items;

    /* Desktop */
    if (!window.matchMedia("(max-width: 48rem)").matches) {
      const scale = Math.min(1, Math.max(0.55, window.innerWidth / 1280));
      return {
        sequence: index,
        x,
        y,
        offsets: items.map((item) => ({
          dx: item.dx * scale,
          dy: item.dy * scale,
          rot: item.rot,
        })),
      };
    }

    /* Stack */
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spacing = Math.min(190, Math.max(96, vh * 0.22));
    const MARGIN = 56;
    const offsets = items.map((item, i) => ({
      dx: 0,
      dy: (i - (items.length - 1) / 2) * spacing,
      rot: item.rot * 0.6,
    }));
    const edges = offsets.map((o, i) => {
      const item = items[i];
      const half =
        item.kind === "photo" ? photoHalfHeight(item) : NOTE_HALF_HEIGHT;
      return { top: o.dy - half, bottom: o.dy + half };
    });
    const topEdge = Math.min(...edges.map((e) => e.top));
    const bottomEdge = Math.max(...edges.map((e) => e.bottom));
    let shift = 0;
    if (y + topEdge + shift < MARGIN) shift = MARGIN - (y + topEdge);
    if (y + bottomEdge + shift > vh - MARGIN) {
      shift = vh - MARGIN - (y + bottomEdge);
    }
    return {
      sequence: index,
      x,
      y,
      offsets: offsets.map((o) => ({
        ...o,
        dx: vw / 2 - x,
        dy: o.dy + shift,
      })),
    };
  }, []);

  const open = useCallback(
    (index: number) => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      const origin = measure(index);
      if (!origin) return;
      setActive(index);
      setOverlay(origin);
    },
    [measure]
  );

  const close = useCallback(() => {
    setActive(null);
    setShown(false);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOverlay(null);
      closeTimer.current = null;
    }, EXIT_MS);
  }, []);

  /* Reveal */
  useEffect(() => {
    if (!overlay || active === null) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setShown(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [overlay, active]);

  /* Dismiss */
  useEffect(() => {
    if (active === null) return;

    let remeasureRaf = 0;
    const remeasure = () => {
      if (remeasureRaf) return;
      remeasureRaf = requestAnimationFrame(() => {
        remeasureRaf = 0;
        const origin = measure(active);
        if (origin) setOverlay(origin);
      });
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!buttonRefs.current[active]?.contains(event.target as Node)) {
        close();
      }
    };

    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      cancelAnimationFrame(remeasureRaf);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [active, close, measure]);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    []
  );

  const renderPhrase = (index: number) => (
    <button
      ref={(el) => {
        buttonRefs.current[index] = el;
      }}
      type="button"
      className="manifesto__phrase"
      data-active={active === index}
      aria-expanded={active === index}
      {...hoverTapProps(index, active, open, close)}
    >
      {SEQUENCES[index].phrase}
    </button>
  );

  return (
    <section
      className="manifesto"
      data-open={active !== null}
      aria-label="About Underworld Studios"
    >
      <ChromeStars />
      {/* Preload */}
      <div className="manifesto__preload" aria-hidden="true">
        {SEQUENCES.flatMap((sequence) =>
          sequence.items
            .filter((item): item is FlyoutPhoto => item.kind === "photo")
            .map((item) => (
              <Image
                key={item.src}
                src={item.src}
                alt=""
                width={item.width}
                height={item.height}
                sizes={PHOTO_SIZES}
              />
            ))
        )}
      </div>
      <p className="manifesto__text">
        {"Driving the style from the "}
        {renderPhrase(0)}
        {
          " since y2k. Each item is a rebel against what's been marketed as premium. Each drop is a wild fantasy of "
        }
        {renderPhrase(1)}
        {
          " around the globe. We came here with nothing to lose, and we've been serving "
        }
        {renderPhrase(2)}
        {" for two decades."}
      </p>

      {overlay && (
        <div
          className="manifesto__flyout"
          data-show={shown}
          aria-hidden={active === null}
        >
          <div className="dim-backdrop" data-show={shown} />
          {SEQUENCES[overlay.sequence].items.map((item, i) => (
            <div
              key={`${overlay.sequence}-${i}`}
              className="manifesto__flyout-item"
              style={
                {
                  "--ox": `${overlay.x}px`,
                  "--oy": `${overlay.y}px`,
                  "--dx": `${overlay.offsets[i].dx}px`,
                  "--dy": `${overlay.offsets[i].dy}px`,
                  "--rot": `${overlay.offsets[i].rot}deg`,
                  "--delay": `${i * 70}ms`,
                } as CSSProperties
              }
            >
              {item.kind === "note" ? (
                <p className="manifesto__note">
                  <strong>{item.title}</strong>
                  <span>{item.sub}</span>
                </p>
              ) : (
                <Image
                  className="manifesto__photo"
                  src={item.src}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  sizes={PHOTO_SIZES}
                  loading="eager"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
