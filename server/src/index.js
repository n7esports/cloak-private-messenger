import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 8080;
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGES_PER_ROUTE = 500;
const MAX_QUEUES = 100_000;
const MAX_REQUEST_BYTES = 16 * 1024 * 1024;
const MAX_FRAME_BYTES = MAX_REQUEST_BYTES + 64 * 1024;

// Global memory budget (C4/H2): the per-route cap alone still allowed a single
// peer to allocate hundreds of GB across many routes. Queued payloads are
// counted against a server-wide budget and refused once it is exhausted.
const MAX_QUEUED_BYTES = 256 * 1024 * 1024;

// Connection + rate limits (C4/H1). "Open relay" is not an acceptable default
// for a private messenger, so limits are on by default and the server refuses
// to start if it would be configured with no limits at all.
const DEFAULT_MAX_CONNECTIONS = 500;
const DEFAULT_RELAY_RATE_LIMIT = 60;
const DEFAULT_RELAY_RATE_WINDOW_MS = 10_000;
const RELAY_RATE_MAX_ENTRIES = 10_000;
const MAX_ROUTES_PER_CONNECTION = 64;
const WS_PING_INTERVAL_MS = 30_000;
const WS_PING_TIMEOUT_MS = 10_000;

// Optional relay auth token (C4). When CLOAK_RELAY_TOKEN is set, every publish,
// subscribe, and receipt must carry a matching token. Without it the relay is
// anonymous — same-trust endpoints only — which is why rate limiting and the
// connection cap are enforced regardless.
const RELAY_TOKEN = process.env.CLOAK_RELAY_TOKEN?.trim() || null;

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3002",
];
const allowedOrigins = new Set([
  ...DEFAULT_ALLOWED_ORIGINS,
  ...(process.env.CLOAK_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

// Canonical 32-byte public key: 44 standard-base64 chars ending in a single
// "=" (32 bytes -> ceil(32/3)*4 = 44 chars with one pad byte). The strict
// 32-byte length and canonical round-trip are enforced in validPublicKey
// itself; this gates character set and shape only.
const PUBLIC_KEY_RE = /^[A-Za-z0-9+/]{43}=$/;
// Queue ids are minted here as randomBytes(16).toString("base64url"):
// base64url alphabet, no padding, exactly 22 chars.
const QUEUE_ID_RE = /^[A-Za-z0-9_-]{22}$/;

const queues = new Map();
const routes = new Map();
const subscribers = new Map();
const relayRateLimits = new Map();
let queuedBytes = 0;
let liveConnections = 0;

// Structured logging (M3): append-only JSONL of security-relevant events so
// abuse can be detected without ever recording message content.
const logStream = process.env.CLOAK_RELAY_LOG
  ? (await import("node:fs")).createWriteStream(process.env.CLOAK_RELAY_LOG, {
      flags: "a",
    })
  : null;

function securityLog(event, details = {}) {
  const line = JSON.stringify({
    event,
    time: new Date().toISOString(),
    ...details,
  });
  if (logStream) logStream.write(`${line}\n`);
  console.log(`[cloak-relay] ${line}`);
}

function queueEntryBytes(entry) {
  const message = typeof entry?.message === "string" ? entry.message : JSON.stringify(entry?.message ?? null);
  return (
    256 +
    Buffer.byteLength(String(entry?.id ?? ""), "utf8") +
    Buffer.byteLength(message, "utf8")
  );
}

function pruneRateLimits(now) {
  if (relayRateLimits.size < RELAY_RATE_MAX_ENTRIES) return;
  for (const [key, entry] of relayRateLimits) {
    if (entry.resetAt <= now) relayRateLimits.delete(key);
  }
  if (relayRateLimits.size >= RELAY_RATE_MAX_ENTRIES) {
    for (const key of relayRateLimits.keys()) {
      relayRateLimits.delete(key);
      break;
    }
  }
}

function clientAddress(socket) {
  const address = socket?.remoteAddress;
  if (typeof address === "string" && address) return address;
  if (address && typeof address === "object") {
    if (typeof address.address === "string" && address.address) {
      return address.address;
    }
  }
  return "unknown";
}

function consumeRelayRateAllowance(key, limit, windowMs) {
  const now = Date.now();
  pruneRateLimits(now);
  let entry = relayRateLimits.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    relayRateLimits.set(key, entry);
  }
  entry.count += 1;
  return { allowed: entry.count <= limit, retryAfterMs: Math.max(0, entry.resetAt - now) };
}

function send(socket, value) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
}

function acknowledgement(id) {
  return { status: "ok", id };
}

function isAllowedOrigin(origin) {
  // C5 fix: a missing Origin header is a non-browser client (curl, native app,
  // attacker script). Only an explicitly allowed origin may open a connection.
  return typeof origin === "string" && origin.length > 0 && allowedOrigins.has(origin);
}

function validPublicKey(value) {
  return (
    typeof value === "string" &&
    PUBLIC_KEY_RE.test(value) &&
    Buffer.from(value, "base64").length === 32 &&
    Buffer.from(value, "base64").toString("base64") === value
  );
}

function validPacket(packet) {
  return (
    packet &&
    typeof packet === "object" &&
    packet.type === "message" &&
    typeof packet.id === "string" &&
    packet.id.length > 0 &&
    packet.id.length <= 128 &&
    typeof packet.senderPubKey === "string" &&
    typeof packet.senderEncryptionPubKey === "string" &&
    typeof packet.signature === "string" &&
    packet.envelope &&
    typeof packet.envelope === "object" &&
    validPublicKey(packet.envelope.recipientPubKey) &&
    typeof packet.envelope.ephemeralPubKey === "string" &&
    typeof packet.envelope.nonce === "string" &&
    typeof packet.envelope.ciphertext === "string" &&
    Number.isSafeInteger(packet.envelope.timestamp)
  );
}

function isAuthorizedRelayRequest(request) {
  if (!RELAY_TOKEN) return true;
  const token = request?.authToken;
  const supplied =
    typeof token === "string" && token.length === RELAY_TOKEN.length
      ? Buffer.from(token, "utf8")
      : null;
  const expected = Buffer.from(RELAY_TOKEN, "utf8");
  if (!supplied) return false;
  // Constant-time comparison so a caller cannot enumerate the token byte by byte.
  return timingSafeEqual(supplied, expected);
}

function pushRoute(route, id, message) {
  let pending = routes.get(route);
  if (!pending) {
    if (routes.size >= MAX_QUEUES) return false;
    pending = [];
    routes.set(route, pending);
  }
  if (pending.some((entry) => entry.id === id)) return true;
  if (pending.length >= MAX_MESSAGES_PER_ROUTE) return false;
  const entry = { id, message, createdAt: Date.now() };
  const entryBytes = queueEntryBytes(entry);
  if (queuedBytes + entryBytes > MAX_QUEUED_BYTES) return false;
  queuedBytes += entryBytes;
  pending.push(entry);
  for (const subscriber of subscribers.get(route) ?? []) send(subscriber, message);
  return true;
}

function removeQueuedBytes(entries) {
  for (const entry of entries) queuedBytes -= queueEntryBytes(entry);
  if (queuedBytes < 0) queuedBytes = 0;
}

function processRelayRequest(request, respond, socket = null) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    respond({ status: "error", message: "Invalid request" });
    return true;
  }

  if (!isAuthorizedRelayRequest(request)) {
    respond({ status: "error", message: "Relay authentication failed" });
    return true;
  }

  if (request.type === "subscribe") {
    if (
      typeof request.id !== "string" ||
      !socket ||
      !validPublicKey(request.recipientPubKey)
    ) {
      respond({ status: "error", message: "Invalid subscription route" });
      return true;
    }
    const route = request.recipientPubKey;
    const connected = subscribers.get(route) ?? new Set();
    connected.add(socket);
    subscribers.set(route, connected);
    for (const queued of routes.get(route) ?? []) send(socket, queued.message);
    respond(acknowledgement(request.id));
    return true;
  }

  if (request.type === "publish") {
    const packet = request.packet;
    if (
      typeof request.id !== "string" ||
      !validPacket(packet) ||
      packet.envelope.recipientPubKey === ""
    ) {
      respond({ status: "error", message: "Invalid encrypted envelope" });
      return true;
    }
    const encoded = JSON.stringify({ type: "message", packet });
    if (Buffer.byteLength(encoded) > MAX_REQUEST_BYTES) {
      respond({ status: "error", message: "Encrypted envelope is too large" });
      return true;
    }
    if (!pushRoute(packet.envelope.recipientPubKey, packet.id, { type: "message", packet })) {
      respond({ status: "error", message: "Recipient queue is full" });
      return true;
    }
    respond(acknowledgement(request.id));
    return true;
  }

  if (request.type === "receipt") {
    if (
      typeof request.id !== "string" ||
      typeof request.messageId !== "string" ||
      (request.status !== "delivered" && request.status !== "read") ||
      !validPublicKey(request.recipientPubKey)
    ) {
      respond({ status: "error", message: "Invalid delivery receipt" });
      return true;
    }
    if (
      !pushRoute(request.recipientPubKey, request.id, {
        type: "receipt",
        id: request.id,
        messageId: request.messageId,
        status: request.status,
      })
    ) {
      respond({ status: "error", message: "Recipient queue is full" });
      return true;
    }
    respond(acknowledgement(request.id));
    return true;
  }

  if (request.type === "ack") {
    if (
      typeof request.id !== "string" ||
      typeof request.messageId !== "string" ||
      !validPublicKey(request.recipientPubKey)
    ) {
      respond({ status: "error", message: "Invalid delivery acknowledgement" });
      return true;
    }
    const pending = routes.get(request.recipientPubKey);
    if (pending) {
      const removed = pending.filter((entry) => entry.id === request.messageId);
      const kept = pending.filter((entry) => entry.id !== request.messageId);
      removeQueuedBytes(removed);
      if (kept.length === 0) routes.delete(request.recipientPubKey);
      else routes.set(request.recipientPubKey, kept);
    }
    respond(acknowledgement(request.id));
    return true;
  }

  if (
    request.action === "create" ||
    request.action === "create_queue"
  ) {
    if (queues.size >= MAX_QUEUES) {
      respond({ status: "error", message: "Queue limit reached" });
      return true;
    }
    let queueId;
    do {
      queueId = randomBytes(16).toString("base64url");
    } while (queues.has(queueId));
    queues.set(queueId, []);
    respond({ status: "ok", action: "create", queueId, id: request.id });
    return true;
  }

  if (request.action === "push") {
    if (
      typeof request.queueId !== "string" ||
      !QUEUE_ID_RE.test(request.queueId) ||
      typeof request.payload !== "string" ||
      request.payload.length > MAX_REQUEST_BYTES
    ) {
      respond({ status: "error", message: "Invalid queue ID or payload", id: request.id });
      return true;
    }
    const pending = queues.get(request.queueId);
    if (!pending || pending.length >= MAX_MESSAGES_PER_ROUTE) {
      respond({ status: "error", message: "Queue not found or full", id: request.id });
      return true;
    }
    pending.push(request.payload);
    respond({ status: "ok", action: "push", queueId: request.queueId, id: request.id });
    return true;
  }

  if (request.action === "pull") {
    if (typeof request.queueId !== "string" || !QUEUE_ID_RE.test(request.queueId)) {
      respond({ status: "error", message: "Invalid queue ID", id: request.id });
      return true;
    }
    const messages = queues.get(request.queueId);
    if (!messages) {
      respond({ status: "error", message: "Queue not found", id: request.id });
      return true;
    }
    queues.delete(request.queueId);
    respond({ status: "ok", action: "pull", queueId: request.queueId, messages, id: request.id });
    return true;
  }

  respond({ status: "error", message: "Unknown relay request", id: request.id });
  return true;
}

