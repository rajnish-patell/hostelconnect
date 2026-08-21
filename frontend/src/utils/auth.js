import { signOutSupabase } from './supabase';

export function getUser() {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function setAuth(token, user) {
  try {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  } catch (e) {
    console.error('Error saving auth state:', e);
  }
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.clear();
}

export async function logout() {
  try {
    await signOutSupabase();
  } catch (e) {
    // ignore signout errors and still clear local state
  }

  clearAuth();

  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'unset';
    document.body.style.pointerEvents = 'auto';
  }

  window.location.replace('/login');
}
