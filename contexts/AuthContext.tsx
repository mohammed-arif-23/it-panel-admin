"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

type UserRole = 'HOD' | 'STAFF' | null;

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  token: string | null;
  login: (role: UserRole, token: string) => void;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (requiredRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing auth on mount
    const storedToken = localStorage.getItem('authToken');
    const storedRole = localStorage.getItem('userRole') as UserRole;

    console.log('Auth check on mount:', { storedToken: !!storedToken, storedRole });

    if (storedToken && storedRole) {
      try {
        // Verify token is still valid
        const decoded: any = jwtDecode(storedToken);
        const currentTime = Date.now() / 1000;
        
        console.log('Token decoded:', { decoded, currentTime, exp: decoded.exp });
        
        if (decoded.exp && decoded.exp > currentTime) {
          setToken(storedToken);
          setUserRole(storedRole);
          setIsAuthenticated(true);
          console.log('Token is valid, setting auth state');
        } else {
          // Token expired, clear storage
          console.log('Token expired, clearing storage');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
        }
      } catch (error) {
        // Invalid token, clear storage
        console.log('Invalid token, clearing storage', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = (role: UserRole, authToken: string) => {
    console.log('Login called:', { role, tokenLength: authToken.length });
    setUserRole(role);
    setToken(authToken);
    setIsAuthenticated(true);
    
    // Store in localStorage
    localStorage.setItem('userRole', role || '');
    localStorage.setItem('authToken', authToken);
    
    // Set cookie for middleware
    document.cookie = `authToken=${authToken}; path=/; max-age=86400; SameSite=strict`;
    
    // Redirect to admin dashboard
    router.push('/admin');
  };

  const logout = () => {
    console.log('Logout called');
    setUserRole(null);
    setToken(null);
    setIsAuthenticated(false);
    
    // Clear storage
    localStorage.removeItem('userRole');
    localStorage.removeItem('authToken');
    
    // Clear cookie
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // Redirect to login
    router.push('/login');
  };

  const hasPermission = (requiredRole: UserRole): boolean => {
    if (!isAuthenticated || !userRole) return false;
    
    // HOD has access to everything
    if (userRole === 'HOD') return true;
    
    // STAFF only has access if that's the required role
    return userRole === requiredRole;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      userRole,
      token,
      login,
      logout,
      isLoading,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}