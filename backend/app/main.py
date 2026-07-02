from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth import require_token
from .config import settings
from .db import Base, engine
from .models import Response, Run  # noqa: F401 — register tables before create_all
from .routers import ratings, runs

# ponytail: auto-create tables on boot; swap to Alembic when the schema starts churning
Base.metadata.create_all(engine)

# The HTTP client is created lazily in provider.get_client() (no lifespan) so this
# runs the same under uvicorn locally and as a Vercel serverless function.
app = FastAPI(title="Proving Ground")
app.add_middleware(
    CORSMiddleware,
    # prod: the deployed frontend (Vercel). Set FRONTEND_ORIGIN to its https URL.
    # rstrip: a trailing slash won't match the browser's Origin — tolerate it.
    allow_origins=[settings.frontend_origin.rstrip("/")],
    # dev: localhost + any private-LAN origin (so phones/other devices on the Wi-Fi work).
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|(192\.168|10|172\.(1[6-9]|2\d|3[01]))\.[\d.]+)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")  # open: platform health check, returns nothing sensitive
def health():
    return {"status": "ok"}


@app.get("/models", dependencies=[Depends(require_token)])
def models():
    return settings.models


# every data route is gated by the shared token
app.include_router(runs.router, dependencies=[Depends(require_token)])
app.include_router(ratings.router, dependencies=[Depends(require_token)])
