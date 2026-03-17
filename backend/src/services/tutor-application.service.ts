// src/services/tutor-application.service.ts
// ASSI Platform — Tutor Application Service
// Critical path: approve() promotes a user to tutor role.
// Uses Prisma interactive transaction — atomic, no raw SQL.

import { prisma } from '@/config/database';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export class TutorApplicationService {

  // ── Submit ─────────────────────────────────────────

  static async submit(userId: string, role: string, payload: any): Promise<string> {
    if (role !== 'tutor-applicant') {
      throw new Error('Only tutor applicants can submit applications');
    }

    const existing = await prisma.tutorApplication.findFirst({
      where:  { userId },
      select: { id: true, status: true },
    });

    if (existing?.status === 'pending') {
      throw new Error('You already have a pending application');
    }
    if (existing?.status === 'approved') {
      throw new Error('Your application has already been approved');
    }

    const application = await prisma.tutorApplication.create({
      data: { userId, status: 'pending' },
    });

    return application.id;
  }

  // ── Get user's own application ─────────────────────

  static async getUserApplication(userId: string) {
    return prisma.tutorApplication.findFirst({
      where:  { userId },
      select: {
        id:         true,
        status:     true,
        submittedAt: true,
        reviewedAt: true,
        notes:      true,
      },
    });
  }

  // ── Admin: get pending ─────────────────────────────

  static async getPending() {
    const applications = await prisma.tutorApplication.findMany({
      where:   { status: 'pending' },
      orderBy: { submittedAt: 'asc' },
      select: {
        id:          true,
        userId:      true,
        submittedAt: true,
        user: {
          select: { username: true },
        },
      },
    });

    return applications.map(a => ({
      id:          a.id,
      userId:      a.userId,
      username:    a.user.username,
      submittedAt: a.submittedAt,
    }));
  }

  // ── Admin: approve ─────────────────────────────────
  // Atomic transaction:
  //   1. Mark application approved
  //   2. Promote user role to 'tutor' in user_profiles
  //   3. Create tutors row if one doesn't exist yet

  static async approve(applicationId: string, reviewNotes?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const application = await tx.tutorApplication.findUnique({
        where:  { id: applicationId },
        select: { userId: true, status: true },
      });

      if (!application) {
        throw new Error('Application not found');
      }
      if (application.status !== 'pending') {
        throw new Error('Application is not pending');
      }

      const { userId } = application;

      // 1. Mark approved
      await tx.tutorApplication.update({
        where: { id: applicationId },
        data:  {
          status:     'approved',
          reviewedAt: new Date(),
          notes:      reviewNotes ?? null,
        },
      });

      // 2. Promote role
      await tx.userProfile.update({
        where: { userId },
        data:  { role: 'tutor' },
      });

      // 3. Create tutor profile if missing (upsert — safe to call twice)
      await tx.tutor.upsert({
        where:  { userId },
        update: {},   // already exists — leave it alone
        create: {
          userId,
          isAvailable:       false,  // tutor sets themselves available manually
          isVerified:        false,
          chatMode:          'request',
          maxConcurrentChats: 1,
          isStudentTutor:    false,
        },
      });
    });
  }

  // ── Admin: reject ──────────────────────────────────

  static async reject(applicationId: string, reviewNotes?: string): Promise<void> {
    const application = await prisma.tutorApplication.findUnique({
      where:  { id: applicationId },
      select: { status: true },
    });

    if (!application) {
      throw new Error('Application not found');
    }
    if (application.status !== 'pending') {
      throw new Error('Application is not pending');
    }

    await prisma.tutorApplication.update({
      where: { id: applicationId },
      data:  {
        status:     'rejected',
        reviewedAt: new Date(),
        notes:      reviewNotes ?? null,
      },
    });
  }
}
