/**
 * routes/auth.ts
 * POST /auth/me – called by the frontend right after Google sign-in.
 *
 * On first login:
 *   1. Upserts the profile row (id comes from the verified JWT).
 *   2. If the profile is new and has role PATIENT, also creates the patients row.
 *
 * Returns the profile so the frontend knows the user's role.
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../db/prisma';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const router = Router();
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

router.post('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  // getUser again to retrieve full_name from user_metadata
  const { data } = await supabase.auth.admin.getUserById(userId);
  const authUser = data?.user;

  const fullName: string =
    authUser?.user_metadata?.full_name ??
    authUser?.user_metadata?.name ??
    'Unknown';

  const email: string = authUser?.email ?? req.user!.email;

  // Upsert profile (safe to call on every login)
  const profile = await prisma.profiles.upsert({
    where: { id: userId },
    update: {},               // don't overwrite role on subsequent logins
    create: { id: userId, full_name: fullName, email, role: 'PATIENT' },
  });

  // If brand new and a patient, create the patients row too
  const existingPatient = await prisma.patients.findUnique({
    where: { profile_id: profile.id },
  });
  if (!existingPatient && profile.role === 'PATIENT') {
    await prisma.patients.create({ data: { profile_id: profile.id } });
  }

  res.json({ profile });
});

export default router;
