# Deploying CTO

CTO needs **one long-lived Node process**: the live world keeps a websocket
to pump.fun open and holds state in memory. That rules out serverless
(Vercel functions, Netlify, Lambda). Any of the below works.

Required env: `HELIUS_API_KEY`. Optional: see `.env.example`.

## Vercel? Only for the frontend

Vercel runs code per request and freezes it in between, so the live world's
timers and websocket stop: prices show $0 and nothing progresses. Run the
backend on Railway (below) and, if you want the Vercel URL, point the Vercel
frontend at it: in Vercel → Settings → Environment Variables add

```
NEXT_PUBLIC_FEED_URL = https://<your-railway-domain>/api/feed
```

then redeploy. `/api/feed` sends `Access-Control-Allow-Origin: *`.

## Railway (easiest, ~$5/mo)

1. Push this branch to GitHub (already done).
2. railway.app → New Project → Deploy from GitHub → pick the repo and branch
   `claude/cto-dead-coin-agent-eu85f2`.
3. Railway detects the `Dockerfile`. Under **Variables** add
   `HELIUS_API_KEY`.
4. Under **Settings → Networking** generate a domain. Done.
   Check `https://<your-domain>/api/snapshot`.

## Fly.io

```bash
fly launch --no-deploy        # accepts the Dockerfile; pick a region near you
fly secrets set HELIUS_API_KEY=...
fly scale count 1             # exactly one machine: state lives in memory
fly deploy
```

In `fly.toml` set `auto_stop_machines = false` and `min_machines_running = 1`
so Fly doesn't put the scanner to sleep.

## Any VPS (Hetzner, DigitalOcean, …)

```bash
git clone -b claude/cto-dead-coin-agent-eu85f2 https://github.com/capteeen/CTOagent.git
cd CTOagent
docker build -t cto .
docker run -d --name cto --restart unless-stopped -p 3000:3000 \
  -e HELIUS_API_KEY=... cto
```

Put Caddy or nginx in front for HTTPS. Logs: `docker logs -f cto`.

## Without Docker

```bash
npm ci && npm run build
HELIUS_API_KEY=... PORT=3000 npm start     # under pm2 / systemd
```

## After deploy

- `GET /api/snapshot` → `tracked` grows past 0 within a minute, `errors: []`.
- The site header shows **MAINNET · LIVE** and the banner lists caveats.
- State (tracked coins, paper positions, action history, vault) is saved to
  `data/live-state.json` every 30s and on shutdown, and restored on boot. Give
  the container a **persistent volume at `/app/data`** (Railway: Volumes →
  mount path `/app/data`; Fly: `fly volumes create data` + a `[mounts]` entry;
  VPS: add `-v cto-data:/app/data` to `docker run`). Without a volume a
  redeploy starts from scratch.
