// src/routes/user/settings.routes.ts
// ASSI Platform — User Settings
//
// Schema columns (user_settings):
//   email_notifications, push_notifications, theme, language, timezone
//
// ASSI-specific columns need migration before use:
//   ALTER TABLE user_settings ADD COLUMN assi_enabled boolean DEFAULT true;
//   ALTER TABLE user_settings ADD COLUMN assi_position jsonb;
//   ALTER TABLE user_settings ADD COLUMN theme_preference text DEFAULT 'system';
//   ALTER TABLE user_settings ADD COLUMN reduce_motion boolean DEFAULT false;
// TODO: run migration then uncomment ASSI fields below.

import { Router } from 'express';
import { prisma }              from '@/config/database';
import { requireAuth }         from '@/routes/middleware/requireAuth';
import { requireActiveUser }   from '@/routes/middleware/requireActiveUser';
import { AuthContext }         from '@/types/auth';

const router = Router();

/* ── GET /api/user/settings ── */

router.get('/', requireAuth, requireActiveUser, async (_req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return res.json({
        success: true,
        settings: {
          emailNotifications: true,
          pushNotifications:  true,
          theme:              'system',
          language:           'en',
          timezone:           'America/Jamaica',
        },
      });
    }

    return res.json({
      success: true,
      settings: {
        emailNotifications: settings.emailNotifications,
        pushNotifications:  settings.pushNotifications,
        theme:              settings.theme,
        language:           settings.language,
        timezone:           settings.timezone,
      },
    });
  } catch (err) {
    console.error('[settings/get] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load settings' });
  }
});

/* ── PATCH /api/user/settings ── */

router.patch('/', requireAuth, requireActiveUser, async (req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;
    const { emailNotifications, pushNotifications, theme, language, timezone } = req.body;

    const data: Record<string, any> = {};
    if (emailNotifications !== undefined) data.emailNotifications = Boolean(emailNotifications);
    if (pushNotifications  !== undefined) data.pushNotifications  = Boolean(pushNotifications);
    if (theme              !== undefined) data.theme              = theme;
    if (language           !== undefined) data.language           = language;
    if (timezone           !== undefined) data.timezone           = timezone;

    if (!Object.keys(data).length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    await prisma.userSettings.upsert({
      where:  { userId },
      update: data,
      create: {
        userId,
        emailNotifications: data.emailNotifications ?? true,
        pushNotifications:  data.pushNotifications  ?? true,
        theme:              data.theme              ?? 'system',
        language:           data.language           ?? 'en',
        timezone:           data.timezone           ?? 'America/Jamaica',
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('[settings/patch] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

export default router;
