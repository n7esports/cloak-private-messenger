// In-memory rate limiter: 5 per email / 20 per IP per 15 min.
// shortcut: single-process memory only; replace with Redis when scaling to multiple instances.

type Bucket = { emails: Map<string, number[]>; ips: Map<string, number[]> };
const bucket: Bucket = { emails: new Map(), ips: new Map() };
const WINDOW_MS = 15 * 60 * 1000;
const EMAIL_LIMIT = 5;
const IP_LIMIT = 20;

function prune(entries: Map<string, number[]>): number[] {
  const now = Date.now();
  const items: number[] = [];
  for (const [key, timestamps] of entries) {
    const recent = timestamps.filter((t) => now - t < WINDOW_MS);
    if (recent.length === 0) entries.delete(key);
    else entries.set(key, recent);
    items.push(...recent);
  }
  return items;
}

export async function checkRateLimit(request: Request): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  let body: { email?: string } = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch { /* ignore */ }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;

  const emailTimestamps = email ? prune(bucket.emails) : [];
  const ipTimestamps = prune(bucket.ips);

  const emailCount = email ? bucket.emails.get(email)?.length ?? 0 : 0;
  const ipCount = bucket.ips.get(ip)?.length ?? 0;

  if (emailCount >= EMAIL_LIMIT || ipCount >= IP_LIMIT) {
    const allTimestamps = [...emailTimestamps, ...ipTimestamps];
    const oldest = allTimestamps.length > 0 ? Math.min(...allTimestamps) : Date.now();
    return { allowed: false, retryAfterMs: WINDOW_MS - (Date.now() - oldest) };
  }

  const now = Date.now();
  if (email) {
    const prev = bucket.emails.get(email) ?? [];
    prev.push(now);
    bucket.emails.set(email, prev);
  }
  const prevIp = bucket.ips.get(ip) ?? [];
  prevIp.push(now);
  bucket.ips.set(ip, prevIp);

  return { allowed: true };
}
