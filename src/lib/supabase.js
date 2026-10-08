import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = localStorage.getItem('dtb_supabase_url');
  const localKey = localStorage.getItem('dtb_supabase_key');

  const supabaseUrl = localUrl || envUrl;
  const supabaseKey = localKey || envKey;

  const isValid = Boolean(
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseKey.length > 10 &&
    !supabaseUrl.includes('your-project-ref')
  );

  return { supabaseUrl, supabaseKey, isConfigured: isValid };
};

export const getSupabaseClient = () => {
  const { supabaseUrl, supabaseKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error);
    return null;
  }
};

export const isSupabaseConfigured = () => {
  return getSupabaseConfig().isConfigured;
};

export const saveSupabaseCredentials = (url, key) => {
  if (url) localStorage.setItem('dtb_supabase_url', url.trim());
  else localStorage.removeItem('dtb_supabase_url');

  if (key) localStorage.setItem('dtb_supabase_key', key.trim());
  else localStorage.removeItem('dtb_supabase_key');
};

export const getSavedSupabaseCredentials = () => {
  return {
    url: localStorage.getItem('dtb_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '',
    key: localStorage.getItem('dtb_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  };
};
