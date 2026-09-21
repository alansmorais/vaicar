import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  Zone,
  Municipality,
  RegulatoryRequirement,
  Driver,
  Ride,
  Review,
  Report,
  SubscriptionPlan,
  PlatformMetrics,
  PlatformCost,
  Passenger,
  PlatformFareSettings,
} from './src/types.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// --- IN-MEMORY RELATIONAL DATABASE STORE ---

const municipalitySS: Municipality = {
  id: 'mun-ss',
  stateId: 'sp',
  name: 'São Sebastião',
  state: 'SP',
  slug: 'sao-sebastiao',
  isActive: true,
};

const defaultZones: Zone[] = [
  { id: 'z-centro', municipalityId: 'mun-ss', name: 'Centro Histórico', slug: 'centro', lat: -23.8078, lng: -45.4058, distanceFromCenterKm: 0, isActive: true },
  { id: 'z-sao-francisco', municipalityId: 'mun-ss', name: 'São Francisco', slug: 'sao-francisco', lat: -23.7667, lng: -45.4167, distanceFromCenterKm: 5.5, isActive: true },
  { id: 'z-pontal', municipalityId: 'mun-ss', name: 'Pontal da Cruz', slug: 'pontal-da-cruz', lat: -23.7850, lng: -45.3980, distanceFromCenterKm: 3.2, isActive: true },
  { id: 'z-barequecaba', municipalityId: 'mun-ss', name: 'Barequeçaba', slug: 'barequecaba', lat: -23.8340, lng: -45.4380, distanceFromCenterKm: 7.0, isActive: true },
  { id: 'z-guaeca', municipalityId: 'mun-ss', name: 'Guaecá', slug: 'guaeca', lat: -23.8290, lng: -45.4650, distanceFromCenterKm: 11.5, isActive: true },
  { id: 'z-toque-grande', municipalityId: 'mun-ss', name: 'Toque-Toque Grande', slug: 'toque-toque-grande', lat: -23.8375, lng: -45.5136, distanceFromCenterKm: 16.0, isActive: true },
  { id: 'z-toque-pequeno', municipalityId: 'mun-ss', name: 'Toque-Toque Pequeno', slug: 'toque-toque-pequeno', lat: -23.8300, lng: -45.5350, distanceFromCenterKm: 19.5, isActive: true },
  { id: 'z-pauba', municipalityId: 'mun-ss', name: 'Paúba', slug: 'pauba', lat: -23.7950, lng: -45.5560, distanceFromCenterKm: 23.0, isActive: true },
  { id: 'z-maresias', municipalityId: 'mun-ss', name: 'Maresias', slug: 'maresias', lat: -23.7915, lng: -45.5684, distanceFromCenterKm: 26.5, isActive: true },
  { id: 'z-santiago', municipalityId: 'mun-ss', name: 'Santiago', slug: 'santiago', lat: -23.7930, lng: -45.5450, distanceFromCenterKm: 21.0, isActive: true },
  { id: 'z-camburi', municipalityId: 'mun-ss', name: 'Camburi', slug: 'camburi', lat: -23.7745, lng: -45.6420, distanceFromCenterKm: 36.0, isActive: true },
  { id: 'z-boicucanga', municipalityId: 'mun-ss', name: 'Boiçucanga', slug: 'boicucanga', lat: -23.7820, lng: -45.6170, distanceFromCenterKm: 33.0, isActive: true },
  { id: 'z-juquehy', municipalityId: 'mun-ss', name: 'Juquehy', slug: 'juquehy', lat: -23.7660, lng: -45.7270, distanceFromCenterKm: 48.0, isActive: true },
  { id: 'z-barra-do-una', municipalityId: 'mun-ss', name: 'Barra do Una', slug: 'barra-do-una', lat: -23.7680, lng: -45.7600, distanceFromCenterKm: 55.0, isActive: true },
];

const defaultRequirements: RegulatoryRequirement[] = [
  {
    id: 'req-alvara',
    municipalityId: 'mun-ss',
    name: 'Alvará Municipal de Transporte Remunerado',
    code: 'ALVARA_TRANSPORTE',
    description: 'Inscrição municipal regular de condutor autônomo / alvará da Prefeitura de São Sebastião.',
    isMandatory: true,
    requiresExpiryDate: true,
  },
  {
    id: 'req-cnh-ear',
    municipalityId: 'mun-ss',
    name: 'CNH Definitiva com atividade remunerada (EAR)',
    code: 'CNH_EAR',
    description: 'Carteira Nacional de Habilitação na categoria correspondente constando EAR.',
    isMandatory: true,
    requiresExpiryDate: true,
  },
  {
    id: 'req-vistoria',
    municipalityId: 'mun-ss',
    name: 'Laudo de Vistoria Veicular e Segurança',
    code: 'LAUDO_VISTORIA',
    description: 'Inspeção mecânica obrigatória periódica válida.',
    isMandatory: true,
    requiresExpiryDate: true,
  },
  {
    id: 'req-seguro-app',
    municipalityId: 'mun-ss',
    name: 'Apólice de Seguro de Acidentes Pessoais a Passageiros (APP)',
    code: 'SEGURO_APP',
    description: 'Comprovante vigente de cobertura securitária APP para passageiros.',
    isMandatory: true,
    requiresExpiryDate: true,
  },
];

let subscriptionPlan: SubscriptionPlan = {
  id: 'plan-pro',
  name: 'VaiCar Pro',
  priceBrl: 49.0, // Configurable by Admin
  billingPeriod: 'mensal',
  description: 'Acesso total, perfil verificado, 0% de comissão sobre corridas, chamadas diretas.',
  commissionPercent: 0,
  isActive: true,
};

let platformFareSettings: PlatformFareSettings = {
  minBaseFare: 15.0, // Bandeirada mínima da plataforma (R$ 15,00)
  minRatePerKm: 3.0, // Piso por KM rodado da plataforma (R$ 3,00/km)
  minFixedRoutePrice: 25.0, // Piso para rota fixa entre bairros (R$ 25,00)
  isEnforced: true, // Bloqueio ativo contra tarifas predatórias
  updatedAt: new Date().toISOString(),
  updatedBy: 'Administração Municipal',
};

