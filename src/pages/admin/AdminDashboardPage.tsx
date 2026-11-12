import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarDays, Images, Package, Settings, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { BrandMark } from '@/components/SiteLayout';
import BookingsPanel from '@/components/admin/BookingsPanel';
import CalendarPanel from '@/components/admin/CalendarPanel';
import PaymentsPanel from '@/components/admin/PaymentsPanel';
import PortfolioPanel from '@/components/admin/PortfolioPanel';
import PackagesPanel from '@/components/admin/PackagesPanel';
import SiteSettingsPanel from '@/components/admin/SiteSettingsPanel';

type AdminTab = 'bookings' | 'calendar' | 'payments' | 'gallery' | 'packages' | 'site';

const TABS: { id: AdminTab; label: string; icon: typeof CalendarCheck }[] = [
  { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'gallery', label: 'Gallery', icon: Images },
  { id: 'packages', label: 'Packages', icon: Package },
  { id: 'site', label: 'Site & UPI', icon: Settings },
];

export default function AdminDashboardPage() {
  useDocumentMeta('Dashboard | Shasank Photography', 'Manage bookings, payments, gallery and pricing.');
  const { signOut } = useAuth();
  const [tab, setTab] = useState<AdminTab>('bookings');

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="sticky top-0 z-30 border-b border-charcoal-800/10 bg-cream-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <BrandMark name="Shasank" />
          <div className="flex items-center gap-3">
            <Link to="/" className="btn-secondary !py-2 text-sm">View site</Link>
            <button type="button" onClick={() => void signOut()} className="rounded-full px-3 py-2 text-sm text-charcoal-700 transition hover:bg-charcoal-800/5">
              Sign out
            </button>
          </div>
        </div>
        <nav aria-label="Dashboard sections" className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-3 sm:px-8">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                  active ? 'bg-charcoal-800 text-cream-50' : 'text-charcoal-700 hover:bg-baby-100'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        {tab === 'bookings' && <BookingsPanel />}
        {tab === 'calendar' && <CalendarPanel />}
        {tab === 'payments' && <PaymentsPanel />}
        {tab === 'gallery' && <PortfolioPanel />}
        {tab === 'packages' && <PackagesPanel />}
        {tab === 'site' && <SiteSettingsPanel />}
      </main>
    </div>
  );
}
