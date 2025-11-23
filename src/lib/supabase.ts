import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we have valid credentials
const hasValidCredentials =
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co');

export const DEMO_MODE = !hasValidCredentials;

if (DEMO_MODE) {
    console.warn('⚠️ DEMO MODE: No valid Supabase credentials. Running locally only.');
}

// Create client with valid URL or demo placeholder
export const supabase = hasValidCredentials
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://demo.supabase.co', 'demo-key-not-real');

// Demo user for testing
export const DEMO_USER = {
    id: 'demo-user-' + Date.now(),
    email: 'demo@lafter.org',
    created_at: new Date().toISOString()
};
