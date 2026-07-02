import { ApiFootballProvider, type ApiFootballConfig } from "./apiFootball";
import { FootballDataProvider } from "./footballData";
import type { FootballProvider } from "./types";

/**
 * Provider switch (§0.1): API-Football is the single live source;
 * football-data.org is a fallback behind the same interface, enabled only
 * via `PROVIDER=football-data`. Never both in production.
 */
export function getProvider(cfg?: ApiFootballConfig | null): FootballProvider {
  if (process.env.PROVIDER === "football-data") {
    return new FootballDataProvider();
  }
  return new ApiFootballProvider(cfg);
}

export type { FootballProvider };
