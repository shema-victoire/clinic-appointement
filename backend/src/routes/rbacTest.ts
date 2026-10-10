/**
 * routes/rbacTest.ts
 * Temporary routes used only to prove RBAC works (Checkpoint 1 demo).
 * GET /rbac/admin-only  – requires ADMIN role
 * GET /rbac/doctor-only – requires DOCTOR role
 * These can be removed before submission.
 */
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// 401 without token, 403 for wrong role, 200 for ADMIN
router.get('/admin-only', authenticate, requireRole('ADMIN'), (_req, res) => {
  res.json({ message: 'Hello, Admin!' });
});

// 401 without token, 403 for wrong role, 200 for DOCTOR
router.get('/doctor-only', authenticate, requireRole('DOCTOR'), (_req, res) => {
  res.json({ message: 'Hello, Doctor!' });
});

export default router;
