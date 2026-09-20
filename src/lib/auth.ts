// Demo-only, browser-local "auth": there's no real backend, so any credentials on the login
// page are accepted and this flag is set in localStorage. It exists purely to gate direct
// access to the dashboard behind the login flow - it is not real security.
export const AUTH_STORAGE_KEY = 'alpha-heights-authed';

export function markAuthed() {
  localStorage.setItem(AUTH_STORAGE_KEY, '1');
}

export function isAuthed(): boolean {
  return localStorage.getItem(AUTH_STORAGE_KEY) === '1';
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
