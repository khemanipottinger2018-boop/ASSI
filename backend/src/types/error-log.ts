// src/types/error-log.ts
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorLogInput {
  userId?: string;
  errorType: string;
  message: string;
  stack?: string;
  endpoint?: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  severity: ErrorSeverity;
}
