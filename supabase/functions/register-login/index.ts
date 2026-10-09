import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { createLoginHandler } from './handler.js';

// Only the Edge runtime receives these secrets. No browser bundle contains them.
Deno.serve(createLoginHandler({
  env: (name: string) => Deno.env.get(name),
  createClient,
}));
