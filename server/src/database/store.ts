import {
  User,
  Listing,
  Activity,
  Report,
  ChatThread,
  Payment,
  ContactRequest,
  AuditLog,
  SupportTicket,
  DashboardKPIs,
  CategoryBreakdown,
  PlatformActivityPoint,
  UserTypeDistribution,
  TopSeller,
  UserRole,
  FailedLoginAttempt,
  PasswordResetToken,
  Coordinates,
  ListingCategory,
  SubscriptionTier,
  Plan,
  Subscription,
  Review,
  Favorite,
  AdCreditPackage,
  PremiumTier,
  PremiumPackage,
  CompanySettings,
} from '../types/index.js';
import bcrypt from 'bcryptjs';
import { DEMO_SELLERS, DEMO_LISTINGS } from './demoData.js';
import { getTwentyRandomProducts } from './randomProducts.js';

// Haversine distance formula calculation in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Calculate or load initial admin password hash securely
function getInitialAdminPasswordHash(): string {
  if (process.env.INITIAL_ADMIN_PASSWORD_HASH) {
    return process.env.INITIAL_ADMIN_PASSWORD_HASH;
  }
  if (process.env.INITIAL_ADMIN_SECRET) {
    return bcrypt.hashSync(process.env.INITIAL_ADMIN_SECRET, 12);
  }
  // Pre-computed bcrypt hash (rounds=12) of default admin password (Admin#penal@131366674).
  // This is NOT the plaintext password — it is a one-way hash.
  return '$2a$12$v.VF9XSKSCoJ.aOuN7X2Eevh9XLn4oM2cOPBoGUdjRHGpLufm1RnC';
}

function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || 'nishanahmed84@gmail.com').toLowerCase().trim();
}

function getAdminName(): string {
  return (process.env.ADMIN_NAME || 'Nishan Ahmed').trim();
}

class DatabaseStore {
  public users: User[] = [];
  public listings: Listing[] = [];
  public activities: Activity[] = [];
  public reports: Report[] = [];
  public chats: ChatThread[] = [];
  public payments: Payment[] = [];
  public contactRequests: ContactRequest[] = [];
  public auditLogs: AuditLog[] = [];
  public supportTickets: SupportTicket[] = [];
  public failedAttempts: FailedLoginAttempt[] = [];
  public passwordResetTokens: Map<string, PasswordResetToken> = new Map();
  public subscriptions: Subscription[] = [];
  public plans: Plan[] = [
    {
      id: 'FREE',
      name: 'Free Starter',
      priceMonthly: 0,
      priceYearly: 0,
      activeListingLimit: 3,
      featuredAdsLimit: 0,
      durationDays: 30,
      verifiedBadge: false,
      homepageBanner: false,
      prioritySearch: false,
      analyticsLevel: 'NONE',
      supportLevel: 'STANDARD',
    },
    {
      id: 'BASIC',
      name: 'Basic Seller',
      priceMonthly: 199,
      priceYearly: 1999,
      activeListingLimit: 15,
      featuredAdsLimit: 2,
      durationDays: 60,
      verifiedBadge: true,
      homepageBanner: false,
      prioritySearch: false,
      analyticsLevel: 'BASIC',
      supportLevel: 'PRIORITY',
    },
    {
      id: 'PRO',
      name: 'Pro Merchant',
      priceMonthly: 499,
      priceYearly: 4999,
      activeListingLimit: -1, // Unlimited
      featuredAdsLimit: 10,
      durationDays: 90,
      verifiedBadge: true,
      homepageBanner: true,
      prioritySearch: true,
      analyticsLevel: 'ADVANCED',
      supportLevel: 'DEDICATED',
    },
  ];

  // Global Company Branding Settings (Database-backed single source of truth)
  public settings: CompanySettings = {
    companyName: process.env.COMPANY_NAME || 'ZOVA',
    tagline: process.env.COMPANY_TAGLINE || "India's Verified Local Marketplace",
    description: process.env.COMPANY_DESCRIPTION || 'Buy and sell cars, mobiles, electronics, furniture, and local services with zero commission fees on ZOVA.',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@zova.com',
    supportPhone: process.env.SUPPORT_PHONE || '+91 98765 43210',
    websiteName: process.env.WEBSITE_NAME || 'ZOVA',
    footerCopyright: process.env.FOOTER_COPYRIGHT || `© ${new Date().getFullYear()} ZOVA. All rights reserved.`,
    logoUrl: '',
    faviconText: 'Z',
    updatedAt: new Date().toISOString(),
  };

