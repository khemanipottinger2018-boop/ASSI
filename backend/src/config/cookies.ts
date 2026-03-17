// src/config/cookies.ts
// ASSI Platform — Cookie Configuration

export const SESSION_COOKIE_NAME = 'assi_session';

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const sessionCookieOptions = {
  httpOnly: true,                                          // JS cannot read this cookie (XSS protection)
  sameSite: 'lax'  as const,                              // CSRF protection, allows normal navigation
  secure:   process.env.NODE_ENV === 'production',        // HTTPS only in prod
  path:     '/',
  maxAge:   SESSION_TTL_SECONDS,                          // Browser respects the TTL (was missing before)
} as const;

// Clears the session cookie on logout
export const clearCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure:   process.env.NODE_ENV === 'production',
  path:     '/',
  maxAge:   0,
} as const;
