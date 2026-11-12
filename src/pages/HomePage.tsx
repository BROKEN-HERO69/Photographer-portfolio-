import { Link } from 'react-router-dom';
import { ArrowRight, Camera } from 'lucide-react';
import { fetchActivePackages, fetchPortfolio, fetchSiteSettings } from '@/lib/api/public';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { ErrorState, LoadingState } from '@/components/ui/StatusViews';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';
import PackageCard from '@/components/packages/PackageCard';
import PortfolioGrid from '@/components/portfolio/PortfolioGrid';
import { PRICING_NOTE } from '@/lib/copy';
import { publicImageUrl } from '@/lib/api/media';

export default function HomePage() {
  useDocumentMeta(
    'Shasank Photography | Portraits and Event Coverage in New Delhi',
    'Portrait, birthday, college, concert and event photography by Shasank in New Delhi. Check availability and book online.',
  );
  const settings = useAsyncData(fetchSiteSettings, []);
  const packages = useAsyncData(fetchActivePackages, []);
  const portfolio = useAsyncData(fetchPortfolio, []);

  const heroItem = portfolio.data?.[0];

  return (
    <div>
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-baby-200/70 blur-3xl animate-drift" />
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-peach-200/70 blur-3xl animate-drift [animation-delay:-5s]" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-lavender-200/70 blur-3xl animate-drift [animation-delay:-9s]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 md:pt-24 lg:grid-cols-2">
          <div className="space-y-8 animate-fade-up">
            <p className="eyebrow">Photography · New Delhi, India</p>
            <h1 className="text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Quiet, honest photographs of the moments that matter.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-charcoal-600 sm:text-lg">
              Portraits, birthdays, college fests and live concerts, captured with a gentle eye and delivered with care.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/booking" className="btn-primary">
                Check availability <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/portfolio" className="btn-secondary">
                View portfolio
              </Link>
            </div>
          </div>

          <div className="relative animate-fade-up [animation-delay:150ms]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-baby-200 via-lavender-100 to-peach-200 shadow-lift">
              {heroItem ? (
                <img src={publicImageUrl('portfolio', heroItem.image_path)} alt={heroItem.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-5 p-10 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/70 text-charcoal-800">
                    <Camera className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <p className="font-display text-3xl text-charcoal-900">The gallery is currently being curated. New moments coming soon.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Services"
            title="Packages with clear starting prices"
            description={PRICING_NOTE}
          />
        </Reveal>
        {packages.loading && <LoadingState label="Loading packages" />}
        {packages.error && <ErrorState message={packages.error} onRetry={packages.reload} />}
        {packages.data && (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packages.data.slice(0, 3).map((pkg, index) => (
              <Reveal key={pkg.id} delay={index * 90}>
                <PackageCard pkg={pkg} featured={index === 1} />
              </Reveal>
            ))}
          </div>
        )}
        <div className="mt-10 text-center">
          <Link to="/services" className="btn-secondary">
            All services and details
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <Reveal>
          <SectionHeading eyebrow="Portfolio" title="Recent moments" />
        </Reveal>
        <div className="mt-12">
          {portfolio.loading && <LoadingState label="Loading gallery" />}
          {portfolio.error && <ErrorState message={portfolio.error} onRetry={portfolio.reload} />}
          {portfolio.data && <PortfolioGrid items={portfolio.data.slice(0, 6)} />}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-charcoal-800 px-8 py-16 text-center text-cream-50 sm:px-16">
            <div aria-hidden="true" className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-peach-300/30 blur-3xl" />
            <div aria-hidden="true" className="absolute -bottom-12 -left-8 h-56 w-56 rounded-full bg-baby-300/30 blur-3xl" />
            <div className="relative space-y-6">
              <h2 className="text-4xl text-cream-50 sm:text-5xl">Have a date in mind?</h2>
              <p className="mx-auto max-w-xl text-cream-200/90">
                Pick a day on the calendar, share your event details and we will confirm once the date is secured.
              </p>
              <Link to="/booking" className="inline-flex items-center gap-2 rounded-full bg-cream-50 px-7 py-3 text-sm font-medium text-charcoal-900 transition hover:-translate-y-0.5 hover:bg-white">
                Start a booking <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {settings.error && <p className="sr-only">{settings.error}</p>}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
