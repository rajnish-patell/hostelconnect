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

export function logout() {
  try {
    signOutSupabase();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
  } catch (e) {
    console.error('Logout error:', e);
  }


  // Ensure scroll lock and pointer events are always restored
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'unset';
    document.body.style.pointerEvents = 'auto';
  }

  // Use replace to prevent back-navigation to protected screens
  window.location.replace('/login');
}
