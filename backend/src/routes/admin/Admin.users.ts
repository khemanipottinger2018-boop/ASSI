// src/routes/admin/Admin.users.ts
import { Router } from 'express';
import { requireAuth } from '@/routes/middleware/requireAuth';
import { withRole }    from '@/routes/middleware/withRole';
import { prisma, getSupabaseAdmin } from '@/config/database';
import { isUserRole }  from '@/types/roles';

const router = Router();

/* ── GET /api/admin/users ── */

router.get('/', requireAuth, withRole('admin'), async (req, res) => {
  try {
    const pageNum  = Math.max(1, parseInt(req.query.page  as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));

    const users = await prisma.userProfile.findMany({
      where:   { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip:    (pageNum - 1) * limitNum,
      take:    limitNum,
      select: {
        userId:      true,
        username:    true,
        role:        true,
        isSuspended: true,
        isDemo:      true,
        createdAt:   true,
      },
    });

    return res.json({ success: true, users });
  } catch (err) {
    console.error('[admin/users] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

/* ── PATCH /api/admin/users/:userId/role ── */

router.patch('/:userId/role', requireAuth, withRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role }   = req.body;

    if (!isUserRole(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    await prisma.userProfile.update({
      where: { userId },
      data:  { role },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('[admin/users/role] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

/* ── PATCH /api/admin/users/:userId/suspend ── */

router.patch('/:userId/suspend', requireAuth, withRole('admin'), async (req, res) => {
  try {
    const { userId }    = req.params;
    const { suspended } = req.body;

    await prisma.userProfile.update({
      where: { userId },
      data:  { isSuspended: Boolean(suspended) },
    });

    // If suspending, revoke Supabase Auth session too
    if (suspended) {
      await getSupabaseAdmin().auth.admin.signOut(userId, 'global');
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[admin/users/suspend] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update suspension' });
  }
});

export default router;
