// import.meta.env.BASE_URL mirrors vite.config.js's `base` — "/" in dev, "/phase3/" in the built app.
const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/{2,}/g, "/");

export function apiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

const TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;

const cache = new Map();
const inFlight = new Map();

export function cachedJson(url, parse) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);

  const pending = inFlight.get(url);
  if (pending) return pending;

  const promise = fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.message || "Request failed");
        err.status = res.status;
        throw err;
      }
      const value = parse ? parse(data) : data;
      cache.set(url, { at: Date.now(), value });
      return value;
    })
    .catch((err) => {
      if (hit) return hit.value;
      throw err;
    })
    .finally(() => inFlight.delete(url));

  inFlight.set(url, promise);
  return promise;
}

export function clearApiCache() {
  cache.clear();
}
