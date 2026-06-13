import { HowLongToBeatService } from "howlongtobeat";
import { EnrichedGame, SteamGame } from "@/types";

const hltbService = new HowLongToBeatService();

async function lookupHltb(gameName: string): Promise<number | null> {
  try {
    const results = await hltbService.search(gameName);
    if (!results || results.length === 0) return null;

    // Pick highest-similarity result that has main story time
    const best = results
      .filter((r) => r.gameplayMain > 0)
      .sort((a, b) => b.similarity - a.similarity)[0];

    return best ? best.gameplayMain : null;
  } catch {
    return null;
  }
}

export async function enrichGames(games: SteamGame[]): Promise<EnrichedGame[]> {
  // Process in batches of 5 to avoid hammering HLTB
  const BATCH_SIZE = 5;
  const enriched: EnrichedGame[] = [];

  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const batch = games.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (game) => {
        const hltbMainHours = await lookupHltb(game.name);
        const playtimeHours = game.playtime_forever / 60;

        let remainingHours: number | null = null;
        let isCompleted = false;
        let percentComplete: number | null = null;

        if (hltbMainHours !== null) {
          remainingHours = Math.max(0, hltbMainHours - playtimeHours);
          isCompleted = playtimeHours >= hltbMainHours;
          percentComplete = Math.min(
            100,
            Math.round((playtimeHours / hltbMainHours) * 100)
          );
        }

        return {
          ...game,
          hltbMainHours,
          playtimeHours,
          remainingHours,
          isCompleted,
          percentComplete,
        } satisfies EnrichedGame;
      })
    );
    enriched.push(...results);

    // Polite delay between batches
    if (i + BATCH_SIZE < games.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return enriched;
}

export function rankByRemainingTime(games: EnrichedGame[]): EnrichedGame[] {
  return games
    .filter((g) => !g.isCompleted && g.remainingHours !== null)
    .sort((a, b) => (a.remainingHours ?? Infinity) - (b.remainingHours ?? Infinity));
}
