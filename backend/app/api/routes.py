from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.api.schemas import (
    FixtureOut,
    GameweekOut,
    IngestResult,
    OverviewOut,
    PlayerOut,
    ScanResultOut,
    TeamOut,
)
from app.db.models import Fixture, Gameweek, IngestRun, Player, Team
from app.db.session import get_db
from app.services.ingestion import current_gameweek, sync_bootstrap_and_fixtures

router = APIRouter()

POSITIONS = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _gameweek_out(gw: Gameweek) -> GameweekOut:
    return GameweekOut(
        id=gw.id,
        name=gw.name,
        deadline_time=_iso(gw.deadline_time),
        finished=gw.finished,
        is_current=gw.is_current,
        is_next=gw.is_next,
        is_previous=gw.is_previous,
        average_entry_score=gw.average_entry_score,
        highest_score=gw.highest_score,
    )


def _player_out(player: Player) -> PlayerOut:
    team_short = player.team.short_name if player.team else None
    return PlayerOut(
        id=player.id,
        web_name=player.web_name,
        first_name=player.first_name,
        second_name=player.second_name,
        team_id=player.team_id,
        team_short_name=team_short,
        element_type=player.element_type,
        position=POSITIONS.get(player.element_type, "?"),
        now_cost=player.now_cost,
        price=round(player.now_cost / 10, 1),
        status=player.status,
        news=player.news,
        selected_by_percent=player.selected_by_percent,
        form=player.form,
        points_per_game=player.points_per_game,
        total_points=player.total_points,
        minutes=player.minutes,
        goals_scored=player.goals_scored,
        assists=player.assists,
        clean_sheets=player.clean_sheets,
        expected_goals=player.expected_goals,
        expected_assists=player.expected_assists,
        chance_of_playing_this_round=player.chance_of_playing_this_round,
        ep_this=player.ep_this,
        ep_next=player.ep_next,
    )


@router.post("/ingest", response_model=IngestResult)
def ingest(db: Session = Depends(get_db)) -> IngestResult:
    try:
        run = sync_bootstrap_and_fixtures(db)
        db.commit()
        db.refresh(run)
        return IngestResult(
            status=run.status,
            teams_upserted=run.teams_upserted,
            players_upserted=run.players_upserted,
            fixtures_upserted=run.fixtures_upserted,
            gameweeks_upserted=run.gameweeks_upserted,
            error=run.error,
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail=f"FPL ingest failed: {exc}") from exc


@router.get("/overview", response_model=OverviewOut)
def overview(db: Session = Depends(get_db)) -> OverviewOut:
    gw = current_gameweek(db)
    last = db.scalar(select(IngestRun).order_by(IngestRun.id.desc()).limit(1))
    return OverviewOut(
        current_gameweek=_gameweek_out(gw) if gw else None,
        player_count=db.scalar(select(func.count(Player.id))) or 0,
        team_count=db.scalar(select(func.count(Team.id))) or 0,
        fixture_count=db.scalar(select(func.count(Fixture.id))) or 0,
        last_ingest_status=last.status if last else None,
    )


@router.get("/gameweeks", response_model=list[GameweekOut])
def list_gameweeks(db: Session = Depends(get_db)) -> list[GameweekOut]:
    rows = db.scalars(select(Gameweek).order_by(Gameweek.id)).all()
    return [_gameweek_out(row) for row in rows]


@router.get("/teams", response_model=list[TeamOut])
def list_teams(db: Session = Depends(get_db)) -> list[TeamOut]:
    return list(db.scalars(select(Team).order_by(Team.id)).all())


@router.get("/players", response_model=list[PlayerOut])
def list_players(
    db: Session = Depends(get_db),
    position: str | None = Query(default=None),
    team_id: int | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    sort: str = Query(default="total_points"),
) -> list[PlayerOut]:
    stmt = select(Player).options(joinedload(Player.team))
    if team_id:
        stmt = stmt.where(Player.team_id == team_id)
    if position:
        pos_map = {name: code for code, name in POSITIONS.items()}
        element_type = pos_map.get(position.upper())
        if element_type:
            stmt = stmt.where(Player.element_type == element_type)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Player.web_name.ilike(like), Player.second_name.ilike(like)))

    sort_column = {
        "total_points": Player.total_points,
        "form": Player.form,
        "price": Player.now_cost,
        "selected": Player.selected_by_percent,
        "xg": Player.expected_goals,
        "ep_next": Player.ep_next,
    }.get(sort, Player.total_points)
    stmt = stmt.order_by(sort_column.desc().nullslast()).limit(limit)
    return [_player_out(player) for player in db.scalars(stmt).unique().all()]


@router.get("/fixtures", response_model=list[FixtureOut])
def list_fixtures(
    db: Session = Depends(get_db),
    event: int | None = Query(default=None),
) -> list[FixtureOut]:
    stmt = (
        select(Fixture)
        .options(joinedload(Fixture.team_h), joinedload(Fixture.team_a))
        .order_by(Fixture.kickoff_time.nulls_last(), Fixture.id)
    )
    if event is not None:
        stmt = stmt.where(Fixture.event == event)
    else:
        gw = current_gameweek(db)
        if gw:
            stmt = stmt.where(Fixture.event == gw.id)

    out: list[FixtureOut] = []
    for fixture in db.scalars(stmt).unique().all():
        out.append(
            FixtureOut(
                id=fixture.id,
                event=fixture.event,
                kickoff_time=_iso(fixture.kickoff_time),
                finished=fixture.finished,
                team_h_id=fixture.team_h_id,
                team_a_id=fixture.team_a_id,
                team_h_name=fixture.team_h.name if fixture.team_h else None,
                team_a_name=fixture.team_a.name if fixture.team_a else None,
                team_h_short=fixture.team_h.short_name if fixture.team_h else None,
                team_a_short=fixture.team_a.short_name if fixture.team_a else None,
                team_h_score=fixture.team_h_score,
                team_a_score=fixture.team_a_score,
                team_h_difficulty=fixture.team_h_difficulty,
                team_a_difficulty=fixture.team_a_difficulty,
            )
        )
    return out


@router.post("/scan", response_model=ScanResultOut)
async def scan_squad(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ScanResultOut:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload a PNG, JPG, or WebP screenshot.")
    try:
        from app.services.scan import scan_squad_image

        image_bytes = await file.read()
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large (max 10MB).")
        result = scan_squad_image(db, image_bytes)
        return ScanResultOut(**result)
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scan failed: {exc}") from exc
