import http from 'http';
import https from 'https';

const TARGET_HOST = 'allgo-api.onrender.com';
const PORT = 3000;

const server = http.createServer((clientReq, clientRes) => {
  console.log(`[PROXY] ${clientReq.method} ${clientReq.url}`);

  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: clientReq.url,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      host: TARGET_HOST,
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[PROXY ERROR]`, err.message);
    clientRes.writeHead(502, { 'Content-Type': 'application/json' });
    clientRes.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
  });

  clientReq.pipe(proxyReq, { end: true });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`AllGo Cloud Proxy listening on 0.0.0.0:${PORT} -> https://${TARGET_HOST}`);
});
