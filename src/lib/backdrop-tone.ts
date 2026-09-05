"use client";

import { useEffect, useState, type RefObject } from "react";

export type BackdropTone = "dark" | "light";

const ENTER_LIGHT = 0.58;
const ENTER_DARK = 0.42;
const SAMPLE_MS = 80;

type Entry = {
  ref: RefObject<HTMLElement | null>;
  tone: BackdropTone;
  setTone: (tone: BackdropTone) => void;
};

const entries = new Set<Entry>();
let scratch: CanvasRenderingContext2D | null = null;
let raf = 0;
let lastSample = 0;
let dirty = true;
let started = false;
let classObserver: MutationObserver | null = null;

function scratchCtx() {
  if (scratch) return scratch;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  scratch = canvas.getContext("2d", { willReadFrequently: true });
  return scratch;
}

function parseColor(input: string) {
  if (!input || input === "transparent") return null;
  const match = input.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i
  );
  if (!match) return null;
  const alpha = match[4]
    ? match[4].endsWith("%")
      ? Number(match[4].slice(0, -1)) / 100
      : Number(match[4])
    : 1;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: alpha };
}

function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function containsPoint(el: Element, x: number, y: number) {
  const rect = el.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function isChrome(el: Element, target: HTMLElement) {
  return (
    target.contains(el) ||
    !!el.closest(".site-menu-button") ||
    !!el.closest(".theme-toggle") ||
    !!el.closest(".loading-screen") ||
    !!el.closest(".lil-gui")
  );
}

function sampleDrawn(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  ctx: CanvasRenderingContext2D
) {
  if (sw < 1 || sh < 1) return null;
  try {
    ctx.clearRect(0, 0, 1, 1);
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a < 128) return null;
    return luminance(r, g, b);
  } catch {
    return null;
  }
}

function sampleImage(
  img: HTMLImageElement,
  x: number,
  y: number,
  ctx: CanvasRenderingContext2D
) {
  const rect = img.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0 || img.naturalWidth === 0) return null;
  const sx = ((x - rect.left) / rect.width) * img.naturalWidth;
  const sy = ((y - rect.top) / rect.height) * img.naturalHeight;
  return sampleDrawn(img, sx, sy, 1, 1, ctx);
}

function sampleCanvas(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  ctx: CanvasRenderingContext2D
) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0 || canvas.width === 0) return null;
  const sx = ((x - rect.left) / rect.width) * canvas.width;
  const sy = ((y - rect.top) / rect.height) * canvas.height;
  return sampleDrawn(canvas, sx, sy, 1, 1, ctx);
}

function nearestOpaqueLuminance(el: Element) {
  let node: Element | null = el;
  while (node && node !== document.documentElement) {
    if (node === document.body || node.tagName === "MAIN") break;
    const style = getComputedStyle(node);
    const color = parseColor(style.backgroundColor);
    if (color) {
      const alpha = color.a * Number(style.opacity);
      if (alpha >= 0.5) return luminance(color.r, color.g, color.b);
    }
    node = node.parentElement;
  }
  return null;
}

function luminanceAt(
  x: number,
  y: number,
  target: HTMLElement,
  ctx: CanvasRenderingContext2D,
  pageLum: number
) {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (isChrome(el, target)) continue;
    if (el === document.body || el === document.documentElement) continue;
    if (el instanceof HTMLElement && el.classList.contains("mist-background")) {
      continue;
    }
    if (el.tagName === "MAIN") continue;

    if (el instanceof HTMLCanvasElement) {
      if (el.classList.contains("mist-background")) continue;
      if (!el.classList.contains("chrome-stars")) continue;
      const fromCanvas = sampleCanvas(el, x, y, ctx);
      if (fromCanvas != null) return fromCanvas;
      continue;
    }

    const img =
      el instanceof HTMLImageElement
        ? el
        : el.querySelector?.("img") instanceof HTMLImageElement
          ? el.querySelector("img")
          : null;
    if (img instanceof HTMLImageElement && containsPoint(img, x, y)) {
      const fromImage = sampleImage(img, x, y, ctx);
      if (fromImage != null) return fromImage;
    }

    const fromFill = nearestOpaqueLuminance(el);
    if (fromFill != null) return fromFill;
  }

  const stars = document.querySelector("canvas.chrome-stars");
  if (stars instanceof HTMLCanvasElement && containsPoint(stars, x, y)) {
    const fromStars = sampleCanvas(stars, x, y, ctx);
    if (fromStars != null) return fromStars;
  }

  return pageLum;
}

function luminanceUnder(target: HTMLElement, ctx: CanvasRenderingContext2D) {
  const rect = target.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  const page = parseColor(getComputedStyle(document.body).backgroundColor);
  const pageLum = page ? luminance(page.r, page.g, page.b) : 0;

  const insetX = rect.width * 0.3;
  const insetY = rect.height * 0.3;
  const points: [number, number][] = [
    [rect.left + rect.width / 2, rect.top + rect.height / 2],
    [rect.left + insetX, rect.top + insetY],
    [rect.right - insetX, rect.top + insetY],
    [rect.left + insetX, rect.bottom - insetY],
    [rect.right - insetX, rect.bottom - insetY],
  ];

  let total = 0;
  for (const [x, y] of points) {
    total += luminanceAt(x, y, target, ctx, pageLum);
  }
  return total / points.length;
}

function pickTone(current: BackdropTone, lum: number): BackdropTone {
  if (current === "light") return lum < ENTER_DARK ? "dark" : "light";
  return lum > ENTER_LIGHT ? "light" : "dark";
}

function sampleAll() {
  const ctx = scratchCtx();
  if (!ctx) return;
  for (const entry of entries) {
    const node = entry.ref.current;
    if (!node) continue;
    const lum = luminanceUnder(node, ctx);
    if (lum == null) continue;
    const next = pickTone(entry.tone, lum);
    if (next !== entry.tone) {
      entry.tone = next;
      entry.setTone(next);
    }
  }
}

function markDirty() {
  dirty = true;
}

function tick(now: number) {
  raf = requestAnimationFrame(tick);
  if (document.visibilityState === "hidden") return;
  if (!dirty && now - lastSample < SAMPLE_MS) return;
  dirty = false;
  lastSample = now;
  sampleAll();
}

function start() {
  if (started) return;
  started = true;
  window.addEventListener("scroll", markDirty, { passive: true, capture: true });
  window.addEventListener("resize", markDirty);
  classObserver = new MutationObserver(markDirty);
  classObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  raf = requestAnimationFrame(tick);
}

function stop() {
  if (!started) return;
  started = false;
  window.removeEventListener("scroll", markDirty, { capture: true });
  window.removeEventListener("resize", markDirty);
  classObserver?.disconnect();
  classObserver = null;
  cancelAnimationFrame(raf);
  raf = 0;
}

function subscribe(
  ref: RefObject<HTMLElement | null>,
  setTone: (tone: BackdropTone) => void
) {
  const entry: Entry = { ref, tone: "dark", setTone };
  entries.add(entry);
  start();
  dirty = true;
  return () => {
    entries.delete(entry);
    if (entries.size === 0) stop();
  };
}

export function useBackdropTone(ref: RefObject<HTMLElement | null>) {
  const [tone, setTone] = useState<BackdropTone>("dark");

  useEffect(() => subscribe(ref, setTone), [ref]);

  return tone;
}