  // Premium Tiers configuration
  public tiers: PremiumTier[] = [
    {
      id: 'tier-platinum',
      name: 'Platinum',
      description: 'Maximum Visibility, Higher Reach, More Responses',
      benefits: [
        'Maximum Visibility',
        'Higher Reach',
        'More Responses',
        'Homepage & Category Priority',
        'Verified Seller Badge',
      ],
      active: true,
      displayOrder: 1,
      featured: false,
      badge: 'Popular',
      perAdPrice: 120,
      maxCustomAds: 28,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tier-platinum-plus',
      name: 'Platinum Plus',
      description: 'Maximum Visibility, Top Placement, Unlimited Responses',
      benefits: [
        'Maximum Visibility',
        'Top Placement',
        'Unlimited Responses',
        'Prime Search Pinning',
        'Direct WhatsApp & Call Leads',
        '24/7 Dedicated Support',
      ],
      active: true,
      displayOrder: 2,
      featured: true,
      badge: 'Best Value',
      perAdPrice: 180,
      maxCustomAds: 28,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tier-real-estate-special',
      name: 'Real Estate Special',
      description: 'Engineered specifically for real estate dealers, property agents, and high-ticket listings',
      benefits: [
        'Maximum Visibility',
        'Top Placement',
        'High-Intent Property Buyer Match',
        'Verified Broker / Builder Badge',
        'Dedicated Property Showcase',
        'Unlimited Inquiries',
      ],
      active: true,
      displayOrder: 3,
      featured: false,
      badge: 'Real Estate Special',
      perAdPrice: 499,
      maxCustomAds: 28,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Premium Packages under each Tier
  public packages: PremiumPackage[] = [
    // PLATINUM (8 packages: 1, 3, 6, 8, 12, 18, 23, 28)
    { id: 'pkg-plat-1', tierId: 'tier-platinum', name: '1 Ads Pack', adsCount: 1, price: 199, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-3', tierId: 'tier-platinum', name: '3 Ads Pack', adsCount: 3, price: 499, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-6', tierId: 'tier-platinum', name: '6 Ads Pack', adsCount: 6, price: 899, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-8', tierId: 'tier-platinum', name: '8 Ads Pack', adsCount: 8, price: 1099, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 4, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-12', tierId: 'tier-platinum', name: '12 Ads Pack', adsCount: 12, price: 1499, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-18', tierId: 'tier-platinum', name: '18 Ads Pack', adsCount: 18, price: 1999, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 6, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-23', tierId: 'tier-platinum', name: '23 Ads Pack', adsCount: 23, price: 2399, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 7, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-28', tierId: 'tier-platinum', name: '28 Ads Pack', adsCount: 28, price: 2799, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 8, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

    // PLATINUM PLUS (8 packages: 1, 3, 6, 8, 12, 18, 23, 28)
    { id: 'pkg-plat-plus-1', tierId: 'tier-platinum-plus', name: '1 Ads Pack', adsCount: 1, price: 299, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-plus-3', tierId: 'tier-platinum-plus', name: '3 Ads Pack', adsCount: 3, price: 749, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-plus-6', tierId: 'tier-platinum-plus', name: '6 Ads Pack', adsCount: 6, price: 1349, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-plus-8', tierId: 'tier-platinum-plus', name: '8 Ads Pack', adsCount: 8, price: 1699, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 4, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-plus-12', tierId: 'tier-platinum-plus', name: '12 Ads Pack', adsCount: 12, price: 2299, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-plus-18', tierId: 'tier-platinum-plus', name: '18 Ads Pack', adsCount: 18, price: 3199, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 6, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-plus-23', tierId: 'tier-platinum-plus', name: '23 Ads Pack', adsCount: 23, price: 3899, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 7, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pkg-plat-plus-28', tierId: 'tier-platinum-plus', name: '28 Ads Pack', adsCount: 28, price: 4499, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 8, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

    // REAL ESTATE SPECIAL (1 package: 1 Ads Pack, 1 Month)
    { id: 'pkg-re-1', tierId: 'tier-real-estate-special', name: '1 Ads Pack', adsCount: 1, price: 499, currency: '₹', durationValue: 1, durationUnit: 'Month', active: true, displayOrder: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];
  public reviews: Review[] = [];
  public favorites: Set<string> = new Set(); // Key: `${userId}:${listingId}`
  public bannedKeywords: string[] = [
    'weapon',
    'weapons',
    'gun',
    'guns',
    'pistol',
    'rifle',
    'firearm',
    'drugs',
    'narcotics',
    'cocaine',
    'heroin',
    'counterfeit',
    'explosives',
    'stolen',
    'fake currency',
    'replica weapon',
    'illicit',
  ];

  constructor() {
    this.seed();
  }

  // Method called by create-admin CLI script or migrations
  public upsertAdminUser(email: string, passwordHash: string, name = 'Admin', role: UserRole = 'SUPER_ADMIN'): User {
    const existingIndex = this.users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (existingIndex >= 0) {
      this.users[existingIndex].passwordHash = passwordHash;
      this.users[existingIndex].role = role;
      this.users[existingIndex].status = 'ACTIVE';
      return this.users[existingIndex];
    }

    const newAdmin: User = {
      id: `usr-admin-${Date.now()}`,
      name,
      username: 'marketplace',
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      twoFactorEnabled: false,
      twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      listingsCount: 0,
      totalViews: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    this.users.unshift(newAdmin);
    return newAdmin;
  }

  private seed() {
    // 1. Single Administrator Account (Zero demo data)
    const initialAdminHash = getInitialAdminPasswordHash();
    const adminEmail = getAdminEmail();
    const adminName = getAdminName();
    this.users = [
      {
        id: 'usr-admin-root',
        name: adminName,
        username: 'marketplace',
        email: adminEmail,
        passwordHash: initialAdminHash,
        role: 'SUPER_ADMIN',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: 'ACTIVE',
        twoFactorEnabled: false,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        listingsCount: 0,
        totalViews: 0,
        phone: '+1 555 019 2834',
        location: 'ZOVA Operations',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      },
      {
        id: 'admin-root-001',
        name: 'Marketplace Administrator',
        username: 'marketplace',
        email: 'marketplace@zioeemarket.com',
        passwordHash: bcrypt.hashSync('market@23022374', 10),
        role: 'SUPER_ADMIN',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: 'ACTIVE',
        twoFactorEnabled: false,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        listingsCount: 0,
        totalViews: 0,
        phone: '+1 555 019 2835',
        location: 'ZOVA Operations',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      },
    ];

    // Real marketplace data structures initialized empty
    this.listings = [];
    this.activities = [];
    this.reports = [];
    this.chats = [];
    this.payments = [];
    this.contactRequests = [];
    this.auditLogs = [];
    this.supportTickets = [];
    this.failedAttempts = [];

    // Automatically seed the 20 demo listings and 5 demo sellers
    this.seedDemoData();
  }

  // Idempotent demo data seeder
  public seedDemoData(force = false): { sellersCount: number; listingsCount: number } {
    const existingDemoCount = this.listings.filter((l) => l.is_demo).length;
    if (existingDemoCount > 0 && !force) {
      return {
        sellersCount: this.users.filter((u) => u.is_demo).length,
        listingsCount: existingDemoCount,
      };
    }

    // Clear existing demo records to guarantee clean, duplicate-free data
    this.clearDemoData();

    // Seed demo sellers
    for (const seller of DEMO_SELLERS) {
      this.users.push({ ...seller });
    }

    // Seed demo listings
    for (const listing of DEMO_LISTINGS) {
      this.listings.push({ ...listing });
    }

    // Seed demo seller subscriptions so quota/tier checks pass
    this.subscriptions = this.subscriptions.filter((s) => !s.userId.startsWith('usr-demo-seller-'));
    this.subscriptions.push(
      {
        id: 'sub-demo-1',
        userId: 'usr-demo-seller-1',
        tier: 'PRO',
        billingCycle: 'MONTHLY',
        startDate: new Date(Date.now() - 14 * 86400000).toISOString(),
        expiresAt: new Date(Date.now() + 16 * 86400000).toISOString(),
        status: 'ACTIVE',
        featuredAdsUsedThisMonth: 1,
      },
      {
        id: 'sub-demo-2',
        userId: 'usr-demo-seller-4',
        tier: 'PRO',
        billingCycle: 'MONTHLY',
        startDate: new Date(Date.now() - 11 * 86400000).toISOString(),
        expiresAt: new Date(Date.now() + 19 * 86400000).toISOString(),
        status: 'ACTIVE',
        featuredAdsUsedThisMonth: 2,
      },
      {
        id: 'sub-demo-3',
        userId: 'usr-demo-seller-2',
        tier: 'BASIC',
        billingCycle: 'MONTHLY',
        startDate: new Date(Date.now() - 13 * 86400000).toISOString(),
        expiresAt: new Date(Date.now() + 17 * 86400000).toISOString(),
        status: 'ACTIVE',
        featuredAdsUsedThisMonth: 0,
      }
    );

    // Seed realistic demo chats with Buying and Selling contexts if empty
    if (this.chats.length === 0) {
      this.chats.push(
        {
          id: 'chat-demo-buy-1',
          listingId: 'lst-demo-1',
          listingTitle: 'iPhone 14 Pro Max 256GB Deep Purple',
          listingImage: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
          listingPrice: 82000,
          sellerId: 'usr-demo-seller-1',
          sellerName: 'TechWorld Kolkata',
          sellerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
          sellerPhone: '+91 98301 23456',
          buyerId: 'usr-1',
          buyerName: 'Priya Sharma',
          buyerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
          user: {
            id: 'usr-1',
            name: 'Priya Sharma',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
            email: 'priya.sharma@example.com',
          },
          lastMessage: 'Is the price negotiable if I pick it up today?',
          timeAgo: '15m ago',
          unread: true,
          messages: [
            {
              id: 'msg-demo-1',
              senderId: 'usr-1',
              senderName: 'Priya Sharma',
              senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
              text: 'Hi TechWorld Kolkata, I am interested in your listing "iPhone 14 Pro Max 256GB Deep Purple". Is it still available?',
              timestamp: '11:20 AM',
            },
            {
              id: 'msg-demo-2',
              senderId: 'usr-demo-seller-1',
              senderName: 'TechWorld Kolkata',
              senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              text: 'Yes Priya! It is 100% genuine with complete bill and box. Battery health is 96%.',
              timestamp: '11:25 AM',
            },
            {
              id: 'msg-demo-3',
              senderId: 'usr-1',
              senderName: 'Priya Sharma',
              senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
              text: 'Is the price negotiable if I pick it up today?',
              timestamp: '11:30 AM',
            },
          ],
        },
        {
          id: 'chat-demo-sell-1',
          listingId: 'lst-demo-3',
          listingTitle: 'Sony PlayStation 5 Disc Edition + 2 Controllers',
          listingImage: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600',
          listingPrice: 41000,
          sellerId: 'usr-1',
          sellerName: 'Priya Sharma',
          sellerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
          sellerPhone: '+91 98000 00000',
          buyerId: 'usr-buyer-2',
          buyerName: 'Amit Verma',
          buyerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
          user: {
            id: 'usr-buyer-2',
            name: 'Amit Verma',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
            email: 'amit.verma@example.com',
          },
          lastMessage: '🏷️ Offer: ₹38,000 for Sony PlayStation 5 Disc Edition',
          timeAgo: '1h ago',
          unread: true,
          messages: [
            {
              id: 'msg-demo-4',
              senderId: 'usr-buyer-2',
              senderName: 'Amit Verma',
              senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
              text: 'Hi Priya, does the PS5 come with the HDMI cable and original invoice?',
              timestamp: '10:05 AM',
            },
            {
              id: 'msg-demo-5',
              senderId: 'usr-buyer-2',
              senderName: 'Amit Verma',
              senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
              text: '🏷️ Offer: ₹38,000 for Sony PlayStation 5 Disc Edition',
              type: 'offer',
              offerData: {
                amount: 38000,
                originalPrice: 41000,
                status: 'PENDING',
              },
              timestamp: '10:08 AM',
            },
          ],
        }
      );
    }

    return {
      sellersCount: DEMO_SELLERS.length,
      listingsCount: DEMO_LISTINGS.length,
    };
  }

  // Appends 20 realistic random product listings across all categories
  public addRandomProducts(count = 20): Listing[] {
    const products = getTwentyRandomProducts().slice(0, count);
    for (const p of products) {
      this.listings.unshift(p);
    }
    return products;
  }

  // Wipes all demo data (is_demo === true)
  public clearDemoData(): { removedUsers: number; removedListings: number } {
    const initialUsers = this.users.length;
    const initialListings = this.listings.length;

    this.users = this.users.filter((u) => !u.is_demo);
    this.listings = this.listings.filter((l) => !l.is_demo);
    this.subscriptions = this.subscriptions.filter((s) => !s.userId.startsWith('usr-demo-seller-'));

    return {
      removedUsers: initialUsers - this.users.length,
      removedListings: initialListings - this.listings.length,
    };
  }

  // Dynamic KPIs computed strictly from live marketplace records
  public getKPIs(): DashboardKPIs {
    const totalUsersCount = this.users.filter((u) => u.role !== 'SUPER_ADMIN').length;
    const totalListingsCount = this.listings.length;
    const totalChatsCount = this.chats.length;
    const contactClicksCount = this.contactRequests.length;
    const reportedItemsCount = this.reports.filter((r) => r.status === 'Pending').length;

    return {
      totalUsers: { count: totalUsersCount, change: '0%', positive: true },
      totalListings: { count: totalListingsCount, change: '0%', positive: true },
      totalChats: { count: totalChatsCount, change: '0%', positive: true },
      contactClicks: { count: contactClicksCount, change: '0%', positive: true },
      reportedItems: { count: reportedItemsCount, change: '0%', positive: false },
    };
  }

  // Real category breakdown computed from live listings
  public getCategoriesBreakdown(): CategoryBreakdown[] {
    const catColors: Record<string, string> = {
      'Mobiles': '#3b82f6',
      'Laptops': '#8b5cf6',
      'Vehicles': '#06b6d4',
      'Home & Living': '#10b981',
      'Furniture': '#f59e0b',
      'Electronics': '#22c55e',
      'Fashion': '#ec4899',
      'Jobs': '#f97316',
      'Services': '#14b8a6',
      'Mobiles & Tablets': '#3b82f6',
      'Home & Furniture': '#10b981',
      'Fashion & Beauty': '#ec4899',
      'Others': '#64748b',
    };

    const categories: ListingCategory[] = [
      'Mobiles',
      'Laptops',
      'Vehicles',
      'Home & Living',
      'Furniture',
      'Electronics',
      'Fashion',
      'Jobs',
      'Services',
    ];

    const total = this.listings.length;
    return categories.map((cat) => {
      const count = this.listings.filter((l) => l.category === cat).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        name: cat,
        count,
        percentage,
        color: catColors[cat] || '#64748b',
      };
    });
  }

  // Real platform activity points based on current platform data
  public getPlatformActivity(): PlatformActivityPoint[] {
    const totalUsers = this.users.length;
    const totalListings = this.listings.length;
    const totalChats = this.chats.length;

    return [
      { date: 'Day 1', users: 0, listings: 0, chats: 0 },
      { date: 'Day 2', users: 0, listings: 0, chats: 0 },
      { date: 'Day 3', users: 0, listings: 0, chats: 0 },
      { date: 'Day 4', users: 0, listings: 0, chats: 0 },
      { date: 'Day 5', users: 0, listings: 0, chats: 0 },
      { date: 'Day 6', users: 0, listings: 0, chats: 0 },
      { date: 'Today', users: totalUsers, listings: totalListings, chats: totalChats },
    ];
  }

  // Real user type distribution
  public getUserTypeDistribution(): UserTypeDistribution {
    const buyers = this.users.filter((u) => u.role === 'BUYER').length;
    const sellers = this.users.filter((u) => u.role === 'SELLER').length;
    const total = buyers + sellers;
    return {
      buyers: { count: buyers, percentage: total > 0 ? Math.round((buyers / total) * 100) : 100 },
      sellers: { count: sellers, percentage: total > 0 ? Math.round((sellers / total) * 100) : 0 },
    };
  }

  // Dynamic top sellers calculated from live listings
  public getTopSellers(): TopSeller[] {
    const map = new Map<string, TopSeller>();
    for (const l of this.listings) {
      const existing = map.get(l.sellerId) || {
        id: l.sellerId,
        name: l.sellerName,
        avatar: l.sellerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        listings: 0,
        totalViews: 0,
      };
      existing.listings += 1;
      existing.totalViews += l.views || 0;
      map.set(l.sellerId, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.listings - a.listings).slice(0, 5);
  }

  public logAction(adminId: string, adminName: string, adminRole: UserRole, action: string, target: string, details: string, ip: string) {
    const log: AuditLog = {
      id: `aud-${Date.now()}`,
      adminId,
      adminName,
      adminRole,
      action,
      target,
      details,
      ip: ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    return log;
  }

  // Progressive Lockout Management
  public recordFailedLogin(email: string, ip: string) {
    const normEmail = email.toLowerCase().trim();
    const now = Date.now();
    let record = this.failedAttempts.find((f) => f.email === normEmail || f.ip === ip);

    if (!record) {
      const user = this.users.find((u) => u.email.toLowerCase() === normEmail || (u.username && u.username.toLowerCase() === normEmail));
      record = {
        id: `fail-${Date.now()}`,
        userId: user?.id,
        email: normEmail,
        ip,
        attempts: 1,
        firstAttemptAt: new Date(now).toISOString(),
        lastAttemptAt: new Date(now).toISOString(),
        lockedUntil: null,
        lockLevel: 0,
      };
      this.failedAttempts.push(record);
      return {
        isLocked: false,
        attempts: 1,
        remainingAttemptsBeforeLock: 2,
        lockLevel: 0,
        remainingSeconds: 0,
      };
    }

    record.attempts += 1;
    record.lastAttemptAt = new Date(now).toISOString();

    if (record.attempts >= 6) {
      // Level 2 Lock: 1 hour (3600 seconds)
      record.lockLevel = 2;
      record.lockedUntil = new Date(now + 3600 * 1000).toISOString();
      const user = this.users.find((u) => u.email.toLowerCase() === normEmail || (u.username && u.username.toLowerCase() === normEmail));
      if (user) {
        user.lockedUntil = record.lockedUntil;
        user.lockLevel = 2;
      }

      this.logAction(
        'SYSTEM',
        'Security Engine',
        'SUPER_ADMIN',
        'ACCOUNT_LOCKED_1HR',
        normEmail,
        `Account locked for 1 hour due to 6 failed authentication attempts. Email alert sent to ${normEmail}.`,
        ip
      );

      return {
        isLocked: true,
        attempts: record.attempts,
        remainingAttemptsBeforeLock: 0,
        lockLevel: 2,
        remainingSeconds: 3600,
        message: 'Account locked for 1 hour due to repeated authentication failures. A security email alert has been dispatched.',
      };
    } else if (record.attempts === 3) {
      // Level 1 Lock: 10 seconds (triggered on 3rd failed attempt)
      record.lockLevel = 1;
      record.lockedUntil = new Date(now + 10 * 1000).toISOString();
      const user = this.users.find((u) => u.email.toLowerCase() === normEmail || (u.username && u.username.toLowerCase() === normEmail));
      if (user) {
        user.lockedUntil = record.lockedUntil;
        user.lockLevel = 1;
      }

      this.logAction(
        'SYSTEM',
        'Security Engine',
        'SUPER_ADMIN',
        'ACCOUNT_LOCKED_10SEC',
        normEmail,
        `Temporary 10s lockout applied after 3 failed attempts.`,
        ip
      );

      return {
        isLocked: true,
        attempts: record.attempts,
        remainingAttemptsBeforeLock: 0,
        lockLevel: 1,
        remainingSeconds: 10,
        message: 'Temporary security lockout: please wait 10 seconds before retrying.',
      };
    }

    const remaining = record.attempts < 3 ? 3 - record.attempts : 6 - record.attempts;
    return {
      isLocked: false,
      attempts: record.attempts,
      remainingAttemptsBeforeLock: remaining,
      lockLevel: record.lockLevel,
      remainingSeconds: 0,
    };
  }

  public getLockoutStatus(email: string, ip: string) {
    const normEmail = email.toLowerCase().trim();
    const record = this.failedAttempts.find((f) => f.email === normEmail || f.ip === ip);

    if (!record || !record.lockedUntil) {
      return { isLocked: false, remainingSeconds: 0, lockLevel: 0 };
    }

    const now = Date.now();
    const lockExpiry = new Date(record.lockedUntil).getTime();

    if (now < lockExpiry) {
      const remainingSeconds = Math.ceil((lockExpiry - now) / 1000);
      return {
        isLocked: true,
        remainingSeconds,
        lockLevel: record.lockLevel,
        reason:
          record.lockLevel === 2
            ? 'Account is locked for 1 hour due to 6 repeated failed login attempts.'
            : 'Temporary security pause: 10 seconds lockout in effect.',
      };
    }

    // Lock has expired
    record.lockedUntil = null;
    const user = this.users.find((u) => u.email.toLowerCase() === normEmail || (u.username && u.username.toLowerCase() === normEmail));
    if (user) {
      user.lockedUntil = null;
    }

    return { isLocked: false, remainingSeconds: 0, lockLevel: record.lockLevel };
  }

  public resetFailedLogins(email: string, ip?: string) {
    const normEmail = email.toLowerCase().trim();
    this.failedAttempts = this.failedAttempts.filter((f) => f.email !== normEmail && (!ip || f.ip !== ip));
    const user = this.users.find((u) => u.email.toLowerCase() === normEmail || (u.username && u.username.toLowerCase() === normEmail));
    if (user) {
      user.lockedUntil = null;
      user.lockLevel = 0;
    }
  }

  public adminUnlock(emailOrUserId: string, adminId: string, adminName: string, ip: string) {
    const user = this.users.find(
      (u) => u.id === emailOrUserId || u.email.toLowerCase() === emailOrUserId.toLowerCase() || (u.username && u.username.toLowerCase() === emailOrUserId.toLowerCase())
    );
    const targetEmail = user ? user.email.toLowerCase() : emailOrUserId.toLowerCase();

    this.failedAttempts = this.failedAttempts.filter((f) => f.email !== targetEmail);

    if (user) {
      user.lockedUntil = null;
      user.lockLevel = 0;
    }

    this.logAction(
      adminId,
      adminName,
      'SUPER_ADMIN',
      'ACCOUNT_UNLOCK_MANUAL',
      targetEmail,
      `Administrator manually reset progressive lockout and unlocked account.`,
      ip
    );

    return { success: true, email: targetEmail, message: `Account for ${targetEmail} has been successfully unlocked.` };
  }

  // Password Reset Link Creation and Validation
  public createPasswordResetToken(email: string) {
    const normEmail = email.toLowerCase().trim();
    const token = `rst-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins TTL

    this.passwordResetTokens.set(token, { email: normEmail, token, expiresAt });

    this.logAction(
      'SYSTEM',
      'Security Engine',
      'SUPER_ADMIN',
      'PASSWORD_RESET_TOKEN_GENERATED',
      normEmail,
      `Generated secure password reset token (valid 15m). Simulated email link: /reset-password?token=${token}`,
      '127.0.0.1'
    );

    return { token, expiresAt, email: normEmail };
  }

  public resetPasswordWithToken(token: string, newPasswordHash: string) {
    const record = this.passwordResetTokens.get(token);
    if (!record) {
      return { success: false, error: 'Invalid or expired password reset token.' };
    }

    if (Date.now() > new Date(record.expiresAt).getTime()) {
      this.passwordResetTokens.delete(token);
      return { success: false, error: 'Password reset token has expired (15 minute TTL exceeded).' };
    }

    const user = this.users.find((u) => u.email.toLowerCase() === record.email || (u.username && u.username.toLowerCase() === record.email));
    if (!user) {
      return { success: false, error: 'Associated user account not found.' };
    }

    user.passwordHash = newPasswordHash;
    this.passwordResetTokens.delete(token);
    this.resetFailedLogins(user.email, '127.0.0.1');

    this.logAction(
      user.id,
      user.name,
      user.role,
      'PASSWORD_RESET_SUCCESS',
      user.email,
      'Password successfully changed and previous security lockouts revoked.',
      '127.0.0.1'
    );

    return { success: true };
  }

  // User-to-User Chat Creation & Reporting
  public createOrGetChatThread(
    buyer: { id: string; name: string; avatar: string; email: string },
    listing: { id: string; title: string; sellerId: string; sellerName: string }
  ): ChatThread {
    let thread = this.chats.find(
      (c) => c.listingId === listing.id && (c.user.email.toLowerCase() === buyer.email.toLowerCase() || c.user.id === buyer.id)
    );

    if (!thread) {
      const fullListing = this.listings.find((l) => l.id === listing.id);
      const sellerUser = this.users.find((u) => u.id === listing.sellerId);

      thread = {
        id: `chat-${Date.now()}`,
        listingId: listing.id,
        listingTitle: listing.title,
        listingImage: fullListing?.image || fullListing?.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
        listingPrice: fullListing?.price || 0,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        sellerAvatar: sellerUser?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
        sellerPhone: sellerUser?.phone || '+91 98000 00000',
        buyerId: buyer.id,
        buyerName: buyer.name,
        buyerAvatar: buyer.avatar,
        user: {
          id: buyer.id,
          name: buyer.name,
          avatar: buyer.avatar,
          email: buyer.email,
        },
        lastMessage: `Inquiry regarding ${listing.title}`,
        timeAgo: 'Just now',
        unread: false,
        messages: [
          {
            id: `msg-${Date.now()}`,
            senderId: buyer.id,
            senderName: buyer.name,
            senderAvatar: buyer.avatar,
            text: `Hi ${listing.sellerName}, I am interested in your listing "${listing.title}". Is it still available?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      };
      this.chats.unshift(thread);
    }

    return thread;
  }

  // --- CONTENT MODERATION & BANNED KEYWORDS ---
  public checkContentForBannedKeywords(title: string, description: string): { flagged: boolean; matchedKeyword?: string } {
    const text = `${title} ${description}`.toLowerCase();
    for (const kw of this.bannedKeywords) {
      // Word boundary match
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(text)) {
        return { flagged: true, matchedKeyword: kw };
      }
    }
    return { flagged: false };
  }

  // --- SUBSCRIPTIONS & PLANS ---
  public getUserActiveSubscription(userId: string): { plan: Plan; subscription?: Subscription; tier: SubscriptionTier } {
    const sub = this.subscriptions.find(
      (s) => s.userId === userId && s.status === 'ACTIVE' && new Date(s.expiresAt).getTime() > Date.now()
    );
    const tier: SubscriptionTier = sub ? sub.tier : 'FREE';
    const plan = this.plans.find((p) => p.id === tier) || this.plans[0];
    return { plan, subscription: sub, tier };
  }

  public canUserPostAd(userId: string): { allowed: boolean; limit: number; activeCount: number; reason?: string } {
    const { plan, tier } = this.getUserActiveSubscription(userId);
    const activeAds = this.listings.filter(
      (l) => l.sellerId === userId && (l.status === 'Active' || l.status === 'Pending')
    );

    if (plan.activeListingLimit !== -1 && activeAds.length >= plan.activeListingLimit) {
      return {
        allowed: false,
        limit: plan.activeListingLimit,
        activeCount: activeAds.length,
        reason: `Your ${plan.name} allows a maximum of ${plan.activeListingLimit} active listings. Upgrade to Basic or Pro to post more ads.`,
      };
    }

    return { allowed: true, limit: plan.activeListingLimit, activeCount: activeAds.length };
  }

  // --- AD MODERATION WORKFLOW ---
  public approveListing(listingId: string, adminId: string, adminName: string): Listing {
    const index = this.listings.findIndex((l) => l.id === listingId);
    if (index === -1) throw new Error('Listing not found');

    this.listings[index].status = 'Active';
    this.listings[index].rejectionReason = undefined;

    // Log admin activity
    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      adminId,
      adminName,
      adminRole: 'ADMIN',
      action: 'APPROVE_LISTING',
      target: listingId,
      details: `Approved listing "${this.listings[index].title}" (Category: ${this.listings[index].category}, Price: ₹${this.listings[index].price})`,
      ip: '127.0.0.1',
      timestamp: new Date().toISOString(),
    });

    return this.listings[index];
  }

  public rejectListing(listingId: string, reason: string, adminId: string, adminName: string): Listing {
    const index = this.listings.findIndex((l) => l.id === listingId);
    if (index === -1) throw new Error('Listing not found');

    this.listings[index].status = 'Rejected';
    this.listings[index].rejectionReason = reason;

    // Log admin activity
    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      adminId,
      adminName,
      adminRole: 'ADMIN',
      action: 'REJECT_LISTING',
      target: listingId,
      details: `Rejected listing "${this.listings[index].title}" — Reason: ${reason}`,
      ip: '127.0.0.1',
      timestamp: new Date().toISOString(),
    });

    return this.listings[index];
  }

