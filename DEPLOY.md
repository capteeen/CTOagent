# Deploying CTO

CTO needs **one long-lived Node process**: the live world keeps a websocket
to pump.fun open and holds state in memory. That rules out serverless
(Vercel functions, Netlify, Lambda). Any of the below works.

Required env: `HELIUS_API_KEY`. Optional: see `.env.example`.

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
- Restarts lose in-memory state (paper positions, action history). That is
  acceptable while trading is on paper; persistence comes with real trading.
