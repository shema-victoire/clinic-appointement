/**
 * routes/health.ts
 * GET /health – public endpoint to confirm the server is running.
 * Returns 200 with a JSON body so it's easy to test with curl.
 */
import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
