export type AdminRole = 'super_admin' | 'operations_manager' | 'content_editor' | 'support_agent';
export type AdminStatus = 'active' | 'suspended';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  phone?: string;
  role: AdminRole;
  status: AdminStatus;
  inviteId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminInvite {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  invitedBy: string;
  createdAt?: unknown;
}

export type DestinationCategory =
  | 'Hill Station'
  | 'Adventure Hub'
  | 'Riverside & Trek'
  | 'High-Altitude Expedition'
  | 'Spiritual & Heritage';

export type PublishLifecycle = 'active' | 'draft' | 'archived';

export interface Destination {
  id: string;
  name: string;
  slug: string;
  region: string;
  category: DestinationCategory;
  shortDescription: string;
  description: string;
  bestSeason?: string;
  elevation?: string;
  imageUrl?: string;
  featured: boolean;
  status: PublishLifecycle;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type PackageCategory =
  | 'Hill Retreat'
  | 'Adventure Sports'
  | 'Riverside Escape'
  | 'Snow Expedition'
  | 'Family Holiday'
  | 'Backpacking';

export type DifficultyLevel = 'Easy' | 'Moderate' | 'Challenging';

export interface TourPackage {
  id: string;
  title: string;
  slug: string;
  destinationId: string;
  destinationName: string;
  category: PackageCategory;
  durationDays: number;
  durationNights: number;
  pricePerPerson: number;
  discountPercent?: number;
  maxGroupSize: number;
  difficulty: DifficultyLevel;
  inclusions?: string[];
  itinerary?: string[];
  imageUrl?: string;
  galleryImages?: string[];
  featured: boolean;
  status: PublishLifecycle;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type CustomerStatus = 'active' | 'vip' | 'inactive';

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  country?: string;
  status: CustomerStatus;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded';
export type PaymentMethod = 'UPI' | 'Card' | 'Bank Transfer' | 'Cash';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  bookingCode: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  destinationId: string;
  destinationName: string;
  packageId: string;
  packageTitle: string;
  vehicleId?: string;
  vehicleName?: string;
  travelDate: string;
  returnDate: string;
  adults: number;
  children: number;
  passengerDetails?: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  bookingStatus: BookingStatus;
  specialRequests?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type PaymentTxnStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  bookingId: string;
  bookingCode: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  transactionRef?: string;
  status: PaymentTxnStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type EnquiryType = 'contact' | 'tour' | 'custom_trip';
export type EnquiryStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

export interface Enquiry {
  id: string;
  type: EnquiryType;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  subject: string;
  packageTitle?: string;
  preferredDate?: string;
  travelersCount?: number;
  message: string;
  status: EnquiryStatus;
  adminReply?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type VehicleCategory = 'SUV' | '4x4 Jeep' | 'Tempo Traveller' | 'Luxury Sedan';
export type VehicleStatus = 'available' | 'on_trip' | 'maintenance';

export interface Vehicle {
  id: string;
  name: string;
  category: VehicleCategory;
  registrationNo: string;
  seatCapacity: number;
  pricePerDay: number;
  pricePerKm?: number;
  driverName?: string;
  driverPhone?: string;
  acAvailable: boolean;
  imageUrl?: string;
  status: VehicleStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type CmsSection =
  | 'homepage'
  | 'about'
  | 'services'
  | 'gallery'
  | 'testimonials'
  | 'faqs'
  | 'blog';

export interface CmsItem {
  id: string;
  section: CmsSection;
  title: string;
  subtitle?: string;
  body?: string;
  authorName?: string;
  authorRole?: string;
  rating?: number;
  category?: string;
  imageUrl?: string;
  sortOrder?: number;
  status: 'published' | 'draft';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type MarketingKind = 'seo_page' | 'banner' | 'social_link';

export interface MarketingItem {
  id: string;
  kind: MarketingKind;
  pageKey?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  bannerTitle?: string;
  bannerCta?: string;
  platform?: string;
  url?: string;
  status: 'active' | 'inactive';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SettingGroup = 'general' | 'website' | 'email' | 'payment';

export interface SiteSetting {
  id: string;
  group: SettingGroup;
  siteName?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  currency?: string;
  timezone?: string;
  taxPercent?: number;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  razorpayEnabled?: boolean;
  stripeEnabled?: boolean;
  upiEnabled?: boolean;
  bankDetails?: string;
  maintenanceMode?: boolean;
  updatedAt?: unknown;
}

export type RouteKey =
  | 'dashboard-overview'
  | 'dashboard-analytics'
  | 'dashboard-reports'
  | 'destinations-manage'
  | 'destinations-add'
  | 'destinations-categories'
  | 'packages-manage'
  | 'packages-add'
  | 'packages-pricing'
  | 'packages-itineraries'
  | 'packages-images'
  | 'bookings-all'
  | 'bookings-pending'
  | 'bookings-confirmed'
  | 'bookings-cancelled'
  | 'customers-all'
  | 'customers-add'
  | 'customers-profiles'
  | 'enquiries-contact'
  | 'enquiries-tour'
  | 'enquiries-messages'
  | 'transport-vehicles'
  | 'transport-categories'
  | 'transport-pricing'
  | 'cms-homepage'
  | 'cms-about'
  | 'cms-services'
  | 'cms-gallery'
  | 'cms-testimonials'
  | 'cms-faqs'
  | 'cms-blog'
  | 'marketing-seo'
  | 'marketing-banners'
  | 'marketing-social'
  | 'users-admins'
  | 'users-roles'
  | 'users-profile'
  | 'settings-general'
  | 'settings-website'
  | 'settings-email'
  | 'settings-payment'
  | 'settings-security';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'arjun9676kumar@gmail.com';
