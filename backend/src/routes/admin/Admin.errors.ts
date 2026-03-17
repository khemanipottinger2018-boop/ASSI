// src/routes/admin/Admin.errors.ts
// Stubbed — error_logs table not in schema yet.
// TODO: create table then implement.
import { Router } from 'express';
import { requireAuth } from '@/routes/middleware/requireAuth';
import { withRole }    from '@/routes/middleware/withRole';
const router = Router();
router.get('/', requireAuth, withRole('admin'), (_req, res) => {
  return res.json({ success: true, range: '24h', count: 0, errors: [] });
});
export default router;
