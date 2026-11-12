import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Upload } from 'lucide-react';
import type { SiteSettings } from '@/lib/types';
import { updateSiteSettings, uploadQrCode } from '@/lib/api/admin';
import { publicImageUrl, validateImageFile } from '@/lib/api/media';

const UPI_PATTERN = /^[a-zA-Z0-9._-]{2,255}@[a-zA-Z]{2,63}$/;

interface PaymentSetupFormProps {
  settings: SiteSettings;
  onSaved: () => void;
}

export default function PaymentSetupForm({ settings, onSaved }: PaymentSetupFormProps) {
  const [values, setValues] = useState({
    upi_id: settings.upi_id,
    upi_payee_name: settings.upi_payee_name,
    upi_instructions: settings.upi_instructions,
    advance_percent: String(settings.advance_percent),
  });
  const [busy, setBusy] = useState<'save' | 'qr' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const qrUrl = settings.qr_image_path ? publicImageUrl('site-media', settings.qr_image_path) : null;

  const update = (field: keyof typeof values) => (e: { target: { value: string } }) => {
    setStatus(null);
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const upiId = values.upi_id.trim();
    const advance = Number(values.advance_percent);
    if (upiId && !UPI_PATTERN.test(upiId)) return setError('Enter a valid UPI ID, such as name@bank.');
    if (!Number.isInteger(advance) || advance < 0 || advance > 100) return setError('The advance must be a whole percentage from 0 to 100.');

    setBusy('save');
    try {
      await updateSiteSettings({
        upi_id: upiId,
        upi_payee_name: values.upi_payee_name.trim(),
        upi_instructions: values.upi_instructions.trim(),
        advance_percent: advance,
      });
      setStatus('Payment details saved.');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The payment details could not be saved.');
    } finally {
      setBusy(null);
    }
  };

  const handleQrUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setStatus(null);
    try {
      validateImageFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That image cannot be used.');
      return;
    }
    setBusy('qr');
    try {
      await uploadQrCode(file, settings.qr_image_path);
      setStatus('QR code updated.');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The QR code could not be uploaded.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <form onSubmit={handleSubmit} noValidate className="card space-y-6 p-6 sm:p-8">
        <div>
          <h2 className="text-3xl">UPI payments</h2>
          <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
            Clients pay you directly by UPI. You confirm each payment yourself against your bank records.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="upi-id">UPI ID</label>
          <input id="upi-id" className="input" value={values.upi_id} maxLength={256} placeholder="name@bank" onChange={update('upi_id')} />
        </div>
        <div>
          <label className="label" htmlFor="upi-payee">Payee name shown to clients</label>
          <input id="upi-payee" className="input" value={values.upi_payee_name} maxLength={120} onChange={update('upi_payee_name')} />
        </div>
        <div>
          <label className="label" htmlFor="upi-instructions">Instructions</label>
          <textarea id="upi-instructions" rows={4} className="input" value={values.upi_instructions} maxLength={800} onChange={update('upi_instructions')} />
        </div>
        <div>
          <label className="label" htmlFor="upi-advance">Advance required (%)</label>
          <input
            id="upi-advance"
            type="number"
            min={0}
            max={100}
            step={1}
            inputMode="numeric"
            className="input"
            value={values.advance_percent}
            onChange={update('advance_percent')}
          />
          <p className="mt-2 text-xs text-charcoal-500">Set to 0 for no advance. You can still confirm any booking without one.</p>
        </div>

        {error && <p role="alert" className="rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-700">{error}</p>}
        <div className="flex items-center justify-end gap-4">
          {status && <p role="status" className="text-sm text-success-700">{status}</p>}
          <button type="submit" disabled={busy !== null} className="btn-primary !py-2.5">
            {busy === 'save' ? 'Saving...' : 'Save payment details'}
          </button>
        </div>
      </form>

      <section className="card space-y-6 self-start p-6 sm:p-8" aria-labelledby="qr-heading">
        <div>
          <h2 id="qr-heading" className="text-3xl">Payment QR code</h2>
          <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
            Upload the QR code from your own UPI app. Clients see this image on the payment step.
          </p>
        </div>
        <div className="mx-auto flex aspect-square w-full max-w-xs items-center justify-center overflow-hidden rounded-2xl border border-dashed border-charcoal-800/20 bg-white">
          {qrUrl ? (
            <img src={qrUrl} alt="Current UPI QR code" className="h-full w-full object-contain p-4" />
          ) : (
            <p className="px-6 text-center text-sm text-charcoal-500">No QR code uploaded yet.</p>
          )}
        </div>
        <label className={`btn-secondary w-full cursor-pointer !py-2.5 ${busy === 'qr' ? 'pointer-events-none opacity-60' : ''}`}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          {busy === 'qr' ? 'Uploading...' : qrUrl ? 'Replace QR code' : 'Upload QR code'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleQrUpload} disabled={busy !== null} />
        </label>
      </section>
    </div>
  );
}
