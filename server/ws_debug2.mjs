import WebSocket from 'ws';
import { generateEphemeralKeyPair, deriveSharedSecret, encryptPayload } from '/home/wassay/Documents/cloak-private-messenger/crypto-engine/src/index.js';

const TOKEN = process.env.CLOAK_RELAY_TOKEN;
const ws = new WebSocket('ws://127.0.0.1:8080', { headers: { Origin: 'http://localhost:3000' }, handshakeTimeout: 5000, timeout: 6000 });

async function makePacket() {
  const kp = await generateEphemeralKeyPair();
  const share = await deriveSharedSecret(kp.privateKey, kp.publicKey);
  const envelope = await encryptPayload(share, 'loadtest-payload');
  return { type: 'message', id: 'msg1', senderPubKey: kp.publicKey, senderEncryptionPubKey: kp.publicKey, signature: envelope.signature, envelope: envelope.envelope };
}

ws.on('open', async () => {
  ws.send(JSON.stringify({ action: 'create', id: 'd1', authToken: TOKEN }));
});
ws.on('message', async (data) => {
  const msg = JSON.parse(data.toString());
  console.log('[dbg2] RX msg:', JSON.stringify(msg).slice(0, 180));
  if (msg.action === 'create') {
    const pkt = await makePacket();
    console.log('[dbg2] packet keys:', Object.keys(pkt).join(','));
    for (let k = 0; k < 3; k++) {
      ws.send(JSON.stringify({ type: 'publish', id: 'pub-' + k, authToken: TOKEN, packet: pkt }));
      console.log('[dbg2] sent publish', k);
      await new Promise(r => setTimeout(r, 200));
    }
  }
});
ws.on('error', (e) => { console.error('[dbg2] ERROR:', e.message); process.exit(1); });
ws.on('close', (c, r) => { console.log('[dbg2] close code:', c); process.exit(0); });
setTimeout(() => { console.error('[dbg2] timeout'); process.exit(1); }, 6000);
