import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Search,
  Tag,
  ShoppingBag,
  Store,
  Clock,
  CheckCheck,
  PlusCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import type { ChatThread } from '../../types/index.js';

interface ChatInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectThread: (thread: ChatThread) => void;
  onBrowseAds?: () => void;
  onPostAd?: () => void;
}

export const ChatInboxModal: React.FC<ChatInboxModalProps> = ({
  isOpen,
  onClose,
  onSelectThread,
  onBrowseAds,
  onPostAd,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'buying' | 'selling'>('buying');
  const [searchQuery, setSearchQuery] = useState('');
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getChats();
      setThreads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not fetch chat threads:', err);
      setError('Unable to load conversations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchThreads();
    }
  }, [isOpen]);

  // Segregate threads into Buying and Selling based on current user context
  const { buyingThreads, sellingThreads } = useMemo(() => {
    const currentUserId = user?.id || 'usr-1';
    const currentUserName = user?.name?.toLowerCase() || '';
    const currentUserPhone = user?.phone || '';

    const buying: ChatThread[] = [];
    const selling: ChatThread[] = [];

    threads.forEach((t) => {
      // Selling: Current user is the seller of the listing
      const isSeller =
        (t.sellerId && t.sellerId === currentUserId) ||
        (t.sellerName && currentUserName && t.sellerName.toLowerCase() === currentUserName) ||
        (t.sellerPhone && currentUserPhone && t.sellerPhone === currentUserPhone);

      // Buying: Current user is the buyer (or thread default user is current user and not seller)
      const isBuyer =
        (t.buyerId && t.buyerId === currentUserId) ||
        (t.user?.id && t.user.id === currentUserId && !isSeller) ||
        !isSeller;

      if (isSeller) {
        selling.push(t);
      } else if (isBuyer) {
        buying.push(t);
      } else {
        // Default to buying if ambiguous
        buying.push(t);
      }
    });

    return { buyingThreads: buying, sellingThreads: selling };
  }, [threads, user]);

  // Apply active tab and query search filter
  const displayedThreads = useMemo(() => {
    const baseList = activeTab === 'buying' ? buyingThreads : sellingThreads;
    if (!searchQuery.trim()) return baseList;

    const q = searchQuery.toLowerCase();
    return baseList.filter(
      (t) =>
        t.listingTitle?.toLowerCase().includes(q) ||
        t.sellerName?.toLowerCase().includes(q) ||
        t.buyerName?.toLowerCase().includes(q) ||
        t.user?.name?.toLowerCase().includes(q) ||
        t.lastMessage?.toLowerCase().includes(q)
    );
  }, [activeTab, buyingThreads, sellingThreads, searchQuery]);

  const totalUnreadCount = useMemo(() => {
    return threads.filter((t) => t.unread).length;
  }, [threads]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      showCloseButton={false}
      className="p-0 overflow-hidden flex flex-col max-h-[90vh] bg-white rounded-3xl"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary-light text-brand-primary flex items-center justify-center shadow-xs">
            <MessageCircle className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Messages &amp; Offers</h2>
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-brand-accent text-white text-[10px] font-black uppercase tracking-wider">
                  {totalUnreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Manage buyer chats, negotiations &amp; inquiries</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={fetchThreads}
            disabled={isLoading}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Refresh conversations"
            aria-label="Refresh conversations"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            data-testid="inbox-close-btn"
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Close inbox"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Tabs: Buying vs Selling */}
      <div className="px-5 pt-3 pb-2 bg-slate-50 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="inbox-tab-buying"
            data-testid="inbox-tab-buying"
            onClick={() => setActiveTab('buying')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'buying'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-100/60'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Buying</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'buying' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {buyingThreads.length}
            </span>
          </button>

          <button
            type="button"
            id="inbox-tab-selling"
            data-testid="inbox-tab-selling"
            onClick={() => setActiveTab('selling')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'selling'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-100/60'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Selling</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'selling' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {sellingThreads.length}
            </span>
          </button>
        </div>

        {/* Filter / Search Input */}
        <div className="mt-2.5 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab === 'buying' ? 'buying' : 'selling'} messages or items...`}
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-primary shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[280px]">
        {isLoading && threads.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-primary" />
            Loading conversations...
          </div>
        ) : displayedThreads.length > 0 ? (
          displayedThreads.map((thread) => {
            const isBuying = activeTab === 'buying';
            // Participant: If buying, show seller; if selling, show buyer
            const participantName = isBuying
              ? thread.sellerName || 'Verified Seller'
              : thread.buyerName || thread.user?.name || 'Interested Buyer';

            const participantAvatar = isBuying
              ? thread.sellerAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'
              : thread.buyerAvatar || thread.user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';

            const adImage =
              thread.listingImage ||
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';

            // Check if there is an offer in recent messages
            const lastMsg = thread.messages?.[thread.messages.length - 1];
            const hasOffer = lastMsg?.type === 'offer' || lastMsg?.offerData;

            return (
              <button
                key={thread.id}
                type="button"
                data-testid={`inbox-thread-row-${thread.id}`}
                onClick={() => {
                  onClose();
                  onSelectThread(thread);
                }}
                className={`w-full p-4 flex items-start gap-3.5 text-left transition-all cursor-pointer hover:bg-slate-50 active:bg-slate-100 ${
                  thread.unread ? 'bg-sky-50/40' : 'bg-white'
                }`}
              >
                {/* Participant Avatar */}
                <div className="relative shrink-0 mt-0.5">
                  <img
                    src={participantAvatar}
                    alt={participantName}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                  />
                  {thread.unread && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-accent border-2 border-white rounded-full"></span>
                  )}
                </div>

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {participantName}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {thread.timeAgo || 'Recent'}
                    </span>
                  </div>

                  {/* Related Ad Snippet */}
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium truncate">
                      Ad: <strong className="text-slate-700">{thread.listingTitle || 'Marketplace Item'}</strong>
                    </span>
                    {thread.listingPrice ? (
                      <span className="text-brand-primary font-black shrink-0">
                        ₹{thread.listingPrice.toLocaleString()}
                      </span>
                    ) : null}
                  </div>

                  {/* Last Message Preview */}
                  <p className="text-xs text-slate-600 mt-1 line-clamp-1 font-normal leading-relaxed">
                    {thread.lastMessage || 'Tap to view conversation'}
                  </p>

                  {/* Offer status pill if applicable */}
                  {hasOffer && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                      <Tag className="w-3 h-3 text-amber-600" />
                      <span>
                        Offer: ₹{lastMsg?.offerData?.amount?.toLocaleString() || 'Negotiation'} ({lastMsg?.offerData?.status || 'Active'})
                      </span>
                    </div>
                  )}
                </div>

                {/* Ad Thumbnail */}
                <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 self-center">
                  <img
                    src={adImage}
                    alt={thread.listingTitle || 'Item'}
                    className="w-full h-full object-cover"
                  />
                </div>
              </button>
            );
          })
        ) : (
          /* Empty State strictly matching user requirement */
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center shadow-inner">
              {activeTab === 'buying' ? (
                <ShoppingBag className="w-8 h-8 text-slate-400" />
              ) : (
                <Store className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="max-w-md space-y-1">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                {searchQuery
                  ? 'No matching conversations'
                  : activeTab === 'buying'
                  ? 'No Buying Conversations Yet'
                  : 'No Selling Inquiries Yet'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                No conversations yet — start by messaging a seller or checking offers on your ads
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onBrowseAds) onBrowseAds();
                }}
                className="min-h-[40px] px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Browse Ads</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onPostAd) onPostAd();
                }}
                className="min-h-[40px] px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-bold shadow-cta transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Post Your Ad</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Always keep communication &amp; payments on ZOVA.
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-800 font-bold transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};
