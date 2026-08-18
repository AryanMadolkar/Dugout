export type Gameweek = {
  id: number;
  name: string;
  deadline_time: string | null;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
  is_previous: boolean;
  average_entry_score: number | null;
  highest_score: number | null;
};

export type Player = {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team_id: number;
  team_short_name: string | null;
  element_type: number;
  position: string;
  now_cost: number;
  price: number;
  status: string;
  news: string | null;
  selected_by_percent: number | null;
  form: number | null;
  points_per_game: number | null;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  expected_goals: number | null;
  expected_assists: number | null;
  chance_of_playing_this_round: number | null;
  ep_this: number | null;
  ep_next: number | null;
};

export type Fixture = {
  id: number;
  event: number | null;
  kickoff_time: string | null;
  finished: boolean;
  team_h_id: number;
  team_a_id: number;
  team_h_name: string | null;
  team_a_name: string | null;
  team_h_short: string | null;
  team_a_short: string | null;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number | null;
  team_a_difficulty: number | null;
};

export type Overview = {
  current_gameweek: Gameweek | null;
  player_count: number;
  team_count: number;
  fixture_count: number;
  last_ingest_status: string | null;
};

export type IngestResult = {
  status: string;
  teams_upserted: number;
  players_upserted: number;
  fixtures_upserted: number;
  gameweeks_upserted: number;
  error: string | null;
};
