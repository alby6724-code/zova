import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password?: string, totpCode?: string) => Promise<{ requires2FA?: boolean }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  enable2FA: (code: string) => Promise<boolean>;
  sendOtp: (destination: string, purpose?: 'LOGIN' | 'REGISTER') => Promise<{ success: boolean; expiresInSeconds: number; message: string; error?: string }>;
  verifyOtp: (destination: string, code: string, purpose?: 'LOGIN' | 'REGISTER', name?: string) => Promise<{ success: boolean; verified: boolean; userExists?: boolean; isNewUser?: boolean; message: string }>;
  updateUser: (updatedData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  registerWithOtp: (data: { destination: string; code?: string; name: string; role?: string; password?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('BUYER');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt to authenticate with backend if token exists
    const checkAuth = async () => {
      try {
        const token = api.getToken();
        if (token) {
          const profile = await api.getCurrentUser();
          setUser(profile);
          setRole(profile.role);
        } else {
          setUser(null);
          setRole('BUYER');
        }
      } catch {
        api.setToken(null);
        setUser(null);
        setRole('BUYER');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (identifier: string, password = '', totpCode?: string) => {
    // Note: Do not toggle global isLoading here.
    // AdminGuard uses isLoading for the initial session check on mount.
    // Toggling isLoading during form submit causes AdminGuard to unmount AdminLoginPage,
    // which wipes entered credentials and resets all error messages.
    const res = await api.login({ identifier, password, totpCode });
    if (res.requires2FA) {
      return { requires2FA: true };
    }
    if (res.user) {
      setUser(res.user);
      setRole(res.user.role);
    }
    return { requires2FA: false };
  };

  const sendOtp = async (destination: string, purpose: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    return api.sendOtp(destination, purpose);
  };

  const verifyOtp = async (destination: string, code: string, purpose: 'LOGIN' | 'REGISTER' = 'LOGIN', name?: string) => {
    const res = await api.verifyOtp(destination, code, purpose, name);
    if (res.user) {
      setUser(res.user);
      setRole(res.user.role);
    }
    return res;
  };

  const registerWithOtp = async (data: { destination: string; code?: string; name: string; role?: string; password?: string }) => {
    const res = await api.registerWithOtp(data);
    if (res.user) {
      setUser(res.user);
      setRole(res.user.role);
    }
  };

  const logout = () => {
    api.logout().catch(() => {});
    api.setToken(null);
    setUser(null);
    setRole('BUYER');
  };

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    if (user) {
      setUser({
        ...user,
        role: newRole,
        name: newRole === 'SUPER_ADMIN' ? 'Admin' : `${newRole.charAt(0) + newRole.slice(1).toLowerCase()} User`,
      });
    }
  };

  const enable2FA = async (code: string) => {
    try {
      const res = await api.verify2FA(code);
      if (res.success && user) {
        setUser({ ...user, twoFactorEnabled: true });
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const updateUser = (updatedData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updatedData });
    }
  };

  const refreshUser = async () => {
    try {
      const profile = await api.getCurrentUser();
      setUser(profile);
      setRole(profile.role);
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchRole,
        enable2FA,
        sendOtp,
        verifyOtp,
        updateUser,
        refreshUser,
        registerWithOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
