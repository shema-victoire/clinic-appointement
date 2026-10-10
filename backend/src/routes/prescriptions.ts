import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import prisma from '../db/prisma';
import { publishEvent } from '../services/publisher';

const router = Router();

// GET /prescriptions
// Patient: own, Doctor: own, Admin: all
router.get('/', authenticate, async (req, res) => {
  const { id: userId, role } = req.user!;
  
  let where = {};
  
  if (role === 'PATIENT') {
    const patient = await prisma.patients.findUnique({ where: { profile_id: userId } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    where = { patient_id: patient.id };
  } else if (role === 'DOCTOR') {
    const doctor = await prisma.doctors.findUnique({ where: { profile_id: userId } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    where = { doctor_id: doctor.id };
  }

  const prescriptions = await prisma.prescriptions.findMany({
    where,
    include: {
      patient: { include: { profile: { select: { full_name: true, email: true } } } },
      doctor: { include: { profile: { select: { full_name: true } } } },
      items: {
        include: { medication: true }
      },
      appointment: { select: { appointment_date: true } }
    },
    orderBy: { created_at: 'desc' }
  });

  res.json(prescriptions);
});

// PUT /prescriptions/:id/fulfill
// Admin only
router.put('/:id/fulfill', authenticate, requireRole('ADMIN'), async (req, res) => {
  const id = req.params.id as string;

  try {
    const presc = await prisma.prescriptions.findUnique({
      where: { id },
      include: {
        items: { include: { medication: true } },
        patient: { include: { profile: true } },
        appointment: true
      }
    });

    if (!presc) return res.status(404).json({ error: 'Prescription not found' });
    if (presc.status === 'FULFILLED') {
      return res.status(400).json({ error: 'Prescription already fulfilled' });
    }

    // Check stock for all items
    const shortItems = presc.items.filter(
      (item) => item.medication.quantity_in_stock < item.quantity
    );

    if (shortItems.length > 0) {
      const shortages = shortItems.map(
        i => `${i.medication.name} (Need: ${i.quantity}, Have: ${i.medication.quantity_in_stock})`
      );
      return res.status(400).json({
        error: 'Insufficient stock',
        details: shortages
      });
    }

    // Fulfil in a single transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update prescription status
      await tx.prescriptions.update({
        where: { id },
        data: { status: 'FULFILLED', fulfilled_at: new Date() }
      });

      // 2. Decrement stock for each medication
      for (const item of presc.items) {
        await tx.medications.update({
          where: { id: item.medication_id },
          data: { quantity_in_stock: { decrement: item.quantity } }
        });
      }
    });

    // Publish event
    publishEvent('prescription.fulfilled', {
      patientEmail: presc.patient.profile.email,
      patientName: presc.patient.profile.full_name,
      date: presc.appointment.appointment_date
    });

    res.json({ message: 'Prescription fulfilled successfully' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fulfill prescription' });
  }
});

export default router;
