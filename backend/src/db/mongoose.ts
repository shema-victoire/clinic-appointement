/**
 * db/mongoose.ts
 * Manages the MongoDB connection.
 *
 * Resilience:
 *   - Connects in the background, retrying every 5 seconds on failure.
 *   - Never prints connection credentials in log messages.
 *   - Automatically attempts reconnection if disconnected.
 */
import mongoose from 'mongoose';
import { env } from '../config/env';

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
    connectMongo().catch(() => {});
  }, 5000);
  reconnectTimer.unref();
}

export async function connectMongo(): Promise<void> {
  // readyState: 1 = connected, 2 = connecting
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2 || isConnecting) {
    return;
  }

  isConnecting = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    await mongoose.connect(env.mongodbUri);
    console.log('MongoDB connected');
  } catch (err: any) {
    console.warn('[MongoDB] Connection failed, retrying in 5s:', sanitizeError(err));
    scheduleReconnect();
  } finally {
    isConnecting = false;
  }
}

// Automatically retry connection if disconnected later
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected, retrying in 5s...');
  scheduleReconnect();
});

mongoose.connection.on('error', (err: any) => {
  console.warn('[MongoDB] Connection error:', sanitizeError(err));
});
