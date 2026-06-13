export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number; // minutes
  img_icon_url: string;
}

export interface EnrichedGame extends SteamGame {
  hltbMainHours: number | null;
  playtimeHours: number;
  remainingHours: number | null;
  isCompleted: boolean;
  percentComplete: number | null;
}

export interface SessionData {
  steamId?: string;
  steamName?: string;
  steamAvatar?: string;
}
