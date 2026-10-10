/**
 * middleware/auth.ts
 *
 * Two middleware functions:
 *
 * 1. authenticate  – verifies the Supabase JWT in the Authorization header,
 *    then loads the user's role from the profiles table.
 *    Attaches { id, email, role } to req.user.
 *    Returns 401 if the token is missing or invalid.
 *
 * 2. requireRole   – factory that returns middleware enforcing a role list.
 *    Returns 403 if the authenticated user's role is not in the allowed list.
 */
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import prisma from '../db/prisma';
import { env } from '../config/env';

// Use the service-role client so we can read profiles regardless of RLS
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

// Extend Express's Request type so TypeScript knows about req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * authenticate
 * Reads Bearer <token>, verifies it with Supabase Auth, then loads the
 * matching profile row to get the application role.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Ask Supabase Auth to verify the JWT and return the user payload
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Load the application-level role from our profiles table
  const profile = await prisma.profiles.findUnique({
    where: { id: data.user.id },
    select: { id: true, email: true, role: true },
  });

  if (!profile) {
    res.status(401).json({ error: 'Profile not found. Please sign in again.' });
    return;
  }

  // Attach to request so downstream handlers can read it
  req.user = { id: profile.id, email: profile.email, role: profile.role };
  next();
}

/**
 * requireRole
 * Usage: router.get('/path', authenticate, requireRole('ADMIN'), handler)
 * Accepts one or more roles.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
}
