// src/routes/auth/convert-demo.ts
// ASSI Platform — Demo Account Conversion
// Updates email in Supabase Auth, clears demo flags in user_profiles.

import { Router } from 'express';
import { requireAuth }      from '@/routes/middleware/requireAuth';
import { prisma, getSupabaseAdmin } from '@/config/database';
import { AuthService }      from '@/core/auth/auth.service';
import { AuthContext }      from '@/types/auth';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  try {
    const { userId }      = res.locals.auth as AuthContext;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Missing email or password' });
    }
    if (!AuthService.validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }
    const pwCheck = AuthService.validatePasswordStrength(password);
    if (!pwCheck.valid) {
      return res.status(400).json({ success: false, error: pwCheck.message });
    }

    // Confirm this is actually a demo account
    const profile = await prisma.userProfile.findUnique({
      where:  { userId },
      select: { isDemo: true, deletedAt: true },
    });

    if (!profile || profile.deletedAt) {
      return res.status(401).json({ success: false, error: 'Account not found' });
    }
    if (!profile.isDemo) {
      return res.status(400).json({ success: false, error: 'Not a demo account' });
    }

    // Check email not taken by another Supabase Auth user
    const admin = getSupabaseAdmin();
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const emailTaken = existingUsers?.users?.some(
      u => u.email === email.toLowerCase() && u.id !== userId
    );
    if (emailTaken) {
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }

    // Update Supabase Auth — email + password
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      email:    email.trim().toLowerCase(),
      password,
    });
    if (updateError) {
      console.error('[convert-demo] Supabase update error:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update credentials' });
    }

    // Clear demo flags in user_profiles
    await prisma.userProfile.update({
      where: { userId },
      data:  { isDemo: false, demoExpiresAt: null },
    });

    return res.json({ success: true, message: 'Account upgraded successfully' });
  } catch (err) {
    console.error('[convert-demo] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to convert demo account' });
  }
});

export default router;
