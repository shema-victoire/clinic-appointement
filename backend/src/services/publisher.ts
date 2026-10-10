import { getChannel, EXCHANGE } from '../db/rabbitmq';

export function publishEvent(routingKey: string, payload: any) {
  const channel = getChannel();
  const messageBuffer = Buffer.from(JSON.stringify(payload));
  // persistent: true ensures messages are saved to disk in RabbitMQ
  channel.publish(EXCHANGE, routingKey, messageBuffer, { persistent: true });
}
