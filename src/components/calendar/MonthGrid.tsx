import { ChevronLeft, ChevronRight } from 'lucide-react';
import { todayISO, toISODate } from '@/lib/format';

export type DayTone = 'free' | 'booked' | 'pending' | 'blocked' | 'past';

export interface DayState {
  tone: DayTone;
  disabled?: boolean;
  title?: string;
}

export interface MonthView {
  year: number;
  month: number;
}

interface MonthGridProps {
  view: MonthView;
  onChangeView: (view: MonthView) => void;
  selectedDate: string | null;
  onSelectDate: (iso: string) => void;
  getDayState: (iso: string) => DayState;
  legend?: boolean;
  disablePast?: boolean;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toneClasses: Record<DayTone, string> = {
  free: 'bg-white text-charcoal-900 hover:bg-baby-100 hover:-translate-y-0.5',
  pending: 'bg-peach-100 text-charcoal-900 hover:bg-peach-200',
  booked: 'bg-charcoal-800 text-cream-50 cursor-not-allowed',
  blocked: 'bg-lavender-200 text-lavender-800 cursor-not-allowed line-through',
  past: 'bg-transparent text-charcoal-500/40 cursor-not-allowed',
};

export default function MonthGrid({ view, onChangeView, selectedDate, onSelectDate, getDayState, legend = true, disablePast = true }: MonthGridProps) {
  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(view.year, view.month, 1)),
  );
  const firstWeekday = (new Date(Date.UTC(view.year, view.month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const today = todayISO();

  const shiftMonth = (delta: number) => {
    const next = new Date(Date.UTC(view.year, view.month + delta, 1));
    onChangeView({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shiftMonth(-1)} className="rounded-full p-2 transition hover:bg-charcoal-800/5" aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="font-display text-2xl text-charcoal-900" aria-live="polite">
          {monthLabel}
        </p>
        <button type="button" onClick={() => shiftMonth(1)} className="rounded-full p-2 transition hover:bg-charcoal-800/5" aria-label="Next month">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, index) => {
          if (day === null) return <div key={`blank-${index}`} />;
          const iso = toISODate(view.year, view.month, day);
          const state = getDayState(iso);
          const isPast = iso < today;
          const disabled = state.disabled || (disablePast && isPast);
          const tone: DayTone = disablePast && isPast ? 'past' : state.tone;
          const selected = selectedDate === iso;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(iso)}
              title={state.title ?? (disabled ? 'Not available' : 'Available')}
              aria-label={`${iso}${disabled ? ', not available' : ', available'}`}
              aria-pressed={selected}
              className={`aspect-square rounded-2xl text-sm font-medium transition duration-200 focus-visible:ring-baby-500 ${toneClasses[tone]} ${
                selected ? '!bg-baby-500 !text-white shadow-soft ring-2 ring-baby-700' : ''
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {legend && (
        <ul className="flex flex-wrap gap-4 pt-2 text-xs text-charcoal-600">
          <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-charcoal-800/20 bg-white" /> Available</li>
          <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-peach-200" /> Requested (not reserved)</li>
          <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-charcoal-800" /> Unavailable</li>
          <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-lavender-200" /> Blocked</li>
        </ul>
      )}
    </div>
  );
}
