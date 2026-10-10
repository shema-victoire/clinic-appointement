import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import prisma from '../db/prisma';
import { ConsultationNote } from '../db/models/ConsultationNote';
import { publishEvent } from '../services/publisher';

const router = Router();

// GET /appointments
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
  // Admin sees all

  const appointments = await prisma.appointments.findMany({
    where,
    include: {
      patient: { include: { profile: { select: { full_name: true } } } },
      doctor: { include: { profile: { select: { full_name: true } } } },
    },
    orderBy: [{ appointment_date: 'desc' }, { appointment_time: 'desc' }]
  });

  res.json(appointments);
});

// POST /appointments
// Patient only
router.post('/', authenticate, requireRole('PATIENT'), async (req, res) => {
  const { doctor_id, appointment_date, appointment_time, reason } = req.body;
  const userId = req.user!.id;

  try {
    const patient = await prisma.patients.findUnique({ where: { profile_id: userId } });
    if (!patient) return res.status(404).json({ error: 'Patient record not found' });

    const doctor = await prisma.doctors.findUnique({
      where: { id: doctor_id },
      include: { profile: true }
    });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    // Check for double-booking
    const existing = await prisma.appointments.findUnique({
      where: {
        doctor_id_appointment_date_appointment_time: {
          doctor_id,
          appointment_date: new Date(appointment_date),
          appointment_time: new Date(`1970-01-01T${appointment_time}Z`),
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Doctor is already booked for this time slot' });
    }

    const appt = await prisma.appointments.create({
      data: {
        patient_id: patient.id,
        doctor_id,
        appointment_date: new Date(appointment_date),
        appointment_time: new Date(`1970-01-01T${appointment_time}Z`),
        reason,
        status: 'CONFIRMED'
      },
      include: {
        patient: { include: { profile: true } }
      }
    });

    // Publish event for email
    publishEvent('appointment.confirmed', {
      patientEmail: appt.patient.profile.email,
      patientName: appt.patient.profile.full_name,
      doctorName: doctor.profile.full_name,
      date: appointment_date,
      time: appointment_time
    });

    res.status(201).json(appt);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// GET /consultation-notes/:appointmentId
// Patient: own, Doctor: own
router.get('/consultation-notes/:appointmentId', authenticate, requireRole('PATIENT', 'DOCTOR'), async (req, res) => {
  const appointmentId = req.params.appointmentId as string;
  const { id: userId, role } = req.user!;

  const appt = await prisma.appointments.findUnique({
    where: { id: appointmentId },
    include: { patient: true, doctor: true }
  });

  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  if (role === 'PATIENT' && appt.patient.profile_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (role === 'DOCTOR' && appt.doctor.profile_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const note = await ConsultationNote.findOne({ appointmentId });
  if (!note) return res.status(404).json({ error: 'Consultation note not found' });

  res.json(note);
});

// POST /appointments/:id/complete
// Doctor only: Own appointments
router.post('/:id/complete', authenticate, requireRole('DOCTOR'), async (req, res) => {
  const { id: appointmentId } = req.params;
  const { symptoms, diagnosis, treatment, notes, prescriptionItems } = req.body;
  const userId = req.user!.id;

  try {
    const doctor = await prisma.doctors.findUnique({ where: { profile_id: userId } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const appt = await prisma.appointments.findUnique({ where: { id: appointmentId as string } });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    if (appt.doctor_id !== doctor.id) {
      return res.status(403).json({ error: 'Forbidden: You can only complete your own appointments' });
    }

    if (appt.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Appointment already completed' });
    }

    // 1. Save consultation note to MongoDB
    await ConsultationNote.create({
      appointmentId,
      patientId: appt.patient_id,
      doctorId: appt.doctor_id,
      symptoms,
      diagnosis,
      treatment,
      notes
    });

    // 2. Save prescription & items to Postgres, and update appointment status
    await prisma.$transaction(async (tx) => {
      // Create prescription only if items provided
      if (prescriptionItems && prescriptionItems.length > 0) {
        const presc = await tx.prescriptions.create({
          data: {
            appointment_id: appointmentId as string,
            patient_id: appt.patient_id,
            doctor_id: appt.doctor_id,
            status: 'PENDING'
          }
        });

        const itemsToCreate = prescriptionItems.map((item: any) => ({
          prescription_id: presc.id,
          medication_id: item.medication_id,
          quantity: item.quantity,
          dosage_instructions: item.dosage_instructions
        }));

        await tx.prescription_items.createMany({ data: itemsToCreate });
      }

      await tx.appointments.update({
        where: { id: appointmentId as string },
        data: { status: 'COMPLETED' }
      });
    });

    res.json({ message: 'Appointment completed successfully' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete appointment' });
  }
});

export default router;
