/**
 * config/env.ts
 * Loads and validates all environment variables from the root .env file.
 * Throws early with a clear message if any required variable is missing.
 */
import path from 'path';
import dotenv from 'dotenv';

// Load .env from the project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',

  // PostgreSQL (Prisma reads DATABASE_URL directly from process.env)
  databaseUrl: required('DATABASE_URL'),

  // MongoDB Atlas
  mongodbUri: required('MONGODB_URI'),

  // Supabase – used to verify JWTs issued by Supabase Auth
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),

  // RabbitMQ
  amqpUrl: required('AMQP_URL'),

  // Gmail SMTP
  smtpHost: required('SMTP_HOST'),
  smtpPort: parseInt(required('SMTP_PORT'), 10),
  smtpUser: required('SMTP_USER'),
  smtpPass: required('SMTP_PASS'),
  emailFrom: required('EMAIL_FROM'),
};
