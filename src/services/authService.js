import { getSupabaseClient } from '../lib/supabase';

export async function loginWithPasscode(passcode) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Connect Supabase to enable passcode login.');
  const { data, error } = await client.functions.invoke('register-login', { body: { passcode } });
  if (error) {
    let message = 'Could not reach passcode login. Check that register-login is deployed in the configured Supabase project.';
    if (error.context?.status === 404) {
      throw new Error('The register-login Edge Function is missing. Deploy it in the Supabase project used by this app.');
    }
    if (error.context?.json) {
      try { const body = await error.context.json(); if (typeof body.error === 'string') message = body.error; } catch { /* Use the connection error message. */ }
    }
    throw new Error(message);
  }
  if (!data?.access_token || !data?.refresh_token) throw new Error('The login service did not return a session.');
  const { error: sessionError } = await client.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
  if (sessionError) throw new Error('Could not start your session. Please try again.');
}

export function isRegisterSession(session) {
  return session?.user?.app_metadata?.register_passcode_login === true;
}
