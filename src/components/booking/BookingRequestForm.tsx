import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { createBookingRequest, type BookingRequestInput } from '@/lib/api/public';
import { formatDate, formatINR } from '@/lib/format';
import { TICKET_DISCLAIMER } from '@/lib/copy';
import type { BookingCreated, Package, SiteSettings } from '@/lib/types';
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar';
import PaymentInstructions from '@/components/booking/PaymentInstructions';

interface BookingRequestFormProps {
  packages: Package[];
  initialPackageId: string;
  settings: SiteSettings;
  onPaymentRequired: (reference: string) => void;
}

const EMPTY_FORM = { name: '', phone: '', email: '', eventName: '', venue: '', details: '' };

export default function BookingRequestForm({ packages, initialPackageId, settings, onPaymentRequired }: BookingRequestFormProps) {
  const [packageId, setPackageId] = useState(initialPackageId);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingCreated | null>(null);

  const selectedPackage = packages.find((pkg) => pkg.id === packageId) ?? null;

  const update = (field: keyof typeof EMPTY_FORM) => (event: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!selectedPackage) return setError('Choose a package to continue.');
    if (!eventDate) return setError('Choose a date on the calendar.');
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      return setError('Please fill in your name, phone number and email.');
    }
    if (!form.eventName.trim() || !form.venue.trim()) {
      return setError('Please add the event name and venue.');
    }

    const input: BookingRequestInput = {
      packageId: selectedPackage.id,
      eventDate,
      customerName: form.name,
      customerPhone: form.phone,
      customerEmail: form.email,
      eventName: form.eventName,
      venue: form.venue,
      details: form.details,
    };

    setSubmitting(true);
    try {
      setResult(await createBookingRequest(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your request could not be sent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const needsPayment = result.payment_status === 'payment_pending';
    return (
      <div role="status" className="space-y-8">
        <div className="card space-y-6 p-7 sm:p-9">
          <CheckCircle2 className="h-10 w-10 text-success-700" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="text-4xl">Request received</h2>
            <p className="text-sm leading-relaxed text-charcoal-700">
              Your request for <span className="font-semibold">{result.package_name}</span> on{' '}
              <span className="font-semibold">{formatDate(result.event_date)}</span> is pending approval. The date is not reserved
              until it is confirmed.
            </p>
          </div>
          <div className="rounded-2xl bg-baby-100 p-5">
            <p className="eyebrow text-baby-800">Booking reference</p>
            <p className="mt-1 font-mono text-2xl tracking-wider text-charcoal-900">{result.reference}</p>
            <p className="mt-2 text-xs text-charcoal-600">Keep this reference. You will need it to submit payment.</p>
          </div>
          <p className="text-xs leading-relaxed text-charcoal-600">{TICKET_DISCLAIMER}</p>
          <div className="flex flex-wrap gap-3">
            {needsPayment && (
              <button type="button" onClick={() => onPaymentRequired(result.reference)} className="btn-primary">
                Submit advance payment <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={() => { setResult(null); setEventDate(null); setForm(EMPTY_FORM); }} className="btn-secondary">
              Make another request
            </button>
          </div>
        </div>
        {needsPayment && <PaymentInstructions settings={settings} advanceAmountInr={result.advance_amount_inr} />}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-10 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-8">
        <div className="space-y-3">
          <label className="label" htmlFor="booking-package">Package</label>
          <select id="booking-package" className="input" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
            <option value="">Choose a package</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} · from {formatINR(pkg.price_inr)}
              </option>
            ))}
          </select>
          {selectedPackage && (
            <p className="text-xs leading-relaxed text-charcoal-600">
              Starting price {formatINR(selectedPackage.price_inr)}. Extra hours, travel and extra deliverables are quoted separately.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <p className="label">Event date</p>
          <div className="card p-5">
            <AvailabilityCalendar selectedDate={eventDate} onSelectDate={setEventDate} />
          </div>
          <p className="text-xs text-charcoal-600">
            {eventDate ? `Selected: ${formatDate(eventDate)}` : 'Select an available date. Grey dates are already booked or unavailable.'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="b-name">Full name</label>
            <input id="b-name" className="input" value={form.name} onChange={update('name')} autoComplete="name" required />
          </div>
          <div>
            <label className="label" htmlFor="b-phone">Phone</label>
            <input id="b-phone" type="tel" className="input" value={form.phone} onChange={update('phone')} autoComplete="tel" required />
          </div>
          <div>
            <label className="label" htmlFor="b-email">Email</label>
            <input id="b-email" type="email" className="input" value={form.email} onChange={update('email')} autoComplete="email" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="b-event">Event name</label>
            <input id="b-event" className="input" value={form.eventName} onChange={update('eventName')} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="b-venue">Venue or location</label>
            <input id="b-venue" className="input" value={form.venue} onChange={update('venue')} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="b-details">Details</label>
            <textarea id="b-details" rows={4} maxLength={2000} className="input resize-none" value={form.details} onChange={update('details')} placeholder="Timings, shot list, number of guests..." />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting || packages.length === 0} className="btn-primary w-full sm:w-auto">
          {submitting ? 'Sending request...' : 'Send booking request'}
        </button>
        <p className="text-xs leading-relaxed text-charcoal-600">
          Requests are reviewed manually. Pending requests do not reserve a date until they are approved.
        </p>
      </div>
    </form>
  );
}
