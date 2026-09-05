const tasks = new Map<string, boolean>();
const listeners = new Set<() => void>();

export interface LoadingSnapshot {
  complete: boolean;
  percent: number;
}

let percent = 0;
let snapshot: LoadingSnapshot = { complete: false, percent: 0 };

function recompute() {
  let done = 0;
  for (const settled of tasks.values()) if (settled) done++;
  const raw = tasks.size === 0 ? 0 : Math.round((done / tasks.size) * 100);
  percent = Math.max(percent, raw);
  snapshot = {
    complete: done === tasks.size,
    percent,
  };
  for (const listener of listeners) listener();
}

export function beginAsset(key: string) {
  if (tasks.has(key)) return;
  tasks.set(key, false);
  recompute();
}

export function finishAsset(key: string) {
  if (tasks.get(key) !== false) return;
  tasks.set(key, true);
  recompute();
}

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

const SERVER_SNAPSHOT: LoadingSnapshot = { complete: false, percent: 0 };

export function getServerLoadingSnapshot(): LoadingSnapshot {
  return SERVER_SNAPSHOT;
}
