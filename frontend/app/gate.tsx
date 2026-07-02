"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api, getToken, TOKEN_KEY } from "@/lib/api";

// Blocks the whole app until a valid token is entered. Data lives behind the API,
// which 401s without the token — this is the lock screen for it.
export default function Gate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "open">("checking");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (!t) { setStatus("locked"); return; }
    api.verify(t).then((ok) => setStatus(ok ? "open" : "locked"));
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setErr(false);
    setBusy(true);
    const ok = await api.verify(pass).catch(() => false);
    setBusy(false);
    if (ok) {
      localStorage.setItem(TOKEN_KEY, pass);
      setStatus("open");
    } else {
      setErr(true);
      setPass("");
    }
  }

  if (status === "checking") return null;
  if (status === "open") return <>{children}</>;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <form onSubmit={unlock} className="w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-ash">Members only</p>
          <h1 className="font-display text-4xl text-bone">Show your pass</h1>
        </div>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoFocus
          placeholder="Access token"
          className="w-full rounded-md border border-line bg-canvas-2 p-3 font-mono text-sm text-bone placeholder:text-ash/60 focus:border-gold"
        />
        <p className="font-mono text-xs leading-relaxed text-ash">
          Hint: the narrator&apos;s alter ego in Fight Club. One word, no space, and he&apos;s SCREAMING it.
        </p>
        <button
          type="submit"
          disabled={busy || !pass}
          className="font-display w-full rounded-md bg-gold px-6 py-3 text-lg text-canvas transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          {busy ? "Checking…" : "Enter"}
        </button>
        {err && <p className="font-mono text-sm text-red">Wrong token.</p>}
      </form>
    </div>
  );
}
