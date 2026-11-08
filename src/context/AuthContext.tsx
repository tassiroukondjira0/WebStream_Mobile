import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User } from '@/types/media';
import { Api, getAuthToken } from '@/services/api';

const USER_KEY = 'cinemax_user';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginRaw: (email: string, pass: string) => Promise<any>;
  register: (name: string, email: string, pass: string, country: string, phoneNumber: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function saveUser(user: User): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Erreur sauvegarde utilisateur:', e);
  }
}

async function loadUser(): Promise<User | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function removeUser(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (e) {
    console.error('Erreur suppression utilisateur:', e);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getAuthToken();
        if (token) {
          // Token trouvé — on charge les données utilisateur persistées
          const savedUser = await loadUser();
          if (savedUser) {
            setUser(savedUser);
          } else {
            // Fallback si les données utilisateur ne sont pas disponibles
            setUser({ id: 'unknown', email: '', name: 'Utilisateur', country: null, phoneNumber: null, role: 'USER', emailVerified: false });
          }
        }
      } catch (err) {
        console.error('Erreur vérification auth:', err);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await Api.login(email, pass);
      if (res.user) {
        setUser(res.user);
        await saveUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Exposer le type pour que le login puisse détecter emailVerified
  const loginRaw = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await Api.loginRaw(email, pass);
      // Si la connexion réussit, on met à jour le contexte avec les données utilisateur
      if (res.ok && res.user) {
        setUser(res.user);
        await saveUser(res.user);
      }
      setIsLoading(false);
      return res;
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const register = async (name: string, email: string, pass: string, country: string, phoneNumber: string) => {
    setIsLoading(true);
    try {
      const res = await Api.register(name, email, pass, country, phoneNumber);
      if (res.user) {
        setUser(res.user);
        await saveUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await Api.logout();
    await removeUser();
    setUser(null);
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, loginRaw, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
