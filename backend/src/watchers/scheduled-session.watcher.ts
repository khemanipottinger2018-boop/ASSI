import { prisma }               from '@/config/database';
import { redisRuntimeService }  from '@/infra/redis/redis.runtime.service';
import { notificationService }  from '@/core/notifications/notification.service';

const WATCH_INTERVAL_MS = 30 * 1000;

export function startScheduledSessionWatcher() {
  setInterval(runScheduledSessionCheck, WATCH_INTERVAL_MS);
}

async function runScheduledSessionCheck() {
  try {
    // Find all confirmed sessions whose scheduled time has passed
    // and haven't been started yet
    const sessions = await prisma.bookedSession.findMany({
      where: {
        status:         'confirmed',
        scheduled_time: { lte: new Date() },
        started_at:     null,
      },
      select: {
        session_id: true,
        student_id: true,
        tutor_id:   true,
        subject_id: true,
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
  session_id: string;
  student_id: string;
  tutor_id:   string;
  subject_id: string;
}) {
  try {
    // 1. Create runtime session in Redis
    await redisRuntimeService.createSession(session.session_id, {
      type:      'booked',
      tutorId:   session.tutor_id,
      studentId: session.student_id,
    });

    // 2. Update DB — updateMany with started_at: null guard prevents double-start
    await prisma.bookedSession.updateMany({
      where: {
        session_id: session.session_id,
        started_at: null,               // idempotency guard
      },
      data: {
        status:     'active',
        started_at: new Date(),
        updated_at: new Date(),
      },
    });

    // 3. Notify both parties
    await Promise.all([
      notificationService.notify({
        userId: session.student_id,
        type:   'session_started',
        title:  'Your session has started',
        body:   'Your booked tutoring session is now live.',
        data:   { sessionId: session.session_id },
      }),
      notificationService.notify({
        userId: session.tutor_id,
        type:   'session_started',
        title:  'Session started',
        body:   'Your booked tutoring session is now live.',
        data:   { sessionId: session.session_id },
      }),
    ]);

    console.log(`[Watcher] Started booked session ${session.session_id}`);
  } catch (err) {
    console.error(`[Watcher] Failed to start session ${session.session_id}:`, err);
  }
}