import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CompanySettings } from '../types/index.js';
import { api } from '../services/api.js';

export const DEFAULT_BRANDING: CompanySettings = {
  companyName: 'ZOVA',
  tagline: "India's Verified Local Marketplace",
  description: 'Buy and sell cars, mobiles, electronics, furniture, and local services with zero commission fees on ZOVA.',
  supportEmail: 'support@zova.com',
  supportPhone: '+91 98765 43210',
  websiteName: 'ZOVA',
  footerCopyright: `© ${new Date().getFullYear()} ZOVA. All rights reserved.`,
  logoUrl: '',
  faviconText: 'Z',
  updatedAt: new Date().toISOString(),
};

interface BrandingContextType {
  branding: CompanySettings;
  companyName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  websiteName: string;
  footerCopyright: string;
  logoUrl?: string;
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
  updateBranding: (updates: Partial<CompanySettings>) => Promise<CompanySettings>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<CompanySettings>(() => {
    // Try reading cached settings from localStorage for instant 0ms render
    try {
      const cached = localStorage.getItem('zova_branding') || localStorage.getItem('zioeemarket_branding');
      if (cached) {
        return { ...DEFAULT_BRANDING, ...JSON.parse(cached) };
      }
    } catch {
      // Ignore parse error
    }
    return DEFAULT_BRANDING;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Apply browser document title and dynamic favicon
  const applyBrandingToDocument = useCallback((settings: CompanySettings) => {
    if (typeof document === 'undefined') return;

    // 1. Dynamic Document Title
    const name = settings.companyName || DEFAULT_BRANDING.companyName;
    const tag = settings.tagline || DEFAULT_BRANDING.tagline;
    document.title = `${name} — ${tag}`;

    // 2. Dynamic SVG Favicon with first letter of company name
    const firstLetter = name.trim().charAt(0).toUpperCase() || 'Z';
    const svgFavicon = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='48' fill='%230284c7'/><text x='50' y='68' font-size='50' font-weight='900' fill='white' text-anchor='middle'>${firstLetter}</text></svg>`;

    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = settings.logoUrl || svgFavicon;

    // 3. Dynamic meta tags
    const metaDesc = document.querySelector("meta[name='description']");
    if (metaDesc && settings.description) {
      metaDesc.setAttribute('content', settings.description);
    }
    const ogSiteName = document.querySelector("meta[property='og:site_name']");
    if (ogSiteName) {
      ogSiteName.setAttribute('content', name);
    }
  }, []);

  const refreshBranding = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getPublicSettings();
      if (res && res.settings) {
        setBranding((prev) => {
          const merged = { ...prev, ...res.settings };
          try {
            localStorage.setItem('zova_branding', JSON.stringify(merged));
            localStorage.removeItem('zioeemarket_branding'); // cleanup legacy key
          } catch {}
          return merged;
        });
        applyBrandingToDocument(res.settings);
      }
    } catch (err) {
      console.warn('Failed to load branding settings from API, using fallback defaults:', err);
    } finally {
      setIsLoading(false);
    }
  }, [applyBrandingToDocument]);

  useEffect(() => {
    applyBrandingToDocument(branding);
    refreshBranding();
  }, [refreshBranding]);

  const updateBranding = async (updates: Partial<CompanySettings>): Promise<CompanySettings> => {
    const res = await api.updateAdminSettings(updates);
    if (res && res.settings) {
      setBranding(res.settings);
      try {
        localStorage.setItem('zioeemarket_branding', JSON.stringify(res.settings));
      } catch {}
      applyBrandingToDocument(res.settings);
      return res.settings;
    }
    throw new Error('Failed to update branding settings.');
  };

  return (
    <BrandingContext.Provider
      value={{
        branding,
        companyName: branding.companyName || DEFAULT_BRANDING.companyName,
        tagline: branding.tagline || DEFAULT_BRANDING.tagline,
        supportEmail: branding.supportEmail || DEFAULT_BRANDING.supportEmail,
        supportPhone: branding.supportPhone || DEFAULT_BRANDING.supportPhone,
        websiteName: branding.websiteName || DEFAULT_BRANDING.websiteName,
        footerCopyright:
          branding.footerCopyright ||
          `© ${new Date().getFullYear()} ${branding.companyName || DEFAULT_BRANDING.companyName}. All rights reserved.`,
        logoUrl: branding.logoUrl,
        isLoading,
        refreshBranding,
        updateBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = (): BrandingContextType => {
  const context = useContext(BrandingContext);
  if (!context) {
    return {
      branding: DEFAULT_BRANDING,
      companyName: DEFAULT_BRANDING.companyName,
      tagline: DEFAULT_BRANDING.tagline,
      supportEmail: DEFAULT_BRANDING.supportEmail,
      supportPhone: DEFAULT_BRANDING.supportPhone,
      websiteName: DEFAULT_BRANDING.websiteName,
      footerCopyright: DEFAULT_BRANDING.footerCopyright,
      logoUrl: DEFAULT_BRANDING.logoUrl,
      isLoading: false,
      refreshBranding: async () => {},
      updateBranding: async (updates) => ({ ...DEFAULT_BRANDING, ...updates }),
    };
  }
  return context;
};

