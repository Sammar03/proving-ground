const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

export type Resp = {
  id: number;
  model: string;
  output: string | null;
  error: string | null;
  latency_ms: number | null;
  compute_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  rating: number | null;
  note: string | null;
};

export type Run = {
  id: number;
  prompt: string;
  created_at: string;
  responses: Resp[];
};

export type LeaderRow = {
  model: string;
  votes: number;
  wins: number;
  draws: number;
  win_pct: number | null;
  avg_latency_ms: number | null;
  avg_total_tokens: number | null;
};

export const TOKEN_KEY = "appToken";

export function getToken(): string {
  return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) ?? "" : "";
}

function authed(extra?: Record<string, string>): Record<string, string> {
  return { ...(extra ?? {}), Authorization: `Bearer ${getToken()}` };
}

async function j<T>(r: Response): Promise<T> {
  if (r.status === 401) {
    // token missing/rejected → drop it and bounce back to the lock screen
    localStorage.removeItem(TOKEN_KEY);
    location.reload();
    throw new Error("unauthorized");
  }
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export const api = {
  // Gate check: is this token accepted? Doesn't reload on failure (the lock screen needs the answer).
  verify: (t: string) => fetch(`${BASE}/models`, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.ok),
  models: () => fetch(`${BASE}/models`, { headers: authed() }).then(j<string[]>),
  createRun: (prompt: string, models: string[]) =>
    fetch(`${BASE}/runs`, { method: "POST", headers: authed(JSON_HEADERS), body: JSON.stringify({ prompt, models }) }).then(j<Run>),
  getRun: (id: number) => fetch(`${BASE}/runs/${id}`, { headers: authed() }).then(j<Run>),
  // EventSource can't send headers, so the token rides in the query string.
  streamUrl: (responseId: number) => `${BASE}/responses/${responseId}/stream?token=${encodeURIComponent(getToken())}`,
  rate: (id: number, rating: number) =>
    fetch(`${BASE}/responses/${id}/rating`, { method: "PUT", headers: authed(JSON_HEADERS), body: JSON.stringify({ rating }) }).then(j<Resp>),
  leaderboard: () => fetch(`${BASE}/leaderboard`, { headers: authed() }).then(j<LeaderRow[]>),
};
