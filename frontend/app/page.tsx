"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const CORNERS = ["text-red", "text-blue"] as const;

export default function Home() {
  const router = useRouter();
  const [models, setModels] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(true); // gate: an unjudged bout must be finished first

  useEffect(() => {
    const pending = localStorage.getItem("pendingBout");
    if (pending) { router.replace(`/runs/${pending}`); return; }
    setBlocked(false);
    api.models()
      .then((m) => { setModels(m); setPicked(new Set(m)); })
      .catch((e) => setErr(String(e)));
  }, [router]);

  const toggle = (m: string) =>
    setPicked((p) => {
      const n = new Set(p);
      n.has(m) ? n.delete(m) : n.add(m);
      return n;
    });

  async function submit() {
    setErr(null);
    if (!prompt.trim() || picked.size === 0) return;
    setLoading(true);
    try {
      const run = await api.createRun(prompt, [...picked]);
      localStorage.setItem("pendingBout", String(run.id)); // gate until this bout is judged
      router.push(`/runs/${run.id}`);
    } catch (e) {
      setErr(String(e));
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter runs the bout; Shift+Enter keeps the newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  if (blocked) return <p className="font-mono text-sm text-ash">Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ash">Tonight&apos;s card</p>
        <h1 className="font-display text-4xl text-bone sm:text-6xl">
          Two models enter.<br />
          <span className="text-gold">You call the winner.</span>
        </h1>
      </header>

      <div className="space-y-3">
        <label htmlFor="prompt" className="sr-only">The prompt</label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a prompt — the same question goes to every fighter."
          className="h-32 w-full resize-none rounded-md border border-line bg-canvas-2 p-4 text-bone placeholder:text-ash/60 focus:border-gold sm:h-40"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={submit}
            disabled={loading || !prompt.trim() || picked.size === 0}
            className="font-display rounded-md bg-gold px-7 py-3 text-lg text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {loading ? "Ringing the bell…" : "Start the bout →"}
          </button>
          {err && <p className="font-mono text-sm text-red">{err}</p>}
        </div>
      </div>

      <div className="space-y-2 border-t border-line pt-5">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-ash">
          Fighters on the card
          <span className="ml-2 text-bone">{picked.size}/{models.length}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {models.map((m, i) => {
            const on = picked.has(m);
            const corner = CORNERS[i % CORNERS.length];
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(m)}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-sm transition-colors ${
                  on
                    ? "border-bone bg-canvas-2 text-bone"
                    : "border-line text-ash hover:border-ash"
                }`}
              >
                <span className={`text-base leading-none ${on ? corner : "text-line"}`}>●</span>
                {m}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
