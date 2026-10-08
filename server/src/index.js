import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 8080;
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGES_PER_ROUTE = 500;
const MAX_QUEUES = 100_000;
const MAX_REQUEST_BYTES = 16 * 1024 * 1024;
const MAX_FRAME_BYTES = MAX_REQUEST_BYTES + 64 * 1024;
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
const QUEUE_ID_RE = /^[A-Za-z0-9_-]{22}$/;
const PUBLIC_KEY_RE = /^[A-Za-z0-9+/]{43}=$/;
const queues = new Map();
const routes = new Map();
const subscribers = new Map();

function send(socket, value) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
}

function acknowledgement(id) {
  return { status: "ok", id };
}

function isAllowedOrigin(origin) {
  return !origin || allowedOrigins.has(origin);
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

function pushRoute(route, id, message) {
  let pending = routes.get(route);
  if (!pending) {
    if (routes.size >= MAX_QUEUES) return false;
    pending = [];
    routes.set(route, pending);
  }
  if (pending.some((entry) => entry.id === id)) return true;
  if (pending.length >= MAX_MESSAGES_PER_ROUTE) return false;
  pending.push({ id, message, createdAt: Date.now() });
  for (const subscriber of subscribers.get(route) ?? []) send(subscriber, message);
  return true;
}

function processRelayRequest(request, respond) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    respond({ status: "error", message: "Invalid request" });
    return true;
  }

  if (request.type === "subscribe") {
    if (
      typeof request.id !== "string" ||
      !respond.socket ||
      !validPublicKey(request.recipientPubKey)
    ) {
      respond({ status: "error", message: "Invalid subscription route" });
      return true;
    }
    const route = request.recipientPubKey;
    const connected = subscribers.get(route) ?? new Set();
    connected.add(respond.socket);
    subscribers.set(route, connected);
    for (const queued of routes.get(route) ?? []) send(respond.socket, queued.message);
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
      const index = pending.findIndex((entry) => entry.id === request.messageId);
      if (index !== -1) pending.splice(index, 1);
      if (pending.length === 0) routes.delete(request.recipientPubKey);
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
    const unexpired = pending.filter((entry) => entry.createdAt > cutoff);
    if (unexpired.length === 0) routes.delete(route);
    else if (unexpired.length !== pending.length) routes.set(route, unexpired);
  }
}

const httpServer = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (!isAllowedOrigin(origin)) {
    response.writeHead(403).end();
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
    done(isAllowedOrigin(origin), isAllowedOrigin(origin) ? 200 : 403);
  },
});
wss.on("connection", (socket) => {
  const connectedRoutes = new Set();
  socket.on("message", (message) => {
    let parsed;
    try {
      parsed = JSON.parse(message.toString());
    } catch {
      send(socket, { status: "error", message: "Invalid request format" });
      return;
    }
    processRelayRequest(parsed, Object.assign((response) => send(socket, response), {
      socket,
    }));
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.type === "subscribe" &&
      typeof parsed.recipientPubKey === "string"
    ) {
      connectedRoutes.add(parsed.recipientPubKey);
    }
  });
  socket.on("close", () => {
    for (const route of connectedRoutes) {
      const connected = subscribers.get(route);
      connected?.delete(socket);
      if (connected?.size === 0) subscribers.delete(route);
    }
  });
});

setInterval(pruneExpiredMessages, 60_000).unref();
httpServer.listen(PORT, () => {
  console.log(`Cloak encrypted relay listening on port ${PORT}`);
});
