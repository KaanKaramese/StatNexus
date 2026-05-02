/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';

const STORAGE_KEY_TOKEN = 'statnexus_token';
const STORAGE_KEY_USER = 'statnexus_user';
const STORAGE_KEY_STATE = 'statnexus_oauth_state';

function loadFromStorage() {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const user = JSON.parse(localStorage.getItem(STORAGE_KEY_USER) || 'null');
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

function saveToStorage(token, user) {
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_STATE);
}

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  handleCallback: () => Promise.resolve(false),
  getToken: () => null,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const getToken = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  }, []);

  // Validate existing session on mount
  useEffect(() => {
    const { token, user: storedUser } = loadFromStorage();
    if (!token || !storedUser) {
      setIsLoading(false);
      return;
    }

    apiFetch('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        saveToStorage(token, data.user);
      })
      .catch(() => {
        clearStorage();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async () => {
    try {
      const res = await apiFetch('/auth/riot/login');
      if (!res.ok) throw new Error('Failed to get login URL');
      const { url, state } = await res.json();
      localStorage.setItem(STORAGE_KEY_STATE, state);
      window.location.href = url;
    } catch (err) {
      console.error('Login failed:', err);
    }
  }, []);

  const handleCallback = useCallback(async (code, state) => {
    const savedState = localStorage.getItem(STORAGE_KEY_STATE);
    localStorage.removeItem(STORAGE_KEY_STATE);

    if (savedState && state !== savedState) {
      console.error('OAuth state mismatch — possible CSRF attack');
      return false;
    }

    try {
      const res = await apiFetch(`/auth/riot/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
      if (!res.ok) throw new Error('Callback failed');
      const { token, user: riotUser } = await res.json();
      saveToStorage(token, riotUser);
      setUser(riotUser);
      return true;
    } catch (err) {
      console.error('OAuth callback failed:', err);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearStorage();
    setUser(null);
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, handleCallback, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
