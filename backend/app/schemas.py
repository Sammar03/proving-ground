from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RunCreate(BaseModel):
    prompt: str
    models: list[str] | None = None  # None → use config default set


class ResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    model: str
    output: str | None
    error: str | None
    latency_ms: int | None
    compute_ms: int | None
    prompt_tokens: int | None
    completion_tokens: int | None
    total_tokens: int | None
    rating: float | None
    note: str | None


class RunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    prompt: str
    created_at: datetime
    responses: list[ResponseOut]


class RatingIn(BaseModel):
    rating: float  # 1=win, 0.5=draw, 0=loss
    note: str | None = None


class LeaderRow(BaseModel):
    model: str
    votes: int
    wins: int
    draws: int
    win_pct: float | None
    avg_latency_ms: float | None
    avg_total_tokens: float | None