// --- IN-MEMORY RELATIONAL DATABASE STORES (INITIAL CLEAN STATE: WITH APPROVED MOTORISTA DE BASE) ---
const approvedDriver: Driver = {
  id: 'drv-carlos',
  name: 'Carlos Oliveira',
  phone: '(12) 99745-1234',
  email: 'carlos.oliveira@vaicar.com.br',
  cpf: '123.456.789-00',
  birthDate: '1982-08-15',
  avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  professionalCategory: 'Transporte Remunerado Individual',
  licenseNumber: 'ALV-2026/089',
  regulatoryStatus: 'APPROVED',
  subscriptionStatus: 'ACTIVE',
  isOnline: true,
  operatingZones: ['z-centro', 'z-maresias', 'z-juquehy', 'z-boicucanga'],
  acceptsImmediate: true,
  acceptsScheduled: true,
  vehicle: {
    id: 'veh-carlos',
    driverId: 'drv-carlos',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2022,
    color: 'Prata',
    licensePlate: 'ABC-1234',
    passengerCapacity: 4,
    category: 'Sedan Premium',
    isApproved: true,
  },
  pricing: {
    pricingType: 'MINIMUM_PLUS_KM',
    minimumFare: 20.0,
    ratePerKm: 3.5,
    ratePerMinute: 0.5,
    fixedRoutes: [
      { originZoneId: 'z-centro', destinationZoneId: 'z-maresias', price: 80.0 },
      { originZoneId: 'z-maresias', destinationZoneId: 'z-centro', price: 80.0 },
    ],
  },
  documents: [
    { id: 'doc-carlos-alvara', driverId: 'drv-carlos', requirementId: 'req-alvara', requirementName: 'Alvará Municipal', documentNumber: 'ALV-2026/089', status: 'APPROVED', verifiedAt: '2026-03-01' },
    { id: 'doc-carlos-cnh', driverId: 'drv-carlos', requirementId: 'req-cnh-ear', requirementName: 'CNH c/ EAR', documentNumber: '12345678901', status: 'APPROVED', expiryDate: '2030-06-15', verifiedAt: '2026-03-01' },
    { id: 'doc-carlos-vistoria', driverId: 'drv-carlos', requirementId: 'req-vistoria', requirementName: 'Laudo de Vistoria', documentNumber: 'VIST-2026/089', status: 'APPROVED', expiryDate: '2026-12-30', verifiedAt: '2026-03-01' },
    { id: 'doc-carlos-seguro', driverId: 'drv-carlos', requirementId: 'req-seguro-app', requirementName: 'Seguro APP Passageiros', documentNumber: 'SEG-99882', status: 'APPROVED', expiryDate: '2027-02-01', verifiedAt: '2026-03-01' },
  ],
  ratingAverage: 4.9,
  ratingCount: 18,
  ridesCompleted: 42,
  whatsappDirectNumber: '5512997451234',
  pixKey: '(12) 99745-1234',
  pixKeyType: 'PHONE',
  acceptsCardMachine: true,
  acceptedPaymentMethods: ['PIX', 'CASH', 'CARD_CREDIT', 'CARD_DEBIT'],
  address: 'Rua Sebastião Silveira, 250 - Centro, São Sebastião - SP',
  cnhNumber: '12345678901',
  cnhCategory: 'B',
  cnhExpiry: '2030-06-15',
  hasEar: true,
};

const approvedPassenger: Passenger = {
  id: 'pass-maria',
  name: 'Maria Santos',
  phone: '(12) 99999-0000',
  email: 'maria.santos@gmail.com',
  isVerified: true,
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  createdAt: new Date().toISOString(),
};

let driversStore: Driver[] = [approvedDriver];
let zonesStore: Zone[] = [...defaultZones];
let requirementsStore: RegulatoryRequirement[] = [...defaultRequirements];
let ridesStore: Ride[] = [];
let reviewsStore: Review[] = [];
let passengerReviewsStore: {
  id: string;
  rideId: string;
  passengerId: string;
  driverId: string;
  rating: number;
  comment: string;
  createdAt: string;
}[] = [];
let reportsStore: Report[] = [];
let passengersStore: Passenger[] = [approvedPassenger];
let platformCostsStore: PlatformCost[] = [];
let whatsappContactEventsCount = 0;

// Helper to create strictly identified DEMO data as specified in Section 20 & 21
function createDemoData(approved: boolean = false) {
  // Always return Carlos Oliveira as approved, or we can toggle his status based on the button
  const demoDriver: Driver = {
    ...approvedDriver,
    regulatoryStatus: approved ? 'APPROVED' : 'PENDING',
  };
  const demoPassenger = approvedPassenger;
  return { demoDriver, demoPassenger };
}

// --- DISTANCE & PRICE CALCULATION HELPER ---
function calculateDistanceKm(originZoneId: string, destZoneId: string): number {
  const origin = zonesStore.find((z) => z.id === originZoneId);
  const dest = zonesStore.find((z) => z.id === destZoneId);

  if (!origin || !dest) return 10.0;
  if (origin.id === dest.id) return 4.0; // Intra-neighborhood

  // São Sebastião spans along the Rio-Santos highway (SP-055)
  const diffKm = Math.abs(origin.distanceFromCenterKm - dest.distanceFromCenterKm);
  return Math.max(3.0, Math.round(diffKm * 10) / 10);
}

function calculateDriverFare(driver: Driver, originZoneId: string, destZoneId: string): number {
  // 1. Check if driver has a fixed route
  const fixedRoute = driver.pricing.fixedRoutes.find(
    (r) =>
      (r.originZoneId === originZoneId && r.destinationZoneId === destZoneId) ||
      (r.originZoneId === destZoneId && r.destinationZoneId === originZoneId),
  );

  if (fixedRoute) {
    const routePrice = platformFareSettings.isEnforced
      ? Math.max(fixedRoute.price, platformFareSettings.minFixedRoutePrice)
      : fixedRoute.price;
    return Math.round(routePrice);
  }

  // 2. Otherwise calculate based on distance & driver formula with platform floors
  const distanceKm = calculateDistanceKm(originZoneId, destZoneId);
  const minBase = platformFareSettings.isEnforced
    ? Math.max(driver.pricing.minimumFare || 20.0, platformFareSettings.minBaseFare)
    : (driver.pricing.minimumFare || 20.0);
  const rateKm = platformFareSettings.isEnforced
    ? Math.max(driver.pricing.ratePerKm || 3.5, platformFareSettings.minRatePerKm)
    : (driver.pricing.ratePerKm || 3.5);

  let fare = minBase + distanceKm * rateKm;
  if (platformFareSettings.isEnforced) {
    fare = Math.max(fare, platformFareSettings.minBaseFare);
  }

  return Math.round(fare);
}

