from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64))
    short_name: Mapped[str] = mapped_column(String(8))
    code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    strength: Mapped[int | None] = mapped_column(Integer, nullable=True)
    strength_attack_home: Mapped[int | None] = mapped_column(Integer, nullable=True)
    strength_attack_away: Mapped[int | None] = mapped_column(Integer, nullable=True)
    strength_defence_home: Mapped[int | None] = mapped_column(Integer, nullable=True)
    strength_defence_away: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pulse_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    players: Mapped[list["Player"]] = relationship(back_populates="team")


class Gameweek(Base):
    __tablename__ = "gameweeks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(32))
    deadline_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished: Mapped[bool] = mapped_column(Boolean, default=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    is_next: Mapped[bool] = mapped_column(Boolean, default=False)
    is_previous: Mapped[bool] = mapped_column(Boolean, default=False)
    average_entry_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    highest_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    most_selected: Mapped[int | None] = mapped_column(Integer, nullable=True)
    most_captained: Mapped[int | None] = mapped_column(Integer, nullable=True)
    most_transferred_in: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    first_name: Mapped[str] = mapped_column(String(64))
    second_name: Mapped[str] = mapped_column(String(64))
    web_name: Mapped[str] = mapped_column(String(64), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    element_type: Mapped[int] = mapped_column(Integer, index=True)  # 1 GKP, 2 DEF, 3 MID, 4 FWD
    now_cost: Mapped[int] = mapped_column(Integer)  # tenths of a million, 50 = £5.0m
    status: Mapped[str] = mapped_column(String(8), default="a")
    chance_of_playing_this_round: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chance_of_playing_next_round: Mapped[int | None] = mapped_column(Integer, nullable=True)
    news: Mapped[str | None] = mapped_column(Text, nullable=True)
    news_added: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    selected_by_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    form: Mapped[float | None] = mapped_column(Float, nullable=True)
    points_per_game: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    event_points: Mapped[int] = mapped_column(Integer, default=0)
    minutes: Mapped[int] = mapped_column(Integer, default=0)
    goals_scored: Mapped[int] = mapped_column(Integer, default=0)
    assists: Mapped[int] = mapped_column(Integer, default=0)
    clean_sheets: Mapped[int] = mapped_column(Integer, default=0)
    goals_conceded: Mapped[int] = mapped_column(Integer, default=0)
    own_goals: Mapped[int] = mapped_column(Integer, default=0)
    penalties_saved: Mapped[int] = mapped_column(Integer, default=0)
    penalties_missed: Mapped[int] = mapped_column(Integer, default=0)
    yellow_cards: Mapped[int] = mapped_column(Integer, default=0)
    red_cards: Mapped[int] = mapped_column(Integer, default=0)
    saves: Mapped[int] = mapped_column(Integer, default=0)
    bonus: Mapped[int] = mapped_column(Integer, default=0)
    bps: Mapped[int] = mapped_column(Integer, default=0)
    influence: Mapped[float | None] = mapped_column(Float, nullable=True)
    creativity: Mapped[float | None] = mapped_column(Float, nullable=True)
    threat: Mapped[float | None] = mapped_column(Float, nullable=True)
    ict_index: Mapped[float | None] = mapped_column(Float, nullable=True)
    expected_goals: Mapped[float | None] = mapped_column(Float, nullable=True)
    expected_assists: Mapped[float | None] = mapped_column(Float, nullable=True)
    expected_goal_involvements: Mapped[float | None] = mapped_column(Float, nullable=True)
    expected_goals_conceded: Mapped[float | None] = mapped_column(Float, nullable=True)
    ep_this: Mapped[float | None] = mapped_column(Float, nullable=True)
    ep_next: Mapped[float | None] = mapped_column(Float, nullable=True)
    photo: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    team: Mapped["Team"] = relationship(back_populates="players")


class Fixture(Base):
    __tablename__ = "fixtures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    event: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    kickoff_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished: Mapped[bool] = mapped_column(Boolean, default=False)
    started: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    team_h_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    team_a_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    team_h_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    team_a_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    team_h_difficulty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    team_a_difficulty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stats: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    team_h: Mapped["Team"] = relationship(foreign_keys=[team_h_id])
    team_a: Mapped["Team"] = relationship(foreign_keys=[team_a_id])


class PlayerGameweekStat(Base):
    """Per-gameweek history from FPL element-summary (ingested later)."""

    __tablename__ = "player_gameweek_stats"
    __table_args__ = (UniqueConstraint("player_id", "round", name="uq_player_gw"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    fixture_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    opponent_team_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    round: Mapped[int] = mapped_column(Integer, index=True)
    minutes: Mapped[int] = mapped_column(Integer, default=0)
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    goals_scored: Mapped[int] = mapped_column(Integer, default=0)
    assists: Mapped[int] = mapped_column(Integer, default=0)
    clean_sheets: Mapped[int] = mapped_column(Integer, default=0)
    goals_conceded: Mapped[int] = mapped_column(Integer, default=0)
    bonus: Mapped[int] = mapped_column(Integer, default=0)
    bps: Mapped[int] = mapped_column(Integer, default=0)
    was_home: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    expected_goals: Mapped[float | None] = mapped_column(Float, nullable=True)
    expected_assists: Mapped[float | None] = mapped_column(Float, nullable=True)
    influence: Mapped[float | None] = mapped_column(Float, nullable=True)
    creativity: Mapped[float | None] = mapped_column(Float, nullable=True)
    threat: Mapped[float | None] = mapped_column(Float, nullable=True)
    ict_index: Mapped[float | None] = mapped_column(Float, nullable=True)
    value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    selected: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transfers_in: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transfers_out: Mapped[int | None] = mapped_column(Integer, nullable=True)


class IngestRun(Base):
    __tablename__ = "ingest_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(16))
    teams_upserted: Mapped[int] = mapped_column(Integer, default=0)
    players_upserted: Mapped[int] = mapped_column(Integer, default=0)
    fixtures_upserted: Mapped[int] = mapped_column(Integer, default=0)
    gameweeks_upserted: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
