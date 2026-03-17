// src/routes/user.routes.ts
// ASSI Platform — Authenticated User Profile

import { Router } from 'express';
import { requireAuth }      from '@/routes/middleware/requireAuth';
import { prisma, getSupabaseAdmin } from '@/config/database';
import { AuthContext }      from '@/types/auth';

const router = Router();

/* ── GET /api/user/me ──────────────────────────── */

router.get('/me', requireAuth, async (_req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;

    const [profile, authUser] = await Promise.all([
      prisma.userProfile.findUnique({
        where:   { userId },
        include: { tutor: { select: { id: true, hourlyRate: true, isAvailable: true } } },
      }),
      getSupabaseAdmin().auth.admin.getUserById(userId),
    ]);

    if (!profile || profile.deletedAt) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        id:          profile.userId,
        username:    profile.username,
        email:       authUser.data.user?.email ?? null,
        role:        profile.role,
        createdAt:   profile.createdAt,
        tutor:       profile.tutor ?? null,
      },
    });
  } catch (err) {
    console.error('[user/me] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

/* ── PATCH /api/user/profile ──────────────────── */

router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { userId, role } = res.locals.auth as AuthContext;

    const {
      username, email,
      bio, phone_number, show_phone,
      hourly_rate, timezone, teaching_philosophy,
      chat_mode, max_concurrent_chats, is_student_tutor,
    } = req.body;

    /* ── Validate ── */
    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ success: false, error: 'Invalid email address' });
      }
    }
    if (username !== undefined) {
      const t = username.trim();
      if (t.length < 3 || t.length > 32) {
        return res.status(400).json({ success: false, error: 'Username must be 3–32 characters' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(t)) {
        return res.status(400).json({ success: false, error: 'Username: letters, numbers and underscores only' });
      }
    }

    /* ── Username conflict check ── */
    if (username !== undefined) {
      const conflict = await prisma.userProfile.findFirst({
        where: { username: username.trim(), NOT: { userId } },
      });
      if (conflict) {
        return res.status(409).json({ success: false, error: 'Username already in use' });
      }
    }

    /* ── Update Supabase Auth email ── */
    if (email !== undefined) {
      const admin = getSupabaseAdmin();
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email: email.trim().toLowerCase(),
      });
      if (error) {
        if (error.message?.toLowerCase().includes('already')) {
          return res.status(409).json({ success: false, error: 'Email already in use' });
        }
        throw error;
      }
    }

    /* ── Update user_profiles ── */
    const profileData: Record<string, any> = {};
    if (username     !== undefined) profileData.username    = username.trim();
    if (bio          !== undefined) profileData.bio         = bio ?? null;
    if (phone_number !== undefined) profileData.phoneNumber = phone_number ?? null;
    if (show_phone   !== undefined) profileData.showPhone   = Boolean(show_phone);

    if (Object.keys(profileData).length) {
      await prisma.userProfile.update({ where: { userId }, data: profileData });
    }

    /* ── Update tutors ── */
    if (role === 'tutor') {
      const tutorData: Record<string, any> = {};
      if (hourly_rate          !== undefined) tutorData.hourlyRate         = hourly_rate;
      if (timezone             !== undefined) tutorData.timezone           = timezone ?? null;
      if (teaching_philosophy  !== undefined) tutorData.teachingPhilosophy = teaching_philosophy ?? null;
      if (chat_mode            !== undefined) tutorData.chatMode           = chat_mode;
      if (max_concurrent_chats !== undefined) tutorData.maxConcurrentChats = max_concurrent_chats;
      if (is_student_tutor     !== undefined) tutorData.isStudentTutor     = Boolean(is_student_tutor);

      if (Object.keys(tutorData).length) {
        await prisma.tutor.update({
          where: { userId },
          data:  tutorData,
        });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[user/profile] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

export default router;
