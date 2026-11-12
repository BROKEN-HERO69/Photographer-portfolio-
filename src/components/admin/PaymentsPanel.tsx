import { useState } from 'react';
import type { PaymentStatus } from '@/lib/types';
import { fetchAllBookings, fetchAllPayments } from '@/lib/api/admin';
import { PAYMENT_STATUS_LABEL } from '@/lib/labels';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ErrorState, LoadingState } from '@/components/ui/StatusViews';
import PaymentReviewCard from '@/components/admin/PaymentReviewCard';

type PaymentFilter = PaymentStatus | 'all';

const FILTERS: PaymentFilter[] = ['verification_pending', 'verified', 'rejected', 'all'];

const FILTER_LABEL: Record<PaymentFilter, string> = {
  ...PAYMENT_STATUS_LABEL,
  all: 'All',
};

async function loadPaymentRecords() {
  const [payments, bookings] = await Promise.all([fetchAllPayments(), fetchAllBookings()]);
  return { payments, bookings };
}

export default function PaymentsPanel() {
  const records = useAsyncData(loadPaymentRecords, []);
  const [filter, setFilter] = useState<PaymentFilter>('verification_pending');

  const payments = records.data?.payments ?? [];
  const bookings = records.data?.bookings ?? [];

  const visible = filter === 'all' ? payments : payments.filter((p) => p.status === filter);

  return (
    <section className="space-y-8 animate-fade-in" aria-labelledby="payments-heading">
      <div>
        <p className="eyebrow">Payments</p>
        <h1 id="payments-heading" className="mt-2 text-4xl sm:text-5xl">Payment verification</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-600">
          Verify each UTR against your actual bank or UPI transaction. A verified payment does not confirm a booking on its own.
        </p>
      </div>

      <div role="group" aria-label="Filter by payment status" className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const count = item === 'all' ? payments.length : payments.filter((p) => p.status === item).length;
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

      {records.loading && !records.data && <LoadingState label="Loading payments" />}
      {records.error && !records.data && <ErrorState message={records.error} onRetry={records.reload} />}

      {records.data && visible.length === 0 && (
        <div className="card p-10 text-center text-sm text-charcoal-600">No payments in this view.</div>
      )}

      {records.data && visible.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {visible.map((payment) => (
            <PaymentReviewCard
              key={payment.id}
              payment={payment}
              booking={bookings.find((b) => b.id === payment.booking_id)}
              onChanged={records.reload}
            />
          ))}
        </div>
      )}
    </section>
  );
}
