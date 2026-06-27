// Health check route.

import { Router } from 'express';
import { ok } from '../envelope.js';

export const healthRouter = (): Router => {
  const router = Router();
  router.get('/health', (_req, res) => {
    ok(res, { status: 'ok', service: 'agentFabric', version: '0.1.0' });
  });
  return router;
};
