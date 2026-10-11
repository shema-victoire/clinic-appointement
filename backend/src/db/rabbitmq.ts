/**
 * db/rabbitmq.ts
 * Manages the RabbitMQ connection and channel (shared, singleton).
 *
 * Resilience:
 *   - Connects in the background, retrying every 5 seconds on failure.
 *   - Never prints credentials in log messages.
 *   - Automatically reconnects if the connection or channel drops later.
 *   - Exports getChannel() returning Channel | null so callers can handle offline states gracefully.
 */
import amqplib, { Channel, Connection } from 'amqplib';
import { env } from '../config/env';

export const EXCHANGE  = 'clinic.events';
export const QUEUE     = 'notifications';
export const RK_APPT   = 'appointment.confirmed';
export const RK_PRESC  = 'prescription.fulfilled';

type ConnectionType = Awaited<ReturnType<typeof amqplib.connect>>;

let connection: ConnectionType | null = null;
let channel: Channel | null = null;
let isConnecting = false;
let reconnectTimer: NodeJS.Timeout | null = null;

function sanitizeError(err: any): string {
  if (!err) return 'Unknown error';
  const msg = err.message || String(err);
  return msg.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectRabbitMQ().catch(() => {});
  }, 5000);
  reconnectTimer.unref();
}

export async function connectRabbitMQ(): Promise<void> {
  // If already connected or in-flight, skip redundant attempts
  if ((connection && channel) || isConnecting) {
    return;
  }

  isConnecting = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    const conn = await amqplib.connect(env.amqpUrl);

    conn.on('error', (err) => {
      console.warn('[RabbitMQ] Connection error:', sanitizeError(err));
    });

    conn.on('close', () => {
      console.warn('[RabbitMQ] Connection closed, retrying in 5s...');
      connection = null;
      channel = null;
      scheduleReconnect();
    });

    const ch = await conn.createChannel();

    ch.on('error', (err) => {
      console.warn('[RabbitMQ] Channel error:', sanitizeError(err));
    });

    ch.on('close', () => {
      channel = null;
    });

    // Declare a durable direct exchange
    await ch.assertExchange(EXCHANGE, 'direct', { durable: true });

    // Declare a durable queue so messages survive broker restarts
    await ch.assertQueue(QUEUE, { durable: true });

    // Bind both routing keys to the same queue
    await ch.bindQueue(QUEUE, EXCHANGE, RK_APPT);
    await ch.bindQueue(QUEUE, EXCHANGE, RK_PRESC);

    connection = conn;
    channel = ch;
    console.log('RabbitMQ connected');
  } catch (err: any) {
    console.warn('[RabbitMQ] Connection failed, retrying in 5s:', sanitizeError(err));
    connection = null;
    channel = null;
    scheduleReconnect();
  } finally {
    isConnecting = false;
  }
}

export function getChannel(): Channel | null {
  return channel;
}
