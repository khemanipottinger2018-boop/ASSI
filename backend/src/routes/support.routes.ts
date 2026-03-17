// src/routes/support.routes.ts
// ASSI Platform — Support Tickets
//
// Schema has: subject, body, status, priority, user_id
// Migration needed for: title→subject rename aligned, category, admin_notes, assigned_to
//
// ALTER TABLE support_tickets ADD COLUMN category text DEFAULT 'other';
// ALTER TABLE support_tickets ADD COLUMN admin_notes text;
// ALTER TABLE support_tickets ADD COLUMN assigned_to uuid REFERENCES auth.users(id);
// ALTER TABLE support_tickets RENAME COLUMN subject TO title;  -- or add title as alias

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '@/routes/middleware/requireAuth';
import { prisma }      from '@/config/database';
import { AuthContext } from '@/types/auth';

const router = Router();

const VALID_STATUSES   = ['open', 'in_progress', 'resolved', 'closed'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  const auth = res.locals.auth as AuthContext;
  if (auth?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin only' });
  }
  next();
}

/* ── POST /api/support/tickets ── */

router.post('/tickets', requireAuth, async (req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;
    const { title, description, priority = 'normal' } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Title and description are required' });
    }
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ success: false, error: 'Invalid priority' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject:  String(title).substring(0, 200),
        body:     String(description).substring(0, 5000),
        priority,
        status:   'open',
      },
    });

    return res.status(201).json({ success: true, ticketId: ticket.id });
  } catch (err) {
    console.error('[support/tickets/create] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit ticket' });
  }
});

/* ── GET /api/support/tickets/my ── */

router.get('/tickets/my', requireAuth, async (req, res) => {
  try {
    const { userId } = res.locals.auth as AuthContext;
    const pageNum  = Math.max(1, parseInt(req.query.page  as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const tickets = await prisma.supportTicket.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      skip:    (pageNum - 1) * limitNum,
      take:    limitNum,
      select:  { id: true, subject: true, status: true, priority: true, createdAt: true, updatedAt: true },
    });

    return res.json({ success: true, tickets });
  } catch (err) {
    console.error('[support/tickets/my] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
  }
});

/* ── GET /api/support/admin/tickets ── */

router.get('/admin/tickets', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true } } },
    });

    return res.json({
      success: true,
      tickets: tickets.map(t => ({
        id:        t.id,
        subject:   t.subject,
        body:      t.body,
        status:    t.status,
        priority:  t.priority,
        username:  t.user.username,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (err) {
    console.error('[support/admin/tickets] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
  }
});

/* ── PATCH /api/support/admin/tickets/:id ── */

router.patch('/admin/tickets/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;

    const data: Record<string, any> = {};
    if (status   && VALID_STATUSES.includes(status))   data.status   = status;
    if (priority && VALID_PRIORITIES.includes(priority)) data.priority = priority;

    if (!Object.keys(data).length) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    await prisma.supportTicket.update({ where: { id }, data });

    return res.json({ success: true });
  } catch (err) {
    console.error('[support/admin/tickets/update] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update ticket' });
  }
});

export default router;
