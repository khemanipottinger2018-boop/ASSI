import 'dotenv/config';

import express, { Request, Response, NextFunction } from 'express';
import http         from 'http';
import cors         from 'cors';
import cookieParser from 'cookie-parser';
import helmet       from 'helmet';
import rateLimit    from 'express-rate-limit';

import { prisma, disconnectDb }  from './config/database';
import { redisClient }           from './infra/redis/redis.client';
import { createSocketServer }    from './infra/socket/socket.server';

import { refreshSession }  from './routes/middleware/refreshSession';
import { requestLogger }   from './routes/middleware/requestLogger';
import { runtimeMetrics }  from './routes/middleware/runtimeMetrics';
import { startScheduledSessionWatcher } from './watchers/scheduled-session.watcher';

/* ===================== ROUTES ===================== */
import authRoutes             from './routes/auth';
import userRoutes             from './routes/user.routes';
import usersPublicRoutes      from './routes/users.public.routes';
import tutorsRoutes           from './routes/tutors.routes';
import browseRoutes           from './routes/browse.routes';
import tutorApplicationRoutes from './routes/tutor-applications.routes';
import subjectsRoutes         from './routes/subjects.routes';
import notificationsRoutes    from './routes/notifications.routes';
import chatRoutes             from './routes/chat-sessions';
import liveChatRoutes         from './routes/live-chat.route';
import presenceRoutes         from './routes/presence.routes';
import supportRoutes          from './routes/support.routes';
import settingsRoutes         from './routes/user/settings.routes';
import adminRoutes            from './routes/admin/index';
import aiRoutes               from './routes/ai/ai.index';

/* ===================== APP SETUP ===================== */

const app    = express();
const server = http.createServer(app);

/* ===================== SECURITY HEADERS =====================
   helmet sets X-Frame-Options, Content-Security-Policy,
   X-Content-Type-Options, Referrer-Policy and more.
   Must be the FIRST middleware — before cors, before routes.
============================================================= */

app.use(helmet({
  // Allow cross-origin requests from the frontend
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // CSP: tighten further once frontend domains are locked in
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

/* ===================== CORS =====================
   Multi-origin support — FRONTEND_URL can be comma-separated.
   e.g. "https://assi.app,https://www.assi.app"
   Matches the same parseOrigins() used in socket.server.ts.
================================================= */

function parseOrigins(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

const allowedOrigins = parseOrigins(process.env.FRONTEND_URL);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);           // same-origin / non-browser
    if (!allowedOrigins.length) return callback(null, true); // local dev — allow all
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`), false);
  },
  credentials: true,
}));

/* ===================== RATE LIMITERS =====================
   Auth endpoints get the tightest limits — brute force protection.
   General API gets a looser limit to prevent scraping/abuse.
   windowMs / max are intentionally conservative for launch.
   Tune upward once you have real traffic data.
=========================================================== */

// Auth: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { success: false, error: 'Too many attempts. Please try again later.' },
  skipSuccessfulRequests: false,
});

// General API: 200 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { success: false, error: 'Too many requests. Please slow down.' },
});

/* ===================== CORE MIDDLEWARE ===================== */

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));         // cap request body size
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Observability
app.use(requestLogger);
app.use(runtimeMetrics);

// Slide Redis session TTL on every authenticated request
app.use(refreshSession);

/* ===================== HEALTH ===================== */

app.get('/', (_req, res) => res.send('ASSI backend is running.'));

app.get('/health', async (_req, res) => {
  try {
    const [redisPing, dbHealth] = await Promise.all([
      redisClient.client.ping(),
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    ]);

    res.json({
      status:    'ok',
      database:  dbHealth ? 'ok' : 'down',
      redis:     redisPing === 'PONG' ? 'ok' : redisPing,
      timestamp: Date.now(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: 'Health check failed' });
  }
});

/* ===================== ROUTES ===================== */

// Auth (public) — tight rate limit
app.use('/api/auth',               authLimiter, authRoutes);

// User (own profile + settings) — general limit
app.use('/api/user',               generalLimiter, userRoutes);
app.use('/api/user',               generalLimiter, settingsRoutes);

// Public profiles
app.use('/api/users-public',       generalLimiter, usersPublicRoutes);

// Tutors + browsing
app.use('/api/tutors',             generalLimiter, tutorsRoutes);
app.use('/api/browse',             generalLimiter, browseRoutes);

// Tutor applications
app.use('/api/tutor-applications', generalLimiter, tutorApplicationRoutes);

// Subjects (public)
app.use('/api/subjects',           generalLimiter, subjectsRoutes);

// Chat
app.use('/api/chat',               generalLimiter, chatRoutes);
app.use('/api/live-chat',          generalLimiter, liveChatRoutes);

// Presence
app.use('/api/presence',           generalLimiter, presenceRoutes);

// Notifications
app.use('/api/notifications',      generalLimiter, notificationsRoutes);

// Support
app.use('/api/support',            generalLimiter, supportRoutes);

// Admin — auth + role enforced inside admin/index.ts
app.use('/api/admin',              generalLimiter, adminRoutes);

// AI — ASSI + Sentinel, auth enforced inside each route
app.use('/api/ai',                 generalLimiter, aiRoutes);

/* ===================== 404 HANDLER =====================
   Must come AFTER all route registrations.
======================================================= */

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

/* ===================== GLOBAL ERROR HANDLER ============
   4-arg signature required for Express to treat as error handler.
   Never leaks internal error details to the client.
======================================================= */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

/* ===================== GRACEFUL SHUTDOWN ================
   Railway sends SIGTERM before killing the container on
   every redeploy. Without this, in-flight requests are cut
   and Prisma/Redis connections leak.

   Flow:
   1. Stop accepting new connections
   2. Wait for in-flight requests to finish (30s max)
   3. Disconnect Prisma + Redis cleanly
   4. Exit 0 — Railway marks deploy as successful
======================================================= */

async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully`);

  server.close(async () => {
    try {
      await disconnectDb();
      await redisClient.disconnect();
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force exit after 30s if something hangs
  setTimeout(() => {
    console.error('⚠️  Shutdown timeout — forcing exit');
    process.exit(1);
  }, 30_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

/* ===================== STARTUP ===================== */

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('🟢 Database connected');

    await redisClient.connect();
    console.log('🔵 Redis connected');

    startScheduledSessionWatcher();
    console.log('🟣 Scheduled session watcher active');

    await createSocketServer(server);
    console.log('🟢 Socket.IO initialized');

    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 ASSI backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Startup failed', err);
    process.exit(1);
  }
}

bootstrap();

export default server;