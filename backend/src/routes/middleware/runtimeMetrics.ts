// src/routes/middleware/runtimeMetrics.ts
// ASSI Platform — HTTP Metrics Middleware
// Feeds RuntimeMetricsService on every response.
// Mount globally in app.ts BEFORE routes.

import { Request, Response, NextFunction } from 'express';
import { RuntimeMetricsService } from '@/services/runtime-metrics.service';

export function runtimeMetrics(
  _req: Request,
  res:  Response,
  next: NextFunction
) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    RuntimeMetricsService.record('http_response_time_ms', ms);
    RuntimeMetricsService.record('http_requests_total', 1);
  });

  next();
}
