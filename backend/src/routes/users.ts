import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();

// GET /users (Admin only)
router.get('/', authenticate, requireRole('ADMIN'), async (_req, res) => {
  const users = await prisma.profiles.findMany({
    orderBy: { created_at: 'desc' }
  });
  res.json(users);
});

// PUT /users/:id/role (Admin only)
router.put('/:id/role', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body; // 'PATIENT' | 'DOCTOR' | 'ADMIN'

  if (!['PATIENT', 'DOCTOR', 'ADMIN'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const profile = await tx.profiles.update({
        where: { id },
        data: { role }
      });

      // If promoted to doctor and doctors row doesn't exist, create it
      if (role === 'DOCTOR') {
        const existing = await tx.doctors.findUnique({ where: { profile_id: id } });
        if (!existing) {
          await tx.doctors.create({
            data: { profile_id: id, specialization: 'General Practice' }
          });
        }
      }
      return profile;
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

export default router;
