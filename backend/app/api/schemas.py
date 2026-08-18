from pydantic import BaseModel, ConfigDict


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    short_name: str
    strength: int | None = None
    strength_attack_home: int | None = None
    strength_attack_away: int | None = None
    strength_defence_home: int | None = None
    strength_defence_away: int | None = None


class GameweekOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    deadline_time: str | None = None
    finished: bool
    is_current: bool
    is_next: bool
    is_previous: bool
    average_entry_score: int | None = None
    highest_score: int | None = None


class PlayerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    web_name: str
    first_name: str
    second_name: str
    team_id: int
    team_short_name: str | None = None
    element_type: int
    position: str
    now_cost: int
    price: float
    status: str
    news: str | None = None
    selected_by_percent: float | None = None
    form: float | None = None
    points_per_game: float | None = None
    total_points: int
    minutes: int
    goals_scored: int
    assists: int
    clean_sheets: int
    expected_goals: float | None = None
    expected_assists: float | None = None
    chance_of_playing_this_round: int | None = None
    ep_this: float | None = None
    ep_next: float | None = None


class FixtureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event: int | None
    kickoff_time: str | None = None
    finished: bool
    team_h_id: int
    team_a_id: int
    team_h_name: str | None = None
    team_a_name: str | None = None
    team_h_short: str | None = None
    team_a_short: str | None = None
    team_h_score: int | None = None
    team_a_score: int | None = None
    team_h_difficulty: int | None = None
    team_a_difficulty: int | None = None


class IngestResult(BaseModel):
    status: str
    teams_upserted: int
    players_upserted: int
    fixtures_upserted: int
    gameweeks_upserted: int
    error: str | None = None


class OverviewOut(BaseModel):
    current_gameweek: GameweekOut | None
    player_count: int
    team_count: int
    fixture_count: int
    last_ingest_status: str | None = None


class ScanPlayerOut(BaseModel):
    id: str
    fpl_id: int
    name: str
    initials: str
    club: str
    clubColor: str
    position: str
    price: float
    opponent: str
    home: bool
    xp: float
    form: float
    ownership: float
    isCaptain: bool = False
    isVice: bool = False
    slot: str
    row: str
    confidence: float
    rawName: str | None = None
    nextFixtures: list[dict]


class ScanResultOut(BaseModel):
    formation: str | None
    starters: list[ScanPlayerOut]
    bench: list[ScanPlayerOut]
    unmatched: list[str]
    warnings: list[str]
    scanMethod: str
