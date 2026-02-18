import nodemailer from 'nodemailer';

import { NotificationService } from './notification.module';
import { NotificationChannel, NotificationStatus } from '../database/entities';

const sendMail = jest.fn(async () => undefined);

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(() => ({ sendMail })),
  },
}));

describe('NotificationService', () => {
  const notificationRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };

  const service = new NotificationService(notificationRepository as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queues notification records', async () => {
    const result = await service.queueEmail({
      tenantId: 'tenant-1',
      bookingId: 'booking-1',
      recipient: 'sensei@example.com',
      templateKey: 'booking-confirmation',
      payload: { id: 'booking-1' },
    });

    expect(result).toEqual(
      expect.objectContaining({
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.QUEUED,
      }),
    );
  });

  it('sends email immediately through nodemailer transport', async () => {
    await service.sendEmailNow({
      to: 'sensei@example.com',
      subject: 'Subject',
      html: '<p>Hello</p>',
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'sensei@example.com',
        subject: 'Subject',
      }),
    );
  });

  it('logs SMS placeholders', async () => {
    const logSpy = jest.spyOn((service as unknown as { logger: { log: (...args: unknown[]) => void } }).logger, 'log');
    await service.sendSmsPlaceholder('+12025550100', 'hello');
    expect(logSpy).toHaveBeenCalled();
  });
});
