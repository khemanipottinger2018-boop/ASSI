import express from 'express';
import profileRoutes from './profile.js';
import dashboardRoutes from './dashboard.js';
import sessionsRoutes from './sessions.js';
import publicRoutes from './public.js';

const router = express.Router();

// Mount all sub-routes
router.use('/', profileRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/public', publicRoutes);

export default router;