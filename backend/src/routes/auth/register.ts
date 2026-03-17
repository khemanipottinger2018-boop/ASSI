// src/routes/auth/register.ts
// ASSI Platform — Registration
// Creates Supabase Auth identity, then Prisma records for
// user_profiles and user_settings in a single flow.

import { Router } from 'express';
import crypto      from 'crypto';
import { getSupabaseAdmin } from '@/config/database';
import { prisma }           from '@/config/database';
import { AuthService }      from '@/core/auth/auth.service';

const router = Router();

/* ── Helpers ─────────────────────────────────────── */

function generateDemoUsername() {
  return `ASSI_student_${Math.floor(10000 + Math.random() * 90000)}`;
}
function generateDemoEmail() {
  return `demo+${crypto.randomBytes(6).toString('hex')}@assi.com`;
}
function generateStrongPassword() {
  return crypto.randomBytes(16).toString('hex');
}
function demoExpiry(days = 7): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/* ── POST /api/auth/register ─────────────────────── */

router.post('/', async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    const isDemo = req.body?.isDemo === true || req.body?.demo === true;

    const finalUsername = isDemo ? generateDemoUsername()              : username?.trim();
    const finalEmail    = isDemo ? generateDemoEmail()                 : email?.trim().toLowerCase();
    const rawPassword   = isDemo ? generateStrongPassword()            : password;
    const expiresAt     = isDemo ? demoExpiry(7)                       : null;

    /* ── Validation (real users only) ── */
    if (!isDemo) {
      if (!finalEmail || !finalUsername || !rawPassword) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      if (!AuthService.validateEmail(finalEmail)) {
        return res.status(400).json({ success: false, error: 'Invalid email address' });
      }
      const pwCheck = AuthService.validatePasswordStrength(rawPassword);
      if (!pwCheck.valid) {
        return res.status(400).json({ success: false, error: pwCheck.message });
      }
    }

    /* ── Duplicate username check (Supabase handles email uniqueness) ── */
    const existingProfile = await prisma.userProfile.findFirst({
      where: { username: finalUsername },
    });
    if (existingProfile) {
      return res.status(409).json({ success: false, error: 'Username already in use' });
    }

    /* ── Create Supabase Auth user ── */
    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email:             finalEmail,
      password:          rawPassword,
      email_confirm:     true,   // skip email verification for now
    });

    if (authError || !authData.user) {
      // Supabase returns a specific error if email already exists
      if (authError?.message?.toLowerCase().includes('already')) {
        return res.status(409).json({ success: false, error: 'Email already in use' });
      }
      console.error('[register] Supabase Auth error:', authError);
      return res.status(500).json({ success: false, error: 'Registration failed' });
    }

    const userId = authData.user.id;

    /* ── Create user_profiles row ── */
    await prisma.userProfile.create({
      data: {
        userId,
        username:           finalUsername,
        role:               'student',
        disclaimerAccepted: true,
        isDemo,
        demoExpiresAt:      expiresAt,
      },
    });

    /* ── Create user_settings row ── */
    await prisma.userSettings.create({
      data: {
        userId,
        emailNotifications: true,
        pushNotifications:  true,
        theme:              'system',
        language:           'en',
        timezone:           'America/Jamaica',
      },
    });

    /* ── Demo response ── */
    if (isDemo) {
      return res.status(201).json({
        success:  true,
        demo:     true,
        expiresAt,
        credentials: {
          username: finalUsername,
          email:    finalEmail,
          password: rawPassword,
        },
        warning: 'This demo account is temporary. Save these credentials — they cannot be recovered.',
      });
    }

    return res.status(201).json({ success: true });
  } catch (err: any) {
    console.error('[register] error:', err?.message ?? err);
    return res.status(500).json({ success: false, error: err?.message ?? 'Registration failed' });
  }
});

export default router;
