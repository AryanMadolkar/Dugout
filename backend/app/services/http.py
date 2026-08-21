from __future__ import annotations

import httpx

# Vercel injects proxy env vars without a scheme; httpx then fails protocol checks.
_CLIENT_KW = {"trust_env": False, "follow_redirects": True}


def _api_error(response: httpx.Response) -> str:
    status = response.status_code
    try:
        body = response.json()
        if isinstance(body, dict):
            err = body.get("error")
            if isinstance(err, dict):
                msg = str(err.get("message") or err.get("status") or err)
                return f"HTTP {status}: {msg}" if msg else f"HTTP {status}"
            if body.get("message"):
                return f"HTTP {status}: {body['message']}"
            return f"HTTP {status}: {body}"
    except Exception:
        pass
    text = response.text.strip()
    if text:
        return f"HTTP {status}: {text[:400]}"
    return f"HTTP {status}"


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
