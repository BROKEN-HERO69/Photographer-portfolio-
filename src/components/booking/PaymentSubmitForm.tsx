import { useState, type FormEvent } from 'react';
import { CheckCircle2, Upload } from 'lucide-react';
import { submitPaymentProof } from '@/lib/api/public';
import { removePaymentProof, uploadPaymentProof, validateImageFile } from '@/lib/api/media';

const UTR_PATTERN = /^[A-Z0-9]{6,30}$/;
const UPI_PATTERN = /^[a-z0-9._-]{2,255}@[a-z]{2,63}$/i;

interface PaymentSubmitFormProps {
  initialReference: string;
}

export default function PaymentSubmitForm({ initialReference }: PaymentSubmitFormProps) {
  const [reference, setReference] = useState(initialReference);
  const [payerUpi, setPayerUpi] = useState('');
  const [utr, setUtr] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const cleanReference = reference.trim().toUpperCase();
    const cleanUpi = payerUpi.trim().toLowerCase();
    const cleanUtr = utr.replace(/\s/g, '').toUpperCase();
    const amountInr = Number(amount);

    if (!cleanReference) return setError('Enter the booking reference from your confirmation.');
    if (!UPI_PATTERN.test(cleanUpi)) return setError('Enter the UPI ID you paid from, for example name@bank.');
    if (!UTR_PATTERN.test(cleanUtr)) return setError('Enter the UTR / transaction reference (6 to 30 letters or numbers).');
    if (!Number.isInteger(amountInr) || amountInr <= 0) return setError('Enter the amount you paid in rupees.');

    setSubmitting(true);
    let screenshotPath: string | null = null;
    try {
      if (file) {
        validateImageFile(file);
        screenshotPath = await uploadPaymentProof(file, cleanReference);
      }
      await submitPaymentProof({
        reference: cleanReference,
        payerUpi: cleanUpi,
        utr: cleanUtr,
        amountInr,
        screenshotPath,
      });
      setSubmitted(true);
    } catch (err) {
      if (screenshotPath) {
        await removePaymentProof(screenshotPath).catch(() => undefined);
      }
      setError(err instanceof Error ? err.message : 'The payment could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div role="status" className="card flex flex-col items-start gap-4 p-8">
        <CheckCircle2 className="h-10 w-10 text-success-700" aria-hidden="true" />
        <h2 className="text-3xl">Payment received for verification</h2>
        <p className="text-sm leading-relaxed text-charcoal-700">
          Reference <span className="font-semibold">{reference.trim().toUpperCase()}</span>. We will check the transaction
          and update your booking. Your date is confirmed only after approval.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card space-y-6 p-6 sm:p-8" aria-describedby={error ? 'payment-error' : undefined}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pay-reference">Booking reference</label>
          <input id="pay-reference" className="input uppercase" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="SP-XXXXXXXX" autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="pay-upi">Your UPI ID</label>
          <input id="pay-upi" className="input" value={payerUpi} onChange={(e) => setPayerUpi(e.target.value)} placeholder="name@bank" autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="pay-utr">UTR / reference number</label>
          <input id="pay-utr" className="input uppercase" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="12-digit UTR" autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="pay-amount">Amount paid (INR)</label>
          <input id="pay-amount" type="number" min={1} inputMode="numeric" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2000" />
        </div>
        <div>
          <label className="label" htmlFor="pay-proof">Screenshot (optional)</label>
          <label
            htmlFor="pay-proof"
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-charcoal-800/20 bg-white px-4 py-3 text-sm text-charcoal-600 transition hover:border-baby-500"
          >
            <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{file ? file.name : 'Choose an image'}</span>
          </label>
          <input
            id="pay-proof"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {error && (
        <p id="payment-error" role="alert" className="rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-700">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
        {submitting ? 'Submitting...' : 'Submit payment details'}
      </button>
    </form>
  );
}
