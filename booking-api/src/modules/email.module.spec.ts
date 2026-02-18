import { EmailController, EmailQueueProcessor } from './email.module';
import { EmailQueueStatus } from '../database/entities';

function buildController() {
  const templateRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };

  const queueRepository = {
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };

  const bookingRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const blackoutRepository = {
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };

  const notificationService = {
    sendEmailNow: jest.fn(),
  };

  const controller = new EmailController(
    templateRepository as never,
    queueRepository as never,
    bookingRepository as never,
    blackoutRepository as never,
    notificationService as never,
  );

  return {
    controller,
    templateRepository,
    queueRepository,
    bookingRepository,
    blackoutRepository,
    notificationService,
  };
}

describe('EmailController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders template previews via handlebars', async () => {
    const { controller } = buildController();
    const result = await controller.preview({
      htmlBody: '<h1>Hello {{name}}</h1>',
      variables: { name: 'Ammar' },
    });

    expect(result.html).toContain('Hello Ammar');
  });

  it('queues bulk sends for bookings', async () => {
    const { controller, templateRepository, bookingRepository, queueRepository } = buildController();

    templateRepository.findOne.mockResolvedValue({
      id: 'template-1',
      tenantId: 'tenant-1',
      subject: 'Subject',
      htmlBody: '<p>Hi {{booking.customerName}}</p>',
      textBody: 'Hi',
    });
    bookingRepository.find.mockResolvedValue([
      { id: 'booking-1', tenantId: 'tenant-1', customerEmail: 'one@example.com', customerName: 'One' },
      { id: 'booking-2', tenantId: 'tenant-1', customerEmail: 'two@example.com', customerName: 'Two' },
    ]);

    const result = await controller.bulkSend(
      { templateId: 'template-1', bookingIds: ['booking-1', 'booking-2'] },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );

    expect(result).toEqual({ queued: 2 });
    expect(queueRepository.save).toHaveBeenCalled();
  });

  it('creates versioned templates', async () => {
    const { controller, templateRepository } = buildController();
    templateRepository.findOne.mockResolvedValue({ version: 2 });

    const result = await controller.createTemplate(
      {
        key: 'booking-confirmation',
        name: 'Booking Confirmation',
        category: 'transactional',
        subject: 'Confirmed',
        htmlBody: '<p>Hi {{name}}</p>',
        variables: ['name'],
      },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );

    expect(result.version).toBe(3);
  });

  it('generates ICS payload for existing booking', async () => {
    const { controller, bookingRepository } = buildController();

    bookingRepository.findOne.mockResolvedValue({
      id: 'booking-1',
      tenantId: 'tenant-1',
      startTs: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const result = await controller.generateIcs('booking-1', {
      headers: { 'x-tenant-id': 'tenant-1' },
    } as never);

    expect(result.ics).toContain('BEGIN:VCALENDAR');
  });

  it('supports test sends through notification service', async () => {
    const { controller, notificationService } = buildController();
    await expect(
      controller.testSend({
        to: 'sensei@example.com',
        subject: 'Preview',
        htmlBody: '<p>Preview</p>',
      }),
    ).resolves.toEqual({ sent: true });
    expect(notificationService.sendEmailNow).toHaveBeenCalled();
  });

  it('lists queue/templates and manages blackout dates', async () => {
    const { controller, templateRepository, queueRepository, blackoutRepository } = buildController();
    templateRepository.find.mockResolvedValue([{ id: 'template-1' }]);
    queueRepository.find.mockResolvedValue([{ id: 'queue-1' }]);
    blackoutRepository.find.mockResolvedValue([{ id: 'blackout-1', date: '2026-02-20' }]);

    await expect(
      controller.templates({ headers: { 'x-tenant-id': 'tenant-1' } } as never),
    ).resolves.toEqual([{ id: 'template-1' }]);
    await expect(controller.queue({ headers: { 'x-tenant-id': 'tenant-1' } } as never)).resolves.toEqual([
      { id: 'queue-1' },
    ]);

    await controller.addBlackout(
      {
        providerId: 'provider-1',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Holiday',
      },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );
    await expect(
      controller.blackoutDates({ headers: { 'x-tenant-id': 'tenant-1' } } as never),
    ).resolves.toEqual([{ id: 'blackout-1', date: '2026-02-20' }]);
  });

  it('updates templates and enqueues direct emails', async () => {
    const { controller, templateRepository, queueRepository } = buildController();
    templateRepository.findOne.mockResolvedValueOnce({
      id: 'template-1',
      tenantId: 'tenant-1',
      subject: 'Old',
      htmlBody: '<p>Old</p>',
      textBody: null,
      isActive: true,
    });
    templateRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      controller.updateTemplate(
        'template-1',
        { subject: 'New Subject' },
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      ),
    ).resolves.toEqual(expect.objectContaining({ subject: 'New Subject' }));
    await expect(
      controller.updateTemplate(
        'missing-template',
        { subject: 'Nope' },
        { headers: { 'x-tenant-id': 'tenant-1' } } as never,
      ),
    ).resolves.toBeNull();

    await controller.enqueue(
      {
        to: 'sensei@example.com',
        subject: 'Queued',
        htmlBody: '<p>Hello</p>',
      },
      { headers: { 'x-tenant-id': 'tenant-1' } } as never,
    );
    expect(queueRepository.save).toHaveBeenCalled();
  });
});

describe('EmailQueueProcessor', () => {
  it('marks queue item as sent after successful delivery', async () => {
    const queueRepository = {
      createQueryBuilder: jest.fn(),
      save: jest.fn(async (value) => value),
    };
    const notificationService = {
      sendEmailNow: jest.fn(async () => undefined),
    };

    const pending = {
      id: 'queue-1',
      to: 'sensei@example.com',
      subject: 'Reminder',
      htmlBody: '<p>Reminder</p>',
      textBody: 'Reminder',
      status: EmailQueueStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
      scheduledAt: new Date(Date.now() - 60_000),
    };

    queueRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([pending]),
    });

    const processor = new EmailQueueProcessor(
      queueRepository as never,
      notificationService as never,
    );

    await processor.processQueue();

    expect(notificationService.sendEmailNow).toHaveBeenCalled();
    expect(queueRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: EmailQueueStatus.SENT, sentAt: expect.any(Date) }),
    );
  });

  it('marks queue item as failed after max attempts', async () => {
    const queueRepository = {
      createQueryBuilder: jest.fn(),
      save: jest.fn(async (value) => value),
    };
    const notificationService = {
      sendEmailNow: jest.fn(async () => {
        throw new Error('smtp down');
      }),
    };

    const pending = {
      id: 'queue-2',
      to: 'sensei@example.com',
      subject: 'Reminder',
      htmlBody: '<p>Reminder</p>',
      textBody: 'Reminder',
      status: EmailQueueStatus.PENDING,
      attempts: 2,
      maxAttempts: 3,
      scheduledAt: new Date(Date.now() - 60_000),
    };

    queueRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([pending]),
    });

    const processor = new EmailQueueProcessor(
      queueRepository as never,
      notificationService as never,
    );

    await processor.processQueue();

    expect(queueRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: EmailQueueStatus.FAILED, attempts: 3 }),
    );
  });
});
