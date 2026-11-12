import { useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import type { Booking, BookingStatus, Payment } from '@/lib/types';
import { rescheduleBooking, setBookingStatus } from '@/lib/api/admin';
import { formatDate, formatINR, todayISO } from '@/lib/format';
import { BOOKING_PAYMENT_LABEL, BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '@/lib/labels';
import StatusPill from '@/components/admin/StatusPill';
import PaymentReviewCard from '@/components/admin/PaymentReviewCard';
import Modal from '@/components/ui/Modal';

type ActionTone = 'primary' | 'danger';

const ACTIONS: Record<BookingStatus, { status: BookingStatus; label: string; tone: ActionTone }[]> = {
  pending: [
    { status: 'confirmed', label: 'Approve booking', tone: 'primary' },
    { status: 'rejected', label: 'Reject', tone: 'danger' },
    { status: 'cancelled', label: 'Cancel', tone: 'danger' },
  ],
  confirmed: [
    { status: 'completed', label: 'Mark completed', tone: 'primary' },
    { status: 'cancelled', label: 'Cancel booking', tone: 'danger' },
  ],
  rejected: [],
  cancelled: [],
  completed: [],
};

const ACTION_CLASS: Record<ActionTone, string> = { primary: 'btn-primary', danger: 'btn-danger' };

interface BookingDetailModalProps {
  booking: Booking;
  payments: Payment[];
  onClose: () => void;
  onChanged: () => void;
}

export default function BookingDetailModal({ booking, payments, onClose, onChanged }: BookingDetailModalProps) {
  const [note, setNote] = useState('');
  const [newDate, setNewDate] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canReschedule = booking.status === 'pending' || booking.status === 'confirmed';

  const run = async (key: string, action: () => Promise<void>, confirmMessage?: string) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setError(null);
    setBusy(key);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action could not be completed.');
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = (status: BookingStatus, confirmMessage?: string) =>
    run(status, () => setBookingStatus({ bookingId: booking.id, status, note: note.trim() }), confirmMessage);

  const refund = () =>
    run(
      'refund',
      () => setBookingStatus({ bookingId: booking.id, status: booking.status, note: note.trim(), markRefunded: true }),
      'Mark this payment as refunded? Only do this after you have sent the money back.',
    );

  const reschedule = () => {
    if (!newDate) {
      setError('Choose a new date first.');
      return;
    }
    if (newDate === booking.event_date) {
      setError('Choose a different date.');
      return;
    }
    run('reschedule', async () => {
      await rescheduleBooking(booking.id, newDate);
      setNewDate('');
    });
  };

  const info: [string, string][] = [
    ['Customer', booking.customer_name],
    ['Phone', booking.customer_phone],
    ['Email', booking.customer_email],
    ['Event', booking.event_name],
    ['Venue', booking.venue],
    ['Event date', formatDate(booking.event_date)],
    ['Package', `${booking.package_name} (${formatINR(booking.package_price_inr)})`],
    ['Advance', booking.advance_amount_inr > 0 ? formatINR(booking.advance_amount_inr) : 'None'],
    ['Payment', BOOKING_PAYMENT_LABEL[booking.payment_status]],
  ];

  return (
    <Modal title={`Booking ${booking.reference}`} onClose={onClose} wide>
      <div className="space-y-8">
        <div>
          <StatusPill label={BOOKING_STATUS_LABEL[booking.status]} tone={BOOKING_STATUS_TONE[booking.status]} />
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          {info.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white p-4 shadow-soft">
              <dt className="text-xs uppercase tracking-[0.16em] text-charcoal-500">{label}</dt>
              <dd className="mt-1 break-words text-charcoal-900">{value}</dd>
            </div>
          ))}
        </dl>
        {booking.details && (
          <div className="rounded-2xl bg-white p-4 shadow-soft">
            <p className="text-xs uppercase tracking-[0.16em] text-charcoal-500">Details</p>
            <p className="mt-1 whitespace-pre-line text-charcoal-900">{booking.details}</p>
          </div>
        )}

        <section className="space-y-4" aria-labelledby="booking-actions-heading">
          <h3 id="booking-actions-heading" className="text-2xl">Actions</h3>
          <div>
            <label className="label" htmlFor="booking-note">Note to record (optional)</label>
            <input id="booking-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </div>
          <div className="flex flex-wrap gap-3">
            {ACTIONS[booking.status].map((action) => (
              <button
                key={action.status}
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  changeStatus(
                    action.status,
                    action.status === 'cancelled' || action.status === 'rejected' ? 'Are you sure? The client will see this change.' : undefined,
                  )
                }
                className={`${ACTION_CLASS[action.tone]} !py-2.5`}
              >
                {busy === action.status ? 'Saving...' : action.label}
              </button>
            ))}
            {booking.payment_status === 'verified' && (
              <button type="button" onClick={refund} disabled={busy !== null} className="btn-secondary !py-2.5">
                {busy === 'refund' ? 'Saving...' : 'Mark as refunded'}
              </button>
            )}
          </div>
          {booking.status === 'pending' && (
            <p className="text-xs leading-relaxed text-charcoal-600">
              Approving checks the date again. The booking is only confirmed if no other booking or block has taken it.
            </p>
          )}
        </section>

        {canReschedule && (
          <section className="space-y-4 border-t border-charcoal-800/10 pt-8" aria-labelledby="reschedule-heading">
            <h3 id="reschedule-heading" className="flex items-center gap-2 text-2xl">
              <CalendarClock className="h-5 w-5 text-lavender-700" aria-hidden="true" />
              Reschedule
            </h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="label" htmlFor="reschedule-date">New date</label>
                <input
                  id="reschedule-date"
                  type="date"
                  min={todayISO()}
                  className="input"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <button type="button" onClick={reschedule} disabled={busy !== null} className="btn-secondary">
                {busy === 'reschedule' ? 'Moving...' : 'Move booking'}
              </button>
            </div>
          </section>
        )}

        <section className="space-y-4 border-t border-charcoal-800/10 pt-8" aria-labelledby="booking-payments-heading">
          <h3 id="booking-payments-heading" className="text-2xl">Payments</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-charcoal-600">No payment has been submitted for this booking.</p>
          ) : (
            payments.map((payment) => (
              <PaymentReviewCard key={payment.id} payment={payment} onChanged={onChanged} />
            ))
          )}
        </section>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-700">
            <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
