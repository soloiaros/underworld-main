/**
 * Tiny app-wide loading tracker. Async boot work (fonts, models, the first
 * painted frame, the window load event) registers under a stable key; the
 * loading screen subscribes and counts settled tasks. Keys are idempotent,
 * so StrictMode's double effects and remounts never double-count.
 */

const tasks = new Map<string, boolean>(); // key -> settled
const listeners = new Set<() => void>();

export interface LoadingSnapshot {
  done: number;
  total: number;
  complete: boolean;
  /** Monotonic — the task total can grow mid-boot, the bar never slides back. */
  percent: number;
}

let percent = 0;
let snapshot: LoadingSnapshot = { done: 0, total: 0, complete: false, percent: 0 };

function recompute() {
  let done = 0;
  for (const settled of tasks.values()) if (settled) done++;
  const raw = tasks.size === 0 ? 0 : Math.round((done / tasks.size) * 100);
  percent = Math.max(percent, raw);
  snapshot = {
    done,
    total: tasks.size,
    complete: done === tasks.size, // 0 tasks -> complete; the gate enforces its own minimum
    percent,
  };
  for (const listener of listeners) listener();
}

/** Registers a task (no-op if the key exists). Pair with `finishAsset`. */
export function beginAsset(key: string) {
  if (tasks.has(key)) return;
  tasks.set(key, false);
  recompute();
}

/** Settles a task. Unknown keys settle nothing — always `beginAsset` first. */
export function finishAsset(key: string) {
  if (tasks.get(key) !== false) return;
  tasks.set(key, true);
  recompute();
}

/**
 * Registers `key` and settles it when the promise resolves OR rejects — a
 * failed asset must degrade gracefully, never trap the user on the loader.
 */
export function trackAsset<T>(key: string, promise: Promise<T>): Promise<T> {
  beginAsset(key);
  promise.then(
    () => finishAsset(key),
    (error) => {
      console.warn(`Asset "${key}" failed to load`, error);
      finishAsset(key);
    }
  );
  return promise;
}

export function subscribeLoading(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLoadingSnapshot(): LoadingSnapshot {
  return snapshot;
}

/* Stable module-level reference — useSyncExternalStore requires the server
   snapshot to be referentially equal between renders. */
const SERVER_SNAPSHOT: LoadingSnapshot = {
  done: 0,
  total: 0,
  complete: false,
  percent: 0,
};

export function getServerLoadingSnapshot(): LoadingSnapshot {
  return SERVER_SNAPSHOT;
}
