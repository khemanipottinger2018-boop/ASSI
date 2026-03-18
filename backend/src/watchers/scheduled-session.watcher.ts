import { prisma }               from '@/config/database';
import { redisRuntimeService }  from '@/infra/redis/redis.runtime.service';
import { notificationService }  from '@/core/notifications/notification.service';

const WATCH_INTERVAL_MS = 30 * 1000;

export function startScheduledSessionWatcher() {
  setInterval(runScheduledSessionCheck, WATCH_INTERVAL_MS);
}

async function runScheduledSessionCheck() {
  try {
    const sessions = await prisma.bookedSession.findMany({
      where: {
        status:      'confirmed',
        scheduledAt: { lte: new Date() },
        startedAt:   null,
      },
      select: {
        id:        true,
        studentId: true,
        tutorId:   true,
        subjectId: true,
      },
    });

    for (const session of sessions) {
      await startSession(session);
    }
  } catch (err) {
    console.error('[Watcher] scheduled session check error:', err);
  }
}

async function startSession(session: {
  id:        string;
  studentId: string;
  tutorId:   string;
  subjectId: string | null;
}) {
  try {
    // 1. Create runtime session in Redis
    await redisRuntimeService.createSession(session.id, {
      type:      'booked',
      tutorId:   session.tutorId,
      studentId: session.studentId,
    });

    // 2. Update DB — startedAt: null guard prevents double-start
    await prisma.bookedSession.updateMany({
      where: {
        id:        session.id,
        startedAt: null,          // idempotency guard
      },
      data: {
        status:    'active',
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 3. Notify both parties
    await Promise.all([
      notificationService.notify({
        userId: session.studentId,
        type:   'session_started',
        title:  'Your session has started',
        body:   'Your booked tutoring session is now live.',
        data:   { sessionId: session.id },
      }),
      notificationService.notify({
        userId: session.tutorId,
        type:   'session_started',
        title:  'Session started',
        body:   'Your booked tutoring session is now live.',
        data:   { sessionId: session.id },
      }),
    ]);

    console.log(`[Watcher] Started booked session ${session.id}`);
  } catch (err) {
    console.error(`[Watcher] Failed to start session ${session.id}:`, err);
  }
}