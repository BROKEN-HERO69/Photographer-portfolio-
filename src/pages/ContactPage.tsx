import { Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { fetchSiteSettings } from '@/lib/api/public';
import { ErrorState, LoadingState } from '@/components/ui/StatusViews';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';
import { SocialLinks } from '@/components/SiteLayout';

export default function ContactPage() {
  useDocumentMeta(
    'Contact | Shasank Photography',
    'Get in touch with Shasank for photography bookings and questions in New Delhi.',
  );
  const { data: settings, loading, error, reload } = useAsyncData(fetchSiteSettings, []);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="Contact"
          title="Let's talk about your date"
          description="Reach out directly or send a booking request. Requests are confirmed once the date is checked and approved."
        />
      </Reveal>

      {loading && <div className="mt-12"><LoadingState label="Loading contact details" /></div>}
      {error && <div className="mt-12"><ErrorState message={error} onRetry={reload} /></div>}

      {settings && (
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <Reveal>
            <div className="card flex h-full flex-col gap-4 p-7">
              <Mail className="h-6 w-6 text-lavender-700" aria-hidden="true" />
              <p className="eyebrow">Email</p>
              {settings.contact_email ? (
                <a href={`mailto:${settings.contact_email}`} className="break-all text-charcoal-900 underline-offset-4 hover:underline">
                  {settings.contact_email}
                </a>
              ) : (
                <p className="text-sm text-charcoal-600">Email will be shared soon.</p>
              )}
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="card flex h-full flex-col gap-4 p-7">
              <Phone className="h-6 w-6 text-peach-700" aria-hidden="true" />
              <p className="eyebrow">Phone</p>
              {settings.contact_phone ? (
                <a href={`tel:${settings.contact_phone.replace(/\s/g, '')}`} className="text-charcoal-900 underline-offset-4 hover:underline">
                  {settings.contact_phone}
                </a>
              ) : (
                <p className="text-sm text-charcoal-600">Phone number will be shared soon.</p>
              )}
            </div>
          </Reveal>
          <Reveal delay={160}>
            <div className="card flex h-full flex-col gap-4 p-7">
              <MapPin className="h-6 w-6 text-baby-700" aria-hidden="true" />
              <p className="eyebrow">Location</p>
              <p className="text-charcoal-900">{settings.city}</p>
              <p className="text-sm text-charcoal-600">Travel outside the city is quoted separately.</p>
            </div>
          </Reveal>
        </div>
      )}

      {settings && (
        <Reveal>
          <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-3xl bg-lavender-100 p-8 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <p className="font-display text-3xl text-charcoal-900">Follow the latest work</p>
              <p className="text-sm text-charcoal-700">New sessions and behind-the-scenes moments are shared on social media.</p>
            </div>
            <div className="flex flex-col items-start gap-4 sm:items-end">
              <SocialLinks settings={settings} />
              <Link to="/booking" className="btn-primary">
                Request a booking
              </Link>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}
