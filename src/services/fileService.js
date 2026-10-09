import { getSupabaseClient } from '../lib/supabase';
import { createSignedUrlCache } from './signedUrlCache';
import { registerCacheReset, cacheGeneration } from './sessionCache';
import { driverCache } from './driverCache';
import { createProfileThumbnail } from '../utils/profileThumbnail';
const bucket = 'driver-files';
const imageLinks = createSignedUrlCache({ getClient: getSupabaseClient });
registerCacheReset(() => imageLinks.clear());
export const cachedFileUrl = path => imageLinks.peek(path);
export function validateDriverImages(files) {
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error('Use JPG, PNG or WebP images up to 5 MB each.');
    }
  }
}
export const fileUrl = path => imageLinks.get(path);

// Upgrade older photos gradually, only when their avatar is visible. At most two
// originals are processed at once, and duplicate requests share the same work.
let thumbnailJobs = new Map();
let runningJobs = 0;
const thumbnailQueue = [];
registerCacheReset(() => { thumbnailJobs = new Map(); });
function nextThumbnail() {
  while (runningJobs < 2 && thumbnailQueue.length) {
    const job = thumbnailQueue.shift(); runningJobs++;
    job.work().then(job.resolve, job.reject).finally(() => { runningJobs--; nextThumbnail(); });
  }
}
export function ensureDriverThumbnail(driver) {
  if (driver.profile_thumbnail || !driver.profile_photo) return Promise.resolve(driver);
  const client = getSupabaseClient();
  if (!client) return Promise.resolve(driver);
  const generation = cacheGeneration();
  const key = `${generation}:${driver.id}:${driver.profile_photo}`;
  if (thumbnailJobs.has(key)) return thumbnailJobs.get(key);
  const currentJobs = thumbnailJobs;
  const promise = new Promise((resolve, reject) => {
    thumbnailQueue.push({ resolve, reject, work: async () => {
      const checkSession = () => { if (generation !== cacheGeneration()) throw new Error('Login session changed.'); };
      checkSession();
      const url = await fileUrl(driver.profile_photo);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Could not prepare the existing photo.');
      const thumbnail = await createProfileThumbnail(await response.blob());
      checkSession();
      const path = `${driver.profile_photo}.thumb.webp`;
      const { error: uploadError } = await client.storage.from(bucket).upload(path, thumbnail, { contentType: thumbnail.type, upsert: true, cacheControl: '3600' });
      if (uploadError) throw uploadError;
      checkSession();
      const { data, error } = await client.from('drivers').update({ profile_thumbnail: path }).eq('id', driver.id).eq('profile_photo', driver.profile_photo).select().maybeSingle();
      if (error) throw error;
      if (!data) {
        await client.storage.from(bucket).remove([path]);
        return driver;
      }
      driverCache.upsert(client, data);
      return data;
    } });
    nextThumbnail();
  });
  currentJobs.set(key, promise);
  promise.catch(() => { currentJobs.delete(key); });
  return promise;
}
export async function uploadDriverFiles(driver, field, files) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Connect Supabase to upload private driver documents.');
  const selected = Array.from(files).slice(0, field === 'profile_photo' ? 1 : undefined);
  if (!selected.length) return driver;
  validateDriverImages(selected);
  const paths = [];
  let committed = false;
  try {
    for (const file of selected) {
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      const path = `${driver.id}/${field}/${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from(bucket).upload(path, file, { contentType: file.type, cacheControl: '3600' });
      if (error) throw error;
      paths.push(path);
    }
    const value = field === 'profile_photo' ? paths[0] : [...(driver[field] || []), ...paths];
    const update = { [field]: value };
    if (field === 'profile_photo') {
      const thumbnail = await createProfileThumbnail(selected[0]);
      const path = `${paths[0]}.thumb.webp`;
      const { error } = await client.storage.from(bucket).upload(path, thumbnail, { contentType: thumbnail.type, cacheControl: '3600' });
      if (error) throw error;
      paths.push(path); update.profile_thumbnail = path;
    }
    const { data, error } = await client.from('drivers').update(update).eq('id', driver.id).select().single();
    if (error) throw error;
    committed = true;
    driverCache.upsert(client, data);
    if (field === 'profile_photo' && driver.profile_photo) {
      const oldPaths = [driver.profile_photo, driver.profile_thumbnail].filter(Boolean);
      oldPaths.forEach(path => imageLinks.forget(path));
      // The new photo is already committed; a cleanup failure must not erase it.
      try { await client.storage.from(bucket).remove(oldPaths); } catch { /* Keep the successful upload. */ }
    }
    return data;
  } catch (error) {
    if (!committed && paths.length) await client.storage.from(bucket).remove(paths);
    throw error;
  }
}
export async function removeDriverFile(driver, field, path) {
  const client = getSupabaseClient();
  const value = field === 'profile_photo' ? null : (driver[field] || []).filter(p => p !== path);
  const update = { [field]: value };
  if (field === 'profile_photo') update.profile_thumbnail = null;
  const { data, error } = await client.from('drivers').update(update).eq('id', driver.id).select().single();
  if (error) throw error;
  driverCache.upsert(client, data);
  const paths = [path, ...(field === 'profile_photo' && driver.profile_thumbnail ? [driver.profile_thumbnail] : [])];
  paths.forEach(path => imageLinks.forget(path));
  await client.storage.from(bucket).remove(paths);
  return data;
}
