/*
# Foundation: admins, site settings, packages, blocked dates, portfolio, media storage

1. New Tables
- `admin_users`: the list of accounts allowed into the admin dashboard. Each row is one admin user id.
- `site_settings`: a single row holding the public site content (name, about text, contact details, social links, UPI payment details, QR image path, advance percentage).
- `packages`: photography packages with INR starting prices, descriptions, deliverables and an active flag.
- `portfolio_items`: photos uploaded by the photographer with category, event title, event date and sort order.
- `blocked_dates`: days the photographer is unavailable (admin-only details).

2. Storage buckets
- `portfolio` (public read, admin write) for portfolio photos.
- `site-media` (public read, admin write) for the UPI QR image.
- `payment-proofs` (private) for customer payment screenshots. Customers can upload; only admins can read.

3. Security
- Row level security enabled on every table.
- `is_admin()` helper checks the signed-in user against `admin_users`.
- Public visitors can read active packages, portfolio items and site settings only.
- Only admins can change site content, packages, portfolio, blocked dates and the QR image.
- `claim_first_admin()` lets the first signed-in account become the admin when no admin exists yet.

4. Important notes
- Migration is idempotent: safe to re-run.
- Seeded packages use the agreed INR starting prices and can be edited in the admin dashboard.
*/

CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON admin_users TO authenticated;

DROP POLICY IF EXISTS "admins_select_own_row" ON admin_users;
CREATE POLICY "admins_select_own_row" ON admin_users FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users);
$$;

REVOKE EXECUTE ON FUNCTION public.has_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_admin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to claim admin access.';
  END IF;
  PERFORM pg_advisory_xact_lock(424242);
  IF EXISTS (SELECT 1 FROM public.admin_users) THEN
    RETURN false;
  END IF;
  INSERT INTO public.admin_users (user_id) VALUES (uid);
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS site_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  photographer_name text NOT NULL DEFAULT 'Shasank',
  tagline text NOT NULL DEFAULT '',
  about_text text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT 'New Delhi, India',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  instagram_url text NOT NULL DEFAULT '',
  pinterest_url text NOT NULL DEFAULT '',
  upi_id text NOT NULL DEFAULT '',
  upi_payee_name text NOT NULL DEFAULT '',
  upi_instructions text NOT NULL DEFAULT '',
  qr_image_path text,
  advance_percent integer NOT NULL DEFAULT 0 CHECK (advance_percent BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON site_settings TO anon, authenticated;
GRANT UPDATE ON site_settings TO authenticated;

DROP POLICY IF EXISTS "public_read_site_settings" ON site_settings;
CREATE POLICY "public_read_site_settings" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_site_settings" ON site_settings;
CREATE POLICY "admin_update_site_settings" ON site_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  price_inr integer NOT NULL CHECK (price_inr >= 0),
  description text NOT NULL DEFAULT '',
  deliverables text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS packages_sort_idx ON packages (sort_order);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON packages TO authenticated;

DROP POLICY IF EXISTS "public_read_active_packages" ON packages;
CREATE POLICY "public_read_active_packages" ON packages FOR SELECT
  TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "admin_read_all_packages" ON packages;
CREATE POLICY "admin_read_all_packages" ON packages FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_insert_packages" ON packages;
CREATE POLICY "admin_insert_packages" ON packages FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_packages" ON packages;
CREATE POLICY "admin_update_packages" ON packages FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_packages" ON packages;
CREATE POLICY "admin_delete_packages" ON packages FOR DELETE
  TO authenticated USING (public.is_admin());

INSERT INTO packages (name, price_inr, description, deliverables, sort_order)
SELECT v.name, v.price, v.description, v.deliverables, v.sort_order
FROM (VALUES
  ('Portrait Session', 1999, 'A focused one-to-one portrait shoot for personal brands, profiles and timeless headshots.', '30 edited high-resolution photos, online gallery, 1 outfit', 1),
  ('Small Event', 3499, 'Coverage for small gatherings, meetups, workshops and intimate celebrations.', '60 edited photos, online gallery, 2 hours of coverage', 2),
  ('Birthday / Private', 3999, 'Candid and posed coverage for birthdays and private celebrations.', '80 edited photos, online gallery, highlight selection', 3),
  ('College Event', 3499, 'Fest, cultural night and campus event coverage with quick turnaround.', '70 edited photos, online gallery, 48-hour preview', 4),
  ('Concert', 4999, 'Energetic live-event coverage for concerts, gigs and performances.', '100 edited photos, online gallery, low-light editing', 5),
  ('Extended Coverage', 6999, 'Full-day or multi-part coverage for large events and long schedules.', '150 edited photos, online gallery, priority delivery', 6)
) AS v(name, price, description, deliverables, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM packages p WHERE p.name = v.name);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  category text NOT NULL,
  event_title text NOT NULL DEFAULT '',
  event_date date,
  image_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_items_sort_idx ON portfolio_items (sort_order, created_at);

ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON portfolio_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON portfolio_items TO authenticated;

DROP POLICY IF EXISTS "public_read_portfolio" ON portfolio_items;
CREATE POLICY "public_read_portfolio" ON portfolio_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_portfolio" ON portfolio_items;
CREATE POLICY "admin_insert_portfolio" ON portfolio_items FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_portfolio" ON portfolio_items;
CREATE POLICY "admin_update_portfolio" ON portfolio_items FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_portfolio" ON portfolio_items;
CREATE POLICY "admin_delete_portfolio" ON portfolio_items FOR DELETE
  TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date date NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON blocked_dates TO authenticated;

DROP POLICY IF EXISTS "admin_read_blocked_dates" ON blocked_dates;
CREATE POLICY "admin_read_blocked_dates" ON blocked_dates FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_insert_blocked_dates" ON blocked_dates;
CREATE POLICY "admin_insert_blocked_dates" ON blocked_dates FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_blocked_dates" ON blocked_dates;
CREATE POLICY "admin_delete_blocked_dates" ON blocked_dates FOR DELETE
  TO authenticated USING (public.is_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('portfolio', 'portfolio', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('site-media', 'site-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('payment-proofs', 'payment-proofs', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public_read_media_buckets" ON storage.objects;
CREATE POLICY "public_read_media_buckets" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id IN ('portfolio', 'site-media'));

DROP POLICY IF EXISTS "admin_insert_media_buckets" ON storage.objects;
CREATE POLICY "admin_insert_media_buckets" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id IN ('portfolio', 'site-media') AND public.is_admin());

DROP POLICY IF EXISTS "admin_update_media_buckets" ON storage.objects;
CREATE POLICY "admin_update_media_buckets" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id IN ('portfolio', 'site-media') AND public.is_admin())
  WITH CHECK (bucket_id IN ('portfolio', 'site-media') AND public.is_admin());

DROP POLICY IF EXISTS "admin_delete_media_buckets" ON storage.objects;
CREATE POLICY "admin_delete_media_buckets" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id IN ('portfolio', 'site-media') AND public.is_admin());

DROP POLICY IF EXISTS "customer_upload_payment_proofs" ON storage.objects;
CREATE POLICY "customer_upload_payment_proofs" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "admin_read_payment_proofs" ON storage.objects;
CREATE POLICY "admin_read_payment_proofs" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'payment-proofs' AND public.is_admin());

DROP POLICY IF EXISTS "admin_delete_payment_proofs" ON storage.objects;
CREATE POLICY "admin_delete_payment_proofs" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'payment-proofs' AND public.is_admin());
