import { useAsyncData } from '@/hooks/useAsyncData';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { fetchSiteSettings } from '@/lib/api/public';
import { ErrorState, LoadingState } from '@/components/ui/StatusViews';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';
import { SocialLinks } from '@/components/SiteLayout';

export default function AboutPage() {
  useDocumentMeta(
    'About | Shasank Photography',
    'Learn about Shasank, a photographer from New Delhi who captures portraits, celebrations and live events.',
  );
  const { data: settings, loading, error, reload } = useAsyncData(fetchSiteSettings, []);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
      {loading && <LoadingState label="Loading" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {settings && (
        <div className="grid items-start gap-14 lg:grid-cols-[1.1fr_1fr]">
          <Reveal>
            <div className="space-y-8">
              <SectionHeading eyebrow="About" title={`Hello, I'm ${settings.photographer_name}.`} />
              <div className="space-y-5 text-base leading-[1.75] text-charcoal-700">
                {(settings.about_text || 'Your about story will appear here once it is added in the admin dashboard.')
                  .split('\n')
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <aside className="card space-y-8 p-8">
              <div className="space-y-2">
                <p className="eyebrow">Based in</p>
                <p className="font-display text-3xl text-charcoal-900">{settings.city}</p>
              </div>
              <div className="space-y-2">
                <p className="eyebrow">Follow along</p>
                <SocialLinks settings={settings} />
                {!settings.instagram_url && !settings.pinterest_url && (
                  <p className="text-sm text-charcoal-600">Social links will appear here once added.</p>
                )}
              </div>
              <div className="rounded-3xl bg-baby-100 p-6 text-sm leading-relaxed text-charcoal-700">
                Every session starts with a conversation so the photographs feel like you, not a template.
              </div>
            </aside>
          </Reveal>
        </div>
      )}
    </div>
  );
}
