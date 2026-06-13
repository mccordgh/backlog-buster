import { SteamGame } from "@/types";

const STEAM_API_KEY = process.env.STEAM_API_KEY!;
const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";

export function buildSteamLoginUrl(returnTo: string, realm: string): string {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

export async function verifySteamCallback(
  params: URLSearchParams
): Promise<string | null> {
  const verifyParams = new URLSearchParams(params);
  verifyParams.set("openid.mode", "check_authentication");

  const response = await fetch(STEAM_OPENID_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });

  const text = await response.text();
  if (!text.includes("is_valid:true")) return null;

  // Steam identity URL: https://steamcommunity.com/openid/id/<steamid64>
  const claimedId = params.get("openid.claimed_id") ?? "";
  const match = claimedId.match(/\/openid\/id\/(\d+)$/);
  return match ? match[1] : null;
}

export async function getSteamProfile(steamId: string): Promise<{
  name: string;
  avatar: string;
} | null> {
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const player = data?.response?.players?.[0];
  if (!player) return null;

  return { name: player.personaname, avatar: player.avatarmedium };
}

// Phrases commonly found in story-completion achievement names / descriptions.
// Checked case-insensitively against both the display name and description fields.
const STORY_KEYWORDS = [
  "finish the story", "complete the story",
  "finish the main", "complete the main",
  "finish the campaign", "complete the campaign",
  "finish the game", "complete the game",
  "beat the game", "beaten the game",
  "watch the credits", "see the credits", "roll credits", "ending credits",
  "reach the ending", "see the ending", "true ending",
  "the final chapter", "final mission",
];

export async function checkLikelyBeaten(
  steamId: string,
  appid: number
): Promise<boolean> {
  try {
    const url =
      `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/` +
      `?key=${STEAM_API_KEY}&steamid=${steamId}&appid=${appid}&l=english`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return false;
    const data = await res.json();
    const achievements: Array<{
      achieved: number;
      name?: string;
      description?: string;
    }> = data.playerstats?.achievements ?? [];

    return achievements.some((a) => {
      if (!a.achieved) return false;
      const text = `${a.name ?? ""} ${a.description ?? ""}`.toLowerCase();
      return STORY_KEYWORDS.some((kw) => text.includes(kw));
    });
  } catch {
    return false;
  }
}

export async function getOwnedGames(steamId: string): Promise<SteamGame[]> {
  const url =
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/` +
    `?key=${STEAM_API_KEY}&steamid=${steamId}` +
    `&include_appinfo=true&include_played_free_games=false&format=json`;

  const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5min
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);

  const data = await res.json();
  return (data?.response?.games ?? []) as SteamGame[];
}
