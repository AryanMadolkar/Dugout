from __future__ import annotations

import httpx

# Vercel injects proxy env vars without a scheme; httpx then fails protocol checks.
_CLIENT_KW = {"trust_env": False, "follow_redirects": True}


def _api_error(response: httpx.Response) -> str:
    try:
        body = response.json()
        if isinstance(body, dict):
            err = body.get("error")
            if isinstance(err, dict):
                return str(err.get("message") or err)
            return str(body)
    except Exception:
        pass
    text = response.text.strip()
    return text[:400] if text else f"HTTP {response.status_code}"


def http_get(url: str, *, headers: dict[str, str] | None = None, timeout: float = 30.0) -> httpx.Response:
    with httpx.Client(timeout=timeout, headers=headers, **_CLIENT_KW) as client:
        response = client.get(url)
        if response.is_error:
            raise RuntimeError(_api_error(response))
        return response


def http_post(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    json: object | None = None,
    params: dict[str, str] | None = None,
    timeout: float = 60.0,
) -> httpx.Response:
    with httpx.Client(timeout=timeout, headers=headers, **_CLIENT_KW) as client:
        response = client.post(url, json=json, params=params)
        if response.is_error:
            raise RuntimeError(_api_error(response))
        return response
