# CLAUDE.md — Proving Ground

Operating doc for this project. The workspace master prompt and About-me rules still
apply; this file only records what is **specific** to this project. When a decision here
conflicts with a guess, this file wins.

## What it is
Single-user tool to compare LLM outputs for the same prompt across multiple free models,
let the user vote on the best output, and track per-model performance (votes, tokens,
latency) on a leaderboard. Portfolio piece. **Hard constraint: $0 spend — free models only.**

## Stack
- **frontend/** — Next.js (app router) · TypeScript (strict) · Tailwind · shadcn/ui
- **backend/** — FastAPI · Python · SQLAlchemy · Pydantic
- **DB** — PostgreSQL (local: docker-compose; deploy: Neon/Vercel Postgres free tier)
- **Models** — OpenRouter, free tier only. One key, many models. Start: a free Gemini + a free Qwen.
- **Deploy** — frontend on Vercel, backend on Railway.

## Locked decisions
1. **Gateway: OpenRouter.** OpenAI-compatible endpoint; backend calls it with `fetch`/httpx — no SDK to own.
2. **Free models only.** Model IDs carry the `:free` suffix and **churn** — fetch the current
   free Gemini + Qwen IDs from OpenRouter's models list before hardcoding. Never guess an ID.
3. **No cost column.** Free = $0. Add it back (OpenRouter returns it) only when paid models appear.
4. **Token tracking.** Store `prompt_tokens`, `completion_tokens`, `total_tokens` from `usage{}`.
5. **Vote = 👍/👎** per response (working default; could become 1–5 or pick-the-winner — same column).
6. **No auth, no tenancy.** Single user.
7. **Leaderboard is computed**, not stored: `GROUP BY model` over responses. Materialize only if slow.

## Data model (2 tables)
- **runs**: `id, prompt, created_at`
- **responses**: `id, run_id, model, output, error, latency_ms, prompt_tokens, completion_tokens, total_tokens, rating, note`
  - `rating` = the vote. `error` = per-model failure (a 429 on one model must not sink the run).

## API (backend)
- `GET  /health`
- `POST /runs` — `{prompt, models[]}` → fan out (asyncio.gather / allSettled-style), store each response or error, return run
- `GET  /runs`, `GET /runs/{id}`
- `PUT  /responses/{id}/rating` — `{rating, note?}`
- `GET  /leaderboard` — per model: votes, win %, avg latency, avg total tokens

## Conventions
- Secrets in `.env` only (`OPENROUTER_API_KEY`, `DATABASE_URL`). `.env` gitignored from commit 1.
- Every OpenRouter call wrapped; capture error per model, not per run.
- Prompts/model list live in config, not scattered string literals.
- Ponytail mode: laziest thing that works. Mark deliberate shortcuts with `# ponytail:` / `// ponytail:`.

## Run (target)
```
docker compose up -d              # postgres
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev
```

## Status
See `progress.md`.
