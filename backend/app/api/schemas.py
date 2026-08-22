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


class PlayerHistoryGwOut(BaseModel):
    round: int
    total_points: int
    minutes: int
    goals_scored: int
    assists: int
    clean_sheets: int
    bonus: int
    was_home: bool | None = None
    opponent_team: int | None = None


class PlayerHistoryOut(BaseModel):
    player_id: int
    form: float
    games_used: int
    season_points: int
    history: list[PlayerHistoryGwOut]


class SquadPlayerIn(BaseModel):
    id: str | None = None
    fplId: int | None = None
    name: str
    club: str | None = None
    position: str | None = None
    price: float | None = None
    xp: float | None = None
    form: float | None = None
    ownership: float | None = None
    isCaptain: bool = False
    isVice: bool = False
    slot: str | None = None


class AiVerdictRequest(BaseModel):
    squad: list[SquadPlayerIn]
    activeChip: str | None = None
    bank: float | None = None
    freeTransfers: int | None = None
    fplRank: int | None = None
    strategyMode: str | None = None


class AiAskRequest(BaseModel):
    question: str
    squad: list[SquadPlayerIn]
    activeChip: str | None = None
    bank: float | None = None
    freeTransfers: int | None = None
    fplRank: int | None = None
    strategyMode: str | None = None


class AiAskOut(BaseModel):
    verdict: str
    headline: str
    body: str
    confidence: int = 60
    source: str = "gemini"


class TransferPlanStepOut(BaseModel):
    gameweek: int
    action: str
    move: dict | None = None
    projectedGain: float = 0
    bankAfter: float = 0
    freeTransfersAfter: int | None = None
    reason: str = ""


class TransferPlanOut(BaseModel):
    steps: list[TransferPlanStepOut]
    totalGain4Gw: float = 0
    totalGainHorizon: float = 0
    wildcardWindow: int | None = None
    source: str = "optimizer"


class EntrySummaryOut(BaseModel):
    entryId: int
    name: str | None = None
    bank: float
    teamValue: float
    rank: int | None = None
    freeTransfers: int = 1
    currentGameweek: int = 1
    defaultLeagueId: int | None = None
    defaultLeagueName: str | None = None


class LeagueAnalysisOut(BaseModel):
    yourRank: int | None = None
    yourLeagueRank: int | None = None
    rivalRank: int | None = None
    rivalName: str | None = None
    leagueName: str | None = None
    leagueId: int | None = None
    rivals: list[dict] = []


class GwReviewOut(BaseModel):
    gameweek: int
    grade: str
    decisionQuality: int
    totalPoints: int = 0
    averageScore: int = 0
    captainDelta: float = 0
    transferDelta: float = 0
    benchDelta: float = 0
    bestDecision: str = ""
    worstDecision: str = ""
    captain: str | None = None
    source: str = "fpl"


class AiTransferOut(BaseModel):
    out: str | None = None
    in_: str | None = None
    reason: str = ""

    model_config = ConfigDict(populate_by_name=True)


class AiCaptainOut(BaseModel):
    name: str
    reason: str = ""


class AiVerdictOut(BaseModel):
    headline: str
    summary: str
    action: str
    confidence: int = 50
    transfers: list[dict] = []
    captain: dict | None = None
    risks: list[str] = []
    source: str = "gemini"
    gameweek: int | None = None


class AiTransferAdviceOut(BaseModel):
    headline: str
    summary: str
    action: str
    confidence: int = 50
    transfers: list[dict] = []
    source: str = "gemini"
    gameweek: int | None = None


class AiPicksRequest(BaseModel):
    ownedIds: list[int] = []
    position: str | None = None


class AiPickOut(BaseModel):
    id: int
    name: str
    club: str
    position: str
    price: float
    form: float
    ownership: float
    next4Xp: float
    rating: int
    tag: str
    reason: str = ""


class AiPicksOut(BaseModel):
    summary: str
    picks: list[AiPickOut]
    source: str = "gemini"
    gameweek: int | None = None


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
    ppg: float = 0
    ownership: float
    isCaptain: bool = False
    isVice: bool = False
    slot: str
    row: str
    confidence: float
    rawName: str | None = None
    nextFixtures: list[dict]


class ScanChipsOut(BaseModel):
    playing: str | None = None
    status: dict[str, str] = {}


class ScanResultOut(BaseModel):
    formation: str | None
    starters: list[ScanPlayerOut]
    bench: list[ScanPlayerOut]
    unmatched: list[str]
    warnings: list[str]
    scanMethod: str
    chips: ScanChipsOut | None = None
    bank: float | None = None
    freeTransfers: int | None = None
    teamValue: float | None = None
    entryId: int | None = None
