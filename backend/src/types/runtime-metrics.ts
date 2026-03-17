// src/types/runtime-metrics.ts
export type RuntimeMetric =
  | 'http_response_time_ms'
  | 'http_requests_total'
  | 'memory_heap_mb'
  | 'active_users'
  | 'socket_connections';

export interface RuntimeSample {
  v: number;
  ts: number;
}
