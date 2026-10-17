import WebSocket from 'ws';
const TOKEN = process.env.CLOAK_RELAY_TOKEN;
const ws = new WebSocket('ws://127.0.0.1:8080', { headers: { Origin: 'http://localhost:3000' }, handshakeTimeout: 5000, timeout: 6000 });
ws.on('open', () => { console.log('[dbg] open, sending create...'); ws.send(JSON.stringify({ action: 'create', id: 'd1', authToken: TOKEN })); });
ws.on('message', (data) => { console.log('[dbg] RX:', data.toString().slice(0, 200)); });
ws.on('error', (e) => { console.error('[dbg] ERROR:', e.message); process.exit(1); });
ws.on('close', (c, r) => { console.log('[dbg] close code:', c); process.exit(0); });
setTimeout(() => { console.error('[dbg] timeout'); process.exit(1); }, 6000);
