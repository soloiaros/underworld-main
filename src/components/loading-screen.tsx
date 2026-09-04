"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  beginAsset,
  finishAsset,
  getLoadingSnapshot,
  getServerLoadingSnapshot,
  subscribeLoading,
} from "@/lib/loading";

/* Never trap the user: whatever the network does, the gate lifts. */
const FAILSAFE_MS = 12_000;
/* Below this the reveal would feel like a glitch rather than a transition. */
const MIN_VISIBLE_MS = 600;
/* Must outlast the opacity transition in globals.css. */
const FADE_MS = 700;

/**
 * Full-screen gate shown until every boot asset (wordmark font, star models,
 * first painted hero frame, window load) has settled. Server-rendered visible
 * so there is no flash of an empty hero; fades out and unmounts once done.
 * The webcam prompt is deliberately NOT tracked — it is optional and async.
 */
export default function LoadingScreen() {
  const snapshot = useSyncExternalStore(
    subscribeLoading,
    getLoadingSnapshot,
    getServerLoadingSnapshot
  );
  const [dismissing, setDismissing] = useState(false);
  const [gone, setGone] = useState(false);
  const mountedAt = useRef(0);

  /* The window load event is one of the tracked tasks: it covers the HTML,
     CSS, JS and any eager images the tracker can't see. */
  useEffect(() => {
    mountedAt.current = performance.now();
    beginAsset("window-load");
    if (document.readyState === "complete") {
      finishAsset("window-load");
      return;
    }
    const onLoad = () => finishAsset("window-load");
    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  /* Dismiss once everything settled, but never before MIN_VISIBLE_MS. */
  useEffect(() => {
    if (!snapshot.complete || dismissing) return;
    const elapsed = performance.now() - mountedAt.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const timer = window.setTimeout(() => setDismissing(true), wait);
    return () => window.clearTimeout(timer);
  }, [snapshot.complete, dismissing]);

  useEffect(() => {
    const failsafe = window.setTimeout(() => setDismissing(true), FAILSAFE_MS);
    return () => window.clearTimeout(failsafe);
  }, []);

  /* Unmount after the fade. The page underneath is never scroll-locked —
     locking would toggle the scrollbar gutter and shift the layout. */
  useEffect(() => {
    if (!dismissing) return;
    const timer = window.setTimeout(() => setGone(true), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [dismissing]);

  if (gone) return null;

  const shown = dismissing ? 100 : snapshot.percent;

  return (
    <div
      className="loading-screen"
      data-dismissing={dismissing}
      role="status"
      aria-label="Loading Underworld Studios"
      aria-hidden={dismissing}
    >
      <div className="loading-screen__inner">
        <p className="loading-screen__brand">
          Underworld <span>Studios</span>
        </p>
        <div className="loading-screen__track">
          <div
            className="loading-screen__bar"
            style={{ width: `${shown}%` }}
          />
        </div>
        <p className="loading-screen__percent">{shown}</p>
      </div>
    </div>
  );
}
