"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

const CORNERS = [
  { dot: "text-red", edge: "border-t-red", label: "Red corner" },
  { dot: "text-blue", edge: "border-t-blue", label: "Blue corner" },
] as const;

type CardState = {
  id: number;
  model: string;
  text: string;
  status: "streaming" | "done" | "error";
  error: string | null;
  compute_ms: number | null;
  latency_ms: number | null;
  total_tokens: number | null;
  rating: number | null;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ash">{label}</span>
      <span className="font-mono text-sm text-bone">{value}</span>
    </div>
  );
}

function FighterCard({
  c,
  index,
  enter,
  canVote,
  onWinner,
}: {
  c: CardState;
  index: number;
  enter?: "left" | "right";
  canVote: boolean;
  onWinner: (id: number) => void;
}) {
  const corner = CORNERS[index % CORNERS.length];
  const enterClass = enter === "left" ? "enter-left" : enter === "right" ? "enter-right" : "";
  const overhead =
    c.latency_ms != null && c.compute_ms != null ? Math.max(0, c.latency_ms - c.compute_ms) : null;
  const streaming = c.status === "streaming";

  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [c.text]);

  return (
    <div
      className={`relative flex flex-col rounded-md border border-line border-t-4 ${corner.edge} bg-canvas-2 p-4 sm:p-5 ${enterClass} ${
        c.rating === 0 ? "opacity-55" : ""
      }`}
    >
      {c.rating === 1 && (
        <span className="stamp pointer-events-none absolute right-4 top-4 z-10 text-2xl text-gold">
          Winner
        </span>
      )}
      {c.rating === 0.5 && (
        <span className="stamp pointer-events-none absolute right-4 top-4 z-10 text-xl text-bone">
          Draw
        </span>
      )}

      <div className="flex items-center gap-2">
        <span className={`text-lg leading-none ${corner.dot}`}>●</span>
        <span className="font-display truncate text-lg text-bone sm:text-xl" title={c.model}>{c.model}</span>
      </div>
      <span className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ash">{corner.label}</span>

      {canVote && c.status === "done" && (
        <button
          onClick={() => onWinner(c.id)}
          className="font-mono mt-3 rounded-md border border-line px-4 py-2 text-xs uppercase tracking-widest text-ash transition-colors hover:border-gold hover:text-gold"
        >
          Winner
        </button>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-y border-line py-2.5">
        <Stat label="Compute" value={c.compute_ms != null ? `${c.compute_ms} ms` : "—"} />
        <Stat label="Overhead" value={overhead != null ? `${overhead} ms` : "—"} />
        <Stat label="Tokens" value={c.total_tokens != null ? `${c.total_tokens}` : "—"} />
      </div>

      <div ref={boxRef} className="mt-3 h-44 overflow-y-auto pr-1 sm:h-72">
        {c.status === "error" ? (
          <>
            <p className="font-display text-lg text-red">Did not answer</p>
            <p className="mt-1 font-mono text-xs leading-relaxed text-ash">{c.error}</p>
          </>
        ) : c.text ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-bone/90">
            {c.text}
            {streaming && <span className="ml-0.5 animate-pulse text-gold">▍</span>}
          </p>
        ) : streaming ? (
          <p className="font-mono text-xs text-ash">
            Generating<span className="animate-pulse">…</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const [prompt, setPrompt] = useState("");
  const [cards, setCards] = useState<CardState[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sources: EventSource[] = [];

    api.getRun(Number(id)).then((run) => {
      if (cancelled) return;
      setPrompt(run.prompt);
      setCards(run.responses.map((r) => ({
        id: r.id, model: r.model,
        text: r.output ?? "",
        status: r.error ? "error" : r.output != null ? "done" : "streaming",
        error: r.error, compute_ms: r.compute_ms, latency_ms: r.latency_ms,
        total_tokens: r.total_tokens, rating: r.rating,
      })));

      run.responses.forEach((r) => {
        if (r.error || r.output != null) return;
        const es = new EventSource(api.streamUrl(r.id));
        sources.push(es);
        es.onmessage = (e) => {
          const m = JSON.parse(e.data);
          setCards((cs) => cs.map((c) => {
            if (c.id !== r.id) return c;
            if (m.delta != null) return { ...c, text: c.text + m.delta };
            if (m.error != null) return { ...c, status: "error", error: m.error };
            if (m.done) return {
              ...c, status: "done",
              compute_ms: m.compute_ms ?? c.compute_ms,
              latency_ms: m.latency_ms ?? c.latency_ms,
              total_tokens: m.total_tokens ?? c.total_tokens,
            };
            return c;
          }));
          if (m.error != null || m.done) es.close();
        };
        es.onerror = () => {
          es.close();
          setCards((cs) => cs.map((c) =>
            c.id === r.id && c.status === "streaming"
              ? { ...c, status: "error", error: c.error ?? "stream interrupted" }
              : c,
          ));
        };
      });
    }).catch((e) => setErr(String(e)));

    return () => { cancelled = true; sources.forEach((s) => s.close()); };
  }, [id]);

  // verdict state
  const terminal = cards.length > 0 && cards.every((c) => c.status !== "streaming");
  const judgeable = cards.some((c) => c.status === "done");
  const decided = cards.length > 0 && cards.every((c) => c.rating != null);
  const canVote = terminal && judgeable && !decided;
  const canDraw = canVote && cards.every((c) => c.status === "done") && cards.length >= 2;
  const nothingToJudge = terminal && !judgeable;

  // release the "must judge" gate once there's a verdict (or nothing to judge)
  useEffect(() => {
    if (decided || nothingToJudge) localStorage.removeItem("pendingBout");
  }, [decided, nothingToJudge]);

  async function judge(winner: number | "draw") {
    const results = await Promise.all(
      cards.map((c) => {
        const rating = winner === "draw" ? 0.5 : c.id === winner ? 1 : 0;
        return api.rate(c.id, rating).then((u) => ({ id: c.id, rating: u.rating }));
      }),
    );
    setCards((cs) => cs.map((c) => {
      const u = results.find((x) => x.id === c.id);
      return u ? { ...c, rating: u.rating } : c;
    }));
  }

  if (err) return <p className="font-mono text-sm text-red">{err}</p>;
  if (cards.length === 0) return <p className="font-mono text-sm text-ash">Stepping into the ring…</p>;

  const ringside = cards.length === 2;

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ash">Tale of the tape</p>
        <h1 className="font-display text-3xl text-bone sm:text-4xl">Bout #{id}</h1>
        <p className="max-h-24 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-canvas-2 p-3 text-sm text-bone/90">
          {prompt}
        </p>
      </header>

      {canVote && (
        <p className="rounded-md border border-gold/40 bg-gold/5 px-4 py-3 font-mono text-xs uppercase tracking-widest text-gold">
          Judge this bout — pick a Winner{canDraw ? " or call a Draw" : ""} — to start a new one.
        </p>
      )}

      {ringside ? (
        <>
          <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-4">
            <FighterCard c={cards[0]} index={0} enter="left" canVote={canVote} onWinner={judge} />
            <div className="enter-vs hidden items-center justify-center md:flex md:py-10">
              {canDraw ? (
                <button
                  onClick={() => judge("draw")}
                  className="font-display flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold bg-canvas text-sm text-gold transition-colors hover:bg-gold hover:text-canvas"
                >
                  Draw
                </button>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold bg-canvas sm:h-16 sm:w-16">
                  <span className="font-display text-xl text-gold sm:text-2xl">vs</span>
                </div>
              )}
            </div>
            <FighterCard c={cards[1]} index={1} enter="right" canVote={canVote} onWinner={judge} />
          </div>
          {canDraw && (
            <div className="flex justify-center md:hidden">
              <button
                onClick={() => judge("draw")}
                className="font-mono rounded-md border border-gold px-6 py-2 text-xs uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-canvas"
              >
                Call a Draw
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((c, i) => (
              <FighterCard key={c.id} c={c} index={i} canVote={canVote} onWinner={judge} />
            ))}
          </div>
          {canDraw && (
            <div className="flex justify-center">
              <button
                onClick={() => judge("draw")}
                className="font-mono rounded-md border border-gold px-6 py-2 text-xs uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-canvas"
              >
                Call a Draw
              </button>
            </div>
          )}
        </>
      )}

      {nothingToJudge && (
        <p className="font-mono text-sm text-ash">
          Both models failed — nothing to judge.{" "}
          <Link href="/" className="text-gold hover:underline">Start over →</Link>
        </p>
      )}
    </div>
  );
}
