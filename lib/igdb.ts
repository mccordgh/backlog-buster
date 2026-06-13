import { EnrichedGame, SteamGame } from "@/types";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_GAMES_URL = "https://api.igdb.com/v4/games";

// Survives across requests within the same server process
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(
      `${TWITCH_TOKEN_URL}?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: "POST" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    tokenCache = {
      token: data.access_token,
      // Expire 1 hour before Twitch's actual expiry date
      expiresAt: Date.now() + (data.expires_in - 3600) * 1000,
    };
    return tokenCache.token;
  } catch {
    return null;
  }
}

async function lookupMainStoryHours(gameName: string): Promise<number | null> {
  const token = await getAccessToken();
  if (!token) return null;

  // Strip characters that break Apicalypse query syntax
  const safe = gameName.replace(/["\\\n\r]/g, "").slice(0, 100);

  try {
    const res = await fetch(IGDB_GAMES_URL, {
      method: "POST",
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: `fields name, time_to_beat.normally; search "${safe}"; limit 5;`,
    });

    if (!res.ok) return null;
    const games = await res.json();
    if (!Array.isArray(games)) return null;

    for (const game of games) {
      const normally = game.time_to_beat?.normally;
      if (normally && normally > 0) {
        return normally / 3600; // seconds → hours
      }
    }
  } catch {
    // network error or JSON parse failure
  }

  return null;
}

export async function enrichGames(games: SteamGame[]): Promise<EnrichedGame[]> {
  // IGDB allows 4 requests/second — batch at 4 with a 300 ms delay between batches
  const BATCH_SIZE = 4;
  const enriched: EnrichedGame[] = [];

  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const batch = games.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (game) => {
        const hltbMainHours = await lookupMainStoryHours(game.name);
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

    if (i + BATCH_SIZE < games.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return enriched;
}

export function rankByRemainingTime(games: EnrichedGame[]): EnrichedGame[] {
  return games
    .filter((g) => !g.isCompleted && g.remainingHours !== null)
    .sort(
      (a, b) => (a.remainingHours ?? Infinity) - (b.remainingHours ?? Infinity)
    );
}
