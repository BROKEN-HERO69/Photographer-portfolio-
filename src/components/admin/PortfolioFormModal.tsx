import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import type { PortfolioItem } from '@/lib/types';
import {
  createPortfolioItem,
  deletePortfolioItem,
  updatePortfolioItem,
  type PortfolioInput,
} from '@/lib/api/admin';
import { publicImageUrl, validateImageFile } from '@/lib/api/media';
import { PORTFOLIO_CATEGORIES } from '@/lib/labels';
import Modal from '@/components/ui/Modal';

interface PortfolioFormModalProps {
  item: PortfolioItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PortfolioFormModal({ item, onClose, onSaved }: PortfolioFormModalProps) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [category, setCategory] = useState<string>(item?.category ?? PORTFOLIO_CATEGORIES[0]);
  const [eventTitle, setEventTitle] = useState(item?.event_title ?? '');
  const [eventDate, setEventDate] = useState(item?.event_date ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const currentUrl = item ? publicImageUrl('portfolio', item.image_path) : null;
  const shownUrl = previewUrl ?? currentUrl;

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    setError(null);
    if (!chosen) {
      setFile(null);
      return;
    }
    try {
      validateImageFile(chosen);
      setFile(chosen);
    } catch (err) {
      setFile(null);
      event.target.value = '';
      setError(err instanceof Error ? err.message : 'That image cannot be used.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!title.trim()) return setError('Give this photo a title.');
    if (!item && !file) return setError('Choose a photo to upload.');

    const input: PortfolioInput = {
      title: title.trim(),
      category,
      event_title: eventTitle.trim(),
      event_date: eventDate || null,
    };

    setBusy('save');
    try {
      if (item) await updatePortfolioItem(item, input, file);
      else await createPortfolioItem(input, file as File);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The photo could not be saved.');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!window.confirm('Delete this photo from the gallery? This cannot be undone.')) return;
    setError(null);
    setBusy('delete');
    try {
      await deletePortfolioItem(item);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The photo could not be deleted.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title={item ? 'Edit gallery photo' : 'Add gallery photo'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-baby-100">
              {shownUrl ? (
                <img src={shownUrl} alt="Preview of the selected photo" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-10 w-10 text-charcoal-500" aria-hidden="true" />
              )}
            </div>
            <label className="btn-secondary w-full cursor-pointer !py-2.5">
              <Upload className="h-4 w-4" aria-hidden="true" />
              {item ? 'Replace photo' : 'Choose photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFile} />
            </label>
            <p className="text-xs leading-relaxed text-charcoal-600">JPEG, PNG or WebP, up to 10 MB. Only your own photographs.</p>
            {file && <p className="truncate text-xs text-charcoal-700">Selected: {file.name}</p>}
          </div>

          <div className="space-y-5">
            <div>
              <label className="label" htmlFor="portfolio-title">Title</label>
              <input id="portfolio-title" className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="portfolio-category">Category</label>
              <select id="portfolio-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {PORTFOLIO_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="portfolio-event">Event title (optional)</label>
              <input id="portfolio-event" className="input" value={eventTitle} maxLength={120} onChange={(e) => setEventTitle(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="portfolio-date">Event date (optional)</label>
              <input id="portfolio-date" type="date" className="input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-700">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-charcoal-800/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {item ? (
            <button type="button" onClick={handleDelete} disabled={busy !== null} className="btn-danger !py-2.5">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {busy === 'delete' ? 'Deleting...' : 'Delete photo'}
            </button>
          ) : (
            <span />
          )}
          <button type="submit" disabled={busy !== null} className="btn-primary !py-2.5">
            {busy === 'save' ? 'Saving...' : item ? 'Save changes' : 'Add to gallery'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
