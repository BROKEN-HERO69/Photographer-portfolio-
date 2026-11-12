import { supabase } from '@/lib/supabase';

export type MediaBucket = 'portfolio' | 'site-media';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG or WebP image.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Images must be 10 MB or smaller.');
  }
}

function newObjectName(file: File): string {
  return `${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
}

export function publicImageUrl(bucket: MediaBucket, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function uploadImage(bucket: MediaBucket, file: File): Promise<string> {
  validateImageFile(file);
  const path = newObjectName(file);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (error) throw new Error('The image could not be uploaded. Please try again.');
  return path;
}

export async function removeImage(bucket: MediaBucket, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error('The old image could not be removed.');
}

export async function removePaymentProof(path: string): Promise<void> {
  const { error } = await supabase.storage.from('payment-proofs').remove([path]);
  if (error) throw new Error('The screenshot could not be removed.');
}

export async function uploadPaymentProof(file: File, reference: string): Promise<string> {
  validateImageFile(file);
  const path = `${reference}/${newObjectName(file)}`;
  const { error } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (error) throw new Error('The screenshot could not be uploaded. You can submit without it.');
  return path;
}
