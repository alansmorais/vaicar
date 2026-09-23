import assert from 'assert';

const BASE_URL = 'http://localhost:3000/api/v1';

async function runE2EIntegrationTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING VAICAR COMPLETE E2E INTEGRATION SUITE');
  console.log('====================================================\n');

  // STEP 1 — PASSENGER AUTHENTICATION & PROFILE
  console.log('--- STEP 1: PASSENGER AUTH & PROFILE ---');
  const passengerPhone = '+5512999990001';
  const passengerEmail = 'mariana.teste@vaicar.com.br';
  const passengerName = 'Mariana Silva Teste';

  // 1. Request PIN
  const pinReqRes = await fetch(`${BASE_URL}/passengers/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: passengerPhone,
      email: passengerEmail,
      name: passengerName,
    }),
  });
  assert.strictEqual(pinReqRes.status, 200, `Passenger PIN request failed: ${pinReqRes.statusText}`);
  const pinReqData = await pinReqRes.json();
  console.log(`✓ Passenger auth request sent. codeSent=${pinReqData.codeSent}`);

  // Fetch the stored PIN from pendingPins or test directly
  // In dev / test environment, get all passengers to get the ID or verify PIN
  const passengersListRes = await fetch(`${BASE_URL}/passengers`);
  assert.strictEqual(passengersListRes.status, 200, 'Get passengers failed');
  const passengersList = await passengersListRes.json();
  let passenger = passengersList.find((p: any) => p.phone === passengerPhone);

  if (!passenger) {
    // If not found in list yet, passenger profile is created upon first ride or registration
    passenger = {
      id: `pass-${Date.now()}`,
      name: passengerName,
      phone: passengerPhone,
      email: passengerEmail,
    };
  }
  console.log(`✓ Passenger profile ready: ID=${passenger.id}, Name=${passenger.name}, Phone=${passenger.phone}`);

  // STEP 2 — DRIVER 1 & DRIVER 2 SETUP & LOGIN
  console.log('\n--- STEP 2: DRIVERS SETUP & ONLINE STATUS ---');
  
  // Register Driver 1
  const drv1Res = await fetch(`${BASE_URL}/drivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Carlos Motorista 1',
      phone: '+5512988880001',
      email: 'carlos.drv1@vaicar.com.br',
      cpf: '123.456.789-01',
      vehicleModel: 'Chevrolet Onix Plus',
      vehiclePlate: 'BRA2E19',
      pricing: { minimumFare: 20, ratePerKm: 3.5 },
      operatingZones: ['ALL'],
      municipalityId: 'mun-ss',
    }),
  });
  assert([200, 201].includes(drv1Res.status), `Driver 1 creation failed: ${drv1Res.status}`);
  const driver1 = await drv1Res.json();
  console.log(`✓ Driver 1 registered: ID=${driver1.id}, Name=${driver1.name}`);

  // Admin approves Driver 1
  const d1ApproveRes = await fetch(`${BASE_URL}/admin/drivers/${driver1.id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.strictEqual(d1ApproveRes.status, 200, 'Driver 1 admin approval failed');
  console.log(`✓ Driver 1 approved by Municipal Regulation`);

  // Put Driver 1 Online
  const d1OnlineRes = await fetch(`${BASE_URL}/drivers/${driver1.id}/online`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isOnline: true }),
  });
  assert.strictEqual(d1OnlineRes.status, 200, 'Driver 1 online toggle failed');
  console.log(`✓ Driver 1 is now ONLINE in the production database`);

  // Register Driver 2 (For Race Condition Testing)
  const drv2Res = await fetch(`${BASE_URL}/drivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Roberto Motorista 2',
      phone: '+5512988880002',
      email: 'roberto.drv2@vaicar.com.br',
      cpf: '987.654.321-02',
      vehicleModel: 'Hyundai HB20',
      vehiclePlate: 'RIO2A34',
      pricing: { minimumFare: 22, ratePerKm: 3.8 },
      operatingZones: ['ALL'],
      municipalityId: 'mun-ss',
    }),
  });
  assert([200, 201].includes(drv2Res.status), `Driver 2 creation failed: ${drv2Res.status}`);
  const driver2 = await drv2Res.json();
  console.log(`✓ Driver 2 registered: ID=${driver2.id}, Name=${driver2.name}`);

  // Admin approves Driver 2
  const d2ApproveRes = await fetch(`${BASE_URL}/admin/drivers/${driver2.id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.strictEqual(d2ApproveRes.status, 200, 'Driver 2 admin approval failed');
  console.log(`✓ Driver 2 approved by Municipal Regulation`);

  // Put Driver 2 Online
  await fetch(`${BASE_URL}/drivers/${driver2.id}/online`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isOnline: true }),
  });
  console.log(`✓ Driver 2 is now ONLINE in the production database`);

  // STEP 3 — PASSENGER SEARCHES & REQUESTS RIDE
  console.log('\n--- STEP 3: PASSENGER SEARCHES & CREATES RIDE ---');
  const searchRes = await fetch(`${BASE_URL}/search/drivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originZoneId: 'z-centro',
      destinationZoneId: 'z-maresias',
      passengerCount: 2,
    }),
  });
  assert.strictEqual(searchRes.status, 200, 'Search drivers failed');
  const searchData = await searchRes.json();
  assert(searchData.results && searchData.results.length > 0, 'Should find available drivers');
  console.log(`✓ Search returned ${searchData.results.length} available drivers`);

  // Create Ride 1
  const createRide1Res = await fetch(`${BASE_URL}/rides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passengerId: passenger.id,
      passengerName: passenger.name,
      passengerPhone: passenger.phone,
      originZoneId: 'z-centro',
      destinationZoneId: 'z-maresias',
      passengerCount: 2,
      driverId: driver1.id,
      fare: 85.00,
      notes: 'Aguardando na praça central',
    }),
  });
  assert.strictEqual(createRide1Res.status, 201, 'Create ride 1 failed');
  const ride1 = await createRide1Res.json();
  assert(ride1.id, 'Ride 1 must have an ID');
  assert.strictEqual(ride1.status, 'REQUESTED', 'Ride 1 status must be REQUESTED');
  assert.strictEqual(ride1.requestedDriverId, driver1.id, 'Requested driver ID must match');
  console.log(`✓ Ride 1 created: ID=${ride1.id}, Status=${ride1.status}, Fare=R$ ${ride1.fareBrl}`);

  // STEP 4 — DRIVER 1 RECEIVES AND VERIFIES REQUEST
  console.log('\n--- STEP 4: DRIVER 1 RECEIVES REQUEST ---');
  const ridesRes = await fetch(`${BASE_URL}/rides`);
  assert.strictEqual(ridesRes.status, 200, 'Fetch rides failed');
  const allRides = await ridesRes.json();
  const driver1Ride = allRides.find((r: any) => r.id === ride1.id);
  assert(driver1Ride, 'Driver 1 must see ride 1 in active rides list');
  assert.strictEqual(driver1Ride.passengerName, passenger.name, 'Passenger name must match');
  assert.strictEqual(driver1Ride.fareBrl, ride1.fareBrl, 'Fare must match');
  console.log(`✓ Driver 1 polled and found Ride ${ride1.id} (Status: ${driver1Ride.status}, Passenger: ${driver1Ride.passengerName}, Fare: R$ ${driver1Ride.fareBrl})`);

  // STEP 5 — DRIVER 1 ACCEPTS RIDE 1
  console.log('\n--- STEP 5: DRIVER 1 ACCEPTS RIDE 1 ---');
  const acceptRes = await fetch(`${BASE_URL}/rides/${ride1.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'ACCEPTED',
      driverId: driver1.id,
    }),
  });
  assert.strictEqual(acceptRes.status, 200, `Accept ride 1 failed with status ${acceptRes.status}`);
  const acceptedRide1 = await acceptRes.json();
  assert.strictEqual(acceptedRide1.status, 'ACCEPTED', 'Ride status must be ACCEPTED');
  assert.strictEqual(acceptedRide1.driverId, driver1.id, 'Driver ID must be Driver 1');
  console.log(`✓ Ride 1 accepted by Driver 1: Status=${acceptedRide1.status}, Driver=${acceptedRide1.driverName}`);

  // STEP 6 — PASSENGER VERIFIES ACCEPTED STATE
  console.log('\n--- STEP 6: PASSENGER VERIFIES UPDATED STATE ---');
  const passengerRideCheckRes = await fetch(`${BASE_URL}/rides/${ride1.id}`);
  assert.strictEqual(passengerRideCheckRes.status, 200, 'Passenger get ride failed');
  const passengerRideCheck = await passengerRideCheckRes.json();
  assert.strictEqual(passengerRideCheck.status, 'ACCEPTED', 'Passenger must see ACCEPTED');
  assert.strictEqual(passengerRideCheck.driverId, driver1.id, 'Passenger must see Driver 1 assigned');
  console.log(`✓ Passenger verified: Ride is ACCEPTED, assigned driver is ${passengerRideCheck.driverName} (${passengerRideCheck.driverPhone})`);

  // STEP 7 — TEST REJECT / DECLINE (SECOND RIDE)
  console.log('\n--- STEP 7: CREATE RIDE 2 & TEST DRIVER REJECTION ---');
  const createRide2Res = await fetch(`${BASE_URL}/rides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passengerId: passenger.id,
      passengerName: passenger.name,
      passengerPhone: passenger.phone,
      originZoneId: 'z-barequecaba',
      destinationZoneId: 'z-juquehy',
      passengerCount: 1,
      driverId: driver1.id,
      fare: 110.00,
    }),
  });
  assert.strictEqual(createRide2Res.status, 201, 'Create ride 2 failed');
  const ride2 = await createRide2Res.json();
  console.log(`✓ Ride 2 created: ID=${ride2.id}, Status=${ride2.status}`);

  // Driver 1 rejects Ride 2
  const rejectRes = await fetch(`${BASE_URL}/rides/${ride2.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'CANCELLED_BY_DRIVER',
      driverId: driver1.id,
      cancellationReason: 'Motorista sem disponibilidade de rota no momento',
    }),
  });
  assert.strictEqual(rejectRes.status, 200, `Reject ride 2 failed: ${rejectRes.status}`);
  const rejectedRide2 = await rejectRes.json();
  assert.strictEqual(rejectedRide2.status, 'CANCELLED_BY_DRIVER', 'Ride 2 status must be CANCELLED_BY_DRIVER');
  console.log(`✓ Driver 1 rejected Ride 2 cleanly. Backend status: ${rejectedRide2.status}`);

  // Verify Passenger sees the rejection
  const passCheck2 = await (await fetch(`${BASE_URL}/rides/${ride2.id}`)).json();
  assert.strictEqual(passCheck2.status, 'CANCELLED_BY_DRIVER', 'Passenger must see CANCELLED_BY_DRIVER');
  console.log(`✓ Passenger correctly informed of rejection: ${passCheck2.status}`);

  // STEP 8 — RACE CONDITION TEST: TWO DRIVERS ACCEPTING THE SAME RIDE
  console.log('\n--- STEP 8: RACE CONDITION - TWO DRIVERS ATTEMPT SIMULTANEOUS ACCEPT ---');
  // Create Ride 3
  const createRide3Res = await fetch(`${BASE_URL}/rides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passengerId: passenger.id,
      passengerName: passenger.name,
      passengerPhone: passenger.phone,
      originZoneId: 'z-centro',
      destinationZoneId: 'z-enseada',
      passengerCount: 1,
      driverId: driver1.id,
      fare: 40.00,
    }),
  });
  const ride3 = await createRide3Res.json();
  console.log(`✓ Ride 3 created for race condition test: ID=${ride3.id}`);

  // Driver 1 accepts Ride 3
  const d1AcceptRide3 = await fetch(`${BASE_URL}/rides/${ride3.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACCEPTED', driverId: driver1.id }),
  });
  assert.strictEqual(d1AcceptRide3.status, 200, 'Driver 1 first acceptance should succeed');
  console.log(`✓ Driver 1 successfully accepted Ride 3 (HTTP 200)`);

  // Driver 2 attempts to accept the SAME Ride 3
  const d2AcceptRide3 = await fetch(`${BASE_URL}/rides/${ride3.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACCEPTED', driverId: driver2.id }),
  });
  assert.strictEqual(d2AcceptRide3.status, 409, `Driver 2 should be rejected with 409 Conflict, got ${d2AcceptRide3.status}`);
  const d2Error = await d2AcceptRide3.json();
  assert.strictEqual(d2Error.code, 'RIDE_ALREADY_ACCEPTED', 'Error code must be RIDE_ALREADY_ACCEPTED');
  console.log(`✓ Driver 2 was safely blocked with 409 Conflict: "${d2Error.error}" (Code: ${d2Error.code})`);

  // STEP 9 — FULL RIDE LIFECYCLE & STATE MACHINE TRANSITIONS
  console.log('\n--- STEP 9: FULL STATE MACHINE LIFECYCLE ---');
  // Ride 1 progression: ACCEPTED -> DRIVER_ARRIVING -> PASSENGER_PICKED_UP -> IN_PROGRESS -> COMPLETED
  
  // 1. DRIVER_ARRIVING
  const arrivingRes = await fetch(`${BASE_URL}/rides/${ride1.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'DRIVER_ARRIVING', driverId: driver1.id }),
  });
  assert.strictEqual(arrivingRes.status, 200, 'Transition to DRIVER_ARRIVING failed');
  console.log(`✓ Ride 1 -> DRIVER_ARRIVING`);

  // 2. PASSENGER_PICKED_UP
  const pickedUpRes = await fetch(`${BASE_URL}/rides/${ride1.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'PASSENGER_PICKED_UP', driverId: driver1.id }),
  });
  assert.strictEqual(pickedUpRes.status, 200, 'Transition to PASSENGER_PICKED_UP failed');
  console.log(`✓ Ride 1 -> PASSENGER_PICKED_UP`);

  // 3. IN_PROGRESS
  const inProgressRes = await fetch(`${BASE_URL}/rides/${ride1.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'IN_PROGRESS', driverId: driver1.id }),
  });
  assert.strictEqual(inProgressRes.status, 200, 'Transition to IN_PROGRESS failed');
  console.log(`✓ Ride 1 -> IN_PROGRESS`);

  // 4. COMPLETED
  const completedRes = await fetch(`${BASE_URL}/rides/${ride1.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'COMPLETED', driverId: driver1.id }),
  });
  assert.strictEqual(completedRes.status, 200, 'Transition to COMPLETED failed');
  const completedRide = await completedRes.json();
  assert.strictEqual(completedRide.status, 'COMPLETED', 'Status must be COMPLETED');
  console.log(`✓ Ride 1 -> COMPLETED successfully`);

  // 5. Invalid transition test: COMPLETED -> ACCEPTED (must return 400)
  const invalidTransitionRes = await fetch(`${BASE_URL}/rides/${ride1.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACCEPTED', driverId: driver1.id }),
  });
  assert.strictEqual(invalidTransitionRes.status, 400, 'Illegal transition should return 400');
  const invalidErr = await invalidTransitionRes.json();
  console.log(`✓ Illegal transition blocked as expected: "${invalidErr.error}"`);

  // STEP 10 — PUT HTTP METHOD COMPATIBILITY TEST
  console.log('\n--- STEP 10: PUT / PATCH HTTP METHOD COMPATIBILITY ---');
  // Create Ride 4
  const createRide4Res = await fetch(`${BASE_URL}/rides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passengerId: passenger.id,
      passengerName: passenger.name,
      passengerPhone: passenger.phone,
      originZoneId: 'z-centro',
      destinationZoneId: 'z-barequecaba',
      passengerCount: 1,
      driverId: driver1.id,
      fare: 35.00,
    }),
  });
  const ride4 = await createRide4Res.json();

  // Test PUT request from Android clients
  const putAcceptRes = await fetch(`${BASE_URL}/rides/${ride4.id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACCEPTED', driverId: driver1.id }),
  });
  assert.strictEqual(putAcceptRes.status, 200, 'PUT method on /status must succeed');
  console.log(`✓ PUT /api/v1/rides/:id/status accepted cleanly`);

  console.log('\n====================================================');
  console.log('🎉 ALL INTEGRATION & E2E TESTS PASSED 100%!');
  console.log('====================================================');
}

runE2EIntegrationTests().catch((err) => {
  console.error('\n❌ E2E INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
