import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ArrowLeft,
  MapPin,
  Tag,
  SlidersHorizontal,
  X,
  PlusCircle,
  Eye,
  Heart,
  Share2,
  CheckCircle,
  Home as HomeIcon,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Listing, ListingCategory } from '../types/index.js';
import { findCategory, CATEGORIES } from '../constants/categories.js';
import { AdDetailModal } from '../components/marketplace/AdDetailModal.js';
import { AuthModal } from '../components/marketplace/AuthModal.js';
import { useAuth } from '../context/AuthContext.js';
import { useBranding } from '../context/BrandingContext.js';
import { Modal } from '../components/common/Modal.js';

interface CategoryPageProps {
  listings: Listing[];
  onPostAd: (listingData: Partial<Listing>) => void;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({ listings = [], onPostAd }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();
  const { companyName } = useBranding();

  // Resolve category definition from slug
  const category = useMemo(() => findCategory(slug), [slug]);

  // Search & Filter State
  const initialSearch = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedSort, setSelectedSort] = useState<'newest' | 'price_asc' | 'price_desc' | 'views'>('newest');
  const [selectedCondition, setSelectedCondition] = useState<'all' | 'New' | 'Used'>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Modals
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Header Categories dropdown state
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement | null>(null);

  // Post form state
  const [postTitle, setPostTitle] = useState('');
  const [postPrice, setPostPrice] = useState('');
  const [postCondition, setPostCondition] = useState<'New' | 'Used'>('Used');
  const [postLocation, setPostLocation] = useState('Kolkata, West Bengal');
  const [postDescription, setPostDescription] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);

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

  // Sync search query with URL search param
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchQuery(q);
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextParams = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      nextParams.set('q', searchQuery.trim());
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams);
  };

  // Filter listings strictly matching this category and active filters
  const filteredListings = useMemo(() => {
    if (!category) return [];

    return (listings || [])
      .filter((l) => {
        // Category check (matches category name, slug, or aliases)
        const itemCat = findCategory(l.category);
        if (!itemCat || itemCat.slug !== category.slug) {
          return false;
        }

        // Search query check
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesTitle = l.title.toLowerCase().includes(q);
          const matchesDesc = l.description.toLowerCase().includes(q);
          const matchesLocation = l.location.toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc && !matchesLocation) {
            return false;
          }
        }

        // Condition check
        if (selectedCondition !== 'all' && l.condition !== selectedCondition) {
          return false;
        }

        // Price check
        const price = l.price;
        if (minPrice && price < Number(minPrice)) return false;
        if (maxPrice && price > Number(maxPrice)) return false;

        // Location check
        if (selectedLocation !== 'all' && !l.location.toLowerCase().includes(selectedLocation.toLowerCase())) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === 'price_asc') return a.price - b.price;
        if (selectedSort === 'price_desc') return b.price - a.price;
        if (selectedSort === 'views') return b.views - a.views;
        // Default newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [listings, category, searchQuery, selectedCondition, minPrice, maxPrice, selectedLocation, selectedSort]);

  // Handle Ad Creation
  const handleCreateAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postPrice || !category) return;

    const defaultCover =
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
    const mainPhoto = postImages.length > 0 ? postImages[0] : defaultCover;

    onPostAd({
      title: postTitle.trim(),
      price: Number(postPrice),
      category: category.name as ListingCategory,
      condition: postCondition,
      location: postLocation.trim() || 'Kolkata, West Bengal',
      description: postDescription.trim() || `Genuine item for sale in ${category.name} on ${companyName}.`,
      sellerId: user?.id,
      sellerName: user?.name || user?.phone || 'Verified Seller',
      sellerPhone: user?.phone,
      image: mainPhoto,
      images: postImages.length > 0 ? postImages : [mainPhoto],
    });

    setPostTitle('');
    setPostPrice('');
    setPostDescription('');
    setPostImages([]);
    setShowPostModal(false);
  };

  // If invalid category slug
  if (!category) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <Tag className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Category Not Found</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          The category you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/categories"
          className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
        >
          View All Categories
        </Link>
      </div>
    );
  }

  const CategoryIcon = category.icon;

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
                      const isActive = c.slug === category.slug;
                      return (
                        <button
                          key={c.slug}
                          onClick={() => {
                            setIsCatDropdownOpen(false);
                            navigate(`/category/${c.slug}`);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
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
                  <div className="pt-2 mt-2 border-t border-slate-100">
                    <Link
                      to="/categories"
                      onClick={() => setIsCatDropdownOpen(false)}
                      className="w-full py-2 text-center text-xs font-bold text-blue-600 hover:text-blue-700 block"
                    >
                      View All Categories →
                    </Link>
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
              <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'Z'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-tight max-w-[90px] sm:max-w-[130px] truncate">
                    {user.name || user.phone || 'Member'}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold items-center gap-1 hidden sm:flex">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> Verified Member
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="px-2 sm:px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                }}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('signup');
                  setShowAuthModal(true);
                }}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
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
          <Link to="/categories" className="hover:text-blue-600">
            Categories
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="font-bold text-slate-800">{category.name}</span>
        </div>
      </div>

      {/* Category Hero Banner */}
      <section className="bg-gradient-to-r from-slate-900 to-blue-950 text-white py-10 px-6 border-b border-blue-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl ${category.bgColor} ${category.textColor} flex items-center justify-center shadow-xl shrink-0`}>
              <CategoryIcon className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-2">
                <span>Verified Local Category</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{category.name}</h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                {category.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/15 text-center">
              <span className="text-2xl font-black text-white">{filteredListings.length}</span>
              <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider mt-0.5">Ads Available</p>
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
              className="px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" /> Post Ad in {category.name}
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1">
        {/* Search & Sort Controls Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category-Specific Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search within ${category.name} (e.g. iPhone, Dell, Honda)...`}
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-50 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  const next = new URLSearchParams(searchParams);
                  next.delete('q');
                  setSearchParams(next);
                }}
                className="absolute right-16 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-0.5"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
            >
              Search
            </button>
          </form>

          {/* Sort Selector */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-end">
            <button
              onClick={() => setShowFiltersMobile((prev) => !prev)}
              className="md:hidden flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" /> Filters
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold shrink-0">Sort:</span>
              <select
                value={selectedSort}
                onChange={(e: any) => setSelectedSort(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="views">Most Popular</option>
              </select>
            </div>
          </div>
        </div>

        {/* Layout: Sidebar Filters + Listings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar Filters */}
          <aside className={`lg:col-span-3 space-y-6 ${showFiltersMobile ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Filters</h3>
                </div>
                {(selectedCondition !== 'all' || minPrice || maxPrice || selectedLocation !== 'all') && (
                  <button
                    onClick={() => {
                      setSelectedCondition('all');
                      setMinPrice('');
                      setMaxPrice('');
                      setSelectedLocation('all');
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Condition Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Condition
                </label>
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  {(['all', 'Used', 'New'] as const).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setSelectedCondition(cond)}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        selectedCondition === cond
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cond === 'all' ? 'All' : cond}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Price Range (₹)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Location Area
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="all">All Locations</option>
                  <option value="Salt Lake">Salt Lake, Sector V</option>
                  <option value="Park Street">Park Street, Central</option>
                  <option value="Ballygunge">Ballygunge, South</option>
                  <option value="Howrah">Howrah Station Area</option>
                  <option value="New Town">New Town, Rajarhat</option>
                </select>
              </div>

              {/* Other Categories Quick Links */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Other Categories
                </label>
                <div className="space-y-1">
                  {CATEGORIES.filter((c) => c.slug !== category.slug).slice(0, 5).map((c) => {
                    const Icon = c.icon;
                    return (
                      <Link
                        key={c.slug}
                        to={`/category/${c.slug}`}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.name}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                      </Link>
                    );
                  })}
                  <Link
                    to="/categories"
                    className="block text-[11px] font-bold text-blue-600 hover:underline pt-2 pl-2"
                  >
                    View All Categories →
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Area: Listings Grid or Empty State */}
          <main className="lg:col-span-9">
            {filteredListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((listing) => (
                  <div
                    key={listing.id}
                    onClick={() => setSelectedListing(listing)}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                  >
                    <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                      <img
                        src={listing.image}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm text-slate-800 rounded-lg text-[10px] font-bold shadow-sm">
                          {listing.condition}
                        </span>
                        {listing.featured && (
                          <span className="px-2.5 py-1 bg-amber-400 text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-3 right-3 bg-slate-900/70 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{listing.views}</span>
                      </div>
                    </div>

                    <div className="p-4 flex flex-col flex-1 justify-between">
                      <div>
                        <div className="text-lg font-black text-slate-900 mb-1">
                          ₹ {listing.price.toLocaleString()}
                        </div>
                        <h3 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {listing.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                          {listing.description}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1 truncate max-w-[150px]">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{listing.location}</span>
                        </div>
                        <span className="font-semibold text-blue-600 hover:underline">
                          View Deal →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* REQUIREMENT 9: POLISHED EMPTY STATE */
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm max-w-lg mx-auto my-8">
                <div className={`w-16 h-16 rounded-3xl ${category.bgColor} ${category.textColor} flex items-center justify-center mx-auto mb-4 shadow-md`}>
                  <CategoryIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  No listings found in this category
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `No ads in ${category.name} matched "${searchQuery}". Try adjusting your search term or filters.`
                    : `Be the first to post an ad in ${category.name} on ${companyName}! Reach verified local buyers across Kolkata.`}
                </p>

                <div className="flex items-center justify-center gap-3 mt-6">
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        const next = new URLSearchParams(searchParams);
                        next.delete('q');
                        setSearchParams(next);
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                    >
                      Clear Search
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        setAuthModalMode('login');
                        setShowAuthModal(true);
                      } else {
                        setShowPostModal(true);
                      }
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" /> Post Ad in {category.name}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Ad Detail Modal */}
      {selectedListing && (
        <AdDetailModal
          listing={selectedListing}
          isOpen={!!selectedListing}
          onClose={() => setSelectedListing(null)}
          onOpenChat={(sellerId: string, listingId: string) => {
            alert(`Opening chat with seller for listing ${listingId}`);
          }}
        />
      )}

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
            <h3 className="text-base font-bold text-slate-900">Post Ad in {category.name}</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowPostModal(false)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Close post ad modal"
            data-testid="modal-close-button"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
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
                  placeholder={`e.g. Genuine item in ${category.name}`}
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
                    placeholder="15000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  placeholder="Provide details about condition, usage, and reason for selling..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all active:scale-[0.99]"
                >
                  Publish Ad in {category.name}
                </button>
              </div>
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
