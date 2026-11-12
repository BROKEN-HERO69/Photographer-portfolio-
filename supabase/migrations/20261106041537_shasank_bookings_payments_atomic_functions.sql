/*
# Bookings, manual UPI payments and atomic booking operations

1. New Tables
- `bookings`: one row per photography request. Holds the chosen package (name and price copied at request time), event date, customer contact details, event name, venue, details, booking status and payment status.
- `payments`: one row per payment submission made by a customer (payer UPI ID, UTR reference, amount, optional screenshot). Each UTR can only be used once.

2. Booking statuses
- pending, confirmed, rejected, cancelled, completed.
- Pending requests do NOT reserve a date. Only confirmed and completed bookings occupy a date.

3. Payment statuses (kept separate from booking statuses)
- not_required, payment_pending, verification_pending, verified, rejected, refunded.

4. Functions (the only way the app writes bookings and payments)
- `create_booking`: validates input, checks the date is free and not blocked, and creates a pending request.
- `get_unavailable_dates`: returns only the dates that are confirmed, completed or blocked, so the public calendar never sees customer details.
- `submit_payment`: validates the UTR and UPI ID, rejects duplicate UTRs, stores the payment for manual verification.
- `admin_set_booking_status`: approves, rejects, cancels or completes a booking. Approval re-checks the date inside a transaction.
- `admin_reschedule_booking`: moves a booking to a new date with the same availability checks.
- `admin_review_payment`: marks a payment as verified or rejected after the admin checks the real bank transaction.

5. Security
- Row level security is enabled on both tables. Customers have no direct table access; they use the functions above.
- Admin users can read bookings and payments. All admin changes go through functions that check `is_admin()`.
- A partial unique index allows only one confirmed or completed booking per calendar day across all services.

6. Important notes
- Screenshots are never trusted alone: they are stored privately and the admin verifies the UTR against the real transaction.
- Migration is idempotent where possible and safe to re-run.
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('SP-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  package_name text NOT NULL,
  package_price_inr integer NOT NULL CHECK (package_price_inr >= 0),
  event_date date NOT NULL,
  customer_name text NOT NULL CHECK (char_length(customer_name) BETWEEN 2 AND 100),
  customer_phone text NOT NULL CHECK (char_length(customer_phone) BETWEEN 7 AND 20),
  customer_email text NOT NULL CHECK (char_length(customer_email) BETWEEN 5 AND 254),
  event_name text NOT NULL CHECK (char_length(event_name) BETWEEN 2 AND 150),
  venue text NOT NULL CHECK (char_length(venue) BETWEEN 2 AND 250),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  payment_status text NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required', 'payment_pending', 'verification_pending', 'verified', 'rejected', 'refunded')),
  advance_amount_inr integer NOT NULL DEFAULT 0 CHECK (advance_amount_inr >= 0),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_occupying_booking_per_day
  ON bookings (event_date) WHERE status IN ('confirmed', 'completed');

CREATE INDEX IF NOT EXISTS bookings_event_date_idx ON bookings (event_date);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status, created_at DESC);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON bookings TO authenticated;

DROP POLICY IF EXISTS "admin_read_bookings" ON bookings;
CREATE POLICY "admin_read_bookings" ON bookings FOR SELECT
  TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payer_upi text NOT NULL CHECK (char_length(payer_upi) BETWEEN 3 AND 256),
  utr text NOT NULL UNIQUE CHECK (utr ~ '^[A-Z0-9]{6,30}$'),
  amount_inr integer NOT NULL CHECK (amount_inr > 0),
  screenshot_path text,
  status text NOT NULL DEFAULT 'verification_pending' CHECK (status IN ('verification_pending', 'verified', 'rejected')),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS payments_booking_idx ON payments (booking_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status, created_at DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON payments TO authenticated;

DROP POLICY IF EXISTS "admin_read_payments" ON payments;
CREATE POLICY "admin_read_payments" ON payments FOR SELECT
  TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.create_booking(
  p_package_id uuid,
  p_event_date date,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_event_name text,
  p_venue text,
  p_details text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg packages%ROWTYPE;
  v_settings site_settings%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_name text := trim(coalesce(p_customer_name, ''));
  v_phone text := trim(coalesce(p_customer_phone, ''));
  v_email text := lower(trim(coalesce(p_customer_email, '')));
  v_event text := trim(coalesce(p_event_name, ''));
  v_venue text := trim(coalesce(p_venue, ''));
  v_details text := trim(coalesce(p_details, ''));
  v_payment_status text;
  v_advance integer := 0;
  v_row bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_pkg FROM packages WHERE id = p_package_id AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Please choose one of the available packages.';
  END IF;

  IF p_event_date IS NULL OR p_event_date < v_today THEN
    RAISE EXCEPTION 'Please choose today or a future date.';
  END IF;
  IF p_event_date > v_today + 730 THEN
    RAISE EXCEPTION 'Bookings can be made up to two years in advance.';
  END IF;

  IF char_length(v_name) < 2 OR char_length(v_name) > 100 THEN
    RAISE EXCEPTION 'Please enter your full name.';
  END IF;
  IF length(regexp_replace(v_phone, '\D', '', 'g')) NOT BETWEEN 10 AND 15 OR v_phone !~ '^\+?[0-9 ()-]+$' THEN
    RAISE EXCEPTION 'Please enter a valid phone number.';
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR char_length(v_email) > 254 THEN
    RAISE EXCEPTION 'Please enter a valid email address.';
  END IF;
  IF char_length(v_event) < 2 OR char_length(v_event) > 150 THEN
    RAISE EXCEPTION 'Please enter the event name.';
  END IF;
  IF char_length(v_venue) < 2 OR char_length(v_venue) > 250 THEN
    RAISE EXCEPTION 'Please enter the venue or location.';
  END IF;
  IF char_length(v_details) > 2000 THEN
    RAISE EXCEPTION 'Event details must be under 2000 characters.';
  END IF;

  IF EXISTS (SELECT 1 FROM blocked_dates WHERE block_date = p_event_date) THEN
    RAISE EXCEPTION 'That date is not available. Please choose another date.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE event_date = p_event_date AND status IN ('confirmed', 'completed')
  ) THEN
    RAISE EXCEPTION 'That date is already booked. Please choose another date.';
  END IF;

  SELECT * INTO v_settings FROM site_settings WHERE id = 1;
  IF v_settings.advance_percent > 0 THEN
    v_advance := round(v_pkg.price_inr * v_settings.advance_percent / 100.0)::integer;
    v_payment_status := 'payment_pending';
  ELSE
    v_payment_status := 'not_required';
  END IF;

  INSERT INTO bookings (
    package_id, package_name, package_price_inr, event_date,
    customer_name, customer_phone, customer_email,
    event_name, venue, details, payment_status, advance_amount_inr
  ) VALUES (
    v_pkg.id, v_pkg.name, v_pkg.price_inr, p_event_date,
    v_name, v_phone, v_email,
    v_event, v_venue, v_details, v_payment_status, v_advance
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'reference', v_row.reference,
    'status', v_row.status,
    'payment_status', v_row.payment_status,
    'advance_amount_inr', v_row.advance_amount_inr,
    'event_date', v_row.event_date,
    'package_name', v_row.package_name
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'That date was just booked. Please choose another date.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_booking(uuid, date, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, date, text, text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_unavailable_dates(p_from date, p_to date)
RETURNS SETOF date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 400 THEN
    RAISE EXCEPTION 'Invalid date range.';
  END IF;
  RETURN QUERY
    SELECT b.event_date FROM bookings b
    WHERE b.status IN ('confirmed', 'completed') AND b.event_date BETWEEN p_from AND p_to
    UNION
    SELECT bd.block_date FROM blocked_dates bd
    WHERE bd.block_date BETWEEN p_from AND p_to
    ORDER BY 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_unavailable_dates(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unavailable_dates(date, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_payment(
  p_reference text,
  p_payer_upi text,
  p_utr text,
  p_amount_inr integer,
  p_screenshot_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_utr text := upper(regexp_replace(coalesce(p_utr, ''), '\s', '', 'g'));
  v_upi text := lower(trim(coalesce(p_payer_upi, '')));
BEGIN
  IF v_utr !~ '^[A-Z0-9]{6,30}$' THEN
    RAISE EXCEPTION 'Enter a valid UTR / transaction reference (6 to 30 letters or numbers).';
  END IF;
  IF v_upi !~ '^[a-z0-9._-]{2,256}@[a-z]{2,64}$' THEN
    RAISE EXCEPTION 'Enter a valid payer UPI ID, for example name@bank.';
  END IF;
  IF p_amount_inr IS NULL OR p_amount_inr <= 0 OR p_amount_inr > 10000000 THEN
    RAISE EXCEPTION 'Enter the amount you paid.';
  END IF;
  IF p_screenshot_path IS NOT NULL AND char_length(p_screenshot_path) > 300 THEN
    RAISE EXCEPTION 'Screenshot upload failed. Please try again.';
  END IF;

  SELECT * INTO v_booking FROM bookings
  WHERE reference = upper(trim(coalesce(p_reference, '')))
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'We could not find a booking with that reference.';
  END IF;
  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Payments can only be submitted for an active booking request.';
  END IF;
  IF v_booking.payment_status NOT IN ('payment_pending', 'rejected') THEN
    RAISE EXCEPTION 'No payment is needed right now, or a payment is already being verified.';
  END IF;

  IF EXISTS (SELECT 1 FROM payments WHERE utr = v_utr) THEN
    RAISE EXCEPTION 'This UTR has already been submitted. Each transaction reference can only be used once.';
  END IF;

  INSERT INTO payments (booking_id, payer_upi, utr, amount_inr, screenshot_path)
  VALUES (v_booking.id, v_upi, v_utr, p_amount_inr, nullif(trim(coalesce(p_screenshot_path, '')), ''));

  UPDATE bookings
  SET payment_status = 'verification_pending', updated_at = now()
  WHERE id = v_booking.id;

  RETURN jsonb_build_object('reference', v_booking.reference, 'payment_status', 'verification_pending');
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This UTR has already been submitted. Each transaction reference can only be used once.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_payment(text, text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_payment(text, text, text, integer, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_booking_status(
  p_booking_id uuid,
  p_status text,
  p_admin_note text,
  p_mark_refunded boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b bookings%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'You are not authorized to do that.';
  END IF;

  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  IF p_status NOT IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'Unknown booking status.';
  END IF;

  IF p_status <> v_b.status AND NOT (
    (v_b.status = 'pending' AND p_status IN ('confirmed', 'rejected', 'cancelled'))
    OR (v_b.status = 'confirmed' AND p_status IN ('cancelled', 'completed'))
  ) THEN
    RAISE EXCEPTION 'A % booking cannot be changed to %.', v_b.status, p_status;
  END IF;

  IF p_status = 'confirmed' THEN
    IF EXISTS (
      SELECT 1 FROM bookings
      WHERE event_date = v_b.event_date AND id <> v_b.id AND status IN ('confirmed', 'completed')
    ) THEN
      RAISE EXCEPTION 'Another booking is already confirmed on this date.';
    END IF;
    IF EXISTS (SELECT 1 FROM blocked_dates WHERE block_date = v_b.event_date) THEN
      RAISE EXCEPTION 'This date is blocked. Unblock it before confirming.';
    END IF;
  END IF;

  IF p_mark_refunded THEN
    IF v_b.payment_status <> 'verified' THEN
      RAISE EXCEPTION 'Only a verified payment can be marked as refunded.';
    END IF;
  END IF;

  UPDATE bookings
  SET status = p_status,
      payment_status = CASE WHEN p_mark_refunded THEN 'refunded' ELSE payment_status END,
      admin_note = coalesce(nullif(trim(coalesce(p_admin_note, '')), ''), admin_note),
      updated_at = now()
  WHERE id = v_b.id;

  RETURN jsonb_build_object('id', v_b.id, 'status', p_status, 'event_date', v_b.event_date, 'today', v_today);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Another booking is already confirmed on this date.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_booking_status(uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_booking_status(uuid, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reschedule_booking(p_booking_id uuid, p_new_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b bookings%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'You are not authorized to do that.';
  END IF;
  IF p_new_date IS NULL OR p_new_date < v_today THEN
    RAISE EXCEPTION 'Choose today or a future date for the reschedule.';
  END IF;

  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;
  IF v_b.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Only pending or confirmed bookings can be rescheduled.';
  END IF;

  IF v_b.status = 'confirmed' THEN
    IF EXISTS (SELECT 1 FROM blocked_dates WHERE block_date = p_new_date) THEN
      RAISE EXCEPTION 'The new date is blocked.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM bookings
      WHERE event_date = p_new_date AND id <> v_b.id AND status IN ('confirmed', 'completed')
    ) THEN
      RAISE EXCEPTION 'Another booking is already confirmed on the new date.';
    END IF;
  END IF;

  UPDATE bookings SET event_date = p_new_date, updated_at = now() WHERE id = v_b.id;

  RETURN jsonb_build_object('id', v_b.id, 'event_date', p_new_date);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Another booking is already confirmed on the new date.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reschedule_booking(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reschedule_booking(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_payment(p_payment_id uuid, p_decision text, p_note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p payments%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'You are not authorized to do that.';
  END IF;
  IF p_decision NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Choose verified or rejected.';
  END IF;

  SELECT * INTO v_p FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found.';
  END IF;
  IF v_p.status <> 'verification_pending' THEN
    RAISE EXCEPTION 'This payment has already been reviewed.';
  END IF;

  PERFORM 1 FROM bookings WHERE id = v_p.booking_id FOR UPDATE;

  UPDATE payments
  SET status = p_decision,
      admin_note = coalesce(nullif(trim(coalesce(p_note, '')), ''), admin_note),
      reviewed_at = now()
  WHERE id = v_p.id;

  UPDATE bookings
  SET payment_status = p_decision, updated_at = now()
  WHERE id = v_p.booking_id;

  RETURN jsonb_build_object('id', v_p.id, 'status', p_decision);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_review_payment(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_payment(uuid, text, text) TO authenticated;
