// Process-local sliding-window limiter. Use a shared store (for example Redis)
// before deploying multiple application instances.
type Entry = { timestamps: number[]; lastSeen: number };

const WINDOW_MS = 15 * 60 * 1000;
const ALIAS_LIMIT = 5;
const IP_LIMIT = 20;
const aliases = new Map<string, Entry>();
const ips = new Map<string, Entry>();
const MAX_KEYS = 10_000;

function getClientIp(request: Request): string {
  // Hosting platforms should overwrite these headers at the trusted edge.
  // Do not expose the app directly to untrusted clients that can spoof them.
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return (forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown").slice(0, 64);
}

function pruneEntry(map: Map<string, Entry>, key: string, now: number): number[] {
  const entry = map.get(key);
  if (!entry) return [];
  entry.timestamps = entry.timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
  entry.lastSeen = now;
  if (entry.timestamps.length === 0) {
    map.delete(key);
    return [];
  }
  return entry.timestamps;
}

function record(map: Map<string, Entry>, key: string, now: number): void {
  const entry = map.get(key) ?? { timestamps: [], lastSeen: now };
  entry.timestamps.push(now);
  entry.lastSeen = now;
  map.set(key, entry);
}

function trimOldest(map: Map<string, Entry>): void {
  if (map.size <= MAX_KEYS) return;
  const oldest = [...map.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen);
  for (const [key] of oldest.slice(0, map.size - MAX_KEYS)) map.delete(key);
}

export function checkRateLimit(
  request: Request,
  alias?: string,
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const ip = getClientIp(request);
  const normalizedAlias = alias?.trim().toLowerCase();

  const ipTimes = pruneEntry(ips, ip, now);
  const aliasTimes = normalizedAlias ? pruneEntry(aliases, normalizedAlias, now) : [];
  const ipBlocked = ipTimes.length >= IP_LIMIT;
  const aliasBlocked = aliasTimes.length >= ALIAS_LIMIT;

  if (ipBlocked || aliasBlocked) {
    const relevant = [
      ...(ipBlocked ? ipTimes : []),
      ...(aliasBlocked ? aliasTimes : []),
    ];
    const oldest = Math.min(...relevant);
    return { allowed: false, retryAfterMs: Math.max(0, WINDOW_MS - (now - oldest)) };
  }

  record(ips, ip, now);
  if (normalizedAlias) record(aliases, normalizedAlias, now);
  trimOldest(ips);
  trimOldest(aliases);
  return { allowed: true };
}
