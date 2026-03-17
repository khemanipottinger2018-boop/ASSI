import { Router } from 'express';

import dashboardRoutes         from './Admin.dashboard';
import usersRoutes             from './Admin.users';
import tutorApplicationsRoutes from './Admin.tutor-applications';
import sessionsRoutes          from './Admin.sessions';
import errorsRoutes            from './Admin.errors';
import metricsRoutes           from './Admin.metrics';

const router = Router();

router.use('/dashboard',          dashboardRoutes);
router.use('/users',              usersRoutes);
router.use('/tutor-applications', tutorApplicationsRoutes);
router.use('/sessions',           sessionsRoutes);
router.use('/errors',             errorsRoutes);
router.use('/metrics',            metricsRoutes);

export default router;