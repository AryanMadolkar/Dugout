"""Gemini-powered FPL advice — verdict and best picks. No OpenAI."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.models import Player
from app.services.gemini import gemini_generate_json
from app.services.ingestion import current_gameweek, sync_bootstrap_and_fixtures

POSITIONS = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}


def _ensure_players(db: Session) -> None:
    count = db.scalar(select(Player.id).limit(1))
    if count is not None:
        return
    sync_bootstrap_and_fixtures(db)
    db.commit()


def _player_brief(player: Player) -> dict[str, Any]:
    return {
        "id": player.id,
        "name": player.web_name,
        "club": player.team.short_name if player.team else "?",
        "position": POSITIONS.get(player.element_type, "?"),
        "price": round(player.now_cost / 10, 1),
        "form": player.form,
        "ppg": player.points_per_game,
        "ep_next": player.ep_next,
        "ownership": player.selected_by_percent,
        "total_points": player.total_points,
        "status": player.status,
    }


def _squad_context(squad: list[dict[str, Any]]) -> str:
    return json.dumps(squad, ensure_ascii=False)


def generate_verdict(db: Session, squad: list[dict[str, Any]], chip: str | None = None) -> dict[str, Any]:
    _ensure_players(db)
    gw = current_gameweek(db)
    gw_label = f"GW{gw.id}" if gw else "the next gameweek"

    owned_ids = {int(p["fplId"]) for p in squad if p.get("fplId") is not None}
    pool = db.scalars(
        select(Player)
        .options(joinedload(Player.team))
        .order_by(Player.ep_next.desc().nullslast())
        .limit(40)
    ).unique().all()
    candidates = [_player_brief(p) for p in pool if p.id not in owned_ids][:25]

    prompt = f"""You are an elite Fantasy Premier League analyst. Use ONLY the provided FPL data — do not invent players.
Season context: upcoming {gw_label}. Active chip for projection: {chip or "none"}.

Manager's current squad (JSON):
{_squad_context(squad)}

Transfer / differential candidates from FPL data (JSON):
{json.dumps(candidates, ensure_ascii=False)}

Return strict JSON:
{{
  "headline": "short verdict title",
  "summary": "2-3 sentences on the squad's outlook for {gw_label}",
  "action": "Hold" | "Transfer" | "Hit (-4)" | "Chip",
  "confidence": 0-100,
  "transfers": [{{"out": "web_name or null", "in": "web_name or null", "reason": "one line"}}],
  "captain": {{"name": "web_name", "reason": "one line"}},
  "risks": ["short risk 1", "short risk 2"],
  "source": "gemini"
}}
Prefer 0-2 transfers. If the squad is strong, action can be Hold with empty transfers.
Captain must be from the manager's squad when possible.
"""

    data = gemini_generate_json(prompt, temperature=0.35)
    if not isinstance(data, dict):
        raise RuntimeError("Gemini verdict was not a JSON object")
    data["source"] = "gemini"
    data["gameweek"] = gw.id if gw else None
    return data


def generate_ai_picks(
    db: Session,
    owned_ids: list[int],
    position: str | None = None,
) -> dict[str, Any]:
    _ensure_players(db)
    gw = current_gameweek(db)

    stmt = select(Player).options(joinedload(Player.team)).order_by(Player.ep_next.desc().nullslast())
    if position:
        pos_map = {name: code for code, name in POSITIONS.items()}
        et = pos_map.get(position.upper())
        if et:
            stmt = stmt.where(Player.element_type == et)
    pool = db.scalars(stmt.limit(60)).unique().all()
    owned = set(owned_ids)
    candidates = [_player_brief(p) for p in pool if p.id not in owned][:40]

    if not candidates:
        return {"picks": [], "summary": "No candidate players in database.", "source": "gemini"}

    prompt = f"""You are an elite Fantasy Premier League analyst powered by Gemini.
Pick the best AVAILABLE transfers / targets for the next 4 gameweeks from the candidate list only.
Do NOT recommend players already owned (owned ids: {owned_ids}).
Do NOT invent players or prices — use the JSON only.

Candidates:
{json.dumps(candidates, ensure_ascii=False)}

Return strict JSON:
{{
  "summary": "one sentence on the market",
  "picks": [
    {{
      "id": 123,
      "name": "web_name",
      "club": "short",
      "position": "GKP|DEF|MID|FWD",
      "price": 7.5,
      "form": 0.0,
      "ownership": 10.0,
      "next4Xp": 24.0,
      "rating": 85,
      "tag": "RECOMMENDED|DIFFERENTIAL|VALUE|MUST HAVE|FIXTURE SWING",
      "reason": "short why"
    }}
  ],
  "source": "gemini"
}}
Return 8-15 picks ranked best first. rating 1-99. next4Xp is your estimate for next 4 GWs.
"""

    data = gemini_generate_json(prompt, temperature=0.3)
    if not isinstance(data, dict):
        raise RuntimeError("Gemini picks were not a JSON object")

    # Re-attach club colours / validate ids against candidates
    by_id = {c["id"]: c for c in candidates}
    cleaned: list[dict[str, Any]] = []
    for raw in data.get("picks") or []:
        try:
            pid = int(raw.get("id"))
        except (TypeError, ValueError):
            continue
        base = by_id.get(pid)
        if not base:
            continue
        cleaned.append(
            {
                "id": pid,
                "name": base["name"],
                "club": base["club"],
                "position": base["position"],
                "price": float(raw.get("price") or base["price"] or 0),
                "form": float(raw.get("form") if raw.get("form") is not None else base["form"] or 0),
                "ownership": float(
                    raw.get("ownership") if raw.get("ownership") is not None else base["ownership"] or 0
                ),
                "next4Xp": float(raw.get("next4Xp") or (base.get("ep_next") or 0) * 4),
                "rating": int(min(99, max(1, int(raw.get("rating") or 70)))),
                "tag": str(raw.get("tag") or "RECOMMENDED"),
                "reason": str(raw.get("reason") or ""),
            }
        )

    return {
        "summary": str(data.get("summary") or "Gemini ranked targets from current FPL data."),
        "picks": cleaned,
        "source": "gemini",
        "gameweek": gw.id if gw else None,
    }
