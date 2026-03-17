// src/config/database.ts
// ASSI Platform — Database Client
// Prisma  → all domain queries (type-safe, 3NF schema)
// Supabase → Auth, Storage, Realtime

import { PrismaClient } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
// PRISMA  (PostgreSQL via Supabase connection string)
// ─────────────────────────────────────────────

declare global {
  // Prevent multiple instances in dev hot-reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
    errorFormat: 'pretty',
  });
}

export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// ─────────────────────────────────────────────
// SUPABASE ADMIN CLIENT  (service role — server only)
// Never expose this key to the frontend.
// Use for: Auth admin, Storage uploads, bypassing RLS
// ─────────────────────────────────────────────

let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const url  = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Check your .env file.'
    );
  }

  _supabaseAdmin = createClient(url, key, {
    auth: {
      autoRefreshToken:  false,
      persistSession:    false,
      detectSessionInUrl: false,
    },
  });

  return _supabaseAdmin;
}

// ─────────────────────────────────────────────
// SUPABASE ANON CLIENT  (safe for public/anon operations)
// Use for: Auth sign-in/sign-up flows only
// All data queries should go through Prisma
// ─────────────────────────────────────────────

let _supabaseAnon: SupabaseClient | null = null;

export function getSupabaseAnon(): SupabaseClient {
  if (_supabaseAnon) return _supabaseAnon;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
      'Check your .env file.'
    );
  }

  _supabaseAnon = createClient(url, key);
  return _supabaseAnon;
}

// ─────────────────────────────────────────────
// HEALTH CHECK
// Called by GET /health — confirms both layers are alive
// ─────────────────────────────────────────────

export async function dbHealthCheck(): Promise<{
  prisma:   boolean;
  supabase: boolean;
}> {
  const results = { prisma: false, supabase: false };

  // Prisma ping
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.prisma = true;
  } catch (err) {
    console.error('❌ Prisma health check failed:', err);
  }

  // Supabase ping (lightweight auth admin call)
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (!error) results.supabase = true;
    else console.error('❌ Supabase health check failed:', error.message);
  } catch (err) {
    console.error('❌ Supabase health check threw:', err);
  }

  return results;
}

// ─────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// Call in your process.on('SIGTERM') / SIGINT handlers
// ─────────────────────────────────────────────

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  console.log('🔌 Prisma disconnected');
}
