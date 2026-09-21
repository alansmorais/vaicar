export type UserRole = 'ADMIN' | 'DEV' | 'DRIVER' | 'PASSENGER';

export type RegulatoryStatus = 
  | 'PENDING'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'BLOCKED'
  | 'EXPIRED'
  | 'INCOMPLETE';

export type SubscriptionStatus = 
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAYMENT_PENDING'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'CANCELLED';

export type RideStatus = 
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'DRIVER_ARRIVING'
  | 'PASSENGER_PICKED_UP'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_BY_PASSENGER'
  | 'CANCELLED_BY_DRIVER'
  | 'EXPIRED';

export type PricingType = 'FIXED_ROUTE' | 'KM_ONLY' | 'MINIMUM_PLUS_KM' | 'COMPOSITE';

export type ReportCategory = 
  | 'INAPPROPRIATE_BEHAVIOR'
  | 'FRAUD'
  | 'INCORRECT_INFO'
  | 'DIFFERENT_VEHICLE'
  | 'DIFFERENT_FARE'
  | 'SAFETY_ISSUE'
  | 'OTHER';

export type ReportStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';

export type PaymentMethod = 'PIX' | 'CASH' | 'CARD_CREDIT' | 'CARD_DEBIT';

export interface SavedCard {
  id: string;
  holderName: string;
  cardNumber: string;
  last4: string;
  brand: 'mastercard' | 'visa' | 'elo' | 'hipercard' | 'amex';
  expiryMonth: string;
  expiryYear: string;
  type: 'CREDIT' | 'DEBIT';
  nickname?: string;
  isDefault?: boolean;
}

export interface Zone {
  id: string;
  municipalityId: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  distanceFromCenterKm: number;
  isActive: boolean;
}

export interface Municipality {
  id: string;
  stateId: string;
  name: string;
  state: string;
  slug: string;
  isActive: boolean;
}

export interface RegulatoryRequirement {
  id: string;
  municipalityId: string;
  name: string;
  code: string;
  description: string;
  isMandatory: boolean;
  requiresExpiryDate: boolean;
}

export interface DriverDocument {
  id: string;
  driverId: string;
  requirementId: string;
  requirementName: string;
  documentNumber?: string;
  fileUrl?: string;
  expiryDate?: string;
  status: RegulatoryStatus;
  rejectionReason?: string;
  verifiedAt?: string;
}

export interface Vehicle {
  id: string;
  driverId: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  passengerCapacity: number;
  category: string;
  photoUrl?: string;
  isApproved: boolean;
}

export interface PricingConfig {
  pricingType: PricingType;
  minimumFare: number;
  ratePerKm: number;
  ratePerMinute?: number;
  fixedRoutes: {
    originZoneId: string;
    destinationZoneId: string;
    price: number;
  }[];
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  birthDate: string;
  avatarUrl: string;
  professionalCategory: string;
  licenseNumber?: string;
  regulatoryStatus: RegulatoryStatus;
  subscriptionStatus: SubscriptionStatus;
  isOnline: boolean;
  operatingZones: string[]; // zone IDs
  acceptsImmediate: boolean;
  acceptsScheduled: boolean;
  vehicle: Vehicle;
  pricing: PricingConfig;
  documents: DriverDocument[];
  ratingAverage: number;
  ratingCount: number;
  ridesCompleted: number;
  currentLat?: number;
  currentLng?: number;
  whatsappDirectNumber: string;
  pixKey?: string;
  pixKeyType?: 'CPF' | 'PHONE' | 'EMAIL' | 'RANDOM';
  acceptsCardMachine?: boolean;
  acceptedPaymentMethods?: PaymentMethod[];
  // Regulatory & verification details
  address?: string;
  cnhNumber?: string;
  cnhCategory?: string;
  cnhExpiry?: string;
  hasEar?: boolean;
  cnhFrontUrl?: string;
  cnhBackUrl?: string;
  renavam?: string;
  crlvDocumentUrl?: string;
  vehiclePhotos?: string[];
  insuranceCompany?: string;
  insurancePolicy?: string;
  insuranceExpiry?: string;
  insuranceDocumentUrl?: string;
  selfieCnhUrl?: string;
  selfieDateUrl?: string;
  criminalRecordUrl?: string;
  rejectionReason?: string;
  suspensionReason?: string;
  blockingReason?: string;
  requestedDocRequirement?: string;
  isDemo?: boolean;
}

export interface Passenger {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  createdAt?: string;
  isDemo?: boolean;
}

export interface PlatformCost {
  id: string;
  category: 'GATEWAY' | 'HOSTING' | 'MAPS' | 'WHATSAPP_SMS' | 'EXTERNAL_SERVICES' | 'OTHER';
  categoryLabel?: string;
  description: string;
  amountBrl: number;
  date: string;
}

export interface Ride {
  id: string;
  passengerName: string;
  passengerPhone: string;
  passengerId?: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverVehicle: string;
  driverAvatar: string;
  originZoneId: string;
  originAddress: string;
  destinationZoneId: string;
  destinationAddress: string;
  passengerCount: number;
  scheduledTime?: string;
  isImmediate: boolean;
  estimatedPrice: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  status: RideStatus;
  paymentMethod: PaymentMethod;
  paymentChangeFor?: number;
  savedCard?: {
    id: string;
    last4: string;
    brand: string;
    type: 'CREDIT' | 'DEBIT';
    nickname?: string;
  };
  pixKey?: string;
  pixQrCodePayload?: string;
  paymentStatus?: 'PENDING' | 'PAID' | 'CONFIRMED_BY_DRIVER';
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  timeline: {
    status: RideStatus;
    timestamp: string;
    label: string;
  }[];
}

export interface Review {
  id: string;
  rideId: string;
  reviewerRole: 'PASSENGER' | 'DRIVER';
  reviewerName: string;
  driverId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Report {
  id: string;
  reportedByRole: 'PASSENGER' | 'DRIVER';
  reporterName: string;
  reporterContact: string;
  targetId: string;
  targetName: string;
  rideId?: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  resolutionNotes?: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceBrl: number;
  billingPeriod: string;
  description: string;
  commissionPercent: number; // 0%
  isActive: boolean;
}

export interface PlatformMetrics {
  totalDrivers: number;
  approvedDrivers: number;
  onlineDrivers: number;
  pendingDrivers: number;
  suspendedDrivers: number;
  blockedDrivers: number;
  totalPassengers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  pendingSubscriptions: number;
  subscriptionPriceBrl: number;
  monthlyRecurringRevenue: number;
  totalSubscriptionRevenueMonth: number;
  totalSubscriptionRevenueYear: number;
  totalPlatformCosts: number;
  netEstimatedIncome: number;
  totalRides: number;
  completedRides: number;
  activeRides: number;
  inReviewDrivers?: number;
  rejectedDrivers?: number;
  topZones: { name: string; count: number }[];
  whatsappContactEvents: number;
}

export interface SearchDriversResponse {
  totalFound: number;
  distanceKm: number;
  estimatedDurationMin: number;
  originZone: Zone;
  destinationZone: Zone;
  results: {
    driverId: string;
    name: string;
    avatarUrl: string;
    ratingAverage: number;
    ratingCount: number;
    ridesCompleted: number;
    professionalCategory: string;
    vehicle: {
      brand: string;
      model: string;
      color: string;
      capacity: number;
      category: string;
    };
    fare: number;
    distanceKm: number;
    estimatedDurationMin: number;
    arrivalTimeMin: number;
    isOnline: boolean;
    pricingType: string;
  }[];
}

