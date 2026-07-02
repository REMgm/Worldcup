import type {
  FixtureWithTeams,
  FormSnapshot,
  OddsSnapshotRow,
  PlayerWithForm,
  Team,
} from "@/lib/types";
import { TEAM_COLORS } from "@/lib/teamColors";

/**
 * Demo dataset — used automatically whenever Supabase env vars are absent
 * or the cache is empty, so the product is fully browsable before any API
 * key exists. Kickoffs are generated relative to "now": the knockout stage
 * is always mid-flight, one match is always live. Results and stats are
 * fictional editorial content.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function iso(offsetHours: number, base: number): string {
  return new Date(base + offsetHours * HOUR).toISOString();
}

function dateOnly(offsetDays: number, base: number): string {
  return new Date(base + offsetDays * DAY).toISOString().slice(0, 10);
}

interface TeamSeed {
  id: number;
  name: string;
  code: string;
  iso2: string;
}

const TEAM_SEEDS: TeamSeed[] = [
  { id: 101, name: "Brazil", code: "BRA", iso2: "br" },
  { id: 102, name: "Norway", code: "NOR", iso2: "no" },
  { id: 103, name: "Mexico", code: "MEX", iso2: "mx" },
  { id: 104, name: "Poland", code: "POL", iso2: "pl" },
  { id: 105, name: "France", code: "FRA", iso2: "fr" },
  { id: 106, name: "Senegal", code: "SEN", iso2: "sn" },
  { id: 107, name: "Spain", code: "ESP", iso2: "es" },
  { id: 108, name: "Uzbekistan", code: "UZB", iso2: "uz" },
  { id: 109, name: "Argentina", code: "ARG", iso2: "ar" },
  { id: 110, name: "Australia", code: "AUS", iso2: "au" },
  { id: 111, name: "Netherlands", code: "NED", iso2: "nl" },
  { id: 112, name: "Egypt", code: "EGY", iso2: "eg" },
  { id: 113, name: "England", code: "ENG", iso2: "gb-eng" },
  { id: 114, name: "Serbia", code: "SRB", iso2: "rs" },
  { id: 115, name: "Portugal", code: "POR", iso2: "pt" },
  { id: 116, name: "South Korea", code: "KOR", iso2: "kr" },
  { id: 117, name: "Germany", code: "GER", iso2: "de" },
  { id: 118, name: "Switzerland", code: "SUI", iso2: "ch" },
  { id: 119, name: "Croatia", code: "CRO", iso2: "hr" },
  { id: 120, name: "Morocco", code: "MAR", iso2: "ma" },
  { id: 121, name: "Italy", code: "ITA", iso2: "it" },
  { id: 122, name: "United States", code: "USA", iso2: "us" },
  { id: 123, name: "Belgium", code: "BEL", iso2: "be" },
  { id: 124, name: "Japan", code: "JPN", iso2: "jp" },
  { id: 125, name: "Uruguay", code: "URU", iso2: "uy" },
  { id: 126, name: "Ghana", code: "GHA", iso2: "gh" },
  { id: 127, name: "Colombia", code: "COL", iso2: "co" },
  { id: 128, name: "Denmark", code: "DEN", iso2: "dk" },
  { id: 129, name: "Canada", code: "CAN", iso2: "ca" },
  { id: 130, name: "Iran", code: "IRN", iso2: "ir" },
  { id: 131, name: "Austria", code: "AUT", iso2: "at" },
  { id: 132, name: "Ecuador", code: "ECU", iso2: "ec" },
];

export function demoTeams(): Team[] {
  return TEAM_SEEDS.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    flag_url: `https://flagcdn.com/w160/${s.iso2}.png`,
    primary_color: TEAM_COLORS[s.code]?.primary ?? null,
    secondary_color: TEAM_COLORS[s.code]?.secondary ?? null,
  }));
}

const T = Object.fromEntries(TEAM_SEEDS.map((s) => [s.code, s.id])) as Record<string, number>;

const VENUES = [
  "MetLife Stadium, New York",
  "SoFi Stadium, Los Angeles",
  "AT&T Stadium, Dallas",
  "Estadio Azteca, Mexico City",
  "Hard Rock Stadium, Miami",
  "Lumen Field, Seattle",
  "NRG Stadium, Houston",
  "Arrowhead Stadium, Kansas City",
  "Mercedes-Benz Stadium, Atlanta",
  "Levi's Stadium, San Francisco",
  "Lincoln Financial Field, Philadelphia",
  "Gillette Stadium, Boston",
  "BC Place, Vancouver",
  "BMO Field, Toronto",
  "Estadio BBVA, Monterrey",
  "Estadio Akron, Guadalajara",
];

export function demoFixtures(now = Date.now()): FixtureWithTeams[] {
  const teams = new Map(demoTeams().map((t) => [t.id, t]));
  const team = (id: number | null) => (id == null ? null : (teams.get(id) ?? null));

  // R32 spread across the last four days; one live right now; the rest of
  // the bracket stretches out ahead on the real 2026 rhythm.
  const rows: Array<
    [
      number, // id
      number, // kickoff offset hours from now
      FixtureWithTeams["stage"],
      FixtureWithTeams["status"],
      number | null, // home team
      number | null, // away team
      number | null, // home score
      number | null, // away score
      ({ home: number; away: number } | null)?, // penalties
      (FixtureWithTeams["events"] | null)?,
      (number | null)?, // elapsed
    ]
  > = [
    // ---- Round of 32, mostly played ----
    [9101, -96, "R32", "FT", T.BRA, T.NOR, 3, 1, null, [
      { minute: 12, type: "goal", detail: "Normal Goal", team_id: T.BRA, player: "Vinícius Júnior", assist: "Rodrygo" },
      { minute: 38, type: "goal", detail: "Normal Goal", team_id: T.NOR, player: "Erling Haaland" },
      { minute: 55, type: "goal", detail: "Penalty", team_id: T.BRA, player: "Vinícius Júnior" },
      { minute: 81, type: "goal", detail: "Normal Goal", team_id: T.BRA, player: "Endrick" },
    ]],
    [9102, -94, "R32", "PEN", T.MEX, T.POL, 1, 1, { home: 4, away: 2 }, [
      { minute: 34, type: "goal", detail: "Normal Goal", team_id: T.MEX, player: "Santiago Giménez" },
      { minute: 76, type: "goal", detail: "Normal Goal", team_id: T.POL, player: "Robert Lewandowski" },
    ]],
    [9103, -72, "R32", "FT", T.FRA, T.SEN, 2, 0, null, [
      { minute: 27, type: "goal", detail: "Normal Goal", team_id: T.FRA, player: "Kylian Mbappé" },
      { minute: 64, type: "goal", detail: "Normal Goal", team_id: T.FRA, player: "Bradley Barcola", assist: "Kylian Mbappé" },
    ]],
    [9104, -70, "R32", "FT", T.ESP, T.UZB, 4, 0, null, [
      { minute: 8, type: "goal", detail: "Normal Goal", team_id: T.ESP, player: "Lamine Yamal" },
      { minute: 31, type: "goal", detail: "Normal Goal", team_id: T.ESP, player: "Nico Williams" },
      { minute: 59, type: "goal", detail: "Normal Goal", team_id: T.ESP, player: "Lamine Yamal" },
      { minute: 87, type: "goal", detail: "Normal Goal", team_id: T.ESP, player: "Mikel Oyarzabal" },
    ]],
    [9105, -48, "R32", "FT", T.ARG, T.AUS, 2, 1, null, [
      { minute: 22, type: "goal", detail: "Normal Goal", team_id: T.ARG, player: "Lionel Messi" },
      { minute: 58, type: "goal", detail: "Normal Goal", team_id: T.AUS, player: "Nestory Irankunda" },
      { minute: 74, type: "goal", detail: "Normal Goal", team_id: T.ARG, player: "Julián Álvarez", assist: "Lionel Messi" },
    ]],
    [9106, -46, "R32", "FT", T.NED, T.EGY, 1, 0, null, [
      { minute: 66, type: "goal", detail: "Normal Goal", team_id: T.NED, player: "Cody Gakpo" },
    ]],
    [9107, -26, "R32", "FT", T.ENG, T.SRB, 2, 1, null, [
      { minute: 15, type: "goal", detail: "Normal Goal", team_id: T.ENG, player: "Jude Bellingham" },
      { minute: 49, type: "goal", detail: "Normal Goal", team_id: T.SRB, player: "Dušan Vlahović" },
      { minute: 90, type: "goal", detail: "Normal Goal", team_id: T.ENG, player: "Harry Kane", assist: "Jude Bellingham" },
    ]],
    [9108, -24, "R32", "PEN", T.POR, T.KOR, 2, 2, { home: 3, away: 4 }, [
      { minute: 19, type: "goal", detail: "Normal Goal", team_id: T.POR, player: "Rafael Leão" },
      { minute: 45, type: "goal", detail: "Normal Goal", team_id: T.KOR, player: "Son Heung-min" },
      { minute: 78, type: "goal", detail: "Normal Goal", team_id: T.POR, player: "Gonçalo Ramos" },
      { minute: 90, type: "goal", detail: "Penalty", team_id: T.KOR, player: "Son Heung-min", extra: 4 },
    ]],
    [9109, -22, "R32", "FT", T.GER, T.SUI, 0, 1, null, [
      { minute: 71, type: "goal", detail: "Normal Goal", team_id: T.SUI, player: "Dan Ndoye" },
      { minute: 85, type: "card", detail: "Red Card", team_id: T.GER, player: "Antonio Rüdiger" },
    ]],
    // ---- Live right now ----
    [9110, -1.1, "R32", "LIVE", T.CRO, T.MAR, 1, 1, null, [
      { minute: 23, type: "goal", detail: "Normal Goal", team_id: T.CRO, player: "Joško Gvardiol" },
      { minute: 58, type: "goal", detail: "Normal Goal", team_id: T.MAR, player: "Youssef En-Nesyri", assist: "Achraf Hakimi" },
      { minute: 61, type: "card", detail: "Yellow Card", team_id: T.CRO, player: "Marcelo Brozović" },
    ], 63],
    // ---- Later today / tomorrow ----
    [9111, 3, "R32", "NS", T.ITA, T.USA, null, null],
    [9112, 6, "R32", "NS", T.BEL, T.JPN, null, null],
    [9113, 22, "R32", "NS", T.URU, T.GHA, null, null],
    [9114, 25, "R32", "NS", T.COL, T.DEN, null, null],
    [9115, 27, "R32", "NS", T.CAN, T.IRN, null, null],
    [9116, 29, "R32", "NS", T.AUT, T.ECU, null, null],
    // ---- Round of 16: filled where both feeders are decided ----
    [9201, 48, "R16", "NS", T.BRA, T.MEX, null, null],
    [9202, 51, "R16", "NS", T.FRA, T.ESP, null, null],
    [9203, 72, "R16", "NS", T.ARG, T.NED, null, null],
    [9204, 75, "R16", "NS", T.ENG, T.KOR, null, null],
    [9205, 96, "R16", "NS", T.SUI, null, null, null],
    [9206, 99, "R16", "NS", null, null, null, null],
    [9207, 120, "R16", "NS", null, null, null, null],
    [9208, 123, "R16", "NS", null, null, null, null],
    // ---- Quarter-finals onward: TBD ----
    [9301, 168, "QF", "NS", null, null, null, null],
    [9302, 171, "QF", "NS", null, null, null, null],
    [9303, 192, "QF", "NS", null, null, null, null],
    [9304, 195, "QF", "NS", null, null, null, null],
    [9401, 264, "SF", "NS", null, null, null, null],
    [9402, 288, "SF", "NS", null, null, null, null],
    [9501, 360, "3P", "NS", null, null, null, null],
    [9601, 384, "F", "NS", null, null, null, null],
  ];

  return rows.map(([id, off, stage, status, home, away, hs, as, pens, events, elapsed], i) => ({
    id,
    kickoff: iso(off, now),
    stage,
    status,
    home_team: home,
    away_team: away,
    home_score: hs,
    away_score: as,
    penalties: pens ?? null,
    venue: VENUES[i % VENUES.length],
    events: events ?? null,
    elapsed: elapsed ?? (status === "LIVE" ? 63 : null),
    home: team(home),
    away: team(away),
  }));
}

interface PlayerSeed {
  id: number;
  team: string;
  name: string;
  position: string;
  goals: number;
  xg: number;
  assists: number;
  minutes: number;
  ratings: [number, number, number, number, number];
}

// Ratings are the last five daily snapshots, oldest first.
const PLAYER_SEEDS: PlayerSeed[] = [
  { id: 501, team: "BRA", name: "Vinícius Júnior", position: "FW", goals: 5, xg: 3.1, assists: 2, minutes: 390, ratings: [7.4, 7.9, 8.1, 8.4, 8.9] },
  { id: 502, team: "FRA", name: "Kylian Mbappé", position: "FW", goals: 4, xg: 3.6, assists: 3, minutes: 402, ratings: [8.2, 8.0, 8.3, 8.1, 8.5] },
  { id: 503, team: "ESP", name: "Lamine Yamal", position: "FW", goals: 4, xg: 2.9, assists: 4, minutes: 371, ratings: [7.8, 8.6, 8.2, 8.7, 9.1] },
  { id: 504, team: "ENG", name: "Jude Bellingham", position: "MF", goals: 3, xg: 2.2, assists: 2, minutes: 405, ratings: [7.1, 7.3, 7.9, 7.6, 8.2] },
  { id: 505, team: "ARG", name: "Lionel Messi", position: "FW", goals: 3, xg: 2.8, assists: 3, minutes: 366, ratings: [7.9, 8.1, 7.8, 8.0, 8.3] },
  { id: 506, team: "KOR", name: "Son Heung-min", position: "FW", goals: 4, xg: 2.3, assists: 1, minutes: 388, ratings: [6.9, 7.2, 7.4, 7.7, 8.6] },
  { id: 507, team: "NED", name: "Cody Gakpo", position: "FW", goals: 3, xg: 2.5, assists: 1, minutes: 360, ratings: [7.2, 7.5, 7.3, 7.8, 7.9] },
  { id: 508, team: "MAR", name: "Achraf Hakimi", position: "DF", goals: 1, xg: 0.6, assists: 3, minutes: 450, ratings: [7.5, 7.4, 7.8, 7.7, 8.1] },
  { id: 509, team: "CRO", name: "Joško Gvardiol", position: "DF", goals: 2, xg: 0.9, assists: 0, minutes: 450, ratings: [7.0, 7.2, 7.5, 7.4, 8.0] },
  { id: 510, team: "USA", name: "Christian Pulisic", position: "FW", goals: 2, xg: 1.8, assists: 2, minutes: 359, ratings: [7.3, 7.0, 7.6, 7.4, 7.8] },
  { id: 511, team: "SUI", name: "Granit Xhaka", position: "MF", goals: 1, xg: 0.4, assists: 2, minutes: 450, ratings: [7.1, 7.3, 7.2, 7.6, 7.7] },
  { id: 512, team: "ITA", name: "Federico Chiesa", position: "FW", goals: 2, xg: 1.5, assists: 1, minutes: 312, ratings: [6.8, 7.1, 7.5, 7.3, 7.6] },
];

export function demoPlayers(now = Date.now()): PlayerWithForm[] {
  const teams = new Map(demoTeams().map((t) => [t.id, t]));
  return PLAYER_SEEDS.map((s) => {
    const teamId = T[s.team];
    const form: FormSnapshot[] = s.ratings.map((rating, i) => {
      const progress = (i + 1) / s.ratings.length;
      return {
        player_id: s.id,
        snapshot_date: dateOnly(i - (s.ratings.length - 1), now),
        goals: Math.round(s.goals * progress),
        assists: Math.round(s.assists * progress),
        xg: Number((s.xg * progress).toFixed(1)),
        minutes: Math.round(s.minutes * progress),
        rating,
        form_delta: i === 0 ? 0 : Number((rating - s.ratings[i - 1]).toFixed(1)),
      };
    });
    return {
      id: s.id,
      team_id: teamId,
      name: s.name,
      position: s.position,
      photo_url: null, // provider-licensed photos arrive with a real API key
      stylized_url: null, // Higgsfield caricature queue (§8)
      team: teams.get(teamId) ?? null,
      form,
    };
  });
}

/** Odds movement series for the fixtures inside the editorial window.
 *  Implied probabilities, overround already stripped (§3.4: context, not tips). */
