import { getDB } from "./vault";

const TOUR_COMPLETED_STORAGE_KEY = "cloak.tour-completed";

export async function getFlag(key: string): Promise<boolean> {
  if (!key.trim()) throw new Error("A flag key is required.");
  const db = await getDB();
  const row = await db.flags.get(key);
  return row?.value === true;
}

export async function setFlag(key: string, value: boolean): Promise<void> {
  if (!key.trim()) throw new Error("A flag key is required.");
  const db = await getDB();
  await db.flags.put({ key, value });
}

export async function getTourCompletedState(): Promise<boolean> {
  let tourCompleted = false;

  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(TOUR_COMPLETED_STORAGE_KEY);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch {
      // IndexedDB remains the persistent source when localStorage is blocked.
    }
    tourCompleted = await getFlag("tour-completed");
  }

  return tourCompleted;
}
