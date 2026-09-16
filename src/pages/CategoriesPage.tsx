import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ArrowRight,
  PlusCircle,
  Home as HomeIcon,
  ChevronRight,
  Tag,
  Grid,
  Sparkles,
} from 'lucide-react';
import { Listing, ListingCategory } from '../types/index.js';
import { CATEGORIES, findCategory } from '../constants/categories.js';
import { AuthModal } from '../components/marketplace/AuthModal.js';
import { useAuth } from '../context/AuthContext.js';
import { useBranding } from '../context/BrandingContext.js';
import { Modal } from '../components/common/Modal.js';

interface CategoriesPageProps {
  listings: Listing[];
  onPostAd: (listingData: Partial<Listing>) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ listings = [], onPostAd }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { companyName } = useBranding();

  const [searchQuery, setSearchQuery] = useState('');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Categories Dropdown in Header
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement | null>(null);

  // Post form state
  const [postTitle, setPostTitle] = useState('');
  const [postPrice, setPostPrice] = useState('');
  const [postCategory, setPostCategory] = useState<ListingCategory>('Mobiles');
  const [postCondition, setPostCondition] = useState<'New' | 'Used'>('Used');
  const [postLocation, setPostLocation] = useState('Kolkata, West Bengal');
  const [postDescription, setPostDescription] = useState('');

  // Click outside to close categories dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setIsCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live count for each category from real listings
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORIES.forEach((c) => {
      counts[c.slug] = 0;
    });

    (listings || []).forEach((l) => {
      const match = findCategory(l.category);
      if (match) {
        counts[match.slug] = (counts[match.slug] || 0) + 1;
      }
    });

    return counts;
  }, [listings]);

  // Filter categories by search input
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES;
    const q = searchQuery.toLowerCase().trim();
    return CATEGORIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.aliases.some((a) => a.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Handle Post Ad
  const handleCreateAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postPrice) return;

    const defaultCover =
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';

    onPostAd({
      title: postTitle.trim(),
      price: Number(postPrice),
      category: postCategory,
      condition: postCondition,
      location: postLocation.trim() || 'Kolkata, West Bengal',
      description: postDescription.trim() || `Genuine item for sale on ${companyName}.`,
      sellerId: user?.id,
      sellerName: user?.name || user?.phone || 'Verified Seller',
      sellerPhone: user?.phone,
      image: defaultCover,
      images: [defaultCover],
    });

    setPostTitle('');
    setPostPrice('');
    setPostDescription('');
    setShowPostModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 select-none group shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
              Z
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                ZOVA
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5 hidden sm:inline">
                Verified Local Marketplace
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700">
            <Link to="/" className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors">
              <HomeIcon className="w-4 h-4 text-slate-400" /> Home
            </Link>

            {/* Categories Dropdown */}
            <div className="relative" ref={catDropdownRef}>
              <button
                onClick={() => setIsCatDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-blue-600 font-bold hover:text-blue-700 transition-colors"
              >
                <Tag className="w-4 h-4 text-blue-600" />
                <span>Categories</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCatDropdownOpen && (
                <div className="absolute left-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Browse Categories
                  </div>
                  <div className="space-y-1">
                    {CATEGORIES.map((c) => {
                      const Icon = c.icon;
                      return (
                        <button
                          key={c.slug}
                          onClick={() => {
                            setIsCatDropdownOpen(false);
                            navigate(`/category/${c.slug}`);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 text-slate-700 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-lg ${c.bgColor} ${c.textColor} flex items-center justify-center shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{c.name}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                } else {
                  setShowPostModal(true);
                }
              }}
              className="flex items-center gap-1.5 hover:text-blue-600 text-slate-600 transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-slate-400" /> Sell Your Item
            </button>
          </nav>

          {/* User Auth State */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'Z'}
                </div>
                <div className="flex flex-col text-left hidden sm:flex">
                  <span className="text-xs font-bold text-slate-900 leading-tight max-w-[130px] truncate">
                    {user.name || user.phone || 'Member'}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> Verified Member
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                }}
                className="px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 rounded-xl hover:bg-slate-100 transition-colors shrink-0 whitespace-nowrap"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('signup');
                  setShowAuthModal(true);
                }}
                className="px-3 sm:px-5 py-1.5 sm:py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] shrink-0 whitespace-nowrap"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-slate-500">
          <Link to="/" className="hover:text-blue-600 flex items-center gap-1">
            <HomeIcon className="w-3.5 h-3.5" /> Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="font-bold text-slate-800">All Categories</span>
        </div>
      </div>

      {/* Hero Header */}
      <section className="bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 py-12 px-6 border-b border-sky-100">
        <div className="max-w-7xl mx-auto text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100/80 text-blue-700 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Marketplace Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Explore All Categories
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Discover genuine local deals, verified community sellers, and authentic items across Kolkata.
          </p>

          {/* Search Categories */}
          <div className="mt-6 relative max-w-md mx-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter categories (e.g. mobiles, laptops, vehicles)..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 shadow-sm transition-all"
            />
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((c) => {
            const Icon = c.icon;
            const count = categoryCounts[c.slug] || 0;

            return (
              <div
                key={c.slug}
                onClick={() => navigate(`/category/${c.slug}`)}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-blue-300 hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl ${c.bgColor} ${c.textColor} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                      {count} {count === 1 ? 'Ad' : 'Ads'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {c.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                  <span>Browse {c.name}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm font-bold text-slate-700">No categories found matching "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs font-bold text-blue-600 hover:underline"
            >
              Clear Search
            </button>
          </div>
        )}
      </main>

      {/* Post Ad Modal */}
      <Modal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        maxWidthClass="max-w-lg"
        showCloseButton={false}
        className="p-6 my-8 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-600">
            <PlusCircle className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">Post an Ad on {companyName}</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowPostModal(false)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Close post ad modal"
            data-testid="modal-close-button"
          >
            <span className="text-lg font-bold">✕</span>
          </button>
        </div>

            <form onSubmit={handleCreateAd} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ad Title</label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Royal Enfield Classic 350 or Apple iPhone 14"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={postPrice}
                    onChange={(e) => setPostPrice(e.target.value)}
                    placeholder="120000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value as ListingCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.slug} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Condition</label>
                  <select
                    value={postCondition}
                    onChange={(e) => setPostCondition(e.target.value as 'New' | 'Used')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Used">Used</option>
                    <option value="New">New</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={postLocation}
                    onChange={(e) => setPostLocation(e.target.value)}
                    placeholder="e.g. Park Street, Kolkata"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  placeholder="Provide genuine details..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all active:scale-[0.99]"
              >
                Publish Ad
              </button>
            </form>
      </Modal>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />
    </div>
  );
};
