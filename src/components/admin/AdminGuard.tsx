import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { AdminLoginPage } from '../../pages/AdminLoginPage.js';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070f1e] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Verifying Administrative Privileges...</p>
      </div>
    );
  }

  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT'].includes(role);

  if (!isAdmin) {
    // Show dedicated Admin Login page on the /admin path instead of redirecting to public site
    return <AdminLoginPage />;
  }

  return <>{children}</>;
};
