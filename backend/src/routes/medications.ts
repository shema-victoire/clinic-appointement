import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();

// GET /medications (Doctor, Admin)
router.get('/', authenticate, requireRole('DOCTOR', 'ADMIN'), async (_req, res) => {
  const meds = await prisma.medications.findMany({
    orderBy: { name: 'asc' }
  });
  res.json(meds);
});

// POST /medications (Admin only)
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { name, quantity_in_stock, price } = req.body;
  if (!name || quantity_in_stock === undefined || price === undefined) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  try {
    const med = await prisma.medications.create({
      data: { name, quantity_in_stock, price }
    });
    res.status(201).json(med);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create medication', details: err.message });
  }
});

// PUT /medications/:id (Admin only)
router.put('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, quantity_in_stock, price } = req.body;
  
  try {
    const med = await prisma.medications.update({
      where: { id },
      data: { name, quantity_in_stock, price }
    });
    res.json(med);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update medication', details: err.message });
  }
});

export default router;
