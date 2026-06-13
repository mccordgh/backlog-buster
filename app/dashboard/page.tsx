"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EnrichedGame } from "@/types";
import {
  loadPrefs,
  markCompleted,
  markIgnored,
  markShelved,
  unmark,
  UserPrefs,
} from "@/lib/userPrefs";

interface GamesResponse {
  total: number;
  processed: number;
  recommendations: EnrichedGame[];
  allEnriched: EnrichedGame[];
  beatenHidden: number;
}

type DismissType = "completed" | "shelved" | "ignored";
type Tab = "main" | "completed" | "dismissed";

interface UndoState {
  appid: number;
  name: string;
  type: DismissType;
}

// ── Tooltip wrapper ──────────────────────────────────────────────────────────
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-950 text-xs text-gray-300 rounded-lg border border-gray-700 whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
        {label}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
      </div>
    </div>
  );
}

// ── Shared game row used in Completed + Dismissed tabs ───────────────────────
function GameRow({
  appid,
  game,
  onRestore,
}: {
  appid: number;
  game?: EnrichedGame;
  onRestore: () => void;
}) {
  const imgUrl =
    game?.img_icon_url
      ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${game.img_icon_url}.jpg`
      : null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-800 rounded-xl border border-gray-700">
      {imgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgUrl} alt={game?.name ?? ""} className="w-8 h-8 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded bg-gray-700 flex-shrink-0 flex items-center justify-center text-sm">🎮</div>
      )}
      <span className="flex-1 text-sm text-gray-300 truncate">
        {game?.name ?? `App #${appid}`}
      </span>
      <button
        onClick={onRestore}
        className="text-xs text-gray-500 hover:text-white transition-colors cursor-pointer flex-shrink-0"
      >
        Restore
      </button>
    </div>
  );
}

// ── Game card ────────────────────────────────────────────────────────────────
function GameCard({
  game,
  rank,
  onMarkCompleted,
  onMarkShelved,
  onMarkIgnored,
}: {
  game: EnrichedGame;
  rank: number;
  onMarkCompleted: () => void;
  onMarkShelved: () => void;
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
    <div className="bg-gray-800 rounded-2xl p-5 flex gap-4 items-start border border-gray-700">
      <div className="text-2xl w-8 text-center flex-shrink-0 mt-1">
        <span className={rankColors[rank] ?? "text-gray-400"}>{rankLabel}</span>
      </div>

      {imgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgUrl} alt={game.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-700 flex-shrink-0 flex items-center justify-center text-2xl">🎮</div>
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
          {hoursLeft && <span className="text-green-400 font-medium">{hoursLeft}</span>}
        </div>

        {game.percentComplete !== null && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">~{game.percentComplete}% of avg</div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${game.percentComplete}%` }} />
            </div>
          </div>
        )}

        {game.playtimeHours === 0 && (
          <span className="mt-1 inline-block text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full">
            Not started
          </span>
        )}

        <div className="flex gap-5 mt-3 pt-3 border-t border-gray-700/50">
          <Tip label="I've seen the credits on this one">
            <button onClick={onMarkCompleted} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-400 transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Beaten it
            </button>
          </Tip>

          <Tip label="Not feeling it right now — maybe later">
            <button onClick={onMarkShelved} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-yellow-400 transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Not right now
            </button>
          </Tip>

          <Tip label="No clear ending — roguelike, sandbox, endless game">
            <button onClick={onMarkIgnored} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              No ending
            </button>
          </Tip>
        </div>
      </div>
    </div>
  );
}