// --- API ENDPOINTS ---

// Helper to compute realistic real-time platform metrics
function computePlatformMetrics(): PlatformMetrics {
  const approvedCount = driversStore.filter((d) => d.regulatoryStatus === 'APPROVED').length;
  const onlineCount = driversStore.filter((d) => d.isOnline && d.regulatoryStatus === 'APPROVED').length;
  const pendingCount = driversStore.filter((d) => ['PENDING', 'IN_REVIEW', 'SUBMITTED', 'INCOMPLETE'].includes(d.regulatoryStatus)).length;
  const suspendedCount = driversStore.filter((d) => d.regulatoryStatus === 'SUSPENDED').length;
  const blockedCount = driversStore.filter((d) => d.regulatoryStatus === 'BLOCKED').length;

  const activeSubsCount = driversStore.filter((d) => d.subscriptionStatus === 'ACTIVE').length;
  const expiredSubsCount = driversStore.filter((d) => d.subscriptionStatus === 'EXPIRED').length;
  const cancelledSubsCount = driversStore.filter((d) => d.subscriptionStatus === 'CANCELLED').length;
  const pendingSubsCount = driversStore.filter((d) => ['PAYMENT_PENDING', 'TRIAL'].includes(d.subscriptionStatus)).length;

  const totalCosts = platformCostsStore.reduce((sum, c) => sum + c.amountBrl, 0);
  const monthlyRevenue = activeSubsCount * subscriptionPlan.priceBrl;
  const yearlyRevenue = monthlyRevenue * 12;
  const netIncome = monthlyRevenue - totalCosts;

  // Real top zones calculation from actual rides (empty if 0 rides)
  const zoneCounts: { [name: string]: number } = {};
  for (const ride of ridesStore) {
    const origZone = zonesStore.find((z) => z.id === ride.originZoneId)?.name || 'Zona';
    zoneCounts[origZone] = (zoneCounts[origZone] || 0) + 1;
  }
  const topZones = Object.entries(zoneCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalDrivers: driversStore.length,
    approvedDrivers: approvedCount,
    onlineDrivers: onlineCount,
    pendingDrivers: pendingCount,
    suspendedDrivers: suspendedCount,
    blockedDrivers: blockedCount,
    totalPassengers: passengersStore.length,
    activeSubscriptions: activeSubsCount,
    expiredSubscriptions: expiredSubsCount,
    cancelledSubscriptions: cancelledSubsCount,
    pendingSubscriptions: pendingSubsCount,
    subscriptionPriceBrl: subscriptionPlan.priceBrl,
    monthlyRecurringRevenue: monthlyRevenue,
    totalSubscriptionRevenueMonth: monthlyRevenue,
    totalSubscriptionRevenueYear: yearlyRevenue,
    totalPlatformCosts: totalCosts,
    netEstimatedIncome: netIncome,
    totalRides: ridesStore.length,
    completedRides: ridesStore.filter((r) => r.status === 'COMPLETED').length,
    activeRides: ridesStore.filter((r) => !['COMPLETED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'EXPIRED'].includes(r.status)).length,
    topZones,
    whatsappContactEvents: whatsappContactEventsCount,
  };
}

// Metadata / Config bootstrap
app.get('/api/v1/meta', (req, res) => {
  res.json({
    municipality: municipalitySS,
    zones: zonesStore.filter((z) => z.isActive),
    requirements: requirementsStore,
    subscriptionPlan,
    metrics: computePlatformMetrics(),
    fareSettings: platformFareSettings,
  });
});

// Platform Fare Floor Settings (Public)
app.get('/api/v1/fare-settings', (req, res) => {
  res.json(platformFareSettings);
});

// Admin Update Platform Fare Floor Settings
app.put('/api/v1/admin/fare-settings', (req, res) => {
  const { minBaseFare, minRatePerKm, minFixedRoutePrice, isEnforced, applyToAllDrivers } = req.body;

  if (minBaseFare !== undefined) {
    const val = Number(minBaseFare);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ error: 'Tarifa base mínima inválida.' });
    }
    platformFareSettings.minBaseFare = Math.round(val * 100) / 100;
  }

  if (minRatePerKm !== undefined) {
    const val = Number(minRatePerKm);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ error: 'Piso por km inválido.' });
    }
    platformFareSettings.minRatePerKm = Math.round(val * 100) / 100;
  }

  if (minFixedRoutePrice !== undefined) {
    const val = Number(minFixedRoutePrice);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ error: 'Piso de rota fixa inválido.' });
    }
    platformFareSettings.minFixedRoutePrice = Math.round(val * 100) / 100;
  }

  if (isEnforced !== undefined) {
    platformFareSettings.isEnforced = Boolean(isEnforced);
  }

  platformFareSettings.updatedAt = new Date().toISOString();

  // If requested, synchronize and adjust drivers whose rates are below the new fair floor
  let driversAdjusted = 0;
  if (applyToAllDrivers && platformFareSettings.isEnforced) {
    for (const d of driversStore) {
      let changed = false;
      if (d.pricing.minimumFare < platformFareSettings.minBaseFare) {
        d.pricing.minimumFare = platformFareSettings.minBaseFare;
        changed = true;
      }
      if (d.pricing.ratePerKm < platformFareSettings.minRatePerKm) {
        d.pricing.ratePerKm = platformFareSettings.minRatePerKm;
        changed = true;
      }
      if (Array.isArray(d.pricing.fixedRoutes)) {
        for (const route of d.pricing.fixedRoutes) {
          if (route.price < platformFareSettings.minFixedRoutePrice) {
            route.price = platformFareSettings.minFixedRoutePrice;
            changed = true;
          }
        }
      }
      if (changed) driversAdjusted++;
    }
  }

  res.json({
    fareSettings: platformFareSettings,
    driversAdjusted,
    message: 'Pisos mínimos da plataforma atualizados com sucesso!',
  });
});

// Zones list
app.get('/api/v1/zones', (req, res) => {
  res.json(zonesStore);
});

// Admin Add Zone
app.post('/api/v1/admin/zones', (req, res) => {
  const { name, distanceFromCenterKm } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nome da zona é obrigatório' });
  }

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  const newZone: Zone = {
    id: `z-${Date.now()}`,
    municipalityId: 'mun-ss',
    name,
    slug,
    lat: -23.8 + (Math.random() - 0.5) * 0.1,
    lng: -45.5 + (Math.random() - 0.5) * 0.2,
    distanceFromCenterKm: Number(distanceFromCenterKm) || 15,
    isActive: true,
  };

  zonesStore.push(newZone);
  res.status(201).json(newZone);
});

