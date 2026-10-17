import WebSocket from 'ws';
import crypto from 'node:crypto';

const TOKEN = process.env.CLOAK_RELAY_TOKEN;
const CONCURRENCY = Number(process.env.CONCURRENCY || '200');
const MSGS_PER_CLIENT = Number(process.env.MSGS_PER_CLIENT || '30');
const INTERVAL_MS = Number(process.env.INTERVAL_MS || '150');
const DURATION_MS = Number(process.env.DURATION_MS || '60000');
const STOP_ERROR_RATE = Number(process.env.STOP_ERROR_RATE || '0.05');

const rttSamples = [];
const sentAt = new Map();
let totalSent = 0, totalOk = 0, totalErr = 0;
let stop = false;
const stopPromise = new Promise((r) => { setTimeout(() => { stop = true; r(); }, DURATION_MS); });

function random32b64() { return crypto.randomBytes(32).toString('base64'); }
function randomStr() { return crypto.randomBytes(24).toString('base64url'); }

function makeEnvelope() {
  const now = Date.now();
  return {
    type: 'message', id: 'lt-' + crypto.randomUUID().slice(0, 12),
    senderPubKey: random32b64(), senderEncryptionPubKey: random32b64(),
    signature: 'sig-' + crypto.randomUUID(),
    envelope: { recipientPubKey: random32b64(), ephemeralPubKey: random32b64(),
                nonce: randomStr(), ciphertext: randomStr(), timestamp: now },
  };
}

async function client(i) {
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://127.0.0.1:8080', { headers: { Origin: 'http://localhost:3000' }, handshakeTimeout: 5000, timeout: 10000 });
    ws.on('open', () => { ws.send(JSON.stringify({ action: 'create', id: 'c-' + i, authToken: TOKEN })); });
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.action === 'create') {
        (async () => {
          const pkt = makeEnvelope();
          for (let k = 0; k < MSGS_PER_CLIENT; k++) {
            if (stop) break;
            const t0 = Date.now();
            const id = 'pub-' + i + '-' + k;
            sentAt.set(id, t0);
    totalSent++;
    ws.send(JSON.stringify({ type: 'publish', id, authToken: TOKEN, packet: pkt }));
            await new Promise(r => setTimeout(r, INTERVAL_MS));
          }
        })();
      } else if (msg.id && msg.id.startsWith('pub-')) {
        totalOk++;
        if (msg.status === 'ok') { const t0 = sentAt.get(msg.id); if (t0) rttSamples.push(Date.now() - t0); } else totalErr++;
      }
    });
    ws.on('error', () => { totalErr++; });
    ws.on('close', () => resolve());
  });
}

async function main() {
  console.log(`[loadtest] concurrency=${CONCURRENCY} msgs/client=${MSGS_PER_CLIENT} interval=${INTERVAL_MS}ms duration=${DURATION_MS}ms stop_error_rate=${STOP_ERROR_RATE}`);
  const clients = Array.from({ length: CONCURRENCY }, (_, i) => async () => client(i));
  const all = clients.map(f => f());
  await Promise.race([Promise.all(all), stopPromise]);
  const ok = totalOk + totalErr;
  const errRate = ok ? totalErr / ok : 0;
  const sorted = [...rttSamples].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const dur = DURATION_MS / 1000;
  const tx = totalOk / dur;
  console.log(`[loadtest] SUMMARY clients_spawned=${CONCURRENCY} total_sent=${totalSent} ok=${totalOk} err=${totalErr} error_rate=${errRate.toFixed(4)} duration=${dur}s`);
  console.log(`[loadtest] p50=${p50?.toFixed(1)}ms p95=${p95?.toFixed(1)}ms p99=${p99?.toFixed(1)}ms throughput=${tx.toFixed(1)}/s`);
  process.exit(0);
}

main().catch(e => { console.error('[loadtest] FATAL:', e.message); process.exit(2); });
