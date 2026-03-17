// backend/src/routes/presence.routes.ts
// Mount as: app.use('/api/presence', router)
//
// Response shape contract (must match PresenceProvider.applyPresencePayload):
//   { success, online, intent, socketConnected, discoverable, lastActivity? }
//
// PresenceProvider reads:
//   GET  /me        → applyPresencePayload(data)
//   PATCH /intent   → data.intent, data.online, data.socketConnected, data.discoverable
//   POST /heartbeat → fire-and-forget, response ignored

import { Router } from 'express';
import { requireAuth }          from '@/routes/middleware/requireAuth';
import { redisPresenceService } from '@/infra/redis';
import { AuthContext }           from '@/types/auth';
import type { StatusIntent }     from '@/infra/redis/redis.presence.service';

const router = Router();

/* ── GET /api/presence/me ────────────────────────────
   Called by PresenceProvider on mount and by refreshPresence().
   Returns the full presence shape so the provider can hydrate
   all fields in one shot: online, intent, socketConnected,
   discoverable. Provider calls applyPresencePayload(data)
   which reads all four.
   ─────────────────────────────────────────────────── */

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;

    const presence = await redisPresenceService.getFullPresence(userId);

    return res.json({
      success:         true,
      online:          presence.online,
      intent:          presence.intent,
      socketConnected: presence.socketConnected,
      discoverable:    presence.discoverable,
      lastActivity:    presence.lastActivity,
    });
  } catch (err) {
    console.error('[presence/me] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to get presence' });
  }
});

/* ── POST /api/presence/heartbeat ────────────────────
   Called every 45s by PresenceProvider to refresh the
   presence TTL and keep the session alive.
   Body: { intent?: StatusIntent }
   Response is ignored by the provider — fire and forget.
   ─────────────────────────────────────────────────── */

router.post('/heartbeat', requireAuth, async (req, res) => {
  try {
    const { userId }                       = res.locals.auth as AuthContext;
    const intent: StatusIntent | undefined = req.body?.intent;

    await redisPresenceService.refreshPresence(userId, intent);

    return res.json({ success: true });
  } catch (err) {
    console.error('[presence/heartbeat] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to refresh presence' });
  }
});

/* ── PATCH /api/presence/intent ──────────────────────
   Called by PresenceProvider.setIntent() when the user
   explicitly changes their status (e.g. tutor toggling
   available/DND, or the app setting busy_session on
   session start).

   Returns the full presence shape so the provider can
   update all fields atomically from a single response —
   no secondary GET needed.
   ─────────────────────────────────────────────────── */

router.patch('/intent', requireAuth, async (req, res) => {
  try {
    const { userId, role } = res.locals.auth as AuthContext;
    const { intent }       = req.body as { intent?: StatusIntent };

    if (!intent) {
      return res.status(400).json({ success: false, error: 'intent is required' });
    }

    const validIntents: StatusIntent[] = [
      'available',
      'do_not_disturb',
      'busy_session',
      'busy_other',
    ];

    if (!validIntents.includes(intent)) {
      return res.status(400).json({ success: false, error: `Invalid intent: ${intent}` });
    }

    // Tutors need the availability set synced whenever intent changes
    if (role === 'tutor') {
      if (intent === 'available') {
        await redisPresenceService.setTutorAvailable(userId, true);
      } else {
        // DND / busy_session / busy_other all remove from discoverable set
        await redisPresenceService.setStatusIntent(userId, intent);
        await redisPresenceService.syncTutorAvailability(userId, true);
      }
    } else {
      await redisPresenceService.setStatusIntent(userId, intent);
    }

    // Return full presence shape — provider reads all four fields directly
    const presence = await redisPresenceService.getFullPresence(userId);

    return res.json({
      success:         true,
      intent:          presence.intent,
      online:          presence.online,
      socketConnected: presence.socketConnected,
      discoverable:    presence.discoverable,
    });
  } catch (err) {
    console.error('[presence/intent] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update intent' });
  }
});

/* ── GET /api/presence/:userId ───────────────────────
   Fetch another user's presence — used by components
   that render a presence dot for a specific user
   (e.g. tutor cards, admin views).
   Returns a trimmed shape — no internal socket counts exposed.
   ─────────────────────────────────────────────────── */

router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const presence = await redisPresenceService.getPresenceData(userId);

    return res.json({
      success:      true,
      userId,
      status:       presence.status,
      lastActivity: presence.lastActivity,
    });
  } catch (err) {
    console.error('[presence/:userId] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to get presence' });
  }
});

export default router;