// src/services/runtime-metrics.service.ts
// ASSI Platform — Runtime Metrics (Redis-backed rolling window)
//
// Usage:
//   RuntimeMetricsService.record('http_response_time_ms', ms)  ← fire-and-forget
//   RuntimeMetricsService.snapshot()                           ← GET /api/admin/metrics/runtime
//
// Wire-up:
//   In your Express app, add the runtimeMetrics middleware (see below).
//   The middleware calls record() on every response finish.

import { redisClient }                      from '@/infra/redis';
import { RuntimeMetric, RuntimeSample }     from '@/types/runtime-metrics';

const PREFIX      = 'metrics:runtime';
const WINDOW      = 60;   // keep last 60 samples per metric
const TTL_SECONDS = 120;  // auto-expire if server goes quiet

export class RuntimeMetricsService {

  // ── Record (fire-and-forget) ───────────────────────
  // Never throws — metrics must never affect request handling.

  static async record(metric: RuntimeMetric, value: number): Promise<void> {
    const key    = `${PREFIX}:${metric}`;
    const sample: RuntimeSample = { v: value, ts: Date.now() };

    try {
      await redisClient.client
        .multi()
        .lPush(key, JSON.stringify(sample))
        .lTrim(key, 0, WINDOW - 1)
        .expire(key, TTL_SECONDS)
        .exec();
    } catch {
      // intentionally swallowed
    }
  }

  // ── Read ───────────────────────────────────────────

  static async read(metric: RuntimeMetric): Promise<RuntimeSample[]> {
    const key = `${PREFIX}:${metric}`;
    const raw = await redisClient.client.lRange(key, 0, -1);
    return raw.map(r => JSON.parse(r) as RuntimeSample);
  }

  // ── Snapshot (used by GET /api/admin/metrics/runtime) ──

  static async snapshot() {
    const [rt, reqs, mem, users, sockets] = await Promise.all([
      this.read('http_response_time_ms'),
      this.read('http_requests_total'),
      this.read('memory_heap_mb'),
      this.read('active_users'),
      this.read('socket_connections'),
    ]);

    return {
      responseTimeMs:    summarize(rt),
      requests:          summarize(reqs),
      memoryHeapMb:      latest(mem),
      activeUsers:       latest(users),
      socketConnections: latest(sockets),
    };
  }
}

/* ── Helpers ── */

function summarize(samples: RuntimeSample[]) {
  if (!samples.length) return { avg: 0, max: 0, min: 0, count: 0 };
  const values = samples.map(s => s.v);
  const sum    = values.reduce((a, b) => a + b, 0);
  return {
    avg:   Math.round(sum / values.length),
    max:   Math.max(...values),
    min:   Math.min(...values),
    count: values.length,
  };
}

function latest(samples: RuntimeSample[]) {
  return samples.length ? samples[0].v : 0;
}
