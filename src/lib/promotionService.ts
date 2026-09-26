/**
 * VaiCar 5% New Passenger Launch Promotion Service
 * Authoritative Backend-Only Logic
 * 
 * BUSINESS RULES:
 * 1. Every newly registered passenger receives 5% OFF eligible rides for exactly 30 calendar days
 *    from their account registration timestamp (createdAt).
 * 2. The 5% passenger discount is funded entirely from VaiCar's 10% platform commission.
 * 3. Driver's tariff remains 100% unchanged (driver must not lose any amount).
 * 4. Boundary: exactly [createdAt, createdAt + 30 calendar days).
 *    At exactly 30 days (start + 30*24*60*60*1000), eligibility expires.
 * 5. Delivery rides do NOT receive this promotion.
 * 6. Idempotent: repeated completion or calculation never applies the discount twice.
 * 7. Security: client parameters cannot force the discount; strictly determined by server.
 */

export const PROMOTION_DURATION_DAYS = 30;
export const PROMOTION_DURATION_MS = PROMOTION_DURATION_DAYS * 24 * 60 * 60 * 1000; // 2,592,000,000 ms
export const PROMOTION_DISCOUNT_RATE = 0.05; // 5%
export const VAICAR_NORMAL_COMMISSION_RATE = 0.10; // 10%

export interface PromotionCalculationParams {
  calculatedRideFare: number;
  passengerCreatedAt?: string | null;
  rideCompletedAt?: string | number | Date;
  isDelivery?: boolean;
  // Idempotency support: existing persisted fields if ride was previously calculated/completed
  existingPromotionApplied?: boolean;
  existingOriginalFare?: number;
  existingDiscountRate?: number;
  existingDiscountAmount?: number;
  existingPassengerFinalAmount?: number;
  existingDriverTariffAmount?: number;
  existingVaiCarCommission?: number;
  existingPromotionStartAt?: string | null;
  existingPromotionEndAt?: string | null;
}

export interface PromotionCalculationResult {
  isPromotionApplied: boolean;
  promotionApplied: boolean;
  originalFare: number;
  originalFareBrl: number;
  discountRate: number;
  discountPercentage: number;
  discountAmount: number;
  passengerFinalAmount: number;
  driverTariffAmount: number;
  vaiCarCommission: number;
  vaiCarCommissionBrl: number;
  normalCommission: number;
  promotionStartAt: string | null;
  promotionEndAt: string | null;
  eligibilityReason: string;
}

/**
 * Checks whether a passenger is within their 30-day promotional window.
 * Boundary rule: currentTime >= start && currentTime < start + 30 days
 */
export function isPassengerEligibleForPromotion(
  passengerCreatedAt: string | null | undefined,
  currentTimestamp: number = Date.now(),
  isDelivery: boolean = false
): { isEligible: boolean; startAt: string | null; endAt: string | null; reason: string } {
  if (isDelivery) {
    return {
      isEligible: false,
      startAt: null,
      endAt: null,
      reason: 'Delivery rides are not eligible for the new passenger promotion',
    };
  }

  if (!passengerCreatedAt) {
    return {
      isEligible: false,
      startAt: null,
      endAt: null,
      reason: 'Passenger has no registration timestamp',
    };
  }

  const startMs = new Date(passengerCreatedAt).getTime();
  if (isNaN(startMs)) {
    return {
      isEligible: false,
      startAt: null,
      endAt: null,
      reason: 'Invalid passenger registration timestamp',
    };
  }

  const endMs = startMs + PROMOTION_DURATION_MS;
  const startAt = new Date(startMs).toISOString();
  const endAt = new Date(endMs).toISOString();

  if (currentTimestamp < startMs) {
    return {
      isEligible: false,
      startAt,
      endAt,
      reason: 'Current timestamp is before registration date',
    };
  }

  // Exact 30-day boundary check: strictly less than start + 30 calendar days
  if (currentTimestamp >= endMs) {
    return {
      isEligible: false,
      startAt,
      endAt,
      reason: '30-day promotion window has expired',
    };
  }

  return {
    isEligible: true,
    startAt,
    endAt,
    reason: 'Passenger is eligible (within 30-day window from registration)',
  };
}

