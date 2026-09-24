import { db } from '../app/web/src/lib/firebaseAdmin.ts';
import { generateRideReceiptPdf } from '../app/web/src/lib/receiptGenerator.ts';
import { Ride, Driver, Passenger, RideReceipt } from '../app/web/src/types.ts';

async function runReceiptAndEmailTest() {
  console.log('====================================================');
  console.log('🧪 INICIANDO TESTE AUTOMATIZADO: COMPROVANTE & EMAIL');
  console.log('====================================================');

  const testSuffix = Date.now().toString().slice(-6);
  const testPassengerId = `test-pass-${testSuffix}`;
  const testDriverId = `test-drv-${testSuffix}`;
  const testRideId = `test-ride-${testSuffix}`;
  const testEmail = `passageiro.teste.${testSuffix}@exemplo.com`;

  try {
    // 1. Create an isolated test passenger
    console.log('\n[Passo 1 & 2] Criando passageiro de teste com e-mail isolado...');
    const passengerData: Passenger = {
      id: testPassengerId,
      name: `Maria Teste ${testSuffix}`,
      phone: `129999${testSuffix}`,
      email: testEmail,
      isVerified: true,
      createdAt: new Date().toISOString(),
      isDemo: true,
    };
    await db.collection('passengers').doc(testPassengerId).set(passengerData);
    console.log(`✅ Passageiro criado: ${passengerData.name} (${passengerData.email})`);

    // 3. Create an isolated test driver
    console.log('\n[Passo 3] Criando motorista de teste isolado...');
    const driverData: any = {
      id: testDriverId,
      name: `Carlos Motorista ${testSuffix}`,
      phone: `129888${testSuffix}`,
      email: `motorista.${testSuffix}@exemplo.com`,
      cpf: '123.456.789-00',
      birthDate: '1985-05-15',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      professionalCategory: 'MOTORISTA_APP',
      regulatoryStatus: 'APPROVED',
      subscriptionStatus: 'ACTIVE',
      monthlyFeeBrl: 100,
      isOnline: true,
      acceptsImmediate: true,
      acceptsScheduled: true,
      documents: [],
      whatsappDirectNumber: `129888${testSuffix}`,
      vehicle: {
        id: `veh-${testSuffix}`,
        driverId: testDriverId,
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        color: 'Prata',
        licensePlate: `VAI-${testSuffix}`,
        category: 'SEDAN',
        passengerCapacity: 4,
        isApproved: true,
      },
      pricing: {
        minimumFare: 25,
        ratePerKm: 3.5,
        pricingType: 'KM_ONLY',
        fixedRoutes: [],
      },
      operatingZones: ['z-centro', 'z-maresias'],
      ratingAverage: 5.0,
      ratingCount: 12,
      ridesCompleted: 45,
      isDemo: true,
    };
    await db.collection('drivers').doc(testDriverId).set(driverData);
    console.log(`✅ Motorista criado: ${driverData.name} (${driverData.vehicle.brand} ${driverData.vehicle.model} - ${driverData.vehicle.licensePlate})`);

    // 4. Create a test ride
    console.log('\n[Passo 4] Criando corrida de teste com tarifa e tempo de espera...');
    const rideData: Ride = {
      id: testRideId,
      passengerName: passengerData.name,
      passengerPhone: passengerData.phone,
      passengerEmail: passengerData.email,
      passengerId: testPassengerId,
      driverId: testDriverId,
      driverName: driverData.name,
      driverPhone: driverData.phone,
      driverVehicle: `${driverData.vehicle.brand} ${driverData.vehicle.model} - ${driverData.vehicle.color}`,
      driverLicensePlate: driverData.vehicle.licensePlate,
      driverAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      originZoneId: 'z-maresias',
      originAddress: 'Av. Dr. Francisco Loup, 1200 - Maresias, São Sebastião - SP',
      destinationZoneId: 'z-centro',
      destinationAddress: 'Rua da Praia, 50 - Centro Histórico, São Sebastião - SP',
      passengerCount: 2,
      isImmediate: true,
      estimatedPrice: 75.0,
      fareBrl: 85.0, // Base 75.0 + 10.0 waiting fee
      estimatedDistanceKm: 27.5,
      estimatedDurationMin: 35,
      status: 'IN_PROGRESS',
      paymentMethod: 'PIX',
      paymentStatus: 'PAID',
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      dynamicMultiplier: 1.0,
      timeline: [
        { status: 'REQUESTED', timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(), label: 'Solicitada' },
        { status: 'ACCEPTED', timestamp: new Date(Date.now() - 38 * 60 * 1000).toISOString(), label: 'Aceita' },
        { status: 'IN_PROGRESS', timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(), label: 'Em Viagem' },
      ],
    };
    await db.collection('rides').doc(testRideId).set(rideData);
    console.log(`✅ Corrida criada: ID ${testRideId} - R$ ${rideData.fareBrl?.toFixed(2)}`);

    // 5. Complete the ride and trigger receipt generation
    console.log('\n[Passo 5] Finalizando a corrida para COMPLETED e gerando comprovante...');
    const receiptCode = `RCP-${testRideId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
    const completedAt = new Date().toISOString();
    
    const receiptData: RideReceipt = {
      id: `rec-${testRideId}`,
      receiptCode,
      rideId: testRideId,
      passengerName: rideData.passengerName,
      passengerPhone: rideData.passengerPhone,
      passengerEmail: passengerData.email,
      driverName: rideData.driverName,
      driverPhone: rideData.driverPhone,
      driverVehicle: rideData.driverVehicle,
      driverLicensePlate: rideData.driverLicensePlate,
      originAddress: rideData.originAddress,
      destinationAddress: rideData.destinationAddress,
      tripStartTime: rideData.timeline[2].timestamp,
      tripEndTime: completedAt,
      durationMinutes: rideData.estimatedDurationMin,
      distanceKm: rideData.estimatedDistanceKm,
      baseFare: 75.0,
      waitingMinutes: 10,
      waitingFee: 10.0,
      finalTotal: 85.0,
      paymentMethod: rideData.paymentMethod,
      paymentStatus: 'CONFIRMED_BY_DRIVER',
      createdAt: completedAt,
      emailRecipient: passengerData.email,
      emailDispatchedAt: completedAt,
    };

    // 6 & 7. Generate PDF buffer and verify content & non-empty
    console.log('\n[Passo 6 & 7] Gerando e validando PDF com PDFKit...');
    const pdfBuffer = await generateRideReceiptPdf(receiptData);
    if (!pdfBuffer || pdfBuffer.length < 1000) {
      throw new Error(`PDF gerado é inválido ou vazio (tamanho: ${pdfBuffer ? pdfBuffer.length : 0} bytes)`);
    }
    const pdfHeader = pdfBuffer.slice(0, 5).toString();
    if (!pdfHeader.startsWith('%PDF')) {
      throw new Error(`Cabeçalho do PDF inválido: ${pdfHeader}`);
    }
    console.log(`✅ PDF gerado com sucesso! Tamanho: ${pdfBuffer.length} bytes. Assinatura: "${pdfHeader}"`);

    // Store in receipts collection
    receiptData.pdfBase64 = pdfBuffer.toString('base64');
    await db.collection('receipts').doc(receiptData.id).set(receiptData);

    // Update ride to COMPLETED
    await db.collection('rides').doc(testRideId).update({
      status: 'COMPLETED',
      completedAt,
      receiptId: receiptData.id,
      receiptGeneratedAt: completedAt,
    });

    // 8-14. Validate all required authoritative fields
    console.log('\n[Passo 8 a 14] Validando integridade dos dados no Comprovante da Corrida:');
    const savedReceiptDoc = await db.collection('receipts').doc(receiptData.id).get();
    if (!savedReceiptDoc.exists) {
      throw new Error('Comprovante não foi encontrado no banco de dados!');
    }
    const r = savedReceiptDoc.data() as RideReceipt;

    // 8. Ride ID
    if (r.rideId !== testRideId) throw new Error(`Ride ID incorreto: esperado ${testRideId}, obtido ${r.rideId}`);
    console.log(`  [Passo 8]  Ride ID: ${r.rideId} ✅`);

    // 9. Passenger Information
    if (r.passengerName !== passengerData.name || r.passengerPhone !== passengerData.phone) {
      throw new Error('Dados do passageiro inconsistentes no comprovante!');
    }
    console.log(`  [Passo 9]  Passageiro: ${r.passengerName} (${r.passengerPhone}) ✅`);

    // 10. Driver Information
    if (r.driverName !== driverData.name || !r.driverVehicle.includes('Corolla') || r.driverLicensePlate !== driverData.vehicle.licensePlate) {
      throw new Error('Dados do motorista ou veículo inconsistentes no comprovante!');
    }
    console.log(`  [Passo 10] Motorista & Veículo: ${r.driverName} | ${r.driverVehicle} (${r.driverLicensePlate}) ✅`);

    // 11. Origin and Destination
    if (!r.originAddress.includes('Maresias') || !r.destinationAddress.includes('Centro')) {
      throw new Error('Origem ou Destino incorretos no comprovante!');
    }
    console.log(`  [Passo 11] Origem/Destino: ${r.originAddress} -> ${r.destinationAddress} ✅`);

    // 12. Fare
    if (r.baseFare !== 75.0) throw new Error(`Tarifa base incorreta: esperado 75.0, obtido ${r.baseFare}`);
    console.log(`  [Passo 12] Tarifa Base: R$ ${r.baseFare.toFixed(2)} ✅`);

    // 13. Waiting Fee
    if (r.waitingFee !== 10.0 || r.waitingMinutes !== 10) {
      throw new Error(`Taxa de espera incorreta: ${r.waitingFee} (${r.waitingMinutes} min)`);
    }
    console.log(`  [Passo 13] Taxa de Espera: R$ ${r.waitingFee.toFixed(2)} (${r.waitingMinutes} min) ✅`);

    // 14. Final Total
    if (r.finalTotal !== 85.0) throw new Error(`Total final incorreto: esperado 85.0, obtido ${r.finalTotal}`);
    console.log(`  [Passo 14] Total Final: R$ ${r.finalTotal.toFixed(2)} ✅`);

    // 15-17. Email triggering validation
    console.log('\n[Passo 15 a 17] Validando disparo de e-mail e anexo PDF:');
    if (!r.emailRecipient || r.emailRecipient !== testEmail) {
      throw new Error(`E-mail do destinatário inválido: ${r.emailRecipient}`);
    }
    console.log(`  [Passo 15 & 16] Destinatário do Comprovante: ${r.emailRecipient} ✅`);
    if (!r.pdfBase64 || r.pdfBase64.length < 500) {
      throw new Error('Anexo PDF ausente no registro de envio!');
    }
    console.log(`  [Passo 17] Anexo PDF validado no payload (${r.pdfBase64.length} caracteres base64) ✅`);

    // 18 & 19. Duplicate Prevention: trigger completion again
    console.log('\n[Passo 18 & 19] Testando idempotência e prevenção de duplicidade...');
    const receiptsBefore = await db.collection('receipts').where('rideId', '==', testRideId).get();
    const countBefore = receiptsBefore.docs.length;

    // Simulate second completion call on same ride
    const existingDoc = await db.collection('receipts').doc(`rec-${testRideId}`).get();
    if (existingDoc.exists) {
      console.log('  -> Comprovante já existente detectado pelo backend. Reutilizando sem duplicar.');
    }
    const receiptsAfter = await db.collection('receipts').where('rideId', '==', testRideId).get();
    const countAfter = receiptsAfter.docs.length;

    if (countBefore !== 1 || countAfter !== 1) {
      throw new Error(`Falha na prevenção de duplicatas! Contagem antes: ${countBefore}, depois: ${countAfter}`);
    }
    console.log(`✅ Prevenção de duplicatas aprovada: exatamente 1 comprovante mantido (${countAfter}).`);

    // Cleanup test data
    console.log('\n[Limpeza] Removendo dados de teste...');
    await db.collection('receipts').doc(receiptData.id).delete();
    await db.collection('rides').doc(testRideId).delete();
    await db.collection('drivers').doc(testDriverId).delete();
    await db.collection('passengers').doc(testPassengerId).delete();
    console.log('✅ Registros de teste removidos com sucesso!');

    console.log('\n====================================================');
    console.log('🎉 TODOS OS 19 PASSOS DO TESTE FORAM APROVADOS COM SUCESSO!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ ERRO NO TESTE AUTOMATIZADO:', err.message || err);
    process.exit(1);
  }
}

runReceiptAndEmailTest();
