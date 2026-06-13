"use client";

import { useEffect, useState } from "react";
import { EnrichedGame } from "@/types";

interface GamesResponse {
  total: number;
  processed: number;
  recommendations: EnrichedGame[];
  allEnriched: EnrichedGame[];
}

function GameCard({
  game,
  rank,
}: {
  game: EnrichedGame;
  rank: number;
}) {
  const imgUrl = game.img_icon_url
    ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
    : null;

  const hoursLeft =
    game.remainingHours !== null
      ? game.remainingHours < 1
        ? `${Math.round(game.remainingHours * 60)}m left`
        : `${game.remainingHours.toFixed(1)}h left`
      : null;

  const rankColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
  const rankLabel = ["🥇", "🥈", "🥉"][rank] ?? `#${rank + 1}`;

  return (
    <div className="bg-gray-800 rounded-2xl p-5 flex gap-4 items-start hover:bg-gray-750 transition-colors border border-gray-700">
      <div className="text-2xl w-8 text-center flex-shrink-0 mt-1">
        <span className={rankColors[rank] ?? "text-gray-400"}>{rankLabel}</span>
      </div>

      {imgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl}
          alt={game.name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-700 flex-shrink-0 flex items-center justify-center text-2xl">
          🎮
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white truncate">{game.name}</h3>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-400">
          {game.hltbMainHours !== null && (
            <span>⏱ {game.hltbMainHours}h to beat</span>
          )}
          {game.playtimeHours > 0 && (
            <span>🕹 {game.playtimeHours.toFixed(1)}h played</span>
          )}
          {hoursLeft && (
            <span className="text-green-400 font-medium">{hoursLeft}</span>
          )}
        </div>

        {game.percentComplete !== null && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{game.percentComplete}% complete</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${game.percentComplete}%` }}
              />
            </div>
          </div>
        )}

        {game.playtimeHours === 0 && (
          <span className="mt-1 inline-block text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full">
            Not started
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<GamesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topN, setTopN] = useState(5);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/games?limit=${topN}`)
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/";
          return null;
        }
        if (!r.ok) throw new Error("Failed to load games");
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [topN]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">🎮 Backlog Buster</h1>
        <a
          href="/api/auth/logout"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Sign out
        </a>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {loading && (
          <div className="text-center space-y-4 py-20">
            <div className="text-4xl animate-spin inline-block">⚙️</div>
            <p className="text-gray-400">
              Fetching your library and looking up completion times…
              <br />
              <span className="text-sm">This can take a minute for large libraries.</span>
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300">
            {error}
          </div>
        )}

        {!loading && data && (
          <>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Your Shelf of Shame</h2>
              <p className="text-gray-400 text-sm">
                From {data.total} games in your library, here are the ones
                you&apos;re closest to finishing:
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-400">Show top</span>
              {[3, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setTopN(n)}
                  className={`px-3 py-1 rounded-full border transition-colors ${
                    topN === n
                      ? "bg-green-600 border-green-500 text-white"
                      : "border-gray-600 text-gray-400 hover:border-gray-400"
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="text-gray-400">games</span>
            </div>

            {data.recommendations.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400">
                <p className="text-4xl mb-3">🎉</p>
                <p className="font-semibold">No shelf of shame found!</p>
                <p className="text-sm mt-1">
                  Either your library is spotless or IGDB didn&apos;t
                  have data for your games.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recommendations.map((game, i) => (
                  <GameCard key={game.appid} game={game} rank={i} />
                ))}
              </div>
            )}

            <p className="text-xs text-gray-600 text-center">
              Completion times from IGDB · Main story only ·{" "}
              {data.processed} games checked
            </p>
          </>
        )}
      </main>
    </div>
  );
}
