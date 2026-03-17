import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '@/routes/middleware/requireAuth';
import { TutorApplicationService } from '@/services/tutor-application.service';
import { AuthContext } from '@/types/auth';

const router = Router();

/* ── Admin guard middleware ───────────────────────── */

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = res.locals.auth as AuthContext;
  if (auth?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

/* ── POST /api/tutor-applications/submit ─────────── */

router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { userId, role } = res.locals.auth as AuthContext;

    const applicationId = await TutorApplicationService.submit(userId, role, req.body);

    return res.json({ success: true, applicationId });
  } catch (err: any) {
    console.error('[tutor-applications/submit] error:', err);
    return res.status(400).json({
      success: false,
      error: err.message ?? 'Failed to submit application',
    });
  }
});

/* ── GET /api/tutor-applications/my-application ───── */

router.get('/my-application', requireAuth, async (req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;

    const application = await TutorApplicationService.getUserApplication(userId);

    return res.json({ success: true, application });
  } catch (err) {
    console.error('[tutor-applications/my-application] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch application' });
  }
});

/* ── GET /api/tutor-applications/admin/pending ────── */

router.get('/admin/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    const applications = await TutorApplicationService.getPending();
    return res.json({ success: true, applications });
  } catch (err) {
    console.error('[tutor-applications/admin/pending] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

/* ── POST /api/tutor-applications/admin/approve/:id ─ */

router.post('/admin/approve/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await TutorApplicationService.approve(id, req.body?.review_notes);
    return res.json({ success: true });
  } catch (err) {
    console.error('[tutor-applications/admin/approve] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to approve application' });
  }
});

/* ── POST /api/tutor-applications/admin/reject/:id ── */

router.post('/admin/reject/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await TutorApplicationService.reject(id, req.body?.review_notes);
    return res.json({ success: true });
  } catch (err) {
    console.error('[tutor-applications/admin/reject] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to reject application' });
  }
});

export default router;