/**
 * Calculates authoritative financial figures for a completed ride.
 * Guarantees idempotency, auditability, and driver tariff protection.
 */
export function calculatePassengerPromotion(
  params: PromotionCalculationParams
): PromotionCalculationResult {
  const calculatedFare = Number(Number(params.calculatedRideFare || 0).toFixed(2));
  const normalCommission = Number((calculatedFare * VAICAR_NORMAL_COMMISSION_RATE).toFixed(2));

  // 1. IDEMPOTENCY CHECK: If already processed previously, return existing financial state exactly
  if (params.existingPromotionApplied !== undefined) {
    const isApplied = Boolean(params.existingPromotionApplied);
    const originalFare = params.existingOriginalFare !== undefined ? params.existingOriginalFare : calculatedFare;
    const discountRate = params.existingDiscountRate !== undefined ? params.existingDiscountRate : (isApplied ? PROMOTION_DISCOUNT_RATE : 0);
    const discountAmount = params.existingDiscountAmount !== undefined ? params.existingDiscountAmount : 0;
    const passengerFinalAmount = params.existingPassengerFinalAmount !== undefined ? params.existingPassengerFinalAmount : calculatedFare;
    const driverTariffAmount = params.existingDriverTariffAmount !== undefined ? params.existingDriverTariffAmount : calculatedFare;
    const vaiCarCommission = params.existingVaiCarCommission !== undefined ? params.existingVaiCarCommission : normalCommission;

    return {
      isPromotionApplied: isApplied,
      promotionApplied: isApplied,
      originalFare,
      originalFareBrl: originalFare,
      discountRate,
      discountPercentage: Number((discountRate * 100).toFixed(2)),
      discountAmount,
      passengerFinalAmount,
      driverTariffAmount,
      vaiCarCommission,
      vaiCarCommissionBrl: vaiCarCommission,
      normalCommission,
      promotionStartAt: params.existingPromotionStartAt || null,
      promotionEndAt: params.existingPromotionEndAt || null,
      eligibilityReason: 'Reused previously calculated authoritative financial result (Idempotent)',
    };
  }

  // 2. Resolve calculation timestamp
  let evalTimestamp = Date.now();
  if (params.rideCompletedAt) {
    const t = new Date(params.rideCompletedAt).getTime();
    if (!isNaN(t)) {
      evalTimestamp = t;
    }
  }

  // 3. Determine eligibility
  const eligibility = isPassengerEligibleForPromotion(
    params.passengerCreatedAt,
    evalTimestamp,
    Boolean(params.isDelivery)
  );

  if (eligibility.isEligible) {
    const discountRate = PROMOTION_DISCOUNT_RATE;
    const discountAmount = Number((calculatedFare * discountRate).toFixed(2));
    const passengerFinalAmount = Number((calculatedFare - discountAmount).toFixed(2));
    const driverTariffAmount = calculatedFare; // Driver tariff remains 100% untouched
    // Platform commission is reduced by the discount amount, but never negative
    const vaiCarCommission = Number(Math.max(0, normalCommission - discountAmount).toFixed(2));

    return {
      isPromotionApplied: true,
      promotionApplied: true,
      originalFare: calculatedFare,
      originalFareBrl: calculatedFare,
      discountRate,
      discountPercentage: 5,
      discountAmount,
      passengerFinalAmount,
      driverTariffAmount,
      vaiCarCommission,
      vaiCarCommissionBrl: vaiCarCommission,
      normalCommission,
      promotionStartAt: eligibility.startAt,
      promotionEndAt: eligibility.endAt,
      eligibilityReason: eligibility.reason,
    };
  }

  // Not eligible: standard full fare and full 10% commission
  return {
    isPromotionApplied: false,
    promotionApplied: false,
    originalFare: calculatedFare,
    originalFareBrl: calculatedFare,
    discountRate: 0,
    discountPercentage: 0,
    discountAmount: 0,
    passengerFinalAmount: calculatedFare,
    driverTariffAmount: calculatedFare,
    vaiCarCommission: normalCommission,
    vaiCarCommissionBrl: normalCommission,
    normalCommission,
    promotionStartAt: eligibility.startAt,
    promotionEndAt: eligibility.endAt,
    eligibilityReason: eligibility.reason,
  };
}