// Search Drivers (Public endpoint, no auth required)
app.post('/api/v1/search/drivers', (req, res) => {
  const { originZoneId, destinationZoneId, passengerCount = 1 } = req.body;

  if (!originZoneId || !destinationZoneId) {
    return res.status(400).json({ error: 'Origem e destino são obrigatórios.' });
  }

  const distanceKm = calculateDistanceKm(originZoneId, destinationZoneId);
  const estimatedDurationMin = Math.max(5, Math.round(distanceKm * 1.4));

  // Business Rule: ONLY show drivers that:
  // 1. are ONLINE
  // 2. have APPROVED regulatory status
  // 3. have ACTIVE or TRIAL subscription
  // 4. cover the origin zone (or have it in operatingZones)
  // 5. vehicle capacity >= passengerCount
  const matchingDrivers = driversStore.filter((driver) => {
    const isApproved = driver.regulatoryStatus === 'APPROVED';
    const isSubscribed = driver.subscriptionStatus === 'ACTIVE' || driver.subscriptionStatus === 'TRIAL';
    const coversZone = driver.operatingZones.includes(originZoneId);
    const hasCapacity = (driver.vehicle.passengerCapacity || 4) >= Number(passengerCount);

    return driver.isOnline && isApproved && isSubscribed && coversZone && hasCapacity;
  });

  const results = matchingDrivers.map((driver) => {
    const fare = calculateDriverFare(driver, originZoneId, destinationZoneId);
    // Estimated arrival time to origin (random 3-7 mins demo calculation)
    const arrivalTimeMin = Math.floor(Math.random() * 4) + 3;

    return {
      driverId: driver.id,
      name: driver.name,
      avatarUrl: driver.avatarUrl,
      ratingAverage: driver.ratingAverage,
      ratingCount: driver.ratingCount,
      ridesCompleted: driver.ridesCompleted,
      professionalCategory: driver.professionalCategory,
      vehicle: {
        brand: driver.vehicle.brand,
        model: driver.vehicle.model,
        color: driver.vehicle.color,
        capacity: driver.vehicle.passengerCapacity,
        category: driver.vehicle.category,
      },
      fare,
      distanceKm,
      estimatedDurationMin,
      arrivalTimeMin,
      isOnline: driver.isOnline,
      pricingType: driver.pricing.pricingType,
    };
  });

  res.json({
    totalFound: results.length,
    distanceKm,
    estimatedDurationMin,
    originZone: zonesStore.find((z) => z.id === originZoneId),
    destinationZone: zonesStore.find((z) => z.id === destinationZoneId),
    results,
  });
});

// Drivers List (Public/Directory or admin)
app.get('/api/v1/drivers', (req, res) => {
  const { status, onlyOnline } = req.query;
  let list = driversStore;

  if (status) {
    list = list.filter((d) => d.regulatoryStatus === status);
  }
  if (onlyOnline === 'true') {
    list = list.filter((d) => d.isOnline);
  }

  res.json(list);
});

// Driver details
app.get('/api/v1/drivers/:id', (req, res) => {
  const driver = driversStore.find((d) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });
  res.json(driver);
});

