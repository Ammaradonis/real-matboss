import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'ADMIN',
  PROVIDER = 'PROVIDER',
  MEMBER = 'MEMBER',
  PUBLIC = 'PUBLIC',
}

export enum EventTypeKind {
  ONE_ON_ONE = 'ONE_ON_ONE',
  GROUP = 'GROUP',
  CLASS = 'CLASS',
}

export enum OverrideKind {
  AVAILABLE = 'AVAILABLE',
  BLOCKED = 'BLOCKED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum EmailQueueStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

@Entity('tenants')
@Unique(['slug'])
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 128 })
  slug!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('users')
@Unique(['email'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ name: 'time_zone', type: 'varchar', length: 100, default: 'UTC' })
  timeZone!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('providers')
@Unique(['tenantId', 'bookingUrl'])
export class ProviderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'text', default: '' })
  bio!: string;

  @Column({ type: 'text', default: '' })
  specialties!: string;

  @Column({ name: 'booking_url', type: 'varchar', length: 140 })
  bookingUrl!: string;

  @Column({ name: 'time_zone', type: 'varchar', length: 100, default: 'America/New_York' })
  timeZone!: string;

  @Column({ name: 'buffer_before_minutes', type: 'int', default: 15 })
  bufferBeforeMinutes!: number;

  @Column({ name: 'buffer_after_minutes', type: 'int', default: 15 })
  bufferAfterMinutes!: number;

  @Column({ name: 'minimum_notice_hours', type: 'int', default: 24 })
  minimumNoticeHours!: number;

  @Column({ name: 'maximum_advance_days', type: 'int', default: 60 })
  maximumAdvanceDays!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('event_types')
@Unique(['providerId', 'slug'])
export class EventTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId!: string;

  @ManyToOne(() => ProviderEntity)
  @JoinColumn({ name: 'provider_id' })
  provider!: ProviderEntity;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 140 })
  slug!: string;

  @Column({ type: 'enum', enum: EventTypeKind, default: EventTypeKind.ONE_ON_ONE })
  kind!: EventTypeKind;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes!: number;

  @Column({ name: 'max_attendees', type: 'int', nullable: true })
  maxAttendees!: number | null;

  @Column({ name: 'price_cents', type: 'int', default: 0 })
  priceCents!: number;

  @Column({ type: 'varchar', length: 20, default: '#1f7aec' })
  color!: string;

  @Column({ name: 'requires_approval', type: 'boolean', default: false })
  requiresApproval!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('availability_rules')
export class AvailabilityRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId!: string;

  @Column({ name: 'event_type_id', type: 'uuid', nullable: true })
  eventTypeId!: string | null;

  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek!: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;

  @Column({ name: 'time_zone', type: 'varchar', length: 100 })
  timeZone!: string;

  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom!: string | null;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('availability_overrides')
export class AvailabilityOverrideEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId!: string;

  @Column({ name: 'event_type_id', type: 'uuid', nullable: true })
  eventTypeId!: string | null;

  @Column({ name: 'start_ts', type: 'timestamptz' })
  startTs!: Date;

  @Column({ name: 'end_ts', type: 'timestamptz' })
  endTs!: Date;

  @Column({ type: 'enum', enum: OverrideKind })
  kind!: OverrideKind;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('bookings')
@Unique(['publicToken'])
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId!: string;

  @Column({ name: 'event_type_id', type: 'uuid' })
  eventTypeId!: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 160 })
  customerName!: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 255 })
  customerEmail!: string;

  @Column({ name: 'customer_phone', type: 'varchar', length: 80, nullable: true })
  customerPhone!: string | null;

  @Column({ name: 'public_token', type: 'varchar', length: 140 })
  publicToken!: string;

  @Column({ name: 'start_ts', type: 'timestamptz' })
  startTs!: Date;

  @Column({ name: 'end_ts', type: 'timestamptz' })
  endTs!: Date;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status!: BookingStatus;

  @VersionColumn()
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @BeforeInsert()
  setPublicToken(): void {
    if (!this.publicToken) {
      this.publicToken = crypto.randomUUID();
    }
  }
}

