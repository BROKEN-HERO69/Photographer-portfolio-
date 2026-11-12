import type { PillTone } from '@/lib/labels';

const toneClasses: Record<PillTone, string> = {
  neutral: 'bg-charcoal-800/5 text-charcoal-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-peach-200 text-charcoal-800',
  danger: 'bg-danger-100 text-danger-700',
  info: 'bg-baby-200 text-charcoal-800',
};

export default function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}>{label}</span>
  );
}
