/**
 * worker.ts
 * Consumes the notifications queue, sends emails via Nodemailer, and ACKs messages.
 * Run with: npm run worker
 */
import path from 'path';
import dotenv from 'dotenv';
// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import amqplib from 'amqplib';
import nodemailer from 'nodemailer';
import { env } from './config/env';

const QUEUE = 'notifications';

async function startWorker() {
  console.log('Starting Email Worker...');
  
  // Setup Nodemailer transporter
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  // Verify SMTP
  try {
    await transporter.verify();
    console.log('SMTP connection verified');
  } catch (err) {
    console.error('SMTP connection failed:', err);
    process.exit(1);
  }

  // Setup RabbitMQ
  const conn = await amqplib.connect(env.amqpUrl);
  const channel = await conn.createChannel();
  await channel.assertQueue(QUEUE, { durable: true });
  
  // Only process 1 message at a time
  await channel.prefetch(1);

  console.log(`Worker waiting for messages in [${QUEUE}]...`);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      console.log(`Received message: ${msg.fields.routingKey}`);

      let subject = '';
      let text = '';

      if (msg.fields.routingKey === 'appointment.confirmed') {
        subject = 'Appointment Confirmed';
        text = `Hello ${payload.patientName},\n\nYour appointment with Doctor ${payload.doctorName} is confirmed for ${payload.date} at ${payload.time}.\n\nThank you,\nThe Clinic Team`;
      } else if (msg.fields.routingKey === 'prescription.fulfilled') {
        subject = 'Prescription Ready for Collection';
        text = `Hello ${payload.patientName},\n\nYour prescription from your appointment on ${payload.date} is now fulfilled and ready for collection at the pharmacy.\n\nThank you,\nThe Clinic Team`;
      } else {
        console.warn(`Unknown routing key: ${msg.fields.routingKey}`);
        channel.ack(msg);
        return;
      }

      await transporter.sendMail({
        from: env.emailFrom,
        to: payload.patientEmail,
        subject,
        text,
      });

      console.log(`Email sent successfully to ${payload.patientEmail}`);
      
      // Manual acknowledgement
      channel.ack(msg);
    } catch (err) {
      console.error('Failed to process message or send email:', err);
      // Nack and requeue the message
      channel.nack(msg, false, true);
    }
  });
}

startWorker().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
