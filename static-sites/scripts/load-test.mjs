import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

export async function runLoadTest({
  root = process.cwd(),
  port = 4180,
  requests = 200,
  routes = ['/', '/live-proof/', '/the-ghosts/', '/the-system/', '/vienna-to-every-dojo/'],
} = {}) {
  const resolvePath = (urlPath) => {
    if (urlPath === '/') return path.join(root, 'index.html');
    if (urlPath.endsWith('/')) return path.join(root, urlPath.slice(1), 'index.html');
    return path.join(root, urlPath.slice(1));
  };

  const server = http.createServer(async (req, res) => {
    try {
      const filePath = resolvePath(new URL(req.url, `http://localhost:${port}`).pathname);
      const data = await fs.readFile(filePath);
      const ext = path.extname(filePath);
      const type = ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : 'text/html';
      res.writeHead(200, { 'content-type': type });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });

  await new Promise((resolve) => server.listen(port, resolve));

  const timings = [];
  const statuses = [];

  await Promise.all(Array.from({ length: requests }, async (_, index) => {
    const route = routes[index % routes.length];
    const start = performance.now();
    const response = await fetch(`http://127.0.0.1:${port}${route}`);
    await response.text();
    const end = performance.now();
    timings.push(end - start);
    statuses.push(response.status);
  }));

  await new Promise((resolve) => server.close(resolve));

  timings.sort((a, b) => a - b);
  const avg = timings.reduce((sum, value) => sum + value, 0) / timings.length;
  const p95 = timings[Math.floor(timings.length * 0.95) - 1];
  const max = timings[timings.length - 1];
  const under1s = timings.filter((value) => value < 1000).length;
  const ok = statuses.filter((code) => code === 200).length;

  return {
    requests,
    ok,
    failed: requests - ok,
    avgMs: Number(avg.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    maxMs: Number(max.toFixed(2)),
    under1s,
  };
}

const isDirectRun = fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  const summary = await runLoadTest();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.p95Ms >= 1000 || summary.failed > 0) {
    process.exitCode = 1;
  }
}
