# backend.md — FastAPI service

## Role
Owns all business logic: OpenRouter calls, token/latency capture, persistence, vote storage,
leaderboard aggregation. The frontend never sees OpenRouter or the DB shape directly.

## Stack
FastAPI · Python · SQLAlchemy · Pydantic · httpx.

## Layout
```
backend/
  requirements.txt
  app/
    main.py            # FastAPI app, /health, mounts routers
    config.py          # pydantic-settings: OPENROUTER_API_KEY, DATABASE_URL, MODELS list
    db.py              # SQLAlchemy engine + session
    models.py          # Run, Response (SQLAlchemy ORM)
    schemas.py         # Pydantic request/response
    openrouter.py      # one async httpx client → OpenAI-compatible /chat/completions
    routers/
      runs.py          # POST /runs, GET /runs, GET /runs/{id}, GET /leaderboard
      ratings.py       # PUT /responses/{id}/rating
  tests/
    test_runs.py       # fan-out stores N responses; one model failing doesn't sink the run
```

## OpenRouter
- Endpoint: `POST https://openrouter.ai/api/v1/chat/completions`, `Authorization: Bearer <key>`.
  OpenAI-compatible body. No SDK — httpx is enough.
- **Free models only.** IDs carry `:free` and churn — fetch current free Gemini + Qwen IDs from
  `GET /api/v1/models` before hardcoding into `config.MODELS`. Never guess an ID.
- Capture from each response: `choices[0].message.content`, and `usage.{prompt_tokens,
  completion_tokens,total_tokens}`. Time the call for `latency_ms`.

## Endpoints
- `GET /health` → `{"status":"ok"}`.
- `POST /runs` `{prompt, models[]}` → create Run, `asyncio.gather` one call per model with
  per-model try/except (store `output` or `error`), persist Responses, return the run.
  Free tier is rate-limited — a 429 on one model is an error row, not a 500 for the run.
- `GET /runs`, `GET /runs/{id}`.
- `PUT /responses/{id}/rating` `{rating, note?}` → write vote onto the response row.
- `GET /leaderboard` → `GROUP BY model`: votes (count rated), win % (avg rating),
  avg latency, avg total tokens. Computed on read, not stored.

## Conventions
- All external/DB calls wrapped; errors logged with which model + input.
- Secrets via env only. CORS limited to the frontend origin (not `*`) in prod.
- Validate request bodies with Pydantic at the boundary.

## Out of scope (for now)
Auth, cost tracking (free = $0), LLM-as-judge, deterministic metrics, multi-rater votes.