  public bulkModerateListings(
    listingIds: string[],
    action: 'APPROVE' | 'REJECT',
    reason = 'Bulk moderation action',
    adminId = 'usr-admin',
    adminName = 'Admin'
  ): { modifiedCount: number; listings: Listing[] } {
    const modified: Listing[] = [];
    for (const id of listingIds) {
      try {
        if (action === 'APPROVE') {
          modified.push(this.approveListing(id, adminId, adminName));
        } else {
          modified.push(this.rejectListing(id, reason, adminId, adminName));
        }
      } catch {}
    }
    return { modifiedCount: modified.length, listings: modified };
  }

  public updateListingDetails(
    listingId: string,
    updates: Partial<Listing>,
    adminId = 'usr-admin',
    adminName = 'Admin'
  ): Listing {
    const index = this.listings.findIndex((l) => l.id === listingId);
    if (index === -1) throw new Error('Listing not found');

    this.listings[index] = { ...this.listings[index], ...updates };

    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      adminId,
      adminName,
      adminRole: 'ADMIN',
      action: 'EDIT_LISTING',
      target: listingId,
      details: `Edited listing details for "${this.listings[index].title}"`,
      ip: '127.0.0.1',
      timestamp: new Date().toISOString(),
    });

    return this.listings[index];
  }

  // --- FAVORITES / WISHLIST ---
  public toggleFavorite(userId: string, listingId: string): boolean {
    const key = `${userId}:${listingId}`;
    if (this.favorites.has(key)) {
      this.favorites.delete(key);
      return false; // Removed
    } else {
      this.favorites.add(key);
      return true; // Added
    }
  }

  public getUserFavorites(userId: string): Listing[] {
    const favoriteListingIds = Array.from(this.favorites)
      .filter((k) => k.startsWith(`${userId}:`))
      .map((k) => k.split(':')[1]);

    return this.listings.filter((l) => favoriteListingIds.includes(l.id));
  }

  // --- REVIEWS & RATINGS ---
  public addReview(review: Review): Review {
    this.reviews.unshift(review);
    return review;
  }

  public getSellerReviews(sellerId: string): { reviews: Review[]; averageRating: number; totalReviews: number } {
    const sellerReviews = this.reviews.filter((r) => r.sellerId === sellerId);
    const avg =
      sellerReviews.length > 0
        ? Math.round((sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length) * 10) / 10
        : 5.0; // Default 5.0 if brand new seller

    return {
      reviews: sellerReviews,
      averageRating: avg,
      totalReviews: sellerReviews.length,
    };
  }

  // --- PREMIUM TIERS & PACKAGES CRUD ---

  public getTiers(includeInactive = false): PremiumTier[] {
    const rawTiers = includeInactive
      ? this.tiers
      : this.tiers.filter((t) => t.active);

    return rawTiers
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((tier) => ({
        ...tier,
        packages: this.packages
          .filter((p) => p.tierId === tier.id && (includeInactive || p.active))
          .sort((a, b) => a.displayOrder - b.displayOrder),
      }));
  }

  public getTierById(id: string): PremiumTier | undefined {
    const tier = this.tiers.find((t) => t.id === id);
    if (!tier) return undefined;
    return {
      ...tier,
      packages: this.packages
        .filter((p) => p.tierId === tier.id)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    };
  }

  public createTier(
    data: Omit<PremiumTier, 'id' | 'createdAt' | 'updatedAt' | 'packages'>
  ): PremiumTier {
    const now = new Date().toISOString();
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const tier: PremiumTier = {
      ...data,
      id: `tier-${slug}-${Date.now()}`,
      active: data.active ?? true,
      featured: data.featured ?? false,
      displayOrder: Number(data.displayOrder) || this.tiers.length + 1,
      perAdPrice: Number(data.perAdPrice) || 150,
      maxCustomAds: Number(data.maxCustomAds) || 28,
      createdAt: now,
      updatedAt: now,
    };
    this.tiers.push(tier);
    return { ...tier, packages: [] };
  }

  public updateTier(
    id: string,
    updates: Partial<Omit<PremiumTier, 'id' | 'createdAt'>>
  ): PremiumTier {
    const idx = this.tiers.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Tier '${id}' not found.`);
    this.tiers[idx] = {
      ...this.tiers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.getTierById(id)!;
  }

  public deleteTier(id: string): void {
    const idx = this.tiers.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Tier '${id}' not found.`);
    this.tiers.splice(idx, 1);
    this.packages = this.packages.filter((p) => p.tierId !== id);
  }

  public getPackages(tierId?: string, includeInactive = false): PremiumPackage[] {
    let pkgs = tierId ? this.packages.filter((p) => p.tierId === tierId) : this.packages;
    if (!includeInactive) {
      pkgs = pkgs.filter((p) => p.active);
    }
    return pkgs.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public getPackageById(id: string): PremiumPackage | undefined {
    return this.packages.find((p) => p.id === id);
  }

  public createPackage(
    data: Omit<PremiumPackage, 'id' | 'createdAt' | 'updatedAt'>
  ): PremiumPackage {
    const now = new Date().toISOString();
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const pkg: PremiumPackage = {
      ...data,
      id: `pkg-${slug}-${Date.now()}`,
      currency: data.currency || '₹',
      durationValue: Number(data.durationValue) || 1,
      durationUnit: data.durationUnit || 'Month',
      active: data.active ?? true,
      displayOrder: Number(data.displayOrder) || this.packages.length + 1,
      createdAt: now,
      updatedAt: now,
    };
    this.packages.push(pkg);
    return pkg;
  }

  public updatePackage(
    id: string,
    updates: Partial<Omit<PremiumPackage, 'id' | 'createdAt'>>
  ): PremiumPackage {
    const idx = this.packages.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Package '${id}' not found.`);
    this.packages[idx] = {
      ...this.packages[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.packages[idx];
  }

  public deletePackage(id: string): void {
    const idx = this.packages.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Package '${id}' not found.`);
    this.packages.splice(idx, 1);
  }

  // --- DYNAMIC SERVER-SIDE PRICING & QUOTES ---

  public calculateCustomQuote(tierId: string, adsCount: number) {
    const tier = this.tiers.find((t) => t.id === tierId || t.name.toLowerCase() === tierId.toLowerCase());
    if (!tier) throw new Error(`Tier '${tierId}' not found.`);

    const count = Math.max(1, Math.min(200, Math.floor(adsCount)));
    const basePerAd = tier.perAdPrice || 150;

    // Server-side volume discount tiers
    let discountPercent = 0;
    if (count >= 28) discountPercent = 25;
    else if (count >= 20) discountPercent = 20;
    else if (count >= 12) discountPercent = 15;
    else if (count >= 6) discountPercent = 10;
    else if (count >= 3) discountPercent = 5;

    const rawTotal = count * basePerAd;
    const discountedTotal = Math.round(rawTotal * (1 - discountPercent / 100));

    return {
      tierId: tier.id,
      tierName: tier.name,
      adsCount: count,
      perAdPrice: basePerAd,
      discountPercent,
      totalPrice: discountedTotal,
      currency: '₹',
      durationValue: 1,
      durationUnit: 'Month' as const,
    };
  }

  // --- SECURE ORDER PURCHASE (SERVER IS SOLE SOURCE OF TRUTH FOR PRICING) ---

  public purchasePackageOrder(params: {
    packageId?: string;
    tierId?: string;
    adsCount?: number;
    email: string;
    city?: string;
    category?: string;
    userId?: string;
  }) {
    if (!params.email || !params.email.includes('@')) {
      throw new Error('A valid customer email is required.');
    }

    let resolvedPrice = 0;
    let packageName = '';
    let tierName = '';
    let adsCount = 1;
    let durationValue = 1;
    let durationUnit = 'Month';

    if (params.packageId) {
      const pkg = this.getPackageById(params.packageId);
      if (!pkg) throw new Error(`Package '${params.packageId}' not found.`);
      if (!pkg.active) throw new Error(`Selected package is currently inactive.`);

      const tier = this.tiers.find((t) => t.id === pkg.tierId);
      resolvedPrice = pkg.price;
      packageName = pkg.name;
      tierName = tier?.name || 'Premium';
      adsCount = pkg.adsCount;
      durationValue = pkg.durationValue;
      durationUnit = pkg.durationUnit;
    } else if (params.tierId && params.adsCount) {
      const quote = this.calculateCustomQuote(params.tierId, params.adsCount);
      resolvedPrice = quote.totalPrice;
      packageName = `Custom ${quote.adsCount} Ads Pack`;
      tierName = quote.tierName;
      adsCount = quote.adsCount;
    } else {
      throw new Error('Either packageId or (tierId and adsCount) must be provided.');
    }

    const orderId = `pay-pkg-${Date.now()}`;
    const user = params.userId ? this.users.find((u) => u.id === params.userId) : undefined;

    const paymentRecord: Payment = {
      id: orderId,
      adId: `cred-${orderId}`,
      adTitle: `${tierName} - ${packageName} (${adsCount} Ads / ${durationValue} ${durationUnit})`,
      amount: resolvedPrice,
      currency: '₹',
      type: 'Ad Placement',
      payerName: user?.name || params.email.split('@')[0] || 'Customer',
      payerEmail: params.email,
      status: 'Completed',
      createdAt: new Date().toISOString(),
    };

    this.payments.unshift(paymentRecord);

    return {
      success: true,
      orderId: paymentRecord.id,
      amount: resolvedPrice,
      currency: '₹',
      tierName,
      packageName,
      adsCount,
      duration: `${durationValue} ${durationUnit}`,
      city: params.city || 'All Cities',
      category: params.category || 'All Categories',
      email: params.email,
      payment: paymentRecord,
    };
  }

  // --- AD CREDIT PACKAGES COMPATIBILITY WRAPPER ---

  public getAdCreditPackages(includeInactive = false): AdCreditPackage[] {
    const pkgs = this.getPackages(undefined, includeInactive);
    return pkgs.map((p) => ({
      id: p.id,
      tierId: p.tierId,
      name: p.name,
      description: `${p.adsCount} Ads Pack for ${p.durationValue} ${p.durationUnit}`,
      credits: p.adsCount,
      adsCount: p.adsCount,
      durationDays: 30,
      durationValue: p.durationValue,
      durationUnit: p.durationUnit,
      price: p.price,
      currency: p.currency,
      badge: p.badge,
      status: p.active ? 'ACTIVE' : 'INACTIVE',
      active: p.active,
      sortOrder: p.displayOrder,
      displayOrder: p.displayOrder,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  // --- GLOBAL COMPANY BRANDING SETTINGS ---

  public getSettings(): CompanySettings {
    return { ...this.settings };
  }

  public updateSettings(
    updates: Partial<CompanySettings>,
    adminId = 'usr-admin-root',
    adminName = 'System Administrator'
  ): CompanySettings {
    const oldName = this.settings.companyName;
    this.settings = {
      ...this.settings,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.logAction(
      adminId,
      adminName,
      'SUPER_ADMIN',
      'SETTINGS_UPDATE',
      'Company Branding',
      `Updated company settings: Name changed from "${oldName}" to "${this.settings.companyName}"`,
      '127.0.0.1'
    );

    return { ...this.settings };
  }
}

export const db = new DatabaseStore();
