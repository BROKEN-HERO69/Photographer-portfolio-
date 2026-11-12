import type { BookingPaymentStatus, BookingStatus, PaymentStatus } from '@/lib/types';

export type PillTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export const BOOKING_STATUS_TONE: Record<BookingStatus, PillTone> = {
  pending: 'warning',
  confirmed: 'success',
  completed: 'info',
  rejected: 'danger',
  cancelled: 'neutral',
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const BOOKING_PAYMENT_LABEL: Record<BookingPaymentStatus, string> = {
  not_required: 'Not required',
  payment_pending: 'Payment pending',
  verification_pending: 'Verification pending',
  verified: 'Verified',
  rejected: 'Rejected',
  refunded: 'Refunded',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  verification_pending: 'Awaiting check',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const PORTFOLIO_CATEGORIES = [
  'Portrait',
  'Small Event',
  'Birthday / Private',
  'College Event',
  'Concert',
  'Extended Coverage',
  'Other',
] as const;
