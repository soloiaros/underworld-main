"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  beginAsset,
  finishAsset,
  getLoadingSnapshot,
  getServerLoadingSnapshot,
  subscribeLoading,
} from "@/lib/loading";

const FAILSAFE_MS = 12_000;
const MIN_VISIBLE_MS = 600;
const FADE_MS = 700;

export default function LoadingScreen() {
  const snapshot = useSyncExternalStore(
    subscribeLoading,
    getLoadingSnapshot,
    getServerLoadingSnapshot
  );
  const [dismissing, setDismissing] = useState(false);
  const [gone, setGone] = useState(false);
  const mountedAt = useRef(0);

  /* Window */
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

  /* Dismiss */
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

  /* Unmount */
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
