// import.meta.env.BASE_URL mirrors vite.config.js's `base` — "/" in dev, "/phase3/" in the built app.
const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/{2,}/g, "/");

export function apiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

const TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12000;
// A page load fires ~6 requests at once. The backend runs few workers, so
// letting them all through makes one queue past the proxy's own timeout --
// which is what made a first load intermittently come up empty while a
// refresh worked. Three at a time keeps every request well inside it.
const MAX_CONCURRENT = 3;
const RETRIES = 2;
const RETRY_BASE_MS = 400;

const cache = new Map();
const inFlight = new Map();

let active = 0;
const queue = [];

function pump() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift();
    active += 1;
    job.run().then(job.resolve, job.reject).finally(() => {
      active -= 1;
      pump();
    });
  }
}

function schedule(run) {
  return new Promise((resolve, reject) => {
    queue.push({ run, resolve, reject });
    pump();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Retries a timeout or 5xx, which are transient under load. A 4xx is a real
// answer about this URL and repeating it would only waste a worker.
async function fetchWithRetry(url) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      return await schedule(() => fetchJson(url));
    } catch (err) {
      lastErr = err;
      if (err.status >= 400 && err.status < 500) break;
      if (attempt < RETRIES) await sleep(RETRY_BASE_MS * (attempt + 1));
    }
  }
  throw lastErr;
}

export function cachedJson(url, parse) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);

  const pending = inFlight.get(url);
  if (pending) return pending;

  const promise = fetchWithRetry(url)
    .then((data) => {
      const value = parse ? parse(data) : data;
      cache.set(url, { at: Date.now(), value });
      return value;
    })
    // Entries are kept past TTL_MS on purpose: serving the last good response
    // beats blanking the page when a refresh fails.
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
