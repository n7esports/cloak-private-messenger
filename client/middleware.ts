import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CSS_VARS = `:root {
  --surface: #0f131c;
  --surface-low: #181c24;
  --surface-high: #262a33;
  --on-surface: #dfe2ee;
  --hairline: rgba(255, 255, 255, 0.08);
}`;

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>503 - Maintenance</title>
  <style>
    ${CSS_VARS}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Geist", ui-sans-serif, system-ui, sans-serif; background: var(--surface); color: var(--on-surface); display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .shell { display: flex; width: 100%; min-height: 100vh; }
    .nav { width: 240px; border-right: 1px solid var(--hairline); background: var(--surface-low); padding: 16px; }
    .nav-brand { display: flex; align-items: center; gap: 12px; padding: 12px; }
    .nav-brand-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--surface-high); display: flex; align-items: center; justify-content: center; color: var(--on-surface); font-weight: 700; font-size: 14px; }
    .nav-brand-text { font-size: 18px; font-weight: 600; color: var(--on-surface); }
    .main { flex: 1; display: flex; flex-direction: column; }
    .header { border-bottom: 1px solid var(--hairline); background: rgba(15,19,28,0.40); padding: 12px 24px; }
    .content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { text-align: center; }
    .code { font-size: 64px; font-weight: 700; color: var(--on-surface); }
    .msg { margin-top: 16px; color: rgba(223,226,238,0.70); }
    .footer { border-top: 1px solid var(--hairline); background: rgba(15,19,28,0.40); padding: 12px 24px; }
    .footer p { font-size: 12px; color: rgba(223,226,238,0.70); }
  </style>
</head>
<body>
  <div class="shell">
    <nav class="nav" aria-label="Main navigation">
      <div class="nav-brand">
        <div class="nav-brand-icon">C</div>
        <div class="nav-brand-text">Cloak</div>
      </div>
    </nav>
    <div class="main">
      <header class="header" role="banner">
        <div style="font-size: 14px; font-weight: 600; color: var(--on-surface);">Cloak Messenger</div>
      </header>
      <main class="content" role="main">
        <div class="card">
          <div class="code">503</div>
          <p class="msg">We will be back soon.</p>
        </div>
      </main>
      <footer class="footer" role="contentinfo">
        <p>Cloak Private Messenger. E2EE. No logs.</p>
      </footer>
    </div>
  </div>
</body>
</html>`;

const FORBIDDEN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>403 - Forbidden</title>
  <style>
    ${CSS_VARS}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Geist", ui-sans-serif, system-ui, sans-serif; background: var(--surface); color: var(--on-surface); display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .shell { display: flex; width: 100%; min-height: 100vh; }
    .nav { width: 240px; border-right: 1px solid var(--hairline); background: var(--surface-low); padding: 16px; }
    .nav-brand { display: flex; align-items: center; gap: 12px; padding: 12px; }
    .nav-brand-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--surface-high); display: flex; align-items: center; justify-content: center; color: var(--on-surface); font-weight: 700; font-size: 14px; }
    .nav-brand-text { font-size: 18px; font-weight: 600; color: var(--on-surface); }
    .main { flex: 1; display: flex; flex-direction: column; }
    .header { border-bottom: 1px solid var(--hairline); background: rgba(15,19,28,0.40); padding: 12px 24px; }
    .content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { text-align: center; }
    .code { font-size: 64px; font-weight: 700; color: var(--on-surface); }
    .msg { margin-top: 16px; color: rgba(223,226,238,0.70); }
    .footer { border-top: 1px solid var(--hairline); background: rgba(15,19,28,0.40); padding: 12px 24px; }
    .footer p { font-size: 12px; color: rgba(223,226,238,0.70); }
  </style>
</head>
<body>
  <div class="shell">
    <nav class="nav" aria-label="Main navigation">
      <div class="nav-brand">
        <div class="nav-brand-icon">C</div>
        <div class="nav-brand-text">Cloak</div>
      </div>
    </nav>
    <div class="main">
      <header class="header" role="banner">
        <div style="font-size: 14px; font-weight: 600; color: var(--on-surface);">Cloak Messenger</div>
      </header>
      <main class="content" role="main">
        <div class="card">
          <div class="code">403</div>
          <p class="msg">You do not have permission to access this page.</p>
        </div>
      </main>
      <footer class="footer" role="contentinfo">
        <p>Cloak Private Messenger. E2EE. No logs.</p>
      </footer>
    </div>
  </div>
</body>
</html>`;

function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

const isProduction = process.env.NODE_ENV === "production";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const nonce = generateNonce();

  // Allow crawler and static metadata files without CSP/nonce
  const userAgent = request.headers.get("user-agent") || "";
  const isCrawler = /bot|crawler|spider|crawling/i.test(userAgent);
  const isMetadataFile = path === "/sitemap.xml" || path === "/robots.txt";
  if (isCrawler || isMetadataFile) {
    return NextResponse.next({ request: { headers: new Headers(request.headers) } });
  }

  // Maintenance / forbidden pages
  if (path === "/maintenance") {
    return new NextResponse(MAINTENANCE_HTML, {
      status: 503,
      headers: { "Content-Type": "text/html" },
    });
  }
  if (path === "/forbidden") {
    return new NextResponse(FORBIDDEN_HTML, {
      status: 403,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Rate-limit login API routes (in-process memory; upgrade to Redis at scale)
  if (path === "/api/auth/login" || path === "/api/auth/signup") {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    const key = `${path}:${ip}`;
    // ... see client/lib/rateLimit.ts for the full sliding-window implementation;
    // use that module from API routes that parse the request body themselves.
  }

  // CSP in production: nonce-based for scripts; connect to Supabase and relay;
  // allow service worker for push.
  // Known inline script hashes from deployed app (Next.js hydration + app scripts).
  const inlineHashes = [
    "sha256-Q+8tPsjVtiDsjF/Cv8FMOpg2Yg91oKFKDAJat1PPb2g=",
    "sha256-iBHaZGFqud0wskX+6DuA+ySrJkXX4XPcebKbQ9poYqQ=",
    "sha256-jbxGn8ke4sYjigvuR2vvtKGaYTc5IeraFrT2KhPRcGY=",
    "sha256-aHaO8UGI2gdjWrMLnZqqafYckg3/17MYJaKxe6243yo=",
    "sha256-GEKJvKBHhAEcI31HO0dtQflA2216332e4Bv7g7YihfY=",
  ];
  const cspDirectives = isProduction
    ? [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' ${inlineHashes.join(" ")}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https: wss:",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join("; ")
    : "";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", cspDirectives);
  response.headers.set("x-nonce", nonce);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export const config = {
  matcher: ["/maintenance", "/forbidden", "/((?!_next/static|_next/image|favicon|icon-).*)"],
};