@Entity('booking_events')
export class BookingEventEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @ManyToOne(() => BookingEntity)
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType!: string;

  @Column({ name: 'old_start_ts', type: 'timestamptz', nullable: true })
  oldStartTs!: Date | null;

  @Column({ name: 'old_end_ts', type: 'timestamptz', nullable: true })
  oldEndTs!: Date | null;

  @Column({ name: 'new_start_ts', type: 'timestamptz', nullable: true })
  newStartTs!: Date | null;

  @Column({ name: 'new_end_ts', type: 'timestamptz', nullable: true })
  newEndTs!: Date | null;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('discovery_calls')
export class DiscoveryCallEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid', unique: true })
  bookingId!: string;

  @ManyToOne(() => BookingEntity)
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @Column({ name: 'school_name', type: 'varchar', length: 200 })
  schoolName!: string;

  @Column({ type: 'varchar', length: 100 })
  city!: string;

  @Column({ type: 'varchar', length: 100 })
  state!: string;

  @Column({ type: 'varchar', length: 120 })
  county!: string;

  @Column({ name: 'active_students', type: 'int' })
  activeStudents!: number;

  @Column({ name: 'instructor_count', type: 'int', default: 1 })
  instructorCount!: number;

  @Column({ name: 'current_system', type: 'varchar', length: 120, nullable: true })
  currentSystem!: string | null;

  @Column({ name: 'scheduling_challenges', type: 'text', nullable: true })
  schedulingChallenges!: string | null;

  @Column({ name: 'budget_range', type: 'varchar', length: 120, nullable: true })
  budgetRange!: string | null;

  @Column({ name: 'implementation_timeline', type: 'varchar', length: 120, nullable: true })
  implementationTimeline!: string | null;

  @Column({ name: 'lead_status', type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  leadStatus!: LeadStatus;

  @Column({ name: 'follow_up_at', type: 'timestamptz', nullable: true })
  followUpAt!: Date | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes!: string | null;

  @Column({ name: 'qualification_score', type: 'int', default: 0 })
  qualificationScore!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId!: string | null;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel!: NotificationChannel;

  @Column({ name: 'template_key', type: 'varchar', length: 120 })
  templateKey!: string;

  @Column({ name: 'recipient', type: 'varchar', length: 255 })
  recipient!: string;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.QUEUED })
  status!: NotificationStatus;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('api_tokens')
export class ApiTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId!: string | null;

  @Column({ type: 'varchar', length: 140, unique: true })
  token!: string;

  @Column({ type: 'varchar', length: 120, default: 'widget:read' })
  scope!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('refresh_tokens')
@Unique(['tokenHash'])
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('admin_settings')
@Unique(['tenantId', 'key'])
export class AdminSettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 140 })
  key!: string;

  @Column({ type: 'jsonb', default: {} })
  value!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('email_templates')
@Unique(['tenantId', 'key', 'version'])
export class EmailTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 120 })
  key!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 120 })
  category!: string;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ name: 'html_body', type: 'text' })
  htmlBody!: string;

  @Column({ name: 'text_body', type: 'text', nullable: true })
  textBody!: string | null;

  @Column({ type: 'jsonb', default: [] })
  variables!: string[];

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('email_queue')
export class EmailQueueEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId!: string | null;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  to!: string;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ name: 'html_body', type: 'text' })
  htmlBody!: string;

  @Column({ name: 'text_body', type: 'text', nullable: true })
  textBody!: string | null;

  @Column({ type: 'enum', enum: EmailQueueStatus, default: EmailQueueStatus.PENDING })
  status!: EmailQueueStatus;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  maxAttempts!: number;

  @Column({ name: 'scheduled_at', type: 'timestamptz', default: () => 'NOW()' })
  scheduledAt!: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('blackout_dates')
@Unique(['tenantId', 'providerId', 'date'])
export class BlackoutDateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

export const ENTITIES = [
  TenantEntity,
  UserEntity,
  ProviderEntity,
  EventTypeEntity,
  AvailabilityRuleEntity,
  AvailabilityOverrideEntity,
  BookingEntity,
  BookingEventEntity,
  DiscoveryCallEntity,
  NotificationEntity,
  ApiTokenEntity,
  RefreshTokenEntity,
  AdminSettingEntity,
  EmailTemplateEntity,
  EmailQueueEntity,
  BlackoutDateEntity,
];
