from typing import Any

import httpx

from app.config import settings


class FPLClient:
    def __init__(self, base_url: str | None = None, timeout: float = 30.0) -> None:
        self.base_url = (base_url or settings.fpl_api_base).rstrip("/")
        self.timeout = timeout

    def _get(self, path: str) -> Any:
        url = f"{self.base_url}/{path.lstrip('/')}"
        headers = {
            "User-Agent": "AI-FPL-Manager/0.1 (local development)",
            "Accept": "application/json",
        }
        with httpx.Client(timeout=self.timeout, headers=headers, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            return response.json()

    def bootstrap_static(self) -> dict[str, Any]:
        return self._get("bootstrap-static/")

    def fixtures(self) -> list[dict[str, Any]]:
        return self._get("fixtures/")

    def element_summary(self, player_id: int) -> dict[str, Any]:
        return self._get(f"element-summary/{player_id}/")
