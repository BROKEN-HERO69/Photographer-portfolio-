import { fetchSiteSettings } from '@/lib/api/public';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ErrorState, LoadingState } from '@/components/ui/StatusViews';
import { SiteInfoForm } from '@/components/admin/SiteInfoForm';
import PaymentSetupForm from '@/components/admin/PaymentSetupForm';

export default function SiteSettingsPanel() {
  const settings = useAsyncData(fetchSiteSettings, []);

  return (
    <section className="space-y-10 animate-fade-in" aria-labelledby="site-heading">
      <div>
        <p className="eyebrow">Site and payments</p>
        <h1 id="site-heading" className="mt-2 text-4xl sm:text-5xl">Your details</h1>
      </div>

      {settings.loading && !settings.data && <LoadingState label="Loading settings" />}
      {settings.error && !settings.data && <ErrorState message={settings.error} onRetry={settings.reload} />}

      {settings.data && (
        <>
          <SiteInfoForm settings={settings.data} onSaved={settings.reload} />
          <PaymentSetupForm settings={settings.data} onSaved={settings.reload} />
        </>
      )}
    </section>
  );
}
