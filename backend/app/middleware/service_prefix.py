from __future__ import annotations

from starlette.types import ASGIApp, Receive, Scope, Send


class ServicePrefixMiddleware:
    """Strip the public Vercel Services mount prefix before FastAPI route matching."""

    def __init__(self, app: ASGIApp, prefix: str) -> None:
        self.app = app
        self.prefix = prefix.rstrip("/") or prefix
        self.prefix_bytes = self.prefix.encode()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] in {"http", "websocket"}:
            path = scope.get("path", "")
            if path == self.prefix or path.startswith(f"{self.prefix}/"):
                scope = dict(scope)
                scope["path"] = path[len(self.prefix) :] or "/"
                scope["root_path"] = f"{scope.get('root_path', '')}{self.prefix}"
                raw_path = scope.get("raw_path")
                if isinstance(raw_path, bytes) and raw_path.startswith(self.prefix_bytes):
                    scope["raw_path"] = raw_path[len(self.prefix_bytes) :] or b"/"
        await self.app(scope, receive, send)
