import { getSupabaseClient } from '../lib/supabase';
const bucket = 'driver-files';
export function validateDriverImages(files) {
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error('Use JPG, PNG or WebP images up to 5 MB each.');
    }
  }
}
export async function fileUrl(path) {
  if (!path) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
export async function uploadDriverFiles(driver, field, files) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Connect Supabase to upload private driver documents.');
  const selected = Array.from(files);
  if (!selected.length) return driver;
  validateDriverImages(selected);
  const paths = [];
  try {
    for (const file of selected) {
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      const path = `${driver.id}/${field}/${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from(bucket).upload(path, file, { contentType: file.type });
      if (error) throw error;
      paths.push(path);
    }
    const value = field === 'profile_photo' ? paths[0] : [...(driver[field] || []), ...paths];
    const { data, error } = await client.from('drivers').update({ [field]: value }).eq('id', driver.id).select().single();
    if (error) throw error;
    if (field === 'profile_photo' && driver.profile_photo) await client.storage.from(bucket).remove([driver.profile_photo]);
    return data;
  } catch (error) {
    if (paths.length) await client.storage.from(bucket).remove(paths);
    throw error;
  }
}
export async function removeDriverFile(driver, field, path) {
  const client = getSupabaseClient();
  const value = field === 'profile_photo' ? null : (driver[field] || []).filter(p => p !== path);
  const { data, error } = await client.from('drivers').update({ [field]: value }).eq('id', driver.id).select().single();
  if (error) throw error;
  await client.storage.from(bucket).remove([path]);
  return data;
}
