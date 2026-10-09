const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

function setup({ updateError, cleanupThrows } = {}) {
  const uploads = [], removals = [], updates = [], cached = [];
  const thumbnail = { type: 'image/webp', size: 20000 };
  const client = {
    storage: { from: () => ({
      upload: async (path, file, options) => { uploads.push({ path, file, options }); return {}; },
      remove: async paths => { removals.push(Array.from(paths)); if (cleanupThrows) throw new Error('Storage unavailable'); return {}; },
    }) },
    from: () => ({ update: fields => { updates.push(fields); return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'driver', name: 'Driver', ...fields }, error: updateError }) }) }) }; } }),
  };
  const context = {
    getSupabaseClient: () => client,
    createSignedUrlCache: () => ({ get: () => Promise.resolve(null), peek: () => null, forget: () => {}, clear: () => {} }),
    registerCacheReset: () => {}, cacheGeneration: () => 0,
    driverCache: { upsert: (_client, driver) => cached.push(driver) },
    createProfileThumbnail: async () => thumbnail,
    crypto: webcrypto, Map, fetch: () => { throw new Error('Unexpected fetch'); },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/services/fileService.js', 'utf8').replace(/^import[^\n]+\n/gm, '').replaceAll('export ', ''), context);
  return { context, uploads, removals, updates, cached, thumbnail };
}
const original = { type: 'image/jpeg', size: 4000000 };
const driver = { id: 'driver', name: 'Driver', profile_photo: 'old.jpg', profile_thumbnail: 'old.thumb.webp' };
test('new profile stores a small thumbnail separately while preserving its original', async () => {
  const { context, uploads, updates, removals, cached, thumbnail } = setup();
  const result = await context.uploadDriverFiles(driver, 'profile_photo', [original]);
  assert.equal(uploads.length, 2); assert.equal(uploads[0].file, original); assert.equal(uploads[1].file, thumbnail);
  assert.equal(result.profile_photo, uploads[0].path); assert.equal(result.profile_thumbnail, uploads[1].path);
  assert.equal(updates[0].profile_thumbnail, uploads[1].path);
  assert.deepEqual(removals, [['old.jpg', 'old.thumb.webp']]); assert.equal(cached[0].profile_thumbnail, uploads[1].path);
});
test('database failure cleans both new files and preserves the original pair', async () => {
  const { context, uploads, removals } = setup({ updateError: new Error('Denied') });
  await assert.rejects(() => context.uploadDriverFiles(driver, 'profile_photo', [original]), /Denied/);
  assert.deepEqual(removals, [uploads.map(upload => upload.path)]);
  assert.equal(removals[0].includes('old.jpg'), false);
});
test('cleanup failure after commit never deletes the newly saved photo or thumbnail', async () => {
  const { context, uploads, removals } = setup({ cleanupThrows: true });
  const result = await context.uploadDriverFiles(driver, 'profile_photo', [original]);
  assert.equal(result.profile_photo, uploads[0].path);
  assert.deepEqual(removals, [['old.jpg', 'old.thumb.webp']]);
});
test('document uploads retain original resolution and do not create profile thumbnails', async () => {
  const { context, uploads, updates } = setup();
  await context.uploadDriverFiles({ id: 'driver', name: 'Driver', aadhaar_photos: [] }, 'aadhaar_photos', [original]);
  assert.equal(uploads.length, 1); assert.equal(uploads[0].file, original);
  assert.equal(updates[0].profile_thumbnail, undefined);
});
