/**
 * Tiny localStorage cache with a TTL, used to paint the UI before the network answers.
 *
 * The catalog (class → subject → chapter) never changes while the container is running,
 * so re-downloading it on every visit is pure latency. Reading it synchronously on
 * mount lets the picker and the header render immediately, while the network response
 * (usually a 304) replaces it in the background.
 */

type Entry<T> = {
  storedAt: number;
  value: T;
};

const PREFIX = "patsomadhan.cache.";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Private mode / blocked storage: caching is best-effort only.
    return null;
  }
}

export function readCache<T>(key: string, maxAgeMs: number = DEFAULT_TTL_MS): T | null {
  const store = storage();
  if (!store) {
    return null;
  }
  try {
    const raw = store.getItem(PREFIX + key);
    if (!raw) {
      return null;
    }
    const entry = JSON.parse(raw) as Entry<T>;
    if (!entry || typeof entry.storedAt !== "number") {
      return null;
    }
    if (Date.now() - entry.storedAt > maxAgeMs) {
      store.removeItem(PREFIX + key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  const store = storage();
  if (!store) {
    return;
  }
  try {
    store.setItem(PREFIX + key, JSON.stringify({ storedAt: Date.now(), value } satisfies Entry<T>));
  } catch {
    // Quota exceeded (or serialisation failure): skip caching, keep the fresh value.
  }
}

export function clearCache(key: string): void {
  try {
    storage()?.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export const CACHE_KEYS = {
  catalog: "catalog",
} as const;
