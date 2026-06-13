import { EnrichedGame, SteamGame } from "@/types";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_BASE = "https://api.igdb.com/v4";
// Steam's external_game_source value in IGDB — verified via external_games lookup
const STEAM_SOURCE_ID = 1;

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
      expiresAt: Date.now() + (data.expires_in - 3600) * 1000,
    };
    return tokenCache.token;
  } catch {
    return null;
  }
}

async function igdbPost(
  endpoint: string,
  body: string,
  token: string
): Promise<unknown[]> {
  try {
    const res = await fetch(`${IGDB_BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function enrichGames(games: SteamGame[]): Promise<EnrichedGame[]> {
  const noData = (game: SteamGame): EnrichedGame => ({
    ...game,
    hltbMainHours: null,
    playtimeHours: game.playtime_forever / 60,
    remainingHours: null,
    isCompleted: false,
    percentComplete: null,
  });

  const token = await getAccessToken();
  if (!token) return games.map(noData);

  // Step 1: Batch-resolve Steam App IDs → IGDB game IDs via external_games.
  // external_game_source = 1 is Steam (verified: uid "620" → game 72 = Portal 2).
  const uidList = games.map((g) => `"${g.appid}"`).join(",");
  const externalGames = (await igdbPost(
    "external_games",
    `fields game, uid; where uid = (${uidList}) & external_game_source = ${STEAM_SOURCE_ID}; limit 500;`,
    token
  )) as Array<{ game: number; uid: string }>;

  const steamToIgdb = new Map<number, number>();
  for (const eg of externalGames) {
    steamToIgdb.set(Number(eg.uid), eg.game);
  }

  // Step 2: Batch-fetch completion times for all resolved IGDB game IDs.
  const igdbIds = [...new Set(steamToIgdb.values())];
  const igdbToNormally = new Map<number, number>();

  if (igdbIds.length > 0) {
    const timings = (await igdbPost(
      "game_time_to_beats",
      `fields game_id, normally; where game_id = (${igdbIds.join(",")}); limit 500;`,
      token
    )) as Array<{ game_id: number; normally: number }>;

    for (const t of timings) {
      if (t.normally && t.normally > 0) {
        igdbToNormally.set(t.game_id, t.normally);
      }
    }
  }

  // Step 3: Enrich each game with the looked-up completion time.
  return games.map((game) => {
    const igdbId = steamToIgdb.get(game.appid);
    const normallySeconds =
      igdbId !== undefined ? igdbToNormally.get(igdbId) : undefined;
    const hltbMainHours =
      normallySeconds !== undefined ? normallySeconds / 3600 : null;
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
  });
}

export function rankByRemainingTime(games: EnrichedGame[]): EnrichedGame[] {
  return games
    .filter((g) => !g.isCompleted && g.remainingHours !== null)
    .sort(
      (a, b) =>
        (a.remainingHours ?? Infinity) - (b.remainingHours ?? Infinity)
    );
}
