<div align="center">
<h1>Q-Belief Net</h1>
<p><strong>Track what the market believes before price reacts.</strong></p>
</div>

Q-Belief Net is a full-stack market-belief intelligence dashboard combining real-time WebSocket data streams, live stock analytics, signal detection, and an interactive market assistant chatbot.

**Latest Features (May 2026):**
- 🤖 **Live Market Chatbot** – Ask questions directly on the homepage ("What's NVDA doing?", "Show me signals", "Portfolio")
- 🧠 **Hugging Face LLM Support** – Uses `meta-llama/Meta-Llama-3-8B` for market analysis chat when configured
- 📡 **Real-time WebSocket Updates** – Live belief scores, trending stocks, and signals with automatic reconnection
- 📊 **Comprehensive Dashboard** – Trending, Signals, Alerts, Watchlist, Reports, Portfolio, and Settings views
- 🎯 **Signal Explainability** – Understand *why* each signal fired
- 💼 **Portfolio Analytics** – Belief-weighted holdings, P/L, and risk assessment
- 🔔 **Smart Alerts** – Custom rules, severity levels, browser notifications
- 📈 **Production-Ready** – Environment-based routing, Docker support, Vercel deployment

## 📦 What's Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| **Trending** | ✅ | Filter by sector/cap, sort by belief/velocity, natural language queries |
| **Stock Detail** | ✅ | Belief vs price divergence charts, coherence/velocity/fragility metrics, narrative clusters |
| **Market Signals** | ✅ | Real-time signal detection with explainability and impact badges |
| **Alerts** | ✅ | Severity filtering, custom alert builder, browser notifications |
| **Watchlist** | ✅ | Local persistence, ticker groups (All, AI, Swing, Macro) |
| **Reports** | ✅ | KPI summary, backtesting panel, CSV export |
| **Portfolio** | ✅ | Holdings table, weighted avg belief, P/L calculation, risk metrics |
| **Settings** | ✅ | WebSocket controls, profile/session, refresh preferences |
| **Live Chat** | ✅ | Homepage market assistant that routes to views and opens tickers |
| **WebSocket Streaming** | ✅ | Heartbeat, message ACK, resume capability, 5s update interval |

## 🏗️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Zustand (state), Tailwind v4, Recharts, Motion.js |
| **Dev Server** | Express + Vite middleware + HTTP proxy (for API/WebSocket) |
| **Backend** | FastAPI, async workers, WebSocket endpoint, Redis (optional) |
| **Data** | Mock trending/stock/signal/alert data (fast iteration) |
| **Deployment** | Docker Compose, Vercel (frontend), Render/Railway (backend) |

## 🤖 LLM Configuration

The homepage chat uses Hugging Face when `VITE_HF_API_KEY` is set in `.env.frontend`.

Example:

```bash
VITE_HF_API_KEY=hf_your_token_here
```

The app calls `meta-llama/Meta-Llama-3-8B` directly through Hugging Face Inference API and falls back to local market analysis if the API is unavailable.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Optional: Docker & Docker Compose

### 1️⃣ Install Dependencies

Frontend:
```bash
npm install
```

Backend (core dependencies only):
```bash
cd backend
pip install fastapi uvicorn pydantic slowapi websockets redis
```

### 2️⃣ Start Local Dev Server

```bash
npm run dev
```

Then open **http://localhost:3000** in your browser.

**What happens:**
- Express server starts on port 3000
- Vite dev server loads with HMR
- FastAPI backend spawns on port 8000
- API/WebSocket requests automatically proxied from frontend to backend

**Separate terminals (if `npm run dev` fails):**

Terminal 1 (Backend):
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Terminal 2 (Frontend):
```bash
npm run dev
```

### 3️⃣ Build for Production

```bash
npm run build
```

Output → `dist/` folder ready for Vercel or static hosting.

## 📋 Project Structure

