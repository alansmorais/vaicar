import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { db } from './src/lib/firebaseAdmin.ts';
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
  DynamicPricingSettings,
} from './src/types.ts';

function getTransporter() {
  const rawPass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_PASS ||
    '';

  const cleanPass = rawPass.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
  const user = (
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    process.env.GMAIL_USER ||
    'vaicar@alansmsolutions.com'
  ).trim();

  if (!cleanPass) {
    console.warn('[MAIL] Nenhuma senha SMTP configurada nas variáveis de ambiente (SMTP_PASS).');
    return null;
  }

  try {
    // Uses standard Gmail transport
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass: cleanPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 6000,
      socketTimeout: 12000,
      tls: {
        rejectUnauthorized: false,
      },
    });
  } catch (err: any) {
    console.error('[MAIL] Failed to create nodemailer transport:', err.message);
    return null;
  }
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error('[EXPRESS MIDDLEWARE ERROR]', err);
    if (req.path.startsWith('/api') || req.originalUrl.startsWith('/api')) {
      return res.status(err.status || 400).json({
        error: err.message || 'Erro no formato da requisição (payload)',
        code: err.code || 'BAD_REQUEST'
      });
    }
  }
  next(err);
});

app.all('/api/*', (req, res, next) => {
  console.log(`[API LOG] ${req.method} ${req.originalUrl}`);
  next();
});

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

let dynamicPricingSettings: DynamicPricingSettings = {
  isEnabled: true,
  minMultiplier: 0.8,
  maxMultiplier: 2.5,
  idealDriverPassengerRatio: 3.0, // 3 motoristas para cada 1 passageiro solicitando
  minDriversThreshold: 2,
  activeZoneIds: [], // Empty means all zones
  surgeIcon: '⚡',
};

// --- FIRESTORE HELPERS & INITIALIZATION ---

async function getGlobalConfig() {
  const doc = await db.collection('config').doc('global').get();
  if (!doc.exists) {
    const defaultConfig = {
      subscriptionPlan: {
        id: 'plan-pro',
        name: 'VaiCar Pro',
        priceBrl: 49.0,
        billingPeriod: 'mensal',
        description: 'Acesso total, perfil verificado, 0% de comissão sobre corridas, chamadas diretas.',
        commissionPercent: 0,
        isActive: true,
      },
      platformFareSettings: {
        minBaseFare: 15.0,
        minRatePerKm: 3.0,
        minFixedRoutePrice: 25.0,
        isEnforced: true,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Administração Municipal',
      },
      dynamicPricingSettings: {
        isEnabled: true,
        minMultiplier: 0.8,
        maxMultiplier: 2.5,
        idealDriverPassengerRatio: 3.0,
        minDriversThreshold: 2,
        activeZoneIds: [],
        surgeIcon: '⚡',
      },
      whatsappContactEventsCount: 0,
    };
    await db.collection('config').doc('global').set(defaultConfig);
    return defaultConfig;
  }
  return doc.data() as any;
}

async function seedStaticData() {
  const zonesSnap = await db.collection('zones').limit(1).get();
  if (zonesSnap.empty) {
    const batch = db.batch();
    for (const zone of defaultZones) {
      batch.set(db.collection('zones').doc(zone.id), zone);
    }
    await batch.commit();
  }

  const reqsSnap = await db.collection('requirements').limit(1).get();
  if (reqsSnap.empty) {
    const batch = db.batch();
    for (const req of defaultRequirements) {
      batch.set(db.collection('requirements').doc(req.id), req);
    }
    await batch.commit();
  }
}

// Global state variables will now be loaded from DB where needed
let currentConfig: any = null;

async function ensureConfig() {
  if (!currentConfig) {
    currentConfig = await getGlobalConfig();
  }
  return currentConfig;
}

// Helpers to get collections easily
async function getDrivers(): Promise<Driver[]> {
  const snap = await db.collection('drivers').get();
  return snap.docs.map((doc: any) => doc.data() as Driver);
}

async function getRides(): Promise<Ride[]> {
  const snap = await db.collection('rides').get();
  return snap.docs.map((doc: any) => doc.data() as Ride);
}

async function getZones(): Promise<Zone[]> {
  const snap = await db.collection('zones').get();
  return snap.docs.map((doc: any) => doc.data() as Zone);
}

async function getPassengers(): Promise<Passenger[]> {
  const snap = await db.collection('passengers').get();
  return snap.docs.map((doc: any) => doc.data() as Passenger);
}

// --- DISTANCE & PRICE CALCULATION HELPER ---
async function calculateCurrentDynamicMultiplier(zoneId?: string): Promise<{ multiplier: number; isActive: boolean }> {
  const config = await ensureConfig();
  const settings = config.dynamicPricingSettings;
  if (!settings.isEnabled) return { multiplier: 1.0, isActive: false };

  const drivers = await getDrivers();
  const rides = await getRides();

  // Calculate supply: Online approved drivers in this zone (or total if no zone)
  const onlineDrivers = drivers.filter(d => 
    d.isOnline && 
    d.regulatoryStatus === 'APPROVED' &&
    (!zoneId || d.operatingZones.includes(zoneId))
  ).length;

  // Calculate demand: Active requests (not yet picked up) in this zone
  const activeRequests = rides.filter(r => 
    ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING'].includes(r.status) &&
    (!zoneId || r.originZoneId === zoneId)
  ).length;

  if (onlineDrivers < settings.minDriversThreshold) {
    return { multiplier: 1.0, isActive: false };
  }

  const currentRatio = activeRequests === 0 ? 10 : onlineDrivers / activeRequests;
  let multiplier = settings.idealDriverPassengerRatio / currentRatio;
  multiplier = Math.max(settings.minMultiplier, Math.min(settings.maxMultiplier, multiplier));
  multiplier = Math.round(multiplier * 100) / 100;
  const isActive = multiplier !== 1.0;

  return { multiplier, isActive };
}

