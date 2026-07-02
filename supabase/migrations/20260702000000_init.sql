-- Worldcup Pulse — initial schema (build spec §5).
-- Cache tables written only by the service role via cron routes; the app
-- reads with the anon key under RLS.

create table config (
  key text primary key,
  value jsonb not null
);

create table teams (
  id int primary key,              -- provider team id
  name text not null,
  code text,                       -- FIFA trigram
  flag_url text,
  primary_color text,              -- for momentum color shifts
  secondary_color text
);

create table fixtures (
  id bigint primary key,           -- provider fixture id
  kickoff timestamptz not null,
  stage text not null,             -- 'R32','R16','QF','SF','3P','F'
  status text not null,            -- 'NS','LIVE','HT','FT','PEN'
  home_team int references teams(id),
  away_team int references teams(id),
  home_score int, away_score int,
  penalties jsonb,
  venue text,
  events jsonb,                    -- goals/cards timeline from provider
  elapsed int,                     -- live match minute (ticker display)
  updated_at timestamptz default now()
);
create index on fixtures (kickoff);
create index on fixtures (status);

create table players (
  id bigint primary key,
  team_id int references teams(id),
  name text not null,
  position text,
  photo_url text,                  -- provider-licensed photo
  stylized_url text                -- Higgsfield treatment, nullable
);

create table player_form (
  id bigserial primary key,
  player_id bigint references players(id),
  snapshot_date date not null,
  goals int, assists int, xg numeric, minutes int,
  rating numeric,
  form_delta numeric,              -- computed vs previous snapshot
  unique (player_id, snapshot_date)
);

create table odds_snapshots (
  id bigserial primary key,
  fixture_id bigint references fixtures(id),
  captured_at timestamptz default now(),
  bookmaker text,
  market text,                     -- 'match_winner','total_goals','btts'
  values jsonb                     -- raw odds payload, normalized
);
create index on odds_snapshots (fixture_id, captured_at);

create table hot_takes (
  id bigserial primary key,
  fixture_id bigint references fixtures(id),
  headline text not null,          -- the reveal
  body text not null,
  confidence text not null,        -- 'certain','likely','spicy'
  revealed_stat jsonb,             -- the stat that justifies the take
  created_at timestamptz default now(),
  unique (fixture_id, headline)    -- cron regeneration upserts instead of duplicating
);

-- RLS: anon may read everything, writes happen only via the service role (§5).
alter table config enable row level security;
alter table teams enable row level security;
alter table fixtures enable row level security;
alter table players enable row level security;
alter table player_form enable row level security;
alter table odds_snapshots enable row level security;
alter table hot_takes enable row level security;

create policy "anon read config" on config for select to anon using (true);
create policy "anon read teams" on teams for select to anon using (true);
create policy "anon read fixtures" on fixtures for select to anon using (true);
create policy "anon read players" on players for select to anon using (true);
create policy "anon read player_form" on player_form for select to anon using (true);
create policy "anon read odds_snapshots" on odds_snapshots for select to anon using (true);
create policy "anon read hot_takes" on hot_takes for select to anon using (true);
