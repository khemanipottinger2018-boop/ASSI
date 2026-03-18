// src/routes/tutor-applications.routes.ts
// Mount: app.use('/api/tutor-applications', router)
//
// Flow:
//   1. Student starts application  → role becomes tutor_applicant
//   2. Student fills in details    → PATCH /my-application
//   3. Admin opens it              → status becomes 'seen'
//   4. Admin begins review         → status becomes 'under_review'
//   5. Admin approves/rejects      → status becomes 'approved' | 'rejected'
//                                    approve also promotes role to 'tutor'

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '@/routes/middleware/requireAuth';
import { prisma }      from '@/config/database';
import { AuthContext } from '@/types/auth';

const router = Router();

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  const auth = res.locals.auth as AuthContext;
  if (auth?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

const VALID_STATUSES = ['pending', 'seen', 'under_review', 'approved', 'rejected'] as const;
type ApplicationStatus = typeof VALID_STATUSES[number];

// ─────────────────────────────────────────────────────────
// STUDENT ROUTES
// ─────────────────────────────────────────────────────────

/* ── POST /api/tutor-applications/start ─────────────
   Any student can start an application.
   Creates the application row + promotes role to tutor_applicant.
   Idempotent — safe to call again if already applicant.
   ───────────────────────────────────────────────────── */

router.post('/start', requireAuth, async (req, res) => {
  try {
    const { userId, role } = res.locals.auth as AuthContext;

    if (role === 'tutor') {
      return res.status(400).json({ success: false, error: 'You are already a tutor' });
    }
    if (role === 'admin') {
      return res.status(400).json({ success: false, error: 'Admins cannot apply' });
    }

    // Check for existing application
    const existing = await prisma.tutorApplication.findFirst({
      where:  { userId },
      select: { id: true, status: true },
    });

    if (existing?.status === 'approved') {
      return res.status(400).json({ success: false, error: 'Your application has already been approved' });
    }

    if (existing) {
      // Already started — just return the existing one
      return res.json({ success: true, applicationId: existing.id, alreadyStarted: true });
    }

    // Create application + promote role in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.tutorApplication.create({
        data: { userId, status: 'pending' },
      });

      // Promote to tutor_applicant so they see the applicant dashboard
      await tx.userProfile.update({
        where: { userId },
        data:  { role: 'tutor_applicant' },
      });

      return application;
    });

    return res.status(201).json({ success: true, applicationId: result.id });
  } catch (err: any) {
    console.error('[tutor-applications/start] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to start application' });
  }
});

/* ── PATCH /api/tutor-applications/my-application ───
   Applicant fills in their application details.
   Can be called multiple times — fields are optional, saves what's provided.
   ───────────────────────────────────────────────────── */

