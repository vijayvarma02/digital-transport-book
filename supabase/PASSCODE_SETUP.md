# Passcode-only login

The app asks only for the reusable passcode. The Edge Function compares it with
`REGISTER_PASSCODE` in Supabase secrets and returns a Supabase Auth session.
An internal Auth identity is created automatically; it requires no email address,
inbox, email delivery or manually created owner account. Its generated identifier
is an implementation detail and never appears in the app login flow.

## One-time setup in Supabase

1. Open **SQL Editor**. For an existing app, run `profile-upgrade.sql` if it has not
   been applied. Then run `passcode-login.sql`. A new project needs `schema.sql`
   before those two files.
2. Open **Edge Functions → Secrets**. Add `REGISTER_PASSCODE`, with your chosen
   passcode of 8–256 characters. Keep it private. The standard Supabase URL,
   anon key and service-role key are supplied to the function by Supabase.
3. Deploy the function named `register-login`. With the Supabase CLI from this
   repository, after logging in and linking your project:

   ```sh
   supabase functions deploy register-login --no-verify-jwt
   ```

   For the dashboard editor, create a function named exactly **register-login**,
   replace its default code with the entire contents of
   `supabase/register-login.dashboard.ts`, turn off **Verify JWT**, then deploy.
   This prepared file includes the handler, so no extra files need to be added.
   It must accept callers who have not logged in; the function itself verifies
   the passcode. Regenerate the dashboard file after edits with
   `node scripts/package-login-function.cjs`.
4. Rebuild/redeploy the frontend. It still needs only `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`. Remove `VITE_REGISTER_LOGIN_EMAIL` if previously set.
5. Enter the secret you chose on the app's passcode screen.

The passcode is not set by this repository and no default is provided. For local
Edge development, use a git-ignored secrets file with `REGISTER_PASSCODE` and
`supabase functions serve register-login --env-file PATH --no-verify-jwt`.

## Access and limits

- Database and private Storage access require the function's
  `register_passcode_login` metadata claim. A frontend unlock flag grants nothing.
- `private.register_login_limit` is one small security table, not a new driver or
  document table. It atomically caps login attempts at 20 per 10-minute window
  across the whole register, including successful logins. A blocked window does
  not extend when more requests arrive. Only the server can use its RPC.
- The passcode, generated login link and service-role key never go to the browser.
  The browser receives only session credentials, keeps them in session storage,
  and refreshes them through Supabase Auth. Log out when finished on a shared phone.
- Changing `REGISTER_PASSCODE` prevents new logins with the old code. Existing
  sessions remain valid until revoked/expired; for a compromised passcode, revoke
  the old internal Auth user's sessions and remove its access metadata. Existing
  access tokens can persist until expiry. Five-minute photo links can also remain
  valid until they expire.
- Local demo mode remains explicitly labelled and cannot upload identity photos.

## Verification after deployment

Try a wrong code (it must fail), then the correct code. Add/update an amount and
Due, upload/view a photo, then log out. In a fresh browser session, records and
uploads must be unavailable until login. Unauthenticated database/storage API
requests must also be denied. The SQL migration and a deployed function are both
required; deploying the frontend alone is insufficient.

Official references: [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets),
[function configuration](https://supabase.com/docs/guides/functions/function-configuration),
[admin-generated links](https://supabase.com/docs/reference/javascript/auth-admin-generatelink).

## 404 or CORS errors

A `404 NOT_FOUND` at `/functions/v1/register-login` means the function does not
exist in the project the app is calling. SQL migrations and secrets do not deploy
the function. Check the exact name and project, then deploy using the steps above.
If it exists but reports `NOT_FOUND_FUNCTION_BLOB`, redeploy its bundle. After
deployment, an OPTIONS request must return 204 with CORS headers. The handler
includes the tracing headers used by current Supabase clients. If the browser
calls a different project than your `.env`, clear any previously saved Supabase
URL/key override in the app's browser storage and reload.
