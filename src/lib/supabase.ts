import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key';
export const supabase = createClient(url, anonKey);
export const isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
