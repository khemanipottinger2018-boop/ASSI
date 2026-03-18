// src/services/tutor-application.service.ts
// ASSI Platform — Tutor Application Service

import { prisma } from '@/config/database';

export class TutorApplicationService {

  static async submit(userId: string, role: string, payload: any): Promise<string> {
    if (role !== 'tutor-applicant') {
      throw new Error('Only tutor applicants can submit applications');
    }

    const existing = await prisma.tutorApplication.findFirst({
      where:  { userId },
      select: { id: true, status: true },
    });

    if (existing?.status === 'pending')  throw new Error('You already have a pending application');
    if (existing?.status === 'approved') throw new Error('Your application has already been approved');

    const application = await prisma.tutorApplication.create({
      data: { userId, status: 'pending' },
    });

    return application.id;
  }

  static async getUserApplication(userId: string) {
    return prisma.tutorApplication.findFirst({
      where:  { userId },
      select: {
        id:          true,
        status:      true,
        submittedAt: true,
        reviewedAt:  true,
        notes:       true,
      },
    });
  }

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

  static async approve(applicationId: string, reviewNotes?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const application = await tx.tutorApplication.findUnique({
        where:  { id: applicationId },
        select: { userId: true, status: true },
      });

      if (!application)                    throw new Error('Application not found');
      if (application.status !== 'pending') throw new Error('Application is not pending');

      const { userId } = application;

      await tx.tutorApplication.update({
        where: { id: applicationId },
        data: {
          status:     'approved',
          reviewedAt: new Date(),
          notes:      reviewNotes ?? null,
        },
      });

      await tx.userProfile.update({
        where: { userId },
        data:  { role: 'tutor' },
      });

      await tx.tutor.upsert({
        where:  { userId },
        update: {},
        create: {
          userId,
          isAvailable:    false,
          isVerified:     false,
          chatMode:       'request',
          isStudentTutor: false,
        },
      });
    });
  }

  static async reject(applicationId: string, reviewNotes?: string): Promise<void> {
    const application = await prisma.tutorApplication.findUnique({
      where:  { id: applicationId },
      select: { status: true },
    });

    if (!application)                    throw new Error('Application not found');
    if (application.status !== 'pending') throw new Error('Application is not pending');

    await prisma.tutorApplication.update({
      where: { id: applicationId },
      data: {
        status:     'rejected',
        reviewedAt: new Date(),
        notes:      reviewNotes ?? null,
      },
    });
  }
}