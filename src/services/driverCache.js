import { registerCacheReset } from './sessionCache.js';

export function createDriverCache(now = Date.now) {
  let entries = new WeakMap();
  const entryFor = client => {
    if (!entries.has(client)) entries.set(client, { data: null, expires: 0, pending: null, revision: 0 });
    return entries.get(client);
  };
  return {
    read(client, stale = false) {
      const entry = client && entries.get(client);
      return entry && (stale || entry.expires > now()) ? entry.data : null;
    },
    async load(client, fetchDrivers, force = false) {
      const entry = entryFor(client);
      if (!force && entry.data && entry.expires > now()) return entry.data;
      if (entry.pending) return entry.pending;
      const revision = entry.revision;
      entry.pending = Promise.resolve().then(fetchDrivers).then(data => {
        if (entries.get(client) === entry) {
          if (entry.revision === revision) entry.data = data;
          entry.expires = now() + 120000;
        }
        return entry.data || data;
      }).finally(() => { entry.pending = null; });
      return entry.pending;
    },
    upsert(client, driver) {
      const entry = client && entries.get(client);
      if (!entry?.data) return;
      entry.revision++;
      entry.data = [...entry.data.filter(item => item.id !== driver.id), driver].sort((a, b) => a.name.localeCompare(b.name));
    },
    remove(client, id) {
      const entry = client && entries.get(client);
      if (!entry?.data) return;
      entry.revision++;
      entry.data = entry.data.filter(driver => driver.id !== id);
    },
    clear() { entries = new WeakMap(); },
  };
}
export const driverCache = createDriverCache();
registerCacheReset(() => driverCache.clear());
