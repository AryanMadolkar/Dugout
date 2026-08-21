from __future__ import annotations

import base64
import io
import json
import os
import re
from dataclasses import dataclass
from typing import Any

from PIL import Image
from rapidfuzz import fuzz, process
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.db.models import Fixture, Player, Team
from app.services.ingestion import current_gameweek, sync_bootstrap_and_fixtures

POSITIONS = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}
ROW_ORDER = ["GKP", "DEF", "MID", "FWD"]
ROW_ALIASES = {
    "GK": "GKP",
    "G": "GKP",
    "GOALKEEPER": "GKP",
    "DEFENDER": "DEF",
    "D": "DEF",
    "MIDFIELDER": "MID",
    "M": "MID",
    "CM": "MID",
    "FORWARD": "FWD",
    "STRIKER": "FWD",
    "ST": "FWD",
    "F": "FWD",
    "ATT": "FWD",
    "ATTACKER": "FWD",
    "FW": "FWD",
}


def _normalize_pitch_row(row: str | None, position: str) -> str:
    if not row:
        return position if position in ROW_ORDER else "MID"
    key = str(row).strip().upper().replace(" ", "")
    mapped = ROW_ALIASES.get(key, key)
    if mapped in ROW_ORDER:
        return mapped
    return position if position in ROW_ORDER else "MID"


@dataclass
class RawDetected:
    name: str
    slot: str  # starter | bench
    row: str | None
    is_captain: bool
    is_vice: bool
    confidence: float


def _ensure_players(db: Session) -> None:
    count = db.scalar(select(Player.id).limit(1))
    if count is None:
        sync_bootstrap_and_fixtures(db)
        db.commit()


def _player_index(db: Session) -> tuple[list[Player], dict[str, Player]]:
    players = list(db.scalars(select(Player).options(joinedload(Player.team))).all())
    index: dict[str, Player] = {}
    for p in players:
        index[p.web_name.lower()] = p
        index[p.second_name.lower()] = p
        full = f"{p.first_name} {p.second_name}".strip().lower()
        if full:
            index[full] = p
    return players, index


def _match_name(name: str, players: list[Player]) -> tuple[Player | None, float]:
    cleaned = name.strip()
    if not cleaned or len(cleaned) < 2:
        return None, 0.0
    choices = {}
    for p in players:
        choices[p.web_name] = p
        choices[p.second_name] = p
        choices[f"{p.first_name} {p.second_name}"] = p
    result = process.extractOne(cleaned, choices.keys(), scorer=fuzz.WRatio)
    if not result:
        return None, 0.0
    matched_name, score, _ = result
    if score < 78:
        return None, score
    return choices[matched_name], score


def _next_opponent(db: Session, team_id: int, gw_id: int | None) -> tuple[str, bool, int | None]:
    if not gw_id:
        return "—", True, None
    fixture = db.scalar(
        select(Fixture).where(
            Fixture.event == gw_id,
            (Fixture.team_h_id == team_id) | (Fixture.team_a_id == team_id),
        )
    )
    if not fixture:
        return "—", True, None
    if fixture.team_h_id == team_id:
        opp = db.get(Team, fixture.team_a_id)
        return (opp.short_name if opp else "—"), True, fixture.team_h_difficulty
    opp = db.get(Team, fixture.team_h_id)
    return (opp.short_name if opp else "—"), False, fixture.team_a_difficulty


def _next_fixtures(db: Session, team_id: int, from_gw: int | None, limit: int = 3) -> list[dict[str, Any]]:
    if not from_gw:
        return []
    fixtures = db.scalars(
        select(Fixture)
        .where(Fixture.event >= from_gw, (Fixture.team_h_id == team_id) | (Fixture.team_a_id == team_id))
        .order_by(Fixture.event, Fixture.kickoff_time)
        .limit(limit)
    ).all()
    out = []
    for f in fixtures:
        if f.team_h_id == team_id:
            opp = db.get(Team, f.team_a_id)
            out.append({"opp": opp.short_name if opp else "?", "home": True, "fdr": f.team_h_difficulty or 3})
        else:
            opp = db.get(Team, f.team_h_id)
            out.append({"opp": opp.short_name if opp else "?", "home": False, "fdr": f.team_a_difficulty or 3})
    return out


def _club_color(team: Team | None) -> str:
    if not team:
        return "#888888"
    palette = {
        "ARS": "#EF0107", "AVL": "#670E36", "BOU": "#DA291C", "BRE": "#E30613", "BHA": "#0057B8",
        "CHE": "#034694", "CRY": "#1B458F", "EVE": "#003399", "FUL": "#000000", "IPS": "#0033A0",
        "LEI": "#003090", "LIV": "#C8102E", "MCI": "#6CABDD", "MUN": "#DA291C", "NEW": "#241F20",
        "NFO": "#DD0000", "SOU": "#D71920", "TOT": "#132257", "WHU": "#7A263A", "WOL": "#FDB913", "BUR": "#6C1D45",
    }
    return palette.get(team.short_name, "#888888")


