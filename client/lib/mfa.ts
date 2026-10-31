// TOTP (RFC 6238) helper using the Web Crypto API.
// No external dependency; works in browsers and Node runtimes.
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/\s/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((value >> bits) & 0xff);
    }
  }
  return new Uint8Array(output);
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(value >> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[((value << (5 - bits)) & 0x1f)];
  }
  return output;
}

export function generateTOTPSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return base32Encode(bytes);
}

export async function getTOTPURI(secret: string, label: string): Promise<string> {
  const encoded = encodeURIComponent(label);
  return `otpauth://totp/${encoded}?secret=${secret}&issuer=${encodeURIComponent('UQZERA')}&digits=6&period=30`;
}

export async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  if (!/^\d{6}$/.test(token)) return false;
  const keyBytes = base32Decode(secret);
  if (keyBytes.length === 0) return false;

  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  const window = 1;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  for (let drift = -window; drift <= window; drift++) {
    const counterBytes = new Uint8Array(8);
    let remaining = counter + drift;
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = remaining & 0xff;
      remaining = Math.floor(remaining / 256);
    }
    const signature = await crypto.subtle.sign('HMAC', key, counterBytes.buffer);
    const hash = new Uint8Array(signature);
    const offset = hash[hash.length - 1] & 0x0f;
    const code =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);
    const otp = (code % 1_000_000).toString().padStart(6, '0');
    if (otp === token) return true;
  }
  return false;
}

export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    codes.push(
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 12)
        .toUpperCase()
    );
  }
  return codes;
}

export async function hashRecoveryCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.toLowerCase().trim());
  try {
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return code;
  }
}
