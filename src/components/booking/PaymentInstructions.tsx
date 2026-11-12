import { Copy, Check, QrCode } from 'lucide-react';
import { publicImageUrl } from '@/lib/api/media';
import { formatINR } from '@/lib/format';
import { PRICING_NOTE } from '@/lib/copy';
import type { SiteSettings } from '@/lib/types';
import { useState } from 'react';

interface PaymentInstructionsProps {
  settings: SiteSettings;
  advanceAmountInr: number | null;
}

export default function PaymentInstructions({ settings, advanceAmountInr }: PaymentInstructionsProps) {
  const [copied, setCopied] = useState(false);

  const copyUpi = async () => {
    if (!settings.upi_id) return;
    try {
      await navigator.clipboard.writeText(settings.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6 rounded-3xl bg-peach-50 p-6 sm:p-7">
      <div className="space-y-1">
        <p className="eyebrow text-peach-700">{advanceAmountInr === null ? 'Payment details' : 'Advance payment'}</p>
        {advanceAmountInr !== null && (
          <p className="font-display text-3xl text-charcoal-900">
            {advanceAmountInr > 0 ? formatINR(advanceAmountInr) : 'No advance required'}
          </p>
        )}
        {advanceAmountInr !== null && advanceAmountInr > 0 && (
          <p className="text-sm text-charcoal-600">Pay this advance by UPI to request verification of your date.</p>
        )}
      </div>

      {settings.qr_image_path ? (
        <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-2xl bg-white p-3 shadow-soft">
          <img src={publicImageUrl('site-media', settings.qr_image_path)} alt="UPI QR code for payment" className="w-full" />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm text-charcoal-600">
          <QrCode className="h-5 w-5 shrink-0 text-peach-700" aria-hidden="true" />
          The QR code will appear here once it is configured.
        </div>
      )}

      <dl className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
          <dt className="text-charcoal-600">UPI ID</dt>
          <dd className="flex items-center gap-2 font-medium text-charcoal-900">
            <span className="break-all">{settings.upi_id || 'Shared shortly'}</span>
            {settings.upi_id && (
              <button type="button" onClick={copyUpi} className="rounded-full p-1.5 transition hover:bg-peach-100" aria-label="Copy UPI ID">
                {copied ? <Check className="h-4 w-4 text-success-700" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </dd>
        </div>
        {settings.upi_payee_name && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
            <dt className="text-charcoal-600">Payee</dt>
            <dd className="font-medium text-charcoal-900">{settings.upi_payee_name}</dd>
          </div>
        )}
      </dl>

      {settings.upi_instructions && (
        <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal-700">{settings.upi_instructions}</p>
      )}

      <p className="text-xs leading-relaxed text-charcoal-600">
        Payments are checked manually against the bank transaction. A screenshot alone does not confirm a payment. {PRICING_NOTE}
      </p>
    </div>
  );
}
