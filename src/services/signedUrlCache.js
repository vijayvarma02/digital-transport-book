// One short batch per visible group, shared across every image component.
// Links stay private and are reused only while safely within their expiry.
export function createSignedUrlCache({ getClient, now = Date.now, batchDelay = 20 }) {
  let states = new WeakMap();
  const activeStates = new Set();
  let generation = 0;
  function stateFor(client) {
    if (!states.has(client)) {
      const state = { client, cache: new Map(), pending: new Map(), queue: new Set(), timer: null };
      states.set(client, state); activeStates.add(state);
    }
    return states.get(client);
  }
  async function flush(state) {
    state.timer = null;
    const paths = [...state.queue]; state.queue.clear();
    const currentGeneration = generation;
    for (let offset = 0; offset < paths.length; offset += 50) {
      const batch = paths.slice(offset, offset + 50);
      const issuedAt = now();
      try {
        if (currentGeneration !== generation) throw new Error('Login session changed.');
        const { data, error } = await state.client.storage.from('driver-files').createSignedUrls(batch, 300);
        if (error) throw error;
        if (currentGeneration !== generation) throw new Error('Login session changed.');
        const byPath = new Map((data || []).map(item => [item.path, item]));
        for (const path of batch) {
          const item = byPath.get(path), pending = state.pending.get(path);
          if (item?.signedUrl && !item.error) {
            state.cache.set(path, { url: item.signedUrl, expires: issuedAt + 270000 });
            pending?.resolve(item.signedUrl);
          } else pending?.reject(new Error('Could not load this private image.'));
          state.pending.delete(path);
        }
      } catch (error) {
        batch.forEach(path => { state.pending.get(path)?.reject(error); state.pending.delete(path); });
      }
    }
  }
  return {
    peek(path) {
      const client = getClient();
      const item = client && states.get(client)?.cache.get(path);
      return item && item.expires > now() ? item.url : null;
    },
    get(path) {
      if (!path) return Promise.resolve(null);
      const client = getClient();
      if (!client) return Promise.resolve(null);
      const state = stateFor(client), cached = state.cache.get(path);
      if (cached && cached.expires > now()) return Promise.resolve(cached.url);
      if (state.pending.has(path)) return state.pending.get(path).promise;
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      state.pending.set(path, { promise, resolve, reject }); state.queue.add(path);
      if (!state.timer) state.timer = setTimeout(() => flush(state), batchDelay);
      return promise;
    },
    forget(path) {
      for (const state of activeStates) state.cache.delete(path);
    },
    clear() {
      generation++;
      for (const state of activeStates) {
        clearTimeout(state.timer);
        state.pending.forEach(item => item.reject(new Error('Login session changed.')));
        state.pending.clear(); state.queue.clear(); state.cache.clear();
      }
      states = new WeakMap(); activeStates.clear();
    },
  };
}
