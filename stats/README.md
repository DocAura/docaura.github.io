# DocAura Stats

Private, cookie-free recorder and dashboard for docaura.github.io, deployed to
https://docaura-stats.netlify.app from this folder (Netlify base directory: `stats`).

- `POST /api/e`: the site sends one anonymous event (page view, tool used, option, download, chai tap).
  Country and phone/computer are added here; IP addresses are never stored.
- `GET /api/stats?days=1|7|30`: summary for the dashboard. Needs the `x-dash-key` header (env var `DASH_KEY`).
- `public/`: the dashboard page. Open it once with `#k=<key>` and the key is remembered on that device.
