/**
 * server.ts – Entry point for the Express API.
 *
 * Startup sequence:
 *   1. Load and validate env vars (throws early if anything is missing)
 *   2. Connect to MongoDB
 *   3. Connect to RabbitMQ
 *   4. Generate Prisma client (connection is lazy; tested via seed/routes)
 *   5. Mount routes
 *   6. Start listening
 */
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { connectMongo } from './db/mongoose';
import { connectRabbitMQ } from './db/rabbitmq';

// Route modules
import healthRouter   from './routes/health';
import authRouter     from './routes/auth';
import rbacTestRouter from './routes/rbacTest';

async function bootstrap() {
  // ── External connections ────────────────────────────────────────────────
  await connectMongo();
  await connectRabbitMQ();

  // ── Express app ─────────────────────────────────────────────────────────
  const app = express();

  app.use(cors({ origin: env.frontendUrl }));
  app.use(express.json());

  // ── Routes ───────────────────────────────────────────────────────────────
  app.use('/health',  healthRouter);
  app.use('/auth',    authRouter);
  app.use('/rbac',    rbacTestRouter);   // Checkpoint 1 demo only

  // ── Start ────────────────────────────────────────────────────────────────
  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
