# Proving Ground

Send one prompt to several free LLMs, stream their answers side by side, call a
winner, and track a standings table. Single-user portfolio project. $0 to run —
free models only.

- **Frontend:** Next.js (App Router), TypeScript, Tailwind → Vercel.
- **Backend:** FastAPI, SQLAlchemy, SSE streaming → Render (free).
- **Models:** Groq free tier (OpenAI-compatible) — `openai/gpt-oss-120b` +
  `meta-llama/llama-4-scout-17b-16e-instruct`. IDs churn; refresh from
  `/openai/v1/models`.
- **DB:** sqlite for local dev, Neon Postgres in production.

## Local development

Backend:

    cd backend
    python -m venv .venv && .venv/Scripts/activate     # Windows
    pip install -r requirements.txt
    cp ../.env.example .env                             # then add GROQ_API_KEY
    uvicorn app.main:app --reload --port 8002

Frontend:

    cd frontend
    npm install
    echo "NEXT_PUBLIC_API_URL=http://localhost:8002" > .env.local
    npm run dev

Get a free Groq key at https://console.groq.com/keys.

## Deployment

### 1. Database — Neon (free Postgres)
Create a project at https://neon.tech and copy the connection string. Rewrite the
prefix to `postgresql+psycopg2://…` — SQLAlchemy needs the driver name. Tables
auto-create on first boot; no migration step.

### 2. Backend — Vercel (free)
The backend runs as a Vercel Python function (`backend/api/index.py` + `backend/vercel.json`).
Create a **second** Vercel project from this repo with **Root Directory** `backend/`, and set:

- `GROQ_API_KEY`
- `DATABASE_URL` — the Neon string (`postgresql+psycopg2://…`)
- `APP_TOKEN` — the shared access secret
- `FRONTEND_ORIGIN` — your frontend's Vercel URL (fill in after the frontend deploys)

Serverless cold-starts after idle; each SSE stream must finish within the function time limit.

### 3. Frontend — Vercel
Create a project from this repo with **Root Directory** `frontend/`, and set:

- `NEXT_PUBLIC_API_URL` — the backend project's URL

### Order (they reference each other's URL)
1. Deploy the backend → copy its URL.
2. Set the frontend's `NEXT_PUBLIC_API_URL`, deploy it → copy its URL.
3. Set the backend's `FRONTEND_ORIGIN` to the Vercel URL, redeploy the backend.
