import React, { createContext, useContext, useState, useEffect } from 'react';
import { LoginResponse } from '../types';

interface AuthContextType {
  accessToken: string | null;
  setAuthData: (data: LoginResponse) => void;
  isAuthenticated: boolean;
  logout: () => void;
  role: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Provider component that wraps app and makes auth object available to any
 * child component that calls useAuth().
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('accessToken');
  });
  const [role, setRole] = useState<string | null>(() => {
    return localStorage.getItem('userRole');
  });

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userRole');
    }
  }, [accessToken]);

  /**
   * Sets authentication data and stores it in local storage
   * @param data - Login response containing access token and user role
   */
  const setAuthData = (data: LoginResponse) => {
    console.log('Setting auth data');
    setAccessToken(data.access);
    setRole(data.role.role);
    localStorage.setItem('userRole', data.role.role);
  };

  /**
   * Clears authentication state and local storage
   */
  const logout = () => {
    console.log('Clearing auth state');
    setAccessToken(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{
      accessToken,
      setAuthData,
      isAuthenticated: !!accessToken,
      logout,
      role
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook for accessing auth context
 * @returns Auth context containing token, role, and auth methods
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}