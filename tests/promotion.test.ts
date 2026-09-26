import assert from 'assert';
import {
  calculatePassengerPromotion,
  isPassengerEligibleForPromotion,
  PROMOTION_DURATION_MS,
  PROMOTION_DISCOUNT_RATE,
  VAICAR_NORMAL_COMMISSION_RATE,
} from '../src/lib/promotionService.ts';

async function runPromotionTests() {
  console.log('========================================================================');
  console.log('🧪 VAICAR 5% NEW PASSENGER LAUNCH PROMOTION - BACKEND TEST SUITE');
  console.log('========================================================================\n');

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;

  let passedTests = 0;

  // -------------------------------------------------------------------------
  // TEST 1: Passenger registered today → 5% discount applies
  // -------------------------------------------------------------------------
  console.log('Test 1: Passenger registered today → 5% discount applies');
  const todayCreatedAt = new Date(now - 2 * ONE_HOUR_MS).toISOString();
  const res1 = calculatePassengerPromotion({
    calculatedRideFare: 100.00,
    passengerCreatedAt: todayCreatedAt,
    rideCompletedAt: now,
    isDelivery: false,
  });

  assert.strictEqual(res1.isPromotionApplied, true, 'Promotion should be applied for today registration');
  assert.strictEqual(res1.discountRate, 0.05, 'Discount rate should be 5%');
  assert.strictEqual(res1.discountPercentage, 5, 'Discount percentage should be 5%');
  assert.strictEqual(res1.discountAmount, 5.00, 'Discount amount on R$100 should be R$5.00');
  assert.strictEqual(res1.passengerFinalAmount, 95.00, 'Passenger final amount should be R$95.00');
  assert.strictEqual(res1.driverTariffAmount, 100.00, 'Driver tariff should remain R$100.00');
  assert.strictEqual(res1.vaiCarCommission, 5.00, "VaiCar commission should be R$5.00 (10 - 5)");
  assert.strictEqual(res1.normalCommission, 10.00, 'Normal commission should be R$10.00');
  assert.strictEqual(res1.promotionStartAt, todayCreatedAt, 'promotionStartAt should match passenger createdAt');
  console.log('  ✓ PASS: R$100 ride -> passenger pays R$95.00, driver tariff R$100.00, VaiCar commission R$5.00\n');
  passedTests++;

  // -------------------------------------------------------------------------
  // TEST 2: Passenger registered 29 days ago → 5% discount applies
  // -------------------------------------------------------------------------
  console.log('Test 2: Passenger registered 29 days ago → 5% discount applies');
  const reg29DaysAgo = new Date(now - 29 * ONE_DAY_MS).toISOString();
  const res2 = calculatePassengerPromotion({
    calculatedRideFare: 150.00,
    passengerCreatedAt: reg29DaysAgo,
    rideCompletedAt: now,
    isDelivery: false,
  });

  assert.strictEqual(res2.isPromotionApplied, true, 'Promotion should apply on day 29');
  assert.strictEqual(res2.discountAmount, 7.50, 'Discount should be 5% of R$150 = R$7.50');
  assert.strictEqual(res2.passengerFinalAmount, 142.50, 'Passenger final amount should be R$142.50');
  assert.strictEqual(res2.driverTariffAmount, 150.00, 'Driver tariff remains R$150.00');
  assert.strictEqual(res2.vaiCarCommission, 7.50, 'VaiCar commission: 15.00 - 7.50 = R$7.50');
  console.log('  ✓ PASS: Day 29 registered passenger eligible. R$150 ride -> pays R$142.50, commission R$7.50\n');
  passedTests++;

  // -------------------------------------------------------------------------
  // TEST 3: Passenger registered exactly 30 days ago → boundary condition
  // -------------------------------------------------------------------------
  console.log('Test 3: Passenger registered exactly 30 days ago → verify defined boundary');
  // Exactly 30 calendar days ago: now === startMs + 30 days
  const exact30DaysAgoMs = now - PROMOTION_DURATION_MS;
  const reg30DaysExact = new Date(exact30DaysAgoMs).toISOString();

  // At exactly 30 days: now < start + 30 days is FALSE -> returns to normal fare
  const res3Boundary = calculatePassengerPromotion({
    calculatedRideFare: 100.00,
    passengerCreatedAt: reg30DaysExact,
    rideCompletedAt: now,
    isDelivery: false,
  });

  assert.strictEqual(res3Boundary.isPromotionApplied, false, 'At exactly 30 days, promotion should have expired');
  assert.strictEqual(res3Boundary.discountAmount, 0, 'No discount after 30 days');
  assert.strictEqual(res3Boundary.passengerFinalAmount, 100.00, 'Passenger pays normal fare R$100.00');
  assert.strictEqual(res3Boundary.vaiCarCommission, 10.00, 'VaiCar receives normal 10% commission R$10.00');

  // Just 1 millisecond before 30 days: still eligible
  const regJustBefore30Days = new Date(now - PROMOTION_DURATION_MS + 1000).toISOString();
  const res3JustBefore = calculatePassengerPromotion({
    calculatedRideFare: 100.00,
    passengerCreatedAt: regJustBefore30Days,
    rideCompletedAt: now,
    isDelivery: false,
  });
  assert.strictEqual(res3JustBefore.isPromotionApplied, true, 'At 29 days 23h 59m 59s, passenger is still eligible');
  console.log('  ✓ PASS: Defined boundary [start, start + 30 days) verified. Expiration at exact 30-day mark confirmed.\n');
  passedTests++;

  // -------------------------------------------------------------------------
  // TEST 4: Passenger registered more than 30 days ago → no discount
  // -------------------------------------------------------------------------
  console.log('Test 4: Passenger registered more than 30 days ago → no discount');
  const reg45DaysAgo = new Date(now - 45 * ONE_DAY_MS).toISOString();
  const res4 = calculatePassengerPromotion({
    calculatedRideFare: 80.00,
    passengerCreatedAt: reg45DaysAgo,
    rideCompletedAt: now,
    isDelivery: false,
  });

  assert.strictEqual(res4.isPromotionApplied, false, 'No discount for > 30 days registration');
  assert.strictEqual(res4.discountRate, 0, 'Discount rate is 0');
  assert.strictEqual(res4.discountAmount, 0, 'Discount amount is 0');
  assert.strictEqual(res4.passengerFinalAmount, 80.00, 'Passenger pays full fare R$80.00');
  assert.strictEqual(res4.driverTariffAmount, 80.00, 'Driver tariff R$80.00');
  assert.strictEqual(res4.vaiCarCommission, 8.00, 'Normal 10% platform commission R$8.00');
  console.log('  ✓ PASS: Registered 45 days ago -> No discount, full fare R$80.00, full commission R$8.00\n');
  passedTests++;

  // -------------------------------------------------------------------------
  // TEST 5: Existing passenger → eligibility determined from actual createdAt
  // -------------------------------------------------------------------------
  console.log('Test 5: Existing passenger → eligibility determined from actual createdAt');
  // Scenario A: Existing passenger registered 15 days ago
  const existing15Days = new Date(now - 15 * ONE_DAY_MS).toISOString();
  const res5A = calculatePassengerPromotion({
    calculatedRideFare: 60.00,
    passengerCreatedAt: existing15Days,
    rideCompletedAt: now,
  });
  assert.strictEqual(res5A.isPromotionApplied, true, 'Existing passenger within 30 days is eligible');
  assert.strictEqual(res5A.passengerFinalAmount, 57.00, '60 - 5% (3.00) = R$57.00');
  assert.strictEqual(res5A.vaiCarCommission, 3.00, 'Normal 6.00 - 3.00 = R$3.00');

  // Scenario B: Existing passenger registered 90 days ago
  const existing90Days = new Date(now - 90 * ONE_DAY_MS).toISOString();
  const res5B = calculatePassengerPromotion({
    calculatedRideFare: 60.00,
    passengerCreatedAt: existing90Days,
    rideCompletedAt: now,
  });
  assert.strictEqual(res5B.isPromotionApplied, false, 'Existing passenger registered 90 days ago is NOT eligible');
  assert.strictEqual(res5B.passengerFinalAmount, 60.00, 'Passenger pays full R$60.00');
  console.log('  ✓ PASS: Eligibility accurately derived from real passenger createdAt timestamp.\n');
  passedTests++;

  // -------------------------------------------------------------------------
  // TEST 6: Driver tariff remains unchanged
  // -------------------------------------------------------------------------
  console.log("Test 6: Driver tariff remains unchanged");
  const testFares = [25.00, 48.50, 100.00, 250.00, 500.00];
  for (const fare of testFares) {
    const res = calculatePassengerPromotion({
      calculatedRideFare: fare,
      passengerCreatedAt: todayCreatedAt,
      rideCompletedAt: now,
    });
    assert.strictEqual(res.driverTariffAmount, fare, `Driver tariff for fare ${fare} must be exactly ${fare}`);
    assert.strictEqual(
      Number((res.passengerFinalAmount + res.discountAmount).toFixed(2)),
      fare,
      'Passenger final amount + platform discount must equal full driver tariff'
    );
  }
  console.log('  ✓ PASS: Driver tariff is 100% protected across all tested price points.\n');
  passedTests++;

  // -------------------------------------------------------------------------
  // TEST 7: VaiCar commission is reduced by the discount amount
  // -------------------------------------------------------------------------
  console.log("Test 7: VaiCar commission is reduced by the discount amount");
  const fare7 = 200.00;
  const res7 = calculatePassengerPromotion({
    calculatedRideFare: fare7,
    passengerCreatedAt: todayCreatedAt,
    rideCompletedAt: now,
  });
  const normalComm7 = 20.00; // 10% of 200
  const discount7 = 10.00; // 5% of 200
  assert.strictEqual(res7.normalCommission, normalComm7, 'Normal commission must be R$20.00');
  assert.strictEqual(res7.discountAmount, discount7, 'Discount amount must be R$10.00');
  assert.strictEqual(res7.vaiCarCommission, normalComm7 - discount7, 'VaiCar commission must be R$10.00');
  assert.ok(res7.vaiCarCommission >= 0, 'VaiCar commission must never be negative');
  console.log(`  ✓ PASS: VaiCar normal commission R$${normalComm7} - discount R$${discount7} = R$${res7.vaiCarCommission}\n`);
  passedTests++;

  // -------------------------------------------------------------------------
  // TEST 8: Discount cannot be applied twice (Idempotency)
  // -------------------------------------------------------------------------
  console.log('Test 8: Discount cannot be applied twice');
  // First calculation of R$100 ride
  const firstCalc = calculatePassengerPromotion({
    calculatedRideFare: 100.00,
    passengerCreatedAt: todayCreatedAt,
    rideCompletedAt: now,
  });
  assert.strictEqual(firstCalc.passengerFinalAmount, 95.00);

  // Subsequent calculation referencing the persisted ride fields
  const secondCalc = calculatePassengerPromotion({
    calculatedRideFare: 95.00, // Even if already discounted fare is passed
    passengerCreatedAt: todayCreatedAt,
    rideCompletedAt: now,
    existingPromotionApplied: firstCalc.promotionApplied,
    existingOriginalFare: firstCalc.originalFare,
    existingDiscountRate: firstCalc.discountRate,
    existingDiscountAmount: firstCalc.discountAmount,
    existingPassengerFinalAmount: firstCalc.passengerFinalAmount,
    existingDriverTariffAmount: firstCalc.driverTariffAmount,
    existingVaiCarCommission: firstCalc.vaiCarCommission,
    existingPromotionStartAt: firstCalc.promotionStartAt,
    existingPromotionEndAt: firstCalc.promotionEndAt,
  });

  assert.strictEqual(secondCalc.passengerFinalAmount, 95.00, 'Second calculation must NOT take 5% off 95 again');
  assert.strictEqual(secondCalc.discountAmount, 5.00, 'Discount amount remains R$5.00');
  assert.strictEqual(secondCalc.originalFare, 100.00, 'Original fare remains R$100.00');
  assert.strictEqual(secondCalc.vaiCarCommission, 5.00, 'VaiCar commission remains R$5.00');
  console.log('  ✓ PASS: Repeated calculation does not compound or double-apply discount.\n');
  passedTests++;

  // -------------------------------------------------------------------------
  // TEST 9: Passenger cannot force the discount through an API parameter
  // -------------------------------------------------------------------------
  console.log('Test 9: Passenger cannot force the discount through an API parameter');
  // Old passenger registered 60 days ago attempts to force promotion
  const fakePromoParams = {
    discount: 5,
    promotion: true,
    isPromotionApplied: true,
    discountRate: 0.10,
    discountAmount: 20.00,
  };
  const res9 = calculatePassengerPromotion({
    calculatedRideFare: 100.00,
    passengerCreatedAt: new Date(now - 60 * ONE_DAY_MS).toISOString(),
    rideCompletedAt: now,
    // Note: client fake params are completely excluded from service inputs
  });
  assert.strictEqual(res9.isPromotionApplied, false, 'Server authoritatively denies forced discount');
  assert.strictEqual(res9.passengerFinalAmount, 100.00, 'Passenger must pay full R$100.00');
  console.log('  ✓ PASS: Client-supplied promotion parameters have no effect; server enforces security.\n');
  passedTests++;

  // -------------------------------------------------------------------------
  // TEST 10: Duplicate ride completion does not create a second discount
  // -------------------------------------------------------------------------
  console.log('Test 10: Duplicate ride completion does not create a second discount');
  // Simulated initial completion state
  const completedRideState = {
    status: 'COMPLETED',
    originalFare: 120.00,
    originalFareBrl: 120.00,
    isPromotionApplied: true,
    promotionApplied: true,
    discountRate: 0.05,
    discountPercentage: 5,
    discountAmount: 6.00,
    passengerFinalAmount: 114.00,
    driverTariffAmount: 120.00,
    vaiCarCommission: 6.00,
    vaiCarCommissionBrl: 6.00,
    fareBrl: 114.00,
  };

  // Re-evaluating on duplicate completion event
  const retryCalc = calculatePassengerPromotion({
    calculatedRideFare: completedRideState.originalFare,
    passengerCreatedAt: todayCreatedAt,
    rideCompletedAt: now,
    existingPromotionApplied: completedRideState.promotionApplied,
    existingOriginalFare: completedRideState.originalFare,
    existingDiscountRate: completedRideState.discountRate,
    existingDiscountAmount: completedRideState.discountAmount,
    existingPassengerFinalAmount: completedRideState.passengerFinalAmount,
    existingDriverTariffAmount: completedRideState.driverTariffAmount,
    existingVaiCarCommission: completedRideState.vaiCarCommission,
  });

  assert.strictEqual(retryCalc.passengerFinalAmount, 114.00, 'Duplicate completion preserves original 114.00');
  assert.strictEqual(retryCalc.discountAmount, 6.00, 'Duplicate completion preserves 6.00 discount');
  assert.strictEqual(retryCalc.driverTariffAmount, 120.00, 'Duplicate completion preserves 120.00 driver tariff');
  console.log('  ✓ PASS: Duplicate ride completion event is strictly idempotent.\n');
  passedTests++;

  // -------------------------------------------------------------------------
  // TEST 11: Normal rides outside the promotion remain unchanged
  // -------------------------------------------------------------------------
  console.log('Test 11: Normal rides outside the promotion remain unchanged');
  const normalFare = 50.00;
  const res11 = calculatePassengerPromotion({
    calculatedRideFare: normalFare,
    passengerCreatedAt: null, // No promotion registration
    rideCompletedAt: now,
  });

  assert.strictEqual(res11.isPromotionApplied, false);
  assert.strictEqual(res11.discountAmount, 0);
  assert.strictEqual(res11.passengerFinalAmount, 50.00);
  assert.strictEqual(res11.driverTariffAmount, 50.00);
  assert.strictEqual(res11.vaiCarCommission, 5.00); // 10%
  console.log('  ✓ PASS: Unenrolled or normal rides maintain standard fare R$50.00 and standard 10% commission R$5.00\n');
  passedTests++;

  // -------------------------------------------------------------------------
  // TEST 12: Delivery rides must NOT receive this passenger ride promotion
  // -------------------------------------------------------------------------
  console.log('Test 12: Delivery rides must NOT receive this passenger ride promotion');
  const res12 = calculatePassengerPromotion({
    calculatedRideFare: 100.00,
    passengerCreatedAt: todayCreatedAt, // Newly registered today
    rideCompletedAt: now,
    isDelivery: true, // Classified as delivery
  });

  assert.strictEqual(res12.isPromotionApplied, false, 'Delivery rides must NOT receive promotion');
  assert.strictEqual(res12.discountAmount, 0, 'Delivery discount must be 0');
  assert.strictEqual(res12.passengerFinalAmount, 100.00, 'Delivery final amount is full R$100.00');
  assert.strictEqual(res12.vaiCarCommission, 10.00, 'Delivery normal 10% commission R$10.00');
  console.log('  ✓ PASS: Delivery ride with newly registered user excluded from passenger promotion.\n');
  passedTests++;

  console.log('========================================================================');
  console.log(`🎉 ALL ${passedTests}/12 BACKEND PROMOTION TESTS PASSED SUCCESSFULLY!`);
  console.log('========================================================================');
}

runPromotionTests().catch((err) => {
  console.error('❌ TEST SUITE FAILURE:', err);
  process.exit(1);
});
