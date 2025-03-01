import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single instance of the Supabase client to be reused
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Changed to false to reduce auth requests
    storageKey: 'cinbal-restaurant-auth', // Add a specific storage key
  },
});

// Reduce the frequency of auth state change events
let lastAuthEvent = 0;
const AUTH_EVENT_THROTTLE = 5000; // 5 seconds minimum between auth events

supabase.auth.onAuthStateChange((event, session) => {
  const now = Date.now();
  
  // Only process auth events if enough time has passed since the last one
  if (now - lastAuthEvent > AUTH_EVENT_THROTTLE) {
    lastAuthEvent = now;
    
    if (event === 'SIGNED_OUT') {
      // Only clear auth-related items, not the entire localStorage
      localStorage.removeItem('cinbal-restaurant-auth');
      localStorage.removeItem('supabase.auth.token');
    }
  }
});