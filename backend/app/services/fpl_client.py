from typing import Any

from app.config import settings
from app.services.http import http_get

DEFAULT_FPL_API = "https://fantasy.premierleague.com/api"


def _base_url(raw: str | None) -> str:
    url = (raw or "").strip().rstrip("/")
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return DEFAULT_FPL_API


class FPLClient:
    def __init__(self, base_url: str | None = None, timeout: float = 30.0) -> None:
        self.base_url = _base_url(base_url or settings.fpl_api_base)
        self.timeout = timeout

    def _get(self, path: str) -> Any:
        url = f"{self.base_url}/{path.lstrip('/')}"
        headers = {
            "User-Agent": "AI-FPL-Manager/0.1 (https://github.com/AryanMadolkar/Dugout)",
            "Accept": "application/json",
        }
        return http_get(url, headers=headers, timeout=self.timeout).json()

    def bootstrap_static(self) -> dict[str, Any]:
        return self._get("bootstrap-static/")

    def fixtures(self) -> list[dict[str, Any]]:
        return self._get("fixtures/")

    def element_summary(self, player_id: int) -> dict[str, Any]:
        return self._get(f"element-summary/{player_id}/")
