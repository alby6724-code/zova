import React, { useState, useEffect } from 'react';
import { Listing, ListingCategory, ListingStatus } from '../types/index.js';
import { api } from '../services/api.js';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Star,
  Clock,
  Check,
  X,
  Edit,
  ShieldAlert,
  Sliders,
  DollarSign,
  TrendingUp,
  Crown,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { CATEGORIES } from '../constants/categories.js';

const REJECTION_REASONS = [
  'Prohibited Item (Weapons, prescription drugs, adult items)',
  'Inappropriate or offensive text/imagery',
  'Suspicious or unrealistic pricing (potential scam)',
  'Incomplete, vague, or misleading description',
  'Duplicate advertisement',
  'Counterfeit or replica branded item',
  'Wrong category selected',
];

export const ListingsPage: React.FC = () => {
  const { role } = useAuth();
  const canModerate = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(role);

  // Active Tab: 'queue' (Moderation Queue) | 'all' (All Ads) | 'subscriptions' (Subscription Analytics)
  const [activeTab, setActiveTab] = useState<'queue' | 'all' | 'subscriptions'>('queue');

  // Moderation Queue State
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [selectedListingIds, setSelectedListingIds] = useState<Set<string>>(new Set());
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  // Quick Reject Dialog State
  const [rejectingListing, setRejectingListing] = useState<Listing | null>(null);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  // Edit Ad Modal State
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState<ListingCategory>('Mobiles');
  const [editLocation, setEditLocation] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // All Ads State
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Subscription Analytics State
  const [subStats, setSubStats] = useState<{
    totalMonthlyRevenue: number;
    currency: string;
    tiers: { free: number; basic: number; pro: number };
    totalSubscribers: number;
  } | null>(null);

  // Fetch pending queue
  const fetchPendingQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await api.getPendingListings();
      setPendingListings(res.data || []);
      setFlaggedCount(res.flaggedCount || 0);
    } catch (err) {
      console.error('Failed to load pending moderation queue:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  // Fetch all listings
  const fetchAllListings = async () => {
    try {
      const res = await api.getListings({
        search,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setAllListings(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error('Failed to load listings:', err);
    }
  };

  // Fetch subscription analytics
  const fetchSubscriptionStats = async () => {
    try {
      const res = await api.getSubscriptionStats();
      setSubStats(res);
    } catch (err) {
      console.error('Failed to load subscription stats:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchPendingQueue();
    } else if (activeTab === 'all') {
      fetchAllListings();
    } else if (activeTab === 'subscriptions') {
      fetchSubscriptionStats();
    }
  }, [activeTab, search, categoryFilter, statusFilter, page]);

  // Moderation Actions
  const handleApprove = async (id: string) => {
    try {
      await api.approveListing(id);
      fetchPendingQueue();
      fetchAllListings();
    } catch {
      alert('Failed to approve listing');
    }
  };

  const handleOpenRejectDialog = (listing: Listing) => {
    setRejectingListing(listing);
    setSelectedReason(REJECTION_REASONS[0]);
    setCustomReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingListing) return;
    const finalReason = customReason.trim() ? customReason.trim() : selectedReason;
    try {
      await api.rejectListing(rejectingListing.id, finalReason);
      setRejectingListing(null);
      fetchPendingQueue();
      fetchAllListings();
    } catch {
      alert('Failed to reject listing');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedListingIds.size === 0) return;
    try {
      await api.bulkModerateListings(Array.from(selectedListingIds), 'APPROVE');
      setSelectedListingIds(new Set());
      fetchPendingQueue();
      fetchAllListings();
    } catch {
      alert('Failed to bulk approve listings');
    }
  };

  const handleBulkReject = async () => {
    if (selectedListingIds.size === 0) return;
    const reason = prompt('Enter rejection reason for selected listings:', 'Violates marketplace guidelines');
    if (!reason) return;
    try {
      await api.bulkModerateListings(Array.from(selectedListingIds), 'REJECT', reason);
      setSelectedListingIds(new Set());
      fetchPendingQueue();
      fetchAllListings();
    } catch {
      alert('Failed to bulk reject listings');
    }
  };

  const toggleSelectListing = (id: string) => {
    setSelectedListingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    if (selectedListingIds.size === pendingListings.length) {
      setSelectedListingIds(new Set());
    } else {
      setSelectedListingIds(new Set(pendingListings.map((l) => l.id)));
    }
  };

  // Edit Listing Handlers
  const handleOpenEditModal = (listing: Listing) => {
    setEditingListing(listing);
    setEditTitle(listing.title);
    setEditPrice(listing.price.toString());
    setEditCategory(listing.category);
    setEditLocation(listing.location);
    setEditDescription(listing.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    setIsSavingEdit(true);
    try {
      await api.editListing(editingListing.id, {
        title: editTitle.trim(),
        price: Number(editPrice),
        category: editCategory,
        location: editLocation.trim(),
        description: editDescription.trim(),
      });
      setEditingListing(null);
      fetchPendingQueue();
      fetchAllListings();
    } catch {
      alert('Failed to save listing edits');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Status update for All Ads tab
  const handleUpdateStatus = async (id: string, newStatus: ListingStatus, featured?: boolean) => {
    try {
      await api.updateListingStatus(id, newStatus, featured);
      fetchAllListings();
    } catch {
      alert('Failed to update listing');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Navigation Tabs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Marketplace Moderation & Ads
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review pending seller submissions, enforce compliance, and monitor subscription tiers.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Queue</span>
            {pendingListings.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-mono">
                {pendingListings.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>All Ads ({totalCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'subscriptions'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span>Seller Plans & MRR</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PENDING MODERATION QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Queue Info Bar & Bulk Actions */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                {pendingListings.length} listings awaiting review
              </span>
              {flaggedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  {flaggedCount} Auto-Flagged (Banned Keywords)
                </span>
              )}
            </div>

            {canModerate && selectedListingIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">{selectedListingIds.size} selected</span>
                <button
                  onClick={handleBulkApprove}
                  className="min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" /> Bulk Approve
                </button>
                <button
                  onClick={handleBulkReject}
                  className="min-h-[40px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <X className="w-4 h-4" /> Bulk Reject
                </button>
              </div>
            )}
          </div>

          {/* Pending Queue List */}
          {isLoadingQueue ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 text-xs">
              Loading moderation queue...
            </div>
          ) : pendingListings.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800">Queue is Clear!</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                No advertisements are currently waiting for admin approval. Newly posted ads will automatically show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-100/70 rounded-xl">
                <input
                  type="checkbox"
                  checked={selectedListingIds.size === pendingListings.length && pendingListings.length > 0}
                  onChange={toggleSelectAllPending}
                  className="mr-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex-1">Listing Preview</span>
                <span className="w-32 text-right mr-4">Seller & Date</span>
                <span className="w-48 text-right">Moderator Actions</span>
              </div>

              {pendingListings.map((listing) => (
                <div
                  key={listing.id}
                  className={`bg-white rounded-2xl p-4 border shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    listing.autoFlagged
                      ? 'border-rose-300 bg-rose-50/20'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedListingIds.has(listing.id)}
                      onChange={() => toggleSelectListing(listing.id)}
                      className="mt-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    {/* Image */}
                    <img
                      src={listing.image}
                      alt={listing.title}
                      className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                    />

                    {/* Details */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm">{listing.title}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {listing.category}
                        </span>
                        <span className="font-extrabold text-blue-600 text-sm">
                          ₹{listing.price.toLocaleString()}
                        </span>
                        {listing.autoFlagged && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Auto-Flagged
                          </span>
                        )}
                      </div>

                      {listing.autoFlagReason && (
                        <p className="text-[11px] font-semibold text-rose-600">
                          ⚠️ {listing.autoFlagReason}
                        </p>
                      )}

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {listing.description}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span>📍 {listing.location}</span>
                        <span>•</span>
                        <span>{listing.condition} Condition</span>
                        {listing.images && listing.images.length > 1 && (
                          <>
                            <span>•</span>
                            <span>{listing.images.length} photos</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Seller & Actions */}
                  <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="text-right text-xs">
                      <p className="font-semibold text-slate-800">{listing.sellerName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {listing.sellerPhone || 'No Phone'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {canModerate && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(listing)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors"
                          title="Edit Ad Details Before Approval"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenRejectDialog(listing)}
                          className="min-h-[40px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="Reject with Reason"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject</span>
                        </button>

                        <button
                          onClick={() => handleApprove(listing.id)}
                          className="min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="Approve and Publish Live"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL MARKETPLACE ADS */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by title, seller, or location..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.slug} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Flagged">Flagged</option>
                <option value="Rejected">Rejected</option>
                <option value="Removed">Removed</option>
              </select>
            </div>
          </div>

          {/* Listings Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Desktop Table View (≥768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                    <th className="py-3.5 px-4">Thumbnail</th>
                    <th className="py-3.5 px-4">Title & Details</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Seller</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allListings.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <img
                          src={l.image}
                          alt={l.title}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200"
                        />
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-bold text-slate-800 line-clamp-1">{l.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{l.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                          <span>{l.location}</span>
                          <span>•</span>
                          <span>{l.views} views</span>
                          {l.featured && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded">
                              Featured
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">{l.category}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">₹ {l.price.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-700">{l.sellerName}</td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            l.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : l.status === 'Flagged'
                              ? 'bg-rose-50 text-rose-700'
                              : l.status === 'Rejected'
                              ? 'bg-red-100 text-red-800'
                              : l.status === 'Removed'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {canModerate && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleUpdateStatus(l.id, 'Active')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="Approve / Mark Active"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(l.id, 'Flagged')}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                              title="Flag for Review"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(l.id, l.status, !l.featured)}
                              className={`p-1.5 rounded-lg ${
                                l.featured ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500'
                              }`}
                              title="Toggle Featured"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(l.id, 'Removed')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Remove Listing"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View (<768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {allListings.map((l) => (
                <div key={l.id} className="p-4 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <img
                      src={l.image}
                      alt={l.title}
                      className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{l.category}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            l.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : l.status === 'Flagged'
                              ? 'bg-rose-50 text-rose-700'
                              : l.status === 'Rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {l.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">{l.title}</h4>
                      <p className="text-sm font-extrabold text-blue-600 mt-0.5">₹{l.price.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl">
                    <span>Seller: {l.sellerName}</span>
                    <span>📍 {l.location}</span>
                  </div>

                  {canModerate && (
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateStatus(l.id, 'Active')}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(l.id, 'Flagged')}
                          className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold"
                        >
                          Flag
                        </button>
                      </div>

                      <button
                        onClick={() => handleUpdateStatus(l.id, 'Removed')}
                        className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {page} of {totalPages || 1}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION ANALYTICS */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Monthly Revenue (MRR)
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  ₹{subStats?.totalMonthlyRevenue?.toLocaleString() || '14,780'}
                </h3>
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +18.4% this month
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Pro Subscribers (₹499)
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {subStats?.tiers?.pro || 18}
                </h3>
                <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1 mt-1">
                  <Crown className="w-3.5 h-3.5" /> Top priority ranking
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Basic Subscribers (₹199)
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {subStats?.tiers?.basic || 34}
                </h3>
                <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1 mt-1">
                  <Sparkles className="w-3.5 h-3.5" /> 15 ads + 2 featured
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Free Tier Sellers
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {subStats?.tiers?.free || 142}
                </h3>
                <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                  3 active ads allowance
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">3-Tier Subscription Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                  FREE TIER
                </span>
                <p className="text-lg font-black text-slate-900">₹0 / month</p>
                <ul className="text-slate-600 space-y-1 text-[11px]">
                  <li>• Up to 3 active advertisements</li>
                  <li>• Standard marketplace search placement</li>
                  <li>• Direct in-app buyer messaging</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                  BASIC TIER
                </span>
                <p className="text-lg font-black text-blue-900">₹199 / month</p>
                <ul className="text-slate-600 space-y-1 text-[11px]">
                  <li>• Up to 15 active advertisements</li>
                  <li>• 2 Featured tags for 7 days</li>
                  <li>• Verified Seller badge</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-2">
                <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">
                  PRO TIER (MOST POPULAR)
                </span>
                <p className="text-lg font-black text-amber-900">₹499 / month</p>
                <ul className="text-slate-600 space-y-1 text-[11px]">
                  <li>• Unlimited active advertisements</li>
                  <li>• Top Priority search placement</li>
                  <li>• 10 Featured ads every month</li>
                  <li>• Gold PRO Seller badge on all ads</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK REJECT REASON MODAL */}
      {rejectingListing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">Reject Advertisement</h3>
              </div>
              <button
                onClick={() => setRejectingListing(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-600 font-medium">
                Rejecting: <strong className="text-slate-900">{rejectingListing.title}</strong>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Select a policy reason to explain to the seller why this ad was not approved.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Policy Reason</label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
              >
                {REJECTION_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Additional Notes / Instructions (Optional)
              </label>
              <textarea
                rows={2}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Add specific details for the seller to fix and resubmit..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setRejectingListing(null)}
                className="min-h-[40px] px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="min-h-[40px] px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT AD MODAL (BEFORE APPROVAL) */}
      {editingListing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-600">
                <Edit className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">Edit Listing Details</h3>
              </div>
              <button
                onClick={() => setEditingListing(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ListingCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