router.patch('/my-application', requireAuth, async (req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;

    const application = await prisma.tutorApplication.findFirst({
      where:  { userId },
      select: { id: true, status: true },
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'No application found — start one first' });
    }

    if (['approved', 'rejected'].includes(application.status)) {
      return res.status(400).json({ success: false, error: `Cannot edit a ${application.status} application` });
    }

    const {
      educationBackground,
      teachingExperience,
      whyTutor,
      qualifications,
      subjectIds,           // array of subject UUIDs
    } = req.body;

    // Build update payload — only include fields that were sent
    const data: Record<string, any> = {};
    if (educationBackground !== undefined) data.educationBackground = educationBackground;
    if (teachingExperience  !== undefined) data.teachingExperience  = teachingExperience;
    if (whyTutor            !== undefined) data.whyTutor            = whyTutor;
    if (qualifications      !== undefined) data.qualifications      = qualifications;

    await prisma.$transaction(async (tx) => {
      // Update application content
      if (Object.keys(data).length > 0) {
        await tx.tutorApplication.update({
          where: { id: application.id },
          data,
        });
      }

      // Replace subject selections if provided
      if (Array.isArray(subjectIds)) {
        await tx.applicationSubject.deleteMany({
          where: { applicationId: application.id },
        });

        if (subjectIds.length > 0) {
          await tx.applicationSubject.createMany({
            data: subjectIds.map((subjectId: string) => ({
              applicationId: application.id,
              subjectId,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[tutor-applications/my-application PATCH] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update application' });
  }
});

/* ── GET /api/tutor-applications/my-application ─────
   Applicant checks their own application status and content.
   ───────────────────────────────────────────────────── */

router.get('/my-application', requireAuth, async (req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;

    const application = await prisma.tutorApplication.findFirst({
      where: { userId },
      select: {
        id:                  true,
        status:              true,
        submittedAt:         true,
        reviewedAt:          true,
        notes:               true,           // admin review notes (read-only for applicant)
        educationBackground: true,
        teachingExperience:  true,
        whyTutor:            true,
        qualifications:      true,
        applicationSubjects: {
          select: {
            subject: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    if (!application) {
      return res.json({ success: true, application: null });
    }

    return res.json({
      success: true,
      application: {
        ...application,
        subjects: application.applicationSubjects.map(s => s.subject),
        applicationSubjects: undefined,   // clean up the nested key
      },
    });
  } catch (err) {
    console.error('[tutor-applications/my-application GET] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch application' });
  }
});

/* ── POST /api/tutor-applications/submit ────────────
   Applicant formally submits their completed application.
   Validates required fields are present before allowing submission.
   ───────────────────────────────────────────────────── */

router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;

    const application = await prisma.tutorApplication.findFirst({
      where:  { userId },
      select: {
        id:                  true,
        status:              true,
        educationBackground: true,
        teachingExperience:  true,
        whyTutor:            true,
        applicationSubjects: { select: { subjectId: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'Start an application first' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Application is already ${application.status}` });
    }

    // Require minimum fields before submission
    const missing: string[] = [];
    if (!application.educationBackground) missing.push('educationBackground');
    if (!application.teachingExperience)  missing.push('teachingExperience');
    if (!application.whyTutor)            missing.push('whyTutor');
    if (!application.applicationSubjects.length) missing.push('subjects (at least one)');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error:   'Please complete your application before submitting',
        missing,
      });
    }

    // Mark as pending (already is, but sets submittedAt explicitly)
    await prisma.tutorApplication.update({
      where: { id: application.id },
      data:  { submittedAt: new Date() },
    });

    return res.json({ success: true, message: 'Application submitted successfully' });
  } catch (err: any) {
    console.error('[tutor-applications/submit] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit application' });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────

/* ── GET /api/tutor-applications/admin/all ──────────
   List all applications. Filter by ?status=pending|seen|under_review|approved|rejected
   ───────────────────────────────────────────────────── */

router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    const where: Record<string, any> = {};
    if (status && VALID_STATUSES.includes(status as ApplicationStatus)) {
      where.status = status;
    }

    const applications = await prisma.tutorApplication.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      select: {
        id:          true,
        userId:      true,
        status:      true,
        submittedAt: true,
        reviewedAt:  true,
        user: {
          select: { username: true, role: true, createdAt: true },
        },
        applicationSubjects: {
          select: { subject: { select: { id: true, name: true } } },
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
   Open a single application for review.
   Automatically marks it as 'seen' if it was 'pending'.
   ───────────────────────────────────────────────────── */

router.get('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId: adminId } = res.locals.auth as AuthContext;

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
        ageVerified:         true,
        user: {
          select: {
            username:    true,
            role:        true,
            createdAt:   true,
            dateOfBirth: true,
          },
        },
        applicationSubjects: {
          select: {
            subject: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    // Auto-advance to 'seen' when admin first opens it
    if (application.status === 'pending') {
      await prisma.tutorApplication.update({
        where: { id: application.id },
        data:  { status: 'seen', reviewedBy: adminId },
      });
      application.status    = 'seen';
      application.reviewedBy = adminId;
    }

    return res.json({
      success: true,
      application: {
        ...application,
        subjects: application.applicationSubjects.map(s => s.subject),
        applicationSubjects: undefined,
      },
    });
  } catch (err) {
    console.error('[tutor-applications/admin/:id] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch application' });
  }
});

/* ── PATCH /api/tutor-applications/admin/:id/status ─
   Admin manually sets status to 'under_review' | 'seen'
   (approve and reject have their own dedicated endpoints)
   ───────────────────────────────────────────────────── */

router.patch('/admin/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId: adminId } = res.locals.auth as AuthContext;
    const { status }          = req.body;

    // Only intermediate statuses allowed here
    if (!['seen', 'under_review'].includes(status)) {
      return res.status(400).json({
        success: false,
        error:   'Use /approve or /reject endpoints for final decisions. Valid statuses here: seen, under_review',
      });
    }

    const application = await prisma.tutorApplication.findUnique({
      where:  { id: req.params.id },
      select: { status: true },
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    if (['approved', 'rejected'].includes(application.status)) {
      return res.status(400).json({ success: false, error: 'Cannot change status of a finalised application' });
    }

    await prisma.tutorApplication.update({
      where: { id: req.params.id },
      data:  { status, reviewedBy: adminId },
    });

    return res.json({ success: true, status });
  } catch (err: any) {
    console.error('[tutor-applications/admin/status] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

/* ── POST /api/tutor-applications/admin/:id/approve ─
   Approve — promotes user to tutor role.
   ───────────────────────────────────────────────────── */

router.post('/admin/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId: adminId } = res.locals.auth as AuthContext;
    const { notes }           = req.body;

    const application = await prisma.tutorApplication.findUnique({
      where:  { id: req.params.id },
      select: { userId: true, status: true },
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    if (application.status === 'approved') {
      return res.status(400).json({ success: false, error: 'Already approved' });
    }
    if (application.status === 'rejected') {
      return res.status(400).json({ success: false, error: 'Cannot approve a rejected application' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark approved
      await tx.tutorApplication.update({
        where: { id: req.params.id },
        data: {
          status:     'approved',
          reviewedAt: new Date(),
          reviewedBy: adminId,
          notes:      notes ?? null,
        },
      });

      // 2. Promote to tutor
      await tx.userProfile.update({
        where: { userId: application.userId },
        data:  { role: 'tutor' },
      });

      // 3. Create tutor profile if missing
      await tx.tutor.upsert({
        where:  { userId: application.userId },
        update: {},
        create: {
          userId:         application.userId,
          isAvailable:    false,
          isVerified:     false,
          chatMode:       'request',
          isStudentTutor: false,
        },
      });
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[tutor-applications/admin/approve] error:', err);
    return res.status(400).json({ success: false, error: err.message ?? 'Failed to approve' });
  }
});

/* ── POST /api/tutor-applications/admin/:id/reject ──
   Reject — role stays tutor_applicant (or revert to student — your call).
   ───────────────────────────────────────────────────── */

router.post('/admin/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId: adminId } = res.locals.auth as AuthContext;
    const { notes }           = req.body;

    const application = await prisma.tutorApplication.findUnique({
      where:  { id: req.params.id },
      select: { userId: true, status: true },
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    if (application.status === 'rejected') {
      return res.status(400).json({ success: false, error: 'Already rejected' });
    }
    if (application.status === 'approved') {
      return res.status(400).json({ success: false, error: 'Cannot reject an approved application' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark rejected
      await tx.tutorApplication.update({
        where: { id: req.params.id },
        data: {
          status:     'rejected',
          reviewedAt: new Date(),
          reviewedBy: adminId,
          notes:      notes ?? null,
        },
      });

      // 2. Revert role back to student
      await tx.userProfile.update({
        where: { userId: application.userId },
        data:  { role: 'student' },
      });
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[tutor-applications/admin/reject] error:', err);
    return res.status(400).json({ success: false, error: err.message ?? 'Failed to reject' });
  }
});

export default router;