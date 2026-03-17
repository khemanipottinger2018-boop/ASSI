// src/routes/users.public.routes.ts
// ASSI Platform — Public User Profile (no auth required)

import { Router } from 'express';
import { prisma } from '@/config/database';

const router = Router();

/* ── GET /api/users-public/:username ── */

router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const profile = await prisma.userProfile.findFirst({
      where: {
        username,
        deletedAt:   null,
        isSuspended: false,
      },
      select: {
        userId:   true,
        username: true,
        role:     true,
        tutor: {
          select: {
            id:         true,
            bio:        true,
            hourlyRate: true,
            subjects: {
              select: {
                subject: {
                  select: { id: true, name: true, category: true },
                },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    // Admins are never public
    if (profile.role === 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const subjects = profile.tutor?.subjects.map(ts => ts.subject) ?? [];

    return res.json({
      success: true,
      user: {
        id:        profile.userId,
        username:  profile.username,
        role:      profile.role,
        tutorBio:  profile.tutor?.bio        ?? null,
        hourlyRate: profile.tutor?.hourlyRate ?? null,
        subjects,
      },
    });
  } catch (err) {
    console.error('[users-public] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

export default router;
