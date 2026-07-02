import secrets

from fastapi import Header, HTTPException, Query

from .config import settings


def require_token(
    authorization: str | None = Header(default=None),
    # EventSource can't set headers, so the SSE route accepts the token as ?token=… too.
    # ponytail: token in the query string lands in access logs; fine for one shared secret.
    token: str | None = Query(default=None),
) -> None:
    if not settings.app_token:
        raise HTTPException(503, "auth not configured — set APP_TOKEN")
    supplied = token or (authorization or "").removeprefix("Bearer ").strip()
    if not secrets.compare_digest(supplied, settings.app_token):
        raise HTTPException(401, "unauthorized")
