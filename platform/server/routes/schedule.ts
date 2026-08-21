// P0010.1 Slice 3 — Scheduled Acquisition API (list + run-now).
// Thin adapter over the shared ScheduledAcquisitionRunner. Run-now is provided
// for on-demand verification; the scheduler also ticks on its own interval.
// The scheduler reuses the existing capability → Evidence path (no second
// acquisition implementation) and never makes business judgments.

import { Router } from 'express';
import type { ScheduledAcquisitionRunner } from '#app/runtime/scheduling/index.js';

export const scheduleRouter = (runner: ScheduledAcquisitionRunner): Router => {
  const router = Router();

  // GET /api/runtime/schedule — current scheduled acquisitions + last-run state.
  router.get('/runtime/schedule', (_req, res) => {
    res.json({ success: true, data: runner.list() });
  });

  // POST /api/runtime/schedule/run — run one scheduled capability now (on-demand).
  router.post('/runtime/schedule/run', async (req, res) => {
    const capability = (req.body?.capability ?? '').toString().trim();
    if (!capability) {
      res.status(400).json({ success: false, error: 'Missing capability' });
      return;
    }
    try {
      const state = await runner.runNow(capability);
      res.json({ success: true, capability, state });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Scheduled run failed',
      });
    }
  });

  return router;
};
