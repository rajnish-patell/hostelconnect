import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_anon_key';

export const isSupabaseConfigured = () => {
  return (
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Request an Email OTP code via Supabase Auth
 * @param {string} email
 */
export async function requestSupabaseEmailOtp(email) {
  if (!email || !email.includes('@')) {
    return { error: { message: 'Valid email address is required' } };
  }

  if (!isSupabaseConfigured()) {
    console.warn('⚠️ Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not configured.');
  }

  const { data, error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    let userMsg = error.message;
    if (error.status === 429 || error.message?.includes('rate')) {
      userMsg = 'Too many OTP requests. Please wait a moment before trying again.';
    } else if (error.message?.includes('Invalid')) {
      userMsg = 'Invalid email address provided.';
    }
    return { data: null, error: { message: userMsg, raw: error } };
  }

  return { data, error: null };
}

/**
 * Verify 6-digit Email OTP code via Supabase Auth
 * @param {string} email
 * @param {string} token
 */
export async function verifySupabaseEmailOtp(email, token) {
  const cleanToken = (token || '').trim();
  if (!cleanToken || cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
    return { error: { message: 'Invalid or expired verification code.' } };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: cleanToken,
    type: 'email',
  });

  if (error) {
    let userMsg = 'Invalid or expired verification code.';
    if (error.message?.includes('expired')) {
      userMsg = 'Verification code has expired. Please request a new code.';
    } else if (error.message?.includes('already verified')) {
      userMsg = 'User is already verified. Please sign in.';
    }
    return { data: null, error: { message: userMsg, raw: error } };
  }

  return { data, error: null };
}

/**
 * Perform clean sign out via Supabase Auth
 */
export async function signOutSupabase() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    // Ignore signout errors if session wasn't active
  }
}

/**
 * Subscribe to Supabase auth state change events
 * @param {function} callback
 */
export function onSupabaseAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (typeof callback === 'function') {
      callback(event, session);
    }
  });
}
