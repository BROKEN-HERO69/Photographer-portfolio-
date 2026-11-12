import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { formatINR } from '@/lib/format';
import type { Package } from '@/lib/types';

export default function PackageCard({ pkg, featured = false }: { pkg: Package; featured?: boolean }) {
  const deliverables = pkg.deliverables
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <article
      className={`group relative flex h-full flex-col rounded-3xl border p-7 transition duration-500 hover:-translate-y-1 hover:shadow-lift ${
        featured ? 'border-lavender-300 bg-lavender-50' : 'border-charcoal-800/5 bg-white/80'
      } shadow-soft`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-3xl leading-tight">{pkg.name}</h3>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-charcoal-600">{pkg.description}</p>
      <p className="mt-6 flex items-baseline gap-2">
        <span className="text-xs uppercase tracking-[0.16em] text-charcoal-500">Starting at</span>
        <span className="font-display text-4xl text-charcoal-900">{formatINR(pkg.price_inr)}</span>
      </p>
      {deliverables.length > 0 && (
        <ul className="mt-6 space-y-2.5 border-t border-charcoal-800/10 pt-6">
          {deliverables.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-charcoal-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-700" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      <Link
        to={`/booking?package=${pkg.id}`}
        className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-medium text-charcoal-900 transition group-hover:gap-3"
      >
        Book this package <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