export function demoOdds(now = Date.now()): OddsSnapshotRow[] {
  const rows: OddsSnapshotRow[] = [];
  const series = (
    fixtureId: number,
    market: OddsSnapshotRow["market"],
    points: Array<[number, Record<string, number>]>,
  ) => {
    for (const [hoursAgo, values] of points) {
      rows.push({
        fixture_id: fixtureId,
        captured_at: iso(-hoursAgo, now),
        bookmaker: "Market consensus",
        market,
        values,
      });
    }
  };

  // CRO v MAR — live coin flip.
  series(9110, "match_winner", [
    [46, { home: 0.36, draw: 0.31, away: 0.33 }],
    [30, { home: 0.35, draw: 0.31, away: 0.34 }],
    [14, { home: 0.34, draw: 0.32, away: 0.34 }],
    [2, { home: 0.33, draw: 0.32, away: 0.35 }],
  ]);
  series(9110, "total_goals", [[14, { "over_2.5": 0.41, "under_2.5": 0.59 }]]);

  // ITA v USA — the market walks back the favorite: the spicy take.
  series(9111, "match_winner", [
    [46, { home: 0.55, draw: 0.26, away: 0.19 }],
    [30, { home: 0.52, draw: 0.27, away: 0.21 }],
    [14, { home: 0.48, draw: 0.28, away: 0.24 }],
    [2, { home: 0.44, draw: 0.28, away: 0.28 }],
  ]);
  series(9111, "total_goals", [[14, { "over_2.5": 0.38, "under_2.5": 0.62 }]]);

  // BEL v JPN — mild favorite, drifting slightly.
  series(9112, "match_winner", [
    [46, { home: 0.44, draw: 0.28, away: 0.28 }],
    [14, { home: 0.42, draw: 0.28, away: 0.3 }],
    [2, { home: 0.41, draw: 0.28, away: 0.31 }],
  ]);

  // BRA v MEX (R16) — heavy favorite, stable.
  series(9201, "match_winner", [
    [46, { home: 0.63, draw: 0.22, away: 0.15 }],
    [14, { home: 0.62, draw: 0.22, away: 0.16 }],
    [2, { home: 0.62, draw: 0.23, away: 0.15 }],
  ]);

  return rows.sort((a, b) => a.captured_at.localeCompare(b.captured_at));
}
