import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import SessionLocal, get_db
from ..models import Response, Run
from ..provider import get_client, stream_model
from ..schemas import LeaderRow, RunCreate, RunOut

router = APIRouter()


@router.post("/runs", response_model=RunOut)
def create_run(body: RunCreate, db: Session = Depends(get_db)):
    # Create the run + one PENDING response row per model and return immediately.
    # The models aren't called here — the frontend streams each one via /stream below.
    if not body.prompt.strip():
        raise HTTPException(400, "prompt is empty")
    models = body.models or settings.models
    run = Run(prompt=body.prompt, responses=[Response(model=m) for m in models])
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def _persist(response_id: int, **fields) -> None:
    """Write the final stream result to the row in its own short-lived session."""
    db = SessionLocal()
    try:
        resp = db.get(Response, response_id)
        for k, v in fields.items():
            setattr(resp, k, v)
        db.commit()
    finally:
        db.close()


@router.get("/responses/{response_id}/stream")
async def stream_response(response_id: int):
    # read what we need and release the session before streaming (no lock held during the stream)
    db = SessionLocal()
    try:
        resp = db.get(Response, response_id)
        if not resp:
            raise HTTPException(404, "response not found")
        model, prompt = resp.model, db.get(Run, resp.run_id).prompt
        done_already = resp.output is not None or resp.error is not None
        stored = resp.output
    finally:
        db.close()

    def sse(obj: dict) -> str:
        return f"data: {json.dumps(obj)}\n\n"

    async def gen():
        if done_already:  # reload after completion → replay stored text, don't re-call Groq
            if stored:
                yield sse({"delta": stored})
            yield sse({"done": True})
            return

        parts: list[str] = []
        async for ev in stream_model(get_client(), model, prompt):
            if "delta" in ev:
                parts.append(ev["delta"])
                yield sse({"delta": ev["delta"]})
            elif "error" in ev:
                _persist(response_id, error=ev["error"])
                yield sse({"error": ev["error"]})
                return
            elif ev.get("done"):
                _persist(response_id, output="".join(parts), latency_ms=ev["latency_ms"],
                         compute_ms=ev["compute_ms"], prompt_tokens=ev["prompt_tokens"],
                         completion_tokens=ev["completion_tokens"], total_tokens=ev["total_tokens"])
                yield sse({"done": True, "compute_ms": ev["compute_ms"],
                           "latency_ms": ev["latency_ms"], "total_tokens": ev["total_tokens"]})

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.get("/runs", response_model=list[RunOut])
def list_runs(db: Session = Depends(get_db)):
    return db.scalars(select(Run).order_by(Run.id.desc())).all()


@router.get("/runs/{run_id}", response_model=RunOut)
def get_run(run_id: int, db: Session = Depends(get_db)):
    run = db.get(Run, run_id)
    if not run:
        raise HTTPException(404, "run not found")
    return run


@router.get("/leaderboard", response_model=list[LeaderRow])
def leaderboard(db: Session = Depends(get_db)):
    R = Response
    rows = db.execute(
        select(
            R.model,
            func.count(R.rating).label("votes"),
            func.sum(case((R.rating == 1, 1), else_=0)).label("wins"),
            func.sum(case((R.rating == 0.5, 1), else_=0)).label("draws"),
            func.avg(R.rating).label("win"),
            func.avg(R.latency_ms).label("lat"),
            func.avg(R.total_tokens).label("tok"),
        ).group_by(R.model)
    ).all()
    return [
        LeaderRow(
            model=model,
            votes=votes or 0,
            wins=int(wins or 0),
            draws=int(draws or 0),
            win_pct=round(win * 100, 1) if win is not None else None,
            avg_latency_ms=round(lat, 1) if lat is not None else None,
            avg_total_tokens=round(tok, 1) if tok is not None else None,
        )
        for model, votes, wins, draws, win, lat, tok in rows
    ]
