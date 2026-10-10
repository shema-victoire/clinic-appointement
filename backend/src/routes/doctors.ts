import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();

// GET /doctors (Patient, Doctor, Admin)
router.get('/', authenticate, requireRole('PATIENT', 'DOCTOR', 'ADMIN'), async (_req, res) => {
  const doctors = await prisma.doctors.findMany({
    include: {
      profile: {
        select: { full_name: true, email: true }
      }
    }
  });
  res.json(doctors);
});

export default router;
