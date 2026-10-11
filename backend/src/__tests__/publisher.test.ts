import { publishEvent } from '../services/publisher';
import * as rabbitmq from '../db/rabbitmq';

describe('Publisher Resilience', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not throw when RabbitMQ channel is null or unavailable', () => {
    jest.spyOn(rabbitmq, 'getChannel').mockReturnValue(null);
    expect(() => publishEvent('appointment.confirmed', { test: true })).not.toThrow();
  });

  it('does not throw when channel.publish throws an error', () => {
    const mockChannel: any = {
      publish: jest.fn().mockImplementation(() => {
        throw new Error('ECONNRESET');
      }),
    };
    jest.spyOn(rabbitmq, 'getChannel').mockReturnValue(mockChannel);
    expect(() => publishEvent('appointment.confirmed', { test: true })).not.toThrow();
  });
});
