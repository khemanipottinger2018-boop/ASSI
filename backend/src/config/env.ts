// src/config/env.ts
// ASSI Platform — Environment Validation
// Called once at server boot. Missing vars = hard crash (intentional).
// Better to fail loud at startup than silently at runtime.

// ─────────────────────────────────────────────
// REQUIRED VARIABLES
// ─────────────────────────────────────────────

const REQUIRED_VARS = [
  // Supabase
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',

  // Prisma (Supabase Postgres connection string)
  'DATABASE_URL',

  // App
  'NODE_ENV',
] as const;

// Optional but warned about in production
const PRODUCTION_RECOMMENDED = [
  'REDIS_URL',        // Required for Socket.io + session cache
  'FRONTEND_URL',     // Required for CORS in production
  'OPENAI_API_KEY',   // Required for ASSI AI + Sentinel
  'CLAUDE_API_KEY',   // Future Claude API layer
  'PORT',
] as const;

// ─────────────────────────────────────────────
// VALIDATE  (called once at startup in app.ts)
// ─────────────────────────────────────────────

export function validateEnv(): void {
  // 1. Hard required
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   • ${key}`));
    process.exit(1);
  }

  // 2. NODE_ENV must be known
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV!)) {
    console.error(
      `❌ Invalid NODE_ENV: "${process.env.NODE_ENV}". ` +
      `Must be one of: ${validEnvs.join(', ')}`
    );
    process.exit(1);
  }

  // 3. Port sanity
  const port = parseInt(process.env.PORT || '5000');
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(`❌ Invalid PORT: ${process.env.PORT}`);
    process.exit(1);
  }

  // 4. Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    const warnings: string[] = [];

    if (!process.env.FRONTEND_URL) {
      warnings.push('FRONTEND_URL is not set — CORS will allow all origins');
    }

    if (!process.env.DATABASE_URL?.includes('sslmode=require') &&
        !process.env.DATABASE_URL?.includes('supabase.com')) {
      warnings.push('DATABASE_URL should point to Supabase for production');
    }

    PRODUCTION_RECOMMENDED.forEach((key) => {
      if (!process.env[key]) {
        warnings.push(`${key} is not set — some features may be unavailable`);
      }
    });

    if (warnings.length > 0) {
      console.warn('⚠️  Production warnings:');
      warnings.forEach((w) => console.warn(`   • ${w}`));
    }
  }

  console.log(`✅ Environment validated [${process.env.NODE_ENV}]`);
}

// ─────────────────────────────────────────────
// TYPED ACCESSORS
// Use these instead of process.env[key] directly.
// ─────────────────────────────────────────────

export function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Environment variable "${key}" is not set`);
  return value;
}

export function getEnvOrDefault(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export function getPort(): number {
  return parseInt(getEnvOrDefault('PORT', '5000'));
}

// ─────────────────────────────────────────────
// TYPED ENV OBJECT
// ─────────────────────────────────────────────

export const env = {
  nodeEnv:       process.env.NODE_ENV as 'development' | 'production' | 'test',
  port:          parseInt(process.env.PORT || '5000'),
  isProduction:  process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Supabase
  supabaseUrl:            process.env.SUPABASE_URL!,
  supabaseAnonKey:        process.env.SUPABASE_ANON_KEY!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // App
  frontendUrl: process.env.FRONTEND_URL,

  // Services
  redisUrl:      process.env.REDIS_URL,
  openaiApiKey:  process.env.OPENAI_API_KEY,
  claudeApiKey:  process.env.CLAUDE_API_KEY,
} as const;