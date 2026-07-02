# Progress — Proving Ground

Running log. Newest at top.

## 2026-07-02 — DEPLOYED ✅ live end-to-end
- **Live:** frontend https://proving-ground-fc.vercel.app · backend https://proving-ground-seven.vercel.app
  · DB Neon Postgres. Both on Vercel free (no card), $0.
- Two Vercel projects from one repo (root `frontend/` and `backend/`). Backend env set:
  GROQ_API_KEY, DATABASE_URL (Neon +psycopg2), APP_TOKEN=`TYLERDURDEN`, FRONTEND_ORIGIN.
- **Gotcha hit + fixed:** lock screen showed "Wrong token" for every password — it was CORS, not the
  token. `FRONTEND_ORIGIN` had to be the frontend origin **exactly** (`https://proving-ground-fc.vercel.app`,
  no trailing slash) + a backend redeploy. `verify()` reports any failed request as a bad token, so a
  blocked CORS request looked identical. Confirmed fixed via preflight returning ACAO.
- **SSE streams live** through Vercel's Python runtime (no buffering) — tokens appear as generated.
- Starts at bout #1 (Neon wiped clean pre-deploy). Open: trailing-slash hardening on FRONTEND_ORIGIN
  (not yet done); CLAUDE.md still has stale OpenRouter/shadcn lines.

## 2026-07-02 — Backend host: Render → Vercel serverless (Render/Railway want a card)
- Render (and Railway/Fly/Koyeb/Cloud Run) all require a credit card even for free; deploying the
  backend on **Vercel Python functions** instead (free, no card, same platform as the frontend).
- Refactor for serverless: dropped the FastAPI **lifespan** hook (Vercel may not run it) and made
  the httpx client **lazy** via `provider.get_client()` — one keep-alive client per warm process,
  works under uvicorn and serverless alike. `stream_response` no longer takes `request`.
- Added `backend/api/index.py` (exports the ASGI `app`) + `backend/vercel.json` (rewrites all paths
  to the function). Removed `render.yaml`. Project folder renamed → `proving-ground`.
- Deploy = TWO Vercel projects from one repo: root `frontend/` and root `backend/`. Backend env:
  GROQ_API_KEY, DATABASE_URL (Neon +psycopg2), APP_TOKEN, FRONTEND_ORIGIN.
- Neon verified earlier (schema + wins/draws aggregate on Postgres; left empty, next bout id=1).
- **Watch on deploy:** SSE through Vercel's Python runtime — confirm tokens stream live vs arrive
  in one lump, and that generations finish inside the function time limit. Tests: 4 passed.

## 2026-07-02 — Auth gate + write-once verdicts (hardening for public deploy)
- **Shared-token auth**: one `APP_TOKEN` secret gates every route but `/health`. New `auth.py`
  `require_token` dependency (Bearer header or `?token=` for SSE, `secrets.compare_digest`).
  **Fail-closed**: unset token → 503 on gated routes, so a misconfigured deploy is never open.
  Applied via `include_router(dependencies=[...])` on runs + ratings, and on `/models`. (main.py)
- **Frontend lock screen** (`app/gate.tsx`) wraps the app in layout; verifies the token before
  storing it. `lib/api.ts` sends the token on every request (header + stream query) and bounces
  to the lock screen on any 401.
- **Write-once verdicts**: `PUT /rating` now 409s if already rated (was a blind overwrite — anyone
  could re-vote via the API). (ratings.py)
- Context: the API can't be hidden from a browser console (frontend = API client); auth is the
  real protection — unauthorized URL/console/curl access all 401.
- `APP_TOKEN` added to .env.example, render.yaml (required secret), local backend/.env
  (`dev-local-token`); removed stale OPENROUTER_API_KEY from backend/.env. Tests: **4 passed**
  (added auth-gate + write-once checks).

## 2026-07-02 — Deploy prep (Render + Neon + Vercel) — code ready, not yet deployed
- Chose **Render free** for the backend: Railway dropped its free tier, which breaks the
  $0 constraint. DB target → **Neon** free Postgres. Frontend stays on Vercel.
- **CORS fix:** wired `FRONTEND_ORIGIN` into `allow_origins` alongside the dev LAN regex.
  Prod would have been blocked before — it only allowed localhost/private LAN. (main.py)
