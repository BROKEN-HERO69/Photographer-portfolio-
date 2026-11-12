import { supabase } from '@/lib/supabase';
import type {
  BlockedDate,
  Booking,
  BookingStatus,
  Package,
  Payment,
  PaymentStatus,
  PortfolioItem,
  SiteSettings,
} from '@/lib/types';
import { removeImage, uploadImage } from '@/lib/api/media';

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('We could not verify admin access. Please try again.');
  return data !== null;
}

export async function hasAdminAccount(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_admin');
  if (error) throw new Error('We could not check the admin setup. Please try again.');
  return data === true;
}

export async function claimFirstAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_first_admin');
  if (error) throw new Error(error.message);
  return data === true;
}

export async function fetchAllBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error('Bookings could not be loaded.');
  return (data ?? []) as Booking[];
}

export async function fetchAllPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error('Payments could not be loaded.');
  return (data ?? []) as Payment[];
}

export async function fetchBlockedDates(): Promise<BlockedDate[]> {
  const { data, error } = await supabase.from('blocked_dates').select('*').order('block_date', { ascending: true });
  if (error) throw new Error('Blocked dates could not be loaded.');
  return (data ?? []) as BlockedDate[];
}

export async function fetchAllPackages(): Promise<Package[]> {
  const { data, error } = await supabase.from('packages').select('*').order('sort_order', { ascending: true });
  if (error) throw new Error('Packages could not be loaded.');
  return (data ?? []) as Package[];
}

export async function fetchAllPortfolio(): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new Error('Gallery items could not be loaded.');
  return (data ?? []) as PortfolioItem[];
}

export async function setBookingStatus(params: {
  bookingId: string;
  status: BookingStatus;
  note: string;
  markRefunded?: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('admin_set_booking_status', {
    p_booking_id: params.bookingId,
    p_status: params.status,
    p_admin_note: params.note,
    p_mark_refunded: params.markRefunded ?? false,
  });
  if (error) throw new Error(error.message);
}

export async function rescheduleBooking(bookingId: string, newDate: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reschedule_booking', {
    p_booking_id: bookingId,
    p_new_date: newDate,
  });
  if (error) throw new Error(error.message);
}

export async function reviewPayment(params: {
  paymentId: string;
  decision: Exclude<PaymentStatus, 'verification_pending'>;
  note: string;
}): Promise<void> {
  const { error } = await supabase.rpc('admin_review_payment', {
    p_payment_id: params.paymentId,
    p_decision: params.decision,
    p_note: params.note,
  });
  if (error) throw new Error(error.message);
}

export async function blockDate(date: string, reason: string): Promise<void> {
  const { error } = await supabase.from('blocked_dates').insert({ block_date: date, reason });
  if (error) throw new Error(error.code === '23505' ? 'That date is already blocked.' : error.message);
}

export async function unblockDate(id: string): Promise<void> {
  const { error } = await supabase.from('blocked_dates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface PackageInput {
  name: string;
  price_inr: number;
  description: string;
  deliverables: string;
  sort_order: number;
  is_active: boolean;
}

export async function savePackage(id: string | null, input: PackageInput): Promise<void> {
  const query = id
    ? supabase.from('packages').update(input).eq('id', id)
    : supabase.from('packages').insert(input);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function deletePackage(id: string): Promise<void> {
  const { error } = await supabase.from('packages').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateSiteSettings(patch: Partial<Omit<SiteSettings, 'id'>>): Promise<void> {
  const { error } = await supabase.from('site_settings').update(patch).eq('id', 1);
  if (error) throw new Error(error.message);
}

export async function uploadQrCode(file: File, previousPath: string | null): Promise<void> {
  const path = await uploadImage('site-media', file);
  try {
    await updateSiteSettings({ qr_image_path: path });
  } catch (err) {
    await removeImage('site-media', path).catch(() => undefined);
    throw err;
  }
  if (previousPath) await removeImage('site-media', previousPath).catch(() => undefined);
}

export interface PortfolioInput {
  title: string;
  category: string;
  event_title: string;
  event_date: string | null;
}

export async function createPortfolioItem(input: PortfolioInput, file: File): Promise<void> {
  const imagePath = await uploadImage('portfolio', file);
  const { error } = await supabase.from('portfolio_items').insert({ ...input, image_path: imagePath });
  if (error) {
    await removeImage('portfolio', imagePath).catch(() => undefined);
    throw new Error(error.message);
  }
}

export async function updatePortfolioItem(
  item: PortfolioItem,
  input: PortfolioInput,
  replacementFile: File | null,
): Promise<void> {
  const newPath = replacementFile ? await uploadImage('portfolio', replacementFile) : null;
  const { error } = await supabase
    .from('portfolio_items')
    .update(newPath ? { ...input, image_path: newPath } : input)
    .eq('id', item.id);
  if (error) {
    if (newPath) await removeImage('portfolio', newPath).catch(() => undefined);
    throw new Error(error.message);
  }
  if (newPath) await removeImage('portfolio', item.image_path).catch(() => undefined);
}

export async function deletePortfolioItem(item: PortfolioItem): Promise<void> {
  const { error } = await supabase.from('portfolio_items').delete().eq('id', item.id);
  if (error) throw new Error(error.message);
  await removeImage('portfolio', item.image_path).catch(() => undefined);
}

export async function createPaymentProofUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 600);
  if (error || !data?.signedUrl) throw new Error('The screenshot could not be opened.');
  return data.signedUrl;
}
