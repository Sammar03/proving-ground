"""Vercel Python entrypoint. Vercel serves the ASGI `app` exported here;
vercel.json rewrites every path to this function so FastAPI sees the real route."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))  # put backend/ on the path

from app.main import app  # noqa: E402

__all__ = ["app"]
