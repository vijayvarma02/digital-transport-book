import { createClient } from '@supabase/supabase-js';
import { clearSessionCaches } from '../services/sessionCache';

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

let cachedClient;
let cachedConfig;
let authSubscription;

export const getSupabaseClient = () => {
  const { supabaseUrl, supabaseKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  try {
    const config = supabaseUrl + supabaseKey;
    if (cachedConfig !== config) {
      authSubscription?.unsubscribe();
      clearSessionCaches();
      cachedClient = createClient(supabaseUrl, supabaseKey, {
        auth: { storage: localStorage },
      });
      cachedConfig = config;
      let currentUser = null;
      const { data } = cachedClient.auth.onAuthStateChange((event, session) => {
        const nextUser = session?.user?.id || null;
        if (event === 'SIGNED_OUT' || currentUser !== nextUser) clearSessionCaches();
        currentUser = nextUser;
      });
      authSubscription = data.subscription;
    }
    return cachedClient;
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
