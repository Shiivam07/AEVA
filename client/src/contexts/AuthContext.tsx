import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  accountType: 'PLATFORM_ADMIN' | 'BUSINESS_OWNER' | 'COLLABORATOR';
  profileImage?: string;
  phone?: string;
  biography?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

interface RegisterData {
  fullName: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
  accountType: 'BUSINESS_OWNER' | 'COLLABORATOR';
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (identifier: string, password: string) => {
    const response = await api.post('/auth/login', { identifier, password });
    const { user: loggedUser, token: authToken } = response.data.data;
    setToken(authToken);
    setUser(loggedUser);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(loggedUser));
  };

  const register = async (data: RegisterData) => {
    const response = await api.post('/auth/register', data);
    const { user: newUser, token: authToken } = response.data.data;
    setToken(authToken);
    setUser(newUser);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...data };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
