export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SUPPORT' | 'SELLER' | 'BUYER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface FailedLoginAttempt {
  id: string;
  userId?: string;
  email: string;
  ip: string;
  attempts: number;
  firstAttemptAt: string;
  lastAttemptAt: string;
  lockedUntil: string | null;
  lockLevel: number; // 0 = no lock, 1 = 10s temp block, 2 = 1hr block
}

export interface PasswordResetToken {
  email: string;
  token: string;
  expiresAt: string;
}

export type OtpPurpose = 'LOGIN' | 'REGISTER' | 'VERIFY';
export type OtpType = 'SMS' | 'EMAIL';

export interface OtpRecord {
  id: string;
  destination: string; // phone or email
  code: string;
  type: OtpType;
  purpose: OtpPurpose;
  expiresAt: string;
  attempts: number;
  verified: boolean;
  createdAt: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  avatar: string;
  status: UserStatus;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  listingsCount: number;
  totalViews: number;
  phone?: string;
  location?: string;
  city?: string;
  coordinates?: Coordinates;
  lockedUntil?: string | null;
  lockLevel?: number;
  is_demo?: boolean;
  createdAt: string;
  lastLogin: string;
}

export type ListingCategory =
  | 'Mobiles'
  | 'Laptops'
  | 'Vehicles'
  | 'Home & Living'
  | 'Furniture'
  | 'Electronics'
  | 'Fashion'
  | 'Jobs'
  | 'Services'
  | 'Mobiles & Tablets'
  | 'Home & Furniture'
  | 'Fashion & Beauty'
  | 'Others';

export type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO';

export interface Plan {
  id: SubscriptionTier;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  activeListingLimit: number; // 3, 15, -1 (unlimited)
  featuredAdsLimit: number;   // 0, 2, 10
  durationDays: number;       // 30, 60, 90
  verifiedBadge: boolean;
  homepageBanner: boolean;
  prioritySearch: boolean;
  analyticsLevel: 'NONE' | 'BASIC' | 'ADVANCED';
  supportLevel: 'STANDARD' | 'PRIORITY' | 'DEDICATED';
}

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  billingCycle: 'MONTHLY' | 'YEARLY';
  startDate: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  featuredAdsUsedThisMonth: number;
}

export interface Review {
  id: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface Favorite {
  userId: string;
  listingId: string;
  createdAt: string;
}

export type ListingStatus = 'Active' | 'Pending' | 'Under Review' | 'Flagged' | 'Rejected' | 'Sold' | 'Removed';

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: ListingCategory;
  subcategory?: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  sellerEmail: string;
  sellerPhone?: string;
  location: string;
  coordinates: Coordinates;
  distanceKm?: number;
  image: string;
  images?: string[];
  condition: 'New' | 'Used';
  status: ListingStatus;
  featured: boolean;
  tier?: SubscriptionTier;
  rejectionReason?: string;
  autoFlagged?: boolean;
  autoFlagReason?: string;
  views: number;
  is_demo?: boolean;
  createdAt: string;
}


export type ActivityType =
  | 'user_registered'
  | 'listing_posted'
  | 'message_received'
  | 'contact_request'
  | 'listing_reported'
  | 'payment_received';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  meta?: Record<string, any>;
  timeAgo: string;
  createdAt: string;
}

export interface Report {
  id: string;
  listingId: string;
  listingTitle: string;
  reason: 'Fake item' | 'Spam' | 'Wrong category' | 'Fraud' | 'Copyright issue';
  reportedBy: string;
  date: string;
  status: 'Pending' | 'Dismissed' | 'Action Taken';
}

export type ChatMessageType = 'text' | 'voice' | 'location' | 'offer';

export interface LocationPayload {
  lat: number;
  lng: number;
  address: string;
}

export interface OfferPayload {
  amount: number;
  originalPrice?: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  counterAmount?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  type?: ChatMessageType;
  audioUrl?: string;
  duration?: number;
  locationData?: LocationPayload;
  offerData?: OfferPayload;
  status?: 'sending' | 'sent' | 'failed';
}

export interface ChatThread {
  id: string;
  listingId?: string;
  listingTitle?: string;
  listingImage?: string;
  listingPrice?: number;
  sellerId?: string;
  sellerName?: string;
  sellerAvatar?: string;
  sellerPhone?: string;
  buyerId?: string;
  buyerName?: string;
  buyerAvatar?: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    email: string;
  };
  lastMessage: string;
  timeAgo: string;
  unread: boolean;
  messages: ChatMessage[];
}

export interface Payment {
  id: string;
  adId: string;
  adTitle: string;
  amount: number;
  currency: string;
  type: 'Featured Listing' | 'Promoted Ad' | 'Verified Seller' | 'Bump Up' | 'Ad Placement';
  payerName: string;
  payerEmail: string;
  status: 'Completed' | 'Pending' | 'Refunded';
  createdAt: string;
}

export interface ContactRequest {
  id: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  sellerName: string;
  listingTitle: string;
  listingPrice: number;
  unlocked: boolean;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  adminRole: UserRole;
  action: string;
  target: string;
  details: string;
  ip: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: 'Billing' | 'Account' | 'Listing Issue' | 'Safety & Fraud' | 'General';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  lastReply: string;
  createdAt: string;
}

export interface DashboardKPIs {
  totalUsers: { count: number; change: string; positive: boolean };
  totalListings: { count: number; change: string; positive: boolean };
  totalChats: { count: number; change: string; positive: boolean };
  contactClicks: { count: number; change: string; positive: boolean };
  reportedItems: { count: number; change: string; positive: boolean };
}

export interface CategoryBreakdown {
  name: ListingCategory;
  count: number;
  percentage: number;
  color: string;
}

export interface PlatformActivityPoint {
  date: string;
  users: number;
  listings: number;
  chats: number;
}

export interface UserTypeDistribution {
  buyers: { count: number; percentage: number };
  sellers: { count: number; percentage: number };
}

export interface TopSeller {
  id: string;
  name: string;
  avatar: string;
  listings: number;
  totalViews: number;
}

// --- PREMIUM AD CREDIT PACKAGES & TIERS ---
export interface PremiumPackage {
  id: string;
  tierId: string;
  name: string;
  adsCount: number;
  price: number;
  currency: string;
  durationValue: number;
  durationUnit: 'Month' | 'Days' | 'Year';
  active: boolean;
  displayOrder: number;
  badge?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PremiumTier {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  active: boolean;
  displayOrder: number;
  featured: boolean;
  badge?: string;
  perAdPrice: number;
  maxCustomAds: number;
  packages?: PremiumPackage[];
  createdAt: string;
  updatedAt: string;
}

export interface AdCreditPackage {
  id: string;
  tierId?: string;
  name: string;
  description: string;
  credits: number;
  adsCount?: number;
  durationDays: number;
  durationValue?: number;
  durationUnit?: 'Month' | 'Days' | 'Year';
  price: number;
  currency?: string;
  badge?: string;
  status: 'ACTIVE' | 'INACTIVE';
  active?: boolean;
  sortOrder: number;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  description: string;
  supportEmail: string;
  supportPhone: string;
  websiteName: string;
  footerCopyright: string;
  logoUrl?: string;
  faviconText?: string;
  updatedAt: string;
}

