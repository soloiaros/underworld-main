"use client";

import { useSyncExternalStore } from "react";

const HASH = "#debug";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getSnapshot() {
  return window.location.hash === HASH;
}

function getServerSnapshot() {
  return false;
}

export function useDebug() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
