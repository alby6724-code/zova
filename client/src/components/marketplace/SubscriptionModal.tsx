import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  Zap,
  Crown,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Headphones,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { Plan, SubscriptionTier } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tier: SubscriptionTier) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('FREE');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('BASIC');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Carousel sliding state
  const [activeCardIndex, setActiveCardIndex] = useState(1); // default to Basic (middle)
  const carouselRef = useRef<HTMLDivElement>(null);

  // Lock body scroll behind modal
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Load plans and subscription data
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const plansRes = await api.getPlans();
        setPlans(plansRes.plans);

        if (user?.id) {
          const subRes = await api.getMySubscription(user.id);
          setCurrentTier(subRes.tier);
        }
      } catch (err) {
        console.error('Failed to load subscription data:', err);
      }
    };

    loadData();
    setSuccessMessage(null);
  }, [isOpen, user?.id]);

  // Track scroll position in carousel to update dot indicators
  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    const cardWidth = clientWidth * 0.85;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveCardIndex(Math.min(2, Math.max(0, newIndex)));
  };

  const scrollToCard = (index: number) => {
    if (!carouselRef.current) return;
    const children = carouselRef.current.children;
    if (children[index]) {
      (children[index] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
      setActiveCardIndex(index);
    }
  };

  if (!isOpen) return null;

  const handleCheckout = async (tier: SubscriptionTier) => {
    if (tier === 'FREE' || tier === currentTier) return;
    if (!user?.id) {
      alert('Please log in with your phone number to upgrade your subscription.');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create order
      const order = await api.createSubscriptionOrder({
        userId: user.id,
        tier,
        billingCycle,
      });

      // 2. Simulate Razorpay payment modal completion
      const simulatedPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const verifyRes = await api.verifySubscription({
        userId: user.id,
        tier,
        billingCycle,
        razorpayOrderId: order.orderId,
        razorpayPaymentId: simulatedPaymentId,
      });

      setCurrentTier(tier);
      setSuccessMessage(verifyRes.message);
      if (onSuccess) onSuccess(tier);

      setTimeout(() => {
        setIsProcessing(false);
        setSuccessMessage(null);
        onClose();
      }, 2500);
    } catch (err: any) {
      setIsProcessing(false);
      alert(err.message || 'Payment failed. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 md:p-4 overflow-y-auto"
      onClick={(e) => {
        // Click outside modal box on desktop to close
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white w-full max-w-full h-[100dvh] md:w-full md:max-w-4xl md:h-auto md:max-h-[92vh] md:rounded-3xl shadow-2xl border-0 md:border border-brand-border flex flex-col overflow-hidden animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Top Header (Visible over all scrollable content) */}
        <div className="bg-gradient-to-r from-brand-primary via-[#153c73] to-slate-900 text-white p-5 sm:p-7 relative shrink-0">
          {/* Desktop Back button & Close Action */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onClose}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Marketplace</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-5 sm:right-5 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center shadow-md backdrop-blur-md transition-all z-20 cursor-pointer"
              aria-label="Close subscription plans modal"
              data-testid="modal-close-button"
              title="Close"
            >
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
            <span>Seller Growth Plans</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white pr-10">
            Accelerate Your Sales on Marketplace
          </h2>
          <p className="text-slate-200 text-xs sm:text-sm mt-1 max-w-xl line-clamp-2 sm:line-clamp-none">
            Choose a plan tailored to boost your ads with verified badges, priority placement, and higher listings limits.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-4 sm:mt-5 inline-flex items-center p-1 rounded-full bg-slate-900/80 border border-slate-700 shadow-inner">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                billingCycle === 'MONTHLY'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === 'YEARLY'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly Billing
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-[10px] font-extrabold text-white uppercase">
                Save 16%
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Body: Horizontal Scroll-Snap Carousel */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 flex flex-col justify-between">
          {/* Success Banner */}
          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Desktop Arrow Controls */}
          <div className="relative">
            <button
              type="button"
              onClick={() => scrollToCard(Math.max(0, activeCardIndex - 1))}
              disabled={activeCardIndex === 0}
              className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
              aria-label="Previous plan"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => scrollToCard(Math.min(2, activeCardIndex + 1))}
              disabled={activeCardIndex === 2}
              className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
              aria-label="Next plan"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Horizontal Scroll-Snap Cards Container */}
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 sm:px-4 snap-x snap-mandatory scrollbar-none items-stretch"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {/* 1. FREE STARTER TIER */}
              <div
                className={`w-[85vw] max-w-[320px] md:w-[280px] md:max-w-none shrink-0 snap-center rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-all bg-white shadow-sm ${
                  currentTier === 'FREE'
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-lg">Free Starter</h3>
                    {currentTier === 'FREE' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">For casual individuals selling occasionally</p>

                  <div className="mt-4 mb-5">
                    <span className="text-3xl font-extrabold text-slate-900">₹0</span>
                    <span className="text-xs text-slate-500 font-medium"> / forever</span>
                  </div>

                  <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span><strong>3</strong> Active ad listings</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Standard search placement</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Direct in-app buyer chat</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>30 Days ad visibility duration</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    disabled
                    className="w-full min-h-[46px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-200 text-slate-700 cursor-default border border-slate-300 flex items-center justify-center"
                  >
                    {currentTier === 'FREE' ? '✓ Current Plan (Active)' : 'Free Included'}
                  </button>
                </div>
              </div>

              {/* 2. BASIC SELLER TIER */}
              <div
                className={`w-[85vw] max-w-[320px] md:w-[280px] md:max-w-none shrink-0 snap-center rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-all bg-white shadow-sm ${
                  currentTier === 'BASIC'
                    ? 'border-blue-600 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-lg">Basic Seller</h3>
                    {currentTier === 'BASIC' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">For frequent sellers & growing traders</p>

                  <div className="mt-4 mb-5">
                    <span className="text-3xl font-extrabold text-slate-900">
                      ₹{billingCycle === 'YEARLY' ? '1,999' : '199'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {' '}/ {billingCycle === 'YEARLY' ? 'year' : 'month'}
                    </span>
                  </div>

                  <ul className="space-y-3 text-xs text-slate-700 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span><strong>15</strong> Active ad listings</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span><strong>2</strong> Featured ads per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>60 Days ad visibility duration</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="flex items-center gap-1 font-semibold text-blue-700">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        Verified Seller Badge
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Priority customer support</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleCheckout('BASIC')}
                    disabled={currentTier === 'BASIC' || isProcessing}
                    className={`w-full min-h-[46px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      currentTier === 'BASIC'
                        ? 'bg-slate-200 text-slate-700 cursor-default border border-slate-300'
                        : 'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-primary hover:shadow-lg active:scale-[0.98]'
                    }`}
                  >
                    {isProcessing && selectedTier === 'BASIC' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : currentTier === 'BASIC' ? (
                      '✓ Current Plan (Active)'
                    ) : (
                      'Upgrade to Basic'
                    )}
                  </button>
                </div>
              </div>

              {/* 3. PRO MERCHANT TIER (MOST POPULAR) */}
              <div
                className={`w-[85vw] max-w-[320px] md:w-[280px] md:max-w-none shrink-0 snap-center rounded-2xl border-2 p-5 sm:p-6 flex flex-col justify-between relative bg-gradient-to-b from-brand-primary-light/40 via-white to-brand-primary-light/30 shadow-md md:scale-105 transition-all ${
                  currentTier === 'PRO'
                    ? 'border-brand-primary ring-2 ring-brand-primary/40'
                    : 'border-brand-primary/70 hover:border-brand-primary'
                }`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-accent text-white font-black text-[10px] tracking-wider uppercase shadow-cta">
                  Most Popular
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-brand-primary" />
                      Pro Merchant
                    </h3>
                    {currentTier === 'PRO' && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-primary text-white text-[11px] font-bold">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">For professional dealers & high-volume stores</p>

                  <div className="mt-4 mb-5">
                    <span className="text-3xl font-extrabold text-slate-900">
                      ₹{billingCycle === 'YEARLY' ? '4,999' : '499'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {' '}/ {billingCycle === 'YEARLY' ? 'year' : 'month'}
                    </span>
                  </div>

                  <ul className="space-y-3 text-xs text-slate-800 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 font-bold shrink-0" />
                      <span><strong>Unlimited</strong> Active listings</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>10</strong> Featured ads per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>90 Days ad validity</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-brand-primary">Homepage Banner Placement</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-brand-primary">Top Search Priority Boost</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-emerald-700">Dedicated Account Manager</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleCheckout('PRO')}
                    disabled={currentTier === 'PRO' || isProcessing}
                    className={`w-full min-h-[46px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      currentTier === 'PRO'
                        ? 'bg-slate-200 text-slate-700 cursor-default border border-slate-300'
                        : 'bg-brand-accent hover:bg-brand-accent-hover text-white shadow-cta hover:shadow-lg active:scale-[0.98]'
                    }`}
                  >
                    {isProcessing && selectedTier === 'PRO' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : currentTier === 'PRO' ? (
                      '✓ Current Plan (Active)'
                    ) : (
                      'Upgrade to Pro'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Carousel Dot Indicators for Mobile */}
          <div className="flex items-center justify-center gap-2 pt-2 pb-1">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToCard(idx)}
                className={`h-2 rounded-full transition-all ${
                  activeCardIndex === idx
                    ? 'w-6 bg-brand-primary'
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to plan ${idx + 1}`}
              />
            ))}
          </div>

          {/* Trust Badges Footer inside Modal */}
          <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-around text-[11px] text-slate-500 font-semibold flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              100% Secure Checkout
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-brand-primary" />
              Instant Plan Activation
            </span>
            <span className="flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-blue-600" />
              24/7 Seller Support
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
