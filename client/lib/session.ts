const SESSION_COOKIE_NAME = "cloak_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AppSession = {
  sub: string;
  alias: string;
  iat: number;
  exp: number;
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes");
  }

  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(user: { id: string; alias: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AppSession = {
    sub: user.id,
    alias: user.alias,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(),
    new TextEncoder().encode(encodedPayload),
  );

  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<AppSession | null> {
  if (!token) return null;

  try {
    const [encodedPayload, encodedSignature, extra] = token.split(".");
    if (!encodedPayload || !encodedSignature || extra !== undefined) return null;

    const valid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      fromBase64Url(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as Partial<AppSession>;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.sub !== "string" ||
      typeof payload.alias !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.exp <= now ||
      payload.iat > now + 60 ||
      payload.exp - payload.iat > SESSION_TTL_SECONDS
    ) {
      return null;
    }

    return payload as AppSession;
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: SESSION_COOKIE_NAME,
  maxAge: SESSION_TTL_SECONDS,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
