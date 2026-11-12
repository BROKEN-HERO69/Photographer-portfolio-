/*
# Seed Shasank's social links

1. Modified tables
- `site_settings` (single row, id = 1): sets `instagram_url` and `pinterest_url` to the links provided by the photographer.

2. Security
- No policy or grant changes. Existing admin-only write rules still apply.

3. Notes
- Only the two social URLs are seeded. Contact email, phone and UPI details are left for the photographer to enter in the dashboard.
*/

UPDATE site_settings
SET instagram_url = 'https://www.instagram.com/_shkk15_?rpxt=cXF3N2F6dTY2djEz',
    pinterest_url = 'https://pin.it/6wJHOujLa',
    updated_at = now()
WHERE id = 1;
