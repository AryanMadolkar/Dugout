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


def _heuristic_verdict(
    squad: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
    chip: str | None,
    gw_id: int | None,
) -> dict[str, Any]:
    """Local fallback when Gemini is blocked (403) or unreachable."""
    starters = [p for p in squad if str(p.get("slot") or "starter") != "bench"]
    pool = starters or list(squad)
    by_xp = sorted(pool, key=lambda p: float(p.get("xp") or 0), reverse=True)
    captain = by_xp[0] if by_xp else None
    weakest = sorted(pool, key=lambda p: (float(p.get("form") or 0), float(p.get("xp") or 0)))[0] if pool else None
    target = candidates[0] if candidates else None

    transfers: list[dict[str, Any]] = []
    action = "Hold"
    if weakest and target and float(target.get("ep_next") or 0) > float(weakest.get("xp") or 0) + 0.4:
        action = "Transfer"
        transfers = [
            {
                "out": weakest.get("name"),
                "in": target.get("name"),
                "reason": f"{target.get('name')} has stronger upcoming xP than {weakest.get('name')}.",
            }
        ]

    if chip and chip.lower() in {"triple captain", "tc"} and captain:
        action = "Chip"
        headline = f"TC lean: {captain.get('name')}"
        summary = (
            f"Gemini is unavailable, so Dugout used FPL form/xP. "
            f"{captain.get('name')} leads your XI on projected points for a Triple Captain."
        )
    elif action == "Transfer" and weakest and target:
        headline = f"Consider {weakest.get('name')} → {target.get('name')}"
        summary = (
            "Gemini is unavailable, so this is a Dugout heuristic from FPL ep_next / form. "
            "Confirm fixtures before hitting."
        )
    else:
        headline = "Hold — squad looks set"
        summary = (
            "Gemini is unavailable, so Dugout ranked your scanned squad on xP/form. "
            "No urgent move jumps out from the data alone."
        )

    risks = ["Gemini API unavailable — advice is heuristic only."]
    if chip:
        risks.append(f"Active chip projection: {chip}.")

    return {
        "headline": headline,
        "summary": summary,
        "action": action,
        "confidence": 45,
        "transfers": transfers,
        "captain": (
            {"name": str(captain.get("name")), "reason": "Highest projected points in your XI."}
            if captain
            else None
        ),
        "risks": risks,
        "source": "heuristic",
        "gameweek": gw_id,
    }


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

    try:
        data = gemini_generate_json(prompt, temperature=0.35)
        if not isinstance(data, dict):
            raise RuntimeError("Gemini verdict was not a JSON object")
        data["source"] = "gemini"
        data["gameweek"] = gw.id if gw else None
        return data
    except Exception:
        return _heuristic_verdict(squad, candidates, chip, gw.id if gw else None)


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


def _score_owned(p: dict[str, Any]) -> float:
    return float(p.get("form") or 0) * 0.45 + float(p.get("xp") or 0) * 0.55


def _heuristic_transfers(
    squad: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
    gw_id: int | None,
) -> dict[str, Any]:
    owned_names = {str(p.get("name")) for p in squad}
    by_pos: dict[str, list[dict[str, Any]]] = {"GKP": [], "DEF": [], "MID": [], "FWD": []}
    for p in squad:
        pos = str(p.get("position") or "")
        if pos in by_pos:
            by_pos[pos].append(p)

    cand_by_pos: dict[str, list[dict[str, Any]]] = {"GKP": [], "DEF": [], "MID": [], "FWD": []}
    for c in candidates:
        pos = str(c.get("position") or "")
        if pos in cand_by_pos and c.get("name") not in owned_names:
            cand_by_pos[pos].append(c)

    moves: list[dict[str, Any]] = []
    used_out: set[str] = set()
    used_in: set[str] = set()

    for pos in ("FWD", "MID", "DEF", "GKP"):
        owned = sorted(by_pos[pos], key=_score_owned)
        pool = sorted(
            cand_by_pos[pos],
            key=lambda c: float(c.get("ep_next") or 0),
            reverse=True,
        )
        if not owned or not pool:
            continue
        out_p = owned[0]
        out_name = str(out_p.get("name"))
        if out_name in used_out:
            continue
        out_price = float(out_p.get("price") or 0)
        out_xp = float(out_p.get("xp") or 0)
        best: dict[str, Any] | None = None
        for c in pool:
            in_name = str(c.get("name"))
            if in_name in used_in:
                continue
            in_price = float(c.get("price") or 0)
            in_xp = float(c.get("ep_next") or 0)
            # Prefer upgrades / lateral moves within 1.5m and clearly better xP
            if in_price > out_price + 1.5:
                continue
            if in_xp < out_xp + 0.3:
                continue
            best = c
            break
        if not best:
            continue
        in_name = str(best.get("name"))
        in_price = float(best.get("price") or 0)
        in_xp = float(best.get("ep_next") or 0)
        delta = round(in_price - out_price, 1)
        moves.append(
            {
                "out": out_name,
                "in": in_name,
                "outClub": out_p.get("club"),
                "inClub": best.get("club"),
                "position": pos,
                "outPrice": out_price,
                "inPrice": in_price,
                "priceDelta": delta,
                "outXp": out_xp,
                "inXp": in_xp,
                "reason": (
                    f"{in_name} ({best.get('club')}) projects {in_xp:.1f} xP vs "
                    f"{out_name}'s {out_xp:.1f} · £{delta:+.1f}m"
                ),
            }
        )
        used_out.add(out_name)
        used_in.add(in_name)
        if len(moves) >= 3:
            break

    if not moves:
        return {
            "headline": "No urgent transfers",
            "summary": "Your squad looks balanced on FPL form/xP. Hold unless you need to free cash or chase a differential.",
            "action": "Hold",
            "confidence": 50,
            "transfers": [],
            "source": "heuristic",
            "gameweek": gw_id,
        }

    top = moves[0]
    return {
        "headline": f"{top['out']} → {top['in']}",
        "summary": f"Top {len(moves)} move{'s' if len(moves) != 1 else ''} by position xP/form. Gemini unavailable — Dugout heuristic only.",
        "action": "Transfer",
        "confidence": 48,
        "transfers": moves,
        "source": "heuristic",
        "gameweek": gw_id,
    }


