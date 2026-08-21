import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey !== 'placeholder_anon_key'
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Request an Email OTP code via Supabase Auth
 * @param {string} email
 */
export async function requestSupabaseEmailOtp(email) {
  if (!email || !email.includes('@')) {
    return { error: { message: 'Valid email address is required' } };
  }

  if (!isSupabaseConfigured() || !supabase) {
    return {
      error: {
        message: 'Email OTP is not configured. Please add the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.',
      },
    };
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

  if (!isSupabaseConfigured() || !supabase) {
    return {
      error: {
        message: 'Email OTP is not configured. Please add the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.',
      },
    };
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
      userMsg = 'This account is already verified. Please sign in.';
    } else if (error.message?.includes('too many')) {
      userMsg = 'Too many verification attempts. Please request a new code.';
    }
    return { data: null, error: { message: userMsg, raw: error } };
  }

  return { data, error: null };
}

/**
 * Perform clean sign out via Supabase Auth
 */
export async function signOutSupabase() {
  if (!supabase) return;

  try {
    await supabase.auth.signOut();
  } catch (err) {
    // Ignore signout errors if no session exists.
  }
}

/**
 * Subscribe to Supabase auth state change events
 * @param {function} callback
 */
export function onSupabaseAuthStateChange(callback) {
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  return supabase.auth.onAuthStateChange((event, session) => {
    if (typeof callback === 'function') {
      callback(event, session);
    }
  });
}

export async function getSupabaseSession() {
  if (!supabase) {
    return { data: { session: null }, error: null };
  }

  return supabase.auth.getSession();
}
