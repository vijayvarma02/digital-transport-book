const encoder = new TextEncoder();
async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}
async function equalSecret(candidate, secret) {
  const [left, right] = await Promise.all([digest(candidate), digest(secret)]);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}
async function internalIdentity(secret, serviceKey) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(serviceKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`register-owner:${secret}`)));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function createLoginHandler({ env, createClient }) {
  return async request => {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, traceparent, tracestate, baggage',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store',
    };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply(405, { error: 'Use POST.' });
    const secret = env('REGISTER_PASSCODE');
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    const url = env('SUPABASE_URL');
    const anonKey = env('SUPABASE_ANON_KEY');
    if (!secret || secret.length < 8 || secret.length > 256 || !serviceKey || !url || !anonKey) return reply(503, { error: 'Passcode login has not been configured.' });
    try {
      // Bound the actual streamed body, including requests without Content-Length.
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: 'Enter your passcode.' });
      const chunks = []; let length = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 2048) { await reader.cancel(); return reply(413, { error: 'Request too large.' }); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      let body;
      try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply(400, { error: 'Invalid request.' }); }
      if (typeof body?.passcode !== 'string' || !body.passcode || body.passcode.length > 256) return reply(400, { error: 'Enter your passcode.' });
      const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      // A shared persistent limit cannot be bypassed by changing browser storage,
      // spawning new function instances or supplying fake IP headers.
      const { data: allowed, error: limitError } = await admin.rpc('take_register_login_attempt');
      if (limitError) return reply(503, { error: 'Passcode login setup is incomplete.' });
      if (!allowed) return reply(429, { error: 'Too many login attempts. Please try again in 10 minutes.' });
      if (!await equalSecret(body.passcode, secret)) return reply(401, { error: 'Incorrect passcode.' });

      // Supabase Auth supplies a real session so existing RLS and private Storage
      // remain enforced. This internal identity requires no user email or inbox.
      const identity = await internalIdentity(secret, serviceKey);
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: `register-${identity}@driver-register.invalid` });
      if (linkError || !link?.user?.id || !link?.properties?.hashed_token) throw new Error('Could not generate session');
      const { error: metadataError } = await admin.auth.admin.updateUserById(link.user.id, {
        app_metadata: { ...link.user.app_metadata, register_admin: true, register_passcode_login: true },
      });
      if (metadataError) throw metadataError;
      const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await auth.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'email' });
      if (error || !data?.session) throw new Error('Could not verify session');
      return reply(200, { access_token: data.session.access_token, refresh_token: data.session.refresh_token });
    } catch {
      // Do not return provider responses, tokens, generated links or secrets.
      return reply(503, { error: 'Could not open the register. Please try again.' });
    }
  };
}
