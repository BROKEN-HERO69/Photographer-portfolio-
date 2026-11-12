import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { fetchActivePackages, fetchSiteSettings } from '@/lib/api/public';
import { ErrorState, LoadingState } from '@/components/ui/StatusViews';
import SectionHeading from '@/components/ui/SectionHeading';
import BookingRequestForm from '@/components/booking/BookingRequestForm';
import PaymentSubmitForm from '@/components/booking/PaymentSubmitForm';
import PaymentInstructions from '@/components/booking/PaymentInstructions';

type Tab = 'request' | 'payment';

export default function BookingPage() {
  useDocumentMeta(
    'Book a Date | Shasank Photography',
    'Check availability, choose a package and request your photography date in New Delhi.',
  );
  const [searchParams] = useSearchParams();
  const packages = useAsyncData(fetchActivePackages, []);
  const settings = useAsyncData(fetchSiteSettings, []);
  const [tab, setTab] = useState<Tab>('request');
  const [paymentReference, setPaymentReference] = useState('');

  const openPayment = (reference: string) => {
    setPaymentReference(reference);
    setTab('payment');
  };

  const loading = packages.loading || settings.loading;
  const error = packages.error ?? settings.error;

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-5 py-16 sm:px-8 md:py-20">
      <SectionHeading
        eyebrow="Booking"
        title={tab === 'request' ? 'Request your date' : 'Submit your payment'}
        description={
          tab === 'request'
            ? 'Pick a package and an available day, then tell me about the event. Requests are confirmed once approved.'
            : 'Already requested a date? Enter your reference and the UPI transaction details for verification.'
        }
      />

      <div role="tablist" aria-label="Booking steps" className="inline-flex rounded-full bg-white/70 p-1.5 shadow-soft">
        {(
          [
            ['request', 'Request a booking'],
            ['payment', 'Submit payment'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`rounded-full px-5 py-2.5 text-sm transition duration-300 ${
              tab === value ? 'bg-charcoal-800 text-cream-50 shadow-soft' : 'text-charcoal-700 hover:text-charcoal-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <LoadingState label="Loading booking details" />}
      {error && <ErrorState message={error} onRetry={() => { packages.reload(); settings.reload(); }} />}

      {packages.data && settings.data && tab === 'request' && (
        <BookingRequestForm
          packages={packages.data}
          initialPackageId={searchParams.get('package') ?? ''}
          settings={settings.data}
          onPaymentRequired={openPayment}
        />
      )}

      {settings.data && tab === 'payment' && (
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr]">
          <PaymentSubmitForm key={paymentReference} initialReference={paymentReference} />
          <PaymentInstructions settings={settings.data} advanceAmountInr={null} />
        </div>
      )}
    </div>
  );
}