// Register new driver
app.post('/api/v1/drivers', (req, res) => {
  const {
    name,
    phone,
    email,
    cpf,
    birthDate,
    professionalCategory,
    licenseNumber,
    vehicleBrand,
    vehicleModel,
    vehicleYear,
    vehicleColor,
    vehiclePlate,
    operatingZones = ['z-centro', 'z-maresias'],
    avatarUrl, // <--- added avatarUrl
  } = req.body;

  if (!name || !phone || !cpf || !vehicleModel || !vehiclePlate) {
    return res.status(400).json({ error: 'Por favor preencha todos os campos obrigatórios.' });
  }

  const cleanPhone = phone.replace(/\D/g, '');

  const newDriver: Driver = {
    id: `drv-${Date.now()}`,
    name,
    phone,
    email: email || `${cleanPhone}@vaicar.local`,
    cpf,
    birthDate: birthDate || '1990-01-01',
    avatarUrl: avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`,
    professionalCategory: professionalCategory || 'Transporte Remunerado Municipal',
    licenseNumber: licenseNumber || 'REG-PENDENTE',
    regulatoryStatus: 'SUBMITTED', // Starts as submitted/pending admin review
    subscriptionStatus: 'TRIAL',
    isOnline: false,
    operatingZones: operatingZones.length ? operatingZones : ['z-centro'],
    acceptsImmediate: true,
    acceptsScheduled: true,
    vehicle: {
      id: `veh-${Date.now()}`,
      driverId: `drv-${Date.now()}`,
      brand: vehicleBrand || 'Geral',
      model: vehicleModel,
      year: Number(vehicleYear) || 2022,
      color: vehicleColor || 'Branco',
      licensePlate: vehiclePlate.toUpperCase(),
      passengerCapacity: 4,
      category: 'Veículo Autorizado',
      isApproved: false,
    },
    pricing: {
      pricingType: 'KM_ONLY',
      minimumFare: 25.0,
      ratePerKm: 3.5,
      fixedRoutes: [],
    },
    documents: requirementsStore.map((reqItem, idx) => ({
      id: `doc-${Date.now()}-${idx}`,
      driverId: `drv-${Date.now()}`,
      requirementId: reqItem.id,
      requirementName: reqItem.name,
      status: 'PENDING',
    })),
    ratingAverage: 5.0,
    ratingCount: 0,
    ridesCompleted: 0,
    whatsappDirectNumber: `55${cleanPhone}`,
  };

  driversStore.push(newDriver);
  res.status(201).json(newDriver);
});

// Update Driver Availability (Online / Operating Zones)
app.patch('/api/v1/drivers/:id/availability', (req, res) => {
  const driver = driversStore.find((d) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

  const { isOnline, operatingZones } = req.body;

  // Security check: cannot go online if not approved
  if (isOnline === true && driver.regulatoryStatus !== 'APPROVED') {
    return res.status(403).json({
      error: 'Não é possível ficar online. Sua documentação ainda não foi aprovada pelo administrador.',
    });
  }

  if (typeof isOnline === 'boolean') {
    driver.isOnline = isOnline;
  }
  if (Array.isArray(operatingZones)) {
    driver.operatingZones = operatingZones;
  }

  res.json(driver);
});

// Update Driver Pricing
app.patch('/api/v1/drivers/:id/pricing', (req, res) => {
  const driver = driversStore.find((d) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

  const { pricingType, minimumFare, ratePerKm, fixedRoutes } = req.body;

  // Platform Fair Pricing Floor Validation
  if (platformFareSettings.isEnforced) {
    if (minimumFare !== undefined) {
      const numMinFare = Number(minimumFare);
      if (numMinFare < platformFareSettings.minBaseFare) {
        return res.status(400).json({
          error: `O valor da bandeirada / corrida mínima (R$ ${numMinFare.toFixed(2)}) não pode ser inferior ao piso da plataforma de R$ ${platformFareSettings.minBaseFare.toFixed(2)}.`,
        });
      }
    }

    if (ratePerKm !== undefined) {
      const numRateKm = Number(ratePerKm);
      if (numRateKm < platformFareSettings.minRatePerKm) {
        return res.status(400).json({
          error: `O valor por km rodado (R$ ${numRateKm.toFixed(2)}/km) não pode ser inferior ao piso da plataforma de R$ ${platformFareSettings.minRatePerKm.toFixed(2)}/km.`,
        });
      }
    }

    if (Array.isArray(fixedRoutes)) {
      for (const route of fixedRoutes) {
        const routePrice = Number(route.price);
        if (routePrice < platformFareSettings.minFixedRoutePrice) {
          return res.status(400).json({
            error: `Nenhuma rota fixa pode ter valor inferior ao piso de R$ ${platformFareSettings.minFixedRoutePrice.toFixed(2)}.`,
          });
        }
      }
    }
  }

  if (pricingType) driver.pricing.pricingType = pricingType;
  if (minimumFare !== undefined) driver.pricing.minimumFare = Number(minimumFare);
  if (ratePerKm !== undefined) driver.pricing.ratePerKm = Number(ratePerKm);
  if (Array.isArray(fixedRoutes)) driver.pricing.fixedRoutes = fixedRoutes;

  res.json(driver.pricing);
});

// Submit/Update Driver Document
app.post('/api/v1/drivers/:id/documents', (req, res) => {
  const driver = driversStore.find((d) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

  const { requirementId, documentNumber, expiryDate, fileUrl } = req.body;
  let doc = driver.documents.find((d) => d.requirementId === requirementId);

  if (!doc) {
    const reqItem = requirementsStore.find((r) => r.id === requirementId);
    doc = {
      id: `doc-${Date.now()}`,
      driverId: driver.id,
      requirementId,
      requirementName: reqItem ? reqItem.name : 'Documento Regulatório',
      status: 'IN_REVIEW',
    };
    driver.documents.push(doc);
  }

  doc.documentNumber = documentNumber || doc.documentNumber;
  doc.expiryDate = expiryDate || doc.expiryDate;
  doc.fileUrl = fileUrl || 'https://via.placeholder.com/600x400.png?text=Documento+Enviado';
  doc.status = 'IN_REVIEW';

  // Update driver overall status to IN_REVIEW if not approved
  if (driver.regulatoryStatus !== 'APPROVED') {
    driver.regulatoryStatus = 'IN_REVIEW';
  }

  res.json(doc);
});

// Create Ride Request
app.post('/api/v1/rides', (req, res) => {
  const {
    passengerName,
    passengerPhone,
    passengerAvatarUrl, // <--- added
    driverId,
    originZoneId,
    originAddress,
    originLandmark, // <--- added
    originMapsLink, // <--- added
    destinationZoneId,
    destinationAddress,
    destinationLandmark, // <--- added
    destinationMapsLink, // <--- added
    passengerCount = 1,
    scheduledTime,
    isImmediate = true,
    paymentMethod = 'PIX',
    paymentChangeFor,
    savedCard,
  } = req.body;

  if (!passengerName || !passengerPhone || !driverId || !originZoneId || !destinationZoneId) {
    return res.status(400).json({ error: 'Dados incompletos para solicitação da corrida.' });
  }

  const driver = driversStore.find((d) => d.id === driverId);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado.' });

  // Verify driver is eligible
  if (driver.regulatoryStatus !== 'APPROVED') {
    return res.status(400).json({ error: 'Motorista não está habilitado para transporte remunerado.' });
  }

  const estimatedPrice = calculateDriverFare(driver, originZoneId, destinationZoneId);
  const estimatedDistanceKm = calculateDistanceKm(originZoneId, destinationZoneId);
  const estimatedDurationMin = Math.max(5, Math.round(estimatedDistanceKm * 1.4));

  const newRide: Ride = {
    id: `ride-${Date.now()}`,
    passengerName,
    passengerPhone,
    passengerAvatarUrl: passengerAvatarUrl || `https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80`,
    driverId: driver.id,
    driverName: driver.name,
    driverPhone: driver.phone,
    driverVehicle: `${driver.vehicle.brand} ${driver.vehicle.model} - ${driver.vehicle.color}`,
    driverAvatar: driver.avatarUrl,
    originZoneId,
    originAddress: originAddress || zonesStore.find((z) => z.id === originZoneId)?.name || 'Origem',
    originLandmark, // <--- added
    originMapsLink, // <--- added
    destinationZoneId,
    destinationAddress: destinationAddress || zonesStore.find((z) => z.id === destinationZoneId)?.name || 'Destino',
    destinationLandmark, // <--- added
    destinationMapsLink, // <--- added
    passengerCount: Number(passengerCount),
    scheduledTime,
    isImmediate: Boolean(isImmediate),
    estimatedPrice,
    estimatedDistanceKm,
    estimatedDurationMin,
    status: 'REQUESTED',
    paymentMethod: paymentMethod as any,
    paymentChangeFor: paymentChangeFor ? Number(paymentChangeFor) : undefined,
    savedCard: savedCard
      ? {
          id: savedCard.id,
          last4: savedCard.last4,
          brand: savedCard.brand,
          type: savedCard.type,
          nickname: savedCard.nickname,
        }
      : undefined,
    pixKey: driver.pixKey || driver.phone,
    paymentStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: [
      {
        status: 'REQUESTED',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        label: 'Solicitação enviada ao motorista',
      },
    ],
  };

  ridesStore.unshift(newRide);
  res.status(201).json(newRide);
});

// Update Driver Payment Settings
app.patch('/api/v1/drivers/:id/payment-settings', (req, res) => {
  const driver = driversStore.find((d) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

  const { pixKey, pixKeyType, acceptsCardMachine, acceptedPaymentMethods } = req.body;
  if (pixKey !== undefined) driver.pixKey = pixKey;
  if (pixKeyType !== undefined) driver.pixKeyType = pixKeyType;
  if (acceptsCardMachine !== undefined) driver.acceptsCardMachine = Boolean(acceptsCardMachine);
  if (Array.isArray(acceptedPaymentMethods)) driver.acceptedPaymentMethods = acceptedPaymentMethods;

  res.json({
    pixKey: driver.pixKey,
    pixKeyType: driver.pixKeyType,
    acceptsCardMachine: driver.acceptsCardMachine,
    acceptedPaymentMethods: driver.acceptedPaymentMethods,
  });
});

// Update Ride Payment Status
app.patch('/api/v1/rides/:id/payment-status', (req, res) => {
  const ride = ridesStore.find((r) => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Corrida não encontrada' });

  const { paymentStatus } = req.body;
  if (paymentStatus) {
    ride.paymentStatus = paymentStatus;
    ride.updatedAt = new Date().toISOString();
  }

  res.json(ride);
});

// Get All Rides
app.get('/api/v1/rides', (req, res) => {
  const driverId = req.query.driverId as string | undefined;
  if (driverId) {
    return res.json(ridesStore.filter((r) => r.driverId === driverId));
  }
  res.json(ridesStore);
});

// Get Ride Details
app.get('/api/v1/rides/:id', (req, res) => {
  const ride = ridesStore.find((r) => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Corrida não encontrada' });
  res.json(ride);
});

// Update Ride Status (State Machine)
app.patch('/api/v1/rides/:id/status', (req, res) => {
  const ride = ridesStore.find((r) => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Corrida não encontrada' });

  const { status, cancellationReason } = req.body;
  const validTransitions: Record<string, string[]> = {
    REQUESTED: ['ACCEPTED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER'],
    ACCEPTED: ['DRIVER_ARRIVING', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER'],
    DRIVER_ARRIVING: ['PASSENGER_PICKED_UP', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER'],
    PASSENGER_PICKED_UP: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED'],
  };

  const allowed = validTransitions[ride.status];
  if (!allowed || !allowed.includes(status)) {
    return res.status(400).json({
      error: `Transição de status inválida de ${ride.status} para ${status}.`,
    });
  }

  ride.status = status;
  ride.updatedAt = new Date().toISOString();

  const labels: Record<string, string> = {
    ACCEPTED: 'Motorista aceitou a corrida',
    DRIVER_ARRIVING: 'Motorista a caminho do local de partida',
    PASSENGER_PICKED_UP: 'Passageiro a bordo do veículo',
    IN_PROGRESS: 'Corrida em andamento até o destino',
    COMPLETED: 'Viagem finalizada com sucesso',
    CANCELLED_BY_PASSENGER: 'Cancelado pelo passageiro',
    CANCELLED_BY_DRIVER: 'Recusado/Cancelado pelo motorista',
  };

  ride.timeline.push({
    status,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    label: labels[status] || status,
  });

  if (status === 'COMPLETED') {
    ride.completedAt = new Date().toISOString();
    // Increment driver's completed rides
    const driver = driversStore.find((d) => d.id === ride.driverId);
    if (driver) {
      driver.ridesCompleted = (driver.ridesCompleted || 0) + 1;
    }
  }

  if (cancellationReason) {
    ride.cancellationReason = cancellationReason;
  }

  res.json(ride);
});

// Log WhatsApp Contact Event & Return URL
app.post('/api/v1/rides/:id/whatsapp', (req, res) => {
  const ride = ridesStore.find((r) => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Corrida não encontrada' });

  const driver = driversStore.find((d) => d.id === ride.driverId);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

  whatsappContactEventsCount += 1;

  const msg = encodeURIComponent(
    `Olá ${driver.name}, sou passageiro(a) da corrida VaiCar (#${ride.id.slice(-5)}) de ${ride.originAddress} para ${ride.destinationAddress}.`,
  );
  const whatsappUrl = `https://wa.me/${driver.whatsappDirectNumber}?text=${msg}`;

  res.json({
    success: true,
    whatsappUrl,
    whatsappDirectNumber: driver.whatsappDirectNumber,
    totalEvents: whatsappContactEventsCount,
  });
});

// Reviews
app.post('/api/v1/reviews', (req, res) => {
  const { rideId, driverId, rating, comment, reviewerName } = req.body;
  if (!rideId || !driverId || !rating) {
    return res.status(400).json({ error: 'Dados incompletos para avaliação.' });
  }

  const review: Review = {
    id: `rev-${Date.now()}`,
    rideId,
    driverId,
    reviewerRole: 'PASSENGER',
    reviewerName: reviewerName || 'Passageiro(a)',
    rating: Number(rating),
    comment: comment || '',
    createdAt: new Date().toISOString(),
  };

  reviewsStore.unshift(review);

  // Recalculate driver average
  const driver = driversStore.find((d) => d.id === driverId);
  if (driver) {
    const driverReviews = reviewsStore.filter((r) => r.driverId === driverId);
    const sum = driverReviews.reduce((acc, curr) => acc + curr.rating, 0);
    driver.ratingAverage = Number((sum / driverReviews.length).toFixed(2));
    driver.ratingCount = driverReviews.length;
  }

  res.status(201).json(review);
});

app.get('/api/v1/reviews', (req, res) => {
  const { driverId } = req.query;
  if (driverId) {
    return res.json(reviewsStore.filter((r) => r.driverId === driverId));
  }
  res.json(reviewsStore);
});

// Reports (Denúncias)
app.post('/api/v1/reports', (req, res) => {
  const { reportedByRole, reporterName, reporterContact, targetId, targetName, rideId, category, description } = req.body;
  if (!category || !description) {
    return res.status(400).json({ error: 'Categoria e descrição são obrigatórias.' });
  }

  const newReport: Report = {
    id: `rep-${Date.now()}`,
    reportedByRole: reportedByRole || 'PASSENGER',
    reporterName: reporterName || 'Anônimo',
    reporterContact: reporterContact || '',
    targetId: targetId || 'drv-unknown',
    targetName: targetName || 'Alvo da denúncia',
    rideId,
    category,
    description,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };

  reportsStore.unshift(newReport);
  res.status(201).json(newReport);
});

app.get('/api/v1/reports', (req, res) => {
  res.json(reportsStore);
});

// --- ADMIN CONTROL ENDPOINTS ---

// Admin change driver regulatory status
app.patch('/api/v1/admin/drivers/:id/status', (req, res) => {
  const driver = driversStore.find((d) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

  const { status } = req.body;
  driver.regulatoryStatus = status;

  if (status === 'APPROVED') {
    driver.vehicle.isApproved = true;
    driver.documents.forEach((d) => {
      d.status = 'APPROVED';
    });
  } else if (status === 'REJECTED' || status === 'EXPIRED') {
    driver.isOnline = false;
  }

  res.json(driver);
});

// Admin verify specific document
app.patch('/api/v1/admin/documents/:docId', (req, res) => {
  const { docId } = req.params;
  const { status, rejectionReason } = req.body;

  let targetDoc: any = null;
  let targetDriver: Driver | null = null;

  for (const driver of driversStore) {
    const doc = driver.documents.find((d) => d.id === docId);
    if (doc) {
      targetDoc = doc;
      targetDriver = driver;
      break;
    }
  }

  if (!targetDoc || !targetDriver) {
    return res.status(404).json({ error: 'Documento não encontrado' });
  }

  targetDoc.status = status;
  targetDoc.verifiedAt = new Date().toISOString().split('T')[0];
  if (rejectionReason) targetDoc.rejectionReason = rejectionReason;

  // Check if all mandatory requirements are approved
  const mandatoryReqIds = requirementsStore.filter((r) => r.isMandatory).map((r) => r.id);
  const allMandatoryApproved = mandatoryReqIds.every((reqId) => {
    const d = targetDriver!.documents.find((doc) => doc.requirementId === reqId);
    return d && d.status === 'APPROVED';
  });

  if (allMandatoryApproved) {
    targetDriver.regulatoryStatus = 'APPROVED';
    targetDriver.vehicle.isApproved = true;
  } else if (status === 'REJECTED') {
    targetDriver.regulatoryStatus = 'REJECTED';
    targetDriver.isOnline = false;
  }

  res.json(targetDoc);
});

// Admin update subscription plan price
app.patch('/api/v1/admin/subscription-plan', (req, res) => {
  const { priceBrl, name } = req.body;
  if (priceBrl !== undefined) {
    subscriptionPlan.priceBrl = Number(priceBrl);
  }
  if (name) {
    subscriptionPlan.name = name;
  }
  res.json(subscriptionPlan);
});

// Admin update report status
app.patch('/api/v1/admin/reports/:id', (req, res) => {
  const report = reportsStore.find((r) => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Denúncia não encontrada' });

  const { status, resolutionNotes } = req.body;
  if (status) report.status = status;
  if (resolutionNotes) report.resolutionNotes = resolutionNotes;

  res.json(report);
});

// Admin Metrics
app.get('/api/v1/admin/metrics', (req, res) => {
  res.json(computePlatformMetrics());
});

// Subscription Plan
app.get('/api/v1/subscription/plan', (req, res) => {
  res.json(subscriptionPlan);
});

// Regulatory Requirements
app.get('/api/v1/regulatory/requirements', (req, res) => {
  res.json(requirementsStore);
});

// --- DEMO MODE ENDPOINTS (Strictly Section 20 & 21) ---
app.post('/api/v1/demo/load', (req, res) => {
  const { approved = false } = req.body || {};
  const { demoDriver, demoPassenger } = createDemoData(Boolean(approved));

  // Remove existing demo entities if present
  driversStore = driversStore.filter((d) => d.id !== demoDriver.id);
  passengersStore = passengersStore.filter((p) => p.id !== demoPassenger.id);

  driversStore.push(demoDriver);
  passengersStore.push(demoPassenger);

  res.json({
    success: true,
    message: `Conta DEMO carregada com sucesso (${approved ? 'Motorista Aprovado' : 'Motorista Pendente de Análise'}).`,
    driver: demoDriver,
    passenger: demoPassenger,
  });
});

app.post('/api/v1/demo/reset', (req, res) => {
  driversStore = [];
  ridesStore = [];
  reviewsStore = [];
  passengerReviewsStore = [];
  reportsStore = [];
  passengersStore = [];
  platformCostsStore = [];
  whatsappContactEventsCount = 0;

  res.json({
    success: true,
    message: 'Todos os dados foram resetados para 0 (Estado limpo para testes controlados).',
  });
});

app.post('/api/v1/demo/toggle-approval', (req, res) => {
  const demoDriver = driversStore.find((d) => d.id === 'drv-demo-joao');
  if (!demoDriver) {
    return res.status(404).json({ error: 'Motorista DEMO não encontrado. Carregue o DEMO primeiro.' });
  }

  const willBeApproved = demoDriver.regulatoryStatus !== 'APPROVED';
  demoDriver.regulatoryStatus = willBeApproved ? 'APPROVED' : 'PENDING';
  demoDriver.subscriptionStatus = willBeApproved ? 'ACTIVE' : 'TRIAL';
  demoDriver.isOnline = willBeApproved;
  if (demoDriver.vehicle) demoDriver.vehicle.isApproved = willBeApproved;
  demoDriver.documents.forEach((doc) => {
    doc.status = willBeApproved ? 'APPROVED' : 'PENDING';
    doc.verifiedAt = willBeApproved ? new Date().toISOString() : undefined;
  });

  res.json({
    success: true,
    driver: demoDriver,
    message: willBeApproved ? 'Motorista DEMO aprovado e colocado online!' : 'Motorista DEMO colocado em pendência.',
  });
});

// --- ADMIN DRIVER AUDITING ACTIONS (Section 12) ---
app.post('/api/v1/admin/drivers/:id/approve', (req, res) => {
  const driver = driversStore.find((d) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

  driver.regulatoryStatus = 'APPROVED';
  driver.rejectionReason = undefined;
  driver.suspensionReason = undefined;
  driver.blockingReason = undefined;
  driver.requestedDocRequirement = undefined;
  if (driver.vehicle) driver.vehicle.isApproved = true;
  driver.documents.forEach((d) => {
    d.status = 'APPROVED';
    d.verifiedAt = new Date().toISOString();
  });

  res.json({ success: true, driver, message: `Motorista ${driver.name} aprovado com sucesso.` });
});

app.post('/api/v1/admin/drivers/:id/reject', (req, res) => {
  const driver = driversStore.find((d) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'O motivo da rejeição é obrigatório conforme regulamento municipal.' });
  }

  driver.regulatoryStatus = 'REJECTED';
  driver.rejectionReason = reason.trim();
  driver.isOnline = false;

  res.json({ success: true, driver, message: `Motorista ${driver.name} rejeitado. Motivo registrado.` });
});

app.post('/api/v1/admin/drivers/:id/suspend', (req, res) => {
  const driver = driversStore.find((d) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'O motivo da suspensão é obrigatório.' });
  }

  driver.regulatoryStatus = 'SUSPENDED';
  driver.suspensionReason = reason.trim();
  driver.isOnline = false;

  res.json({ success: true, driver, message: `Motorista ${driver.name} suspenso temporariamente.` });
});