- Added **render.yaml** Blueprint: rootDir `backend`, uvicorn start on `$PORT`, `/health`
  check, `plan: free`, secrets `sync: false` (GROQ_API_KEY / DATABASE_URL / FRONTEND_ORIGIN).
- **.env.example** rewritten: dropped stale `OPENROUTER_API_KEY` + port 8002; now Groq +
  sqlite(dev)/Neon(prod) + real deploy vars. Added **README.md** with local run + deploy order.
- sqlite→Postgres is just `DATABASE_URL` (psycopg2-binary already in requirements; tables
  auto-create, no Alembic). Backend 3 tests still pass after CORS change.
- **Not committed** — user commits to GitHub manually. Next: Neon DB → push → deploy backend
  → deploy frontend → wire the two URLs → prod smoke test.

## 2026-07-01 — Model swap, standings wipe, mobile UI pass
- Groq announced discontinuation of `llama-3.1-8b-instant`; swapped it for
  `meta-llama/llama-4-scout-17b-16e-instruct` (verified live, non-reasoning, plain content,
  no `reasoning` field). Pair is now gpt-oss-120b + llama-4-scout. (config.py)
- **Wiped standings**: cleared `runs` + `responses`, bout numbering restarts at 1 (plain
  INTEGER PKs, no AUTOINCREMENT). Backup saved to `backend/smoke.backup-*.db` (gitignored).
- Frontend tweaks: Start button moved under the prompt, Enter runs / Shift+Enter newline
  (hints later removed), compact hero, removed "model arena" nav item. Standings switched
  from a 44rem scrolling table to per-fighter cards (fit mobile, no h-scroll) showing
  **wins + draws** — needed a leaderboard change: `/leaderboard` now returns `wins`
  (rating=1) and `draws` (rating=0.5) counts. Bout page: cards side-by-side on mobile,
  Winner button moved to top, tighter header spacing so answers sit above the fold.

## 2026-06-23 — Verdict system overhaul ✅
- Rating Integer → **Float** (1=win, 0.5=draw, 0=loss); ratings.py validates {0,0.5,1};
  leaderboard win% = avg×100 (draw = 50%). Verified live + bad rating → 400. (sqlite stores
  floats fine, existing 0/1 votes still valid — no migration.)
- **Pick "Winner" auto-sets the other(s) as loser** in one action (judge() rates all rows). "Out"
  button removed. Button renamed "Call winner" → **Winner**.
- **Draw** button: middle medallion in ringside (2 models), centered button below in grid mode.
- **Gate**: can't start a new bout without judging — `localStorage.pendingBout` set on create,
  home redirects back to the unjudged bout, cleared on verdict (or if both models failed →
  "nothing to judge" escape link). Banner prompts the user to judge.
- **Mobile standings** now horizontally scrollable (`overflow-x-auto` + `min-w-[44rem]`) — no cut columns.
- Backend 3 passed, frontend builds clean.

