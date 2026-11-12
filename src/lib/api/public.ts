import { supabase } from '@/lib/supabase';
import type { BookingCreated, Package, PortfolioItem, SiteSettings } from '@/lib/types';

export interface BookingRequestInput {
  packageId: string;
  eventDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  eventName: string;
  venue: string;
  details: string;
}

export interface PaymentSubmissionInput {
  reference: string;
  payerUpi: string;
  utr: string;
  amountInr: number;
  screenshotPath: string | null;
}

function requireData<T>(data: T | null, error: { message: string } | null, fallback: string): T {
  if (error) throw new Error(error.message);
  if (data === null || data === undefined) throw new Error(fallback);
  return data;
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
  return requireData(data as SiteSettings | null, error, 'Site information is not available yet.');
}

export async function fetchActivePackages(): Promise<Package[]> {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error('We could not load the packages. Please try again.');
  return (data ?? []) as Package[];
}

export async function fetchPortfolio(): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new Error('We could not load the gallery. Please try again.');
  return (data ?? []) as PortfolioItem[];
}

export async function fetchUnavailableDates(from: string, to: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_unavailable_dates', { p_from: from, p_to: to });
  if (error) throw new Error('We could not load availability. Please try again.');
  return ((data ?? []) as string[]).map((value) => String(value).slice(0, 10));
}

export async function createBookingRequest(input: BookingRequestInput): Promise<BookingCreated> {
  const { data, error } = await supabase.rpc('create_booking', {
    p_package_id: input.packageId,
    p_event_date: input.eventDate,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_customer_email: input.customerEmail,
    p_event_name: input.eventName,
    p_venue: input.venue,
    p_details: input.details,
  });
  const booking = requireData(data as BookingCreated | null, error, 'Your request could not be saved.');
  if (typeof booking.reference !== 'string') throw new Error('Your request could not be confirmed. Please try again.');
  return booking;
}

export async function submitPaymentProof(input: PaymentSubmissionInput): Promise<void> {
  const { error } = await supabase.rpc('submit_payment', {
    p_reference: input.reference,
    p_payer_upi: input.payerUpi,
    p_utr: input.utr,
    p_amount_inr: input.amountInr,
    p_screenshot_path: input.screenshotPath,
  });
  if (error) throw new Error(error.message);
}
