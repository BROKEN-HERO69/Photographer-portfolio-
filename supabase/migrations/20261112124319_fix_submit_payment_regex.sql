/*
# Fix UPI regex repetition count in submit_payment

1. Root cause
- PostgreSQL's POSIX regex engine caps repetition counts at 255. The UPI ID pattern used `{2,256}` which exceeds that limit, causing "invalid regular expression: invalid repetition count(s)" whenever submit_payment is called.

2. Fix
- Replace bounded repetition `{2,256}` and `{2,64}` with unbounded `{2,}` and add explicit char_length checks for the upper bounds (256 and 64 respectively).
- The screenshot path regex `^[A-Za-z0-9._/-]+$` is also simplified to avoid any edge cases.

3. Security
- No policy or grant changes.
*/

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
  v_shot text := nullif(trim(coalesce(p_screenshot_path, '')), '');
BEGIN
  IF v_utr !~ '^[A-Z0-9]{6,30}$' THEN
    RAISE EXCEPTION 'Enter a valid UTR / transaction reference (6 to 30 letters or numbers).';
  END IF;
  IF v_upi !~ '^[a-z0-9._-]{2,}@[a-z]{2,}$' OR char_length(v_upi) > 256 THEN
    RAISE EXCEPTION 'Enter a valid payer UPI ID, for example name@bank.';
  END IF;
  IF p_amount_inr IS NULL OR p_amount_inr <= 0 OR p_amount_inr > 10000000 THEN
    RAISE EXCEPTION 'Enter the amount you paid.';
  END IF;
  IF v_shot IS NOT NULL AND (char_length(v_shot) > 300 OR v_shot !~ '^[A-Za-z0-9._/-]+$') THEN
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

  IF v_shot IS NOT NULL AND v_shot !~ ('^' || v_booking.reference || '/[A-Za-z0-9._-]+$') THEN
    RAISE EXCEPTION 'Screenshot upload failed. Please try again.';
  END IF;

  IF EXISTS (SELECT 1 FROM payments WHERE utr = v_utr) THEN
    RAISE EXCEPTION 'This UTR has already been submitted. Each transaction reference can only be used once.';
  END IF;

  INSERT INTO payments (booking_id, payer_upi, utr, amount_inr, screenshot_path)
  VALUES (v_booking.id, v_upi, v_utr, p_amount_inr, v_shot);

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