function pruneExpiredMessages() {
  const cutoff = Date.now() - MESSAGE_TTL_MS;
  for (const [route, pending] of routes) {
    const kept = pending.filter((entry) => entry.createdAt > cutoff);
    const expired = pending.filter((entry) => entry.createdAt <= cutoff);
    removeQueuedBytes(expired);
    if (kept.length === 0) routes.delete(route);
    else if (kept.length !== pending.length) routes.set(route, kept);
  }
}

const httpServer = createServer(async (request, response) => {
  const origin = request.headers.origin;
  const clientIp = clientAddress(request.socket);

  // Security headers (M1) on every HTTP response.
  response.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Cache-Control", "no-store");

  if (!isAllowedOrigin(origin)) {
    securityLog("origin_rejected", { clientIp, origin: origin ?? null });
    response.writeHead(403).end();
    return;
  }

  // Per-IP rate limit on the relay POST endpoint (C4/H2).
  const rate = consumeRelayRateAllowance(
    `http:${clientIp}`,
    RELAY_HTTP_RATE_LIMIT,
    RELAY_HTTP_RATE_WINDOW_MS,
  );
  if (!rate.allowed) {
    securityLog("rate_limited", { clientIp, transport: "http" });
    response.writeHead(429, { "retry-after": String(Math.ceil(rate.retryAfterMs / 1000)) }).end();
    return;
  }

  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "content-type");
  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }
  if (request.method !== "POST" || request.url !== "/relay") {
    response.writeHead(404).end();
    return;
  }

  // H3: validate content-length before buffering the body.
  const declaredLength = Number(request.headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    response.writeHead(413).end();
    return;
  }

  const chunks = [];
  let byteLength = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.length;
    if (byteLength > MAX_FRAME_BYTES) {
      response.writeHead(413).end();
      return;
    }
    chunks.push(buffer);
  }

  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    response.writeHead(400).end();
    return;
  }
  let result;
  processRelayRequest(parsed, (value) => {
    result = value;
  });
  const statusCode = result?.status === "ok" ? 200 : 400;
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(result));
});

