const { test } = require('node:test');
const assert = require('node:assert/strict');

function mockStorage(calls, response) {
  return { storage: { from: bucket => ({ createSignedUrls: async (paths, expiry) => {
    calls.push({ bucket, paths: [...paths], expiry });
    return response ? response(paths) : { data: paths.map(path => ({ path, signedUrl: `https://private.example/${path}?batch=${calls.length}` })) };
  } }) } };
}

test('100 visible photos use two batches; duplicate images and return visits reuse links', async () => {
  const { createSignedUrlCache } = await import('../src/services/signedUrlCache.js');
  const calls = [], client = mockStorage(calls);
  const cache = createSignedUrlCache({ getClient: () => client, batchDelay: 0 });
  const paths = Array.from({ length: 100 }, (_, i) => `driver-${i}.webp`);
  const results = await Promise.all([...paths.map(path => cache.get(path)), cache.get(paths[0])]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].paths.length, 50);
  assert.equal(results[0], results[100]);
  await Promise.all(paths.map(path => cache.get(path)));
  assert.equal(calls.length, 2);
  assert.equal(cache.peek(paths[0]), results[0]);
  cache.clear();
});
test('expired links refresh together and links cannot cross projects or login resets', async () => {
  const { createSignedUrlCache } = await import('../src/services/signedUrlCache.js');
  let time = 0; const calls = [];
  let client = mockStorage(calls);
  const cache = createSignedUrlCache({ getClient: () => client, now: () => time, batchDelay: 0 });
  const first = await cache.get('photo');
  time = 269999; assert.equal(await cache.get('photo'), first);
  time = 270001; assert.equal(cache.peek('photo'), null);
  await cache.get('photo'); assert.equal(calls.length, 2);
  client = mockStorage(calls); assert.equal(cache.peek('photo'), null);
  await cache.get('photo'); assert.equal(calls.length, 3);
  cache.clear(); assert.equal(cache.peek('photo'), null);
  await cache.get('photo'); assert.equal(calls.length, 4);
  cache.clear();
});
test('partial signing errors do not prevent other images loading and can be retried', async () => {
  const { createSignedUrlCache } = await import('../src/services/signedUrlCache.js');
  const calls = [], client = mockStorage(calls, paths => ({ data: paths.reverse().map(path => path === 'missing' ? { path, error: 'not found' } : { path, signedUrl: `url:${path}` }) }));
  const cache = createSignedUrlCache({ getClient: () => client, batchDelay: 0 });
  const results = await Promise.allSettled([cache.get('first'), cache.get('missing'), cache.get('last')]);
  assert.equal(results[0].value, 'url:first'); assert.equal(results[1].status, 'rejected'); assert.equal(results[2].value, 'url:last');
  await assert.rejects(cache.get('missing')); assert.equal(calls.length, 2);
  cache.clear();
});
test('logout rejects pending photo requests and late responses never repopulate the cache', async () => {
  const { createSignedUrlCache } = await import('../src/services/signedUrlCache.js');
  let complete;
  const client = mockStorage([], () => new Promise(resolve => { complete = resolve; }));
  const cache = createSignedUrlCache({ getClient: () => client, batchDelay: 0 });
  const result = Promise.allSettled([cache.get('private')]);
  await new Promise(resolve => setTimeout(resolve, 5));
  cache.clear(); complete({ data: [{ path: 'private', signedUrl: 'old-session-url' }] });
  assert.equal((await result)[0].status, 'rejected');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(cache.peek('private'), null);
});
test('driver list return visits reuse data, share pending loads and update after edits/deletion', async () => {
  const { createDriverCache } = await import('../src/services/driverCache.js');
  let time = 0, calls = 0;
  const cache = createDriverCache(() => time), client = {};
  const fetchDrivers = async () => { calls++; return [{ id: 'a', name: 'Alice' }]; };
  await Promise.all([cache.load(client, fetchDrivers), cache.load(client, fetchDrivers)]);
  await cache.load(client, fetchDrivers); assert.equal(calls, 1);
  cache.upsert(client, { id: 'a', name: 'Alice', profile_thumbnail: 'small.webp' });
  assert.equal((await cache.load(client, fetchDrivers))[0].profile_thumbnail, 'small.webp');
  cache.upsert(client, { id: 'b', name: 'Bob' }); cache.remove(client, 'a');
  assert.equal(cache.read(client)[0].id, 'b');
  time = 120001; assert.equal(cache.read(client), null); assert.equal(cache.read(client, true)[0].id, 'b');
  await cache.load(client, fetchDrivers); assert.equal(calls, 2);
  cache.clear(); assert.equal(cache.read(client, true), null);
  await cache.load(client, fetchDrivers); assert.equal(calls, 3);
});
test('late list refreshes cannot restore a deleted driver, and failed refresh retains current data', async () => {
  const { createDriverCache } = await import('../src/services/driverCache.js');
  const cache = createDriverCache(), client = {};
  await cache.load(client, async () => [{ id: 'a', name: 'Alice' }]);
  let finish;
  const refresh = cache.load(client, () => new Promise(resolve => { finish = resolve; }), true);
  await Promise.resolve(); cache.remove(client, 'a'); finish([{ id: 'a', name: 'Alice' }]);
  assert.deepEqual(await refresh, []); assert.deepEqual(cache.read(client), []);
  await assert.rejects(cache.load(client, async () => { throw new Error('Offline'); }, true));
  assert.deepEqual(cache.read(client, true), []);
});
