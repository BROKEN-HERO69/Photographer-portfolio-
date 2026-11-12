export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export type BookingPaymentStatus =
  | 'not_required'
  | 'payment_pending'
  | 'verification_pending'
  | 'verified'
  | 'rejected'
  | 'refunded';

export type PaymentStatus = 'verification_pending' | 'verified' | 'rejected';

export interface Package {
  id: string;
  name: string;
  price_inr: number;
  description: string;
  deliverables: string;
  sort_order: number;
  is_active: boolean;
}

export interface SiteSettings {
  id: number;
  photographer_name: string;
  tagline: string;
  about_text: string;
  city: string;
  contact_email: string;
  contact_phone: string;
  instagram_url: string;
  pinterest_url: string;
  upi_id: string;
  upi_payee_name: string;
  upi_instructions: string;
  qr_image_path: string | null;
  advance_percent: number;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  event_title: string;
  event_date: string | null;
  image_path: string;
  sort_order: number;
  created_at: string;
}

export interface Booking {
  id: string;
  reference: string;
  package_id: string | null;
  package_name: string;
  package_price_inr: number;
  event_date: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  event_name: string;
  venue: string;
  details: string;
  status: BookingStatus;
  payment_status: BookingPaymentStatus;
  advance_amount_inr: number;
  admin_note: string;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  payer_upi: string;
  utr: string;
  amount_inr: number;
  screenshot_path: string | null;
  status: PaymentStatus;
  admin_note: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface BlockedDate {
  id: string;
  block_date: string;
  reason: string;
}

export interface BookingCreated {
  reference: string;
  status: BookingStatus;
  payment_status: BookingPaymentStatus;
  advance_amount_inr: number;
  event_date: string;
  package_name: string;
}
