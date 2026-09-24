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
  | 'QUEUED'
  | 'DRIVER_ARRIVING'
  | 'PASSENGER_PICKED_UP'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CANCELLED_BY_PASSENGER'
  | 'CANCELLED_BY_DRIVER'
  | 'REJECTED'
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

export interface PlatformFareSettings {
  minBaseFare: number; // Tarifa mínima / bandeirada mínima da plataforma (ex: R$ 15.00)
  minRatePerKm: number; // Piso mínimo por km rodado da plataforma (ex: R$ 3.00/km)
  minFixedRoutePrice: number; // Piso mínimo para rotas fixas entre bairros (ex: R$ 25.00)
  isEnforced: boolean; // Se a trava regulatória contra tarifas predatórias está ativa
  updatedAt?: string;
  updatedBy?: string;
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
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'; // Added status
  registrationIndex?: number; // 1 para 1º registro, 2..10 para próximos 9, etc.
  monthlyFeeBrl?: number; // R$ 0, R$ 60, R$ 80 ou R$ 100
  subscriptionTierName?: string;
  customZones?: string[];
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

export interface RideReceipt {
  id: string;
  receiptCode: string;
  rideId: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail?: string;
  driverName: string;
  driverPhone: string;
  driverVehicle: string;
  driverLicensePlate?: string;
  originAddress: string;
  originZoneName?: string;
  destinationAddress: string;
  destinationZoneName?: string;
  tripStartTime?: string;
  tripEndTime?: string;
  durationMinutes: number;
  distanceKm: number;
  baseFare: number;
  dynamicMultiplier?: number;
  waitingMinutes?: number;
  waitingFee?: number;
  finalTotal: number;
  paymentMethod: PaymentMethod | string;
  paymentStatus?: string;
  createdAt: string;
  pdfBase64?: string;
  emailDispatchedAt?: string;
  emailRecipient?: string;
}

export interface DynamicPricingSettings {
  isEnabled: boolean;
  minMultiplier: number; // ex: 0.8
  maxMultiplier: number; // ex: 2.5
  idealDriverPassengerRatio: number; // ex: 2.0 (2 motoristas para cada 1 passageiro solicitando)
  minDriversThreshold: number; // Quantidade mínima de motoristas para ativar o cálculo (ex: 2)
  activeZoneIds: string[]; // Onde aplicar (vazio = todas)
  surgeIcon: string; // Ex: "⚡"
}

export interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  updatedAt?: string;
  distanceKm?: number;
  etaMinutes?: number;
  isStale?: boolean;
}

