import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  appointmentId: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  doctorId: { type: String, required: true },
  symptoms: { type: String, required: true },
  diagnosis: { type: String, required: true },
  treatment: { type: String, required: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

noteSchema.index({ patientId: 1, createdAt: -1 });

export const ConsultationNote = mongoose.model('ConsultationNote', noteSchema);