// ── Completed tab ────────────────────────────────────────────────────────────
function CompletedTab({
  prefs,
  gameMap,
  onRestore,
}: {
  prefs: UserPrefs;
  gameMap: Map<number, EnrichedGame>;
  onRestore: (appid: number) => void;
}) {
  if (prefs.completed.length === 0) {
    return (
      <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-500 border border-gray-700">
        <p className="text-3xl mb-3">🏆</p>
        <p className="font-semibold text-gray-400">No completed games yet</p>
        <p className="text-sm mt-1">
          Hit &ldquo;Beaten it&rdquo; on any game card to log it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {prefs.completed.map((appid) => (
        <GameRow
          key={appid}
          appid={appid}
          game={gameMap.get(appid)}
          onRestore={() => onRestore(appid)}
        />
      ))}
    </div>
  );
}

// ── Dismissed tab ────────────────────────────────────────────────────────────
const DISMISS_GROUPS: { key: "shelved" | "ignored"; label: string; icon: string; color: string }[] = [
  { key: "shelved", label: "Shelved — Not right now", icon: "⏸", color: "text-yellow-400" },
  { key: "ignored", label: "No Ending",               icon: "⊘", color: "text-gray-400" },
];

function DismissedTab({
  prefs,
  gameMap,
  onRestore,
}: {
  prefs: UserPrefs;
  gameMap: Map<number, EnrichedGame>;
  onRestore: (appid: number) => void;
}) {
  const total = prefs.shelved.length + prefs.ignored.length;

  if (total === 0) {
    return (
      <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-500 border border-gray-700">
        <p className="text-3xl mb-3">📭</p>
        <p className="font-semibold text-gray-400">Nothing dismissed yet</p>
        <p className="text-sm mt-1">
          Use &ldquo;Not right now&rdquo; or &ldquo;No ending&rdquo; on any game card.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {DISMISS_GROUPS.map(({ key, label, icon, color }) => {
        const ids = prefs[key];
        if (ids.length === 0) return null;
        return (
          <div key={key}>
            <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${color}`}>
              {icon} {label}
              <span className="text-gray-600 font-normal">({ids.length})</span>
            </h3>
            <div className="space-y-1">
              {ids.map((appid) => (
                <GameRow
                  key={appid}
                  appid={appid}
                  game={gameMap.get(appid)}
                  onRestore={() => onRestore(appid)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<GamesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topN, setTopN] = useState(5);
  const [tab, setTab] = useState<Tab>("main");
  const [prefs, setPrefs] = useState<UserPrefs>({ completed: [], shelved: [], ignored: [] });
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setPrefs(loadPrefs()); }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/games")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/"; return null; }
        if (!r.ok) throw new Error("Failed to load games");
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const gameMap = useMemo(() => {
    const map = new Map<number, EnrichedGame>();
    data?.allEnriched.forEach((g) => map.set(g.appid, g));
    data?.recommendations.forEach((g) => map.set(g.appid, g));
    return map;
  }, [data]);

  function showUndo(appid: number, name: string, type: DismissType) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ appid, name, type });
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
  }

  function dismiss(game: EnrichedGame, type: DismissType) {
    const fn = type === "completed" ? markCompleted
              : type === "shelved"  ? markShelved
              : markIgnored;
    setPrefs(fn(game.appid));
    showUndo(game.appid, game.name, type);
  }

  function handleRestore(appid: number) {
    setPrefs(unmark(appid));
  }

  function handleUndo() {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setPrefs(unmark(undo.appid));
    setUndo(null);
  }

  const dismissedSet = new Set([...prefs.completed, ...prefs.shelved, ...prefs.ignored]);
  const visible = (data?.recommendations ?? []).filter((g) => !dismissedSet.has(g.appid)).slice(0, topN);
  const userHiddenCount = (data?.recommendations ?? []).filter((g) => dismissedSet.has(g.appid)).length;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "main",      label: "Shelf of Shame" },
    { id: "completed", label: "Completed", badge: prefs.completed.length || undefined },
    { id: "dismissed", label: "Dismissed",
      badge: (prefs.shelved.length + prefs.ignored.length) || undefined },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">🎮 Backlog Buster</h1>
        <a href="/api/auth/logout" className="text-sm text-gray-400 hover:text-white transition-colors">
          Sign out
        </a>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Tab nav */}
        <div className="flex gap-1 p-1 bg-gray-800 rounded-xl w-fit border border-gray-700">
          {tabs.map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                tab === id ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {label}
              {badge !== undefined && (
                <span className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded-full leading-none">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Shelf of Shame tab ── */}
        {tab === "main" && (
          <>
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
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300">{error}</div>
            )}

            {!loading && data && (
              <>
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold">Your Shelf of Shame</h2>
                  <p className="text-gray-400 text-sm">
                    From {data.total} games in your library, here are the ones
                    you&apos;re closest to finishing — ranked by estimated hours remaining.
                  </p>
                  <p className="text-xs text-gray-600">
                    Times are averages from IGDB and will vary based on your pace and playstyle.
                    {data.beatenHidden > 0 && (
                      <span className="text-amber-600/80">
                        {" "}{data.beatenHidden} game{data.beatenHidden > 1 ? "s" : ""} with
                        story-completion achievements were hidden.
                      </span>
                    )}
                    {userHiddenCount > 0 && (
                      <span className="text-gray-500">
                        {" "}{userHiddenCount} hidden by you.{" "}
                        <button
                          onClick={() => setTab("dismissed")}
                          className="underline hover:text-gray-300 cursor-pointer"
                        >
                          Manage
                        </button>
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <label htmlFor="topN" className="text-gray-400">Show top</label>
                  <select
                    id="topN"
                    value={topN}
                    onChange={(e) => setTopN(Number(e.target.value))}
                    className="bg-gray-800 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-1.5 cursor-pointer focus:outline-none focus:border-green-500"
                  >
                    <option value={5}>5 games</option>
                    <option value={10}>10 games</option>
                    <option value={25}>25 games</option>
                  </select>
                </div>

                {visible.length === 0 ? (
                  <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 border border-gray-700">
                    <p className="text-4xl mb-3">🎉</p>
                    <p className="font-semibold">No shelf of shame found!</p>
                    <p className="text-sm mt-1">
                      Either your backlog is clear, you&apos;ve already beaten everything,
                      or IGDB didn&apos;t have completion data for your games.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visible.map((game, i) => (
                      <GameCard
                        key={game.appid}
                        game={game}
                        rank={i}
                        onMarkCompleted={() => dismiss(game, "completed")}
                        onMarkShelved={() => dismiss(game, "shelved")}
                        onMarkIgnored={() => dismiss(game, "ignored")}
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
          </>
        )}

        {/* ── Completed tab ── */}
        {tab === "completed" && (
          <>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Completed Games</h2>
              <p className="text-gray-400 text-sm">Games you&apos;ve beaten. Click Restore to move one back to your shelf.</p>
            </div>
            <CompletedTab prefs={prefs} gameMap={gameMap} onRestore={handleRestore} />
          </>
        )}

        {/* ── Dismissed tab ── */}
        {tab === "dismissed" && (
          <>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Dismissed Games</h2>
              <p className="text-gray-400 text-sm">
                Games shelved for later or skipped due to no clear ending. Click Restore to bring any back.
              </p>
            </div>
            <DismissedTab prefs={prefs} gameMap={gameMap} onRestore={handleRestore} />
          </>
        )}
      </main>

      {/* Undo toast */}
      {undo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-700 text-sm text-white px-4 py-2.5 rounded-full shadow-xl border border-gray-600 z-50">
          <span className="text-gray-300">
            {undo.type === "completed" ? "Marked as beaten:" : undo.type === "shelved" ? "Shelved:" : "Skipped:"}{" "}
            <span className="text-white font-medium">{undo.name}</span>
          </span>
          <button onClick={handleUndo} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer">
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
