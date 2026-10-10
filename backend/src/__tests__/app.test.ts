import express, { Request, Response, NextFunction } from 'express';
import supertest from 'supertest';
import * as authMiddleware from '../middleware/auth';

// 1. Mock the auth middleware before importing routes
jest.mock('../middleware/auth', () => {
  const originalModule = jest.requireActual('../middleware/auth');
  return {
    ...originalModule,
    authenticate: jest.fn((req: Request, res: Response, next: NextFunction) => {
      // For testing, we read a custom header 'x-mock-role' to simulate token payload
      const mockRole = req.headers['x-mock-role'] as string;
      if (!mockRole) {
        return res.status(401).json({ error: 'Missing or malformed Authorization header' });
      }
      req.user = { id: 'mock-user-id', email: 'test@example.com', role: mockRole };
      next();
    }),
  };
});

// Import the actual requireRole so it uses the mocked req.user
const { requireRole } = jest.requireActual('../middleware/auth');

// 2. Mock Prisma and Mongoose to avoid real DB calls during RBAC/Validation tests
jest.mock('../db/prisma', () => ({
  __esModule: true,
  default: {
    appointments: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'appt1', patient: { profile: { email: 'a', full_name: 'b' } } })
    },
    patients: {
      findUnique: jest.fn().mockResolvedValue({ id: 'pat1' })
    },
    doctors: {
      findUnique: jest.fn().mockResolvedValue({ id: 'doc1', profile: { full_name: 'doc' } })
    },
    prescriptions: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'presc1',
        status: 'PENDING',
        items: [
          { quantity: 10, medication: { name: 'M1', quantity_in_stock: 5 } } // Insufficient stock!
        ]
      })
    }
  }
}));

jest.mock('../services/publisher', () => ({
  publishEvent: jest.fn()
}));

// 3. Setup Express app with our routes for testing
import appointmentsRouter from '../routes/appointments';
import prescriptionsRouter from '../routes/prescriptions';

const app = express();
app.use(express.json());
app.use('/appointments', appointmentsRouter);
app.use('/prescriptions', prescriptionsRouter);

const request = supertest(app);

describe('Clinic Endpoints', () => {
  
  describe('RBAC properly rejects and accepts', () => {
    it('returns 401 with no token (simulated by missing header)', async () => {
      const res = await request.post('/appointments').send({});
      expect(res.status).toBe(401);
    });

    it('returns 403 for wrong role (Admin cannot book appointments)', async () => {
      const res = await request.post('/appointments')
        .set('x-mock-role', 'ADMIN') // mock token role
        .send({});
      expect(res.status).toBe(403);
    });

    it('processes request for correct role (Patient can book appointment)', async () => {
      const res = await request.post('/appointments')
        .set('x-mock-role', 'PATIENT')
        .send({
          doctor_id: 'doc1',
          appointment_date: '2026-11-01',
          appointment_time: '10:00:00',
          reason: 'Checkup'
        });
      // It passes RBAC and returns 201 (since we mocked DB to return no existing appt)
      expect(res.status).toBe(201);
    });
  });

  describe('Business Logic: Double-booking', () => {
    it('returns 409 when doctor is double booked', async () => {
      // Override mock for this specific test
      const prisma = require('../db/prisma').default;
      prisma.appointments.findUnique.mockResolvedValueOnce({ id: 'existing-appt' });

      const res = await request.post('/appointments')
        .set('x-mock-role', 'PATIENT')
        .send({
          doctor_id: 'doc1',
          appointment_date: '2026-11-01',
          appointment_time: '10:00:00'
        });
      
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already booked/);
    });
  });

  describe('Business Logic: Fulfilment Stock Check', () => {
    it('returns 400 when stock is insufficient', async () => {
      // The default mock for prescriptions.findUnique has insufficient stock (need 10, have 5)
      const res = await request.put('/prescriptions/presc1/fulfill')
        .set('x-mock-role', 'ADMIN');
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Insufficient stock');
      expect(res.body.details[0]).toMatch(/Need: 10, Have: 5/);
    });
  });

});