```
.
├── src/                           # React frontend
│   ├── App.tsx                   # Main app shell with routing
│   ├── store.ts                  # Zustand state, WebSocket logic, API calls
│   ├── index.css                 # Tailwind + custom styles
│   ├── components/
│   │   ├── Trending.tsx          # Trending stocks view
│   │   ├── StockDetail.tsx       # Stock detail with charts
│   │   ├── Signals.tsx           # Market signals
│   │   ├── Alerts.tsx            # Alert management
│   │   ├── Watchlist.tsx         # Watchlist with groups
│   │   ├── Reports.tsx           # KPI & backtesting
│   │   ├── Portfolio.tsx         # Holdings & P/L
│   │   └── SettingsView.tsx      # WebSocket & preferences
│   └── main.tsx                  # React entry point
│
├── backend/                       # FastAPI server
│   ├── main.py                   # App entry, CORS, startup
│   ├── app/
│   │   ├── api/
│   │   │   ├── websockets.py    # WebSocket handler, broadcast
│   │   │   └── routes/          # /api/trending, /api/stock, etc.
│   │   ├── services/
│   │   │   └── market_data.py   # Mock data generation
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic schemas
│   │   └── core/
│   │       ├── config.py        # Settings from env
│   │       └── logging.py       # Structured logging
│   ├── requirements.txt          # Python dependencies
│   └── Dockerfile               # Backend container image
│
├── deploy/                        # Deployment configs
│   └── nginx.conf               # Reverse proxy for Docker Compose
│
├── docker-compose.yml            # Full stack: backend + nginx
├── Dockerfile.frontend           # Frontend build + serve
├── vite.config.ts               # Vite build config
├── tsconfig.json                # TypeScript config
├── index.html                   # HTML entry (React root)
└── package.json                 # npm scripts & dependencies
```

## 🔧 Environment Variables

### Frontend (`.env` or `.env.frontend`)

```bash
# Optional: Override API base URL (defaults to current host)
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

### Backend (`.env` or shell export)

```bash
# CORS origins (comma-separated or JSON array)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Redis (optional for pub/sub across servers)
REDIS_URL=redis://localhost:6379

