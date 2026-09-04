"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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

/* dx/dy are pixel offsets from the phrase centre at a 1280px-wide viewport;
   they scale down on smaller screens, and on phones the scatter becomes a
   centred vertical stack instead (see measure()). */
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

/* Must outlast the flyout exit transition in globals.css. */
const EXIT_MS = 500;

/* Flyout photos render at clamp(9rem, 24vw, 16rem) — declaring it keeps the
   browser on the small srcset candidates instead of the 1080w+ ones the
   natural `width` props would otherwise produce. The hidden preload set below
   uses the same value so both resolve to the same optimized URL. */
const PHOTO_SIZES = "clamp(9rem, 24vw, 16rem)";

/* Rendered half-height of a flyout photo in px, mirroring the CSS width
   clamps (including the short-screen rule) — measure() uses it to keep the
   mobile stack fully inside the viewport. The +8 absorbs the drop shadow. */
function photoHalfHeight(item: FlyoutPhoto) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const renderedWidth =
    vh <= 512 // 32rem short-screen rule in globals.css
      ? Math.min(256, Math.max(96, vh * 0.22))
      : Math.min(256, Math.max(144, vw * 0.24));
  return (renderedWidth * item.height) / item.width / 2 + 8;
}

/* Estimated half-height of a note card (padding + two text lines + shadow). */
const NOTE_HALF_HEIGHT = 40;

interface FlyoutOffset {
  dx: number;
  dy: number;
  rot: number;
}

interface OverlayOrigin {
  sequence: number;
  x: number;
  y: number;
  /** Final per-item offsets in px — already scaled (desktop) or stacked and
      clamped into the viewport (mobile). */
  offsets: FlyoutOffset[];
}

/**
 * The brand manifesto: a full-viewport, text-only section. Key phrases are
 * interactive — activating one dims the page and lets supporting notes and
 * archive photos fly out of the phrase itself.
 */
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

    /* Desktop: the art-directed scatter around the phrase, scaled down with
       the viewport (never below 0.55 — the offsets were tuned at 1280px). */
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

    /* Phones: the scatter would fly off a narrow screen, so the items stack
       vertically around the screen centre instead, and the whole stack
       shifts just enough to keep every item fully inside the viewport. */
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spacing = Math.min(190, Math.max(96, vh * 0.22));
    const MARGIN = 56;
    const offsets = items.map((item, i) => ({
      dx: 0,
      dy: (i - (items.length - 1) / 2) * spacing,
      rot: item.rot * 0.6, // subtler tilt — rotation inflates the bounding box
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
    return { sequence: index, x: vw / 2, y: y + shift, offsets };
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

  /* Start collapsed at the phrase, then spring open two frames later so the
     browser has painted the initial state and the transition can run. */
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

  /* While active: keep the flyout anchored to its phrase, allow Escape and
     outside taps to dismiss. */
  useEffect(() => {
    if (active === null) return;

    /* Scroll fires per-frame; coalesce remeasures into one per animation
       frame so an open flyout never re-renders faster than it paints. */
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
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") open(index);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") close();
      }}
      onClick={() => {
        /* Tap-to-toggle for touch devices; mouse users get hover. */
        if (window.matchMedia("(hover: none)").matches) {
          if (active === index) close();
          else open(index);
        }
      }}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) open(index);
      }}
      onBlur={close}
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
      {/* Warm the image cache while the section approaches the viewport, so
          the first flyout opens with its photos already decoded. Rendered at
          1px instead of display:none — display:none would skip the fetch. */}
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
        <div className="manifesto__flyout" data-show={shown} aria-hidden={active === null}>
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
