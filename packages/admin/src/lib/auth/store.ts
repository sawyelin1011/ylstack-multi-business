/**
 * Authentication Store
 */

import { writable, derived, get } from 'svelte/store';
import { api } from '../api/client';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true,
  });

  /**
   * Initialize auth from localStorage
   */
  async function initialize(): Promise<void> {
    const token = localStorage.getItem('auth_token');

    if (token) {
      api.setToken(token);

      try {
        const user = await api.get<User>('/auth/me');
        update((state) => ({
          ...state,
          user,
          token,
          isAuthenticated: true,
          loading: false,
        }));
      } catch (error) {
        logout();
      }
    } else {
      update((state) => ({
        ...state,
        loading: false,
      }));
    }
  }

  /**
   * Login with email and password
   */
  async function login(email: string, password: string): Promise<void> {
    update((state) => ({ ...state, loading: true }));

    const response: any = await api.post('/auth/login', { email, password });

    const { user, accessToken, refreshToken } = response;

    api.setToken(accessToken);

    update((state) => ({
      ...state,
      user,
      token: accessToken,
      isAuthenticated: true,
      loading: false,
    }));

    localStorage.setItem('refresh_token', refreshToken);
  }

  /**
   * Register new user
   */
  async function register(email: string, password: string, name?: string): Promise<void> {
    update((state) => ({ ...state, loading: true }));

    const response: any = await api.post('/auth/register', { email, password, name });

    update((state) => ({
      ...state,
      user: response.user,
      loading: false,
    }));
  }

  /**
   * Logout current session
   */
  async function logout(): Promise<void> {
    try {
      await api.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    }

    api.clearToken();
    localStorage.removeItem('refresh_token');

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });
  }

  /**
   * Refresh access token
   */
  async function refreshAccessToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      logout();
      return;
    }

    try {
      const response: any = await api.post('/auth/refresh', { refreshToken });

      const { accessToken } = response;

      api.setToken(accessToken);

      update((state) => ({
        ...state,
        token: accessToken,
      }));
    } catch (error) {
      logout();
      throw error;
    }
  }

  /**
   * Update user data
   */
  function updateUser(user: User): void {
    update((state) => ({
      ...state,
      user,
    }));
  }

  return {
    subscribe,
    initialize,
    login,
    register,
    logout,
    refreshAccessToken,
    updateUser,
  };
}

export const auth = createAuthStore();

export const user = derived(auth, ($auth) => $auth.user);
export const isAuthenticated = derived(auth, ($auth) => $auth.isAuthenticated);
export const isAdmin = derived(auth, ($auth) => $auth.user?.role === 'admin');
export const authLoading = derived(auth, ($auth) => $auth.loading);