async function calculateDistanceKm(originZoneId: string, destZoneId: string): Promise<number> {
  const zones = await getZones();
  const origin = zones.find((z) => z.id === originZoneId);
  const dest = zones.find((z) => z.id === destZoneId);

  if (!origin || !dest) return 10.0;
  if (origin.id === dest.id) return 4.0;

  const diffKm = Math.abs(origin.distanceFromCenterKm - dest.distanceFromCenterKm);
  return Math.max(3.0, Math.round(diffKm * 10) / 10);
}

async function calculateDriverFare(driver: Driver, originZoneId: string, destZoneId: string): Promise<number> {
  const config = await ensureConfig();
  const fareSettings = config.platformFareSettings;
  const dynamic = await calculateCurrentDynamicMultiplier(originZoneId);

  const fixedRoute = driver.pricing.fixedRoutes.find(
    (r) =>
      (r.originZoneId === originZoneId && r.destinationZoneId === destZoneId) ||
      (r.originZoneId === destZoneId && r.destinationZoneId === originZoneId),
  );

  if (fixedRoute) {
    let routePrice = fareSettings.isEnforced
      ? Math.max(fixedRoute.price, fareSettings.minFixedRoutePrice)
      : fixedRoute.price;
    routePrice = routePrice * dynamic.multiplier;
    return Math.round(routePrice);
  }

  const distanceKm = await calculateDistanceKm(originZoneId, destZoneId);
  const minBase = fareSettings.isEnforced
    ? Math.max(driver.pricing.minimumFare || 20.0, fareSettings.minBaseFare)
    : (driver.pricing.minimumFare || 20.0);
  const rateKm = fareSettings.isEnforced
    ? Math.max(driver.pricing.ratePerKm || 3.5, fareSettings.minRatePerKm)
    : (driver.pricing.ratePerKm || 3.5);

  let fare = minBase + distanceKm * rateKm;
  fare = fare * dynamic.multiplier;

  if (fareSettings.isEnforced) {
    fare = Math.max(fare, fareSettings.minBaseFare);
  }

  return Math.round(fare);
}

// --- API ENDPOINTS ---

