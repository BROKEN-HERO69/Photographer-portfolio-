import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Booking, Payment } from '@/lib/types';
import { createPaymentProofUrl, reviewPayment } from '@/lib/api/admin';
import { formatDateTime, formatINR } from '@/lib/format';
import { PAYMENT_STATUS_LABEL } from '@/lib/labels';
import StatusPill from '@/components/admin/StatusPill';

interface PaymentReviewCardProps {
  payment: Payment;
  booking?: Booking;
  onChanged: () => void;
}

export default function PaymentReviewCard({ payment, booking, onChanged }: PaymentReviewCardProps) {
  const [note, setNote] = useState(payment.admin_note);
  const [busy, setBusy] = useState<'verified' | 'rejected' | 'screenshot' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = payment.status === 'verification_pending';

  const decide = async (decision: 'verified' | 'rejected') => {
    setError(null);
    setBusy(decision);
    try {
      await reviewPayment({ paymentId: payment.id, decision, note: note.trim() });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The payment could not be updated.');
    } finally {
      setBusy(null);
    }
  };

  const openScreenshot = async () => {
    if (!payment.screenshot_path) return;
    setError(null);
    setBusy('screenshot');
    try {
      const url = await createPaymentProofUrl(payment.screenshot_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The screenshot could not be opened.');
    } finally {
      setBusy(null);
    }
  };

  const tone = payment.status === 'verified' ? 'success' : payment.status === 'rejected' ? 'danger' : 'warning';

  return (
    <article className="rounded-2xl border border-charcoal-800/10 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {booking && <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">{booking.reference}</p>}
          <p className="font-medium text-charcoal-900">{booking?.customer_name ?? 'Payment submission'}</p>
        </div>
        <StatusPill label={PAYMENT_STATUS_LABEL[payment.status]} tone={tone} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-charcoal-500">Amount</dt>
          <dd className="font-medium text-charcoal-900">{formatINR(payment.amount_inr)}</dd>
        </div>
        <div>
          <dt className="text-charcoal-500">UTR</dt>
          <dd className="break-all font-mono text-charcoal-900">{payment.utr}</dd>
        </div>
        <div>
          <dt className="text-charcoal-500">Payer UPI</dt>
          <dd className="break-all text-charcoal-900">{payment.payer_upi}</dd>
        </div>
        <div>
          <dt className="text-charcoal-500">Submitted</dt>
          <dd className="text-charcoal-900">{formatDateTime(payment.created_at)}</dd>
        </div>
      </dl>

      {payment.screenshot_path && (
        <button
          type="button"
          onClick={openScreenshot}
          disabled={busy !== null}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-lavender-700 underline-offset-4 hover:underline disabled:opacity-60"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {busy === 'screenshot' ? 'Opening screenshot...' : 'View payment screenshot'}
        </button>
      )}

      {pending ? (
        <div className="mt-5 space-y-4 border-t border-charcoal-800/10 pt-5">
          <p className="text-xs leading-relaxed text-charcoal-600">
            Check this UTR against your bank or UPI app transaction history before deciding. Screenshots alone are not proof.
          </p>
          <div>
            <label className="label" htmlFor={`note-${payment.id}`}>Note (optional)</label>
            <input id={`note-${payment.id}`} className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => decide('verified')} disabled={busy !== null} className="btn-primary !py-2.5">
              {busy === 'verified' ? 'Verifying...' : 'Verify payment'}
            </button>
            <button type="button" onClick={() => decide('rejected')} disabled={busy !== null} className="btn-danger !py-2.5">
              {busy === 'rejected' ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </div>
      ) : (
        payment.admin_note && <p className="mt-4 text-sm text-charcoal-700">Note: {payment.admin_note}</p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-700">
          {error}
        </p>
      )}
    </article>
  );
}
