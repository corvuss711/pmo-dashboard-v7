# Deploying Phase 3 to the shared server (`/phase3`)

Target URL: `http://20.219.138.129/phase3/login`

This app will live **alongside** your existing `pmo-dashboard` project on the same
server, under its own URL path (`/phase3`) instead of the domain root. It runs as
its own pm2 process on its own port, and Nginx routes `/phase3/*` to it — the
existing app and its `/api` routes are untouched.

## What changed in this repo to make that possible

- `vite.config.js` — production builds now set `base: "/phase3/"`, so the built
  JS/CSS asset URLs resolve correctly when served from that sub-path. Dev (`npm
  run dev`) is unaffected, it still runs at `/`.
- `src/api.js` (new) — a tiny `apiUrl()` helper that automatically calls
  `/api/...` in dev and `/phase3/api/...` in the production build. `Login.jsx`
  and `App.jsx` now use it instead of hardcoded `/api/...` paths.
- `server/index.js`:
  - The auth cookie is now named `phase3_auth_token` (was `auth_token`) so it
    can't collide with a same-named cookie from the other app on this host.
  - Fixed a real bug: cookies were being set with `secure: true` whenever
    `NODE_ENV=production`. Your prod URL is plain **HTTP**, and browsers
    silently refuse to store `secure` cookies over HTTP — login would have
    looked like it worked but never actually persisted. `secure` is now driven
    by a `COOKIE_SECURE` env var (default `false`); flip it to `true` only if
    you later put this behind HTTPS.
  - The `/login`, `/logout`, `/me` routes now answer at **both** `/api/...`
    and `/phase3/api/...`, so Nginx can just proxy the request through as-is —
    no path rewriting required.

## Assumption I'm making about the server

Your existing redeploy script copies `dist/` into `/var/www/...` and restarts a
pm2 app — that's the standard "Nginx serves the static build, pm2/Node serves
the API" pattern, so I'm assuming:

- **Nginx** is already installed and is what's listening on port 80 (serving
  the existing app's static files from `/var/www/pmo-dashboard/client` and
  proxying its `/api` to its pm2 process).
- You have permission to edit the Nginx site config and reload it.

If that's not right (e.g. there's no Nginx and the existing pm2 app listens on
port 80 directly), tell me and the Nginx step below needs to change.

---

## One-time setup

### 1. Get the code onto the server

```bash
cd /
git clone <this-repo-url> PMO-Dashboard-Phase3
cd /PMO-Dashboard-Phase3
```

(Use whatever path convention matches `/PMO-Dashboard-latest-v2` on your box —
adjust the paths below to match if you pick something else.)

### 2. Install and build

```bash
cd /PMO-Dashboard-Phase3
npm install
npm run build
```

This produces `dist/` with asset URLs already prefixed for `/phase3/`.

### 3. Publish the static build

```bash
mkdir -p /var/www/pmo-dashboard-phase3/client
cp -r dist/* /var/www/pmo-dashboard-phase3/client/
```

(A separate directory from the existing app's `/var/www/pmo-dashboard/client`
— don't reuse that one.)

### 4. Start the API with pm2

```bash
cd /PMO-Dashboard-Phase3
PORT=3002 NODE_ENV=production pm2 start server/index.js --name pmo-dashboard-phase3-api
pm2 save
```

- `3002` just needs to be a port nothing else on the server is using — check
  with `pm2 list` / `ss -ltnp` first if you're not sure `3002` is free.
- If `74.225.180.0` (the upstream auth API) isn't reachable from this
  server's network, override it: add `UPSTREAM_BASE_URL=http://...` to the
  same `pm2 start` command. Worth a quick sanity check either way:
  `curl -i http://74.225.180.0/pmo_dashboard/enrollment/login` from the server
  itself before going further.

### 5. Add the Nginx location blocks

Open the existing site's Nginx config (commonly
`/etc/nginx/sites-available/default` or a file under
`/etc/nginx/sites-available/` / `/etc/nginx/conf.d/` — run
`nginx -T | grep -A2 "server_name"` if you're not sure which file owns port 80
for this IP), and inside the existing `server { ... }` block add:

```nginx
    # Phase 3 dashboard — static build
    location /phase3/ {
        alias /var/www/pmo-dashboard-phase3/client/;
        try_files $uri $uri/ /phase3/index.html;
    }

    # Phase 3 dashboard — API
    location /phase3/api/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cookie_path / /phase3/;
    }
```

Note the trailing slash on `alias .../client/` — required for `alias` to map
correctly. `location /phase3/api/` is listed **above** `location /phase3/`
only matters if you reorder things; Nginx picks the most specific prefix match
regardless of file order, so this is safe either way.

Then test and reload:

```bash
nginx -t && systemctl reload nginx
```

### 6. Verify

```bash
curl -sI http://20.219.138.129/phase3/            # 200, serves index.html
curl -s  http://20.219.138.129/phase3/api/me       # {"authenticated":false}
```

Then open `http://20.219.138.129/phase3/login` in a browser and try logging in
for real — check that the `phase3_auth_token` cookie appears in DevTools →
Application → Cookies after a successful login, and that it survives a page
refresh.

---

## Future redeploys

Same shape as your existing script, pointed at this app's paths:

```bash
cd /PMO-Dashboard-Phase3
git pull origin main
npm install
npm run build
rm -rf /var/www/pmo-dashboard-phase3/client/*
cp -r dist/* /var/www/pmo-dashboard-phase3/client/
pm2 restart pmo-dashboard-phase3-api
```

No Nginx changes needed on redeploy — only the first-time setup touches the
Nginx config.
