/**
 * routes/auth.ts
 * POST /auth/me – called by the frontend right after Google sign-in.
 *
 * On first login:
 *   1. Creates (or finds) the profile row (id comes from the verified JWT).
 *   2. If the profile is new and has role PATIENT, also creates the patients row.
 *
 * Race-safe: if two concurrent requests both attempt to create the same profile
 * (P2002 unique-constraint on `id`), the loser catches the error and reads the
 * existing row instead of throwing, so both requests still return 200.
 *
 * Never downgrades an existing user's role.
 *
 * Returns { profile }.
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../db/prisma';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { Prisma } from '@prisma/client';

const router = Router();
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

router.post('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  // Fetch full_name / email from Supabase admin API
  const { data } = await supabase.auth.admin.getUserById(userId);
  const authUser = data?.user;

  const fullName: string =
    authUser?.user_metadata?.full_name ??
    authUser?.user_metadata?.name ??
    'Unknown';

  const email: string = authUser?.email ?? req.user!.email;

  // ── Step 1: create-or-find the profile (race-safe) ──────────────────────────
  let profile: Awaited<ReturnType<typeof prisma.profiles.findUniqueOrThrow>>;

  try {
    // Optimistic create – works for the first request and for every subsequent
    // request once the row exists (upsert would also work, but explicit create
    // makes the race-safety handling clearer).
    profile = await prisma.profiles.upsert({
      where:  { id: userId },
      update: {},                                         // never overwrite role
      create: { id: userId, full_name: fullName, email, role: 'PATIENT' },
    });
  } catch (err) {
    // Another concurrent request already inserted the row.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const existing = await prisma.profiles.findUnique({ where: { id: userId } });
      if (!existing) {
        // Should never happen, but guard just in case.
        res.status(500).json({ error: 'Profile creation race – could not read row' });
        return;
      }
      profile = existing;
    } else {
      throw err; // unexpected error – let Express error handler deal with it
    }
  }

  // ── Step 2: ensure patients row exists (also race-safe) ─────────────────────
  if (profile.role === 'PATIENT') {
    const existingPatient = await prisma.patients.findUnique({
      where: { profile_id: profile.id },
    });
    if (!existingPatient) {
      try {
        await prisma.patients.create({ data: { profile_id: profile.id } });
      } catch (err) {
        // Another concurrent request already created the patients row – that's fine.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
          throw err;
        }
      }
    }
  }

  res.json({ profile });
});

export default router;
