import { useState, type FormEvent } from 'react';
import type { SiteSettings } from '@/lib/types';
import { updateSiteSettings } from '@/lib/api/admin';

function isOptionalUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

interface SiteInfoFormProps {
  settings: SiteSettings;
  onSaved: () => void;
}

export function SiteInfoForm({ settings, onSaved }: SiteInfoFormProps) {
  const [values, setValues] = useState({
    photographer_name: settings.photographer_name,
    tagline: settings.tagline,
    about_text: settings.about_text,
    city: settings.city,
    contact_email: settings.contact_email,
    contact_phone: settings.contact_phone,
    instagram_url: settings.instagram_url,
    pinterest_url: settings.pinterest_url,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const update = (field: keyof typeof values) => (e: { target: { value: string } }) => {
    setSaved(false);
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])) as typeof values;
    if (!trimmed.photographer_name) return setError('The photographer name cannot be empty.');
    if (trimmed.contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed.contact_email)) return setError('Enter a valid contact email.');
    if (!isOptionalUrl(trimmed.instagram_url)) return setError('The Instagram link must start with https://.');
    if (!isOptionalUrl(trimmed.pinterest_url)) return setError('The Pinterest link must start with https://.');

    setBusy(true);
    try {
      await updateSiteSettings(trimmed);
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The details could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="card space-y-6 p-6 sm:p-8">
      <div>
        <h2 className="text-3xl">Public profile</h2>
        <p className="mt-2 text-sm text-charcoal-600">Shown on the About, Contact and footer sections.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="site-name">Photographer name</label>
          <input id="site-name" className="input" value={values.photographer_name} maxLength={80} onChange={update('photographer_name')} />
        </div>
        <div>
          <label className="label" htmlFor="site-city">City</label>
          <input id="site-city" className="input" value={values.city} maxLength={80} onChange={update('city')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="site-tagline">Tagline</label>
          <input id="site-tagline" className="input" value={values.tagline} maxLength={160} onChange={update('tagline')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="site-about">About text</label>
          <textarea id="site-about" rows={6} className="input" value={values.about_text} maxLength={3000} onChange={update('about_text')} />
          <p className="mt-2 text-xs text-charcoal-500">Separate paragraphs with a blank line.</p>
        </div>
        <div>
          <label className="label" htmlFor="site-email">Contact email</label>
          <input id="site-email" type="email" className="input" value={values.contact_email} maxLength={120} onChange={update('contact_email')} />
        </div>
        <div>
          <label className="label" htmlFor="site-phone">Contact phone</label>
          <input id="site-phone" type="tel" className="input" value={values.contact_phone} maxLength={30} onChange={update('contact_phone')} />
        </div>
        <div>
          <label className="label" htmlFor="site-instagram">Instagram link</label>
          <input id="site-instagram" type="url" className="input" value={values.instagram_url} maxLength={300} onChange={update('instagram_url')} />
        </div>
        <div>
          <label className="label" htmlFor="site-pinterest">Pinterest link</label>
          <input id="site-pinterest" type="url" className="input" value={values.pinterest_url} maxLength={300} onChange={update('pinterest_url')} />
        </div>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-700">{error}</p>}
      <div className="flex items-center justify-end gap-4">
        {saved && <p role="status" className="text-sm text-success-700">Saved.</p>}
        <button type="submit" disabled={busy} className="btn-primary !py-2.5">
          {busy ? 'Saving...' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}
