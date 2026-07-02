# CLAUDE.md — Proving Ground

Operating doc for this project. The workspace master prompt and About-me rules still
apply; this file only records what is **specific** to this project. When a decision here
conflicts with a guess, this file wins.

## What it is
Single-user tool to compare LLM outputs for the same prompt across multiple free models,
let the user vote on the best output, and track per-model performance (votes, tokens,
latency) on a leaderboard. Portfolio piece. **Hard constraint: $0 spend — free models only.**

## Stack
- **frontend/** — Next.js (app router) · TypeScript (strict) · Tailwind v4. Hand-written, no shadcn.
- **backend/** — FastAPI · Python · SQLAlchemy · Pydantic
- **DB** — sqlite locally (`backend/smoke.db`, gitignored); Neon Postgres in production.
- **Models** — Groq free tier (OpenAI-compatible). Current: `openai/gpt-oss-120b` + `meta-llama/llama-4-scout-17b-16e-instruct`.
- **Deploy** — frontend + backend both on Vercel; backend is a Python serverless function (`backend/api/index.py`). DB on Neon. Live, $0.

## Locked decisions
1. **Gateway: Groq.** OpenAI-compatible endpoint; backend calls it with httpx — no SDK. (Was OpenRouter; swapped for speed + higher free limits.)
2. **Free models only.** Groq IDs **churn** — fetch the current list from `/openai/v1/models` before hardcoding. Never guess an ID.
3. **No cost column.** Free = $0. Add it back only when paid models appear.
4. **Token tracking.** Store `prompt_tokens`, `completion_tokens`, `total_tokens` from `usage{}`.
5. **Vote = float rating** per response: `1`=win, `0.5`=draw, `0`=loss. Win% = avg×100. Write-once (re-rate → 409).
6. **Auth = one shared token** (`APP_TOKEN`), gates every route but `/health`. Single user, no accounts/tenancy.
7. **Leaderboard is computed**, not stored: `GROUP BY model` over responses. Materialize only if slow.

## Data model (2 tables)
- **runs**: `id, prompt, created_at`
- **responses**: `id, run_id, model, output, error, latency_ms, compute_ms, prompt_tokens, completion_tokens, total_tokens, rating, note`
  - `rating` = the verdict (float, see #5). `compute_ms` = Groq's own `usage.total_time`; `latency_ms` = wall-clock round trip.
  - `error` = per-model failure (a 429 on one model must not sink the run).

## API (backend) — every route but /health requires the token (Bearer header, or `?token=` for SSE)
- `GET  /health` (open) · `GET /models`
- `POST /runs` — `{prompt, models[]}` → creates PENDING response rows, returns immediately (no model call here)
- `GET  /responses/{id}/stream` — SSE: calls Groq with `stream:true`, relays token deltas, persists output+usage on done
- `GET  /runs`, `GET /runs/{id}`
- `PUT  /responses/{id}/rating` — `{rating, note?}`, write-once
- `GET  /leaderboard` — per model: votes, wins, draws, win %, avg latency, avg total tokens

## Conventions
- Secrets in `.env` only (`GROQ_API_KEY`, `DATABASE_URL`, `APP_TOKEN`, `FRONTEND_ORIGIN`). `.env` gitignored from commit 1.
- Every Groq call wrapped; capture error per model, not per run.
- Prompts/model list live in config, not scattered string literals.
- Ponytail mode: laziest thing that works. Mark deliberate shortcuts with `# ponytail:` / `// ponytail:`.

## Run (local)
```
cd backend && uvicorn app.main:app --reload --port 8002   # sqlite, needs GROQ_API_KEY + APP_TOKEN in backend/.env
cd frontend && npm run dev                                # enter APP_TOKEN at the lock screen
```

## Status
See `progress.md`.
