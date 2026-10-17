import http from 'node:http';
const TOKEN = process.env.CLOAK_RELAY_TOKEN;
const N = 75;
let ok = 0, err429 = 0, err500 = 0;
const req = http.request({
  hostname: '127.0.0.1', port: 8080, path: '/relay', method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', 'content-length': 0 },
}, (res) => {
  const body = [];
  res.on('data', () => {});
  res.on('end', () => {
    if (res.statusCode === 200) ok++;
    else if (res.statusCode === 429) err429++;
    else if (res.statusCode >= 500) err500++;
  });
  if (req._sent === N - 1) finish();
  req._sent++;
});
req._sent = 0;
let done = false;
function finish() {
  if (done) return; done = true;
  console.log(`[http-rate] sent=${N} 200=${ok} 429=${err429} 5xx=${err500}`);
  process.exit(0);
}
for (let i = 0; i < N; i++) {
  const r = http.request({
    hostname: '127.0.0.1', port: 8080, path: '/relay', method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', 'content-length': 0 },
  }, (res) => {
    const body = [];
    res.on('data', () => {});
    res.on('end', () => {
      if (res.statusCode === 200) ok++;
      else if (res.statusCode === 429) err429++;
      else if (res.statusCode >= 500) err500++;
    });
    if (r._sent === N - 1) finish();
    r._sent++;
  });
  r._sent = 0;
  req.write('{}');
  req.end();
}
setTimeout(() => { console.log(`[http-rate] timeout, 200=${ok} 429=${err429}`); process.exit(0); }, 10000);
