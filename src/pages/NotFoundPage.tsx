import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Home, Grid, ArrowLeft, HelpCircle } from 'lucide-react';
import { CATEGORIES } from '../constants/categories.js';
import { useBranding } from '../context/BrandingContext.js';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { companyName, tagline, footerCopyright, logoUrl } = useBranding();
  const firstLetter = companyName.trim().charAt(0).toUpperCase() || 'Z';
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-textPrimary flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-brand-border sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 select-none group">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-9 sm:h-10 object-contain shrink-0" />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white font-black text-xl shadow-primary group-hover:bg-brand-primary-hover transition-colors">
                {firstLetter}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black text-brand-textPrimary tracking-tight leading-none">
                {companyName}
              </span>
              <span className="text-[9px] text-brand-textSecondary font-bold uppercase tracking-wider hidden sm:inline mt-0.5">
                {tagline}
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-blue-50 border border-blue-100 text-brand-primary flex items-center justify-center mb-6 shadow-inner">
          <HelpCircle className="w-10 h-10 stroke-[2.2]" />
        </div>

        <span className="px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black tracking-wider uppercase mb-3">
          Error 404 • Page Not Found
        </span>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Looking for Something Specific?
        </h1>

        <p className="text-sm text-slate-500 mt-2.5 max-w-md leading-relaxed">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        {/* Quick Search */}
        <form onSubmit={handleSearch} className="w-full max-w-md mt-6">
          <div className="relative flex items-center bg-white border border-slate-300 focus-within:border-brand-primary rounded-2xl shadow-xs overflow-hidden">
            <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cars, mobiles, electronics..."
              className="w-full px-3 py-3 text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400 font-medium"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs transition-colors shrink-0 cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>

        {/* Navigation Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Link
            to="/"
            className="min-h-[44px] px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-black text-xs sm:text-sm rounded-xl shadow-primary transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Go to Homepage</span>
          </Link>
          <Link
            to="/categories"
            className="min-h-[44px] px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Grid className="w-4 h-4 text-brand-primary" />
            <span>Browse All Categories</span>
          </Link>
        </div>

        {/* Popular Category Pills */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 w-full">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            Popular Categories in India
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.slice(0, 6).map((cat) => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="px-3 py-1.5 rounded-full bg-white hover:bg-blue-50 border border-slate-200 hover:border-brand-primary text-slate-700 hover:text-brand-primary text-xs font-semibold transition-all shadow-2xs"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        {footerCopyright}
      </footer>
    </div>
  );
};
