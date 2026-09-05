"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { hoverTapProps } from "@/lib/hover-tap";

interface Piece {
  src: string;
  alt: string;
  width: number;
  height: number;
  name: string;
  season: string;
  description: string;
}

const PIECES: Piece[] = [
  {
    src: "/img/collection1.webp",
    alt: "Lookbook photo from the trap queen collection",
    width: 346,
    height: 421,
    name: "trap queen",
    season: "winter 2007",
    description: "signature hoodies and balaclavas, fragrance, socks",
  },
  {
    src: "/img/collection2.webp",
    alt: "Lookbook photo from the static bloom collection",
    width: 579,
    height: 717,
    name: "static bloom",
    season: "summer 2011",
    description: "washed tees, mesh jerseys, chain-stitch caps",
  },
  {
    src: "/img/collection3.webp",
    alt: "Lookbook photo from the graveyard shift collection",
    width: 590,
    height: 697,
    name: "graveyard shift",
    season: "autumn 2014",
    description: "workwear jackets, cargo trousers, ribbed beanies",
  },
  {
    src: "/img/collection4.webp",
    alt: "Lookbook photo from the nocturne athletics collection",
    width: 719,
    height: 719,
    name: "nocturne athletics",
    season: "spring 2019",
    description: "track sets, reflective runners, tube socks",
  },
  {
    src: "/img/collection5.webp",
    alt: "Lookbook photo from the halo gutter collection",
    width: 378,
    height: 378,
    name: "halo gutter",
    season: "winter 2023",
    description: "puffer coats, knit balaclavas, wool scarves",
  },
];

export default function CollectionBoard() {
  const [active, setActive] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const open = useCallback((index: number) => setActive(index), []);
  const close = useCallback(() => setActive(null), []);

  /* Dismiss */
  useEffect(() => {
    if (active === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!itemRefs.current[active]?.contains(event.target as Node)) {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [active, close]);

  return (
    <section className="collection" aria-label="The archive">
      <div className="collection__board">
        {PIECES.map((piece, i) => (
          <button
            key={piece.src}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            className="collection__item"
            data-active={active === i}
            aria-expanded={active === i}
            aria-label={`${piece.name}, ${piece.season}`}
            {...hoverTapProps(i, active, open, close)}
          >
            <Image
              className="collection__photo"
              src={piece.src}
              alt={piece.alt}
              width={piece.width}
              height={piece.height}
              sizes="(max-width: 48rem) 44vw, 21rem"
            />
            <span className="collection__caption collection__caption--title">
              {piece.name}, {piece.season}
            </span>
            <span className="collection__caption collection__caption--desc">
              {piece.description}
            </span>
          </button>
        ))}
      </div>
      <div className="dim-backdrop" data-show={active !== null} />
    </section>
  );
}
