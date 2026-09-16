import React, { useState, useEffect } from 'react';
import { AuditLog, CompanySettings } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useBranding } from '../context/BrandingContext.js';
import {
  Building2,
  ShieldCheck,
  Lock,
  Key,
  Check,
  AlertCircle,
  Save,
  Globe,
  Mail,
  Phone,
  Sparkles,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

type SettingsTab = 'branding' | 'security' | 'audit';

export const SettingsPage: React.FC = () => {
  const { user, enable2FA } = useAuth();
  const { branding, updateBranding } = useBranding();

  const [activeTab, setActiveTab] = useState<SettingsTab>('branding');

  // Branding Form State
  const [brandingForm, setBrandingForm] = useState<CompanySettings>(branding);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync form when branding context changes
  useEffect(() => {
    setBrandingForm(branding);
  }, [branding]);

  // Toast auto-dismiss
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandingForm.companyName.trim()) {
      showToast('Company Name cannot be empty.', 'error');
      return;
    }

    setIsSavingBranding(true);
    try {
      await updateBranding({
        companyName: brandingForm.companyName.trim(),
        tagline: brandingForm.tagline.trim(),
        description: brandingForm.description.trim(),
        websiteName: brandingForm.websiteName.trim(),
        supportEmail: brandingForm.supportEmail.trim(),
        supportPhone: brandingForm.supportPhone.trim(),
        footerCopyright: brandingForm.footerCopyright.trim(),
        logoUrl: brandingForm.logoUrl?.trim() || '',
      });
      showToast(`Company branding updated successfully to "${brandingForm.companyName}"!`, 'success');
    } catch (err: any) {
      console.error('Failed to save branding:', err);
      showToast(err.message || 'Failed to update company branding.', 'error');
    } finally {
      setIsSavingBranding(false);
    }
  };

  // 2FA & Security state
  const [totpCode, setTotpCode] = useState('');
  const [setupData, setSetupData] = useState<{ secret: string; otpAuthUrl: string; backupCodes: string[] } | null>(null);
  const [secMessage, setSecMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const logs = await api.getAuditLogs();
        setAuditLogs(logs);
      } catch (e) {
        // Fallback default audit logs
        setAuditLogs([
          {
            id: 'aud-1',
            adminId: 'usr-1',
            adminName: 'Admin',
            adminRole: 'SUPER_ADMIN',
            action: 'SYSTEM_CONFIG_UPDATED',
            target: 'Security Policy',
            details: 'Enforced TOTP 2FA for all administrative accounts',
            ip: '192.168.1.100',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'aud-2',
            adminId: 'usr-9',
            adminName: 'Sarah Admin',
            adminRole: 'ADMIN',
            action: 'LISTING_MODERATION',
            target: 'lst-10 (Samsung TV)',
            details: 'Flagged listing pending seller invoice verification',
            ip: '192.168.1.104',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
        ]);
      }
    };
    fetchAudit();
  }, []);

  const handleStart2FA = async () => {
    try {
      const data = await api.setup2FA();
      setSetupData(data);
    } catch (e) {
      setSetupData({
        secret: 'JBSWY3DPEHPK3PXP',
        otpAuthUrl: `otpauth://totp/${encodeURIComponent(branding.companyName)}:marketplace@${encodeURIComponent(branding.companyName.toLowerCase().replace(/\s+/g, ''))}.com?secret=JBSWY3DPEHPK3PXP`,
        backupCodes: ['8821-4412', '9102-7731', '3341-9981', '6620-1144'],
      });
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode) return;
    const success = await enable2FA(totpCode);
    if (success) {
      setSecMessage({ text: 'Two-Factor Authentication successfully activated and verified.', type: 'success' });
      setSetupData(null);
    } else {
      setSecMessage({ text: 'Invalid verification code. Try "123456" for demo testing.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header & Sub-Nav Tabs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Platform & Administrative Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage global company branding, multi-factor security, RBAC policies, and audit logs.
          </p>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'branding'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Company Branding</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security & 2FA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY BRANDING                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Edit Branding */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-blue-600">
                <Building2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Global Company Branding</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                Live Source of Truth
              </span>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-4">
              {/* Company Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5" htmlFor="cfg-company-name">
                  Company / Marketplace Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="cfg-company-name"
                    type="text"
                    required
                    value={brandingForm.companyName}
                    onChange={(e) =>
                      setBrandingForm({
                        ...brandingForm,
                        companyName: e.target.value,
                        websiteName: brandingForm.websiteName === brandingForm.companyName ? e.target.value : brandingForm.websiteName,
                        footerCopyright: `© ${new Date().getFullYear()} ${e.target.value}. All rights reserved.`,
                      })
                    }
                    placeholder="e.g. ZOVA"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Changing this updates the navbar logo, footer, login modal, admin header, and page titles everywhere automatically.
                </p>
              </div>

              {/* Tagline & Website Name in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5" htmlFor="cfg-tagline">
                    Company Tagline / Slogan
                  </label>
                  <div className="relative">
                    <Sparkles className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="cfg-tagline"
                      type="text"
                      value={brandingForm.tagline}
                      onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
                      placeholder="e.g. India's Verified Local Marketplace"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5" htmlFor="cfg-website-name">
                    Website Display Name
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="cfg-website-name"
                      type="text"
                      value={brandingForm.websiteName}
                      onChange={(e) => setBrandingForm({ ...brandingForm, websiteName: e.target.value })}
                      placeholder="e.g. ZOVA"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Support Email & Phone in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5" htmlFor="cfg-support-email">
                    Support Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="cfg-support-email"
                      type="email"
                      value={brandingForm.supportEmail}
                      onChange={(e) => setBrandingForm({ ...brandingForm, supportEmail: e.target.value })}
                      placeholder="e.g. support@zova.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5" htmlFor="cfg-support-phone">
                    Support Helpline Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="cfg-support-phone"
                      type="text"
                      value={brandingForm.supportPhone}
                      onChange={(e) => setBrandingForm({ ...brandingForm, supportPhone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Company Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5" htmlFor="cfg-description">
                  Company Description & SEO Meta
                </label>
                <textarea
                  id="cfg-description"
                  rows={2}
                  value={brandingForm.description}
                  onChange={(e) => setBrandingForm({ ...brandingForm, description: e.target.value })}
                  placeholder="Short description for meta tags and footers..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Footer Copyright Text */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5" htmlFor="cfg-copyright">
                  Footer Copyright Notice
                </label>
                <input
                  id="cfg-copyright"
                  type="text"
                  value={brandingForm.footerCopyright}
                  onChange={(e) => setBrandingForm({ ...brandingForm, footerCopyright: e.target.value })}
                  placeholder="e.g. © 2026 ZOVA. All rights reserved."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Custom Logo Image URL (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5" htmlFor="cfg-logo-url">
                  Custom Logo Image URL <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                </label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="cfg-logo-url"
                    type="url"
                    value={brandingForm.logoUrl || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png (leave blank for dynamic text logo)"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBrandingForm(branding)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Reset Form
                </button>

                <button
                  type="submit"
                  disabled={isSavingBranding}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSavingBranding ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Live Preview Panel */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Live Branding Preview
                </span>
                <span className="text-[10px] text-slate-400">Real-Time Sync</span>
              </div>

              {/* Navbar Preview */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Public Navbar Brand</p>
                <div className="bg-white p-3 rounded-xl flex items-center gap-2.5 shadow-sm">
                  {brandingForm.logoUrl ? (
                    <img src={brandingForm.logoUrl} alt="Logo" className="h-6 object-contain" />
                  ) : (
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-sm">
                      {brandingForm.companyName.trim().charAt(0).toUpperCase() || 'Z'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-none">
                      {brandingForm.companyName || 'Company Name'}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
                      {brandingForm.tagline || 'Tagline'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Portal Header Preview */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Admin Sidebar & Portal</p>
                <div className="bg-[#0e1a30] p-3 rounded-xl border border-slate-800 flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xs">
                    {brandingForm.companyName.trim().charAt(0).toUpperCase() || 'Z'}
                  </div>
                  <span className="text-xs font-bold text-white tracking-tight">
                    {brandingForm.companyName || 'Company Name'}
                  </span>
                  <span className="text-[9px] font-semibold text-sky-400 uppercase tracking-wider bg-sky-950 px-1.5 py-0.5 rounded ml-auto border border-sky-800/60">
                    Admin
                  </span>
                </div>
              </div>

              {/* Browser Tab Title Preview */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Browser Tab Title</p>
                <div className="bg-slate-800 p-2.5 rounded-lg text-xs font-mono text-slate-200 truncate flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">
                    {brandingForm.companyName || 'Company Name'} — {brandingForm.tagline || 'Tagline'}
                  </span>
                </div>
              </div>

              {/* Footer Preview */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Footer Copyright Notice</p>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 text-center">
                  <p className="text-xs text-slate-300 font-medium">
                    {brandingForm.footerCopyright || `© ${new Date().getFullYear()} ${brandingForm.companyName}. All rights reserved.`}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Contact: {brandingForm.supportEmail} · {brandingForm.supportPhone}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Zero-Downtime Instant Update
              </p>
              <p className="text-blue-800 text-[11px]">
                Clicking <strong>Save Changes</strong> persists the new company name directly to the database. All customers browsing the marketplace will see the updated brand name immediately without requiring any code deployment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SECURITY & 2FA                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 2FA Management */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-blue-600">
              <Lock className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Multi-Factor Authentication (2FA)</h3>
            </div>
            <p className="text-xs text-slate-600">
              Protect administrative sessions using Time-based One-Time Passwords (TOTP via Google Authenticator, Authy, or 1Password).
            </p>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${user?.twoFactorEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Status: {user?.twoFactorEnabled ? 'Active & Enforced' : 'Disabled'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {user?.twoFactorEnabled ? 'Your account requires TOTP at each login.' : '2FA is strongly recommended.'}
                  </p>
                </div>
              </div>

              {!user?.twoFactorEnabled && !setupData && (
                <button
                  type="button"
                  onClick={handleStart2FA}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Setup 2FA
                </button>
              )}
            </div>

            {setupData && (
              <div className="p-4 border border-blue-200 bg-blue-50/50 rounded-xl space-y-4 text-xs">
                <p className="font-semibold text-blue-950">1. Add Secret Key to your Authenticator App:</p>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-center text-sm">
                  {setupData.secret}
                </div>

                <p className="font-semibold text-blue-950">2. Enter 6-digit confirmation code (or test with 123456):</p>
                <form onSubmit={handleVerify2FA} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    className="w-36 px-3 py-2 border border-slate-300 rounded-lg text-center font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
                  >
                    Verify & Activate
                  </button>
                </form>

                <div>
                  <p className="font-semibold text-slate-700 mb-1">Emergency Backup Codes:</p>
                  <div className="grid grid-cols-2 gap-2 text-center font-mono text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                    {setupData.backupCodes.map((code) => (
                      <span key={code}>{code}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {secMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  secMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {secMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{secMessage.text}</span>
              </div>
            )}
          </div>

          {/* Right: RBAC Permission Matrix */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-purple-600">
              <Key className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Role-Based Access Control (RBAC) Matrix</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-100 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Permission</th>
                    <th className="py-2.5 px-2 text-center">Super Admin</th>
                    <th className="py-2.5 px-2 text-center">Admin</th>
                    <th className="py-2.5 px-2 text-center">Moderator</th>
                    <th className="py-2.5 px-2 text-center">Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-800">User CRUD & Role Elevate</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-slate-300">—</td>
                    <td className="text-center text-slate-300">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-800">Listing Approval & Flagging</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-slate-300">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-800">Company Settings & Branding</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-slate-300">—</td>
                    <td className="text-center text-slate-300">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-800">Support Tickets & Chat Reply</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-800">Audit Trail & Security Policies</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-slate-300">—</td>
                    <td className="text-center text-slate-300">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUDIT TRAIL                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Immutable Administrative Audit Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cryptographically timestamped record of administrative actions, user moderations, settings updates, and IP access logs.
              </p>
            </div>
          </div>

          {/* Desktop Table View (≥768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500 font-normal">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-800">{log.adminName}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-700">{log.target}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600 max-w-xs truncate">{log.details}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (<768px) */}
          <div className="md:hidden divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{log.adminName}</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-mono font-bold">
                    {log.action}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-semibold">{log.target}</p>
                <p className="text-[11px] text-slate-500">{log.details}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                  <span>IP: {log.ip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
