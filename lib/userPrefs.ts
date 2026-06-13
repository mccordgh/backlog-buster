const STORAGE_KEY = "bb:prefs";

export interface UserPrefs {
  completed: number[]; // appids the user has beaten
  ignored: number[];   // appids the user wants to skip (no ending, etc.)
}

function load(): UserPrefs {
  if (typeof window === "undefined") return { completed: [], ignored: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completed: [], ignored: [] };
  } catch {
    return { completed: [], ignored: [] };
  }
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
  p.ignored = p.ignored.filter((id) => id !== appid);
  save(p);
  return p;
}

export function markIgnored(appid: number): UserPrefs {
  const p = load();
  p.ignored = [...new Set([...p.ignored, appid])];
  p.completed = p.completed.filter((id) => id !== appid);
  save(p);
  return p;
}

export function unmark(appid: number): UserPrefs {
  const p = load();
  p.completed = p.completed.filter((id) => id !== appid);
  p.ignored = p.ignored.filter((id) => id !== appid);
  save(p);
  return p;
}
