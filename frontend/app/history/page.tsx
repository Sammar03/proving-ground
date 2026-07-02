"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type LeaderRow } from "@/lib/api";

export default function History() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.leaderboard().then(setRows).catch((e) => setErr(String(e)));
  }, []);

  if (err) return <p className="font-mono text-sm text-red">{err}</p>;

  const ranked = rows.slice().sort((a, b) => (b.win_pct ?? -1) - (a.win_pct ?? -1));

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ash">The record</p>
        <h1 className="font-display text-4xl text-bone sm:text-6xl">Standings</h1>
        <p className="max-w-xl text-ash">
          Every fighter, ranked by how often you called them the winner.
        </p>
      </header>

      {ranked.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-canvas-2 p-10 text-center">
          <p className="font-display text-2xl text-bone">No bouts judged yet</p>
          <p className="mt-2 text-sm text-ash">
            Run a comparison and call some winners to build the record.
          </p>
          <Link
            href="/"
            className="font-mono mt-5 inline-block text-xs uppercase tracking-widest text-gold hover:underline"
          >
            Start the first bout →
          </Link>
        </div>
      ) : (
        <ol className="space-y-2">
          {ranked.map((r, i) => {
            const champ = i === 0 && (r.win_pct ?? 0) > 0;
            return (
              <li
                key={r.model}
                className={`rounded-md border border-line bg-canvas-2 p-4 ${
                  champ ? "border-l-2 border-l-gold bg-gold/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-display text-2xl ${champ ? "text-gold" : "text-ash"}`}>
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 font-mono text-sm text-bone">
                    {champ && <span className="text-gold" aria-label="Champion">★</span>}
                    <span className="truncate" title={r.model}>{r.model}</span>
                  </span>
                  <span className={`ml-auto font-display text-2xl ${champ ? "text-gold" : "text-bone"}`}>
                    {r.win_pct != null ? `${r.win_pct}%` : "—"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 font-mono text-xs text-ash">
                  <span><span className="text-bone">{r.wins}</span> wins</span>
                  <span><span className="text-bone">{r.draws}</span> draws</span>
                  <span><span className="text-bone">{r.avg_latency_ms ?? "—"}</span> ms avg</span>
                  <span>
                    <span className="text-bone">
                      {r.avg_total_tokens != null ? Math.round(r.avg_total_tokens) : "—"}
                    </span>{" "}
                    tok avg
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
