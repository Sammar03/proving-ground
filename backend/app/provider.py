import json
import time

import httpx

from .config import settings

# Groq is OpenAI-compatible; same request/response shape as before.
URL = "https://api.groq.com/openai/v1/chat/completions"

# bound DNS/connect waits so a flaky network fails fast instead of hanging 60s
TIMEOUT = httpx.Timeout(60.0, connect=10.0)

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    """One keep-alive client per warm process. Lazy so it works on serverless
    (Vercel) with no lifespan hook, and still reuses the TLS connection when warm."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=TIMEOUT)
    return _client


async def stream_model(client: httpx.AsyncClient, model: str, prompt: str):
    """Stream one model. Yields event dicts and never raises:
      {"delta": "text"}   incremental token(s)
      {"error": "msg"}    failed (then stops)
      {"done": True, ...} final, with latency_ms/compute_ms/token counts

    No retry: a streamed connection can't be cleanly replayed, and 429 shouldn't burn quota."""
    started = time.perf_counter()
    usage = None
    body = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
        "stream_options": {"include_usage": True},
    }
    try:
        async with client.stream(
            "POST", URL,
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json=body, timeout=TIMEOUT,
        ) as r:
            if r.status_code == 429:
                yield {"error": "rate limited (HTTP 429) — Groq free tier; wait a moment or compare fewer models"}
                return
            if r.status_code >= 400:
                detail = (await r.aread()).decode("utf-8", "replace")[:200]
                yield {"error": f"HTTP {r.status_code}: {detail}"}
                return

            async for line in r.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                except ValueError:
                    continue
                if chunk.get("usage"):
                    usage = chunk["usage"]
                choices = chunk.get("choices") or []
                if choices:
                    delta = choices[0].get("delta", {}).get("content")
                    if delta:
                        yield {"delta": delta}

        u = usage or {}
        tt = u.get("total_time")
        yield {
            "done": True,
            "latency_ms": int((time.perf_counter() - started) * 1000),
            "compute_ms": round(tt * 1000) if tt is not None else None,
            "prompt_tokens": u.get("prompt_tokens"),
            "completion_tokens": u.get("completion_tokens"),
            "total_tokens": u.get("total_tokens"),
        }
    except httpx.TransportError as e:
        yield {"error": f"network/DNS error reaching Groq — check your connection ({e!s})"}
    except Exception as e:  # noqa: BLE001 — capture, don't crash the stream
        yield {"error": str(e)[:500]}