## 2026-06-23 — Live token streaming + UX polish ✅
Run flow changed from "wait→show" to "show→stream":
- `POST /runs` now creates PENDING response rows and returns instantly (no model call) → page
  navigates immediately (#1). Endpoint is sync again (no fan-out here).
- New `GET /responses/{id}/stream` (SSE): calls Groq with `stream:true` + `stream_options.include_usage`,
  relays token deltas, persists final output+usage on completion. Reload after done replays stored text.
- `provider.call_model` → `provider.stream_model` (async generator; no retry on a stream).
- Frontend run page rewritten: per-response `EventSource`, tokens append live with a blink caret (#2);
  fixed-height scroll boxes (`h-60/sm:h-72`, auto-scroll) so the page stays put (#3);
  responsive type/padding/grid + scaled VS medallion for mobile (#4).
- Tests rewritten for streaming (stream_model + SSE persist path): 3 passed. Frontend builds clean.
- Verified live: instant POST, real SSE deltas ("Blue"/" and"/" Red"/".").

## 2026-06-23 — Latency split into additive Compute + Overhead ✅
- Round-trip INCLUDES compute, so the two overlapped. Per Sa: changed card to show
  **Compute** + **Overhead** (= round-trip − compute = network + queue), non-overlapping/additive.
- Frontend-only (computed on card from existing latency_ms & compute_ms). Builds clean.

## 2026-06-23 — Dual latency display: Compute + Round-trip ✅
- Capture Groq `usage.total_time` → new `compute_ms` column (model/provider/schema/api type).
- Each response card now shows **Compute** (Groq's own figure, ≈ what their dashboard reports) ·
  **Round-trip** (our wall-clock = compute + queue + network) · Tokens.
- `smoke.db` migrated in place (ALTER ADD COLUMN) — vote history preserved.
- Backend 4 passed, frontend builds clean. Live: gpt-oss compute 205ms/rt 684ms, llama 89/545 (cold).
- Next: UI changes (TBD with Sa).

## 2026-06-23 — Latency: persistent keep-alive client ✅
- Root cause of "our latency ≫ Groq's": we opened a NEW https connection per bout → paid the
  ~100ms TLS handshake every time. Fixed with one app-wide `httpx.AsyncClient` via FastAPI
  `lifespan` (main.py) + `request.app.state.http` in runs.py.
- Measured: llama 202ms→94ms, gpt-oss 695ms→427ms (cold→warm). vs ~631ms before.
- Remaining floor = network RTT to Groq (~60-90ms, only deploy-region helps) + Groq `queue_time`
  (not in their reported compute time). Tests: 4 passed (test_runs now uses `with TestClient`).
- Optional next: surface Groq's `usage.total_time` in UI as "true compute" alongside round-trip.

## 2026-06-23 — Switched OpenRouter → Groq ✅ (much faster, still $0)
- Clean swap: `app/openrouter.py` → `app/provider.py` (Groq OpenAI-compatible endpoint), key is
  now `GROQ_API_KEY`, models `openai/gpt-oss-120b` + `llama-3.1-8b-instant` (both verified live).
- Live latency: gpt-oss-120b ~576ms, llama-3.1-8b ~268ms (was ~1800ms+ on OpenRouter).
- Groq free limits far higher (1k–14.4k req/day per model vs 50/day). Old file + test deleted,
  no lingering refs. **4 passed.**

## 2026-06-23 — Retry fix: stop burning the daily quota ✅
- Verified OpenRouter free tier = 20 req/min + **50 req/day, and failed attempts count**.
  The earlier 3× retry-on-429 was burning ~6 requests/bout → daily wall in ~8 bouts, plus 1.5s
  dead latency before failing.
- `call_model` now **retries only network/DNS blips (once)**; 429 and other errors fail fast
  with a clear message. ~3× less quota burn, no stall. Tests updated, **4 passed**.
- Decided: stay **strictly $0**. Evaluating a switch to **Groq** (faster + 1k–14.4k req/day free,
  OpenAI-compatible) — pending a Groq API key.

## 2026-06-23 — Resilience hardening (getaddrinfo / transient failures) ✅
- Diagnosed `[Errno 11002] getaddrinfo failed` = transient DNS blip on the client when calling
  OpenRouter (OpenRouter itself verified healthy: resolves + 200). Not a code bug.
- `call_model` now **retries up to 3× with exponential backoff** on transient failures
  (DNS/connect/timeout, 429, 5xx, 200-with-error-body) and **fails fast** on real errors
  (401 bad key, 400 bad model). Added `connect=10s` timeout so flaky networks fail fast.
  Error messages are now human-readable (e.g. "network/DNS error — check your connection").
- Fixed a test-isolation bug the new `.env` exposed: added `tests/conftest.py` pinning a clean
  sqlite DB before app import (env var beats `.env`). Suite: **4 passed**.
- Gotcha noted: a running `uvicorn` holds old code — restart (or use `--reload`) after edits.

## 2026-06-22 — Frontend visual identity: "Fight Card / Arena" ✅
- Reskinned all 3 pages from default-zinc to a deliberate **fight-poster** identity (user picked
  this direction over "Telemetry Bench" and "Quiet Lab Notebook").
- **Tokens** (in `globals.css` via Tailwind v4 `@theme`): canvas `#161310`, bone `#EDE6D6`,
  **red corner** `#D7263D` + **blue corner** `#2E6FB7` (the two justified accents — models really
  face off), gold `#E0A82E` reserved for verdicts + champion only. Type: **Anton** (display),
  **IBM Plex Sans** (body), **IBM Plex Mono** (all numerics) via `next/font/google`.
- **Signature**: VS medallion between the two corner cards on the run page + a rotated gold
  **WINNER stamp** that scale-ins when you call a winner. Boldness concentrated there.
- Run page: ringside `[card | VS | card]` for exactly 2 models, graceful grid fallback for N.
  Home = "build the bout"; History = "Standings" with the champ row in gold.
- Quality floor: responsive (cards stack on mobile), gold focus-visible outline, `prefers-reduced-
  motion` honored. `next build` passes — 5 routes, types valid.
- **Unverified**: live visual check against a running backend (data pages show loading/error
  states until backend + key are up). Logic untouched — only presentation changed.

## 2026-06-22 — Model swap + parser hardening ✅
- Free models 429 per-model; qwen-coder/qwen-next/llama-3.3 all throttled, **gpt-oss-20b had
  capacity** → model pair is now `google/gemma-4-31b-it:free` + `openai/gpt-oss-20b:free`.
- **Bug fixed**: OpenRouter sometimes returns HTTP 200 with an *error body* (no `choices`) on
  free tier — parser crashed with `'choices'`. Now surfaces the real message as an error row.
- Added `tests/test_openrouter.py` (success parse + error-body-200). Full suite: **3 passed**.
- 429s are inherent to free tier; UI shows them as error cards, run still completes.

## 2026-06-22 — Live smoke test PASSED ✅ (MVP working end-to-end)
- Real OpenRouter run: Gemma → "Hi there, hello!" (27 tok, 1814 ms). Qwen → live **429
  captured as error row, run still succeeded** — free-tier isolation proven for real.
- Vote 👍 stored; `/leaderboard` aggregates correctly (win %, votes, avg latency, avg tokens).
- **Port moved 8000 → 8002** (8000 = Sa's Django `linkedin`, 8001 = FIFA). `lib/api.ts` default
  + `.env.example` updated. `backend/.env` created (gitignored) with the key + sqlite url.
- App is functionally complete. Note: free models 429 often — that's expected, the UI shows it.

**Next (optional)**: README + deploy config (Vercel frontend, Railway backend); swap sqlite → Postgres for deploy.

## 2026-06-22 — Frontend built + builds clean ✅
**Done**
- Next.js (app router) + TypeScript strict + Tailwind v4, hand-written (no create-next-app, no shadcn).
- 3 pages: `/` (prompt + model checkboxes), `/runs/[id]` (side-by-side outputs, latency, tokens,
  👍/👎 vote), `/history` (leaderboard table). `lib/api.ts` typed client to the backend.
- Added backend `GET /models` so the model list has one source of truth.
- `next build` passes: types valid, all 4 routes compiled.

**Unproven**: live UX against a running backend + real OpenRouter key (needs both up together).

**Next**: README + deploy config (Vercel frontend, Railway backend), then a real end-to-end smoke test.

## 2026-06-22 — Backend scaffolded + tested ✅
**Done**
- Full backend built: `/health`, `POST /runs` (async fan-out), `GET /runs`, `GET /runs/{id}`,
  `PUT /responses/{id}/rating`, `GET /leaderboard`. SQLAlchemy models, Pydantic schemas,
  OpenRouter client, CORS, auto table-create.
- `tests/test_runs.py` passes (1/1): fan-out stores every model, a failing model → error row
  (not a 500), tokens captured, vote feeds leaderboard. Run on sqlite, no network/key needed.
- Added `.env.example`, `docker-compose.yml` (Postgres), `.gitignore`.
- **Verified free model IDs** from OpenRouter: no free Gemini currently → using free **Gemma**.
  Starter set: `google/gemma-4-31b-it:free`, `qwen/qwen3-next-80b-a3b-instruct:free`.

**Proven / unproven**
- Proven: all backend logic end-to-end (sqlite).
- Unproven: the real OpenRouter HTTP call — needs `OPENROUTER_API_KEY` + a live `POST /runs`.

**Open / to confirm**
- Vote shape: 👍/👎 is the working default — confirm or switch to 1–5 / pick-the-winner.

**Next**
1. Smoke-test a real run: add key to `.env`, `docker compose up -d`, hit `POST /runs`.
2. Frontend: prompt form → run page (side-by-side + vote) → history/leaderboard.
3. README + deploy config (Vercel frontend, Railway backend).

## Backlog (not now)
Auth, cost tracking (paid models), LLM-as-judge, deterministic metrics, multi-rater votes, charts.
