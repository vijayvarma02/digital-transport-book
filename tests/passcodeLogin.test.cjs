const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

async function setup(overrides = {}) {
  const { createLoginHandler } = await import('../supabase/functions/register-login/handler.js');
  const calls = [];
  const admin = {
    rpc: async () => ({ data: true, error: null }),
    auth: { admin: {
      generateLink: async params => { calls.push(['link', params]); return { data: { user: { id: 'owner', app_metadata: {} }, properties: { hashed_token: 'private-otp' } } }; },
      updateUserById: async (id, values) => { calls.push(['metadata', id, values]); return { error: null }; },
    } },
  };
  const auth = { auth: { verifyOtp: async params => { calls.push(['verify', params]); return { data: { session: { access_token: 'access', refresh_token: 'refresh' } } }; } } };
  if (overrides.rpc) admin.rpc = overrides.rpc;
  if (overrides.generateLink) admin.auth.admin.generateLink = overrides.generateLink;
  if (overrides.updateUserById) admin.auth.admin.updateUserById = overrides.updateUserById;
  const values = { REGISTER_PASSCODE: 'chosen-secret', SUPABASE_SERVICE_ROLE_KEY: 'service-secret', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon', ...overrides.env };
  return { calls, handler: createLoginHandler({ env: key => values[key], createClient: (_url, key) => key === 'service-secret' ? admin : auth }) };
}
function request(passcode) { return new Request('https://example.supabase.co/functions/v1/register-login', { method: 'POST', body: JSON.stringify({ passcode }) }); }

test('wrong code returns no session and never provisions an owner', async () => {
  const { handler, calls } = await setup();
  const response = await handler(request('wrong-code'));
  assert.equal(response.status, 401); assert.equal(calls.length, 0);
  assert.deepEqual(await response.json(), { error: 'Incorrect passcode.' });
});
test('correct code grants metadata before issuing only real session credentials', async () => {
  const { handler, calls } = await setup();
  const response = await handler(request('chosen-secret'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { access_token: 'access', refresh_token: 'refresh' });
  assert.deepEqual(calls.map(c => c[0]), ['link', 'metadata', 'verify']);
  assert.equal(calls[1][2].app_metadata.register_passcode_login, true);
  assert.equal(JSON.stringify(calls).includes('chosen-secret'), false);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
test('rate limit and unavailable limiter both deny login before authentication', async () => {
  for (const [result, status] of [[{ data: false }, 429], [{ error: new Error('database unavailable') }, 503]]) {
    const { handler, calls } = await setup({ rpc: async () => result });
    assert.equal((await handler(request('chosen-secret'))).status, status);
    assert.equal(calls.length, 0);
  }
});
test('missing configuration, malformed bodies, oversized bodies and unsupported methods fail', async () => {
  const { handler } = await setup();
  assert.equal((await (await setup({ env: { REGISTER_PASSCODE: '' } })).handler(request('chosen-secret'))).status, 503);
  assert.equal((await handler(new Request('https://example.com', { method: 'POST', body: '{' }))).status, 400);
  assert.equal((await handler(request('x'.repeat(3000)))).status, 413);
  assert.equal((await handler(new Request('https://example.com'))).status, 405);
  assert.equal((await handler(new Request('https://example.com', { method: 'OPTIONS' }))).status, 204);
});
test('provider errors are sanitized and metadata failure cannot issue a session', async () => {
  const { handler, calls } = await setup({ updateUserById: async () => ({ error: new Error('service-secret') }) });
  const response = await handler(request('chosen-secret'));
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('service-secret'), false);
  assert.equal(calls.some(call => call[0] === 'verify'), false);
});
function frontend(client) {
  const context = { getSupabaseClient: () => client };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/services/authService.js', 'utf8').replace(/^import[^\n]+\n/, '').replaceAll('export ', ''), context);
  return context;
}
test('frontend installs returned tokens and reports passcode errors', async () => {
  let tokens;
  const client = { functions: { invoke: async () => ({ data: { access_token: 'access', refresh_token: 'refresh' } }) }, auth: { setSession: async session => { tokens = session; return {}; } } };
  await frontend(client).loginWithPasscode('code');
  assert.equal(tokens.access_token, 'access');
  client.functions.invoke = async () => ({ error: { context: { json: async () => ({ error: 'Incorrect passcode.' }) } } });
  await assert.rejects(() => frontend(client).loginWithPasscode('wrong'), /Incorrect passcode/);
  assert.equal(frontend(client).isRegisterSession({ user: { app_metadata: { register_admin: true } } }), false);
  assert.equal(frontend(client).isRegisterSession({ user: { app_metadata: { register_passcode_login: true } } }), true);
});