def enrich_player(
    db: Session,
    player: Player,
    *,
    slot: str,
    row: str | None,
    is_captain: bool,
    is_vice: bool,
    confidence: float,
    raw_name: str,
) -> dict[str, Any]:
    gw = current_gameweek(db)
    gw_id = gw.id if gw else None
    opp, home, _ = _next_opponent(db, player.team_id, gw_id)
    pos = POSITIONS.get(player.element_type, "MID")
    pitch_row = _normalize_pitch_row(row, pos)
    return {
        "id": str(player.id),
        "fpl_id": player.id,
        "name": player.web_name,
        "initials": player.web_name[:3].upper(),
        "club": player.team.short_name if player.team else "?",
        "clubColor": _club_color(player.team),
        "position": pos,
        "price": round(player.now_cost / 10, 1),
        "opponent": opp,
        "home": home,
        "xp": float(player.ep_next or player.points_per_game or 0),
        "form": float(player.form or 0),
        "ppg": float(player.points_per_game or 0),
        "ownership": float(player.selected_by_percent or 0),
        "isCaptain": is_captain,
        "isVice": is_vice,
        "slot": slot,
        "row": pitch_row if slot == "starter" else pos,
        "confidence": round(confidence, 1),
        "rawName": raw_name,
        "nextFixtures": _next_fixtures(db, player.team_id, gw_id),
    }


SCAN_PROMPT = """Extract Fantasy Premier League squad data from this screenshot.
Return strict JSON, no markdown:
{
  "formation": "3-4-3",
  "starters": [{"name": "exact FPL web name as shown", "row": "GKP|DEF|MID|FWD", "is_captain": false, "is_vice": false, "confidence": 0.0-1.0}],
  "bench": [{"name": "exact name", "row": "GKP|DEF|MID|FWD", "confidence": 0.0-1.0}],
  "chips": {
    "playing": null,
    "status": {
      "Wildcard": "unknown",
      "Free Hit": "unknown",
      "Bench Boost": "unknown",
      "Triple Captain": "unknown"
    }
  }
}
Rules:
- Include ONLY players clearly shown (starting XI + bench, max 15). Do NOT invent players.
- Use FPL-style short names (e.g. Haaland, M.Salah, Gabriel).
- Mark captain/vice if armband visible (C/V).
- bench = substitute row below the pitch.
- chips.playing: if a chip is clearly active / played for this gameweek in the UI (banner, selected chip, "Triple Captain" active, etc.), set to exactly one of "Wildcard"|"Free Hit"|"Bench Boost"|"Triple Captain", else null. Only ONE chip can be active per GW.
- chips.status: "used" ONLY if the UI clearly shows the chip was already played / spent this season (e.g. "Played", used badge, crossed-out after use). "available" if clearly still usable. Otherwise "unknown".
- CRITICAL: "Unavailable" / greyed / locked / disabled for this gameweek does NOT mean used — leave status as "unknown" (do not set "used"). Many chips show unavailable simply because they are not selected for this GW.
"""


def _clean_json_text(content: str) -> str:
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text).strip()
        text = re.sub(r"\s*```$", "", text).strip()
    return text


