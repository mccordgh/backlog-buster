import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { checkLikelyBeaten, getOwnedGames } from "@/lib/steam";
import { enrichGames, rankByRemainingTime } from "@/lib/igdb";

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

    // Limit to 100 games for IGDB lookup performance; prioritise played games
    const sorted = [...allGames].sort(
      (a, b) => b.playtime_forever - a.playtime_forever
    );
    const candidates = sorted.slice(0, 100);

    const enriched = await enrichGames(candidates);
    const ranked = rankByRemainingTime(enriched);

    // Check achievements for a pool 3× topN (capped at 30) so we have
    // enough backfills after filtering out likely-beaten games.
    const poolSize = Math.min(topN * 3, 30, ranked.length);
    const pool = ranked.slice(0, poolSize);

    const checkedPool = await Promise.all(
      pool.map(async (game) => {
        // Skip achievement check for games never launched
        if (game.playtimeHours === 0) return { ...game, likelyBeaten: false };
        const likelyBeaten = await checkLikelyBeaten(session.steamId!, game.appid);
        return { ...game, likelyBeaten };
      })
    );

    const notBeaten = checkedPool.filter((g) => !g.likelyBeaten);
    const recommendations = notBeaten.slice(0, topN);
    const beatenHidden = checkedPool.length - notBeaten.length;

    return NextResponse.json({
      total: allGames.length,
      processed: candidates.length,
      recommendations,
      allEnriched: enriched,
      beatenHidden,
    });
  } catch (err) {
    console.error("Games fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}
