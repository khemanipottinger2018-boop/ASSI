// src/routes/middleware/requestLogger.ts
// ASSI Platform — Request Logger

import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const ip    = req.ip ?? req.socket.remoteAddress;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method:    req.method,
      url:       req.originalUrl,
      status:    res.statusCode,
      duration:  `${duration}ms`,
      ip,
    };

    if (duration > 1000) {
      console.warn('⚠️  Slow request:', log);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('📝', log);
    }
  });

  next();
}