def _image_to_b64(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.convert("RGB").save(buf, format="JPEG", quality=90)
    return base64.b64encode(buf.getvalue()).decode()


CHIP_NAMES = ("Wildcard", "Free Hit", "Bench Boost", "Triple Captain")


def _normalize_chips(raw: Any) -> dict[str, Any]:
    status = {name: "unknown" for name in CHIP_NAMES}
    playing: str | None = None
    if isinstance(raw, dict):
        raw_status = raw.get("status") if isinstance(raw.get("status"), dict) else {}
        for name in CHIP_NAMES:
            val = str(raw_status.get(name) or "unknown").lower().strip()
            # "unavailable" / locked / disabled ≠ used (FPL greys chips that are merely not selected).
            if val in ("unavailable", "locked", "disabled", "inactive", "not available"):
                status[name] = "unknown"
            elif val in ("used", "spent", "played", "already played"):
                status[name] = "used"
            elif val in ("available", "unused", "ready", "active"):
                status[name] = "available"
            else:
                status[name] = "unknown"
        play = raw.get("playing") or raw.get("active") or raw.get("active_this_gw")
        if isinstance(play, str) and play in CHIP_NAMES:
            playing = play
    return {"playing": playing, "status": status}


def _parse_vision_payload(content: str) -> tuple[list[RawDetected], str | None, dict[str, Any]]:
    text = _clean_json_text(content)
    data = json.loads(text)
    detected: list[RawDetected] = []
    for item in data.get("starters", []):
        detected.append(
            RawDetected(
                name=str(item.get("name", "")),
                slot="starter",
                row=item.get("row"),
                is_captain=bool(item.get("is_captain")),
                is_vice=bool(item.get("is_vice")),
                confidence=float(item.get("confidence", 0.85)),
            )
        )
    for item in data.get("bench", []):
        detected.append(
            RawDetected(
                name=str(item.get("name", "")),
                slot="bench",
                row=item.get("row"),
                is_captain=False,
                is_vice=False,
                confidence=float(item.get("confidence", 0.8)),
            )
        )
    return detected, data.get("formation"), _normalize_chips(data.get("chips"))


def _gemini_auth_attempts(api_key: str) -> list[tuple[dict[str, str], dict[str, str] | None]]:
    """Auth for generativelanguage.googleapis.com generateContent.

    AI Studio auth keys (AQ.*) and standard keys (AIza*) must use x-goog-api-key
    or ?key= — Bearer is only for OAuth access tokens (ya29.*).
    """
    bearer = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    api_key_header = {"x-goog-api-key": api_key, "Content-Type": "application/json"}
    query_key = ({"Content-Type": "application/json"}, {"key": api_key})

    if api_key.startswith("ya29."):
        return [(bearer, None)]

    return [(api_key_header, None), query_key]


def _gemini_request(
    image: Image.Image, api_key: str, model: str
) -> tuple[list[RawDetected], str | None, dict[str, Any]]:
    from app.services.http import http_post

    b64 = _image_to_b64(image)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": SCAN_PROMPT},
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1,
        },
    }

    last_error = "unknown error"
    for headers, params in _gemini_auth_attempts(api_key):
        try:
            response = http_post(url, headers=headers, json=payload, params=params, timeout=60.0)
            body = response.json()
            candidates = body.get("candidates") or []
            if not candidates:
                last_error = "Gemini returned no candidates"
                continue
            parts = candidates[0].get("content", {}).get("parts") or []
            if not parts:
                last_error = "Gemini returned empty content"
                continue
            text = parts[0].get("text", "")
            return _parse_vision_payload(text)
        except RuntimeError as exc:
            last_error = str(exc)
            continue

    raise RuntimeError(last_error)


GEMINI_VISION_MODELS = [
    "gemini-2.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.5-flash-lite",
]


def _detect_with_gemini(image: Image.Image) -> tuple[list[RawDetected], str | None, dict[str, Any]]:
    empty_chips = _normalize_chips(None)
    if not settings.gemini_api_key:
        return [], None, empty_chips

    configured = settings.gemini_vision_model or GEMINI_VISION_MODELS[0]
    models = [configured, *GEMINI_VISION_MODELS]
    seen: set[str] = set()
    last_error = "Gemini request failed"
    for model in models:
        if model in seen:
            continue
        seen.add(model)
        try:
            return _gemini_request(image, settings.gemini_api_key, model)
        except RuntimeError as exc:
            last_error = str(exc)

    raise RuntimeError(last_error)


def _detect_with_openai(image: Image.Image) -> tuple[list[RawDetected], str | None]:
    if not settings.openai_api_key:
        return [], None
    from app.services.http import http_post

    b64 = _image_to_b64(image)

    response = http_post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {settings.openai_api_key}"},
        json={
            "model": settings.openai_vision_model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": SCAN_PROMPT},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                    ],
                }
            ],
            "max_tokens": 1500,
        },
        timeout=60.0,
    )
    content = response.json()["choices"][0]["message"]["content"]
    return _parse_vision_payload(content)


