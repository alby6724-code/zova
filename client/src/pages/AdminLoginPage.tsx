import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, AlertCircle, Clock, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useBranding } from '../context/BrandingContext.js';

interface AdminLoginPageProps {
  onSuccess?: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const { companyName } = useBranding();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);

  // Progressive Lockout state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number>(0);
  const [lockLevel, setLockLevel] = useState<number>(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer for progressive lockout
  useEffect(() => {
    if (lockCountdown <= 0) return;
    const interval = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockCountdown > 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await login(identifier.trim(), password, totpCode || undefined);
      if (res.requires2FA) {
        setNeeds2FA(true);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Admin login error:', err);
      setIsSubmitting(false);
      if (err.locked || err.isLocked) {
        const secs = err.retryAfterSeconds || err.remainingSeconds || (err.lockLevel === 2 ? 3600 : 10);
        setLockCountdown(secs);
        setLockLevel(err.lockLevel || (secs > 60 ? 2 : 1));
        setErrorMessage(
          err.lockLevel === 2 || secs > 60
            ? 'Account blocked for 1 hour: too many failed attempts.'
            : 'Account locked for 10 seconds after 3 failed attempts.'
        );
      } else {
        let errorDetail = err?.message || 'Incorrect credentials. Please try again.';
        const msgLower = (err?.message || '').toLowerCase();

        if (
          err?.status === 404 ||
          (msgLower.includes('404') && !msgLower.includes('user'))
        ) {
          errorDetail = 'Backend API endpoint not found (404). Please ensure the /api routes are deployed and accessible.';
        } else if (
          err?.status === 504 ||
          err?.status === 502 ||
          msgLower.includes('failed to fetch') ||
          msgLower.includes('networkerror') ||
          msgLower.includes('504') ||
          msgLower.includes('502')
        ) {
          errorDetail = 'Cannot connect to backend server. Make sure the server is running and accessible.';
        } else if (msgLower.includes('wrong_password') || msgLower.includes('wrong password') || msgLower.includes('password')) {
          errorDetail = 'Wrong password entered. Please check your password and try again.';
        } else if (msgLower.includes('invalid email') || msgLower.includes('invalid credentials') || msgLower.includes('user not found') || msgLower.includes('not found')) {
          errorDetail = 'Invalid admin email or password. Please verify your credentials.';
        }

        setErrorMessage(errorDetail);
        if (typeof err.remainingAttempts === 'number') {
          setAttemptsRemaining(err.remainingAttempts);
        } else if (typeof err.remainingAttemptsBeforeLock === 'number') {
          setAttemptsRemaining(err.remainingAttemptsBeforeLock);
        }
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s < 10 ? '0' : ''}${s}s` : `${s}s`;
  };

  return (
    <div className="min-h-screen bg-[#070f1e] flex flex-col justify-center items-center px-4 sm:px-6 font-sans text-slate-100 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#0e1a30]/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        {/* Card Header */}
        <div className="p-8 pb-6 border-b border-slate-800 text-center relative">
          <div className="w-14 h-14 bg-gradient-to-tr from-sky-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-sky-500/20 mb-4 border border-sky-400/30">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {companyName} <span className="text-sky-400 text-sm font-semibold uppercase tracking-wider block">Admin Control Portal</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authorized Personnel Only · Protected by Progressive Lockout
          </p>
        </div>

        {/* Lockout Banner */}
        {lockCountdown > 0 && (
          <div className="bg-red-950/80 border-b border-red-800/60 p-4 flex items-start gap-3 text-red-200">
            <Clock className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="text-xs font-bold text-red-300">
                {lockLevel === 2 ? 'Account Blocked for 1 Hour' : 'Account Temporarily Locked for 10 Seconds'}
              </p>
              <p className="text-xs text-red-400 mt-0.5">
                Retry available in <span className="font-mono font-bold text-red-200">{formatTime(lockCountdown)}</span>.
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && lockCountdown === 0 && (
          <div className="bg-amber-950/70 border-b border-amber-800/60 p-3.5 flex items-start gap-2.5 text-amber-200 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span>{errorMessage}</span>
              {attemptsRemaining !== null && attemptsRemaining > 0 && (
                <p className="text-[11px] text-amber-300 mt-0.5">
                  Remaining attempts before lockout: <strong>{attemptsRemaining}</strong>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="admin-identifier">
              Username or Email Address
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                id="admin-identifier"
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter admin username or email"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="admin-password">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
          </div>


          {needs2FA && (
            <div className="p-3.5 bg-blue-950/60 border border-blue-800 rounded-xl space-y-2">
              <label className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Two-Factor Authentication (TOTP)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="Enter 6-digit TOTP (e.g. 123456)"
                className="w-full py-2 px-3 bg-slate-900 border border-blue-700 rounded-lg text-center font-mono font-bold tracking-widest text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || lockCountdown > 0}
            className="w-full min-h-[48px] py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-600/30 hover:shadow-sky-600/50 transition-all flex items-center justify-center gap-2 active:scale-[0.99] mt-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : lockCountdown > 0 ? (
              <span>Locked ({formatTime(lockCountdown)})</span>
            ) : (
              <>
                <span>Sign In to Admin Panel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer Notice */}
      <div className="mt-8 text-center text-slate-500 text-[11px] max-w-sm">
        {companyName} Enterprise · ISO/IEC 27001 & OWASP ASVS Compliant · Session IP Monitored
      </div>
    </div>
  );
};
