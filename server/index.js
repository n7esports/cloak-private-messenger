// Cloak Private Messenger: zero-metadata relay server
//
// Design rules:
//  - No accounts, no persistent IDs, no database, no IP logging.
//  - Queues live only in memory and hold opaque (client-encrypted) payloads.
//  - Pulling a queue returns its messages and deletes them immediately.
//  - A sweep every 15 minutes drops anything uncollected for over 24 hours.
//
// Protocol (JSON text frames over WebSocket):
//   -> { "action": "create" }
//   <- { "action": "created", "queueId": "<22-char id>" }
//
//   -> { "action": "push", "queueId": "...", "payload": "<opaque string>" }
//   <- { "action": "pushed", "queueId": "..." }
//
//   -> { "action": "pull", "queueId": "..." }
//   <- { "action": "messages", "queueId": "...", "messages": ["<payload>", ...] }
//
//   Errors: { "action": "error", "error": "<code>" }
//   Any request may include an "id" field; it is echoed back in the response
//   so clients can correlate replies. "create_queue" is accepted as an alias
//   for "create".

import { WebSocketServer } from 'ws';
import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------- config ---
const PORT = Number(process.env.PORT) || 8080;
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

const MAX_FRAME_BYTES = 64 * 1024; // max WebSocket frame (payload + envelope)
const MAX_PAYLOAD_CHARS = 48 * 1024; // max size of a single encrypted blob
const MAX_MESSAGES_PER_QUEUE = 500;
const MAX_QUEUES = 100_000;
const MAX_REQUESTS_PER_SEC = 30; // per connection; no IP tracking involved

const QUEUE_ID_RE = /^[A-Za-z0-9_-]{22}$/; // 16 random bytes, base64url

// ---------------------------------------------------------- QueueManager ---
class QueueManager {
  /** @type {Map<string, {payload: string, createdAt: number}[]>} */
  #queues = new Map();
  /** Last activity per queue, used only to expire idle empty queues. */
  #touched = new Map();