def generate_transfer_advice(
    db: Session,
    squad: list[dict[str, Any]],
    chip: str | None = None,
) -> dict[str, Any]:
    """Transfer-focused advice for the Transfers page (Gemini with heuristic fallback)."""
    _ensure_players(db)
    gw = current_gameweek(db)
    gw_label = f"GW{gw.id}" if gw else "the next gameweek"

    owned_ids = {int(p["fplId"]) for p in squad if p.get("fplId") is not None}
    pool = (
        db.scalars(
            select(Player)
            .options(joinedload(Player.team))
            .order_by(Player.ep_next.desc().nullslast())
            .limit(80)
        )
        .unique()
        .all()
    )
    candidates = [_player_brief(p) for p in pool if p.id not in owned_ids][:40]

    prompt = f"""You are an elite Fantasy Premier League transfer analyst.
Upcoming {gw_label}. Active chip: {chip or "none"}.
Recommend 1-3 concrete transfers for THIS manager only. Same-position swaps preferred. Do not invent players.

Squad JSON:
{_squad_context(squad)}

Candidates JSON (must pick "in" from these):
{json.dumps(candidates, ensure_ascii=False)}

Return strict JSON:
{{
  "headline": "short title e.g. Maguire → Gabriel",
  "summary": "2 sentences on transfer priority for {gw_label}",
  "action": "Hold" | "Transfer" | "Hit (-4)",
  "confidence": 0-100,
  "transfers": [
    {{
      "out": "web_name",
      "in": "web_name",
      "outClub": "ABC",
      "inClub": "XYZ",
      "position": "DEF",
      "outPrice": 5.5,
      "inPrice": 6.0,
      "priceDelta": 0.5,
      "outXp": 3.2,
      "inXp": 4.8,
      "reason": "one line why"
    }}
  ],
  "source": "gemini"
}}
If no good moves, action Hold and empty transfers. Max 3 transfers. Prefer highest value upgrades.
"""

    try:
        data = gemini_generate_json(prompt, temperature=0.3)
        if not isinstance(data, dict):
            raise RuntimeError("Gemini transfers were not a JSON object")
        transfers = []
        for raw in data.get("transfers") or []:
            if not isinstance(raw, dict):
                continue
            transfers.append(
                {
                    "out": raw.get("out"),
                    "in": raw.get("in"),
                    "outClub": raw.get("outClub"),
                    "inClub": raw.get("inClub"),
                    "position": raw.get("position"),
                    "outPrice": raw.get("outPrice"),
                    "inPrice": raw.get("inPrice"),
                    "priceDelta": raw.get("priceDelta"),
                    "outXp": raw.get("outXp"),
                    "inXp": raw.get("inXp"),
                    "reason": str(raw.get("reason") or ""),
                }
            )
        data["transfers"] = transfers
        data["source"] = "gemini"
        data["gameweek"] = gw.id if gw else None
        data["headline"] = str(data.get("headline") or "Transfer advice")
        data["summary"] = str(data.get("summary") or "")
        data["action"] = str(data.get("action") or ("Transfer" if transfers else "Hold"))
        data["confidence"] = int(data.get("confidence") or 55)
        return data
    except Exception:
        return _heuristic_transfers(squad, candidates, gw.id if gw else None)
