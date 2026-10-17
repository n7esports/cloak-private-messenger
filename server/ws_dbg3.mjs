import WebSocket from 'ws';
const TOKEN = process.env.CLOAK_RELAY_TOKEN;
const ws = new WebSocket('ws://127.0.0.1:8080', { headers: { Origin: 'http://localhost:3000' }, handshakeTimeout: 5000, timeout: 6000 });
const sent = 0, ok = 0, err = 0;
ws.on('open', () => { console.log('[dbg3] open -> create'); ws.send(JSON.stringify({ action: 'create', id: 'c1', authToken: TOKEN })); });
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('[dbg3] RX', JSON.stringify(msg).slice(0, 160));
  if (msg.action === 'create') {
    console.log('[dbg3] create OK, sending 2 publishes at 150ms');
    for (let k = 0; k < 2; k++) {
      const t0 = Date.now();
      ws.send(JSON.stringify({ type: 'publish', id: 'pub-' + k, authToken: TOKEN, packet: { type: 'message', id: 'p1', senderPubKey: 'A'.repeat(43), senderEncryptionPubKey: 'B'.repeat(43), signature: 's', envelope: { recipientPubKey: 'C'.repeat(43), ephemeralPubKey: 'D'.repeat(43), nonce: 'n', ciphertext: 'c', timestamp: Date.now() } }, _t0: t0 }));
      console.log('[dbg3] sent publish', k);
      setTimeout(() => {}, 150);
    }
  } else if (msg.id && msg.id.startsWith('pub-')) {
    ok++; console.log('[dbg3] publish ACK:', JSON.stringify(msg).slice(0, 120));
  }
});
ws.on('error', (e) => { console.error('[dbg3] ERROR:', e.message); process.exit(1); });
ws.on('close', () => { console.log('[dbg3] DONE ok=' + ok + ' err=' + err + ' total_rx=' + (ok+err)); process.exit(0); });
setTimeout(() => { console.error('[dbg3] TIMEOUT'); process.exit(1); }, 6000);
