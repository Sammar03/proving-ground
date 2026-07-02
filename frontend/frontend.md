# frontend.md — Next.js UI

## Role
Presentation only. No business logic, no OpenRouter calls. Talks to the FastAPI backend
over REST. Never holds the OpenRouter key.

## Stack
Next.js (app router) · TypeScript strict · Tailwind · shadcn/ui.

## Pages
- `app/page.tsx` — **New comparison.** Prompt textarea + model checkboxes (list from backend
  or a shared config) → `POST /runs` → redirect to the run.
- `app/runs/[id]/page.tsx` — **Compare + vote.** Outputs side-by-side; each card shows output,
  latency, total tokens, and 👍/👎 buttons → `PUT /responses/{id}/rating`. Error rows render an
  error state, not a blank card.
- `app/history/page.tsx` — **Leaderboard + past runs.** Reads `GET /leaderboard`
  (model · votes · win % · avg latency · avg tokens) and a list of past runs.

## Data access
- `lib/api.ts` — one typed fetch wrapper to the backend base URL (`NEXT_PUBLIC_API_URL`).
- Types mirror the backend Pydantic schemas; keep them in sync (single source = backend).

## Conventions
- Server components for reads; client components only where interaction needs it (vote buttons, prompt form).
- shadcn for cards, buttons, inputs — don't hand-roll. Accessibility basics: semantic elements,
  keyboard-operable buttons, visible focus.
- No invented colors/fonts — use shadcn/Tailwind defaults until a design spec is given.

## Out of scope (for now)
Auth, multi-user, real-time streaming of outputs, charts. Add when asked.
