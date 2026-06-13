"use client";

import { useEffect, useRef, useState } from "react";
import { EnrichedGame } from "@/types";
import { loadPrefs, markCompleted, markIgnored, unmark, UserPrefs } from "@/lib/userPrefs";

interface GamesResponse {
  total: number;
  processed: number;
  recommendations: EnrichedGame[];
  allEnriched: EnrichedGame[];
  beatenHidden: number;
}

interface UndoState {
  appid: number;
  name: string;
  type: "completed" | "ignored";
}

function GameCard({
  game,
  rank,
  onMarkCompleted,
  onMarkIgnored,
}: {
  game: EnrichedGame;
  rank: number;
  onMarkCompleted: () => void;
  onMarkIgnored: () => void;
}) {
  const imgUrl = game.img_icon_url
    ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
    : null;

  const hoursLeft =
    game.remainingHours !== null
      ? game.remainingHours < 1
        ? `~${Math.round(game.remainingHours * 60)}m left (est.)`
        : `~${game.remainingHours.toFixed(1)}h left (est.)`
      : null;

  const rankColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
  const rankLabel = ["🥇", "🥈", "🥉"][rank] ?? `#${rank + 1}`;

  return (
    <div className="bg-gray-800 rounded-2xl p-5 flex gap-4 items-start border border-gray-700 transition-all">
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
            <span>⏱ ~{Math.round(game.hltbMainHours)}h avg to beat</span>
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
              <span>~{game.percentComplete}% of avg</span>
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

        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-700/50">
          <button
            onClick={onMarkCompleted}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-400 transition-colors"
            title="I've beaten the main story"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Beaten it
          </button>
          <button
            onClick={onMarkIgnored}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 transition-colors"
            title="No clear ending — roguelike, sandbox, etc."
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            No ending / Skip
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<GamesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topN, setTopN] = useState(5);
  const [prefs, setPrefs] = useState<UserPrefs>({ completed: [], ignored: [] });
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load prefs from localStorage once on mount
  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/games")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/";
          return null;
        }
        if (!r.ok) throw new Error("Failed to load games");
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []); // fetch once; client-side topN / pref filtering does the rest

  function showUndo(appid: number, name: string, type: UndoState["type"]) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ appid, name, type });
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
  }

  function handleMarkCompleted(game: EnrichedGame) {
    const updated = markCompleted(game.appid);
    setPrefs(updated);
    showUndo(game.appid, game.name, "completed");
  }

  function handleMarkIgnored(game: EnrichedGame) {
    const updated = markIgnored(game.appid);
    setPrefs(updated);
    showUndo(game.appid, game.name, "ignored");
  }

  function handleUndo() {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const updated = unmark(undo.appid);
    setPrefs(updated);
    setUndo(null);
  }

  const dismissedSet = new Set([...prefs.completed, ...prefs.ignored]);
  const visible = (data?.recommendations ?? [])
    .filter((g) => !dismissedSet.has(g.appid))
    .slice(0, topN);

  const userHiddenCount = (data?.recommendations ?? []).filter((g) =>
    dismissedSet.has(g.appid)
  ).length;

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
              Fetching your library and looking up completion times via IGDB…
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
                you&apos;re closest to finishing — ranked by estimated hours
                remaining.
              </p>
              <p className="text-xs text-gray-600">
                Times are averages from IGDB and will vary based on your pace
                and playstyle.
                {data.beatenHidden > 0 && (
                  <span className="text-amber-600/80">
                    {" "}{data.beatenHidden} game{data.beatenHidden > 1 ? "s" : ""} with
                    story-completion achievements were hidden.
                  </span>
                )}
                {userHiddenCount > 0 && (
                  <span className="text-gray-500">
                    {" "}{userHiddenCount} hidden by you.
                  </span>
                )}
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

            {visible.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400">
                <p className="text-4xl mb-3">🎉</p>
                <p className="font-semibold">No shelf of shame found!</p>
                <p className="text-sm mt-1">
                  Either your backlog is clear, you&apos;ve already beaten
                  everything, or IGDB didn&apos;t have completion data for
                  your games.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visible.map((game, i) => (
                  <GameCard
                    key={game.appid}
                    game={game}
                    rank={i}
                    onMarkCompleted={() => handleMarkCompleted(game)}
                    onMarkIgnored={() => handleMarkIgnored(game)}
                  />
                ))}
              </div>
            )}

            <p className="text-xs text-gray-600 text-center">
              Avg completion times from IGDB · Main story · estimates only ·{" "}
              {data.processed} games checked
            </p>
          </>
        )}
      </main>

      {/* Undo toast */}
      {undo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-700 text-sm text-white px-4 py-2.5 rounded-full shadow-xl border border-gray-600 z-50">
          <span className="text-gray-300">
            {undo.type === "completed" ? "Marked as beaten:" : "Skipped:"}{" "}
            <span className="text-white font-medium">{undo.name}</span>
          </span>
          <button
            onClick={handleUndo}
            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
