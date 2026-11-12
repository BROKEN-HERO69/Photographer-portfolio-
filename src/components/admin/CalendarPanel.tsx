import { useState } from 'react';
import { Ban, Unlock } from 'lucide-react';
import type { BlockedDate, Booking } from '@/lib/types';
import { blockDate, fetchAllBookings, fetchBlockedDates, unblockDate } from '@/lib/api/admin';
import { formatDate } from '@/lib/format';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '@/lib/labels';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ErrorState, LoadingState } from '@/components/ui/StatusViews';
import MonthGrid, { type DayState, type MonthView } from '@/components/calendar/MonthGrid';
import StatusPill from '@/components/admin/StatusPill';

async function loadCalendarRecords() {
  const [bookings, blocked] = await Promise.all([fetchAllBookings(), fetchBlockedDates()]);
  return { bookings, blocked };
}

const OCCUPYING: Booking['status'][] = ['confirmed', 'completed'];

function initialView(): MonthView {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default function CalendarPanel() {
  const records = useAsyncData(loadCalendarRecords, []);
  const [view, setView] = useState<MonthView>(initialView);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookings = records.data?.bookings ?? [];
  const blocked = records.data?.blocked ?? [];

  const blockedByDate = new Map<string, BlockedDate>(blocked.map((b) => [b.block_date, b]));

  const getDayState = (iso: string): DayState => {
    const dayBookings = bookings.filter((b) => b.event_date === iso);
    if (dayBookings.some((b) => OCCUPYING.includes(b.status))) return { tone: 'booked', title: 'Booked' };
    const block = blockedByDate.get(iso);
    if (block) return { tone: 'blocked', title: block.reason || 'Blocked' };
    if (dayBookings.some((b) => b.status === 'pending')) return { tone: 'pending', title: 'Pending request' };
    return { tone: 'free', title: 'Free' };
  };

  const selectDate = (iso: string) => {
    setSelectedDate(iso);
    setReason('');
    setError(null);
  };

  const runAction = async (action: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
      records.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The calendar could not be updated.');
    } finally {
      setBusy(false);
    }
  };

  const selectedBlock = selectedDate ? blockedByDate.get(selectedDate) : undefined;
  const selectedBookings = selectedDate ? bookings.filter((b) => b.event_date === selectedDate) : [];

  return (
    <section className="space-y-8 animate-fade-in" aria-labelledby="calendar-heading">
      <div>
        <p className="eyebrow">Calendar</p>
        <h1 id="calendar-heading" className="mt-2 text-4xl sm:text-5xl">Availability</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-600">
          Tap a date to see its bookings. Block dates you cannot take, such as personal days or travel.
        </p>
      </div>

      {records.loading && !records.data && <LoadingState label="Loading calendar" />}
      {records.error && !records.data && <ErrorState message={records.error} onRetry={records.reload} />}

      {records.data && (
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="card p-5 sm:p-8">
            <MonthGrid
              view={view}
              onChangeView={setView}
              selectedDate={selectedDate}
              onSelectDate={selectDate}
              getDayState={getDayState}
              disablePast={false}
            />
          </div>

          <aside className="card space-y-6 self-start p-6 sm:p-8" aria-live="polite">
            {!selectedDate ? (
              <p className="text-sm text-charcoal-600">Select a date on the calendar to manage it.</p>
            ) : (
              <>
                <div>
                  <p className="eyebrow">Selected day</p>
                  <h2 className="mt-2 text-3xl">{formatDate(selectedDate)}</h2>
                </div>

                {selectedBookings.length === 0 ? (
                  <p className="text-sm text-charcoal-600">No bookings on this day.</p>
                ) : (
                  <ul className="space-y-3">
                    {selectedBookings.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-charcoal-900">{b.customer_name}</p>
                          <p className="truncate text-xs text-charcoal-500">{b.event_name}</p>
                        </div>
                        <StatusPill label={BOOKING_STATUS_LABEL[b.status]} tone={BOOKING_STATUS_TONE[b.status]} />
                      </li>
                    ))}
                  </ul>
                )}

                {selectedBlock ? (
                  <div className="space-y-4 rounded-2xl bg-lavender-100 p-5">
                    <p className="text-sm text-lavender-800">
                      Blocked{selectedBlock.reason ? `: ${selectedBlock.reason}` : '.'}
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => runAction(() => unblockDate(selectedBlock.id))}
                      className="btn-secondary !py-2.5 w-full"
                    >
                      <Unlock className="h-4 w-4" aria-hidden="true" />
                      {busy ? 'Saving...' : 'Unblock this date'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="label" htmlFor="block-reason">Reason (optional)</label>
                      <input
                        id="block-reason"
                        className="input"
                        value={reason}
                        maxLength={120}
                        placeholder="Personal day, travel, exams"
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => runAction(() => blockDate(selectedDate, reason.trim()))}
                      className="btn-danger !py-2.5 w-full"
                    >
                      <Ban className="h-4 w-4" aria-hidden="true" />
                      {busy ? 'Saving...' : 'Block this date'}
                    </button>
                  </div>
                )}

                {error && (
                  <p role="alert" className="rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-700">
                    {error}
                  </p>
                )}
              </>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
