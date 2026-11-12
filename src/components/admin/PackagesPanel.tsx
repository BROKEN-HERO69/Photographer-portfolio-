import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Package } from '@/lib/types';
import { deletePackage, fetchAllPackages, savePackage, type PackageInput } from '@/lib/api/admin';
import { formatINR } from '@/lib/format';
import { useAsyncData } from '@/hooks/useAsyncData';
import Modal from '@/components/ui/Modal';
import { ErrorState, LoadingState } from '@/components/ui/StatusViews';
import StatusPill from '@/components/admin/StatusPill';

interface PackageFormModalProps {
  pkg: Package | null;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

function PackageFormModal({ pkg, nextSortOrder, onClose, onSaved }: PackageFormModalProps) {
  const [name, setName] = useState(pkg?.name ?? '');
  const [price, setPrice] = useState(pkg ? String(pkg.price_inr) : '');
  const [description, setDescription] = useState(pkg?.description ?? '');
  const [deliverables, setDeliverables] = useState(pkg?.deliverables ?? '');
  const [isActive, setIsActive] = useState(pkg?.is_active ?? true);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const priceValue = Number(price);
    if (!name.trim()) return setError('Give this package a name.');
    if (!Number.isInteger(priceValue) || priceValue < 0) return setError('Enter a whole-rupee price of zero or more.');

    const input: PackageInput = {
      name: name.trim(),
      price_inr: priceValue,
      description: description.trim(),
      deliverables: deliverables.trim(),
      sort_order: pkg?.sort_order ?? nextSortOrder,
      is_active: isActive,
    };
    setBusy('save');
    try {
      await savePackage(pkg?.id ?? null, input);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The package could not be saved.');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!pkg) return;
    if (!window.confirm(`Delete "${pkg.name}"? Existing bookings keep their saved details.`)) return;
    setError(null);
    setBusy('delete');
    try {
      await deletePackage(pkg.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The package could not be deleted.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title={pkg ? 'Edit package' : 'New package'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label className="label" htmlFor="package-name">Name</label>
          <input id="package-name" className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="package-price">Starting price (INR)</label>
          <input id="package-price" type="number" min={0} step={1} inputMode="numeric" className="input" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="package-description">Description</label>
          <textarea id="package-description" rows={3} className="input" value={description} maxLength={400} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="package-deliverables">Deliverables (separate with commas)</label>
          <textarea
            id="package-deliverables"
            rows={3}
            className="input"
            value={deliverables}
            maxLength={600}
            placeholder="150 edited photos, online gallery, 2 hours of coverage"
            onChange={(e) => setDeliverables(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-3 text-sm text-charcoal-800">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded accent-charcoal-800" />
          Show this package to clients and accept bookings for it
        </label>

        {error && (
          <p role="alert" className="rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-700">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-charcoal-800/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {pkg ? (
            <button type="button" onClick={handleDelete} disabled={busy !== null} className="btn-danger !py-2.5">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {busy === 'delete' ? 'Deleting...' : 'Delete'}
            </button>
          ) : (
            <span />
          )}
          <button type="submit" disabled={busy !== null} className="btn-primary !py-2.5">
            {busy === 'save' ? 'Saving...' : 'Save package'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function PackagesPanel() {
  const packages = useAsyncData(fetchAllPackages, []);
  const [editing, setEditing] = useState<Package | null | 'new'>(null);
  const list = packages.data ?? [];
  const nextSortOrder = list.reduce((max, p) => Math.max(max, p.sort_order), 0) + 1;

  return (
    <section className="space-y-8 animate-fade-in" aria-labelledby="packages-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Packages</p>
          <h1 id="packages-heading" className="mt-2 text-4xl sm:text-5xl">Services and pricing</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-600">
            Prices are shown as starting prices. Extra hours, travel and deliverables are quoted separately.
          </p>
        </div>
        <button type="button" onClick={() => setEditing('new')} className="btn-primary self-start !py-2.5 sm:self-auto">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add package
        </button>
      </div>

      {packages.loading && !packages.data && <LoadingState label="Loading packages" />}
      {packages.error && !packages.data && <ErrorState message={packages.error} onRetry={packages.reload} />}

      {packages.data && (
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((pkg) => (
            <li key={pkg.id}>
              <button
                type="button"
                onClick={() => setEditing(pkg)}
                className="card flex h-full w-full flex-col gap-3 p-6 text-left transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-2xl text-charcoal-900">{pkg.name}</p>
                  <StatusPill label={pkg.is_active ? 'Active' : 'Hidden'} tone={pkg.is_active ? 'success' : 'neutral'} />
                </div>
                <p className="text-lg text-charcoal-900">
                  From {formatINR(pkg.price_inr)}
                </p>
                <p className="line-clamp-2 text-sm text-charcoal-600">{pkg.description || 'No description yet.'}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <PackageFormModal
          pkg={editing === 'new' ? null : editing}
          nextSortOrder={nextSortOrder}
          onClose={() => setEditing(null)}
          onSaved={packages.reload}
        />
      )}
    </section>
  );
}
