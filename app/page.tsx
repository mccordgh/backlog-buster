import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session.steamId) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight">
            🎮 Backlog Buster
          </h1>
          <p className="text-gray-400 text-lg">
            Slay your shelf of shame. Find the games you can{" "}
            <span className="text-green-400 font-semibold">actually finish</span>{" "}
            right now.
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 space-y-4 text-left text-sm text-gray-300">
          <p>✅ Connects to your Steam library</p>
          <p>⏱️ Pulls completion times from HowLongToBeat</p>
          <p>📊 Ranks games by how close you are to finishing</p>
          <p>🏆 Shows your top picks to clear the backlog</p>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-900/30 px-4 py-2 rounded-lg">
            {error === "auth_failed"
              ? "Steam authentication failed. Please try again."
              : "Something went wrong. Please try again."}
          </p>
        )}

        <a
          href="/api/auth/steam"
          className="flex items-center justify-center gap-3 w-full bg-[#1b2838] hover:bg-[#2a475e] border border-[#66c0f4]/30 hover:border-[#66c0f4] text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#66c0f4]">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.38l3.09-12.8a3.4 3.4 0 0 1-.3-1.38 3.4 3.4 0 0 1 3.4-3.4 3.4 3.4 0 0 1 3.4 3.4 3.4 3.4 0 0 1-3.4 3.4h-.08l-3.17 4.6A6 6 0 0 0 18 12a6 6 0 0 0-6-6 6 6 0 0 0-6 6 6 6 0 0 0 .17 1.4L1.8 11.6A10.2 10.2 0 0 1 12 1.8a10.2 10.2 0 0 1 10.2 10.2A10.2 10.2 0 0 1 12 22.2a10.2 10.2 0 0 1-7.1-2.9l2.5-3.6A6 6 0 0 0 12 18a6 6 0 0 0 6-6 6 6 0 0 0-6-6z" />
          </svg>
          Sign in with Steam
        </a>

        <p className="text-xs text-gray-600">
          We only read your public game library. No passwords are stored.
        </p>
      </div>
    </main>
  );
}