const wss = new WebSocketServer({
  server: httpServer,
  maxPayload: MAX_FRAME_BYTES,
  verifyClient: ({ origin }, done) => {
    const allowed = isAllowedOrigin(origin);
    if (!allowed) securityLog("ws_origin_rejected", { origin: origin ?? null });
    done(allowed, allowed ? 200 : 403);
  },
});
wss.on("connection", (socket, request) => {
  const clientIp = clientAddress(request?.socket);

  // H1: hard cap on concurrent connections.
  liveConnections += 1;
  if (liveConnections > MAX_CONNECTIONS) {
    securityLog("connection_rejected", { clientIp, reason: "connection_limit" });
    socket.close(1013, "Connection limit reached");
    return;
  }

  // M4: heartbeat so dead/zombie sockets are reaped instead of held open.
  let alive = true;
  socket.on("pong", () => {
    alive = true;
  });
  const pingTimer = setInterval(() => {
    if (alive === false) {
      socket.terminate();
      return;
    }
    alive = false;
    socket.ping();
  }, WS_PING_INTERVAL_MS);
  pingTimer.unref?.();

  const connectedRoutes = new Set();

  // Per-connection message rate limit (C4/H2). A sliding window of recent
  // event timestamps so a burst cannot straddle a reset boundary and exceed
  // the intended rate.
  const recentEvents = [];
  const allowMessage = () => {
    const now = Date.now();
    while (recentEvents.length > 0 && now - recentEvents[0] >= RELAY_RATE_WINDOW_MS) {
      recentEvents.shift();
    }
    if (recentEvents.length >= RELAY_RATE_LIMIT) return false;
    recentEvents.push(now);
    return true;
  };

  socket.on("message", (message) => {
    if (!allowMessage()) {
      securityLog("rate_limited", { clientIp, transport: "websocket" });
      send(socket, { status: "error", message: "Too many relay requests" });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(message.toString());
    } catch {
      send(socket, { status: "error", message: "Invalid request format" });
      return;
    }
    processRelayRequest(parsed, (response) => send(socket, response), socket);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.type === "subscribe" &&
      typeof parsed.recipientPubKey === "string"
    ) {
      // Cap distinct routes per connection (H2/H1) so one socket cannot pin
      // unbounded subscriber entries.
      if (!connectedRoutes.has(parsed.recipientPubKey)) {
        if (connectedRoutes.size >= MAX_ROUTES_PER_CONNECTION) {
          send(socket, { status: "error", message: "Too many subscriptions" });
          socket.close(1013, "Subscription limit reached");
          return;
        }
        connectedRoutes.add(parsed.recipientPubKey);
      }
    }
  });
  socket.on("close", () => {
    clearInterval(pingTimer);
    liveConnections -= 1;
    for (const route of connectedRoutes) {
      const connected = subscribers.get(route);
      connected?.delete(socket);
      if (connected?.size === 0) subscribers.delete(route);
    }
  });
  socket.on("error", () => {
    clearInterval(pingTimer);
    liveConnections -= 1;
  });
});

