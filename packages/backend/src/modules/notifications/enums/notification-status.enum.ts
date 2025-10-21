/**
 * Notification delivery status (matches Prisma enum)
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  FALLBACK = 'FALLBACK', // Successfully sent via fallback method (SMS)
}
