"""End-to-end: POST creates PENDING rows; the /stream endpoint streams deltas, persists the
final result, and the vote then feeds the leaderboard. DB pinned by tests/conftest.py."""
import json

from fastapi.testclient import TestClient

from app.main import app
import app.routers.runs as runs_mod


async def _fake_stream(client, model, prompt):
    for tok in ("Hel", "lo"):
        yield {"delta": tok}
    yield {"done": True, "latency_ms": 12, "compute_ms": 5,
           "prompt_tokens": 1, "completion_tokens": 2, "total_tokens": 3}


def test_stream_persists_and_feeds_leaderboard(monkeypatch):
    monkeypatch.setattr(runs_mod, "stream_model", _fake_stream)
    with TestClient(app, headers={"Authorization": "Bearer test-token"}) as c:  # lifespan + auth
        run = c.post("/runs", json={"prompt": "hi", "models": ["a", "b"]}).json()
        assert len(run["responses"]) == 2
        assert all(r["output"] is None for r in run["responses"])   # created PENDING

        rid = run["responses"][0]["id"]
        chunks = []
        with c.stream("GET", f"/responses/{rid}/stream") as s:
            for line in s.iter_lines():
                if line.startswith("data:"):
                    chunks.append(json.loads(line[5:].strip()))
        assert "".join(ch["delta"] for ch in chunks if "delta" in ch) == "Hello"
        assert any(ch.get("done") for ch in chunks)

        got = {r["id"]: r for r in c.get(f"/runs/{run['id']}").json()["responses"]}
        assert got[rid]["output"] == "Hello"        # persisted on completion
        assert got[rid]["total_tokens"] == 3

        assert c.put(f"/responses/{rid}/rating", json={"rating": 1}).status_code == 200
        assert c.put(f"/responses/{rid}/rating", json={"rating": 0}).status_code == 409  # write-once
        lb = {row["model"]: row for row in c.get("/leaderboard").json()}
        assert lb["a"]["votes"] == 1
        assert lb["a"]["win_pct"] == 100.0


def test_auth_gate():
    with TestClient(app) as c:  # no default auth header
        assert c.get("/health").status_code == 200                    # open
        assert c.get("/leaderboard").status_code == 401               # gated, no token
        assert c.get("/runs").status_code == 401
        assert c.get("/leaderboard", headers={"Authorization": "Bearer wrong"}).status_code == 401
        assert c.get("/leaderboard", headers={"Authorization": "Bearer test-token"}).status_code == 200
