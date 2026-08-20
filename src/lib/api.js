// import.meta.env.BASE_URL mirrors vite.config.js's `base` — "/" in dev, "/phase3/" in the built app.
const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/{2,}/g, "/");

export function apiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
