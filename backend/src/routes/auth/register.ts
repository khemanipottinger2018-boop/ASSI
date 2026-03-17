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

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const USERNAME_MIN   = 3;
const USERNAME_MAX   = 30;

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

    const finalUsername = isDemo ? generateDemoUsername()   : username?.trim();
    const finalEmail    = isDemo ? generateDemoEmail()      : email?.trim().toLowerCase();
    const rawPassword   = isDemo ? generateStrongPassword() : password;
    const expiresAt     = isDemo ? demoExpiry(7)            : null;

    /* ── Validation (real users only) ── */
    if (!isDemo) {
      if (!finalEmail || !finalUsername || !rawPassword) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      // Username: length + allowed characters
      if (
        finalUsername.length < USERNAME_MIN ||
        finalUsername.length > USERNAME_MAX ||
        !USERNAME_REGEX.test(finalUsername)
      ) {
        return res.status(400).json({
          success: false,
          error:   `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters and contain only letters, numbers, and underscores`,
        });
      }

      if (!AuthService.validateEmail(finalEmail)) {
        return res.status(400).json({ success: false, error: 'Invalid email address' });
      }

      const pwCheck = AuthService.validatePasswordStrength(rawPassword);
      if (!pwCheck.valid) {
        return res.status(400).json({ success: false, error: pwCheck.message });
      }
    }

    /* ── Duplicate username check ── */
    const existingProfile = await prisma.userProfile.findFirst({
      where: { username: finalUsername },
    });
    if (existingProfile) {
      return res.status(409).json({ success: false, error: 'Username already in use' });
    }

    /* ── Create Supabase Auth user ── */
    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email:         finalEmail,
      password:      rawPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      if (authError?.message?.toLowerCase().includes('already')) {
        return res.status(409).json({ success: false, error: 'Email already in use' });
      }
      // Log the real error server-side, never send it to the client
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

  } catch (err) {
    // Log internally, never expose raw error to client
    console.error('[register] error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

export default router;