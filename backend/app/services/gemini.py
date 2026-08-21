"""Shared Gemini generateContent helpers (text / JSON). Vision stays in scan.py."""

from __future__ import annotations

import json
import re
from typing import Any

from app.config import settings
from app.services.http import http_post

GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.5-flash-lite",
]


def _auth_attempts(api_key: str) -> list[tuple[dict[str, str], dict[str, str] | None]]:
    bearer = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    api_key_header = {"x-goog-api-key": api_key, "Content-Type": "application/json"}
    query_key = ({"Content-Type": "application/json"}, {"key": api_key})
    if api_key.startswith("ya29."):
        return [(bearer, None)]
    return [(api_key_header, None), query_key]


def _extract_text(body: dict[str, Any]) -> str:
    candidates = body.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")
    parts = candidates[0].get("content", {}).get("parts") or []
    if not parts:
        raise RuntimeError("Gemini returned empty content")
    return str(parts[0].get("text") or "")


def _parse_json(text: str) -> Any:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def gemini_generate_json(prompt: str, *, temperature: float = 0.3) -> Any:
    """Call Gemini generateContent and parse JSON response. Gemini only — no OpenAI."""
    api_key = settings.gemini_api_key
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it in Vercel → Settings → Environment Variables."
        )

    configured = settings.gemini_vision_model or GEMINI_MODELS[0]
    models = [configured, *GEMINI_MODELS]
    seen: set[str] = set()
    last_error = "Gemini request failed"

    for model in models:
        if model in seen:
            continue
        seen.add(model)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": temperature,
            },
        }
        for headers, params in _auth_attempts(api_key):
            try:
                response = http_post(url, headers=headers, json=payload, params=params, timeout=75.0)
                return _parse_json(_extract_text(response.json()))
            except Exception as exc:  # noqa: BLE001 — try next auth/model
                last_error = str(exc)
                continue

    raise RuntimeError(last_error)
