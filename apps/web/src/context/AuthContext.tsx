import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface WorkspaceMembership {
  workspaceId: string;
  role: string;
  workspaceName: string;
  workspaceSlug: string;
  primaryColor: string;
  logoUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  memberships: WorkspaceMembership[];
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('feedbackpulse_token') : null;
  });
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('feedbackpulse_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = () => {
    localStorage.removeItem('feedbackpulse_token');
    localStorage.removeItem('feedbackpulse_user');
    setToken(null);
    setUser(null);
    setMemberships([]);
  };

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('feedbackpulse_token');
    if (!currentToken) {
      setUser(null);
      setMemberships([]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.api.auth.me.$get({
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setMemberships(data.memberships);
        localStorage.setItem('feedbackpulse_user', JSON.stringify(data.user));
      } else {
        logout();
      }
    } catch {
      // Network failure: keep existing offline state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('feedbackpulse_token', newToken);
    localStorage.setItem('feedbackpulse_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, memberships, isLoading, login, logout, refreshUser }}>
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
