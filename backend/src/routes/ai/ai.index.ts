// backend/src/routes/ai/index.ts
import { Router } from 'express';
import assiRoutes     from './assi';
import sentinelRoutes from './sentinel';
import sentinelApiRoutes from './sentinel.routes';

const router = Router();

router.use(assiRoutes);          // POST /api/ai/assist
router.use(sentinelRoutes);      // POST /api/ai/sentinel
router.use('/sentinel', sentinelApiRoutes); // GET|PATCH /api/ai/sentinel/*

export default router;