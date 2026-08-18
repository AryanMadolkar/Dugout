from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Fixture, Gameweek, IngestRun, Player, Team
from app.services.fpl_client import FPLClient


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _f(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _i(value: Any, default: int = 0) -> int:
    if value in (None, ""):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def upsert_teams(db: Session, teams: list[dict[str, Any]]) -> int:
    count = 0
    for raw in teams:
        team = db.get(Team, raw["id"])
        if team is None:
            team = Team(id=raw["id"])
            db.add(team)
        team.name = raw["name"]
        team.short_name = raw["short_name"]
        team.code = raw.get("code")
        team.strength = raw.get("strength")
        team.strength_attack_home = raw.get("strength_attack_home")
        team.strength_attack_away = raw.get("strength_attack_away")
        team.strength_defence_home = raw.get("strength_defence_home")
        team.strength_defence_away = raw.get("strength_defence_away")
        team.pulse_id = raw.get("pulse_id")
        count += 1
    db.flush()
    return count


def upsert_gameweeks(db: Session, events: list[dict[str, Any]]) -> int:
    count = 0
    for raw in events:
        gw = db.get(Gameweek, raw["id"])
        if gw is None:
            gw = Gameweek(id=raw["id"])
            db.add(gw)
        gw.name = raw["name"]
        gw.deadline_time = _parse_dt(raw.get("deadline_time"))
        gw.finished = bool(raw.get("finished"))
        gw.is_current = bool(raw.get("is_current"))
        gw.is_next = bool(raw.get("is_next"))
        gw.is_previous = bool(raw.get("is_previous"))
        gw.average_entry_score = raw.get("average_entry_score")
        gw.highest_score = raw.get("highest_score")
        gw.most_selected = raw.get("most_selected")
        gw.most_captained = raw.get("most_captained")
        gw.most_transferred_in = raw.get("most_transferred_in")
        count += 1
    db.flush()
    return count


def upsert_players(db: Session, elements: list[dict[str, Any]]) -> int:
    count = 0
    for raw in elements:
        player = db.get(Player, raw["id"])
        if player is None:
            player = Player(id=raw["id"], first_name="", second_name="", web_name="", team_id=raw["team"], element_type=1, now_cost=0)
            db.add(player)
        player.code = raw.get("code")
        player.first_name = raw.get("first_name") or ""
        player.second_name = raw.get("second_name") or ""
        player.web_name = raw.get("web_name") or ""
        player.team_id = raw["team"]
        player.element_type = raw["element_type"]
        player.now_cost = _i(raw.get("now_cost"))
        player.status = raw.get("status") or "a"
        player.chance_of_playing_this_round = raw.get("chance_of_playing_this_round")
        player.chance_of_playing_next_round = raw.get("chance_of_playing_next_round")
        player.news = raw.get("news") or None
        player.news_added = _parse_dt(raw.get("news_added"))
        player.selected_by_percent = _f(raw.get("selected_by_percent"))
        player.form = _f(raw.get("form"))
        player.points_per_game = _f(raw.get("points_per_game"))
        player.total_points = _i(raw.get("total_points"))
        player.event_points = _i(raw.get("event_points"))
        player.minutes = _i(raw.get("minutes"))
        player.goals_scored = _i(raw.get("goals_scored"))
        player.assists = _i(raw.get("assists"))
        player.clean_sheets = _i(raw.get("clean_sheets"))
        player.goals_conceded = _i(raw.get("goals_conceded"))
        player.own_goals = _i(raw.get("own_goals"))
        player.penalties_saved = _i(raw.get("penalties_saved"))
        player.penalties_missed = _i(raw.get("penalties_missed"))
        player.yellow_cards = _i(raw.get("yellow_cards"))
        player.red_cards = _i(raw.get("red_cards"))
        player.saves = _i(raw.get("saves"))
        player.bonus = _i(raw.get("bonus"))
        player.bps = _i(raw.get("bps"))
        player.influence = _f(raw.get("influence"))
        player.creativity = _f(raw.get("creativity"))
        player.threat = _f(raw.get("threat"))
        player.ict_index = _f(raw.get("ict_index"))
        player.expected_goals = _f(raw.get("expected_goals"))
        player.expected_assists = _f(raw.get("expected_assists"))
        player.expected_goal_involvements = _f(raw.get("expected_goal_involvements"))
        player.expected_goals_conceded = _f(raw.get("expected_goals_conceded"))
        player.ep_this = _f(raw.get("ep_this"))
        player.ep_next = _f(raw.get("ep_next"))
        player.photo = raw.get("photo")
        count += 1
    db.flush()
    return count


def upsert_fixtures(db: Session, fixtures: list[dict[str, Any]]) -> int:
    count = 0
    for raw in fixtures:
        fixture = db.get(Fixture, raw["id"])
        if fixture is None:
            fixture = Fixture(id=raw["id"], team_h_id=raw["team_h"], team_a_id=raw["team_a"])
            db.add(fixture)
        fixture.code = raw.get("code")
        fixture.event = raw.get("event")
        fixture.kickoff_time = _parse_dt(raw.get("kickoff_time"))
        fixture.finished = bool(raw.get("finished"))
        fixture.started = raw.get("started")
        fixture.team_h_id = raw["team_h"]
        fixture.team_a_id = raw["team_a"]
        fixture.team_h_score = raw.get("team_h_score")
        fixture.team_a_score = raw.get("team_a_score")
        fixture.team_h_difficulty = raw.get("team_h_difficulty")
        fixture.team_a_difficulty = raw.get("team_a_difficulty")
        fixture.stats = raw.get("stats")
        count += 1
    db.flush()
    return count


def sync_bootstrap_and_fixtures(db: Session, client: FPLClient | None = None) -> IngestRun:
    client = client or FPLClient()
    run = IngestRun(source="bootstrap+fixtures", status="running")
    db.add(run)
    db.flush()

    try:
        bootstrap = client.bootstrap_static()
        fixtures = client.fixtures()

        run.teams_upserted = upsert_teams(db, bootstrap.get("teams", []))
        run.gameweeks_upserted = upsert_gameweeks(db, bootstrap.get("events", []))
        run.players_upserted = upsert_players(db, bootstrap.get("elements", []))
        run.fixtures_upserted = upsert_fixtures(db, fixtures)
        run.status = "ok"
        run.finished_at = datetime.now(UTC)
        db.flush()
        return run
    except Exception as exc:
        run.status = "error"
        run.error = str(exc)
        run.finished_at = datetime.now(UTC)
        db.flush()
        raise


def current_gameweek(db: Session) -> Gameweek | None:
    current = db.scalar(select(Gameweek).where(Gameweek.is_current.is_(True)))
    if current:
        return current
    return db.scalar(select(Gameweek).where(Gameweek.is_next.is_(True)))
