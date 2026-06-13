import { GamesResponse } from "@/types";

const KEY = "bb:games-cache";

export interface GamesCache {
  data: GamesResponse;
  cachedAt: number; // Date.now()
}

export function getCachedGames(): GamesCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GamesCache) : null;
  } catch {
    return null;
  }
}

export function setCachedGames(data: GamesResponse): GamesCache {
  const entry: GamesCache = { data, cachedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // localStorage full — silently skip
  }
  return entry;
}

export function clearCachedGames(): void {
  localStorage.removeItem(KEY);
}
