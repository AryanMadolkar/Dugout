"""FPL entry data: bank, rank, mini-league, GW review, multi-GW transfer plan."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.models import Player
from app.services.fpl_client import FPLClient
from app.services.ingestion import current_gameweek

POSITIONS = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}


def _player_name(db: Session, element_id: int) -> str:
    p = db.get(Player, element_id)
    return p.web_name if p else f"#{element_id}"


def _player_brief_db(player: Player) -> dict[str, Any]:
    return {
        "id": player.id,
        "name": player.web_name,
        "club": player.team.short_name if player.team else "?",
        "position": POSITIONS.get(player.element_type, "?"),
        "price": round(player.now_cost / 10, 1),
        "ep_next": float(player.ep_next or player.points_per_game or 0),
        "form": float(player.form or 0),
    }


def estimate_free_transfers(history: dict[str, Any], current_gw: int) -> int:
    """Estimate FT from FPL history (1 base, +1 per unused GW, max 2)."""
    rows = history.get("current") or []
    if not rows:
        return 1
    prev = [r for r in rows if int(r.get("event") or 0) < current_gw]
    if not prev:
        return 1
    last = prev[-1]
    transfers = int(last.get("event_transfers") or 0)
    if transfers == 0:
        # Likely rolled — check GW before
        if len(prev) >= 2 and int(prev[-2].get("event_transfers") or 0) == 0:
            return 2
        return 1
    return 1


def fetch_entry_summary(entry_id: int, current_gw: int | None = None) -> dict[str, Any]:
    client = FPLClient()
    entry = client.entry(entry_id)
    history = client.entry_history(entry_id)

    bank = round(float(entry.get("last_deadline_bank") or 0) / 10, 1)
    value = round(float(entry.get("last_deadline_value") or 0) / 10, 1)
    rank = int(entry.get("summary_overall_rank") or 0) or None
    gw = current_gw or int(entry.get("current_event") or 1)
    ft = estimate_free_transfers(history, gw)

    leagues = entry.get("leagues") or {}
    classic = leagues.get("classic") or []
    default_league = classic[0] if classic else None

    return {
        "entryId": entry_id,
        "name": entry.get("name"),
        "bank": bank,
        "teamValue": value,
        "rank": rank,
        "freeTransfers": ft,
        "currentGameweek": gw,
        "defaultLeagueId": default_league.get("id") if default_league else None,
        "defaultLeagueName": default_league.get("name") if default_league else None,
    }


def fetch_entry_leagues(entry_id: int) -> dict[str, Any]:
    """Classic mini-leagues the manager has joined."""
    client = FPLClient()
    entry = client.entry(entry_id)
    classic = (entry.get("leagues") or {}).get("classic") or []
    leagues = [
        {
            "id": int(lg.get("id") or 0),
            "name": lg.get("name") or "League",
            "shortName": lg.get("short_name"),
            "rank": int(lg.get("rank") or 0) or None,
            "totalManagers": int(lg.get("rank_count") or 0) or None,
        }
        for lg in classic
        if lg.get("id")
    ]
    return {"entryId": entry_id, "leagues": leagues}


def fetch_league_analysis(entry_id: int, league_id: int | None = None) -> dict[str, Any]:
    client = FPLClient()
    entry = client.entry(entry_id)
    rank = int(entry.get("summary_overall_rank") or 0)

    leagues = (entry.get("leagues") or {}).get("classic") or []
    lid = league_id
    league_name = None
    if lid is None and leagues:
        lid = leagues[0].get("id")
        league_name = leagues[0].get("name")
    elif lid:
        for lg in leagues:
            if lg.get("id") == lid:
                league_name = lg.get("name")
                break

    if not lid:
        return {
            "yourRank": rank,
            "rivalRank": None,
            "leagueName": None,
            "rivalAsset": None,
            "yourEdge": None,
            "capChance": None,
            "rivals": [],
        }

    standings = client.league_standings(int(lid))
    results = standings.get("standings") or {}
    rows = results.get("results") or []

    you = next((r for r in rows if int(r.get("entry") or 0) == entry_id), None)
    your_league_rank = int(you.get("rank") or 0) if you else None

    rival = None
    for r in rows:
        eid = int(r.get("entry") or 0)
        if eid != entry_id:
            rival = r
            break

    rival_rank = int(rival.get("rank") or 0) if rival else None
    rival_name = (rival.get("player_name") if rival else None) or "Rival"

    return {
        "yourRank": rank,
        "yourLeagueRank": your_league_rank,
        "rivalRank": rival_rank,
        "rivalName": rival_name,
        "leagueName": league_name or results.get("league", {}).get("name"),
        "leagueId": lid,
        "rivals": [
            {
                "name": r.get("player_name"),
                "rank": r.get("rank"),
                "total": r.get("total"),
                "entry": r.get("entry"),
            }
            for r in rows[:10]
        ],
    }


def build_gw_review(db: Session, entry_id: int, gameweek: int) -> dict[str, Any]:
    client = FPLClient()
    picks_data = client.entry_picks(entry_id, gameweek)
    history = client.entry_history(entry_id)
    gw_rows = {int(r["event"]): r for r in (history.get("current") or []) if r.get("event")}

    gw_row = gw_rows.get(gameweek)
    if not gw_row:
        raise ValueError(f"No finished data for GW{gameweek}")

    picks = picks_data.get("picks") or []
    active_chip = picks_data.get("active_chip")
    auto_subs = picks_data.get("automatic_subs") or []

    captain_id: int | None = None
    vice_id: int | None = None
    starter_ids: list[int] = []
    bench_ids: list[int] = []
    for p in picks:
        eid = int(p.get("element"))
        pos = int(p.get("position"))
        if pos <= 11:
            starter_ids.append(eid)
            if p.get("is_captain"):
                captain_id = eid
            if p.get("is_vice_captain"):
                vice_id = eid
        else:
            bench_ids.append(eid)

    # Points from element-summary for that GW
    def gw_points(element_id: int) -> int:
        try:
            summary = client.element_summary(element_id)
            for h in summary.get("history") or []:
                if int(h.get("round") or 0) == gameweek:
                    return int(h.get("total_points") or 0)
        except Exception:
            pass
        return 0

    captain_pts = gw_points(captain_id) if captain_id else 0
    captain_name = _player_name(db, captain_id) if captain_id else "—"

    # Best alternative captain among starters
    alt_cap = None
    alt_pts = 0
    for eid in starter_ids:
        if eid == captain_id:
            continue
        pts = gw_points(eid)
        if pts > alt_pts:
            alt_pts = pts
            alt_cap = eid
    captain_delta = captain_pts - alt_pts if captain_id else 0

    # Weakest starter by points
    starter_scores = [(eid, gw_points(eid)) for eid in starter_ids]
    worst = min(starter_scores, key=lambda x: x[1], default=(None, 0))
    worst_name = _player_name(db, worst[0]) if worst[0] else "—"

    bench_pts = sum(gw_points(eid) for eid in bench_ids)
    best_bench = max((gw_points(eid) for eid in bench_ids), default=0)
    bench_delta = best_bench - worst[1] if bench_ids else 0

    total_pts = int(gw_row.get("points") or 0)
    avg = int(gw_row.get("average_entry_score") or 0) if "average_entry_score" in gw_row else 0

    decision_quality = min(99, max(40, 70 + captain_delta + min(0, bench_delta)))
    if total_pts >= avg + 10:
        grade = "A"
    elif total_pts >= avg:
        grade = "A-"
    elif total_pts >= avg - 8:
        grade = "B+"
    else:
        grade = "B"

    transfer_cost = int(gw_row.get("event_transfers_cost") or 0)
    transfers_made = int(gw_row.get("event_transfers") or 0)
    transfer_delta = 2.0 if transfers_made > 0 and total_pts > avg else -1.0 if transfer_cost > 0 else 0.0

    return {
        "gameweek": gameweek,
        "grade": grade,
        "decisionQuality": decision_quality,
        "totalPoints": total_pts,
        "averageScore": avg,
        "captainDelta": round(captain_delta, 1),
        "transferDelta": round(transfer_delta, 1),
        "benchDelta": round(bench_delta, 1),
        "bestDecision": f"{captain_name} captain ({captain_pts} pts)",
        "worstDecision": f"Starting {_player_name(db, worst[0])} ({worst[1]} pts)",
        "captain": captain_name,
        "viceCaptain": _player_name(db, vice_id) if vice_id else None,
        "activeChip": active_chip,
        "autoSubs": len(auto_subs),
        "transfersMade": transfers_made,
        "hitCost": transfer_cost,
        "source": "fpl",
    }


def build_multi_gw_transfer_plan(
    db: Session,
    squad: list[dict[str, Any]],
    bank: float,
    free_transfers: int,
    horizon: int = 6,
) -> dict[str, Any]:
    gw = current_gameweek(db)
    current_gw = gw.id if gw else 1

    owned_ids = {int(p["fplId"]) for p in squad if p.get("fplId") is not None}
    owned_by_pos: dict[str, list[dict[str, Any]]] = {"GKP": [], "DEF": [], "MID": [], "FWD": []}
    for p in squad:
        pos = str(p.get("position") or "")
        if pos in owned_by_pos:
            owned_by_pos[pos].append(p)

    pool = db.scalars(
        select(Player).options(joinedload(Player.team)).order_by(Player.ep_next.desc().nullslast()).limit(120)
    ).unique().all()
    candidates = [_player_brief_db(p) for p in pool if p.id not in owned_ids]

    steps: list[dict[str, Any]] = []
    running_bank = bank
    ft = free_transfers
    total_gain = 0.0
    simulated_owned = {int(p["fplId"]) for p in squad if p.get("fplId")}

    for offset in range(horizon):
        gwn = current_gw + offset
        if ft < 1:
            steps.append(
                {
                    "gameweek": gwn,
                    "action": "ROLL",
                    "move": None,
                    "projectedGain": 0,
                    "bankAfter": round(running_bank, 1),
                    "freeTransfersAfter": min(2, ft + 1),
                    "reason": "No free transfer — banking for next week.",
                }
            )
            ft = min(2, ft + 1)
            continue

        # Find best affordable transfer
        best_move = None
        best_gain = 0.0
        for pos in ("FWD", "MID", "DEF", "GKP"):
            owned = owned_by_pos.get(pos) or []
            owned_in_sim = [p for p in owned if p.get("fplId") in simulated_owned]
            if not owned_in_sim:
                continue
            out_p = min(owned_in_sim, key=lambda p: float(p.get("xp") or 0))
            out_price = float(out_p.get("price") or 0)
            out_xp = float(out_p.get("xp") or 0)
            out_id = int(out_p.get("fplId") or 0)

            for c in candidates:
                if c["position"] != pos:
                    continue
                if c["id"] in simulated_owned:
                    continue
                in_price = float(c["price"])
                if in_price > out_price + running_bank + 0.1:
                    continue
                in_xp = float(c["ep_next"])
                gain = in_xp - out_xp
                if gain > best_gain + 0.25:
                    best_gain = gain
                    best_move = {
                        "out": out_p.get("name"),
                        "in": c["name"],
                        "outClub": out_p.get("club"),
                        "inClub": c["club"],
                        "position": pos,
                        "outPrice": out_price,
                        "inPrice": in_price,
                        "priceDelta": round(in_price - out_price, 1),
                        "outXp": out_xp,
                        "inXp": in_xp,
                        "reason": (
                            f"{c['name']} projects {in_xp:.1f} xP vs {out_p.get('name')}'s {out_xp:.1f} "
                            f"for GW{gwn}+."
                        ),
                        "outId": out_id,
                        "inId": c["id"],
                    }

        if best_move and best_gain >= 0.35:
            running_bank -= float(best_move["priceDelta"])
            simulated_owned.discard(best_move["outId"])
            simulated_owned.add(best_move["inId"])
            # Update owned list for next iterations
            for p in owned_by_pos.get(best_move["position"], []):
                if p.get("fplId") == best_move["outId"]:
                    p["fplId"] = best_move["inId"]
                    p["name"] = best_move["in"]
                    p["price"] = best_move["inPrice"]
                    p["xp"] = best_move["inXp"]
                    break
            total_gain += best_gain
            steps.append(
                {
                    "gameweek": gwn,
                    "action": "TRANSFER",
                    "move": {k: v for k, v in best_move.items() if k not in ("outId", "inId")},
                    "projectedGain": round(best_gain, 1),
                    "bankAfter": round(running_bank, 1),
                    "freeTransfersAfter": 0,
                    "reason": best_move["reason"],
                }
            )
            ft = 0
        else:
            steps.append(
                {
                    "gameweek": gwn,
                    "action": "ROLL",
                    "move": None,
                    "projectedGain": 0,
                    "bankAfter": round(running_bank, 1),
                    "freeTransfersAfter": min(2, ft),
                    "reason": "No move clears the xP threshold — roll.",
                }
            )
            ft = min(2, ft + 1)

    wc_window = current_gw + 4
    return {
        "steps": steps,
        "totalGain4Gw": round(sum(s["projectedGain"] for s in steps[:4]), 1),
        "totalGainHorizon": round(total_gain, 1),
        "wildcardWindow": wc_window,
        "source": "optimizer",
    }
