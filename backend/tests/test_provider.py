import asyncio

import httpx

from app.provider import stream_model

SUCCESS_SSE = (
    'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n'
    'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n'
    'data: {"choices":[{"delta":{}}],"usage":{"total_time":0.05,"total_tokens":7}}\n\n'
    "data: [DONE]\n\n"
)


def _events(handler):
    async def run():
        out = []
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            async for ev in stream_model(c, "m", "hi"):
                out.append(ev)
        return out
    return asyncio.run(run())


def test_stream_yields_deltas_and_final_usage():
    events = _events(lambda req: httpx.Response(
        200, content=SUCCESS_SSE.encode(), headers={"content-type": "text/event-stream"}
    ))
    text = "".join(e["delta"] for e in events if "delta" in e)
    done = next(e for e in events if e.get("done"))
    assert text == "Hello"
    assert done["compute_ms"] == 50      # total_time 0.05s → 50ms
    assert done["total_tokens"] == 7


def test_stream_429_is_one_error_event():
    events = _events(lambda req: httpx.Response(429, json={"error": {"message": "rate limited"}}))
    assert len(events) == 1
    assert "429" in events[0]["error"]
