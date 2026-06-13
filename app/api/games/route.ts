import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getOwnedGames } from "@/lib/steam";
import { enrichGames, rankByRemainingTime } from "@/lib/hltb";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.steamId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const topN = limitParam ? parseInt(limitParam, 10) : 5;

  try {
    const allGames = await getOwnedGames(session.steamId);

    // Limit to 100 games for HLTB lookup performance; prioritise played games
    const sorted = [...allGames].sort(
      (a, b) => b.playtime_forever - a.playtime_forever
    );
    const candidates = sorted.slice(0, 100);

    const enriched = await enrichGames(candidates);
    const ranked = rankByRemainingTime(enriched);
    const top = ranked.slice(0, topN);

    return NextResponse.json({
      total: allGames.length,
      processed: candidates.length,
      recommendations: top,
      allEnriched: enriched,
    });
  } catch (err) {
    console.error("Games fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}
