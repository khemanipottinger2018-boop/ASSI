// src/services/error-log.service.ts
// ASSI Platform — Error Logger
// Non-throwing DB logger. Safe to call from any catch block.
//
// Requires migration before activating:
//   CREATE TABLE error_logs (
//     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id     uuid REFERENCES auth.users(id),
//     error_type  text NOT NULL,
//     message     text NOT NULL,
//     stack       text,
//     endpoint    text,
//     method      text,
//     ip_address  text,
//     user_agent  text,
//     severity    text NOT NULL DEFAULT 'error',
//     resolved    boolean DEFAULT false,
//     created_at  timestamptz DEFAULT now()
//   );
//
// Until migration runs, errors are console-logged only.

import { prisma }        from '@/config/database';
import { ErrorLogInput } from '@/types/error-log';

const MIGRATION_COMPLETE = false; // flip to true after running migration above

export class ErrorLogService {
  static async log(error: ErrorLogInput): Promise<void> {
    try {
      if (!MIGRATION_COMPLETE) {
        // Fallback until table exists
        console.error('[ErrorLog]', {
          type:     error.errorType,
          message:  error.message,
          endpoint: error.endpoint,
          severity: error.severity,
        });
        return;
      }

      await (prisma as any).errorLog.create({
        data: {
          userId:    error.userId    ?? null,
          errorType: error.errorType,
          message:   error.message.slice(0, 1000),
          stack:     error.stack?.slice(0, 4000) ?? null,
          endpoint:  error.endpoint  ?? null,
          method:    error.method    ?? null,
          ipAddress: error.ipAddress ?? null,
          userAgent: error.userAgent ?? null,
          severity:  error.severity  ?? 'error',
          resolved:  false,
        },
      });
    } catch (err) {
      // Never throw from a logger
      console.error('❌ ErrorLogService failed:', err);
    }
  }
}