app.post('/api/v1/admin/drivers/:id/block', (req, res) => {
  const driver = driversStore.find((d) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'O motivo do bloqueio é obrigatório.' });
  }

  driver.regulatoryStatus = 'BLOCKED';
  driver.blockingReason = reason.trim();
  driver.isOnline = false;

  res.json({ success: true, driver, message: `Motorista ${driver.name} bloqueado permanentemente da plataforma.` });
});

app.post('/api/v1/admin/drivers/:id/request-doc', (req, res) => {
  const driver = driversStore.find((d) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

  const { requirementName, message } = req.body;
  driver.regulatoryStatus = 'INCOMPLETE';
  driver.requestedDocRequirement = `${requirementName}: ${message || 'Reenvio solicitado pela administração municipal'}`;

  res.json({ success: true, driver, message: `Solicitação de novo documento enviada para ${driver.name}.` });
});

app.post('/api/v1/admin/drivers/:id/subscription/mark-paid', (req, res) => {
  const driver = driversStore.find((d) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

  driver.subscriptionStatus = 'ACTIVE';

  res.json({
    success: true,
    driver,
    message: `[MODO DE TESTE] Assinatura do motorista ${driver.name} marcada como PAGA e ATIVA.`,
  });
});

// --- PLATFORM COSTS (Section 15) ---
app.get('/api/v1/admin/costs', (req, res) => {
  res.json(platformCostsStore);
});

app.post('/api/v1/admin/costs', (req, res) => {
  const { category, description, amountBrl } = req.body;
  if (!description || !amountBrl) {
    return res.status(400).json({ error: 'Descrição e valor são obrigatórios.' });
  }

  const categoryLabels: Record<string, string> = {
    GATEWAY: 'Taxa de Gateway',
    HOSTING: 'Hospedagem / Servidores',
    MAPS: 'Serviço de Mapas / Rotas',
    WHATSAPP_SMS: 'WhatsApp / SMS',
    EXTERNAL_SERVICES: 'Serviços Externos',
    OTHER: 'Outros Custos Operacionais',
  };

  const newCost: PlatformCost = {
    id: `cost-${Date.now()}`,
    category: category || 'OTHER',
    categoryLabel: categoryLabels[category] || 'Outros',
    description: description.trim(),
    amountBrl: Math.abs(Number(amountBrl)),
    date: new Date().toISOString().split('T')[0],
  };

  platformCostsStore.push(newCost);
  res.status(201).json(newCost);
});

app.delete('/api/v1/admin/costs/:id', (req, res) => {
  platformCostsStore = platformCostsStore.filter((c) => c.id !== req.params.id);
  res.json({ success: true });
});

// --- PASSENGER PROFILE & AUTH (Section 3 & 4) ---
app.post('/api/v1/passengers/auth', (req, res) => {
  const { name, phone, email, verificationCode, avatarUrl } = req.body;

  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Número de WhatsApp/telefone é obrigatório.' });
  }

  // Step 1: Verification code request
  if (!verificationCode) {
    return res.json({
      codeSent: true,
      message: 'Código de verificação enviado por SMS/WhatsApp (Ambiente de Teste: use 8492)',
      testCode: '8492',
    });
  }

  // Step 2: Confirmation
  if (verificationCode !== '8492' && verificationCode !== '1234') {
    return res.status(400).json({ error: 'Código de verificação incorreto. Em modo de teste, use 8492.' });
  }

  let passenger = passengersStore.find((p) => p.phone === phone.trim());
  if (!passenger) {
    passenger = {
      id: `pass-${Date.now()}`,
      name: (name && name.trim()) || 'Passageiro VaiCar',
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      avatarUrl: avatarUrl || `https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80`,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    passengersStore.push(passenger);
  } else {
    if (name) passenger.name = name.trim();
    if (email) passenger.email = email.trim();
    if (avatarUrl) passenger.avatarUrl = avatarUrl;
    passenger.isVerified = true;
  }

  res.json({ success: true, passenger });
});

app.get('/api/v1/passengers', (req, res) => {
  res.json(passengersStore);
});

app.get('/api/v1/passengers/:id', (req, res) => {
  const passenger = passengersStore.find((p) => p.id === req.params.id || p.phone === req.params.id);
  if (!passenger) return res.status(404).json({ error: 'Passageiro não encontrado' });
  res.json(passenger);
});

app.get('/api/v1/passengers/:id/rides', (req, res) => {
  const targetId = req.params.id;
  const passengerRides = ridesStore.filter(
    (r) => r.passengerId === targetId || r.passengerPhone === targetId,
  );
  res.json(passengerRides);
});

// --- PASSENGER & DRIVER REVIEWS ---
app.post('/api/v1/passenger-reviews', (req, res) => {
  const { rideId, passengerId, driverId, rating, comment } = req.body;
  const newReview = {
    id: `prev-${Date.now()}`,
    rideId,
    passengerId,
    driverId,
    rating: Number(rating) || 5,
    comment: (comment && comment.trim()) || 'Ótimo passageiro, pontual e respeitoso.',
    createdAt: new Date().toISOString(),
  };
  passengerReviewsStore.push(newReview);
  res.status(201).json(newReview);
});

app.get('/api/v1/passenger-reviews', (req, res) => {
  const { passengerId, driverId } = req.query;
  let list = passengerReviewsStore;
  if (passengerId) list = list.filter((r) => r.passengerId === String(passengerId));
  if (driverId) list = list.filter((r) => r.driverId === String(driverId));
  res.json(list);
});

// --- VITE MIDDLEWARE & SPA SERVING ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VaiCar Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
