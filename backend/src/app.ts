// ==================== ENVIRONMENT SETUP ====================
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// PROPER ENVIRONMENT LOADING
const envFiles = [
  '.env.local',
  '.env',
  '../.env.local', 
  '../.env'
];

let envPath = '';
for (const file of envFiles) {
  const fullPath = resolve(process.cwd(), file);
  if (existsSync(fullPath)) {
    envPath = fullPath;
    console.log(`🔧 Found environment file: ${file}`);
    break;
  }
}

if (!envPath) {
  console.error('❌ CRITICAL: No environment file found!');
  process.exit(1);
}

config({ path: envPath });

// VALIDATE REQUIRED ENV VARS
const requiredEnvVars = [
  'DATABASE_SERVER',
  'DATABASE_NAME', 
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'JWT_SECRET'
];

const missingVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
  console.error('❌ Missing environment variables:', missingVars);
  process.exit(1);
}

console.log('✅ Environment loaded successfully');
// ==================== END ENVIRONMENT SETUP ====================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { getPool, checkDatabaseHealth, closePool } from './config/database';
import createSocketServer from './socket/socket-server.js';

const app = express();
const server = createServer(app);

// ✅ SOCKET.IO SETUP
const io = createSocketServer(server);
console.log('✅ Socket.IO server initialized');

const PORT = process.env.PORT || 3001;

// ✅ SECURITY & MIDDLEWARE
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow Socket.IO
  contentSecurityPolicy: false      // Simplified for real-time apps
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));

// ✅ RATE LIMITING
const createLimiter = (max: number, windowMs: number = 15 * 60 * 1000) => 
  rateLimit({ 
    windowMs, 
    max, 
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true, 
    legacyHeaders: false 
  });

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ ROUTE IMPORTS WITH ERROR HANDLING
const loadRoute = async (path: string, name: string) => {
  try {
    const module = await import(path);
    console.log(`✅ ${name} routes loaded`);
    return module.default;
  } catch (error) {
    console.error(`❌ Failed to load ${name} routes:`, error);
    process.exit(1);
  }
};

console.log('🔧 Loading routes...');

const [
  authRoutes,
  tutorApplicationsRoutes,
  adminRoutes,
  tutorRoutes,
  subjectRoutes,
  messageRoutes,
  notificationRoutes,
  bookedSessionsRoutes,
  chatRoutes  // NEW CHAT ROUTES
] = await Promise.all([
  loadRoute('./routes/auth.js', 'auth'),
  loadRoute('./routes/tutorApplications.js', 'tutorApplications'),
  loadRoute('./routes/admin.js', 'admin'),
  loadRoute('./routes/tutors/index.js', 'tutors'),
  loadRoute('./routes/subjects.js', 'subjects'),
  loadRoute('./routes/messages.js', 'messages'),
  loadRoute('./routes/notifications.js', 'notifications'),
  loadRoute('./routes/booked-sessions.js', 'booked-sessions'),
  loadRoute('./routes/chat.js', 'chat')  // NEW CHAT ROUTES
]);

console.log('✅ All routes loaded successfully!');

// ✅ ROUTES REGISTRATION
console.log('🛣️  Registering routes...');

app.use('/api/auth', createLimiter(100), authRoutes);
app.use('/api/tutor-applications', createLimiter(50), tutorApplicationsRoutes);
app.use('/api/admin', createLimiter(200), adminRoutes);
app.use('/api/tutors', createLimiter(200), tutorRoutes);
app.use('/api/subjects', createLimiter(300), subjectRoutes);
app.use('/api/messages', createLimiter(200), messageRoutes);
app.use('/api/notifications', createLimiter(200), notificationRoutes);
app.use('/api/booked-sessions', createLimiter(200), bookedSessionsRoutes);
app.use('/api/chat', createLimiter(100), chatRoutes);  // NEW CHAT ROUTES

console.log('✅ All routes registered successfully!');

// ✅ HEALTH ENDPOINT (Enhanced)
app.get('/api/health', createLimiter(50), async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'unknown',
      websocket: 'unknown'
    }
  };

  try {
    // Database health
    health.services.database = await checkDatabaseHealth() ? 'connected' : 'disconnected';
    
    // WebSocket health (check if Socket.IO is running)
    health.services.websocket = io.engine.clientsCount >= 0 ? 'running' : 'error';
    
    // Overall status
    health.status = health.services.database === 'connected' ? 'healthy' : 'degraded';
    
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    health.status = 'unhealthy';
    health.services.database = 'error';
    res.status(503).json(health);
  }
});

// ✅ 404 HANDLER
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.originalUrl,
    availableRoutes: [
      '/api/health',
      '/api/auth/*',
      '/api/tutor-applications/*',
      '/api/admin/*',
      '/api/tutors/*',
      '/api/subjects/*',
      '/api/messages/*',
      '/api/notifications/*',
      '/api/booked-sessions/*',
      '/api/chat/*'  // NEW CHAT ROUTES
    ]
  });
});

// ✅ GLOBAL ERROR HANDLER
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Rate limit errors
  if (error.statusCode === 429) {
    return res.status(429).json({ error: 'Too many requests, please try again later.' });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: 'Invalid input data', details: error.message });
  }

  // Database errors
  if (error.code === 'EREQUEST') {
    return res.status(500).json({ error: 'Database error occurred' });
  }

  // Default error
  const response = {
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      details: error.message,
      stack: error.stack 
    })
  };

  res.status(error.status || 500).json(response);
});

// ✅ SERVER STARTUP
server.listen(PORT, async () => {
  console.log(`
🎯 ASSI PLATFORM BACKEND
────────────────────────
✅ Port: ${PORT}
📊 Health: /api/health  
🔌 WebSocket: Active
🔐 Env: ${process.env.NODE_ENV || 'development'}
────────────────────────
  `);

  try {
    const dbHealthy = await checkDatabaseHealth();
    console.log(`✅ Database: ${dbHealthy ? 'Connected' : 'Disconnected'}`);
    
    if (!dbHealthy) {
      console.error('❌ Database connection failed - some features may not work');
    }
  } catch (error: any) {
    console.error('❌ Database health check failed:', error.message);
  }
});

// ✅ GRACEFUL SHUTDOWN
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ HTTP server closed');
  });

  // Close database connections
  try {
    await closePool();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000).unref(); // Unref to prevent keeping process alive

  // Exit gracefully
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;