setInterval(pruneExpiredMessages, 60_000).unref();

function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

const MAX_CONNECTIONS = parsePositiveInt(process.env.CLOAK_MAX_CONNECTIONS) ?? DEFAULT_MAX_CONNECTIONS;
const RELAY_RATE_LIMIT = parsePositiveInt(process.env.CLOAK_RELAY_RATE_LIMIT) ?? DEFAULT_RELAY_RATE_LIMIT;
const RELAY_RATE_WINDOW_MS = parsePositiveInt(process.env.CLOAK_RELAY_RATE_WINDOW_MS) ?? DEFAULT_RELAY_RATE_WINDOW_MS;
const RELAY_HTTP_RATE_LIMIT = parsePositiveInt(process.env.CLOAK_RELAY_HTTP_RATE_LIMIT) ?? RELAY_RATE_LIMIT;
const RELAY_HTTP_RATE_WINDOW_MS = parsePositiveInt(process.env.CLOAK_RELAY_HTTP_RATE_WINDOW_MS) ?? RELAY_RATE_WINDOW_MS;

export {
  validPublicKey,
  validPacket,
  processRelayRequest,
  isAuthorizedRelayRequest,
};

// Only bind the port when executed directly (node src/index.js), not when
// imported by the test suite.
const isMainModule =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  httpServer.listen(PORT, () => {
    securityLog("relay_started", {
      port: PORT,
      maxConnections: MAX_CONNECTIONS,
      rateLimit: `${RELAY_RATE_LIMIT}/${RELAY_RATE_WINDOW_MS}ms`,
      auth: RELAY_TOKEN ? "token" : "anonymous",
    });
  });
}
