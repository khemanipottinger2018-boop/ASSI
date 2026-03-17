import { Router } from 'express';

import login       from './login';
import register    from './register';
import logout      from './logout';
import logoutAll   from './logout-all';
import me          from './me';
import convertDemo from './convert-demo';

import { requireAuth } from '@/routes/middleware/requireAuth';

const router = Router();

/* ── Public ── */
router.use('/login',    login);
router.use('/register', register);

/* ── Protected ── */
router.use('/me',           requireAuth, me);
router.use('/logout',       requireAuth, logout);
router.use('/logout-all',   requireAuth, logoutAll);
router.use('/convert-demo', requireAuth, convertDemo);

export default router;