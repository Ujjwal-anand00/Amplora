import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  apiClient,
  setAuthToken,
  setActiveSessionUser,
  clearAuthSession,
} from './apiClient';
import { queryClient } from './queryClient';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CREATOR';
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { email: string; password: string; name: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { name?: string; avatarUrl?: string | null; bio?: string | null }) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SECURE_TOKEN_KEY = 'amp_auth_token_v1';
const SECURE_USER_KEY = 'amp_auth_user_v1';

async function secureGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch {}
}

async function secureDelete(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {}
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session securely on initial startup
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedToken = await secureGet(SECURE_TOKEN_KEY);
        const storedUserJson = await secureGet(SECURE_USER_KEY);

        if (storedToken && storedUserJson) {
          try {
            const parsedUser = JSON.parse(storedUserJson) as AuthUser;
            await setAuthToken(storedToken);
            setActiveSessionUser(parsedUser);

            if (isMounted) {
              setToken(storedToken);
              setUser(parsedUser);
            }

            // Verify session with server
            try {
              const res = await apiClient.getCurrentUser();
              if (res?.user && isMounted) {
                setUser(res.user);
                setActiveSessionUser(res.user);
                await secureSet(SECURE_USER_KEY, JSON.stringify(res.user));
              }
            } catch {
              // Retain cached session if server unreachable
            }
          } catch {
            await secureDelete(SECURE_TOKEN_KEY);
            await secureDelete(SECURE_USER_KEY);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await apiClient.login({ email: email.trim(), password });
      if (res?.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        await setAuthToken(res.token);
        setActiveSessionUser(res.user);
        await secureSet(SECURE_TOKEN_KEY, res.token);
        await secureSet(SECURE_USER_KEY, JSON.stringify(res.user));
        queryClient.clear();
        return { success: true };
      }
      return { success: false, error: 'Authentication failed. Please verify credentials.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Login error' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await apiClient.register(data);
      if (res?.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        await setAuthToken(res.token);
        setActiveSessionUser(res.user);
        await secureSet(SECURE_TOKEN_KEY, res.token);
        await secureSet(SECURE_USER_KEY, JSON.stringify(res.user));
        queryClient.clear();
        return { success: true };
      }
      return { success: false, error: 'Registration failed.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration error' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      try {
        await apiClient.logout();
      } catch {}

      setUser(null);
      setToken(null);
      await clearAuthSession();
      await secureDelete(SECURE_TOKEN_KEY);
      await secureDelete(SECURE_USER_KEY);
      queryClient.clear();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiClient.getCurrentUser();
      if (res?.user) {
        setUser(res.user);
        setActiveSessionUser(res.user);
        await secureSet(SECURE_USER_KEY, JSON.stringify(res.user));
      }
    } catch {}
  }, [token]);

  const updateProfile = useCallback(
    async (data: { name?: string; avatarUrl?: string | null; bio?: string | null }): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
      try {
        const res = await apiClient.updateProfile(data);
        if (res?.success && res.user) {
          setUser(res.user);
          setActiveSessionUser(res.user);
          await secureSet(SECURE_USER_KEY, JSON.stringify(res.user));
          return { success: true, user: res.user };
        }
        if (user) {
          const updatedUser: AuthUser = {
            ...user,
            ...data,
          };
          setUser(updatedUser);
          setActiveSessionUser(updatedUser);
          await secureSet(SECURE_USER_KEY, JSON.stringify(updatedUser));
          return { success: true, user: updatedUser };
        }
        return { success: false, error: 'Could not update profile.' };
      } catch (err: any) {
        if (user) {
          const updatedUser: AuthUser = {
            ...user,
            ...data,
          };
          setUser(updatedUser);
          setActiveSessionUser(updatedUser);
          await secureSet(SECURE_USER_KEY, JSON.stringify(updatedUser));
          return { success: true, user: updatedUser };
        }
        return { success: false, error: err?.message || 'Failed to update profile.' };
      }
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(user),
    isCreator: user?.role === 'CREATOR',
    isAdmin: user?.role === 'ADMIN',
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