// Helper to compute realistic real-time platform metrics
async function computePlatformMetrics(): Promise<PlatformMetrics> {
  const config = await ensureConfig();
  const drivers = await getDrivers();
  const rides = await getRides();
  const zones = await getZones();
  const passengers = await getPassengers();
  const costsSnap = await db.collection('platformCosts').get();
  const platformCosts = costsSnap.docs.map((doc: any) => doc.data() as PlatformCost);

  const approvedCount = drivers.filter((d: Driver) => d.regulatoryStatus === 'APPROVED').length;
  const onlineCount = drivers.filter((d: Driver) => d.isOnline && d.regulatoryStatus === 'APPROVED').length;
  const pendingCount = drivers.filter((d: Driver) => ['PENDING', 'IN_REVIEW', 'SUBMITTED', 'INCOMPLETE'].includes(d.regulatoryStatus)).length;
  const suspendedCount = drivers.filter((d: Driver) => d.regulatoryStatus === 'SUSPENDED').length;
  const blockedCount = drivers.filter((d: Driver) => d.regulatoryStatus === 'BLOCKED').length;

  const activeSubsCount = drivers.filter((d: Driver) => d.subscriptionStatus === 'ACTIVE').length;
  const expiredSubsCount = drivers.filter((d: Driver) => d.subscriptionStatus === 'EXPIRED').length;
  const cancelledSubsCount = drivers.filter((d: Driver) => d.subscriptionStatus === 'CANCELLED').length;
  const pendingSubsCount = drivers.filter((d: Driver) => ['PAYMENT_PENDING', 'TRIAL'].includes(d.subscriptionStatus)).length;

  const totalCosts = platformCosts.reduce((sum: number, c: PlatformCost) => sum + c.amountBrl, 0);
  const monthlyRevenue = activeSubsCount * config.subscriptionPlan.priceBrl;
  const yearlyRevenue = monthlyRevenue * 12;
  const netIncome = monthlyRevenue - totalCosts;

  const zoneCounts: { [name: string]: number } = {};
  for (const ride of rides) {
    const origZone = zones.find((z) => z.id === ride.originZoneId)?.name || 'Zona';
    zoneCounts[origZone] = (zoneCounts[origZone] || 0) + 1;
  }
  const topZones = Object.entries(zoneCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalDrivers: drivers.length,
    approvedDrivers: approvedCount,
    onlineDrivers: onlineCount,
    pendingDrivers: pendingCount,
    suspendedDrivers: suspendedCount,
    blockedDrivers: blockedCount,
    totalPassengers: passengers.length,
    activeSubscriptions: activeSubsCount,
    expiredSubscriptions: expiredSubsCount,
    cancelledSubscriptions: cancelledSubsCount,
    pendingSubscriptions: pendingSubsCount,
    subscriptionPriceBrl: config.subscriptionPlan.priceBrl,
    monthlyRecurringRevenue: monthlyRevenue,
    totalSubscriptionRevenueMonth: monthlyRevenue,
    totalSubscriptionRevenueYear: yearlyRevenue,
    totalPlatformCosts: totalCosts,
    netEstimatedIncome: netIncome,
    totalRides: rides.length,
    completedRides: rides.filter((r) => r.status === 'COMPLETED').length,
    activeRides: rides.filter((r) => !['COMPLETED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'EXPIRED'].includes(r.status)).length,
    topZones,
    whatsappContactEvents: config.whatsappContactEventsCount,
  };
}

// Metadata / Config bootstrap
app.get('/api/v1/meta', async (req, res) => {
  try {
    const config = await ensureConfig();
    const zones = await getZones();
    const requirementsSnap = await db.collection('requirements').get();
    const requirements = requirementsSnap.docs.map((doc: any) => doc.data() as RegulatoryRequirement);
    const metrics = await computePlatformMetrics();

    res.json({
      municipality: municipalitySS,
      zones: zones.filter((z) => z.isActive),
      requirements,
      subscriptionPlan: config.subscriptionPlan,
      metrics,
      fareSettings: config.platformFareSettings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load metadata' });
  }
});

// Platform Fare Floor Settings (Public)
app.get('/api/v1/fare-settings', async (req, res) => {
  const config = await ensureConfig();
  res.json(config.platformFareSettings);
});

// Admin Update Platform Fare Floor Settings
app.put('/api/v1/admin/fare-settings', async (req, res) => {
  try {
    const { minBaseFare, minRatePerKm, minFixedRoutePrice, isEnforced, applyToAllDrivers } = req.body;
    const config = await ensureConfig();
    const settings = config.platformFareSettings;

    if (minBaseFare !== undefined) {
      const val = Number(minBaseFare);
      if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Tarifa base mínima inválida.' });
      settings.minBaseFare = Math.round(val * 100) / 100;
    }

    if (minRatePerKm !== undefined) {
      const val = Number(minRatePerKm);
      if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Piso por km inválido.' });
      settings.minRatePerKm = Math.round(val * 100) / 100;
    }

    if (minFixedRoutePrice !== undefined) {
      const val = Number(minFixedRoutePrice);
      if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Piso de rota fixa inválido.' });
      settings.minFixedRoutePrice = Math.round(val * 100) / 100;
    }

    if (isEnforced !== undefined) settings.isEnforced = Boolean(isEnforced);
    settings.updatedAt = new Date().toISOString();

    await db.collection('config').doc('global').update({ platformFareSettings: settings });
    currentConfig = null; // Invalidate cache

    let driversAdjusted = 0;
    if (applyToAllDrivers && settings.isEnforced) {
      const drivers = await getDrivers();
      const batch = db.batch();
      for (const d of drivers) {
        let changed = false;
        if (d.pricing.minimumFare < settings.minBaseFare) {
          d.pricing.minimumFare = settings.minBaseFare;
          changed = true;
        }
        if (d.pricing.ratePerKm < settings.minRatePerKm) {
          d.pricing.ratePerKm = settings.minRatePerKm;
          changed = true;
        }
        if (Array.isArray(d.pricing.fixedRoutes)) {
          for (const route of d.pricing.fixedRoutes) {
            if (route.price < settings.minFixedRoutePrice) {
              route.price = settings.minFixedRoutePrice;
              changed = true;
            }
          }
        }
        if (changed) {
          batch.update(db.collection('drivers').doc(d.id), { pricing: d.pricing });
          driversAdjusted++;
        }
      }
      await batch.commit();
    }

    res.json({ fareSettings: settings, driversAdjusted, message: 'Pisos mínimos da plataforma atualizados com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update fare settings' });
  }
});

// Zones list
app.get('/api/v1/zones', async (req, res) => {
  const zones = await getZones();
  res.json(zones);
});

// Search Drivers
app.post('/api/v1/search/drivers', async (req, res) => {
  try {
    const { originZoneId, destinationZoneId, passengerCount = 1 } = req.body;
    if (!originZoneId || !destinationZoneId) return res.status(400).json({ error: 'Origem e destino são obrigatórios.' });

    const distanceKm = await calculateDistanceKm(originZoneId, destinationZoneId);
    const estimatedDurationMin = Math.max(5, Math.round(distanceKm * 1.4));
    const drivers = await getDrivers();
    const config = await ensureConfig();

    const matchingDrivers = drivers.filter((driver) => {
      const isApproved = driver.regulatoryStatus === 'APPROVED';
      const isSubscribed = driver.subscriptionStatus === 'ACTIVE' || driver.subscriptionStatus === 'TRIAL';
      const coversZone = driver.operatingZones.includes(originZoneId);
      const hasCapacity = (driver.vehicle.passengerCapacity || 4) >= Number(passengerCount);
      return driver.isOnline && isApproved && isSubscribed && coversZone && hasCapacity;
    });

    const results = await Promise.all(matchingDrivers.map(async (driver) => {
      const fare = await calculateDriverFare(driver, originZoneId, destinationZoneId);
      const arrivalTimeMin = Math.floor(Math.random() * 4) + 3;
      return {
        driverId: driver.id,
        name: driver.name,
        avatarUrl: driver.avatarUrl,
        ratingAverage: driver.ratingAverage,
        ratingCount: driver.ratingCount,
        ridesCompleted: driver.ridesCompleted,
        professionalCategory: driver.professionalCategory,
        vehicle: driver.vehicle,
        fare,
        distanceKm,
        estimatedDurationMin,
        arrivalTimeMin,
        isOnline: driver.isOnline,
        pricingType: driver.pricing.pricingType,
      };
    }));

    const dynamic = await calculateCurrentDynamicMultiplier(originZoneId);
    const zones = await getZones();

    res.json({
      totalFound: results.length,
      distanceKm,
      estimatedDurationMin,
      originZone: zones.find((z) => z.id === originZoneId),
      destinationZone: zones.find((z) => z.id === destinationZoneId),
      dynamicMultiplier: dynamic.multiplier,
      isDynamicActive: dynamic.isActive,
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Drivers List
app.get('/api/v1/drivers', async (req, res) => {
  const { status, onlyOnline } = req.query;
  let list = await getDrivers();
  if (status) list = list.filter((d) => d.regulatoryStatus === status);
  if (onlyOnline === 'true') list = list.filter((d) => d.isOnline);
  res.json(list);
});

// Driver details
app.get('/api/v1/drivers/:id', async (req, res) => {
  const doc = await db.collection('drivers').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Motorista não encontrado' });
  res.json(doc.data());
});

// Register new driver
app.post('/api/v1/drivers', async (req, res) => {
  try {
    const { name, phone, email, cpf, birthDate, professionalCategory, licenseNumber, vehicleBrand, vehicleModel, vehicleYear, vehicleColor, vehiclePlate, operatingZones = ['z-centro'], avatarUrl } = req.body;
    if (!name || !phone || !cpf || !vehicleModel || !vehiclePlate) return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });

    const cleanPhone = phone.replace(/\D/g, '');
    const id = `drv-${Date.now()}`;
    const requirementsSnap = await db.collection('requirements').get();
    const requirements = requirementsSnap.docs.map((doc: any) => doc.data() as RegulatoryRequirement);

    const newDriver: Driver = {
      id,
      name,
      phone,
      email: email || `${cleanPhone}@vaicar.local`,
      cpf,
      birthDate: birthDate || '1990-01-01',
      avatarUrl: avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`,
      professionalCategory: professionalCategory || 'Transporte Remunerado Municipal',
      licenseNumber: licenseNumber || 'REG-PENDENTE',
      regulatoryStatus: 'SUBMITTED',
      subscriptionStatus: 'TRIAL',
      isOnline: false,
      operatingZones: operatingZones.length ? operatingZones : ['z-centro'],
      acceptsImmediate: true,
      acceptsScheduled: true,
      vehicle: {
        id: `veh-${Date.now()}`,
        driverId: id,
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
      documents: requirements.map((reqItem: any, idx: number) => ({
        id: `doc-${Date.now()}-${idx}`,
        driverId: id,
        requirementId: reqItem.id,
        requirementName: reqItem.name,
        status: 'PENDING',
      })),
      ratingAverage: 5.0,
      ratingCount: 0,
      ridesCompleted: 0,
      whatsappDirectNumber: `55${cleanPhone}`,
    };

    await db.collection('drivers').doc(id).set(newDriver);
    res.status(201).json(newDriver);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Update Driver Availability (Online / Operating Zones)
app.patch('/api/v1/drivers/:id/availability', async (req, res) => {
  try {
    const doc = await db.collection('drivers').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Motorista não encontrado' });
    const driver = doc.data() as Driver;

    const { isOnline, operatingZones } = req.body;
    if (isOnline === true && driver.regulatoryStatus !== 'APPROVED') {
      return res.status(403).json({ error: 'Não é possível ficar online sem aprovação.' });
    }

    const updates: any = {};
    if (typeof isOnline === 'boolean') updates.isOnline = isOnline;
    if (Array.isArray(operatingZones)) updates.operatingZones = operatingZones;

    await db.collection('drivers').doc(req.params.id).update(updates);
    res.json({ ...driver, ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Update Driver Pricing
app.patch('/api/v1/drivers/:id/pricing', async (req, res) => {
  try {
    const doc = await db.collection('drivers').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Motorista não encontrado' });
    const driver = doc.data() as Driver;
    const config = await ensureConfig();
    const fareSettings = config.platformFareSettings;

    const { pricingType, minimumFare, ratePerKm, fixedRoutes } = req.body;

    if (fareSettings.isEnforced) {
      if (minimumFare !== undefined && Number(minimumFare) < fareSettings.minBaseFare) {
        return res.status(400).json({ error: `Mínimo de R$ ${fareSettings.minBaseFare.toFixed(2)}` });
      }
      if (ratePerKm !== undefined && Number(ratePerKm) < fareSettings.minRatePerKm) {
        return res.status(400).json({ error: `Mínimo de R$ ${fareSettings.minRatePerKm.toFixed(2)}/km` });
      }
    }

    const pricing = { ...driver.pricing };
    if (pricingType) pricing.pricingType = pricingType;
    if (minimumFare !== undefined) pricing.minimumFare = Number(minimumFare);
    if (ratePerKm !== undefined) pricing.ratePerKm = Number(ratePerKm);
    if (Array.isArray(fixedRoutes)) pricing.fixedRoutes = fixedRoutes;

    await db.collection('drivers').doc(req.params.id).update({ pricing });
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Submit/Update Driver Document
app.post('/api/v1/drivers/:id/documents', async (req, res) => {
  try {
    const docRef = db.collection('drivers').doc(req.params.id);
    const driverDoc = await docRef.get();
    if (!driverDoc.exists) return res.status(404).json({ error: 'Motorista não encontrado' });
    const driver = driverDoc.data() as Driver;

    const { requirementId, documentNumber, expiryDate, fileUrl } = req.body;
    let doc = driver.documents.find((d) => d.requirementId === requirementId);

    if (!doc) {
      const requirementsSnap = await db.collection('requirements').get();
      const requirements = requirementsSnap.docs.map((d: any) => d.data() as RegulatoryRequirement);
      const reqItem = requirements.find((r: RegulatoryRequirement) => r.id === requirementId);
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

    const updates: any = { documents: driver.documents };
    if (driver.regulatoryStatus !== 'APPROVED') {
      updates.regulatoryStatus = 'IN_REVIEW';
    }

    await docRef.update(updates);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Create Ride Request
app.post('/api/v1/rides', async (req, res) => {
  try {
    const { passengerName, passengerPhone, passengerAvatarUrl, driverId, originZoneId, originAddress, originLandmark, originMapsLink, destinationZoneId, destinationAddress, destinationLandmark, destinationMapsLink, passengerCount = 1, scheduledTime, isImmediate = true, paymentMethod = 'PIX', paymentChangeFor, savedCard } = req.body;
    if (!passengerName || !passengerPhone || !driverId || !originZoneId || !destinationZoneId) return res.status(400).json({ error: 'Dados incompletos.' });

    const driverDoc = await db.collection('drivers').doc(driverId).get();
    if (!driverDoc.exists) return res.status(404).json({ error: 'Motorista não encontrado.' });
    const driver = driverDoc.data() as Driver;
    if (driver.regulatoryStatus !== 'APPROVED') return res.status(400).json({ error: 'Motorista não habilitado.' });

    const zones = await getZones();
    const originZone = zones.find((z) => z.id === originZoneId);
    const destinationZone = zones.find((z) => z.id === destinationZoneId);

    const estimatedPrice = await calculateDriverFare(driver, originZoneId, destinationZoneId);
    const estimatedDistanceKm = await calculateDistanceKm(originZoneId, destinationZoneId);
    const estimatedDurationMin = Math.max(5, Math.round(estimatedDistanceKm * 1.4));
    const dynamic = await calculateCurrentDynamicMultiplier(originZoneId);

    const id = `ride-${Date.now()}`;
    const newRide: Ride = {
      id,
      passengerName,
      passengerPhone,
      passengerAvatarUrl: passengerAvatarUrl || `https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80`,
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      driverVehicle: `${driver.vehicle.brand} ${driver.vehicle.model} - ${driver.vehicle.color}`,
      driverAvatar: driver.avatarUrl,
      originZoneId,
      originAddress: originAddress || originZone?.name || 'Origem',
      originLat: originZone ? originZone.lat : undefined,
      originLng: originZone ? originZone.lng : undefined,
      originLandmark,
      originMapsLink,
      destinationZoneId,
      destinationAddress: destinationAddress || destinationZone?.name || 'Destino',
      destinationLat: destinationZone ? destinationZone.lat : undefined,
      destinationLng: destinationZone ? destinationZone.lng : undefined,
      destinationLandmark,
      destinationMapsLink,
      passengerCount: Number(passengerCount),
      scheduledTime,
      isImmediate: Boolean(isImmediate),
      estimatedPrice,
      estimatedDistanceKm,
      estimatedDurationMin,
      dynamicMultiplier: dynamic.multiplier,
      isDynamicPricingActive: dynamic.isActive,
      status: 'REQUESTED',
      paymentMethod: paymentMethod as any,
      paymentChangeFor: paymentChangeFor ? Number(paymentChangeFor) : undefined,
      savedCard,
      pixKey: driver.pixKey || driver.phone,
      paymentStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [{ status: 'REQUESTED', timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), label: 'Solicitação enviada ao motorista' }],
    };

    await db.collection('rides').doc(id).set(newRide);
    res.status(201).json(newRide);
  } catch (err) {
    res.status(500).json({ error: 'Ride request failed' });
  }
});

// Update Driver Payment Settings
app.patch('/api/v1/drivers/:id/payment-settings', async (req, res) => {
  try {
    const { pixKey, pixKeyType, acceptsCardMachine, acceptedPaymentMethods } = req.body;
    const updates: any = {};
    if (pixKey !== undefined) updates.pixKey = pixKey;
    if (pixKeyType !== undefined) updates.pixKeyType = pixKeyType;
    if (acceptsCardMachine !== undefined) updates.acceptsCardMachine = Boolean(acceptsCardMachine);
    if (Array.isArray(acceptedPaymentMethods)) updates.acceptedPaymentMethods = acceptedPaymentMethods;

    await db.collection('drivers').doc(req.params.id).update(updates);
    res.json(updates);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Update Ride Payment Status
app.patch('/api/v1/rides/:id/payment-status', async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const updates: any = { updatedAt: new Date().toISOString() };
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    await db.collection('rides').doc(req.params.id).update(updates);
    res.json(updates);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Get All Rides
app.get('/api/v1/rides', async (req, res) => {
  const driverId = req.query.driverId as string | undefined;
  let query: any = db.collection('rides');
  if (driverId) query = query.where('driverId', '==', driverId);
  const snap = await query.get();
  res.json(snap.docs.map((doc: any) => doc.data()));
});

// Get Ride Details
app.get('/api/v1/rides/:id', async (req, res) => {
  const doc = await db.collection('rides').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Corrida não encontrada' });
  res.json(doc.data());
});

// Update Ride Status (State Machine)
app.patch('/api/v1/rides/:id/status', async (req, res) => {
  try {
    const docRef = db.collection('rides').doc(req.params.id);
    const rideDoc = await docRef.get();
    if (!rideDoc.exists) return res.status(404).json({ error: 'Corrida não encontrada' });
    const ride = rideDoc.data() as Ride;

    const { status, cancellationReason } = req.body;
    const validTransitions: Record<string, string[]> = {
      REQUESTED: ['ACCEPTED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER'],
      ACCEPTED: ['DRIVER_ARRIVING', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER'],
      DRIVER_ARRIVING: ['PASSENGER_PICKED_UP', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER'],
      PASSENGER_PICKED_UP: ['IN_PROGRESS'],
      IN_PROGRESS: ['COMPLETED'],
    };

    const allowed = validTransitions[ride.status];
    if (!allowed || !allowed.includes(status)) return res.status(400).json({ error: 'Transição inválida' });

    const labels: Record<string, string> = {
      ACCEPTED: 'Motorista aceitou a corrida',
      DRIVER_ARRIVING: 'Motorista a caminho',
      PASSENGER_PICKED_UP: 'Passageiro a bordo',
      IN_PROGRESS: 'Em andamento',
      COMPLETED: 'Finalizada',
      CANCELLED_BY_PASSENGER: 'Cancelado pelo passageiro',
      CANCELLED_BY_DRIVER: 'Recusado pelo motorista',
    };

    const updates: any = {
      status,
      updatedAt: new Date().toISOString(),
      timeline: [...ride.timeline, {
        status,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        label: labels[status] || status,
      }]
    };

    if (status === 'COMPLETED') {
      updates.completedAt = new Date().toISOString();
      const drvRef = db.collection('drivers').doc(ride.driverId);
      const drvDoc = await drvRef.get();
      if (drvDoc.exists) {
        const d = drvDoc.data() as Driver;
        await drvRef.update({ ridesCompleted: (d.ridesCompleted || 0) + 1 });
      }
    }
    if (cancellationReason) updates.cancellationReason = cancellationReason;

    await docRef.update(updates);
    res.json({ ...ride, ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Update status failed' });
  }
});

// Log WhatsApp Contact Event
app.post('/api/v1/rides/:id/whatsapp', async (req, res) => {
  try {
    const rideDoc = await db.collection('rides').doc(req.params.id).get();
    if (!rideDoc.exists) return res.status(404).json({ error: 'Corrida não encontrada' });
    const ride = rideDoc.data() as Ride;

    const driverDoc = await db.collection('drivers').doc(ride.driverId).get();
    if (!driverDoc.exists) return res.status(404).json({ error: 'Motorista não encontrado' });
    const driver = driverDoc.data() as Driver;

    const config = await ensureConfig();
    const newCount = (config.whatsappContactEventsCount || 0) + 1;
    await db.collection('config').doc('global').update({ whatsappContactEventsCount: newCount });
    currentConfig = null;

    const msg = encodeURIComponent(`Olá ${driver.name}, sou passageiro(a) da corrida VaiCar (#${ride.id.slice(-5)}) de ${ride.originAddress} para ${ride.destinationAddress}.`);
    const whatsappUrl = `https://wa.me/${driver.whatsappDirectNumber}?text=${msg}`;

    res.json({ success: true, whatsappUrl, whatsappDirectNumber: driver.whatsappDirectNumber, totalEvents: newCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log WhatsApp event' });
  }
});

// Reviews
app.post('/api/v1/reviews', async (req, res) => {
  try {
    const { rideId, driverId, rating, comment, reviewerName } = req.body;
    if (!rideId || !driverId || !rating) return res.status(400).json({ error: 'Dados incompletos.' });

    const id = `rev-${Date.now()}`;
    const review: Review = {
      id,
      rideId,
      driverId,
      reviewerRole: 'PASSENGER',
      reviewerName: reviewerName || 'Passageiro(a)',
      rating: Number(rating),
      comment: comment || '',
      createdAt: new Date().toISOString(),
    };

    await db.collection('reviews').doc(id).set(review);

    const driverRef = db.collection('drivers').doc(driverId);
    const drvDoc = await driverRef.get();
    if (drvDoc.exists) {
      const snap = await db.collection('reviews').where('driverId', '==', driverId).get();
      const reviews = snap.docs.map((doc: any) => doc.data() as Review);
      const sum = reviews.reduce((acc: number, curr: Review) => acc + curr.rating, 0);
      await driverRef.update({
        ratingAverage: Number((sum / reviews.length).toFixed(2)),
        ratingCount: reviews.length
      });
    }

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: 'Review failed' });
  }
});

app.get('/api/v1/reviews', async (req, res) => {
  const { driverId } = req.query;
  let query: any = db.collection('reviews');
  if (driverId) query = query.where('driverId', '==', driverId);
  const snap = await query.get();
  res.json(snap.docs.map((doc: any) => doc.data()));
});

// Reports (Denúncias)
app.post('/api/v1/reports', async (req, res) => {
  try {
    const { reportedByRole, reporterName, reporterContact, targetId, targetName, rideId, category, description } = req.body;
    if (!category || !description) return res.status(400).json({ error: 'Categoria e descrição obrigatórias.' });

    const id = `rep-${Date.now()}`;
    const newReport: Report = {
      id,
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

    await db.collection('reports').doc(id).set(newReport);
    res.status(201).json(newReport);
  } catch (err) {
    res.status(500).json({ error: 'Report failed' });
  }
});

app.get('/api/v1/reports', async (req, res) => {
  const snap = await db.collection('reports').get();
  res.json(snap.docs.map((doc: any) => doc.data()));
});

// --- ADMIN CONTROL ENDPOINTS ---

// Admin change driver regulatory status
app.patch('/api/v1/admin/drivers/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const docRef = db.collection('drivers').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Motorista não encontrado' });
    const driver = doc.data() as Driver;

    const updates: any = { regulatoryStatus: status };
    if (status === 'APPROVED') {
      updates['vehicle.isApproved'] = true;
      updates.documents = driver.documents.map(d => ({ ...d, status: 'APPROVED' }));
    } else if (status === 'REJECTED' || status === 'EXPIRED') {
      updates.isOnline = false;
    }

    await docRef.update(updates);
    res.json({ ...driver, ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Status update failed' });
  }
});

// Admin verify specific document
app.patch('/api/v1/admin/documents/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    const { status, rejectionReason } = req.body;

    const drivers = await getDrivers();
    let targetDoc: any = null;
    let targetDriver: Driver | null = null;

    for (const d of drivers) {
      const doc = d.documents.find((doc: any) => doc.id === docId);
      if (doc) {
        targetDoc = doc;
        targetDriver = d;
        break;
      }
    }

    if (!targetDoc || !targetDriver) return res.status(404).json({ error: 'Documento não encontrado' });

    targetDoc.status = status;
    targetDoc.verifiedAt = new Date().toISOString().split('T')[0];
    if (rejectionReason) targetDoc.rejectionReason = rejectionReason;

    const requirementsSnap = await db.collection('requirements').get();
    const requirements = requirementsSnap.docs.map((d: any) => d.data() as RegulatoryRequirement);
    const mandatoryReqIds = requirements.filter((r: RegulatoryRequirement) => r.isMandatory).map((r: RegulatoryRequirement) => r.id);
    const allMandatoryApproved = mandatoryReqIds.every((reqId: string) => {
      const d = targetDriver!.documents.find((doc: any) => doc.requirementId === reqId);
      return d && d.status === 'APPROVED';
    });

    const updates: any = { documents: targetDriver.documents };
    if (allMandatoryApproved) {
      updates.regulatoryStatus = 'APPROVED';
      updates['vehicle.isApproved'] = true;
    } else if (status === 'REJECTED') {
      updates.regulatoryStatus = 'REJECTED';
      updates.isOnline = false;
    }

    await db.collection('drivers').doc(targetDriver.id).update(updates);
    res.json(targetDoc);
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Admin update subscription plan price
app.patch('/api/v1/admin/subscription-plan', async (req, res) => {
  try {
    const { priceBrl, name } = req.body;
    const config = await ensureConfig();
    const plan = config.subscriptionPlan;

    if (priceBrl !== undefined) plan.priceBrl = Number(priceBrl);
    if (name) plan.name = name;

    await db.collection('config').doc('global').update({ subscriptionPlan: plan });
    currentConfig = null;
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Admin update report status
app.patch('/api/v1/admin/reports/:id', async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const updates: any = {};
    if (status) updates.status = status;
    if (resolutionNotes) updates.resolutionNotes = resolutionNotes;
    await db.collection('reports').doc(req.params.id).update(updates);
    res.json({ id: req.params.id, ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Admin Metrics
app.get('/api/v1/admin/metrics', async (req, res) => {
  res.json(await computePlatformMetrics());
});

// Subscription Plan
app.get('/api/v1/subscription/plan', async (req, res) => {
  const config = await ensureConfig();
  res.json(config.subscriptionPlan);
});

// Regulatory Requirements
app.get('/api/v1/regulatory/requirements', async (req, res) => {
  const snap = await db.collection('requirements').get();
  res.json(snap.docs.map((doc: any) => doc.data()));
});

// --- ADMIN DRIVER AUDITING ACTIONS ---
app.post('/api/v1/admin/drivers/:id/approve', async (req, res) => {
  try {
    const docRef = db.collection('drivers').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Motorista não encontrado' });
    const driver = doc.data() as Driver;

    const updates: any = {
      regulatoryStatus: 'APPROVED',
      rejectionReason: null,
      suspensionReason: null,
      blockingReason: null,
      requestedDocRequirement: null,
      'vehicle.isApproved': true,
      documents: driver.documents.map(d => ({ ...d, status: 'APPROVED', verifiedAt: new Date().toISOString() }))
    };

    await docRef.update(updates);
    res.json({ success: true, message: `Motorista ${driver.name} aprovado.` });
  } catch (err) {
    res.status(500).json({ error: 'Approval failed' });
  }
});

app.post('/api/v1/admin/drivers/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatório' });
    await db.collection('drivers').doc(req.params.id).update({
      regulatoryStatus: 'REJECTED',
      rejectionReason: reason.trim(),
      isOnline: false
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Rejection failed' });
  }
});

app.post('/api/v1/admin/drivers/:id/suspend', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatório' });
    await db.collection('drivers').doc(req.params.id).update({
      regulatoryStatus: 'SUSPENDED',
      suspensionReason: reason.trim(),
      isOnline: false
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Suspension failed' });
  }
});

app.post('/api/v1/admin/drivers/:id/block', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatório' });
    await db.collection('drivers').doc(req.params.id).update({
      regulatoryStatus: 'BLOCKED',
      blockingReason: reason.trim(),
      isOnline: false
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Blocking failed' });
  }
});

app.post('/api/v1/admin/drivers/:id/request-doc', async (req, res) => {
  try {
    const { requirementName, message } = req.body;
    await db.collection('drivers').doc(req.params.id).update({
      regulatoryStatus: 'INCOMPLETE',
      requestedDocRequirement: `${requirementName}: ${message || 'Reenvio solicitado'}`
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Request failed' });
  }
});

app.post('/api/v1/admin/drivers/:id/subscription/mark-paid', async (req, res) => {
  try {
    await db.collection('drivers').doc(req.params.id).update({ subscriptionStatus: 'ACTIVE' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// --- PLATFORM COSTS ---
app.get('/api/v1/admin/costs', async (req, res) => {
  const snap = await db.collection('platformCosts').get();
  res.json(snap.docs.map((doc: any) => doc.data()));
});

app.post('/api/v1/admin/costs', async (req, res) => {
  try {
    const { category, description, amountBrl } = req.body;
    if (!description || !amountBrl) return res.status(400).json({ error: 'Dados incompletos' });

    const id = `cost-${Date.now()}`;
    const newCost = {
      id,
      category: category || 'OTHER',
      description: description.trim(),
      amountBrl: Math.abs(Number(amountBrl)),
      date: new Date().toISOString().split('T')[0],
    };

    await db.collection('platformCosts').doc(id).set(newCost);
    res.status(201).json(newCost);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add cost' });
  }
});

app.delete('/api/v1/admin/costs/:id', async (req, res) => {
  await db.collection('platformCosts').doc(req.params.id).delete();
  res.json({ success: true });
});

// --- PASSENGER PROFILE & AUTH ---
app.post('/api/v1/passengers/auth', async (req, res) => {
  console.log('DEBUG: Received POST /api/v1/passengers/auth');
  console.log('DEBUG: Request Body Keys:', Object.keys(req.body));
  try {
    const { name, phone, email, verificationCode, avatarUrl } = req.body;
    if (!phone) {
      console.warn('DEBUG: Auth failed, missing phone');
      return res.status(400).json({ error: 'WhatsApp obrigatório' });
    }
    
    const cleanPhone = phone.trim();

    if (!verificationCode) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Store PIN in Firestore pendingPins collection
      await db.collection('pendingPins').doc(cleanPhone).set({
        pin,
        email: email || '',
        createdAt: new Date().toISOString(),
      });

      let emailSent = false;
      let emailErrorReason = '';
      const cleanEmail = (email || '').trim();
      
      if (cleanEmail) {
        try {
          const mailer = getTransporter();
          if (mailer) {
            const senderUser =
              process.env.SMTP_USER ||
              process.env.EMAIL_USER ||
              process.env.GMAIL_USER ||
              'vaicar@alansmsolutions.com';
            await mailer.sendMail({
              from: `"VaiCar São Sebastião" <${senderUser}>`,
              to: cleanEmail,
              subject: `Código de Acesso VaiCar: ${pin}`,
              text: `Olá! Seu código de validação para o VaiCar São Sebastião é: ${pin}.\n\nSe não solicitou este código, por favor desconsidere este e-mail.`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #020617; color: #f8fafc; padding: 24px; border-radius: 16px; max-width: 480px; margin: 0 auto; border: 1px solid #1e293b;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #10b981; font-size: 24px; margin: 0; font-weight: 900; letter-spacing: -0.5px;">VaiCar</h1>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Transporte Municipal de São Sebastião</p>
                  </div>
                  <div style="background-color: #0f172a; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #334155;">
                    <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 12px 0;">Seu código de confirmação é:</p>
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #10b981; padding: 12px; background: #020617; border-radius: 8px; border: 1px solid #10b981;">
                      ${pin}
                    </div>
                  </div>
                  <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 20px;">
                    Este código é de uso exclusivo para login no aplicativo VaiCar.
                  </p>
                </div>
              `,
            });
            emailSent = true;
            console.log(`[MAIL] Successfully sent PIN ${pin} to ${cleanEmail}`);
          } else {
            emailErrorReason = 'Senha SMTP não detectada no ambiente de execução.';
          }
        } catch (emailError: any) {
          console.warn('[MAIL] Email sending encountered an issue:', emailError?.message || emailError);
          emailErrorReason = emailError?.message || 'Falha de autenticação ou conexão com o Gmail.';
          emailSent = false;
        }
      }

      return res.json({
        codeSent: true,
        emailSent,
        testCode: pin,
        emailErrorReason,
        message: emailSent
          ? `Código PIN enviado para ${cleanEmail}!`
          : `Código de verificação gerado: ${pin}`,
      });
    }
    
    // Verify PIN: accepts stored PIN OR universal master test PINs (8492, 1234)
    const pinDoc = await db.collection('pendingPins').doc(cleanPhone).get();
    const storedPin = pinDoc.exists ? pinDoc.data()?.pin : null;

    const isCodeValid =
      verificationCode === '8492' ||
      verificationCode === '1234' ||
      (storedPin && verificationCode === storedPin);

    if (!isCodeValid) {
      console.warn('DEBUG: Auth failed, invalid code:', verificationCode);
      return res.status(400).json({ error: 'Código incorreto. Digite o código de 4 dígitos recebido ou 8492.' });
    }
    
    // Code is valid, remove it from pendingPins
    await db.collection('pendingPins').doc(cleanPhone).delete().catch(() => {});

    console.log('DEBUG: Checking phone:', cleanPhone);
    const snap = await db.collection('passengers').where('phone', '==', cleanPhone).get();
    let passenger: any;

    if (snap.empty) {
      console.log('DEBUG: Creating new passenger');
      const id = `pass-${Date.now()}`;
      passenger = {
        id,
        name: name?.trim() || 'Passageiro VaiCar',
        phone: cleanPhone,
        email: email?.trim(),
        avatarUrl: avatarUrl || `https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80`,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      await db.collection('passengers').doc(id).set(passenger);
      console.log('DEBUG: New passenger created:', id);
    } else {
      console.log('DEBUG: Updating existing passenger');
      const doc = snap.docs[0];
      passenger = doc.data() as any;
      const updates: any = { isVerified: true };
      if (name) updates.name = name.trim();
      if (email) updates.email = email.trim();
      if (avatarUrl) updates.avatarUrl = avatarUrl;
      await doc.ref.update(updates);
      passenger = { ...passenger, ...updates };
      console.log('DEBUG: Passenger updated:', doc.id);
    }

    res.json({ success: true, passenger });
  } catch (err: any) {
    console.error('DEBUG: Passenger Auth Failed:', err);
    res.status(500).json({ error: 'Auth failed', details: err.message });
  }
});

app.get('/api/v1/passengers', async (req, res) => {
  const snap = await db.collection('passengers').get();
  res.json(snap.docs.map((doc: any) => doc.data()));
});

app.get('/api/v1/passengers/:id', async (req, res) => {
  const doc = await db.collection('passengers').doc(req.params.id).get();
  if (doc.exists) return res.json(doc.data());
  
  const snap = await db.collection('passengers').where('phone', '==', req.params.id).get();
  if (!snap.empty) return res.json(snap.docs[0].data());
  
  res.status(404).json({ error: 'Passageiro não encontrado' });
});

app.get('/api/v1/passengers/:id/rides', async (req, res) => {
  const snap = await db.collection('rides')
    .where('passengerPhone', '==', req.params.id)
    .get();
  res.json(snap.docs.map((doc: any) => doc.data()));
});

// --- PASSENGER & DRIVER REVIEWS ---
app.post('/api/v1/passenger-reviews', async (req, res) => {
  try {
    const { rideId, passengerId, driverId, rating, comment } = req.body;
    const id = `prev-${Date.now()}`;
    const newReview = {
      id,
      rideId,
      passengerId,
      driverId,
      rating: Number(rating) || 5,
      comment: comment?.trim() || 'Ótimo passageiro.',
      createdAt: new Date().toISOString(),
    };
    await db.collection('passengerReviews').doc(id).set(newReview);
    res.status(201).json(newReview);
  } catch (err) {
    res.status(500).json({ error: 'Review failed' });
  }
});

app.get('/api/v1/passenger-reviews', async (req, res) => {
  const { passengerId, driverId } = req.query;
  let query: any = db.collection('passengerReviews');
  if (passengerId) query = query.where('passengerId', '==', String(passengerId));
  if (driverId) query = query.where('driverId', '==', String(driverId));
  const snap = await query.get();
  res.json(snap.docs.map((doc: any) => doc.data()));
});

// --- DYNAMIC PRICING ADMIN ROUTES ---
app.get('/api/v1/admin/dynamic-pricing', async (req, res) => {
  const config = await ensureConfig();
  res.json(config.dynamicPricingSettings);
});

app.post('/api/v1/admin/dynamic-pricing', async (req, res) => {
  try {
    const settings = req.body;
    const config = await ensureConfig();
    const updated = { ...config.dynamicPricingSettings, ...settings };
    await db.collection('config').doc('global').update({ dynamicPricingSettings: updated });
    currentConfig = null;
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

app.get('/api/v1/admin/surge-analysis', async (req, res) => {
  const zones = await getZones();
  const drivers = await getDrivers();
  const rides = await getRides();
  
  const analysis = await Promise.all(zones.map(async (zone: any) => {
    const dynamic = await calculateCurrentDynamicMultiplier(zone.id);
    const onlineDrivers = drivers.filter((d: Driver) => d.isOnline && d.regulatoryStatus === 'APPROVED' && d.operatingZones.includes(zone.id)).length;
    const activeRequests = rides.filter((r: Ride) => ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING'].includes(r.status) && r.originZoneId === zone.id).length;
    
    return {
      zoneId: zone.id,
      zoneName: zone.name,
      multiplier: dynamic.multiplier,
      isActive: dynamic.isActive,
      onlineDrivers,
      activeRequests,
      ratio: activeRequests === 0 ? onlineDrivers : (Number(onlineDrivers) / activeRequests).toFixed(2)
    };
  }));
  res.json(analysis);
});

// --- VITE MIDDLEWARE & SPA SERVING ---
app.all('/api/*', (req, res) => {
  console.log(`[API 404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

async function startServer() {
  await seedStaticData();

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
