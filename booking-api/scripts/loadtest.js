/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const BASE_URL = process.env.LOADTEST_BASE_URL ?? 'http://localhost:3000/api/v1';
const TENANT_ID = process.env.LOADTEST_TENANT_ID ?? '11111111-1111-1111-1111-111111111111';
const PROVIDER_ID = process.env.LOADTEST_PROVIDER_ID ?? '44444444-4444-4444-4444-444444444444';
const EVENT_TYPE_ID = process.env.LOADTEST_EVENT_TYPE_ID ?? '55555555-5555-5555-5555-555555555551';
const CONCURRENCY = Number(process.env.LOADTEST_CONCURRENCY ?? 100);
const REQUESTS_PER_WORKER = Number(process.env.LOADTEST_REQUESTS_PER_WORKER ?? 20);
const RUN_BOOKING = process.env.LOADTEST_RUN_BOOKING === '1';

function percentile(sortedValues, percentileValue) {
  if (!sortedValues.length) return 0;
  const idx = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.floor((percentileValue / 100) * sortedValues.length)),
  );
  return sortedValues[idx];
}

function buildAvailabilityPath() {
  const now = new Date();
  const from = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);

  return `/providers/${PROVIDER_ID}/availability?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&viewerTz=America/Los_Angeles&eventTypeId=${EVENT_TYPE_ID}`;
}

function buildBookingBody(index) {
  const slotBase = new Date(Date.now() + 48 * 60 * 60 * 1000);
  slotBase.setUTCMinutes(0, 0, 0);
  const minuteOffset = (index % 16) * 30;
  const start = new Date(slotBase.getTime() + minuteOffset * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  return {
    providerId: PROVIDER_ID,
    eventTypeId: EVENT_TYPE_ID,
    startTs: start.toISOString(),
    endTs: end.toISOString(),
    customerName: `Load User ${index}`,
    customerEmail: `load.user.${index}@example.com`,
    customerPhone: '+12025550000',
  };
}

async function executeRequest(scenario, index) {
  const startedAt = performance.now();
  const request = await fetch(`${BASE_URL}${scenario.path(index)}`, {
    method: scenario.method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': TENANT_ID,
    },
    body: scenario.body ? JSON.stringify(scenario.body(index)) : undefined,
  });
  const endedAt = performance.now();
  return {
    durationMs: endedAt - startedAt,
    status: request.status,
    ok: request.ok,
  };
}

async function runScenario(scenario) {
  const stats = {
    name: scenario.name,
    totalRequests: CONCURRENCY * REQUESTS_PER_WORKER,
    success: 0,
    errors: 0,
    statuses: {},
    latencyMs: [],
  };

  let counter = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (let i = 0; i < REQUESTS_PER_WORKER; i += 1) {
      const requestIndex = counter;
      counter += 1;

      try {
        const result = await executeRequest(scenario, requestIndex);
        stats.latencyMs.push(result.durationMs);
        stats.statuses[result.status] = (stats.statuses[result.status] ?? 0) + 1;
        if (result.ok) {
          stats.success += 1;
        } else {
          stats.errors += 1;
        }
      } catch (error) {
        stats.errors += 1;
        stats.statuses['network_error'] = (stats.statuses['network_error'] ?? 0) + 1;
      }
    }
  });

  await Promise.all(workers);
  const sorted = [...stats.latencyMs].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);

  return {
    ...stats,
    p50Ms: Number(p50.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    errorRatePercent: Number(((stats.errors / stats.totalRequests) * 100).toFixed(2)),
  };
}

function asMarkdown(resultBundle) {
  const lines = [
    '# Load Test Report',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Base URL: ${BASE_URL}`,
    `- Concurrency: ${CONCURRENCY}`,
    `- Requests per worker: ${REQUESTS_PER_WORKER}`,
    '',
  ];

  for (const result of resultBundle.results) {
    lines.push(`## ${result.name}`);
    lines.push(`- Total requests: ${result.totalRequests}`);
    lines.push(`- Success responses: ${result.success}`);
    lines.push(`- Error responses: ${result.errors}`);
    lines.push(`- Error rate: ${result.errorRatePercent}%`);
    lines.push(`- P50 latency: ${result.p50Ms} ms`);
    lines.push(`- P95 latency: ${result.p95Ms} ms`);
    lines.push(`- Status counts: ${JSON.stringify(result.statuses)}`);
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const scenarios = [
    {
      name: 'Availability Query',
      method: 'GET',
      path: () => buildAvailabilityPath(),
    },
  ];

  if (RUN_BOOKING) {
    scenarios.push({
      name: 'Booking Creation',
      method: 'POST',
      path: () => '/bookings',
      body: (index) => buildBookingBody(index),
    });
  }

  const results = [];
  for (const scenario of scenarios) {
    console.log(`Running scenario: ${scenario.name}`);
    // eslint-disable-next-line no-await-in-loop
    const result = await runScenario(scenario);
    results.push(result);
    console.log(
      `${scenario.name}: p50=${result.p50Ms}ms p95=${result.p95Ms}ms errorRate=${result.errorRatePercent}%`,
    );
  }

  const output = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    concurrency: CONCURRENCY,
    requestsPerWorker: REQUESTS_PER_WORKER,
    results,
  };

  const reportsDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportsDir, 'loadtest-report.json'),
    `${JSON.stringify(output, null, 2)}\n`,
    'utf8',
  );
  fs.writeFileSync(path.join(reportsDir, 'loadtest-report.md'), `${asMarkdown(output)}\n`, 'utf8');

  console.log('Load test report written to reports/loadtest-report.json and reports/loadtest-report.md');
}

main().catch((error) => {
  console.error('Load test failed', error);
  process.exit(1);
});
