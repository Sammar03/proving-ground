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

## Run Locally

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
