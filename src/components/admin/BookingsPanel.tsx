import { useState } from 'react';
import type { Booking, BookingStatus } from '@/lib/types';
import { fetchAllBookings, fetchAllPayments } from '@/lib/api/admin';
import { formatDate, formatINR } from '@/lib/format';
import { BOOKING_PAYMENT_LABEL, BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '@/lib/labels';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ErrorState, LoadingState } from '@/components/ui/StatusViews';
import StatusPill from '@/components/admin/StatusPill';
import BookingDetailModal from '@/components/admin/BookingDetailModal';

type BookingFilter = BookingStatus | 'all';

const FILTERS: BookingFilter[] = ['pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'all'];

const FILTER_LABEL: Record<BookingFilter, string> = {
  ...BOOKING_STATUS_LABEL,
  all: 'All',
};

async function loadBookingRecords() {
  const [bookings, payments] = await Promise.all([fetchAllBookings(), fetchAllPayments()]);
  return { bookings, payments };
}

export default function BookingsPanel() {
  const records = useAsyncData(loadBookingRecords, []);
  const [filter, setFilter] = useState<BookingFilter>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bookings = records.data?.bookings ?? [];
  const payments = records.data?.payments ?? [];

  const visible = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);
  const selected = bookings.find((b) => b.id === selectedId) ?? null;

  return (
    <section className="space-y-8 animate-fade-in" aria-labelledby="bookings-heading">
      <div>
        <p className="eyebrow">Bookings</p>
        <h1 id="bookings-heading" className="mt-2 text-4xl sm:text-5xl">Booking requests</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-600">
          Pending requests do not hold a date. Approving a request confirms it only if the date is still free.
        </p>
      </div>

      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const count = item === 'all' ? bookings.length : bookings.filter((b) => b.status === item).length;
          const active = filter === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              aria-pressed={active}
              className={`rounded-full px-4 py-2 text-sm transition ${
                active ? 'bg-charcoal-800 text-cream-50' : 'bg-white text-charcoal-700 shadow-soft hover:bg-baby-100'
              }`}
            >
              {FILTER_LABEL[item]} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {records.loading && !records.data && <LoadingState label="Loading bookings" />}
      {records.error && !records.data && <ErrorState message={records.error} onRetry={records.reload} />}

      {records.data && visible.length === 0 && (
        <div className="card p-10 text-center text-sm text-charcoal-600">No bookings in this view yet.</div>
      )}

      {records.data && visible.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((booking: Booking) => {
            const paymentStatus = BOOKING_PAYMENT_LABEL[booking.payment_status];
            return (
              <li key={booking.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(booking.id)}
                  className="card flex h-full w-full flex-col gap-4 p-6 text-left transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-charcoal-500">{booking.reference}</span>
                    <StatusPill label={BOOKING_STATUS_LABEL[booking.status]} tone={BOOKING_STATUS_TONE[booking.status]} />
                  </div>
                  <div>
                    <p className="font-display text-2xl text-charcoal-900">{booking.customer_name}</p>
                    <p className="mt-1 text-sm text-charcoal-600">{booking.event_name}</p>
                  </div>
                  <dl className="mt-auto grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-charcoal-500">Date</dt>
                      <dd className="text-charcoal-900">{formatDate(booking.event_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-charcoal-500">Package</dt>
                      <dd className="text-charcoal-900">{booking.package_name}</dd>
                    </div>
                    <div>
                      <dt className="text-charcoal-500">Price</dt>
                      <dd className="text-charcoal-900">{formatINR(booking.package_price_inr)}</dd>
                    </div>
                    <div>
                      <dt className="text-charcoal-500">Payment</dt>
                      <dd className="text-charcoal-900">{paymentStatus}</dd>
                    </div>
                  </dl>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <BookingDetailModal
          booking={selected}
          payments={payments.filter((p) => p.booking_id === selected.id)}
          onClose={() => setSelectedId(null)}
          onChanged={records.reload}
        />
      )}
    </section>
  );
}
