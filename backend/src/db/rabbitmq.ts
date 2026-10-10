/**
 * db/rabbitmq.ts
 * Manages the RabbitMQ connection and channel (shared, singleton).
 * Exports:
 *   connectRabbitMQ()  – call once at startup; stores connection + channel.
 *   getChannel()       – returns the open channel for publishing.
 *
 * Exchange and queue setup (spec §10):
 *   Exchange: clinic.events  (direct, durable)
 *   Queue:    notifications  (durable)
 *   Bindings: appointment.confirmed  →  notifications
 *             prescription.fulfilled →  notifications
 */
import amqplib, { Channel, Connection } from 'amqplib';
import { env } from '../config/env';

export const EXCHANGE  = 'clinic.events';
export const QUEUE     = 'notifications';
export const RK_APPT   = 'appointment.confirmed';
export const RK_PRESC  = 'prescription.fulfilled';

let connection: Connection;
let channel: Channel;

export async function connectRabbitMQ(): Promise<void> {
  connection = await amqplib.connect(env.amqpUrl);
  channel    = await connection.createChannel();

  // Declare a durable direct exchange
  await channel.assertExchange(EXCHANGE, 'direct', { durable: true });

  // Declare a durable queue so messages survive broker restarts
  await channel.assertQueue(QUEUE, { durable: true });

  // Bind both routing keys to the same queue
  await channel.bindQueue(QUEUE, EXCHANGE, RK_APPT);
  await channel.bindQueue(QUEUE, EXCHANGE, RK_PRESC);

  console.log('RabbitMQ connected');
}

export function getChannel(): Channel {
  if (!channel) throw new Error('RabbitMQ channel not initialised');
  return channel;
}
