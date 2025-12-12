// backend/src/routes/chat.ts
import express from 'express';
import { db } from '@/config/database';
import { authenticate, AuthRequest } from '@/middleware/auth';
import { redisService } from '@/infra/redis/redis.service';

const router = express.Router();

// ---------------- GET ALL SESSIONS ----------------
router.get('/sessions', authenticate, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const role = req.user!.role;

  try {
    let sessions: any[] = [];

    // 1️⃣ Live sessions from Redis
    const liveSessions = await redisService.client.sMembers(`user:live_sessions:${userId}`); 
    // returns sessionIds user is part of
    const liveSessionsData = await Promise.all(
      liveSessions.map(async (sessionId) => {
        const meta = await redisService.client.hGetAll(`chat:session:${sessionId}:meta`);
        return {
          id: sessionId,
          partnerId: meta.studentId === userId ? meta.tutorId : meta.studentId,
          partnerName: meta.studentName === req.user!.username ? meta.tutorName : meta.studentName,
          subjectId: meta.subjectId,
          subjectName: meta.subjectName,
          status: 'active', // live chat active
          live: true,
          startedAt: meta.startedAt ? new Date(meta.startedAt) : null,
        };
      })
    );

    sessions.push(...liveSessionsData);

    // 2️⃣ Booked sessions from DB
    const bookedSessions = await db.query(`
      SELECT cs.id, cs.student_id, cs.tutor_id, cs.subject_id, cs.status, s.name as subject_name, 
             stu.username as student_name, tut.username as tutor_name, cs.started_at
      FROM chat_sessions cs
      JOIN Users stu ON cs.student_id = stu.id
      JOIN Users tut ON cs.tutor_id = tut.id
      JOIN Subjects s ON cs.subject_id = s.subject_id
      WHERE (cs.student_id = @user_id OR cs.tutor_id = @user_id)
      AND cs.converted_to_booked = 1
      ORDER BY cs.started_at DESC
    `, { user_id: userId });

    sessions.push(...bookedSessions.map(s => ({
      id: s.id,
      partnerId: role === 'student' ? s.tutor_id : s.student_id,
      partnerName: role === 'student' ? s.tutor_name : s.student_name,
      subjectId: s.subject_id,
      subjectName: s.subject_name,
      status: s.status,
      live: false,
      startedAt: s.started_at,
    })));

    res.json({ success: true, sessions });
  } catch (err) {
    console.error('Fetch sessions error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

// ---------------- GET MESSAGES ----------------
router.get('/sessions/:sessionId/messages', authenticate, async (req: AuthRequest, res) => {
  const { sessionId } = req.params;
  const userId = req.user!.id;

  try {
    // Check if session exists in live chat Redis
    const isLive = await redisService.client.exists(`chat:session:${sessionId}:meta`);

    let messages: any[] = [];

    if (isLive) {
      const msgList = await redisService.client.lRange(`chat:messages:${sessionId}`, 0, -1);
      messages = msgList.map(m => JSON.parse(m));
    } else {
      // fallback: DB messages
      const dbMessages = await db.query(`
        SELECT cm.id, cm.session_id, cm.from_user_id, cm.message, cm.message_type_id, cm.sent_at, cm.read_at, u.username as sender_name
        FROM chat_messages cm
        JOIN Users u ON cm.from_user_id = u.id
        WHERE cm.session_id = @session_id
        ORDER BY cm.sent_at ASC
      `, { session_id: sessionId });

      messages = dbMessages.map(msg => ({
        id: msg.id,
        sessionId: msg.session_id,
        senderId: msg.from_user_id,
        senderName: msg.sender_name,
        message: msg.message,
        type: msg.message_type_id === 1 ? 'text' : 'file',
        sentAt: msg.sent_at,
        readAt: msg.read_at,
        isMine: msg.from_user_id === userId
      }));
    }

    res.json({ success: true, messages });
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

export default router;
