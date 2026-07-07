import os
import pathlib
import tempfile

_db = pathlib.Path(tempfile.gettempdir()) / "pe_test.db"
_db.unlink(missing_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{_db}"
os.environ["APP_TOKEN"] = "test-token"  # auth is fail-closed; tests authenticate with this
