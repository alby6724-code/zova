import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  ShieldCheck,
  MessageCircle,
  Tag,
  Smartphone,
  Home,
  Grid,
  Heart,
  ChevronDown,
  ArrowRight,
  Shield,
  CreditCard,
  Headphones,
  PlusCircle,
  X,
  Navigation,
  Crosshair,
  Upload,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Crown,
  Clock,
  CheckCircle2,
  Car,
  Tv,
  Armchair,
  Shirt,
  Briefcase,
  Wrench,
  DollarSign,
  Laptop,
  Check,
  Loader2,
} from 'lucide-react';
import { Listing, ListingCategory } from '../../types/index.js';
import { CATEGORIES, findCategory } from '../../constants/categories.js';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';
import { api } from '../../services/api.js';
import { AdDetailModal } from './AdDetailModal.js';
import { AuthModal } from './AuthModal.js';
import { MarketplaceChatModal } from './MarketplaceChatModal.js';
import { SubscriptionModal } from './SubscriptionModal.js';
import { ProfileCompletionModal } from './ProfileCompletionModal.js';
import { ChatInboxModal } from './ChatInboxModal.js';
import { compressImageToWebP } from '../../utils/imageCompressor.js';
import { Modal } from '../common/Modal.js';

interface StorefrontProps {
  listings: Listing[];
  onBackToAdmin?: () => void;
  onPostAd: (data: Partial<Listing>) => void;
}

// Popular Indian Cities with coordinates for radius filtering
const POPULAR_CITIES = [
  { name: 'All India', state: '', lat: null, lng: null },
  { name: 'Delhi NCR', state: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794 },
];

// Secondary promotional slides (Trustworthy Blue/Teal palette)
const PROMO_SLIDES = [
  {
    title: 'Get 10x More Buyer Inquiries',
    highlight: 'With Seller Pro',
    subtitle: 'Featured placement, top search priority, and verified badge for ambitious sellers.',
    badge: 'Paid Seller Plans',
    bg: 'from-[#0e2547] via-[#1b4b8f] to-[#0b6e99]',
    ctaText: 'Explore Pro Plans',
    action: 'subscription',
    icon: Sparkles,
  },
  {
    title: 'Instant Phone-Only Login',
    highlight: 'Zero Passwords Required',
    subtitle: 'Lightning-fast 6-digit OTP verification powered by MSG91 SMS infrastructure.',
    badge: '100% Secure & Frictionless',
    bg: 'from-[#0b6e99] via-[#153c73] to-[#1b4b8f]',
    ctaText: 'Post Your Ad Free',
    action: 'post',
    icon: PlusCircle,
  },
  {
    title: 'Safe Local Handshakes',
    highlight: 'Community Protection',
    subtitle: 'Inspect items in person in daylight, chat with verified profiles, and negotiate freely.',
    badge: 'Safety First',
    bg: 'from-[#1e3a5f] via-[#1b4b8f] to-[#102d54]',
    ctaText: 'Browse Categories',
    action: 'categories',
    icon: Grid,
  },
];

// Helper to calculate exact in-feed sponsored banner insertion indices
export const getBannerPositions = (total: number): { pos1: number; pos2: number } => {
  if (total <= 1) return { pos1: 0, pos2: 0 };
  if (total === 2) return { pos1: 0, pos2: 1 };
  if (total === 3) return { pos1: 0, pos2: 2 };
  if (total < 6) return { pos1: 1, pos2: total - 1 };
  const pos1 = Math.floor(total / 3);
  const pos2 = Math.floor((total / 3) * 2);
  return { pos1, pos2 };
};

