/*
# Tighten admin_users table grants to least privilege

1. Root cause
- The admin_users table was granted SELECT, INSERT, UPDATE, DELETE to both anon and authenticated, but only has a SELECT policy for authenticated. The excess grants are harmless under RLS (no policies allow the writes), but they violate least-privilege and could become a problem if a policy is added later without revisiting grants.

2. Fix
- Revoke INSERT, UPDATE, DELETE from anon on admin_users.
- Revoke INSERT, UPDATE, DELETE from authenticated on admin_users (writes go through claim_first_admin, a SECURITY DEFINER function).
- Keep SELECT for authenticated (the is_admin check reads this table).

3. Security
- No policy changes. RLS remains enabled.
*/

REVOKE INSERT, UPDATE, DELETE ON admin_users FROM anon;
REVOKE INSERT, UPDATE, DELETE ON admin_users FROM authenticated;
