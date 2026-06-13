const STORAGE_KEY = "bb:prefs";

export interface UserPrefs {
  completed: number[]; // beaten the main story
  shelved: number[];   // not feeling it / maybe later
  ignored: number[];   // no clear ending (roguelike, sandbox, etc.)
}

function load(): UserPrefs {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw);
    // Backward-compat: old saves may not have shelved
    return {
      completed: p.completed ?? [],
      shelved: p.shelved ?? [],
      ignored: p.ignored ?? [],
    };
  } catch {
    return empty();
  }
}

function empty(): UserPrefs {
  return { completed: [], shelved: [], ignored: [] };
}

function save(prefs: UserPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function loadPrefs(): UserPrefs {
  return load();
}

export function markCompleted(appid: number): UserPrefs {
  const p = load();
  p.completed = [...new Set([...p.completed, appid])];
  p.shelved = p.shelved.filter((id) => id !== appid);
  p.ignored = p.ignored.filter((id) => id !== appid);
  save(p);
  return p;
}

export function markShelved(appid: number): UserPrefs {
  const p = load();
  p.shelved = [...new Set([...p.shelved, appid])];
  p.completed = p.completed.filter((id) => id !== appid);
  p.ignored = p.ignored.filter((id) => id !== appid);
  save(p);
  return p;
}

export function markIgnored(appid: number): UserPrefs {
  const p = load();
  p.ignored = [...new Set([...p.ignored, appid])];
  p.completed = p.completed.filter((id) => id !== appid);
  p.shelved = p.shelved.filter((id) => id !== appid);
  save(p);
  return p;
}

export function unmark(appid: number): UserPrefs {
  const p = load();
  p.completed = p.completed.filter((id) => id !== appid);
  p.shelved = p.shelved.filter((id) => id !== appid);
  p.ignored = p.ignored.filter((id) => id !== appid);
  save(p);
  return p;
}
