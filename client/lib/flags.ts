import { getDB } from "./vault";

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
