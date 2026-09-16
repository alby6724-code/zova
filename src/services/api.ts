import {
  Listing,
  User,
  Report,
  ChatThread,
  ChatMessage,
  Payment,
  AuditLog,
  SupportTicket,
  DashboardKPIs,
  CategoryBreakdown,
  PlatformActivityPoint,
  UserTypeDistribution,
  TopSeller,
  Activity,
  Plan,
  Subscription,
  Review,
  SubscriptionTier,
  AdCreditPackage,
  PremiumTier,
  PremiumPackage,
  CompanySettings,
} from '../types/index.js';

function resolveApiBase(): string {
  const envUrl = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/$/, '');
  if (envUrl) {
    if (
      typeof window !== 'undefined' &&
      window.location?.hostname &&
      !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ) {
      try {
        const parsed = new URL(envUrl);
        if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
          return '/api';
        }
      } catch {
        return '/api';
      }
    }
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  return '/api';
}

const API_BASE = resolveApiBase();

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('zova_token') || localStorage.getItem('zioeemarket_token') || null;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('zova_token', token);
      localStorage.removeItem('zioeemarket_token'); // cleanup legacy key
    } else {
      localStorage.removeItem('zova_token');
      localStorage.removeItem('zioeemarket_token');
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: options.credentials || 'same-origin',
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const err: any = new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      err.status = response.status;
      err.locked = Boolean(errorData.locked ?? errorData.isLocked ?? (response.status === 429));
      err.retryAfterSeconds = errorData.retryAfterSeconds ?? errorData.remainingSeconds ?? (errorData.lockLevel === 2 ? 3600 : 10);
      err.remainingAttempts = errorData.remainingAttempts ?? errorData.remainingAttemptsBeforeLock;
      err.lockLevel = errorData.lockLevel ?? (response.status === 429 ? 1 : 0);
      throw err;
    }

    return response.json();
  }

  // Auth
  async login(credentials: { email?: string; username?: string; identifier?: string; password?: string; totpCode?: string }) {
    const res = await this.request<{ accessToken?: string; user?: User; requires2FA?: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.accessToken) {
      this.setToken(res.accessToken);
    }
    return res;
  }

  async logout() {
    try {
      await this.request<{ success: boolean; message: string }>('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Soft-fail network errors on logout
    } finally {
      this.setToken(null);
    }
  }

  async forgotPassword(email: string) {
    return this.request<{ success: boolean; message: string; simulatedResetToken?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: { token: string; newPassword: string }) {
    return this.request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // OTP Flows
  async sendOtp(destination: string, purpose: 'LOGIN' | 'REGISTER' = 'LOGIN') {
    return this.request<{
      success: boolean;
      expiresInSeconds: number;
      message: string;
      error?: string;
    }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ destination, purpose }),
    });
  }

  async verifyOtp(destination: string, code: string, purpose: 'LOGIN' | 'REGISTER' = 'LOGIN', name?: string) {
    const res = await this.request<{
      success: boolean;
      verified: boolean;
      userExists?: boolean;
      isNewUser?: boolean;
      accessToken?: string;
      refreshToken?: string;
      user?: User;
      message: string;
    }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ destination, code, purpose, name }),
    });
    if (res.accessToken) {
      this.setToken(res.accessToken);
    }
    return res;
  }

  async registerWithOtp(data: {
    destination: string;
    code?: string;
    name: string;
    role?: string;
    password?: string;
  }) {
    const res = await this.request<{
      success: boolean;
      message: string;
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/otp/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.accessToken) {
      this.setToken(res.accessToken);
    }
    return res;
  }

  // Admin Specific
  async getAdminSession() {
    return this.request<{
      authenticated: boolean;
      user: User;
      permissions: Record<string, boolean>;
    }>('/admin/session');
  }

  async getAdminMetrics() {
    return this.request<{
      platformStatus: string;
      timestamp: string;
      security: {
        activeLocks: number;
        totalRegisteredUsers: number;
        administrativeStaff: number;
        twoFactorCoveragePercent: number;
        recentFailedAttempts: number;
      };
      system: {
        nodeVersion: string;
        memoryUsageMb: number;
        uptimeSeconds: number;
      };
    }>('/admin/metrics');
  }

  async getCurrentUser() {
    return this.request<User>('/auth/me');
  }

  async setup2FA() {
    return this.request<{ secret: string; otpAuthUrl: string; backupCodes: string[] }>('/auth/2fa/setup', {
      method: 'POST',
    });
  }

  async verify2FA(code: string) {
    return this.request<{ success: boolean; message: string }>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // Dashboard Overview
  async getDashboardOverview() {
    return this.request<{
      kpis: DashboardKPIs;
      categories: CategoryBreakdown[];
      activity: PlatformActivityPoint[];
      userTypes: UserTypeDistribution;
      topSellers: TopSeller[];
      recentActivity: Activity[];
      recentListings: Listing[];
      reportedListings: Report[];
      recentChats: ChatThread[];
    }>('/dashboard/overview');
  }

  // Listings
  async getListings(params: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
    lat?: number;
    lng?: number;
    radius?: number;
  } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category) query.set('category', params.category);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.lat !== undefined) query.set('lat', params.lat.toString());
    if (params.lng !== undefined) query.set('lng', params.lng.toString());
    if (params.radius !== undefined) query.set('radius', params.radius.toString());

    return this.request<{
      data: Listing[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/listings?${query.toString()}`);
  }

  async createListing(data: Partial<Listing>) {
    return this.request<Listing>('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateListingStatus(id: string, status: string, featured?: boolean) {
    return this.request<Listing>(`/listings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, featured }),
    });
  }

  // Users
  async getUsers(params: { search?: string; role?: string; status?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.role) query.set('role', params.role);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    return this.request<{
      data: (User & { isLocked?: boolean; lockLevel?: number })[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/users?${query.toString()}`);
  }

  async createUser(data: Partial<User> & { password?: string }) {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: { status?: string; role?: string }) {
    return this.request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async unlockUser(userId: string) {
    return this.request<{ success: boolean; message: string }>(`/users/${userId}/unlock`, {
      method: 'POST',
    });
  }

  // Chats
  async getChats() {
    return this.request<ChatThread[]>('/chats');
  }

  async createOrGetChat(
    buyerId: string,
    sellerId: string,
    listingId?: string,
    buyerInfo?: { name: string; avatar?: string; email?: string }
  ) {
    return this.request<ChatThread>('/chats/create-or-get', {
      method: 'POST',
      body: JSON.stringify({
        buyerId,
        sellerId,
        listingId,
        buyer: buyerInfo ? { id: buyerId, ...buyerInfo } : undefined,
      }),
    });
  }

  async sendChatMessage(
    threadId: string,
    data:
      | string
      | {
          text?: string;
          type?: 'text' | 'voice' | 'location' | 'offer';
          audioUrl?: string;
          duration?: number;
          locationData?: { lat: number; lng: number; address: string };
          offerData?: {
            amount: number;
            status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
            counterAmount?: number;
            originalPrice?: number;
          };
          senderId?: string;
          senderName?: string;
          senderAvatar?: string;
        }
  ) {
    const payload = typeof data === 'string' ? { text: data } : data;
    return this.request<ChatMessage>(`/chats/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async respondToOffer(
    threadId: string,
    messageId: string,
    action: 'ACCEPT' | 'REJECT' | 'COUNTER',
    counterAmount?: number
  ) {
    return this.request<{ success: boolean; message: ChatMessage }>(
      `/chats/${threadId}/messages/${messageId}/offer`,
      {
        method: 'PATCH',
        body: JSON.stringify({ action, counterAmount }),
      }
    );
  }

  async reportChat(threadId: string, reason: string) {
    return this.request<{ success: boolean; message: string }>(`/chats/${threadId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Reports
  async getReports() {
    return this.request<Report[]>('/reports');
  }

  async resolveReport(id: string, action: 'DISMISS' | 'REMOVE_LISTING' | 'BAN_USER', note?: string) {
    return this.request<{ success: boolean; report: Report }>(`/reports/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    });
  }

  // Payments
  async getPayments() {
    return this.request<{ totalRevenue: number; currency: string; payments: Payment[] }>('/payments');
  }

  // Audit Logs
  async getAuditLogs() {
    return this.request<AuditLog[]>('/audit-logs');
  }

  // --- SUBSCRIPTIONS & PLANS ---
  async getPlans() {
    return this.request<{ plans: Plan[]; currency: string }>('/payments/plans');
  }

  async getMySubscription(userId: string) {
    return this.request<{
      tier: SubscriptionTier;
      plan: Plan;
      subscription?: Subscription;
      usage: {
        activeAdsCount: number;
        limit: number;
        remaining: number;
        featuredAdsUsedThisMonth: number;
        featuredAdsLimit: number;
      };
    }>(`/payments/my-subscription?userId=${encodeURIComponent(userId)}`);
  }

  async createSubscriptionOrder(data: { userId: string; tier: string; billingCycle?: 'MONTHLY' | 'YEARLY' }) {
    return this.request<{
      orderId: string;
      amount: number;
      currency: string;
      tier: string;
      billingCycle: string;
      keyId: string;
      customer: { id: string };
      notes: { planName: string; description: string };
    }>('/payments/create-subscription-order', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifySubscription(data: {
    userId: string;
    tier: string;
    billingCycle?: 'MONTHLY' | 'YEARLY';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      subscription: Subscription;
      plan: Plan;
    }>('/payments/verify-subscription', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- MODERATION QUEUE (ADMIN) ---
  async getPendingListings() {
    return this.request<{
      data: Listing[];
      total: number;
      flaggedCount: number;
    }>('/admin/pending-listings');
  }

  async approveListing(id: string) {
    return this.request<{ success: boolean; message: string; listing: Listing }>(`/admin/listings/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectListing(id: string, reason: string) {
    return this.request<{ success: boolean; message: string; listing: Listing }>(`/admin/listings/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async bulkModerateListings(listingIds: string[], action: 'APPROVE' | 'REJECT', reason?: string) {
    return this.request<{ success: boolean; modifiedCount: number; message: string }>('/admin/listings/bulk-moderate', {
      method: 'POST',
      body: JSON.stringify({ listingIds, action, reason }),
    });
  }

  async editListing(id: string, data: Partial<Listing>) {
    return this.request<{ success: boolean; listing: Listing }>(`/admin/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getSubscriptionStats() {
    return this.request<{
      totalMonthlyRevenue: number;
      currency: string;
      tiers: { free: number; basic: number; pro: number };
      totalSubscribers: number;
      expiringSoon: any[];
    }>('/admin/subscriptions/stats');
  }

  async getKeywordBlocklist() {
    return this.request<{ keywords: string[] }>('/admin/keyword-blocklist');
  }

  async addKeywordBlocklist(keyword: string) {
    return this.request<{ success: boolean; keywords: string[] }>('/admin/keyword-blocklist', {
      method: 'POST',
      body: JSON.stringify({ keyword }),
    });
  }

  // --- SELLER ADS, FAVORITES & REVIEWS ---
  async getMyAds(sellerId?: string) {
    const q = sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : '';
    return this.request<{
      data: Listing[];
      listings?: Listing[];
      summary: { total: number; active: number; pending: number; rejected: number };
    }>(`/listings/my-ads${q}`);
  }

  async getFavorites(userId?: string) {
    const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return this.request<{ data: Listing[]; favorites?: any[]; total: number }>(`/listings/favorites${q}`);
  }

  async getUserFavorites(userId?: string) {
    return this.getFavorites(userId);
  }

  async toggleFavorite(listingId: string, userId?: string) {
    return this.request<{ success: boolean; favorited?: boolean; isFavorite?: boolean; listingId: string }>(`/listings/${listingId}/favorite`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async getReviews(listingId: string) {
    return this.request<{ reviews: Review[]; averageRating: number; totalReviews: number }>(`/listings/${listingId}/reviews`);
  }

  async getSellerReviews(sellerIdOrListingId: string) {
    return this.request<{ reviews: Review[]; averageRating: number; totalReviews: number }>(`/listings/${sellerIdOrListingId}/reviews`);
  }

  async addReview(listingId: string, data: { buyerId?: string; buyerName?: string; rating: number; comment: string }) {
    return this.request<Review>(`/listings/${listingId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addListingReview(listingId: string, data: { rating: number; comment: string; buyerId?: string; buyerName?: string }) {
    const res = await this.addReview(listingId, {
      buyerId: data.buyerId || 'buyer-1',
      buyerName: data.buyerName || 'Verified Buyer',
      rating: data.rating,
      comment: data.comment,
    });
    return { review: res };
  }

  // --- PROFILE UPDATE ---
  async updateProfile(data: { name?: string; location?: string; city?: string; avatar?: string; phone?: string }) {
    return this.request<{ success?: boolean; user: User }>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // --- PREMIUM AD CREDIT PACKAGES ---

  /** Public: returns only ACTIVE packages (used by marketplace checkout) */
  async getPublicPackages() {
    return this.request<{ packages: AdCreditPackage[]; total: number; currency: string; currencySymbol: string }>('/packages');
  }

  /** Public: returns active tiers with nested active packages */
  async getPublicTiers() {
    return this.request<{ tiers: PremiumTier[]; total: number; currency: string }>('/tiers');
  }

  /** Public: get a server-calculated custom pack quote */
  async getCustomQuote(tierId: string, adsCount: number) {
    return this.request<{
      success: boolean;
      quote: {
        tierId: string;
        tierName: string;
        adsCount: number;
        perAdPrice: number;
        discountPercent: number;
        totalPrice: number;
        currency: string;
        durationValue: number;
        durationUnit: string;
      };
    }>('/packages/custom-quote', {
      method: 'POST',
      body: JSON.stringify({ tierId, adsCount }),
    });
  }

  /** Public: purchase a package (price is determined server-side) */
  async purchasePackage(data: {
    packageId?: string;
    tierId?: string;
    adsCount?: number;
    email: string;
    city?: string;
    category?: string;
    userId?: string;
  }) {
    return this.request<{
      success: boolean;
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
    }>('/packages/purchase', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /** Admin: returns all tiers including inactive */
  async getAdminTiers() {
    return this.request<{ tiers: PremiumTier[]; total: number }>('/admin/tiers');
  }

  /** Admin: create a new tier */
  async createAdminTier(data: Omit<PremiumTier, 'id' | 'createdAt' | 'updatedAt' | 'packages'>) {
    return this.request<{ success: boolean; tier: PremiumTier }>('/admin/tiers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /** Admin: update an existing tier */
  async updateAdminTier(id: string, data: Partial<Omit<PremiumTier, 'id' | 'createdAt'>>) {
    return this.request<{ success: boolean; tier: PremiumTier }>(`/admin/tiers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /** Admin: delete a tier (also deletes its packages) */
  async deleteAdminTier(id: string) {
    return this.request<{ success: boolean; message: string }>(`/admin/tiers/${id}`, {
      method: 'DELETE',
    });
  }

  /** Admin: returns all packages including INACTIVE ones */
  async getAdminPackages() {
    return this.request<{ packages: AdCreditPackage[]; tiers: PremiumTier[]; total: number }>('/admin/packages');
  }

  /** Admin: create a new package */
  async createPackage(data: {
    tierId?: string;
    name: string;
    description?: string;
    adsCount?: number;
    credits?: number;
    durationValue?: number;
    durationUnit?: 'Month' | 'Days' | 'Year';
    durationDays?: number;
    price: number;
    badge?: string;
    active?: boolean;
    status?: 'ACTIVE' | 'INACTIVE';
    displayOrder?: number;
    sortOrder?: number;
  }) {
    return this.request<{ success: boolean; package: AdCreditPackage }>('/admin/packages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /** Admin: update an existing package by ID */
  async updatePackage(id: string, data: Partial<Omit<AdCreditPackage, 'id' | 'createdAt' | 'updatedAt'>>) {
    return this.request<{ success: boolean; package: AdCreditPackage }>(`/admin/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /** Admin: permanently delete a package */
  async deletePackage(id: string) {
    return this.request<{ success: boolean; message: string }>(`/admin/packages/${id}`, {
      method: 'DELETE',
    });
  }

  // --- COMPANY BRANDING SETTINGS ---

  /** Public: fetch current safe company branding settings */
  async getPublicSettings() {
    return this.request<{ settings: CompanySettings }>('/settings/public');
  }

  /** Admin: fetch full company settings */
  async getAdminSettings() {
    return this.request<{ settings: CompanySettings }>('/admin/settings');
  }

  /** Admin: update company branding settings */
  async updateAdminSettings(data: Partial<CompanySettings>) {
    return this.request<{ success: boolean; settings: CompanySettings }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();