def _detect_with_ocr(image: Image.Image) -> list[RawDetected]:
    try:
        import pytesseract
    except ImportError as exc:
        raise RuntimeError("OCR unavailable: install pytesseract") from exc

    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    height = image.height
    mid_y = height * 0.72

    lines: dict[tuple[int, int], list[str]] = {}
    for i, word in enumerate(data["text"]):
        w = (word or "").strip()
        if not w or len(w) < 2:
            continue
        conf = int(float(data["conf"][i])) if data["conf"][i] != "-1" else 0
        if conf < 40:
            continue
        x, y, bw, bh = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        key = (y // 20, x // 80)
        lines.setdefault(key, []).append(w)

    detected: list[RawDetected] = []
    for (y_bucket, _), words in sorted(lines.items()):
        phrase = " ".join(words)
        y_approx = y_bucket * 20
        slot = "bench" if y_approx > mid_y else "starter"
        detected.append(
            RawDetected(
                name=phrase,
                slot=slot,
                row=None,
                is_captain="(C)" in phrase or phrase.endswith(" C"),
                is_vice="(V)" in phrase or phrase.endswith(" V"),
                confidence=0.65,
            )
        )
    return detected


def _friendly_gemini_error(exc: Exception) -> str:
    msg = str(exc).strip() or "unknown error"
    lower = msg.lower()
    if "403" in msg or "permission_denied" in lower or "denied access" in lower:
        return (
            "Gemini denied the request (403). On Vercel, set GEMINI_API_KEY to a new key from "
            "https://aistudio.google.com/apikey (AQ. auth key). If the project shows denied/unavailable, "
            "create a new AI Studio project or enable billing, then redeploy."
        )
    if "401" in msg or "unauthenticated" in lower or "invalid_api_key" in lower:
        return (
            "Gemini API key rejected (401). Update GEMINI_API_KEY in Vercel with a fresh key from "
            "https://aistudio.google.com/apikey and redeploy."
        )
    return f"Gemini: {msg}"


def scan_squad_image(db: Session, image_bytes: bytes) -> dict[str, Any]:
    _ensure_players(db)
    players, _ = _player_index(db)
    if not players:
        raise RuntimeError("No FPL players in database. Run ingest first.")

    image = Image.open(io.BytesIO(image_bytes))
    formation: str | None = None
    warnings: list[str] = []
    unmatched: list[str] = []

    raw_detected: list[RawDetected] = []
    scan_method = "ocr"
    vision_errors: list[str] = []
    chips: dict[str, Any] = _normalize_chips(None)

    if settings.gemini_api_key:
        try:
            raw_detected, formation, chips = _detect_with_gemini(image)
            if raw_detected:
                scan_method = "gemini"
            else:
                vision_errors.append("Gemini returned no players.")
        except Exception as exc:
            vision_errors.append(_friendly_gemini_error(exc))

    if not raw_detected:
        if not settings.gemini_api_key:
            raise RuntimeError(
                "Vision scan is not configured. Add GEMINI_API_KEY in Vercel → Settings → Environment Variables."
            )
        if os.getenv("VERCEL") or vision_errors:
            detail = " ".join(vision_errors) if vision_errors else "Vision scan returned no players."
            raise RuntimeError(detail)
        try:
            raw_detected = _detect_with_ocr(image)
            scan_method = "ocr"
        except Exception as exc:
            raise RuntimeError(f"Scan failed. {exc}") from exc

    starters: list[dict[str, Any]] = []
    bench: list[dict[str, Any]] = []
    used_ids: set[int] = set()

    for raw in raw_detected:
        name = raw.name.replace("(C)", "").replace("(V)", "").strip()
        player, score = _match_name(name, players)
        if not player or player.id in used_ids:
            if score < 78:
                unmatched.append(raw.name)
            continue
        used_ids.add(player.id)
        enriched = enrich_player(
            db,
            player,
            slot=raw.slot,
            row=raw.row,
            is_captain=raw.is_captain,
            is_vice=raw.is_vice,
            confidence=min(raw.confidence, score / 100),
            raw_name=raw.name,
        )
        if raw.slot == "bench":
            bench.append(enriched)
        else:
            starters.append(enriched)

    # Assign pitch rows for starters missing / invalid row
    row_counts = {r: 0 for r in ROW_ORDER}
    for s in starters:
        pos = s.get("position") if s.get("position") in ROW_ORDER else "MID"
        s["row"] = _normalize_pitch_row(s.get("row"), pos)
        row_counts[s["row"]] = row_counts.get(s["row"], 0) + 1

    if len(starters) + len(bench) == 0:
        raise RuntimeError("No FPL players matched from screenshot. Try a clearer image.")

    if len(starters) != 11:
        warnings.append(f"Detected {len(starters)} starters (expected 11). Review on confirm screen.")
    if len(bench) != 4:
        warnings.append(f"Detected {len(bench)} bench players (expected 4). Review on confirm screen.")

    if chips.get("playing"):
        warnings.append(f"Detected active chip this GW: {chips['playing']}.")
    known = [f"{k}={v}" for k, v in (chips.get("status") or {}).items() if v != "unknown"]
    if known:
        warnings.append("Chip status from screenshot: " + ", ".join(known))

    return {
        "formation": formation or _infer_formation(starters),
        "starters": starters,
        "bench": bench,
        "unmatched": unmatched,
        "warnings": warnings,
        "scanMethod": scan_method,
        "chips": chips,
    }


def _infer_formation(starters: list[dict[str, Any]]) -> str:
    counts = {r: 0 for r in ["GKP", "DEF", "MID", "FWD"]}
    for s in starters:
        row = s.get("row") or s.get("position")
        if row in counts:
            counts[row] += 1
    if counts["GKP"] == 0:
        return "unknown"
    return f"{counts['DEF']}-{counts['MID']}-{counts['FWD']}"
