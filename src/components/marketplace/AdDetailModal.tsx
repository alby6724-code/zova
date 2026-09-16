import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Heart,
  Share2,
  ShieldCheck,
  Phone,
  MessageCircle,
  Flag,
  Calendar,
  Eye,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Sparkles,
  Send,
  Tag,
} from 'lucide-react';
import { Listing, Review } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';

interface AdDetailModalProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (sellerId: string, listingId: string, promptOffer?: boolean) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (listingId: string) => void;
}

export const AdDetailModal: React.FC<AdDetailModalProps> = ({
  listing,
  isOpen,
  onClose,
  onOpenChat,
  isFavorited = false,
  onToggleFavorite,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [showPhone, setShowPhone] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('Fake item');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Local favorited state
  const [favorited, setFavorited] = useState(isFavorited);

  useEffect(() => {
    setFavorited(isFavorited);
  }, [isFavorited]);

  useEffect(() => {
    setActiveImageIndex(0);
    setShowPhone(false);
    setShowReportForm(false);
    setShowReviewForm(false);

    if (listing?.sellerId) {
      // Load seller reviews
      api
        .getSellerReviews(listing.sellerId)
        .then((res) => {
          setReviews(res.reviews || []);
        })
        .catch(() => {
          setReviews([]);
        });
    }
  }, [listing?.id, listing?.sellerId]);

  // Schema.org JSON-LD Structured Data for SEO
  useEffect(() => {
    if (!isOpen || !listing) return;

    const allImages =
      listing.images && listing.images.length > 0
        ? listing.images
        : listing.image
        ? [listing.image]
        : [];

    const jsonLd = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: listing.title,
      image: allImages,
      description: listing.description || listing.title,
      category: listing.category,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: listing.price,
        itemCondition:
          listing.condition === 'New'
            ? 'https://schema.org/NewCondition'
            : 'https://schema.org/UsedCondition',
        availability: 'https://schema.org/InStock',
        seller: {
          '@type': 'Person',
          name: listing.sellerName,
        },
      },
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'schema-product-ld';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('schema-product-ld');
      if (existing) {
        document.head.removeChild(existing);
      }
    };
  }, [isOpen, listing]);

  if (!isOpen || !listing) return null;

  const allImages =
    listing.images && listing.images.length > 0
      ? listing.images
      : listing.image
      ? [listing.image]
      : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'];

  const activeImage = allImages[activeImageIndex] || allImages[0];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleFavoriteClick = async () => {
    setFavorited((prev) => !prev);
    if (onToggleFavorite) {
      onToggleFavorite(listing.id);
    } else {
      try {
        await api.toggleFavorite(listing.id);
      } catch (err) {
        console.error('Failed to toggle favorite', err);
      }
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setReportSubmitted(true);
      setTimeout(() => {
        setReportSubmitted(false);
        setShowReportForm(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const res = await api.addListingReview(listing.id, {
        rating: newRating,
        comment: newComment.trim(),
      });
      setReviews((prev) => [res.review, ...prev]);
      setNewComment('');
      setShowReviewForm(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  };

  // Masked phone calculation
  const rawPhone = listing.sellerPhone || '+91 98301 92834';
  const maskedPhone =
    rawPhone.length > 6
      ? `${rawPhone.slice(0, rawPhone.length - 5)}•••••`
      : '+91 ••••••••••';

  // Calculate average seller rating
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      maxWidthClass="max-w-3xl"
      className="max-h-[92vh] flex flex-col"
    >
      {/* Modal Top Bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-full bg-brand-primary-light text-brand-primary font-bold text-xs">
            {listing.category}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              listing.condition === 'New'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-800'
            }`}
          >
            {listing.condition}
          </span>
          {listing.tier === 'PRO' && (
            <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-brand-primary to-slate-900 text-white font-extrabold text-[10px] tracking-wide uppercase shadow-sm">
              PRO Seller
            </span>
          )}
          {listing.featured && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" /> Featured
            </span>
          )}
          {listing.distanceKm !== undefined && (
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-500" />
              {listing.distanceKm} km away
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="w-10 h-10 min-w-[40px] min-h-[40px] text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors relative flex items-center justify-center cursor-pointer"
            title="Share listing"
          >
            <Share2 className="w-4 h-4" />
            {isCopied && (
              <span className="absolute -bottom-7 right-0 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                Copied link!
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            data-testid="modal-close-button"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            title="Close modal"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: Images Gallery & Description */}
            <div className="md:col-span-7 space-y-4">
              {/* Main Active Image Viewer */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 aspect-[4/3] group shadow-inner">
                <img
                  src={activeImage}
                  alt={listing.title}
                  className="w-full h-full object-cover transition-transform duration-300"
                />

                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow"
                      title="Previous photo"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow"
                      title="Next photo"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-2.5 right-2.5 bg-slate-900/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {activeImageIndex + 1} / {allImages.length}
                    </span>
                  </>
                )}

                {/* Wishlist Heart Button */}
                <button
                  type="button"
                  onClick={handleFavoriteClick}
                  className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
                    favorited
                      ? 'bg-red-50 text-red-500 scale-110 ring-2 ring-red-300'
                      : 'bg-white/90 hover:bg-white text-slate-600 hover:text-red-500'
                  }`}
                  title={favorited ? 'Saved to Favorites' : 'Save to Favorites'}
                >
                  <Heart className={`w-4 h-4 ${favorited ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
              </div>

              {/* Thumbnail Strip */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 horizontal-scroll-container no-scrollbar w-full max-w-full">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative rounded-xl overflow-hidden w-16 h-16 shrink-0 border-2 transition-all ${
                        activeImageIndex === idx
                          ? 'border-brand-primary ring-2 ring-brand-primary/20'
                          : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-brand-primary/90 text-white text-[8px] font-bold text-center py-0.5">
                          Cover
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Description
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  {listing.description || 'No additional description provided by the seller.'}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Listed recently
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-slate-400" /> {listing.views || 45} views
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Verified Item
                </span>
              </div>
            </div>

            {/* Right: Price & Seller Card */}
            <div className="md:col-span-5 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900">{listing.title}</h1>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">
                      ₹{listing.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                      Verified Price
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {listing.location}
                  </p>
                </div>

                {/* Seller Information */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        listing.sellerAvatar ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                      }
                      alt={listing.sellerName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1 truncate">
                        {listing.sellerName}
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-amber-600 font-bold mt-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{avgRating}</span>
                        <span className="text-slate-400 font-normal">({reviews.length} reviews)</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Chat, Make Offer & Masked Click-To-Call */}
                  <div className="space-y-3 pt-3 border-t border-slate-200/80">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        size="md"
                        fullWidth
                        id="ad-detail-chat-btn"
                        leftIcon={<MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                        onClick={() => {
                          onOpenChat(listing.sellerId, listing.id, false);
                          onClose();
                        }}
                      >
                        Chat
                      </Button>

                      <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        id="ad-detail-make-offer-btn"
                        leftIcon={<Tag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                        style={{ backgroundColor: '#ff5a5f', color: '#ffffff', opacity: 1 }}
                        className="bg-[#ff5a5f] hover:bg-[#e0484d] text-white font-extrabold shadow-cta"
                        onClick={() => {
                          onOpenChat(listing.sellerId, listing.id, true);
                          onClose();
                        }}
                      >
                        Make Offer
                      </Button>
                    </div>

                    {/* Masked Click-to-Call & WhatsApp Connect */}
                    {showPhone ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <a
                            href={`tel:${rawPhone}`}
                            id="ad-detail-call-btn"
                            className="w-full min-h-[44px] py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                          >
                            <Phone className="w-4 h-4 shrink-0" />
                            <span className="truncate">Call: {rawPhone}</span>
                          </a>

                          <a
                            href={`https://wa.me/${rawPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Hi, I am interested in your listing "${listing.title}" (₹${listing.price.toLocaleString()}) on ZOVA.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            id="ad-detail-whatsapp-btn"
                            data-testid="ad-detail-whatsapp-btn"
                            className="w-full min-h-[44px] py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                            title="Chat with seller on WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 shrink-0" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPhone(true)}
                        id="ad-detail-show-phone-btn"
                        className="w-full min-h-[44px] py-2.5 px-4 bg-white hover:bg-emerald-50 text-slate-800 border-2 border-emerald-600/60 hover:border-emerald-600 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.98]"
                      >
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                        <span>Show Phone Number &amp; WhatsApp ({maskedPhone})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Safety Tips */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1 text-amber-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Safety Tips
                  </p>
                  <p className="text-amber-700 leading-snug">
                    • Meet seller in a safe, public place in {listing.location.split(',')[0]}
                    <br />• Inspect the item thoroughly before making payment.
                  </p>
                </div>
              </div>

              {/* Report Ad Link */}
              <div className="pt-2 border-t border-slate-100">
                {!showReportForm ? (
                  <button
                    onClick={() => setShowReportForm(true)}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"
                  >
                    <Flag className="w-3.5 h-3.5" /> Report this listing
                  </button>
                ) : (
                  <form
                    onSubmit={handleReportSubmit}
                    className="space-y-2 bg-red-50 p-3 rounded-xl border border-red-200"
                  >
                    <p className="text-[11px] font-bold text-red-800">Report Listing to Moderators</p>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full p-1.5 text-xs border border-red-200 rounded bg-white"
                    >
                      <option value="Fake item">Fake item</option>
                      <option value="Prohibited item">Prohibited item</option>
                      <option value="Inappropriate content">Inappropriate content</option>
                      <option value="Duplicate or spam">Duplicate or spam</option>
                      <option value="Fraud">Fraud</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold shadow-sm"
                      >
                        Submit Report
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReportForm(false)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                    {reportSubmitted && (
                      <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Report submitted for review.
                      </p>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Seller Ratings & Reviews Section */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Seller Ratings & Reviews
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    ★ {avgRating}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified buyer feedback for {listing.sellerName}
                </p>
              </div>

              {isAuthenticated && !showReviewForm && (
                <button
                  type="button"
                  onClick={() => setShowReviewForm(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Write a Review
                </button>
              )}
            </div>

            {/* Leave a Review Form */}
            {showReviewForm && (
              <form
                onSubmit={handleAddReview}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Your Rating</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            newRating >= star
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={2}
                  required
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your experience dealing with this seller..."
                  className="w-full p-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-4 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-primary flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Review
                  </button>
                </div>
              </form>
            )}

            {/* Review Cards */}
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No reviews yet. Be the first to review this seller after transacting!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{rev.buyerName}</span>
                      <div className="flex items-center gap-0.5">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">{rev.comment}</p>
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </Modal>
  );
};