export interface Ride {
  id: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail?: string;
  passengerId?: string;
  passengerAvatarUrl?: string;
  driverId: string;
  requestedDriverId?: string;
  matchedDriverId?: string;
  fareBrl?: number;
  driverName: string;
  driverPhone: string;
  driverVehicle: string;
  driverAvatar: string;
  driverLicensePlate?: string;
  driverLocation?: DriverLocation;
  receiptId?: string;
  receiptGeneratedAt?: string;
  originZoneId: string;
  originAddress: string;
  originLat?: number;
  originLng?: number;
  originLandmark?: string;
  originMapsLink?: string;
  destinationZoneId: string;
  destinationAddress: string;
  destinationLat?: number;
  destinationLng?: number;
  destinationLandmark?: string;
  destinationMapsLink?: string;
  passengerCount: number;
  scheduledTime?: string | null;
  isImmediate: boolean;
  estimatedPrice: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  status: RideStatus;
  paymentMethod: PaymentMethod;
  paymentChangeFor?: number | null;
  savedCard?: {
    id: string;
    last4: string;
    brand: string;
    type: 'CREDIT' | 'DEBIT';
    nickname?: string;
  } | null;
  pixKey?: string;
  pixQrCodePayload?: string;
  paymentStatus?: 'PENDING' | 'PAID' | 'CONFIRMED_BY_DRIVER' | 'PAYMENT_PENDING' | 'PAYMENT_CONTESTED' | 'WAIVED' | 'RESOLVED';
  paymentPendingReason?: string;
  amountDue?: number;
  paidAt?: string;
  contestReason?: string;
  contestProofUrl?: string | null;
  contestedAt?: string;
  unpaidReportedAt?: string;
  unpaidReportedBy?: string;
  paymentResolvedAt?: string;
  paymentResolvedBy?: string;
  paymentResolutionNotes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  dynamicMultiplier?: number;
  isDynamicPricingActive?: boolean;
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

export interface SubscriptionTier {
  range: string;
  priceBrl: number;
  label: string;
  description: string;
  highlight?: boolean;
}

export const VAICAR_SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    range: '1º Registro',
    priceBrl: 0,
    label: 'R$ 0 / mês',
    description: 'Gratuito / Isenção total para o primeiro motorista cadastrado na plataforma.',
    highlight: true,
  },
  {
    range: 'Próximos 9 (2º ao 10º)',
    priceBrl: 60,
    label: 'R$ 60 / mês',
    description: 'Tarifa especial de adesão para os 9 motoristas seguintes.',
  },
  {
    range: '11º ao 20º',
    priceBrl: 80,
    label: 'R$ 80 / mês',
    description: 'Mensalidade para os motoristas da fase de expansão inicial.',
  },
  {
    range: '21º ao 100º',
    priceBrl: 100,
    label: 'R$ 100 / mês',
    description: 'Mensalidade consolidada da plataforma VaiCar (21º ao 100º registro).',
  },
];

export function getDriverFeeFromIndex(index?: number): { fee: number; tierLabel: string; isFree: boolean } {
  const safeIndex = index && index > 0 ? index : 1;
  if (safeIndex === 1) {
    return { fee: 0, tierLabel: '1º Registro (Pioneiro VIP - Grátis)', isFree: true };
  } else if (safeIndex <= 10) {
    return { fee: 60, tierLabel: `Motorista #${safeIndex} (Próximos 9: 2º ao 10º)`, isFree: false };
  } else if (safeIndex <= 20) {
    return { fee: 80, tierLabel: `Motorista #${safeIndex} (11º ao 20º)`, isFree: false };
  } else {
    return { fee: 100, tierLabel: `Motorista #${safeIndex} (21º ao 100º)`, isFree: false };
  }
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceBrl: number;
  billingPeriod: string;
  description: string;
  commissionPercent: number; // 0%
  isActive: boolean;
  tiers?: SubscriptionTier[];
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
  dynamicMultiplier: number;
  isDynamicActive: boolean;
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

export interface MobilityMapData {
  zones: Zone[];
  onlineDrivers: {
    id: string;
    name: string;
    avatarUrl: string;
    phone: string;
    vehicle?: {
      brand: string;
      model: string;
      color: string;
      licensePlate?: string;
      category?: string;
    };
    ratingAverage: number;
    ratingCount: number;
    operatingZones: string[];
    currentLat: number;
    currentLng: number;
    zoneName: string;
  }[];
  activeRides: {
    id: string;
    status: string;
    passengerName: string;
    driverName: string;
    originAddress: string;
    originLat: number;
    originLng: number;
    destinationAddress: string;
    destinationLat: number;
    destinationLng: number;
    fareBrl: number;
    estimatedDurationMin: number;
    estimatedDistanceKm: number;
    dynamicMultiplier?: number;
  }[];
  zoneDemand: {
    zoneId: string;
    zoneName: string;
    lat?: number;
    lng?: number;
    distanceFromCenterKm?: number;
    onlineDrivers: number;
    activeRequests: number;
    multiplier: number;
    isSurgeActive: boolean;
    estimatedPickupMin: number;
  }[];
  dynamicPricingSettings?: DynamicPricingSettings;
  fareSettings?: PlatformFareSettings;
  timestamp: string;
}

