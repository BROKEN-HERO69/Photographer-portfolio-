import { useState } from 'react';
import { useAsyncData } from '@/hooks/useAsyncData';
import { fetchUnavailableDates } from '@/lib/api/public';
import { toISODate } from '@/lib/format';
import MonthGrid, { type MonthView } from '@/components/calendar/MonthGrid';
import { ErrorState } from '@/components/ui/StatusViews';

interface AvailabilityCalendarProps {
  selectedDate: string | null;
  onSelectDate: (iso: string) => void;
}

function monthRange({ year, month }: MonthView): { from: string; to: string } {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { from: toISODate(year, month, 1), to: toISODate(year, month, lastDay) };
}

export default function AvailabilityCalendar({ selectedDate, onSelectDate }: AvailabilityCalendarProps) {
  const now = new Date();
  const [view, setView] = useState<MonthView>({ year: now.getFullYear(), month: now.getMonth() });
  const range = monthRange(view);
  const { data: unavailable, error, reload } = useAsyncData(
    () => fetchUnavailableDates(range.from, range.to),
    [range.from, range.to],
  );

  const unavailableSet = new Set(unavailable ?? []);

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} onRetry={reload} />}
      <MonthGrid
        view={view}
        onChangeView={setView}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        getDayState={(iso) => {
          if (unavailableSet.has(iso)) return { tone: 'booked', disabled: true, title: 'Not available' };
          return { tone: 'free' };
        }}
      />
    </div>
  );
}
