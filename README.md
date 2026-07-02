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

### 2. Backend — Render (free)
Deploy from this repo via `render.yaml` (Blueprint), or a manual web service with
Root Directory `backend/`. Set these env vars in the dashboard:

- `GROQ_API_KEY`
- `DATABASE_URL` — the Neon string
- `FRONTEND_ORIGIN` — your Vercel URL (fill in after the frontend deploys)

Free services cold-start after ~15 min idle (first request ~30–50s).

### 3. Frontend — Vercel
Import the repo, set **Root Directory** to `frontend/`, and set:

- `NEXT_PUBLIC_API_URL` — the Render backend URL

### Order (they reference each other's URL)
1. Deploy the backend → copy its URL.
2. Set the frontend's `NEXT_PUBLIC_API_URL`, deploy it → copy its URL.
3. Set the backend's `FRONTEND_ORIGIN` to the Vercel URL, redeploy the backend.
