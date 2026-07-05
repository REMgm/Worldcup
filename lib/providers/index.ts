import { ApiFootballProvider, type ApiFootballConfig } from "./apiFootball";
import { EspnProvider } from "./espn";
import { FootballDataProvider } from "./footballData";
import type { FootballProvider } from "./types";

/**
 * Provider switch (§0.1): exactly one provider is active at runtime.
 *
 * - `PROVIDER=api-football` / `football-data` / `espn` selects explicitly.
 * - Default: API-Football when its key is present (the spec's primary),
 *   otherwise the keyless ESPN feed so live data flows with zero keys.
 */
export function getProvider(cfg?: ApiFootballConfig | null): FootballProvider {
  switch (process.env.PROVIDER) {
    case "football-data":
      return new FootballDataProvider();
    case "espn":
      return new EspnProvider();
    case "api-football":
      return new ApiFootballProvider(cfg);
  }
  if (process.env.API_FOOTBALL_KEY) return new ApiFootballProvider(cfg);
  return new EspnProvider();
}

export type { FootballProvider };
