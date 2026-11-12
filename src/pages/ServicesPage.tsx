import { useAsyncData } from '@/hooks/useAsyncData';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { fetchActivePackages } from '@/lib/api/public';
import { PRICING_NOTE, TICKET_DISCLAIMER } from '@/lib/copy';
import { ErrorState, LoadingState } from '@/components/ui/StatusViews';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';
import PackageCard from '@/components/packages/PackageCard';

export default function ServicesPage() {
  useDocumentMeta(
    'Services and Pricing | Shasank Photography',
    'Starting prices for portrait, birthday, college, concert and extended event photography in New Delhi.',
  );
  const { data: packages, loading, error, reload } = useAsyncData(fetchActivePackages, []);

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-5 py-16 sm:px-8 md:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="Services"
          title="Photography packages"
          description="Choose a package to see what is included, then request your date. Prices are starting prices in INR."
        />
      </Reveal>

      {loading && <LoadingState label="Loading packages" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {packages && packages.length === 0 && (
        <p className="text-charcoal-600">Packages will be listed here shortly.</p>
      )}
      {packages && packages.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg, index) => (
            <Reveal key={pkg.id} delay={index * 80}>
              <PackageCard pkg={pkg} />
            </Reveal>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card space-y-3 p-7">
          <p className="eyebrow">Pricing</p>
          <p className="text-sm leading-relaxed text-charcoal-700">{PRICING_NOTE}</p>
        </div>
        <div className="card space-y-3 p-7">
          <p className="eyebrow">Tickets and venue</p>
          <p className="text-sm leading-relaxed text-charcoal-700">{TICKET_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
