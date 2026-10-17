import WebSocket from 'ws';
const TOKEN = process.env.CLOAK_RELAY_TOKEN;
const ws = new WebSocket('ws://127.0.0.1:8080', { headers: { Origin: 'http://localhost:3000' }, handshakeTimeout: 5000, timeout: 10000 });
const results = [];
ws.on('open', () => {
  console.log('[smoke] OPEN, sending create_queue (action:create)...');
  ws.send(JSON.stringify({ action: 'create', id: 'c1', authToken: TOKEN }));
});
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('[smoke] RX:', JSON.stringify(msg).slice(0, 160));
  results.push(msg);
  if (msg.action === 'create') {
    console.log('[smoke] got queueId:', msg.queueId);
    ws.send(JSON.stringify({ type: 'publish', id: 'p1', authToken: TOKEN, packet: {
      type: 'message', id: 'msg-1', senderPubKey: 'AA=='.repeat(16), senderEncryptionPubKey: 'AA=='.repeat(16), signature: 'sig',
      envelope: { recipientPubKey: 'AA=='.repeat(16), ephemeralPubKey: 'AA=='.repeat(16), nonce: 'n', ciphertext: 'c', timestamp: 1 }
    }}));
  } else if (msg.id === 'p1') {
    ws.send(JSON.stringify({ action: 'push', id: 'z1', authToken: TOKEN, queueId: msg.queueId, payload: 'hello-via-queue' }));
  } else if (msg.id === 'z1') {
    ws.send(JSON.stringify({ action: 'pull', id: 'z2', authToken: TOKEN, queueId: msg.queueId }));
  } else if (msg.id === 'z2' && Array.isArray(msg.messages) && msg.messages.length) {
    ws.send(JSON.stringify({ type: 'subscribe', id: 's1', authToken: TOKEN, recipientPubKey: 'AA=='.repeat(16) }));
  } else if (msg.id === 's1') {
    ws.close(1000, 'done');
  }
});
ws.on('error', (e) => { console.error('[smoke] ERROR:', e.message); process.exit(1); });
ws.on('close', (code, reason) => {
  console.log('[smoke] CLOSE code:', code, 'total responses:', results.length);
  results.forEach(r => console.log('[smoke] resp:', JSON.stringify(r).slice(0, 150)));
  process.exit(0);
});
setTimeout(() => { console.error('[smoke] TIMEOUT after 10s'); process.exit(1); }, 10000);
