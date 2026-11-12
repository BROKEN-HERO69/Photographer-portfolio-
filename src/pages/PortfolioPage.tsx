import { useMemo, useState } from 'react';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { fetchPortfolio } from '@/lib/api/public';
import { ErrorState, LoadingState } from '@/components/ui/StatusViews';
import SectionHeading from '@/components/ui/SectionHeading';
import PortfolioGrid from '@/components/portfolio/PortfolioGrid';

const ALL = 'All';

export default function PortfolioPage() {
  useDocumentMeta(
    'Portfolio | Shasank Photography',
    'Browse portrait, birthday, college, concert and event photography by Shasank from New Delhi.',
  );
  const { data: items, loading, error, reload } = useAsyncData(fetchPortfolio, []);
  const [category, setCategory] = useState(ALL);

  const categories = useMemo(() => {
    const unique = Array.from(new Set((items ?? []).map((item) => item.category)));
    return [ALL, ...unique];
  }, [items]);

  const visible = useMemo(
    () => (items ?? []).filter((item) => category === ALL || item.category === category),
    [items, category],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-5 py-16 sm:px-8 md:py-20">
      <SectionHeading eyebrow="Portfolio" title="Selected frames" description="Sessions and events, shared with permission from the people in them." />

      {loading && <LoadingState label="Loading gallery" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {items && items.length > 0 && (
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
              className={`rounded-full px-4 py-2 text-sm transition duration-300 ${
                category === value ? 'bg-charcoal-800 text-cream-50' : 'bg-white/70 text-charcoal-700 hover:bg-baby-200'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      {items && <PortfolioGrid items={visible} />}
    </div>
  );
}
