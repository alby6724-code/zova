import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Crown,
  Zap,
  CheckCircle2,
  ArrowLeft,
  Clock,
  Star,
  ShieldCheck,
  Package,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  Check,
  Flame,
  Globe,
  BarChart2,
} from 'lucide-react';
import { api } from '../services/api.js';
import { PremiumTier, PremiumPackage } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useBranding } from '../context/BrandingContext.js';

// ── Helpers ──
const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

// ── Types ──
interface Quote {
  tierId: string;
  tierName: string;
  adsCount: number;
  perAdPrice: number;
  discountPercent: number;
  totalPrice: number;
  currency: string;
}

interface PurchaseResult {
  orderId: string;
  amount: number;
  currency: string;
  tierName: string;
  packageName: string;
  adsCount: number;
  duration: string;
  city: string;
  category: string;
  email: string;
}

// ── Tier color palette ──
const getTierStyle = (idx: number) => {
  const palettes = [
    { gradient: 'from-indigo-600 to-violet-700', border: 'border-indigo-400', badge: 'bg-indigo-500', accent: 'text-indigo-200' },
    { gradient: 'from-amber-500 to-orange-600', border: 'border-amber-400', badge: 'bg-amber-400', accent: 'text-amber-100' },
    { gradient: 'from-emerald-600 to-teal-700', border: 'border-emerald-400', badge: 'bg-emerald-500', accent: 'text-emerald-200' },
    { gradient: 'from-rose-600 to-pink-700', border: 'border-rose-400', badge: 'bg-rose-500', accent: 'text-rose-200' },
    { gradient: 'from-sky-600 to-cyan-700', border: 'border-sky-400', badge: 'bg-sky-500', accent: 'text-sky-200' },
  ];
  return palettes[idx % palettes.length];
};

// ─── Purchase Flow Modal ───
interface PurchaseModalProps {
  packageItem?: PremiumPackage | null;
  quote?: Quote | null;
  tier: PremiumTier;
  onClose: () => void;
  onSuccess: (result: PurchaseResult) => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ packageItem, quote, tier, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [city, setCity] = useState(user?.city || '');
  const [category, setCategory] = useState('All Categories');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const displayPrice = packageItem ? packageItem.price : (quote?.totalPrice ?? 0);
  const displayAds = packageItem ? packageItem.adsCount : (quote?.adsCount ?? 0);
  const displayName = packageItem ? packageItem.name : `Custom ${displayAds} Ads Pack`;
  const displayDuration = packageItem ? `${packageItem.durationValue} ${packageItem.durationUnit}` : '1 Month';