  create() {
    if (this.#queues.size >= MAX_QUEUES) return null;
    let id;
    do {
      id = randomBytes(16).toString('base64url');
    } while (this.#queues.has(id));
    this.#queues.set(id, []);
    this.#touched.set(id, Date.now());
    return id;
  }

  /** @returns {'ok'|'not_found'|'queue_full'} */
  push(id, payload) {
    const queue = this.#queues.get(id);
    if (!queue) return 'not_found';
    if (queue.length >= MAX_MESSAGES_PER_QUEUE) return 'queue_full';
    const now = Date.now();
    queue.push({ payload, createdAt: now });
    this.#touched.set(id, now);
    return 'ok';
  }

  /**
   * Returns all payloads and removes them from memory in the same
   * synchronous step, so no message can ever be delivered twice.
   * @returns {string[]|null} null if the queue does not exist
   */
  pull(id) {
    const queue = this.#queues.get(id);
    if (!queue) return null;
    const payloads = queue.map((m) => m.payload);
    queue.length = 0; // drop references so they can be garbage collected
    this.#touched.set(id, Date.now());
    return payloads;
  }

  /** Delete messages older than the TTL, and queues idle for longer than it. */
  sweep(now = Date.now()) {
    const cutoff = now - MESSAGE_TTL_MS;
    let droppedMessages = 0;
    let droppedQueues = 0;

    for (const [id, queue] of this.#queues) {
      // Messages are appended in time order, so expired ones are at the front.
      let expired = 0;
      while (expired < queue.length && queue[expired].createdAt <= cutoff) {
        expired++;
      }
      if (expired > 0) {
        queue.splice(0, expired);
        droppedMessages += expired;
      }

      if (queue.length === 0 && (this.#touched.get(id) ?? 0) <= cutoff) {
        this.#queues.delete(id);
        this.#touched.delete(id);
        droppedQueues++;
      }
    }
    return { droppedMessages, droppedQueues };
  }

  clear() {
    this.#queues.clear();
    this.#touched.clear();
  }

  get size() {
    return this.#queues.size;
  }
}

const queues = new QueueManager();

// --------------------------------------------------------------- server ---
// Note: the remote address is never read, stored, or logged anywhere below.
const wss = new WebSocketServer({
  port: PORT,
  maxPayload: MAX_FRAME_BYTES,
  perMessageDeflate: false,
});

function send(ws, obj, id) {
  if (ws.readyState !== ws.OPEN) return;
  if (id !== undefined) obj.id = id;
  ws.send(JSON.stringify(obj));
}

function fail(ws, error, id) {
  send(ws, { action: 'error', error }, id);
}

function handleMessage(ws, data, isBinary) {
  // Per-connection rate limit (in memory only, dies with the socket).
  const now = Date.now();
  if (now - ws.windowStart >= 1000) {
    ws.windowStart = now;
    ws.windowCount = 0;
  }
  if (++ws.windowCount > MAX_REQUESTS_PER_SEC) {
    ws.close(1008, 'rate_limited');
    return;
  }

  if (isBinary) return fail(ws, 'text_frames_only');

  let msg;
  try {
    msg = JSON.parse(data.toString('utf8'));
  } catch {
    return fail(ws, 'invalid_json');
  }
  if (msg === null || typeof msg !== 'object' || Array.isArray(msg)) {
    return fail(ws, 'invalid_request');
  }

  // Echo back a correlation id only if it is a short string or number.
  const id =
    (typeof msg.id === 'string' && msg.id.length <= 64) ||
    typeof msg.id === 'number'
      ? msg.id
      : undefined;

  const action = typeof msg.action === 'string' ? msg.action.toLowerCase() : '';

  switch (action) {
    case 'create':
    case 'create_queue': {
      const queueId = queues.create();
      if (!queueId) return fail(ws, 'server_busy', id);
      return send(ws, { action: 'created', queueId }, id);
    }

    case 'push':
    case 'push_message': {
      const { queueId, payload } = msg;
      if (typeof queueId !== 'string' || !QUEUE_ID_RE.test(queueId)) {
        return fail(ws, 'invalid_queue_id', id);
      }
      if (typeof payload !== 'string' || payload.length === 0) {
        return fail(ws, 'invalid_payload', id);
      }
      if (payload.length > MAX_PAYLOAD_CHARS) {
        return fail(ws, 'payload_too_large', id);
      }
      const result = queues.push(queueId, payload);
      if (result === 'not_found') return fail(ws, 'queue_not_found', id);
      if (result === 'queue_full') return fail(ws, 'queue_full', id);
      return send(ws, { action: 'pushed', queueId }, id);
    }

    case 'pull':
    case 'pull_message': {
      const { queueId } = msg;
      if (typeof queueId !== 'string' || !QUEUE_ID_RE.test(queueId)) {
        return fail(ws, 'invalid_queue_id', id);
      }
      const messages = queues.pull(queueId);
      if (messages === null) return fail(ws, 'queue_not_found', id);
      return send(ws, { action: 'messages', queueId, messages }, id);
    }

    default:
      return fail(ws, 'unknown_action', id);
  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.windowStart = Date.now();
  ws.windowCount = 0;

  ws.on('pong', () => {
    ws.isAlive = true;
  });
  ws.on('message', (data, isBinary) => {
    try {
      handleMessage(ws, data, isBinary);
    } catch {
      fail(ws, 'internal_error');
    }
  });
  ws.on('error', () => ws.terminate());
});

wss.on('listening', () => {
  console.log(`Cloak relay listening on port ${PORT}`);
});

// Drop dead connections so sockets don't pile up.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_INTERVAL_MS);

// TTL sweep: every 15 minutes, delete uncollected messages older than 24h.
const sweeper = setInterval(() => queues.sweep(), SWEEP_INTERVAL_MS);
sweeper.unref();

// ------------------------------------------------------------- shutdown ---
function shutdown() {
  clearInterval(heartbeat);
  clearInterval(sweeper);
  queues.clear(); // nothing survives the process
  for (const ws of wss.clients) ws.terminate();
  wss.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { QueueManager };
