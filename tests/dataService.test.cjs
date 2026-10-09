const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
function setup() {
  const store = new Map();
  const context = { localStorage: { getItem: k => store.get(k) || null, setItem: (k, v) => store.set(k, v) }, crypto: webcrypto, getSupabaseClient: () => null, isSupabaseConfigured: () => false };
  vm.createContext(context);
  const source = fs.readFileSync('src/services/dataService.js', 'utf8').replace(/^import[^\n]+\n/, '').replace('export const dataService =', 'globalThis.dataService =');
  vm.runInContext(source, context);
  return { service: context.dataService, context, store };
}
test('given and pending amounts survive updates; Due-only entries and clearing work', async () => {
  const { service } = setup();
  const id = (await service.getDrivers())[0].id;
  const get = async () => (await service.getMonthlyRecords(id, 2026, 10)).find(r => r.date === '2026-10-09');
  await service.saveDailyRecord(id, '2026-10-09', 800, 150);
  assert.equal((await get()).amount, 800);
  assert.equal((await get()).pending_amount, 150);
  await service.saveDailyRecord(id, '2026-10-09', 0, 200);
  assert.equal((await get()).amount, 0);
  assert.equal((await get()).pending_amount, 200);
  await assert.rejects(() => service.saveDailyRecord(id, '2026-10-09', 800, -1));
  await assert.rejects(() => service.saveDailyRecord(id, '2026-10-09', Infinity, 0));
  await service.saveDailyRecord(id, '2026-10-09', null, null);
  assert.equal(await get(), undefined);
});
test('cloud access failure never writes to local demo records', async () => {
  const { service, context, store } = setup();
  const before = store.get('dtb_records_v2');
  context.getSupabaseClient = () => ({ from: () => ({ upsert: () => ({ select: () => ({ single: async () => ({ error: new Error('Access denied') }) }) }) }) });
  await assert.rejects(() => service.saveDailyRecord('driver', '2026-10-09', 800, 100), /Access denied/);
  assert.equal(store.get('dtb_records_v2'), before);
});

test('daily notes persist with amounts and alone, and clear with the day', async () => {
  const { service } = setup(); const id = (await service.getDrivers())[0].id;
  const get = async () => (await service.getMonthlyRecords(id, 2026, 10)).find(r => r.date === '2026-10-09');
  await service.saveDailyRecord(id, '2026-10-09', 800, 200, '  Evening trip\nBalance tomorrow  ');
  assert.equal((await get()).notes, 'Evening trip\nBalance tomorrow');
  assert.equal((await get()).amount, 800);
  await service.saveDailyRecord(id, '2026-10-09', null, 0, 'On leave');
  assert.equal((await get()).notes, 'On leave');
  assert.equal((await get()).amount, 0);
  await assert.rejects(() => service.saveDailyRecord(id, '2026-10-09', 800, 0, 'x'.repeat(1001)));
  assert.equal((await get()).notes, 'On leave');
  await service.saveDailyRecord(id, '2026-10-09', null, null, '');
  assert.equal(await get(), undefined);
});

function deletionClient(calls, { deleteError = null, photoError = null } = {}) {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { profile_photo: 'driver/photo.jpg', aadhaar_photos: ['driver/aadhaar.jpg'], license_photos: [] } }) }) }),
      delete: () => ({ eq: (_field, id) => ({ select: () => ({ single: async () => { calls.push(['delete', id]); return { data: deleteError ? null : { id }, error: deleteError }; } }) }) }),
    }),
    storage: { from: () => ({ remove: async paths => { calls.push(['photos', Array.from(paths)]); return { error: photoError }; } }) },
  };
}
test('a rejected driver deletion preserves photos and never modifies demo storage', async () => {
  const { service, context, store } = setup();
  const calls = [], before = store.get('dtb_drivers_v2');
  context.getSupabaseClient = () => deletionClient(calls, { deleteError: { code: '23503' } });
  await assert.rejects(() => service.deleteDriver('driver'));
  assert.deepEqual(calls, [['delete', 'driver']]);
  assert.equal(store.get('dtb_drivers_v2'), before);
});
test('successful deletion removes all linked photos only after the database succeeds', async () => {
  const { service, context } = setup(); const calls = [];
  context.getSupabaseClient = () => deletionClient(calls);
  await service.deleteDriver('driver');
  assert.deepEqual(calls, [['delete', 'driver'], ['photos', ['driver/photo.jpg', 'driver/aadhaar.jpg']]]);
});
test('photo cleanup failure reports partial cleanup rather than claiming deletion failed', async () => {
  const { service, context } = setup(); const calls = [];
  context.getSupabaseClient = () => deletionClient(calls, { photoError: new Error('Storage unavailable') });
  const result = await service.deleteDriver('driver');
  assert.match(result.warning, /Driver and records deleted/);
});
test('demo deletion clears only the selected driver and their records', async () => {
  const { service } = setup(); const drivers = await service.getDrivers();
  await service.saveDailyRecord(drivers[1].id, '2026-10-09', 800, 200);
  await service.deleteDriver(drivers[0].id);
  assert.equal((await service.getDrivers()).some(d => d.id === drivers[0].id), false);
  assert.equal((await service.getMonthlyRecords(drivers[0].id, 2026, 10)).length, 0);
  assert.equal((await service.getMonthlyRecords(drivers[1].id, 2026, 10)).length, 1);
});
