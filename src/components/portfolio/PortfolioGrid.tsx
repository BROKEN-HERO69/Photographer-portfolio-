import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { publicImageUrl } from '@/lib/api/media';
import { formatDate } from '@/lib/format';
import { GALLERY_EMPTY_MESSAGE } from '@/lib/copy';
import type { PortfolioItem } from '@/lib/types';

interface PortfolioGridProps {
  items: PortfolioItem[];
}

export default function PortfolioGrid({ items }: PortfolioGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenIndex(null);
      if (event.key === 'ArrowRight') setOpenIndex((i) => (i === null ? null : (i + 1) % items.length));
      if (event.key === 'ArrowLeft') setOpenIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length));
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [openIndex, items.length]);

  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <span className="eyebrow">Portfolio</span>
        <p className="font-display text-3xl text-charcoal-900">{GALLERY_EMPTY_MESSAGE}</p>
      </div>
    );
  }

  const active = openIndex === null ? null : items[openIndex];

  return (
    <>
      <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3">
        {items.map((item, index) => (
          <li key={item.id} className="mb-5 break-inside-avoid">
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group relative block w-full overflow-hidden rounded-3xl bg-baby-100 text-left shadow-soft"
              aria-label={`View ${item.title}`}
            >
              <img
                src={publicImageUrl('portfolio', item.image_path)}
                alt={item.title}
                loading="lazy"
                className="w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-charcoal-900/80 to-transparent p-5 text-left opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="block text-xs uppercase tracking-[0.18em] text-baby-100">{item.category}</span>
                <span className="font-display text-2xl text-white">{item.title}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {active && openIndex !== null && (
        <div role="dialog" aria-modal="true" aria-label={active.title} className="fixed inset-0 z-50 flex flex-col bg-charcoal-900/95 animate-fade-in">
          <div className="flex items-center justify-between px-5 py-4 text-cream-50">
            <div>
              <p className="font-display text-2xl">{active.title}</p>
              <p className="text-xs text-cream-200/80">
                {[active.event_title, active.event_date ? formatDate(active.event_date) : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button type="button" onClick={() => setOpenIndex(null)} className="rounded-full p-2 transition hover:bg-white/10" aria-label="Close photo">
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-14 pb-8">
            <img src={publicImageUrl('portfolio', active.image_path)} alt={active.title} className="max-h-[78vh] max-w-full rounded-2xl object-contain" />
            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setOpenIndex((openIndex - 1 + items.length) % items.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-cream-50 transition hover:bg-white/20"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpenIndex((openIndex + 1) % items.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-cream-50 transition hover:bg-white/20"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
