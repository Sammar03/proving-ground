"""Pin a clean throwaway sqlite DB BEFORE any app import. An env var beats the .env file
in pydantic-settings, so this overrides backend/.env regardless of test import order."""
import os
import pathlib
import tempfile

_db = pathlib.Path(tempfile.gettempdir()) / "pe_test.db"
_db.unlink(missing_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{_db}"
os.environ["APP_TOKEN"] = "test-token"  # auth is fail-closed; tests authenticate with this
