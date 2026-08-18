# AI FPL Manager

An AI-powered Fantasy Premier League decision layer: upload a squad screenshot, get projections, then receive an optimized transfer, captain, formation, and chip recommendation with a plain-language explanation.

**Core loop:** Data → ML predictions → optimization → AI explanation. The LLM explains; it does not invent the numbers.

## How we are building this

The PRD’s recommended order, in slices you can run and inspect:

| Phase | What ships | Status |
| --- | --- | --- |
| 0 | Repo, Next.js + FastAPI, Postgres | In progress |
| 1 | FPL data ingestion + normalized DB + explorer UI | In progress |
| 2 | Player projection baseline (start heuristic, then LightGBM) | Next |
| 3 | Screenshot squad scanner + confirm UI | Done |
| 4 | Transfer / captain / chip optimizer (OR-Tools) | Later |
| 5 | Recommendation dashboard + team rating + potential picks | Later |
| 6 | LLM explanation + What-If | Later |
| 7 | Evaluation, monitoring, Pro features | Later |

## Local setup

```bash
cp .env.example .env
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. python scripts/ingest.py
uvicorn app.main:app --reload --port 8000
```

Optional later: `docker compose up -d` and point `DATABASE_URL` at Postgres.

In another terminal:

```bash
cd frontend
cp ../.env.example .env.local   # or set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Sync FPL data** if the database is empty.

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Deploy on Vercel (Services)

### 1. Set Framework Preset to **Services**
In Vercel → your project → **Settings → Build and Deployment → Framework Preset**, choose **Services**.  
Without this, Vercel ignores `vercel.json` services and the GitHub check fails with no obvious new deployment.

### 2. `vercel.json` routing

- **frontend** — Next.js at `/`
- **backend** — FastAPI at `/api/backend`

On Vercel, set environment variables:

| Variable | Value |
| --- | --- |
| `SERVICE_PATH_PREFIX` | `/api/backend` |
| `NEXT_PUBLIC_API_URL` | `/api/backend` |
| `GEMINI_API_KEY` | your key |
| `DATABASE_URL` | Postgres URL (SQLite does not persist on serverless) |

Local dev is unchanged: run backend on `:8000` and frontend on `:3000` without `SERVICE_PATH_PREFIX`.

**Important:** On Vercel, do **not** set `NEXT_PUBLIC_API_URL` to `localhost`. Add `GEMINI_API_KEY` in the Vercel dashboard (Environment Variables). The frontend auto-routes to `/api/backend` in production.

If GitHub shows **Vercel — Deployment failed** but you see no new deployment, check **Deployments → Failed** in the Vercel dashboard — config errors often fail before a successful deploy is created.

## Stack

- Frontend: Next.js, React, Tailwind
- Backend: Python, FastAPI
- Database: PostgreSQL
- Later: LightGBM, OR-Tools, vision model + LLM, Redis
