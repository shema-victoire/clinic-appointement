/**
 * db/prisma.ts
 * Singleton Prisma client. Import this wherever you need PostgreSQL access.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