  const handlePurchase = async () => {
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }
    setProcessing(true);
    setError('');
    try {
      const payload: any = { email, city: city || undefined, category: category || undefined, userId: user?.id };
      if (packageItem) {
        payload.packageId = packageItem.id;
      } else if (quote) {
        payload.tierId = quote.tierId;
        payload.adsCount = quote.adsCount;
      }
      const res = await api.purchasePackage(payload);
      if (res.success) {
        onSuccess(res as any);
      } else {
        setError('Purchase failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Purchase failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden"
        style={{ animation: 'fadeInScale 0.2s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-violet-200 uppercase tracking-wider">{tier.name}</p>
              <h3 className="text-lg font-black">{displayName}</h3>
            </div>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-black">{fmt(displayPrice)}</span>
          </div>
          <p className="text-xs text-violet-200 mt-1">{displayAds} Ad Credits · Valid {displayDuration}</p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seller@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 placeholder-slate-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">City / Area</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 bg-white"
              >
                {['All Categories', 'Mobiles', 'Vehicles', 'Real Estate', 'Electronics', 'Furniture', 'Fashion', 'Sports', 'Jobs', 'Services'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-xs text-slate-700 space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-500">Package</span><span className="font-bold">{displayName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Ad Credits</span><span className="font-bold">{displayAds} ads</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Validity</span><span className="font-bold">{displayDuration}</span></div>
            <div className="flex justify-between border-t border-violet-200 pt-1.5 mt-1.5">
              <span className="font-bold text-slate-800">Total</span>
              <span className="font-black text-violet-700 text-sm">{fmt(displayPrice)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={processing}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-black transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
              style={{ boxShadow: '0 4px 24px rgba(124,58,237,0.3)' }}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {processing ? 'Processing...' : 'Confirm Purchase'}
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-400">
            <ShieldCheck className="w-3 h-3 inline mr-1 text-emerald-500" />
            Secured · Price verified server-side · No hidden fees
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Success Modal ───
const SuccessModal: React.FC<{ result: PurchaseResult; onClose: () => void }> = ({ result, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
    <div
      className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 p-8 text-center"
      style={{ animation: 'fadeInScale 0.2s ease' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-1">Order Confirmed! 🎉</h3>
      <p className="text-sm text-slate-500 mb-6">
        Your <strong>{result.packageName}</strong> package for <strong>{result.tierName}</strong> has been activated.
      </p>
      <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2 mb-6">
        <div className="flex justify-between"><span className="text-slate-500">Order ID</span><span className="font-mono font-bold text-slate-700">{result.orderId.slice(-12)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Amount Paid</span><span className="font-black text-emerald-600">{result.currency}{result.amount.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Ad Credits</span><span className="font-bold text-slate-700">{result.adsCount} ads</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-bold text-slate-700">{result.duration}</span></div>
      </div>
      <button
        onClick={onClose}
        className="w-full px-4 py-3 rounded-xl text-white font-black text-sm transition-all"
        style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}
      >
        Back to Marketplace
      </button>
    </div>
  </div>
);

// ─── Custom Quote Builder ───
const DISCOUNT_TIERS = [
  { min: 3, disc: 5 }, { min: 6, disc: 10 }, { min: 12, disc: 15 }, { min: 20, disc: 20 }, { min: 28, disc: 25 },
];

const CustomBuilder: React.FC<{ tiers: PremiumTier[]; onPurchaseWithQuote: (q: Quote, t: PremiumTier) => void }> = ({ tiers, onPurchaseWithQuote }) => {
  const activeTiers = tiers.filter(t => t.active);
  const [tierId, setTierId] = useState(activeTiers[0]?.id || '');
  const [adsCount, setAdsCount] = useState(5);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchQuote = useCallback(async () => {
    if (!tierId || adsCount < 1) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getCustomQuote(tierId, adsCount);
      if (res.quote) setQuote(res.quote);
    } catch (err: any) {
      setError(err.message || 'Failed to get quote');
    } finally {
      setLoading(false);
    }
  }, [tierId, adsCount]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 400);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  const selectedTier = tiers.find(t => t.id === tierId);
  const maxAds = selectedTier?.maxCustomAds || 28;

  return (
    <div className="bg-slate-900 rounded-3xl p-8 border border-slate-700 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.15)' }}>
          <BarChart2 className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white">Custom Pack Builder</h3>
          <p className="text-xs text-slate-400">Build a custom ad pack — server calculates the final price with volume discounts</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Select Tier</label>
          <select
            value={tierId}
            onChange={e => setTierId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 font-semibold"
          >
            {activeTiers.map(t => (
              <option key={t.id} value={t.id}>{t.name} — ₹{t.perAdPrice}/ad</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
            Number of Ads <span className="text-amber-400 font-black ml-1">{adsCount}</span>
          </label>
          <input
            type="range"
            min={1}
            max={maxAds}
            value={adsCount}
            onChange={e => setAdsCount(Number(e.target.value))}
            className="w-full cursor-pointer"
            style={{ accentColor: '#f59e0b' }}
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>1</span><span>{Math.round(maxAds / 2)}</span><span>{maxAds}</span>
          </div>
        </div>
      </div>

      {/* Quote output */}
      <div className="bg-slate-800 rounded-2xl p-5 mb-5 min-h-[96px] flex items-center justify-center">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        ) : error ? (
          <p className="text-red-400 text-xs font-semibold">{error}</p>
        ) : quote ? (
          <div className="w-full grid sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[11px] text-slate-400 mb-1">Per Ad Price</p>
              <p className="text-xl font-black text-white">₹{quote.perAdPrice}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 mb-1">Volume Discount</p>
              <p className="text-xl font-black text-emerald-400">{quote.discountPercent}% OFF</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 mb-1">Total Price</p>
              <p className="text-2xl font-black text-amber-400">₹{quote.totalPrice.toLocaleString('en-IN')}</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Adjust the sliders to see your server-calculated quote</p>
        )}
      </div>

      {quote && selectedTier && (
        <button
          onClick={() => onPurchaseWithQuote(quote, selectedTier)}
          className="w-full px-4 py-3.5 rounded-xl text-slate-900 font-black text-sm transition-all flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 4px 20px rgba(245,158,11,0.25)' }}
        >
          <Zap className="w-5 h-5" /> Get {adsCount} Ads for {fmt(quote.totalPrice)}
        </button>
      )}

      {/* Volume discount ladder */}
      <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
        {DISCOUNT_TIERS.map(({ min, disc }) => (
          <div
            key={min}
            className="rounded-xl p-2 text-center text-[10px] border transition-all"
            style={adsCount >= min ? {
              background: 'rgba(16,185,129,0.12)',
              borderColor: 'rgba(16,185,129,0.4)',
              color: '#6ee7b7',
            } : {
              background: 'rgba(30,41,59,0.6)',
              borderColor: 'rgba(71,85,105,0.5)',
              color: '#64748b',
            }}
          >
            <p className="font-black text-sm">{disc}%</p>
            <p>≥{min} ads</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── FAQ ───
const FAQS = [
  { q: 'What are ad credits?', a: 'Ad credits let you publish premium featured listings on the ZOVA marketplace. Each credit = 1 ad placement for the duration of your pack.' },
  { q: 'How is my price determined?', a: 'Prices are calculated entirely server-side and never passed from your browser — protecting you from manipulation. Volume discounts are applied automatically.' },
  { q: 'Can I choose specific cities or categories?', a: 'Yes. During checkout you can target a specific city and category for maximum relevance and reach.' },
  { q: 'How soon do ads go live?', a: 'Immediately after purchase. Your ads enter the moderation queue and are typically live within minutes.' },
  { q: 'What happens if I need more ads mid-pack?', a: 'You can purchase additional packs at any time. Each pack runs independently for its own validity period.' },
];

const FAQItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-700 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <span className="font-bold text-white text-sm">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5 pt-2 text-sm text-slate-300 bg-slate-800/30">{a}</div>}
    </div>
  );
};

// ─── Main Page ───
export const PremiumAdsPage: React.FC = () => {
  const navigate = useNavigate();
  const { companyName } = useBranding();

  const [tiers, setTiers] = useState<PremiumTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [purchasePkg, setPurchasePkg] = useState<PremiumPackage | null>(null);
  const [purchaseQuote, setPurchaseQuote] = useState<Quote | null>(null);
  const [purchaseTier, setPurchaseTier] = useState<PremiumTier | null>(null);
  const [successResult, setSuccessResult] = useState<PurchaseResult | null>(null);
  const [activeTierIdx, setActiveTierIdx] = useState(0);

  const loadTiers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPublicTiers();
      if (res.tiers) setTiers(res.tiers);
    } catch {
      setError('Failed to load packages. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTiers(); }, [loadTiers]);

  const activeTiers = tiers.filter(t => t.active);
  const selectedTier = activeTiers[activeTierIdx] || activeTiers[0];

  const handleSelectPackage = (pkg: PremiumPackage, tier: PremiumTier) => {
    setPurchasePkg(pkg); setPurchaseQuote(null); setPurchaseTier(tier);
  };

  const handleSelectQuote = (q: Quote, tier: PremiumTier) => {
    setPurchaseQuote(q); setPurchasePkg(null); setPurchaseTier(tier);
  };

  const handleSuccess = (result: PurchaseResult) => {
    setPurchasePkg(null); setPurchaseQuote(null); setPurchaseTier(null);
    setSuccessResult(result);
  };

  return (
    <div className="min-h-screen text-white font-sans overflow-x-hidden" style={{ background: '#020617' }}>
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes blob1 {
          0%,100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.15); }
        }
      `}</style>

      {/* Sticky Back Nav */}
      <div className="sticky top-0 z-30 border-b border-slate-800 px-4 sm:px-6 py-3" style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="hidden sm:block text-xs font-bold text-slate-400">{companyName} · Premium Ad Placement</span>
          <div className="ml-auto flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-amber-400">PREMIUM ADS</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(124,58,237,0.15)', animation: 'blob1 8s ease-in-out infinite' }} />
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(245,158,11,0.08)' }} />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-amber-300 text-xs font-bold uppercase tracking-widest mb-6 border border-amber-400/30" style={{ background: 'rgba(251,191,36,0.08)' }}>
            <Flame className="w-3.5 h-3.5" /> Premium Ad Credit System
          </div>
          <h1 className="text-4xl sm:text-6xl font-black mb-5 leading-tight">
            Put Your Ads in{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
              Front of Every Buyer
            </span>
          </h1>
          <p className="text-slate-300 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Select a tier, choose your ad pack, and let server-side pricing guarantee the best rate — no hidden fees, no manipulation.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
            {[
              { icon: ShieldCheck, label: 'Server-verified pricing' },
              { icon: Zap, label: 'Instant activation' },
              { icon: Globe, label: 'Nationwide reach' },
              { icon: BarChart2, label: 'Volume discounts up to 25%' },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs font-semibold">
                <Icon className="w-4 h-4 text-emerald-400" /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-slate-800 py-8 px-4" style={{ background: 'rgba(15,23,42,0.5)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[['45K+', 'Active Listings'], ['12K+', 'Happy Sellers'], ['3.2M', 'Monthly Views'], ['98%', 'Satisfaction Rate']].map(([v, l]) => (
            <div key={l}>
              <p className="text-2xl sm:text-3xl font-black text-white mb-1">{v}</p>
              <p className="text-xs text-slate-400 font-semibold">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Packages section */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Choose Your Tier</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">Each tier offers unique benefits and exclusive placement. Mix tiers with custom packs for the perfect reach.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400 mr-3" />
              <span className="text-slate-400 text-sm">Loading premium tiers...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 font-semibold text-sm mb-4">{error}</p>
              <button onClick={loadTiers} className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors">Retry</button>
            </div>
          ) : activeTiers.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-semibold">No premium tiers available right now. Check back soon!</p>
            </div>
          ) : (
            <>
              {/* Tier pills */}
              <div className="flex flex-wrap justify-center gap-2 mb-10">
                {activeTiers.map((tier, idx) => {
                  const style = getTierStyle(idx);
                  const active = activeTierIdx === idx;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setActiveTierIdx(idx)}
                      className="px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border"
                      style={active ? {
                        background: `linear-gradient(135deg, ${style.gradient.split(' ')[1] || '#6d28d9'}, ${style.gradient.split(' ')[3] || '#4f46e5'})`,
                        borderColor: 'transparent',
                        color: 'white',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                      } : {
                        background: '#1e293b',
                        borderColor: '#334155',
                        color: '#cbd5e1',
                      }}
                    >
                      {tier.badge && <span className="mr-1.5">{tier.badge}</span>}
                      {tier.name}
                    </button>
                  );
                })}
              </div>

              {/* Active tier panel */}
              {selectedTier && (() => {
                const style = getTierStyle(activeTierIdx);
                const pkgs = (selectedTier.packages || []).filter(p => p.active);
                return (
                  <div className="rounded-3xl border overflow-hidden mb-8" style={{ borderColor: '#334155', background: '#0f172a' }}>
                    {/* Tier header */}
                    <div className="p-8" style={{ background: `linear-gradient(135deg, ${style.gradient.split(' ')[1] || '#6d28d9'}, ${style.gradient.split(' ')[3] || '#4f46e5'})` }}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          {selectedTier.badge && (
                            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                              {selectedTier.badge}
                            </span>
                          )}
                          <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">{selectedTier.name}</h3>
                          <p className="text-sm max-w-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>{selectedTier.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Starting from</p>
                          <p className="text-3xl font-black text-white">₹{selectedTier.perAdPrice}<span className="text-lg font-normal">/ad</span></p>
                        </div>
                      </div>
                      {selectedTier.benefits.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-5">
                          {selectedTier.benefits.map((b, i) => (
                            <span key={i} className="flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                              <Check className="w-3 h-3" /> {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Packages grid */}
                    <div className="p-6 sm:p-8">
                      {pkgs.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-8">No fixed packages in this tier. Use the Custom Builder below!</p>
                      ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {pkgs.map((pkg) => {
                            const isFeatured = Boolean(pkg.badge);
                            return (
                              <div
                                key={pkg.id}
                                className="relative rounded-2xl border p-5 flex flex-col transition-all hover:shadow-xl"
                                style={{
                                  background: isFeatured ? 'rgba(120,53,15,0.25)' : 'rgba(30,41,59,0.6)',
                                  borderColor: isFeatured ? '#d97706' : '#334155',
                                }}
                              >
                                {isFeatured && pkg.badge && (
                                  <div className="absolute -top-3 left-4">
                                    <span className="text-slate-900 text-[11px] font-black px-3 py-1 rounded-full shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                                      {pkg.badge}
                                    </span>
                                  </div>
                                )}
                                <div className="mb-4">
                                  <h4 className="font-black text-white text-base mb-1">{pkg.name}</h4>
                                  <div className="flex items-center gap-3 text-xs text-slate-400">
                                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" />{pkg.adsCount} ads</span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" />{pkg.durationValue} {pkg.durationUnit}</span>
                                  </div>
                                </div>
                                <div className="flex-1 flex flex-col justify-end">
                                  <p className="text-2xl font-black text-white mb-1">{fmt(pkg.price)}</p>
                                  <p className="text-[11px] text-slate-500 mb-4">≈ {fmt(Math.round(pkg.price / pkg.adsCount))}/ad</p>
                                  <button
                                    onClick={() => handleSelectPackage(pkg, selectedTier)}
                                    className="w-full py-2.5 rounded-xl font-bold text-sm transition-all"
                                    style={isFeatured ? {
                                      background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                                      color: '#1c1917',
                                      boxShadow: '0 4px 16px rgba(245,158,11,0.25)',
                                    } : {
                                      background: '#334155',
                                      color: 'white',
                                    }}
                                  >
                                    Buy Now — {fmt(pkg.price)}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* Custom Pack Builder */}
          {!loading && !error && activeTiers.length > 0 && (
            <div className="mt-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black mb-2">Build a Custom Pack</h2>
                <p className="text-slate-400 text-sm">Need a specific number of ads? Build your own pack with automatic volume discounts.</p>
              </div>
              <CustomBuilder tiers={activeTiers} onPurchaseWithQuote={handleSelectQuote} />
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 border-t border-slate-800" style={{ background: 'rgba(15,23,42,0.3)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-10">Sellers Love ZOVA Premium</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { name: 'Ananya S.', city: 'Mumbai', text: 'My iPhone listing got 3x more views within 24 hours. Totally worth it!' },
              { name: 'Rahul K.', city: 'Delhi NCR', text: 'The volume discount for 20 ads was incredible. Sold all my furniture within a week.' },
              { name: 'Priya M.', city: 'Bengaluru', text: 'Server-side pricing gave me confidence. Transparent and fast — exactly what I needed.' },
            ].map(({ name, city, text }) => (
              <div key={name} className="rounded-2xl p-5 border border-slate-700" style={{ background: '#1e293b' }}>
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5" style={{ fill: '#f59e0b', color: '#f59e0b' }} />)}
                </div>
                <p className="text-sm text-slate-300 mb-4 leading-relaxed">"{text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{name}</p>
                    <p className="text-[11px] text-slate-400">{city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 border-t border-slate-800">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map(faq => <FAQItem key={faq.q} {...faq} />)}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-14 px-4 border-t border-slate-800" style={{ background: 'linear-gradient(135deg, rgba(67,20,101,0.4), rgba(49,46,129,0.4))' }}>
        <div className="max-w-3xl mx-auto text-center">
          <Crown className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Ready to Grow Your Sales?</h2>
          <p className="text-slate-300 text-sm mb-6 max-w-lg mx-auto">Join thousands of sellers who've supercharged their listings with ZOVA Premium Ads.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-8 py-4 text-slate-900 font-black rounded-2xl text-sm transition-all flex items-center gap-2 mx-auto"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 30px rgba(245,158,11,0.3)' }}
          >
            <Sparkles className="w-5 h-5" /> Explore Premium Packs
          </button>
        </div>
      </section>

      {/* Modals */}
      {(purchasePkg || purchaseQuote) && purchaseTier && (
        <PurchaseModal
          packageItem={purchasePkg}
          quote={purchaseQuote}
          tier={purchaseTier}
          onClose={() => { setPurchasePkg(null); setPurchaseQuote(null); setPurchaseTier(null); }}
          onSuccess={handleSuccess}
        />
      )}
      {successResult && (
        <SuccessModal
          result={successResult}
          onClose={() => { setSuccessResult(null); navigate('/'); }}
        />
      )}
    </div>
  );
};