# Python environment
PYTHON_ENV=development
```

## 🎮 Features Deep Dive

### Live Chat on Homepage
Ask the market assistant questions:
- **"NVDA"** → Opens NVDA stock detail
- **"trending"** → Shows trending stocks
- **"signals"** → Displays market signals
- **"alerts"** → Opens alerts center
- **"watchlist"** → Shows watchlist
- **"portfolio"** → Shows holdings
- **"reports"** → Shows KPI summary

### WebSocket Live Updates
- **Frequency**: Every 5 seconds
- **Message types**: `trending_update`, `stock_update`, `heartbeat`, `latency_test`
- **Auto-reconnect**: 3-second retry on disconnect
- **Resume**: Clients can request last N messages

### Lazy Loading
All feature views (Trending, Signals, etc.) are code-split and loaded on demand → faster initial page load.

### Local Persistence
Watchlist saved to browser localStorage → survives refresh.

## 🚢 Deployment

### Docker Compose (Full Stack Locally)

```bash
docker-compose up --build
```

Access via **http://localhost** (nginx reverse proxy).

### Vercel (Frontend Only)

```bash
vercel deploy
```

Set environment variable `VITE_API_BASE_URL` to your backend URL in Vercel dashboard.

### Render/Railway (Backend)

1. Connect your repo to Render/Railway
2. Set `ALLOWED_ORIGINS` environment variable
3. Deploy!

Backend auto-exposes `/api/*` and `/ws` endpoints.

## 🔍 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Port 3000/8000 already in use | Kill stale processes: `Get-NetTCPConnection -LocalPort 3000,8000` (Windows) |
| WebSocket 403 Forbidden | Check CORS settings in backend; ensure origin matches `ALLOWED_ORIGINS` |
| `npm run dev` hangs | Start services separately (see Quick Start section) |
| Backend not responding | Verify FastAPI is running on 8000: `curl http://localhost:8000/docs` |
| Stale data on homepage | WebSocket may not have connected; check Settings → "Connect Live" |

## 📚 API Reference

### REST Endpoints

```bash
GET  /api/trending              # List trending stocks
GET  /api/stock/{ticker}        # Stock detail & metrics
GET  /api/signals               # Market signals
GET  /api/alerts                # Active alerts
```

### WebSocket

```bash
ws://localhost:8000/ws
```

**Subscribe to messages (auto-broadcast, no action needed):**
- `trending_update` – New trending stocks
- `stock_update` – Updated stock metrics
- `heartbeat` – Keep-alive (10s interval)

**Send ACK to confirm delivery:**
```json
{ "type": "ack", "id": 123 }
```

**Resume from last known message:**
```json
{ "type": "resume", "last_message_id": 456 }
```

## 📖 Scripts

```bash
npm run dev              # Start dev server (Express + Vite + FastAPI)
npm run build           # Build frontend for production
npm run preview         # Preview production build locally
npm run lint            # Run TypeScript type checking
npm start               # Start production server
```

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and test locally
3. Commit with clear messages: `git commit -m "Add feature X"`
4. Push and create a PR

## 📄 License

MIT

Why split deployment:

- Vercel is excellent for static frontend hosting.
- This backend uses long-lived websocket + worker patterns that are not a good fit for Vercel serverless runtime.

This repo includes [vercel.json](vercel.json) configured for Vite output (`dist`).

#### 1. Deploy backend first

Deploy backend to a public URL, example:

- `https://api.yourdomain.com`

Set backend CORS env:

- `ALLOWED_ORIGINS=https://your-vercel-app.vercel.app`

#### 2. Deploy frontend to Vercel

In Vercel project settings, set:

- `VITE_API_BASE_URL=https://api.yourdomain.com`
- `VITE_WS_URL=wss://api.yourdomain.com/ws`

Then deploy with either:

```bash
vercel
```

or import the GitHub repo in the Vercel dashboard.

#### 3. Verify

- Frontend loads from Vercel URL.
- API calls go to `VITE_API_BASE_URL`.
- Websocket connects to `VITE_WS_URL`.

If websocket is not required in production initially, keep `VITE_WS_URL` unset and use static mode.

#### Vercel Quick Start (copy/paste)

1. Deploy backend somewhere public and note URL (example: `https://api.yourdomain.com`).
2. In backend env set:

```bash
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

3. In Vercel project env set:

```bash
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com/ws
```

4. Deploy frontend:

```bash
vercel
```

5. Verify in browser:

- App loads from `https://your-vercel-app.vercel.app`
- API requests succeed
- Websocket status shows connected (if backend ws is enabled)

### Option A: Docker Compose (recommended)

This repo now includes production deployment artifacts:

- Backend image: [backend/Dockerfile](backend/Dockerfile)
- Frontend image: [Dockerfile.frontend](Dockerfile.frontend)
- Reverse proxy config: [deploy/nginx.conf](deploy/nginx.conf)
- Compose stack: [docker-compose.yml](docker-compose.yml)

Run:

```bash
docker compose up --build -d
```

Endpoints:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

### Option B: Split Hosting (frontend + backend separately)

1. Deploy backend with:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir backend
```

2. Set backend CORS origins via env (comma-separated or JSON array), see [backend/.env.example](backend/.env.example).

3. Build frontend with API endpoint env vars as needed:

- `VITE_API_BASE_URL` (example: `https://api.yourdomain.com`)
- `VITE_WS_URL` (optional explicit websocket URL)

See: [.env.frontend.example](.env.frontend.example)

## Environment Variables

### Frontend

- `VITE_API_BASE_URL`:
	- Empty when frontend and backend share same domain/proxy.
	- Set to backend URL when deployed separately.
- `VITE_WS_URL`:
	- Optional websocket override.

### Backend

- `ALLOWED_ORIGINS`:
	- Comma-separated or JSON list.
	- Example: `ALLOWED_ORIGINS=http://localhost:3000,https://app.yourdomain.com`

## Notes About Optional Services

- Redis is optional for minimal local mode.
- If Redis is unavailable, redis-dependent background workers are skipped.
- Some ML/ingestion packages are optional and may be unavailable on bleeding-edge Python builds without native toolchains.

## Troubleshooting

### `npm run dev` fails with `EADDRINUSE` (port already in use)

On Windows PowerShell:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,8000,24678 | Select-Object LocalPort,OwningProcess
Stop-Process -Id <PID> -Force
```

Then run:

```bash
npm run dev
```

### Browser shows `server connection lost` / `ERR_CONNECTION_REFUSED`

- Confirm dev server is running on `3000`.
- Confirm backend is running on `8000`.
- Reload after clearing stale node/python processes.

### `http://localhost:8000` returns `{"detail":"Not Found"}`

- This usually means an old/stale backend process is serving port `8000`.
- Stop the process using port `8000`, then restart backend with:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir backend
```

- Expected behavior after restart:
	- `http://localhost:8000` redirects to `/docs`
	- `http://localhost:8000/favicon.ico` returns `204`

### Missing Python module errors on backend startup

Install the missing package explicitly, for example:

```bash
python -m pip install youtube-transcript-api websockets
```

If a native build package fails (for example `hdbscan`), continue in minimal mode.

## Project Structure

- Frontend app: [src/App.tsx](src/App.tsx)
- Frontend state: [src/store.ts](src/store.ts)
- Backend entry: [backend/main.py](backend/main.py)
- API routes: [backend/app/api/routes](backend/app/api/routes)
- WebSocket endpoint: [backend/app/api/websockets.py](backend/app/api/websockets.py)
