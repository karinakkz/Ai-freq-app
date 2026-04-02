import os
from pathlib import Path
import pytest
import requests


@pytest.fixture(scope="session")
def base_url() -> str:
    """Public preview base URL for API tests."""
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")

    if not url:
        frontend_env = Path("/app/frontend/.env")
        if frontend_env.exists():
            for line in frontend_env.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                if key in {"EXPO_PUBLIC_BACKEND_URL", "EXPO_BACKEND_URL"}:
                    url = value.strip().strip('"').strip("'")
                    if url:
                        break

    if not url:
        pytest.fail("EXPO_PUBLIC_BACKEND_URL (or EXPO_BACKEND_URL) is not set")
    return url.rstrip("/")


@pytest.fixture(scope="session")
def api_client() -> requests.Session:
    """Shared HTTP client for backend API tests."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
