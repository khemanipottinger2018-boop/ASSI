// src/routes/admin/Admin.tutor-applications.ts
// Mount: app.use('/api/tutor-applications', router)

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth }             from '@/routes/middleware/requireAuth';
import { TutorApplicationService } from '@/services/tutor-application.service';
import { prisma }                  from '@/config/database';
import { AuthContext }             from '@/types/auth';

const router = Router();

/* ── Admin guard ─────────────────────────────────── */

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
    const applicationId    = await TutorApplicationService.submit(userId, role, req.body);
    return res.json({ success: true, applicationId });
  } catch (err: any) {
    console.error('[tutor-applications/submit] error:', err);
    return res.status(400).json({ success: false, error: err.message ?? 'Failed to submit application' });
  }
});

/* ── GET /api/tutor-applications/my-application ───── */

router.get('/my-application', requireAuth, async (req, res) => {
  try {
    const { userId }  = res.locals.auth as AuthContext;
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

/* ── GET /api/tutor-applications/admin/all ──────────
   List all applications with optional status filter
   ?status=pending|approved|rejected
   ───────────────────────────────────────────────────── */

router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    const where: Record<string, any> = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
      where.status = status;
    }

    const applications = await prisma.tutorApplication.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      select: {
        id:                  true,
        userId:              true,
        status:              true,
        submittedAt:         true,
        reviewedAt:          true,
        reviewedBy:          true,
        notes:               true,
        user: {
          select: { username: true, role: true, createdAt: true },
        },
      },
    });

    return res.json({ success: true, count: applications.length, applications });
  } catch (err) {
    console.error('[tutor-applications/admin/all] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

/* ── GET /api/tutor-applications/admin/:id ──────────
   Get full detail of a single application for review
   ───────────────────────────────────────────────────── */

router.get('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const application = await prisma.tutorApplication.findUnique({
      where:  { id: req.params.id },
      select: {
        id:                  true,
        userId:              true,
        status:              true,
        submittedAt:         true,
        reviewedAt:          true,
        reviewedBy:          true,
        notes:               true,
        educationBackground: true,
        teachingExperience:  true,
        whyTutor:            true,
        qualifications:      true,
        birthDate:           true,
        ageVerified:         true,
        ageVerifiedAt:       true,
        applicationSubjects: {
          select: {
            subject: { select: { id: true, name: true, category: true } },
          },
        },
        user: {
          select: {
            username:   true,
            role:       true,
            createdAt:  true,
            dateOfBirth: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    return res.json({ success: true, application });
  } catch (err) {
    console.error('[tutor-applications/admin/:id] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch application' });
  }
});

/* ── POST /api/tutor-applications/admin/approve/:id ─ */

router.post('/admin/approve/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await TutorApplicationService.approve(req.params.id, req.body?.review_notes);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[tutor-applications/admin/approve] error:', err);
    return res.status(400).json({ success: false, error: err.message ?? 'Failed to approve application' });
  }
});

/* ── POST /api/tutor-applications/admin/reject/:id ── */

router.post('/admin/reject/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await TutorApplicationService.reject(req.params.id, req.body?.review_notes);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[tutor-applications/admin/reject] error:', err);
    return res.status(400).json({ success: false, error: err.message ?? 'Failed to reject application' });
  }
});

export default router;