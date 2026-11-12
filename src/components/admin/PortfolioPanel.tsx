import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { PortfolioItem } from '@/lib/types';
import { fetchAllPortfolio } from '@/lib/api/admin';
import { publicImageUrl } from '@/lib/api/media';
import { formatDate } from '@/lib/format';
import { GALLERY_EMPTY_MESSAGE } from '@/lib/copy';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ErrorState, LoadingState } from '@/components/ui/StatusViews';
import PortfolioFormModal from '@/components/admin/PortfolioFormModal';

export default function PortfolioPanel() {
  const items = useAsyncData(fetchAllPortfolio, []);
  const [editing, setEditing] = useState<PortfolioItem | null | 'new'>(null);

  return (
    <section className="space-y-8 animate-fade-in" aria-labelledby="gallery-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Gallery</p>
          <h1 id="gallery-heading" className="mt-2 text-4xl sm:text-5xl">Your portfolio</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-600">
            Only photographs you took should appear here. Each photo appears on the public portfolio and home page.
          </p>
        </div>
        <button type="button" onClick={() => setEditing('new')} className="btn-primary self-start !py-2.5 sm:self-auto">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add photo
        </button>
      </div>

      {items.loading && !items.data && <LoadingState label="Loading gallery" />}
      {items.error && !items.data && <ErrorState message={items.error} onRetry={items.reload} />}

      {items.data && items.data.length === 0 && (
        <div className="card p-10 text-center text-sm text-charcoal-600">{GALLERY_EMPTY_MESSAGE}</div>
      )}

      {items.data && items.data.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.data.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setEditing(item)}
                className="group block w-full overflow-hidden rounded-2xl bg-white text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
              >
                <div className="aspect-[4/5] overflow-hidden bg-baby-100">
                  <img
                    src={publicImageUrl('portfolio', item.image_path)}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="space-y-1 p-4">
                  <p className="truncate font-medium text-charcoal-900">{item.title}</p>
                  <p className="truncate text-xs text-charcoal-600">
                    {item.category}
                    {item.event_date ? ` · ${formatDate(item.event_date)}` : ''}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <PortfolioFormModal
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={items.reload}
        />
      )}
    </section>
  );
}