export const Storefront: React.FC<StorefrontProps> = ({ listings = [], onPostAd }) => {
  const { user, role, switchRole, isAuthenticated, logout } = useAuth();
  const { companyName, tagline, footerCopyright, logoUrl } = useBranding();
  const firstLetter = companyName.trim().charAt(0).toUpperCase() || 'Z';
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Listing[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(1);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Search suggestions & mobile search bar state
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zova_recent_searches') || localStorage.getItem('zioee_recent_searches');
      return saved ? JSON.parse(saved) : ['iPhone', 'Royal Enfield', 'Apartment'];
    } catch {
      return ['iPhone', 'Royal Enfield', 'Apartment'];
    }
  });

  const saveRecentSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem('zova_recent_searches', JSON.stringify(next));
        localStorage.removeItem('zioee_recent_searches');
      } catch {}
      return next;
    });
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('zova_recent_searches');
      localStorage.removeItem('zioee_recent_searches');
    } catch {}
  };

  // Close suggestions on outside tap
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Compute live search suggestions (matching titles, categories, and recent searches)
  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) {
      return {
        listings: [],
        categories: [],
        recent: recentSearches,
      };
    }

    const matchingListings = listings
      .filter((l) => l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q))
      .slice(0, 6);

    const matchingCategories = CATEGORIES.filter((c) =>
      c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchingRecent = recentSearches.filter((item) =>
      item.toLowerCase().includes(q) && !matchingListings.some((l) => l.title.toLowerCase() === item.toLowerCase())
    );

    return {
      listings: matchingListings,
      categories: matchingCategories,
      recent: matchingRecent,
    };
  }, [searchQuery, listings, recentSearches]);

  const highlightMatch = (text: string, query: string) => {
    if (!query || !query.trim()) return text;
    const q = query.trim();
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <span key={i} className="font-extrabold text-brand-primary bg-blue-50 px-0.5 rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Modals
  const [showPostModal, setShowPostModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showChatInbox, setShowChatInbox] = useState(false);
  const [activeChat, setActiveChat] = useState<{
    sellerId: string;
    listingId?: string;
    promptOffer?: boolean;
    listingTitle?: string;
    listingPrice?: number;
  } | null>(null);

  // User pending ads and favorites
  const [myPendingAdsCount, setMyPendingAdsCount] = useState<number>(0);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Promotional Banner Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Location selector popover state
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [locationSearchInput, setLocationSearchInput] = useState('');
  const locationPickerRef = useRef<HTMLDivElement | null>(null);

  // Category chips scroll ref
  const categoryChipsRef = useRef<HTMLDivElement | null>(null);

  // Form Fields for Post Ad
  const [postTitle, setPostTitle] = useState('');
  const [postPrice, setPostPrice] = useState('');
  const [postCategory, setPostCategory] = useState<ListingCategory>('Mobiles');
  const [postCondition, setPostCondition] = useState<'New' | 'Used'>('Used');
  const [postLocation, setPostLocation] = useState(user?.city || 'Delhi NCR');
  const [postDescription, setPostDescription] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [isCompressingImages, setIsCompressingImages] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [postAdSuccessMessage, setPostAdSuccessMessage] = useState<string | null>(null);

  // Geolocation & Radius State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRadius, setSelectedRadius] = useState<number>(50); // 50 km default
  const [locationName, setLocationName] = useState<string>('All India');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Initialize location from localStorage or user profile
  useEffect(() => {
    try {
      const cached = localStorage.getItem('zova_user_location') || localStorage.getItem('zioee_user_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.name) {
          setLocationName(parsed.name);
          if (parsed.lat && parsed.lng) {
            setUserCoords({ lat: parsed.lat, lng: parsed.lng });
          }
          return;
        }
      }
      if (user?.city) {
        setLocationName(user.city);
      }
    } catch {
      // ignore storage parsing error
    }
  }, [user?.city]);

  // Auto-advance promo carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Fetch favorites and pending ads if user is logged in
  useEffect(() => {
    if (isAuthenticated) {
      api
        .getUserFavorites()
        .then((res) => {
          if (res.favorites) {
            setFavoriteIds(new Set(res.favorites.map((f: any) => f.listingId)));
          }
        })
        .catch(() => {});

      api
        .getMyAds()
        .then((res) => {
          if (res.listings) {
            const pending = res.listings.filter(
              (l: Listing) => l.status === 'Pending' || l.status === 'Flagged'
            );
            setMyPendingAdsCount(pending.length);
          }
        })
        .catch(() => {});
    } else {
      setFavoriteIds(new Set());
      setMyPendingAdsCount(0);
    }
  }, [isAuthenticated, user?.id]);

  // Click outside to close location popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationPickerRef.current && !locationPickerRef.current.contains(e.target as Node)) {
        setIsLocationPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real GPS Geolocation with OpenStreetMap Reverse Geocoding
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const city =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.suburb ||
              addr.state_district ||
              addr.county ||
              'Near Me';
            const state = addr.state || '';
            const resolvedName = state ? `${city}, ${state}` : city;

            setLocationName(resolvedName);
            localStorage.setItem(
              'zova_user_location',
              JSON.stringify({ lat: latitude, lng: longitude, name: resolvedName })
            );
            localStorage.removeItem('zioee_user_location');
          } else {
            throw new Error('Reverse geocode failed');
          }
        } catch {
          const fallbackName = `Current Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
          setLocationName(fallbackName);
          localStorage.setItem(
            'zova_user_location',
            JSON.stringify({ lat: latitude, lng: longitude, name: fallbackName })
          );
          localStorage.removeItem('zioee_user_location');
        } finally {
          setIsLocating(false);
          setIsLocationPickerOpen(false);
        }
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Unable to access your GPS position.';
        if (err.code === 1) {
          msg = 'GPS permission was denied. Please select your city manually.';
        } else if (err.code === 2) {
          msg = 'Location position unavailable. Please choose your city.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please select your city.';
        }
        setGeoError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSelectPresetLocation = (city: (typeof POPULAR_CITIES)[0]) => {
    if (city.lat && city.lng) {
      setUserCoords({ lat: city.lat, lng: city.lng });
      setLocationName(city.state ? `${city.name}, ${city.state}` : city.name);
      localStorage.setItem(
        'zova_user_location',
        JSON.stringify({
          lat: city.lat,
          lng: city.lng,
          name: city.state ? `${city.name}, ${city.state}` : city.name,
        })
      );
      localStorage.removeItem('zioee_user_location');
    } else {
      // All India
      setUserCoords(null);
      setLocationName('All India');
      localStorage.removeItem('zova_user_location');
      localStorage.removeItem('zioee_user_location');
    }
    setGeoError(null);
    setIsLocationPickerOpen(false);
  };

  const handleCustomLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationSearchInput.trim()) return;
    const name = locationSearchInput.trim();
    setLocationName(name);
    // Rough search for preset match
    const match = POPULAR_CITIES.find(
      (c) => c.name.toLowerCase().includes(name.toLowerCase()) && c.lat !== null
    );
    if (match && match.lat && match.lng) {
      setUserCoords({ lat: match.lat, lng: match.lng });
      localStorage.setItem('zova_user_location', JSON.stringify({ lat: match.lat, lng: match.lng, name }));
      localStorage.removeItem('zioee_user_location');
    } else {
      setUserCoords(null);
      localStorage.setItem('zova_user_location', JSON.stringify({ name }));
      localStorage.removeItem('zioee_user_location');
    }
    setLocationSearchInput('');
    setIsLocationPickerOpen(false);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  // Filter listings (using searchResults from API if a search was performed, otherwise base listings)
  const baseListings = searchResults !== null ? searchResults : listings;
  const filteredListings = baseListings
    .map((item) => {
      let distance = item.distanceKm;
      if (userCoords && item.coordinates) {
        distance = calculateDistance(
          userCoords.lat,
          userCoords.lng,
          item.coordinates.lat,
          item.coordinates.lng
        );
      }
      return { ...item, distanceKm: distance };
    })
    .filter((l) => {
      if (showOnlyFavorites && !favoriteIds.has(l.id)) {
        return false;
      }
      const matchesCat =
        selectedCategory === 'All' ||
        l.category === selectedCategory ||
        findCategory(l.category)?.name === selectedCategory ||
        findCategory(l.category)?.slug === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRadius =
        !userCoords || l.distanceKm === undefined || l.distanceKm <= selectedRadius;
      return matchesCat && matchesSearch && matchesRadius;
    })
    .sort((a, b) => {
      // Prioritize PRO sellers, then featured
      if (a.tier === 'PRO' && b.tier !== 'PRO') return -1;
      if (b.tier === 'PRO' && a.tier !== 'PRO') return 1;
      if (a.featured && !b.featured) return -1;
      if (b.featured && !a.featured) return 1;
      return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    });

  // Client-side WebP Image Compression Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 12 * 1024 * 1024; // 12MB before compression

    const selectedFiles = Array.from(files);
    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        setImageUploadError('Invalid format: Only JPG/JPEG, PNG, and WEBP images are allowed.');
        return;
      }
      if (file.size > maxSizeBytes) {
        setImageUploadError(`"${file.name}" exceeds the 12MB size limit.`);
        return;
      }
    }

    setIsCompressingImages(true);
    try {
      const compressedResults = await Promise.all(
        selectedFiles.map((file) => compressImageToWebP(file, 1600, 1600, 0.82))
      );
      setPostImages((prev) => [...prev, ...compressedResults]);
    } catch (err) {
      console.error('Failed to compress image files', err);
      setImageUploadError('Failed to process image files.');
    } finally {
      setIsCompressingImages(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPostImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverPhoto = (index: number) => {
    if (index === 0) return;
    setPostImages((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(index, 1);
      updated.unshift(item);
      return updated;
    });
  };

  // Post Ad Trigger with profile completion check
  const handleStartPostAd = () => {
    if (!isAuthenticated) {
      setAuthModalMode('login');
      setShowAuthModal(true);
      return;
    }
    if (!user?.name || !user?.city) {
      setShowProfileModal(true);
      return;
    }
    setShowPostModal(true);
  };

  const handleCreateAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postPrice) return;

    const defaultCover =
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
    const mainPhoto = postImages.length > 0 ? postImages[0] : defaultCover;

    onPostAd({
      title: postTitle.trim(),
      price: Number(postPrice),
      category: postCategory,
      condition: postCondition,
      location: postLocation.trim() || locationName || 'Delhi NCR',
      description: postDescription.trim() || `Genuine item for local sale on ${companyName}.`,
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
    setImageUploadError(null);
    setShowPostModal(false);

    setPostAdSuccessMessage(
      'Ad submitted successfully! It is now under review by our moderation team and will go live once approved.'
    );
    setMyPendingAdsCount((prev) => prev + 1);
    setTimeout(() => setPostAdSuccessMessage(null), 8000);
  };

  const handleToggleFavorite = async (listingId: string) => {
    if (!isAuthenticated) {
      setAuthModalMode('login');
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await api.toggleFavorite(listingId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (res.isFavorite) {
          next.add(listingId);
        } else {
          next.delete(listingId);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  const scrollCategoryChips = (direction: 'left' | 'right') => {
    if (categoryChipsRef.current) {
      const offset = direction === 'left' ? -260 : 260;
      categoryChipsRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const executeSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.getListings({ search: q });
      if (res && Array.isArray(res.data)) {
        setSearchResults(res.data);
      }
    } catch (err) {
      console.error('Search API request failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    if (selectedCategory !== 'All') {
      setSelectedCategory('All');
    }
    saveRecentSearch(searchQuery);
    setShowSuggestions(false);
    await executeSearch(searchQuery);
    const target = document.getElementById('recommendations-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setShowSuggestions(false);
  };

  const renderSuggestionsDropdown = (customClass = '') => {
    if (!showSuggestions) return null;
    const hasListings = suggestions.listings.length > 0;
    const hasCategories = suggestions.categories.length > 0;
    const hasRecent = suggestions.recent.length > 0;
    const isQueryEmpty = searchQuery.trim().length < 2;

    if (!hasListings && !hasCategories && !hasRecent && !isQueryEmpty) {
      return (
        <div
          ref={searchDropdownRef}
          className={`absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 text-center z-50 animate-in fade-in ${customClass}`}
        >
          <p className="text-xs text-slate-500 font-medium">
            No instant suggestions for &ldquo;<strong>{searchQuery}</strong>&rdquo;. Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Enter</kbd> to search all listings.
          </p>
        </div>
      );
    }

    return (
      <div
        ref={searchDropdownRef}
        data-testid="search-suggestions-dropdown"
        className={`absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 max-h-[70vh] overflow-y-auto animate-in fade-in ${customClass}`}
      >
        {/* RECENT SEARCHES */}
        {hasRecent && (
          <div className="p-2">
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Recent Searches
              </span>
              <button
                type="button"
                onClick={clearRecentSearches}
                className="text-slate-400 hover:text-rose-500 text-[10px] font-bold cursor-pointer"
              >
                Clear
              </button>
            </div>
            {suggestions.recent.map((term, i) => (
              <button
                key={`recent-${i}`}
                type="button"
                onClick={() => {
                  setSearchQuery(term);
                  saveRecentSearch(term);
                  setShowSuggestions(false);
                  executeSearch(term);
                  const target = document.getElementById('recommendations-section');
                  if (target) target.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full min-h-[44px] px-3 py-2 flex items-center justify-between rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {highlightMatch(term, searchQuery)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-medium">Search</span>
              </button>
            ))}
          </div>
        )}

        {/* MATCHING CATEGORIES */}
        {hasCategories && (
          <div className="p-2">
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-brand-primary" /> Categories
            </div>
            {suggestions.categories.map((cat) => (
              <button
                key={`cat-${cat.slug}`}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.name);
                  saveRecentSearch(cat.name);
                  setShowSuggestions(false);
                  setSearchQuery('');
                  setSearchResults(null);
                  const target = document.getElementById('recommendations-section');
                  if (target) target.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full min-h-[44px] px-3 py-2 flex items-center justify-between rounded-xl hover:bg-brand-primary-light/40 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-brand-primary-light text-brand-primary flex items-center justify-center shrink-0">
                    <Grid className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    Browse in <span className="text-brand-primary">{cat.name}</span>
                  </span>
                </div>
                <span className="text-[10px] bg-brand-primary-light text-brand-primary font-bold px-2 py-0.5 rounded-full">
                  Category
                </span>
              </button>
            ))}
          </div>
        )}

        {/* MATCHING LISTINGS */}
        {hasListings && (
          <div className="p-2">
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-brand-accent" /> Matching Listings
            </div>
            {suggestions.listings.map((item) => (
              <button
                key={`item-${item.id}`}
                type="button"
                onClick={() => {
                  saveRecentSearch(item.title);
                  setShowSuggestions(false);
                  setSelectedListing(item);
                }}
                className="w-full min-h-[48px] px-3 py-2 flex items-center justify-between gap-3 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Tag className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate leading-snug">
                      {highlightMatch(item.title, searchQuery)}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {item.category} • {item.location}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-brand-primary shrink-0">
                  ₹{item.price.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-brand-bg text-brand-textPrimary flex flex-col font-sans pb-16 md:pb-0">
      {/* Top Notification / Pending Ads Banner */}
      {postAdSuccessMessage && (
        <div className="bg-brand-success text-white px-4 sm:px-6 py-3 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in w-full">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full min-w-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
            <span className="truncate">{postAdSuccessMessage}</span>
          </div>
          <button
            onClick={() => setPostAdSuccessMessage(null)}
            className="text-white/80 hover:text-white ml-2 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isAuthenticated && myPendingAdsCount > 0 && !postAdSuccessMessage && (
        <div className="bg-slate-100 border-b border-slate-200 text-slate-800 px-4 sm:px-6 py-2 text-xs font-medium flex items-center justify-between w-full">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full min-w-0">
            <Clock className="w-4 h-4 text-brand-primary shrink-0" />
            <span className="truncate">
              You have <strong>{myPendingAdsCount}</strong> listing(s) pending admin review.
              They will appear live once reviewed.
            </span>
          </div>
        </div>
      )}

      {/* =========================================================================
          1. ZOVA HEADER
          Logo + Location Picker + Wide Search Bar + Heart/Grow/Profile + "+ SELL"
         ========================================================================= */}
      <header className="bg-white border-b border-brand-border sticky top-0 z-30 shadow-xs w-full max-w-full">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-4 w-full min-w-0">
          {/* Brand Logo */}
          <div
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none group shrink-0"
            onClick={() => {
              setSelectedCategory('All');
              setShowOnlyFavorites(false);
              setSearchQuery('');
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-8 sm:h-10 object-contain shrink-0" />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-primary group-hover:bg-brand-primary-hover transition-colors shrink-0">
                {firstLetter}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-lg sm:text-2xl font-black text-brand-textPrimary tracking-tight leading-none">
                {companyName}
              </span>
              <span className="text-[9px] text-brand-textSecondary font-bold uppercase tracking-wider hidden sm:inline mt-0.5">
                {tagline}
              </span>
            </div>
          </div>

          {/* Location Selector (OLX Style) */}
          <div className="relative shrink-0 hidden md:block">
            <button
              type="button"
              onClick={() => setIsLocationPickerOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-brand-border rounded-xl text-xs font-bold text-brand-textPrimary transition-all max-w-[170px] truncate cursor-pointer"
              title="Change your city or area"
            >
              <MapPin className="w-4 h-4 text-brand-primary shrink-0" />
              <span className="truncate">{locationName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
          </div>

          {/* Desktop Center Search Bar (OLX Style with live suggestions) */}
          <div className="relative flex-1 max-w-2xl min-w-0 mx-1 sm:mx-2 hidden md:block">
            <form
              onSubmit={handleSearchSubmit}
              id="header-search-form"
              data-testid="header-search-form"
              className="relative flex items-center bg-slate-50 hover:bg-white focus-within:bg-white border border-brand-border focus-within:border-brand-primary rounded-xl transition-all shadow-inner w-full min-w-0"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 ml-2.5 sm:ml-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Find Cars, Mobiles, Laptops..."
                data-testid="header-search-input"
                className="w-full min-w-0 py-2 sm:py-2.5 px-2 sm:px-3 text-xs sm:text-sm bg-transparent focus:outline-none text-brand-textPrimary placeholder:text-brand-textSecondary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  data-testid="header-search-clear-btn"
                  className="p-1 text-slate-400 hover:text-slate-600 mr-1 shrink-0 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                data-testid="header-search-btn"
                className="h-full px-3 sm:px-4 min-h-[40px] bg-brand-primary hover:bg-brand-primary-hover text-white rounded-r-[10px] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="Search listings"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
                )}
              </button>
              {renderSuggestionsDropdown()}
            </form>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Mobile Search Toggle Button */}
            <button
              type="button"
              onClick={() => setShowMobileSearch((prev) => !prev)}
              data-testid="mobile-search-toggle-btn"
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 md:hidden ${
                showMobileSearch
                  ? 'bg-brand-primary text-white'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
              }`}
              title="Toggle search bar"
              aria-label="Toggle search bar"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Grow / Premium Ads Button */}
            <button
              onClick={() => navigate('/premium')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-amber-200"
              title="Boost your ads with Premium placement"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Grow</span>
            </button>

            {/* Wishlist / Favorites Heart Button */}
            <button
              onClick={() => setShowOnlyFavorites((prev) => !prev)}
              className={`relative p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                showOnlyFavorites
                  ? 'bg-brand-accent-light text-brand-accent border border-brand-accent/30'
                  : 'text-brand-textPrimary hover:bg-slate-100 border border-transparent'
              }`}
              title={showOnlyFavorites ? 'Show all listings' : 'Show saved wishlist'}
            >
              <Heart
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${
                  favoriteIds.size > 0 || showOnlyFavorites
                    ? 'fill-brand-accent text-brand-accent'
                    : 'text-slate-500'
                }`}
              />
              <span className="hidden sm:inline">Wishlist</span>
              {favoriteIds.size > 0 && (
                <span className="bg-brand-accent text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-sm leading-none">
                  {favoriteIds.size}
                </span>
              )}
            </button>

            {/* Chat Inbox Button (Desktop & Tablet) */}
            <button
              onClick={() => setShowChatInbox(true)}
              id="header-chat-btn"
              data-testid="header-chat-btn"
              className="relative p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold text-brand-textPrimary hover:bg-slate-100 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Messages & Offers"
            >
              <MessageCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600" />
              <span className="hidden sm:inline">Chat</span>
              {unreadChatCount > 0 && (
                <span className="bg-brand-accent text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-sm leading-none">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* User Profile / Login */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-left transition-colors shrink-0"
                  title="Edit Profile"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || 'User'}
                      className="w-7 h-7 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="text-xs font-bold text-brand-textPrimary max-w-[90px] truncate hidden md:inline">
                    {user.name || user.phone}
                  </span>
                </button>
                <button
                  onClick={logout}
                  className="px-2 py-1.5 text-xs font-bold text-slate-400 hover:text-brand-danger rounded-lg transition-colors hidden sm:inline shrink-0"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                }}
                data-testid="header-login-btn"
                className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-bold text-brand-textPrimary hover:text-brand-primary rounded-xl hover:bg-slate-100 transition-colors shrink-0 whitespace-nowrap"
              >
                Login
              </button>
            )}

            {/* Signature Pill-Shaped "+ POST AD / SELL" Button (Coral Accent #FF5A5F - Maximum Visual Weight) */}
            <button
              onClick={handleStartPostAd}
              id="header-sell-btn"
              data-testid="header-post-ad-btn"
              className="min-h-[44px] px-3 sm:px-6 py-1.5 sm:py-2 rounded-full bg-brand-accent hover:bg-brand-accent-hover text-white font-black text-xs sm:text-sm tracking-wide shadow-cta hover:shadow-lg flex items-center gap-1 sm:gap-1.5 transition-all transform active:scale-95 shrink-0 cursor-pointer border-2 border-white/25 whitespace-nowrap"
              title="Post an ad for free"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[3] shrink-0" />
              <span className="sr-only">SELL</span>
              <span>POST AD</span>
            </button>
          </div>
        </div>

        {/* Mobile Expandable Full-Width Search Row */}
        {showMobileSearch && (
          <div className="md:hidden px-3 pb-3 pt-1 border-t border-slate-100 bg-white animate-in slide-in-from-top duration-200">
            <form
              onSubmit={handleSearchSubmit}
              id="mobile-header-search-form"
              data-testid="mobile-header-search-form"
              className="relative flex items-center bg-slate-50 border border-brand-border focus-within:border-brand-primary rounded-xl transition-all shadow-inner w-full min-w-0"
            >
              <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Find Cars, Mobiles, Laptops..."
                data-testid="mobile-header-search-input"
                className="w-full min-w-0 py-2.5 px-2.5 text-xs bg-transparent focus:outline-none text-brand-textPrimary placeholder:text-brand-textSecondary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1 text-slate-400 hover:text-slate-600 mr-1 shrink-0 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                data-testid="mobile-header-search-btn"
                className="h-full px-3.5 min-h-[38px] bg-brand-primary text-white rounded-r-[10px] flex items-center justify-center shrink-0 cursor-pointer"
                title="Search listings"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 stroke-[2.5]" />}
              </button>
              {renderSuggestionsDropdown()}
            </form>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HORIZONTAL SCROLLABLE CATEGORY CHIPS (Directly Below Header, Image 2)
         ========================================================================= */}
      <section className="bg-white border-b border-brand-border shadow-xs relative w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 relative flex items-center w-full min-w-0">
          {/* Desktop Left Scroll Arrow */}
          <button
            type="button"
            onClick={() => scrollCategoryChips('left')}
            className="hidden md:flex w-7 h-7 rounded-full bg-white shadow-md border border-brand-border text-slate-600 hover:text-brand-primary items-center justify-center shrink-0 mr-1 z-10"
            title="Scroll categories left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Chips Container with strict horizontal scrolling */}
          <div
            ref={categoryChipsRef}
            className="flex items-center gap-1.5 sm:gap-2 horizontal-scroll-container no-scrollbar py-2.5 select-none flex-1 min-w-0 overflow-x-auto"
          >
            {/* All Categories Chip */}
            <button
              onClick={() => {
                setSelectedCategory('All');
                setShowOnlyFavorites(false);
              }}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCategory === 'All' && !showOnlyFavorites
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>All Categories</span>
            </button>

            {/* Category Chips from canonical list */}
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const isCurrent = selectedCategory === c.name || selectedCategory === c.slug;
              return (
                <button
                  key={c.slug}
                  onClick={() => {
                    setSelectedCategory(c.name);
                    setShowOnlyFavorites(false);
                  }}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : c.textColor}`} />
                  <span>{c.name}</span>
                </button>
              );
            })}

            {/* Explore All Link */}
            <button
              onClick={() => navigate('/categories')}
              className="shrink-0 px-3 py-1.5 text-xs font-bold text-brand-primary hover:underline flex items-center gap-0.5 ml-1"
            >
              <span>More</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Right Scroll Gradient Fade Edge */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent md:hidden" />

          {/* Desktop Right Scroll Arrow */}
          <button
            type="button"
            onClick={() => scrollCategoryChips('right')}
            className="hidden md:flex w-7 h-7 rounded-full bg-white shadow-md border border-brand-border text-slate-600 hover:text-brand-primary items-center justify-center shrink-0 ml-1 z-10"
            title="Scroll categories right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* =========================================================================
          3. TOP HERO BANNER (Matching Reference Image 1)
          "Buy & Sell Anything, Anytime" + Search bar + 4 Trust Badges + Phone Mockup
         ========================================================================= */}
      <section className="relative w-full max-w-full overflow-hidden bg-gradient-to-br from-[#0e2547] via-[#1b4b8f] to-[#0b6e99] text-white py-10 sm:py-14 select-none">
        {/* Subtle background ambient blur (strictly constrained) */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 w-full min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full min-w-0">
            {/* Left Column: Headlines, Search Bar & Trust Badges */}
            <div className="lg:col-span-7 space-y-5 text-center lg:text-left w-full min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>India's Verified Local Marketplace</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15]">
                Buy &amp; Sell Anything, <br className="hidden sm:inline" />
                <span className="text-sky-200">
                  Anytime.
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Discover great deals in your neighborhood or turn your unused items into fast cash
                today. Connect directly with verified buyers &amp; sellers with zero commission fees.
              </p>

              {/* Integrated Hero Multi-Field Search Bar */}
              <form
                onSubmit={handleSearchSubmit}
                id="hero-search-form"
                data-testid="hero-search-form"
                className="relative bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl max-w-xl mx-auto lg:mx-0 w-full min-w-0"
              >
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full min-w-0">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl flex-1 w-full min-w-0 text-brand-textPrimary">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      placeholder="What are you looking for? e.g. iPhone, Car..."
                      data-testid="hero-search-input"
                      className="w-full min-w-0 text-xs font-semibold focus:outline-none bg-transparent"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 bg-white/95 rounded-xl text-brand-textPrimary w-full sm:w-auto shrink-0">
                    <MapPin className="w-4 h-4 text-brand-primary shrink-0" />
                    <span className="text-xs font-bold truncate max-w-[120px]">{locationName}</span>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocating}
                      className="text-[10px] text-brand-primary font-extrabold hover:underline ml-1 cursor-pointer"
                      title="Auto detect GPS location"
                    >
                      {isLocating ? '...' : 'Near Me'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    id="hero-search-btn"
                    data-testid="hero-search-btn"
                    className="w-full sm:w-auto px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white font-black text-xs rounded-xl shadow-cta transition-transform active:scale-95 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>Search</span>
                  </button>
                </div>
                {renderSuggestionsDropdown('text-slate-900')}
              </form>

              {/* 4 Trust Badges (Image 1 reference) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2 w-full min-w-0">
                <div className="flex items-center gap-2 text-left bg-white/10 border border-white/15 rounded-xl p-2.5 backdrop-blur-sm min-w-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-300 shrink-0" />
                  <div className="min-w-0">
                    <h5 className="text-[11px] font-bold text-white leading-tight truncate">100% Verified</h5>
                    <p className="text-[9px] text-slate-200 truncate">Phone OTP login</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-left bg-white/10 border border-white/15 rounded-xl p-2.5 backdrop-blur-sm min-w-0">
                  <Tag className="w-5 h-5 text-sky-300 shrink-0" />
                  <div className="min-w-0">
                    <h5 className="text-[11px] font-bold text-white leading-tight truncate">Free To Post</h5>
                    <p className="text-[9px] text-slate-200 truncate">Zero commission</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-left bg-white/10 border border-white/15 rounded-xl p-2.5 backdrop-blur-sm min-w-0">
                  <MessageCircle className="w-5 h-5 text-cyan-300 shrink-0" />
                  <div className="min-w-0">
                    <h5 className="text-[11px] font-bold text-white leading-tight truncate">Live Chat &amp; Offer</h5>
                    <p className="text-[9px] text-slate-200 truncate">Voice &amp; GPS share</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-left bg-white/10 border border-white/15 rounded-xl p-2.5 backdrop-blur-sm min-w-0">
                  <Shield className="w-5 h-5 text-teal-300 shrink-0" />
                  <div className="min-w-0">
                    <h5 className="text-[11px] font-bold text-white leading-tight truncate">Admin Moderated</h5>
                    <p className="text-[9px] text-slate-200 truncate">Quality screened</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: App Phone Mockup Graphic with Floating Category Icons (strictly contained) */}
            <div className="lg:col-span-5 hidden lg:flex items-center justify-center relative overflow-visible">
              {/* Floating Category Badges orbiting the phone mockup */}
              <div className="absolute -top-3 -left-4 z-20 bg-white text-slate-900 px-3.5 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold">Cars &amp; Bikes</span>
              </div>

              <div className="absolute top-16 -right-4 z-20 bg-white text-slate-900 px-3.5 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold">Mobiles</span>
              </div>

              <div className="absolute bottom-16 -left-4 z-20 bg-white text-slate-900 px-3.5 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Armchair className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold">Furniture</span>
              </div>

              <div className="absolute -bottom-3 -right-2 z-20 bg-white text-slate-900 px-3.5 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Laptop className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold">Laptops</span>
              </div>

              {/* Stylized Smartphone Mockup Container */}
              <div className="w-64 h-[350px] bg-slate-900 rounded-[36px] p-2.5 border-4 border-slate-700/80 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                {/* Phone Speaker Notch */}
                <div className="w-20 h-3.5 bg-slate-800 rounded-full mx-auto mb-1 shrink-0" />

                {/* Mockup App Screen */}
                <div className="bg-slate-50 text-slate-900 rounded-[26px] p-3 flex-1 flex flex-col justify-between overflow-hidden shadow-inner">
                  {/* Mockup Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-brand-primary text-white font-black text-[10px] flex items-center justify-center">
                        {firstLetter}
                      </div>
                      <span className="text-[11px] font-extrabold text-brand-textPrimary">{companyName}</span>
                    </div>
                    <span className="text-[9px] font-bold text-brand-primary bg-brand-primary-light px-1.5 py-0.5 rounded-md">
                      Live
                    </span>
                  </div>

                  {/* Mockup Listing Card */}
                  <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-sm my-1 space-y-1.5">
                    <div className="relative h-24 rounded-lg bg-slate-100 overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400"
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 left-1 bg-brand-success text-white text-[8px] font-bold px-1.5 py-0.2 rounded">
                        New
                      </span>
                      <span className="absolute top-1 right-1 bg-brand-primary text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded">
                        PRO
                      </span>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-brand-textPrimary leading-tight">
                        Apple iPhone 14 Pro 128GB
                      </h4>
                      <p className="text-xs font-black text-brand-primary mt-0.5">₹54,999</p>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>Delhi NCR</span>
                        <span className="text-brand-success font-bold flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Verified
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mockup Action Button */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <div className="py-1.5 bg-brand-primary text-white rounded-lg text-center font-bold text-[9px]">
                      Chat Now
                    </div>
                    <div className="py-1.5 bg-brand-accent text-white rounded-lg text-center font-bold text-[9px]">
                      Make Offer
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. SECONDARY PROMO CAROUSEL (Image 2 style)
         ========================================================================= */}
      <section
        className="bg-slate-900 text-white relative w-full max-w-full overflow-hidden select-none"
        aria-label="Promotional Carousel"
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {PROMO_SLIDES.map((slide, idx) => {
            const SlideIcon = slide.icon;
            return (
              <div
                key={idx}
                className={`w-full shrink-0 bg-gradient-to-r ${slide.bg} py-6 sm:py-8 px-12 sm:px-16 pb-11 sm:pb-12`}
              >
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 w-full min-w-0">
                  <div className="space-y-1.5 text-center sm:text-left min-w-0">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold backdrop-blur-xs">
                      <span>{slide.badge}</span>
                    </div>
                    <h3 className="text-base sm:text-xl font-extrabold tracking-tight text-white truncate">
                      {slide.title} — <span className="text-sky-200">{slide.highlight}</span>
                    </h3>
                    <p className="text-xs text-white/90 max-w-xl">{slide.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-center sm:justify-end">
                    {slide.ctaText && (
                      <button
                        type="button"
                        onClick={() => {
                          if (slide.action === 'subscription') setShowSubscriptionModal(true);
                          else if (slide.action === 'post') handleStartPostAd();
                          else navigate('/categories');
                        }}
                        className="min-h-[42px] px-4 sm:px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white font-black text-xs sm:text-sm rounded-xl shadow-cta flex items-center gap-2 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                      >
                        {SlideIcon && <SlideIcon className="w-4 h-4 text-white shrink-0" />}
                        <span>{slide.ctaText}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSubscriptionModal(true)}
                      className="min-h-[42px] px-4 sm:px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs sm:text-sm rounded-xl shadow-md border border-white/80 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <Crown className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                      <span>3 Plans</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel navigation arrows */}
        <button
          type="button"
          onClick={() =>
            setCurrentSlide((prev) => (prev > 0 ? prev - 1 : PROMO_SLIDES.length - 1))
          }
          aria-label="Previous Slide"
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] min-h-[40px] rounded-full bg-slate-950/80 hover:bg-slate-900 active:scale-90 text-white border border-white/30 shadow-xl flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length)}
          aria-label="Next Slide"
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] min-h-[40px] rounded-full bg-slate-950/80 hover:bg-slate-900 active:scale-90 text-white border border-white/30 shadow-xl flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
        </button>

        {/* Carousel slide indicators / dots */}
        <div className="absolute bottom-3 sm:bottom-4 inset-x-0 z-20 flex items-center justify-center gap-2">
          {PROMO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className="p-1.5 flex items-center justify-center cursor-pointer focus:outline-none"
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  currentSlide === idx
                    ? 'w-7 sm:w-8 h-2.5 sm:h-3 bg-brand-accent shadow-cta border border-white/60'
                    : 'w-2.5 sm:w-3 h-2.5 sm:h-3 bg-white/70 hover:bg-white shadow-xs border border-black/25'
                }`}
              />
            </button>
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. CATEGORY ICON GRID (12 Categories, Image 2 style)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-brand-textPrimary">Explore Categories</h2>
            <p className="text-xs text-brand-textSecondary mt-0.5">Find verified deals in popular categories</p>
          </div>
          <button
            onClick={() => navigate('/categories')}
            className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1"
          >
            View All Categories <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3 sm:gap-4">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const isSelected = selectedCategory === c.name;
            return (
              <button
                key={c.slug}
                onClick={() => {
                  setSelectedCategory(c.name);
                  setShowOnlyFavorites(false);
                }}
                className={`flex flex-col items-center gap-2 p-2.5 rounded-2xl transition-all group text-center border ${
                  isSelected
                    ? 'bg-brand-primary-light border-brand-primary/40 shadow-xs'
                    : 'bg-white border-brand-border hover:border-brand-primary/40 hover:shadow-card'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl ${c.bgColor} ${c.textColor} flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-brand-textPrimary group-hover:text-brand-primary transition-colors line-clamp-1">
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          6. MAIN CONTENT AREA: Listings Feed + Filters + Sidebar
         ========================================================================= */}
      <section id="recommendations-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-2 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left / Center: Listings Grid */}
        <div className="lg:col-span-8 space-y-4 min-w-0">
          {/* Feed Header & Controls Row */}
          <div className="flex flex-col gap-3.5 pb-4 border-b border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {searchQuery
                    ? `Search Results for "${searchQuery}"`
                    : showOnlyFavorites
                    ? 'Your Saved Wishlist'
                    : selectedCategory !== 'All'
                    ? `${selectedCategory} Deals`
                    : 'Fresh Recommendations'}
                </h2>
                <span
                  data-testid="recommendations-count-badge"
                  className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs"
                >
                  {filteredListings.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Clear Search button — shown when a search query is active */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    data-testid="clear-search-btn"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear Search
                  </button>
                )}
                {/* View All / See More Button */}
                <button
                  type="button"
                  onClick={() => navigate('/categories')}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-brand-primary border border-brand-primary/30 hover:border-brand-primary font-black text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  title="Browse full catalog with filters"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom Row: Clickable Location Chip + Radius Segmented Control + Reset */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Clickable Location Chip */}
              <button
                type="button"
                onClick={() => setIsLocationPickerOpen(true)}
                className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-sky-50 text-slate-900 border border-slate-300 hover:border-brand-primary/40 font-bold transition-all shadow-2xs group cursor-pointer"
                title="Click to choose a specific city or use GPS"
              >
                <MapPin className="w-4 h-4 text-brand-primary shrink-0" />
                <span>
                  Near <strong className="text-brand-primary font-black underline decoration-dotted underline-offset-2">{locationName}</strong>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-primary group-hover:translate-y-0.5 transition-transform" />
              </button>

              {/* Segmented Pill Group for Radius (25 km / 50 km / 100 km) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-300">
                  <span className="text-[11px] font-extrabold text-slate-700 pl-2 pr-1 flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5 text-brand-primary" /> Radius:
                  </span>
                  {[25, 50, 100].map((km) => {
                    const isActive = selectedRadius === km;
                    return (
                      <button
                        key={km}
                        type="button"
                        onClick={() => {
                          setSelectedRadius(km);
                          if (!userCoords) {
                            setIsLocationPickerOpen(true);
                          }
                        }}
                        className={`min-h-[40px] px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                          isActive
                            ? 'bg-brand-primary text-white shadow-primary'
                            : 'bg-white hover:bg-slate-200 text-slate-900 border border-slate-200 shadow-2xs'
                        }`}
                        title={`Show ads within ${km} km of your location`}
                      >
                        {km} km
                      </button>
                    );
                  })}
                </div>

                {(selectedCategory !== 'All' || showOnlyFavorites || searchQuery || userCoords !== null) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setShowOnlyFavorites(false);
                      setSearchQuery('');
                      setUserCoords(null);
                      setLocationName('All India');
                      localStorage.removeItem('zioee_user_location');
                    }}
                    className="min-h-[40px] px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredListings.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-brand-border shadow-xs flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-brand-primary-light text-brand-primary rounded-2xl flex items-center justify-center">
                <Tag className="w-8 h-8" />
              </div>
              {searchQuery ? (
                <>
                  <h3 className="text-base font-bold text-slate-900">
                    No listings found for &ldquo;{searchQuery}&rdquo;
                  </h3>
                  <p className="text-xs text-slate-500">Try a different search term or browse all categories.</p>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="min-h-[44px] px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold text-sm shadow-primary transition-all active:scale-95 cursor-pointer"
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <div className="max-w-md">
                    <h3 className="text-base sm:text-lg font-bold text-brand-textPrimary">
                      {showOnlyFavorites ? 'No Saved Items' : 'No Listings Found'}
                    </h3>
                    <p className="text-xs text-brand-textSecondary mt-1">
                      {showOnlyFavorites
                        ? 'Click the heart icon on any listing to save it to your wishlist.'
                        : searchQuery || selectedCategory !== 'All'
                        ? 'No items matched your current filters. Try broadening your search or changing the radius.'
                        : `Be the first to post an ad on ${companyName}! Reach local buyers looking for items like yours.`}
                    </p>
                  </div>
                  <button
                    onClick={handleStartPostAd}
                    className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-primary transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Post an Ad on {companyName}
                  </button>
                </>
              )}
            </div>
          ) : (
            /* Listings Grid with Exactly 2 In-Feed Ad Banners */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredListings.map((item, index) => {
                  const isItemFavorited = favoriteIds.has(item.id);
                  const { pos1, pos2 } = getBannerPositions(filteredListings.length);
                  const isPos1 = index === pos1;
                  const isPos2 = index === pos2;

                  return (
                    <React.Fragment key={item.id}>
                      {/* Product Card */}
                      <div
                        onClick={() => setSelectedListing(item)}
                        className="bg-white rounded-2xl overflow-hidden border border-brand-border shadow-xs hover:shadow-card transition-all flex flex-col group cursor-pointer hover:border-brand-primary"
                      >
                        {/* Listing Image + Badges */}
                        <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Condition badge */}
                          <span
                            className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                              item.condition === 'New'
                                ? 'bg-brand-success text-white'
                                : 'bg-slate-900/80 text-white backdrop-blur-sm'
                            }`}
                          >
                            {item.condition}
                          </span>

                          {/* Tier / Featured badges */}
                          <div className="absolute top-2.5 left-16 flex items-center gap-1">
                            {item.tier === 'PRO' && (
                              <span className="px-2 py-0.5 rounded-full bg-[#0e2547] text-white font-extrabold text-[9px] shadow uppercase tracking-wide border border-white/20">
                                PRO
                              </span>
                            )}
                            {item.featured && (
                              <span className="px-2 py-0.5 rounded-full bg-brand-primary text-white font-bold text-[9px] shadow flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> Featured
                              </span>
                            )}
                          </div>

                          {item.distanceKm !== undefined && (
                            <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-900/80 text-white backdrop-blur-sm text-[10px] font-semibold flex items-center gap-1 shadow">
                              <MapPin className="w-3 h-3 text-sky-400" />
                              {item.distanceKm} km
                            </span>
                          )}

                          {item.images && item.images.length > 1 && (
                            <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-900/80 text-white backdrop-blur-sm text-[10px] font-semibold flex items-center gap-1 shadow">
                              <ImageIcon className="w-3 h-3 text-sky-300" />
                              {item.images.length} photos
                            </span>
                          )}

                          {/* Heart Toggle */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(item.id);
                            }}
                            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
                              isItemFavorited
                                ? 'bg-brand-accent-light text-brand-accent scale-105'
                                : 'bg-white/90 hover:bg-white text-slate-600 hover:text-brand-accent'
                            }`}
                            title={isItemFavorited ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart className={`w-4 h-4 ${isItemFavorited ? 'fill-brand-accent' : ''}`} />
                          </button>
                        </div>

                        {/* Listing Info */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-brand-textPrimary group-hover:text-brand-primary transition-colors line-clamp-1">
                              {item.title}
                            </h3>
                            <p className="text-lg font-extrabold text-brand-textPrimary mt-1">
                              ₹{item.price.toLocaleString()}
                            </p>
                          </div>

                          <div className="mt-3 pt-3 border-t border-brand-border flex items-center justify-between text-[11px] text-brand-textSecondary">
                            <span className="flex items-center gap-1 truncate max-w-[130px]">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {item.location}
                            </span>
                            <span className="font-bold text-brand-primary group-hover:underline">
                              View Details &rarr;
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* In-Feed Sponsored Banner 1 */}
                      {isPos1 && (
                        <div
                          data-testid="in-feed-banner-1"
                          className="col-span-1 sm:col-span-2 md:col-span-3 my-2 sm:my-3 bg-gradient-to-r from-[#0e2547] via-[#1b4b8f] to-[#0b6e99] text-white rounded-2xl p-5 sm:p-7 shadow-lg border border-sky-800/60 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5"
                        >
                          <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-black/40 text-[9px] font-black uppercase tracking-wider text-sky-200 border border-white/20 backdrop-blur-xs">
                              Sponsored
                            </span>
                          </div>
                          <div className="space-y-1.5 text-center sm:text-left min-w-0 pr-0 sm:pr-8">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span>Seller Pro Spotlight</span>
                            </div>
                            <h3 className="text-base sm:text-xl font-black text-white tracking-tight">
                              Get 10x More Buyer Inquiries with Seller Pro
                            </h3>
                            <p className="text-xs text-sky-100 max-w-xl">
                              Enjoy verified seller badges, top search priority, and unlimited featured ad boosts starting at ₹199/month.
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-center sm:justify-end">
                            <button
                              type="button"
                              onClick={() => setShowSubscriptionModal(true)}
                              className="min-h-[42px] px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white font-black text-xs sm:text-sm rounded-xl shadow-cta transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                            >
                              <Sparkles className="w-4 h-4 text-white" />
                              <span>Explore Pro Plans</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowSubscriptionModal(true)}
                              className="min-h-[42px] px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs sm:text-sm rounded-xl shadow-md border border-white/80 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                            >
                              View 3 Plans
                            </button>
                          </div>
                        </div>
                      )}

                      {/* In-Feed Sponsored Banner 2 */}
                      {isPos2 && (
                        <div
                          data-testid="in-feed-banner-2"
                          className="col-span-1 sm:col-span-2 md:col-span-3 my-2 sm:my-3 bg-gradient-to-r from-[#0b6e99] via-[#153c73] to-[#102d54] text-white rounded-2xl p-5 sm:p-7 shadow-lg border border-sky-800/60 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5"
                        >
                          <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-black/40 text-[9px] font-black uppercase tracking-wider text-sky-200 border border-white/20 backdrop-blur-xs">
                              Ad
                            </span>
                          </div>
                          <div className="space-y-1.5 text-center sm:text-left min-w-0 pr-0 sm:pr-8">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                              <span>100% Free Classifieds</span>
                            </div>
                            <h3 className="text-base sm:text-xl font-black text-white tracking-tight">
                              Sell Anything in 60 Seconds — Zero Fees & Instant OTP
                            </h3>
                            <p className="text-xs text-sky-100 max-w-xl">
                              Direct phone negotiation, buyer WhatsApp connect, and lightning-fast local handshakes across India.
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-center sm:justify-end">
                            <button
                              type="button"
                              onClick={handleStartPostAd}
                              className="min-h-[42px] px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white font-black text-xs sm:text-sm rounded-xl shadow-cta transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                            >
                              <PlusCircle className="w-4 h-4 text-white" />
                              <span>Post Your Ad Free</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate('/categories')}
                              className="min-h-[42px] px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs sm:text-sm rounded-xl shadow-md border border-white/80 transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                            >
                              <Grid className="w-4 h-4 text-slate-800" />
                              <span>Browse Categories</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Bottom Catalog Action */}
              <div className="pt-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/categories')}
                  className="min-h-[44px] px-6 py-3 bg-white hover:bg-slate-50 text-brand-primary border-2 border-brand-primary/30 hover:border-brand-primary font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <span>Explore All {listings.length} Listings in Full Directory</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6 min-w-0">
          {/* Subscription Promo Card */}
          <div className="bg-gradient-to-tr from-[#0b1a30] to-[#152846] text-white rounded-2xl p-6 shadow-md border border-[#203a63] space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white font-extrabold text-[10px] tracking-wide uppercase border border-white/20">
                Seller Pro Plans
              </span>
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sell Faster with Pro Tiers</h3>
              <p className="text-xs text-slate-300 mt-1">
                Post up to unlimited ads with priority ranking &amp; verified badge starting at
                ₹199/month.
              </p>
            </div>
            <button
              onClick={() => setShowSubscriptionModal(true)}
              className="w-full py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white font-extrabold rounded-xl text-xs shadow-cta transition-all active:scale-95"
            >
              Explore 3-Tier Plans
            </button>
          </div>

          {/* Sell in 3 Easy Steps */}
          <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-xs space-y-4">
            <h3 className="text-base font-bold text-brand-textPrimary">Post Ads in 3 Steps</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-primary text-white font-bold flex items-center justify-center text-[11px]">
                  1
                </span>
                <span className="font-semibold text-brand-textPrimary">Upload clear WebP photos</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-primary text-white font-bold flex items-center justify-center text-[11px]">
                  2
                </span>
                <span className="font-semibold text-brand-textPrimary">Set fair price &amp; location</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-primary text-white font-bold flex items-center justify-center text-[11px]">
                  3
                </span>
                <span className="font-semibold text-brand-textPrimary">Admin reviews &amp; publishes</span>
              </div>
            </div>
            <button
              onClick={handleStartPostAd}
              className="w-full py-3 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold rounded-xl text-xs shadow-primary transition-all active:scale-95"
            >
              Post Your Ad Free
            </button>
          </div>

          {/* Safety & Trust Card */}
          <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-xs space-y-3 text-xs">
            <h3 className="text-base font-bold text-brand-textPrimary">Why Trade With Us?</h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-brand-textPrimary">Phone-Only Security</h4>
                  <p className="text-brand-textSecondary text-[11px]">100% verified mobile sellers via OTP.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CreditCard className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-brand-textPrimary">Direct Chat &amp; Call</h4>
                  <p className="text-brand-textSecondary text-[11px]">No middlemen, deal directly with locals.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Headphones className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-brand-textPrimary">Admin Ad Moderation</h4>
                  <p className="text-brand-textSecondary text-[11px]">Every ad is screened for quality &amp; safety.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
          8. FOOTER
         ========================================================================= */}
      <footer className="bg-[#0b1a30] text-slate-400 py-8 border-t border-[#152846] mt-auto w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs font-semibold w-full min-w-0">
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-sky-400" /> Admin Moderated
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <Tag className="w-4 h-4 text-sky-400" /> Free Listings
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <Navigation className="w-4 h-4 text-sky-400" /> GPS Nearby Search
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white font-extrabold text-sm">
              {firstLetter}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-base font-black text-white leading-none">{companyName}</span>
              <span className="text-[10px] text-slate-400">
                {footerCopyright}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Navigation Bar – Home | Browse | Chat | Plans | Profile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-brand-border shadow-2xl px-1 py-1.5 flex items-center justify-around w-full max-w-full">
        {/* Home */}
        <button
          onClick={() => {
            setSelectedCategory('All');
            setShowOnlyFavorites(false);
          }}
          className={`min-w-[44px] min-h-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            selectedCategory === 'All' && !showOnlyFavorites
              ? 'bg-brand-primary-light text-brand-primary font-black shadow-xs'
              : 'text-slate-600 hover:text-brand-primary font-bold'
          } text-[10px]`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        {/* Browse */}
        <button
          onClick={() => navigate('/categories')}
          className="min-w-[44px] min-h-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-600 hover:text-brand-primary font-bold text-[10px] transition-colors cursor-pointer"
        >
          <Grid className="w-5 h-5" />
          <span>Browse</span>
        </button>

        {/* Chat */}
        <button
          id="mobile-nav-chat-btn"
          data-testid="mobile-nav-chat-btn"
          onClick={() => {
            setUnreadChatCount(0);
            setShowChatInbox(true);
          }}
          className="relative min-w-[44px] min-h-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-600 hover:text-brand-primary font-bold text-[10px] transition-colors cursor-pointer"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5" />
            {unreadChatCount > 0 && (
              <span
                data-testid="mobile-chat-badge"
                className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-brand-accent text-white font-black text-[9px] flex items-center justify-center shadow-xs"
              >
                {unreadChatCount}
              </span>
            )}
          </div>
          <span>Chat</span>
        </button>

        {/* Grow / Premium Ads */}
        <button
          onClick={() => navigate('/premium')}
          className="min-w-[44px] min-h-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-amber-600 hover:text-amber-700 font-bold text-[10px] transition-colors cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Grow</span>
        </button>

        {/* Profile / Login */}
        <button
          onClick={() => {
            if (isAuthenticated) {
              setShowProfileModal(true);
            } else {
              setAuthModalMode('login');
              setShowAuthModal(true);
            }
          }}
          className="min-w-[44px] min-h-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-600 hover:text-brand-primary font-bold text-[10px] transition-colors cursor-pointer"
        >
          <UserIcon className="w-5 h-5" />
          <span>{isAuthenticated ? 'Profile' : 'Login'}</span>
        </button>
      </div>

      {/* =========================================================================
          MODALS
         ========================================================================= */}
      {/* Customer Post Ad Modal */}
      <Modal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        maxWidthClass="max-w-xl"
        showCloseButton={false}
        className="p-6 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-brand-border">
          <div className="flex items-center gap-2 text-brand-primary">
            <PlusCircle className="w-5 h-5" />
            <h3 className="text-base font-bold text-brand-textPrimary">Post an Ad on {companyName}</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowPostModal(false)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Close post ad modal"
            data-testid="modal-close-button"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

            <div className="p-2.5 bg-brand-primary-light border border-brand-primary/20 rounded-xl text-brand-primary text-[11px] mt-3">
              ℹ️ All ads undergo instant admin verification before appearing on the public marketplace.
            </div>

            <form onSubmit={handleCreateAd} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-brand-textPrimary mb-1">Ad Title</label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Apple iPhone 14 or Royal Enfield Classic 350"
                  className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-brand-textPrimary mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={postPrice}
                    onChange={(e) => setPostPrice(e.target.value)}
                    placeholder="12000"
                    className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-brand-textPrimary mb-1">Category</label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value as ListingCategory)}
                    className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
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
                  <label className="block font-semibold text-brand-textPrimary mb-1">Condition</label>
                  <select
                    value={postCondition}
                    onChange={(e) => setPostCondition(e.target.value as 'New' | 'Used')}
                    className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                  >
                    <option value="Used">Used</option>
                    <option value="New">New</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-brand-textPrimary mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={postLocation}
                    onChange={(e) => setPostLocation(e.target.value)}
                    placeholder="e.g. Connaught Place, Delhi"
                    className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-brand-textPrimary mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  placeholder="Describe your item, warranty, bill, accessories included..."
                  className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Multi-Photo Upload Section with WebP Compression */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-brand-textPrimary">
                    Photos ({postImages.length} selected)
                  </label>
                  <span className="text-[10px] text-brand-textSecondary">
                    Auto-compressed to WebP for fast loading
                  </span>
                </div>

                <div className="border-2 border-dashed border-brand-border hover:border-brand-primary rounded-2xl p-4 text-center transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    id="ad-photo-upload"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="ad-photo-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-brand-primary-light text-brand-primary flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-brand-primary hover:underline">
                      {isCompressingImages ? 'Compressing photos...' : 'Click to select photos'}
                    </span>
                    <span className="text-[11px] text-slate-400">Select one or multiple images</span>
                  </label>
                </div>

                {imageUploadError && (
                  <p className="text-[11px] text-brand-danger font-semibold">{imageUploadError}</p>
                )}

                {postImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {postImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden aspect-square border border-brand-border shadow-2xs bg-slate-100"
                      >
                        <img
                          src={img}
                          alt={`Upload ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 ? (
                          <span className="absolute top-1 left-1 bg-brand-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            Cover
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetCoverPhoto(idx)}
                            className="absolute top-1 left-1 bg-slate-900/70 hover:bg-brand-primary text-white text-[9px] font-semibold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Set as cover photo"
                          >
                            Set Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-brand-danger text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border mt-5">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="min-h-[44px] px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCompressingImages}
                  className="min-h-[44px] px-6 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl font-black text-xs sm:text-sm shadow-cta active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  Submit for Review
                </button>
              </div>
            </form>
      </Modal>

      {/* Ad Detail Modal (With Make Offer + Chat integration) */}
      <AdDetailModal
        listing={selectedListing}
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        isFavorited={selectedListing ? favoriteIds.has(selectedListing.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onOpenChat={(sellerId, listingId, promptOffer) => {
          setActiveChat({
            sellerId,
            listingId,
            promptOffer: !!promptOffer,
            listingTitle: selectedListing?.title,
            listingPrice: selectedListing?.price,
          });
        }}
      />

      {/* Customer Auth Modal (Phone + OTP) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSuccess={() => {
          setShowProfileModal(false);
          setShowPostModal(true);
        }}
      />

      {/* 3-Tier Horizontal Carousel Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />

      {/* Chat Inbox Modal (Buying & Selling Conversations) */}
      <ChatInboxModal
        isOpen={showChatInbox}
        onClose={() => setShowChatInbox(false)}
        onBrowseAds={() => {
          const target = document.getElementById('recommendations-section');
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        }}
        onPostAd={handleStartPostAd}
        onSelectThread={(thread) => {
          const currentUserId = user?.id || 'usr-1';
          const isSeller = thread.sellerId === currentUserId;
          const counterpartId = isSeller
            ? (thread.buyerId || thread.user?.id || 'usr-buyer')
            : (thread.sellerId || 'usr-seller');

          setActiveChat({
            sellerId: counterpartId,
            listingId: thread.listingId,
            listingTitle: thread.listingTitle,
            listingPrice: thread.listingPrice,
            promptOffer: false,
          });
        }}
      />

      {/* User-to-User Chat Modal (With Voice, Location, Offer Negotiation & Safety Banner) */}
      {activeChat && (
        <MarketplaceChatModal
          isOpen={!!activeChat}
          onClose={() => setActiveChat(null)}
          onBackToInbox={() => {
            setActiveChat(null);
            setShowChatInbox(true);
          }}
          sellerId={activeChat.sellerId}
          listingId={activeChat.listingId}
          listingTitle={activeChat.listingTitle}
          listingPrice={activeChat.listingPrice}
          initialOfferPrompt={activeChat.promptOffer}
        />
      )}

      {/* Global Location Selector Modal (Desktop & Mobile) */}
      <Modal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        maxWidthClass="max-w-md"
        showCloseButton={false}
        className="p-5 relative space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary-light text-brand-primary flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Choose Your Location</h3>
              <p className="text-[11px] text-slate-500">Find ads and verified sellers nearby</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsLocationPickerOpen(false)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close location selector"
            data-testid="modal-close-button"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

            {/* GPS Detection Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-primary-light hover:bg-sky-100 text-brand-primary border border-brand-primary/20 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              <Navigation
                className={`w-4 h-4 text-brand-primary ${isLocating ? 'animate-spin' : ''}`}
              />
              <span>{isLocating ? 'Detecting GPS Location...' : 'Use Current Location (GPS)'}</span>
            </button>

            {geoError && (
              <p className="text-xs text-brand-danger font-medium px-1">⚠️ {geoError}</p>
            )}

            {/* Custom City Search Input Form */}
            <form onSubmit={handleCustomLocationSubmit} className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Search City or State</label>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus-within:border-brand-primary focus-within:bg-white transition-all">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={locationSearchInput}
                  onChange={(e) => setLocationSearchInput(e.target.value)}
                  placeholder="e.g. Mumbai, Bengaluru, Delhi NCR..."
                  className="w-full bg-transparent focus:outline-none text-slate-900 font-medium"
                />
                {locationSearchInput && (
                  <button
                    type="submit"
                    className="text-xs font-bold text-brand-primary hover:underline px-2"
                  >
                    Set
                  </button>
                )}
              </div>
            </form>

            {/* Popular Cities Grid */}
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                Popular Cities in India
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {POPULAR_CITIES.map((city) => {
                  const isSelected =
                    locationName === city.name ||
                    (city.state && locationName === `${city.name}, ${city.state}`);
                  return (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => handleSelectPresetLocation(city)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-brand-primary text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <span className="truncate">{city.name}</span>
                      {city.state && (
                        <span
                          className={`text-[10px] truncate ml-1 ${
                            isSelected ? 'text-white/80' : 'text-slate-400'
                          }`}
                        >
                          {city.state}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
      </Modal>
    </div>
  );
};
