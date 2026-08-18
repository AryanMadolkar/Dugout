from __future__ import annotations

import httpx

# Vercel (and other hosts) inject proxy env vars without a scheme.
# httpx then raises: Request URL is missing an 'http://' or 'https://' protocol.
_CLIENT_KW = {"trust_env": False, "follow_redirects": True}


def http_get(url: str, *, headers: dict[str, str] | None = None, timeout: float = 30.0) -> httpx.Response:
    with httpx.Client(timeout=timeout, headers=headers, **_CLIENT_KW) as client:
        response = client.get(url)
        response.raise_for_status()
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
        response.raise_for_status()
        return response
