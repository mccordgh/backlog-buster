"use client";

import { getCachedGames } from "@/lib/gamesCache";
import { useEffect, useState } from "react";

export function CachedSessionLink() {
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  useEffect(() => {
    const cache = getCachedGames();
    if (cache) setCachedAt(cache.cachedAt);
  }, []);

  if (!cachedAt) return null;

  const date = new Date(cachedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <a
      href="/dashboard"
      className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
    >
      View cached results from {date}
    </a>
  );
}
