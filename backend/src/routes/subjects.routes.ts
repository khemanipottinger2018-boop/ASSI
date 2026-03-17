// src/routes/subjects.routes.ts
// ASSI Platform — Subjects

import { Router } from 'express';
import { prisma } from '@/config/database';

const router = Router();

const VALID_LEVELS = ['CSEC', 'CAPE'];

/* ── Shared helper: subject + tutor count ── */
async function getSubjectsWithCount(where: Record<string, any> = {}) {
  const subjects = await prisma.subject.findMany({
    where,
    include: { _count: { select: { tutors: true } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  return subjects.map(s => ({
    id:         s.id,
    name:       s.name,
    category:   s.category,
    tutorCount: s._count.tutors,
  }));
}

router.get('/public', async (_req, res) => {
  try {
    const subjects = await getSubjectsWithCount();
    return res.json({ success: true, subjects, count: subjects.length });
  } catch (err) {
    console.error('[subjects/public] error:', err);
    return res.json({ success: true, subjects: [], count: 0 });
  }
});

router.get('/popular', async (_req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: { _count: { select: { tutors: true } } },
      orderBy: { tutors: { _count: 'desc' } },
      take:    10,
    });
    return res.json({
      success:  true,
      subjects: subjects.map(s => ({ id: s.id, name: s.name, category: s.category, tutorCount: s._count.tutors })),
    });
  } catch (err) {
    console.error('[subjects/popular] error:', err);
    return res.json({ success: true, subjects: [] });
  }
});

router.get('/grouped/by-level', async (_req, res) => {
  try {
    const subjects = await getSubjectsWithCount();
    const grouped  = subjects.reduce((acc: Record<string, any[]>, s) => {
      const key = s.category ?? 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});
    return res.json({ success: true, subjects: grouped, total: subjects.length });
  } catch (err) {
    console.error('[subjects/grouped] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
});

router.get('/by-level/:level', async (req, res) => {
  try {
    const { level } = req.params;
    if (!VALID_LEVELS.includes(level)) {
      return res.status(400).json({ success: false, error: 'Invalid level' });
    }
    const subjects = await getSubjectsWithCount({ category: level });
    return res.json({ success: true, subjects, level, count: subjects.length });
  } catch (err) {
    console.error('[subjects/by-level] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
});

router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Query too short' });
    }
    const subjects = await getSubjectsWithCount({
      name: { contains: query.trim(), mode: 'insensitive' },
    });
    return res.json({ success: true, subjects, query, count: subjects.length });
  } catch (err) {
    console.error('[subjects/search] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to search subjects' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { level } = req.query;
    const where = VALID_LEVELS.includes(level as string) ? { category: level as string } : {};
    const subjects = await getSubjectsWithCount(where);
    return res.json({ success: true, subjects, count: subjects.length });
  } catch (err) {
    console.error('[subjects] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
});

// Keep last — catches /:id
router.get('/:id', async (req, res) => {
  try {
    const subject = await prisma.subject.findUnique({
      where:   { id: req.params.id },
      include: { _count: { select: { tutors: true } } },
    });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    return res.json({
      success: true,
      subject: { id: subject.id, name: subject.name, category: subject.category, tutorCount: subject._count.tutors },
    });
  } catch (err) {
    console.error('[subjects/:id] error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch subject' });
  }
});

export default router;
