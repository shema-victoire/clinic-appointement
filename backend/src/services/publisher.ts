import { getChannel, EXCHANGE } from '../db/rabbitmq';

/**
 * publishEvent
 * Publishes an event to the RabbitMQ exchange.
 * If RabbitMQ is offline or disconnected, logs a warning and does not throw,
 * allowing the calling API request to proceed and save to the database.
 */
export function publishEvent(routingKey: string, payload: any): void {
  try {
    const channel = getChannel();
    if (!channel) {
      console.warn(`[RabbitMQ] Skipping publish for ${routingKey}: channel not available`);
      return;
    }
    const messageBuffer = Buffer.from(JSON.stringify(payload));
    // persistent: true ensures messages are saved to disk in RabbitMQ
    channel.publish(EXCHANGE, routingKey, messageBuffer, { persistent: true });
  } catch (err: any) {
    console.warn(`[RabbitMQ] Failed to publish ${routingKey}:`, err?.message || err);
  }
}
