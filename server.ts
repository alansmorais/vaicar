import 'dotenv/config';
import dns from 'dns';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { db } from './src/lib/firebaseAdmin.ts';

// Force Node.js to use IPv4 instead of IPv6 to prevent ENETUNREACH in cloud containers
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  console.warn('[DNS] Could not set ipv4first default result order:', e);
}
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

async function createMailer(cleanPass: string, user: string, port = 587, secure = false) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user,
      pass: cleanPass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
    },
  } as any);
}

async function getTransporter() {
  let rawPass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_PASS ||
    '';

  let user = (
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    process.env.GMAIL_USER ||
    'vaicar@alansmsolutions.com'
  ).trim();

  // If not found in process.env, check Firestore platformSettings
  if (!rawPass) {
    try {
      const snap = await db.collection('platformSettings').doc('smtp').get();
      if (snap.exists) {
        const data = snap.data();
        if (data?.pass) rawPass = data.pass;
        if (data?.user) user = data.user;
      }
    } catch (dbErr: any) {
      console.warn('[MAIL] Error reading smtp settings from Firestore:', dbErr.message);
    }
  }

  const cleanPass = rawPass.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');

  if (!cleanPass) {
    console.warn('[MAIL] Nenhuma senha SMTP configurada nas variáveis de ambiente ou Firestore.');
    return null;
  }

  // Return IPv4 transport on port 587 with STARTTLS
  return createMailer(cleanPass, user, 587, false);
}

const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyqOGDH8mb_-fOmqxzL4VXGyg9nqm7a7Usn0jL9UcAkixBvUo_aAUkteRK8FEYw4g2K/exec';

// Ensure default Google Apps Script Webhook is active and registered in Firestore on startup
(async () => {
  try {
    const snap = await db.collection('platformSettings').doc('smtp').get();
    const data = snap.exists ? snap.data() : {};
    if (!data?.appsScriptUrl) {
      await db.collection('platformSettings').doc('smtp').set({
        appsScriptUrl: DEFAULT_APPS_SCRIPT_URL,
        user: data?.user || 'vaicar@alansmsolutions.com',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log('[MAIL] Initialized default Apps Script URL in Firestore');
    }
  } catch (err: any) {
    console.warn('[MAIL] Could not seed Apps Script URL to Firestore:', err.message);
  }
})();

// Resilient mail sender that supports Google Apps Script Webhook and SMTP fallbacks
async function sendSystemMail(mailOptions: any) {
  let appsScriptUrl = process.env.APPS_SCRIPT_URL || process.env.GMAIL_WEBHOOK_URL || DEFAULT_APPS_SCRIPT_URL;
  let rawPass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_PASS ||
    '';

  let user = (
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    process.env.GMAIL_USER ||
    'vaicar@alansmsolutions.com'
  ).trim();

  // Load from Firestore if missing or configured
  try {
    const snap = await db.collection('platformSettings').doc('smtp').get();
    if (snap.exists) {
      const data = snap.data();
      if (data?.appsScriptUrl && data.appsScriptUrl.trim()) appsScriptUrl = data.appsScriptUrl.trim();
      if (data?.pass && !rawPass) rawPass = data.pass;
      if (data?.user) user = data.user;
    }
  } catch (dbErr: any) {
    console.warn('[MAIL] Error reading email settings from Firestore:', dbErr.message);
  }

  // METHOD 1: Google Apps Script Webhook (Highly recommended, 100% reliable HTTPS)
  if (appsScriptUrl && appsScriptUrl.trim().startsWith('http')) {
    try {
      console.log('[MAIL] Sending via Google Apps Script Webhook:', appsScriptUrl);
      const webhookRes = await fetch(appsScriptUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text,
        }),
        redirect: 'manual',
      });

      console.log('[MAIL] Apps Script response status:', webhookRes.status);

      // In Google Apps Script Web Apps, returning ContentService output on POST triggers a 302 redirect.
      // Status 200 or 302 confirms doPost executed on Google servers and MailApp.sendEmail() ran.
      if (webhookRes.status === 200 || webhookRes.status === 302) {
        const location = webhookRes.headers.get('location');
        if (location) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const echoRes = await fetch(location, { method: 'GET', signal: controller.signal });
            clearTimeout(timer);
            if (echoRes.ok) {
              const echoText = await echoRes.text();
              try {
                const echoJson = JSON.parse(echoText);
                if (echoJson.status === 'error') {
                  throw new Error(echoJson.message || 'Erro reportado pelo Google Apps Script');
                }
              } catch (parseErr: any) {
                if (parseErr.message?.includes('Erro reportado')) throw parseErr;
              }
            }
          } catch (echoErr: any) {
            if (echoErr.message?.includes('Erro reportado')) throw echoErr;
            // Echo proxy timeouts or 404s can be safely ignored because the 302 already confirms execution
          }
        }
        console.log('[MAIL] Successfully dispatched email via Google Apps Script');
        return { success: true, provider: 'apps_script' };
      }

      const responseText = await webhookRes.text();
      console.warn('[MAIL] Apps Script unexpected status:', webhookRes.status, responseText);
      throw new Error(`Google Apps Script respondeu com status ${webhookRes.status}`);
    } catch (asErr: any) {
      console.warn('[MAIL] Apps Script dispatch error:', asErr.message);
      // Only attempt SMTP fallback if an actual password was explicitly configured
      if (!rawPass) throw asErr;
      console.warn('[MAIL] Apps Script failed, trying SMTP fallback with configured password...');
    }
  }

  // METHOD 2: Direct SMTP
  const cleanPass = rawPass.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
  if (!cleanPass) {
    if (!appsScriptUrl) {
      throw new Error(
        'Nenhum método de e-mail configurado. Adicione a URL do Google Apps Script ou a Senha de Aplicativo no Painel Admin.'
      );
    }
  }

  // Attempt 1: Port 587 (IPv4 STARTTLS)
  try {
    const transporter587 = await createMailer(cleanPass, user, 587, false);
    return await transporter587.sendMail(mailOptions);
  } catch (err587: any) {
    console.warn('[MAIL] Port 587 attempt failed, trying Port 465 SSL:', err587.message);
    
    // Attempt 2: Port 465 (IPv4 SMTPS)
    try {
      const transporter465 = await createMailer(cleanPass, user, 465, true);
      return await transporter465.sendMail(mailOptions);
    } catch (err465: any) {
      console.warn('[MAIL] Port 465 attempt failed, trying service gmail:', err465.message);

      // Attempt 3: Service Gmail
      const serviceTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass: cleanPass },
        tls: { rejectUnauthorized: false },
      });
      return await serviceTransporter.sendMail(mailOptions);
    }
  }
}

const app = express();
const PORT = 3000;

// --- LIVE REAL-TIME SSE BROADCAST EVENT BUS ---
type LiveEventType =
  | 'RIDE_CREATED'
  | 'RIDE_UPDATED'
  | 'RIDE_DELETED'
  | 'DRIVER_UPDATED'
  | 'SYSTEM_PING'
  | 'CONNECTED';

interface LiveEventMessage {
  type: LiveEventType;
  payload?: any;
  timestamp: string;
}

const liveClients = new Set<express.Response>();

function broadcastLiveEvent(type: LiveEventType, payload?: any) {
  const message: LiveEventMessage = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
  const eventPayload = `data: ${JSON.stringify(message)}\n\n`;

  for (const client of Array.from(liveClients)) {
    try {
      client.write(eventPayload);
    } catch {
      liveClients.delete(client);
    }
  }
}

// Server-Sent Events (SSE) Live Stream Endpoint for instantaneous driver <-> passenger sync
app.get('/api/v1/live/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  // Initial handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  liveClients.add(res);

  // Keep-alive ping every 12 seconds so connections don't drop behind reverse proxies
  const keepAliveTimer = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      clearInterval(keepAliveTimer);
      liveClients.delete(res);
    }
  }, 12000);

  req.on('close', () => {
    clearInterval(keepAliveTimer);
    liveClients.delete(res);
  });
});

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
  { id: 'z-morro-do-abrigo', municipalityId: 'mun-ss', name: 'Morro do Abrigo', slug: 'morro-do-abrigo', lat: -23.7780, lng: -45.4120, distanceFromCenterKm: 3.8, isActive: true },
  { id: 'z-topolandia', municipalityId: 'mun-ss', name: 'Topolândia', slug: 'topolandia', lat: -23.8150, lng: -45.4180, distanceFromCenterKm: 1.8, isActive: true },
  { id: 'z-barequecaba', municipalityId: 'mun-ss', name: 'Barequeçaba', slug: 'barequecaba', lat: -23.8340, lng: -45.4380, distanceFromCenterKm: 7.0, isActive: true },
  { id: 'z-cigarras', municipalityId: 'mun-ss', name: 'Cigarras', slug: 'cigarras', lat: -23.7400, lng: -45.3980, distanceFromCenterKm: 8.5, isActive: true },
  { id: 'z-jaragua', municipalityId: 'mun-ss', name: 'Jaraguá', slug: 'jaragua', lat: -23.7280, lng: -45.4200, distanceFromCenterKm: 10.0, isActive: true },
  { id: 'z-enseada', municipalityId: 'mun-ss', name: 'Enseada', slug: 'enseada', lat: -23.7220, lng: -45.4290, distanceFromCenterKm: 11.0, isActive: true },
  { id: 'z-canto-do-mar', municipalityId: 'mun-ss', name: 'Canto do Mar', slug: 'canto-do-mar', lat: -23.7150, lng: -45.4350, distanceFromCenterKm: 13.5, isActive: true },
  { id: 'z-guaeca', municipalityId: 'mun-ss', name: 'Guaecá', slug: 'guaeca', lat: -23.8290, lng: -45.4650, distanceFromCenterKm: 11.5, isActive: true },
  { id: 'z-toque-grande', municipalityId: 'mun-ss', name: 'Toque-Toque Grande', slug: 'toque-toque-grande', lat: -23.8375, lng: -45.5136, distanceFromCenterKm: 16.0, isActive: true },
  { id: 'z-toque-pequeno', municipalityId: 'mun-ss', name: 'Toque-Toque Pequeno', slug: 'toque-toque-pequeno', lat: -23.8300, lng: -45.5350, distanceFromCenterKm: 19.5, isActive: true },
  { id: 'z-pauba', municipalityId: 'mun-ss', name: 'Paúba', slug: 'pauba', lat: -23.7950, lng: -45.5560, distanceFromCenterKm: 23.0, isActive: true },
  { id: 'z-santiago', municipalityId: 'mun-ss', name: 'Santiago', slug: 'santiago', lat: -23.7930, lng: -45.5450, distanceFromCenterKm: 21.0, isActive: true },
  { id: 'z-maresias', municipalityId: 'mun-ss', name: 'Maresias', slug: 'maresias', lat: -23.7915, lng: -45.5684, distanceFromCenterKm: 26.5, isActive: true },
  { id: 'z-boicucanga', municipalityId: 'mun-ss', name: 'Boiçucanga', slug: 'boicucanga', lat: -23.7820, lng: -45.6170, distanceFromCenterKm: 33.0, isActive: true },
  { id: 'z-camburi', municipalityId: 'mun-ss', name: 'Camburi', slug: 'camburi', lat: -23.7745, lng: -45.6420, distanceFromCenterKm: 36.0, isActive: true },
  { id: 'z-juquehy', municipalityId: 'mun-ss', name: 'Juquehy', slug: 'juquehy', lat: -23.7660, lng: -45.7270, distanceFromCenterKm: 48.0, isActive: true },
  { id: 'z-barra-do-una', municipalityId: 'mun-ss', name: 'Barra do Una', slug: 'barra-do-una', lat: -23.7680, lng: -45.7600, distanceFromCenterKm: 55.0, isActive: true },
  { id: 'z-boraceia', municipalityId: 'mun-ss', name: 'Boracéia', slug: 'boraceia', lat: -23.7650, lng: -45.8500, distanceFromCenterKm: 62.0, isActive: true },
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
  name: 'VaiCar Pro Escalonado',
  priceBrl: 100.0,
  billingPeriod: 'mensal',
  description: 'Mensalidade escalonada: R$ 0 para o 1º registro, R$ 60 para os próximos 9 (2º-10º), R$ 80 (11º-20º) e R$ 100 (21º-100º). 0% de comissão.',
  commissionPercent: 0,
  isActive: true,
  tiers: [
    { range: '1º Registro', priceBrl: 0, label: 'R$ 0 / mês', description: 'Gratuito / Isenção total para o 1º motorista pioneiro.', highlight: true },
    { range: 'Próximos 9 (2º ao 10º)', priceBrl: 60, label: 'R$ 60 / mês', description: 'R$ 60 por mês para os 9 motoristas seguintes.' },
    { range: '11º ao 20º', priceBrl: 80, label: 'R$ 80 / mês', description: 'R$ 80 por mês para os registros de 11 a 20.' },
    { range: '21º ao 100º', priceBrl: 100, label: 'R$ 100 / mês', description: 'R$ 100 por mês para os registros de 21 a 100.' },
  ],
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

function getTierForRegistrationIndex(regIndex: number): { feeBrl: number; tierName: string; isFree: boolean } {
  if (regIndex <= 1) {
    return { feeBrl: 0, tierName: '1º Registro (Pioneiro VIP - Grátis)', isFree: true };
  } else if (regIndex <= 10) {
    return { feeBrl: 60, tierName: 'Próximos 9: 2º ao 10º (R$ 60/mês)', isFree: false };
  } else if (regIndex <= 20) {
    return { feeBrl: 80, tierName: '11º ao 20º (R$ 80/mês)', isFree: false };
  } else {
    return { feeBrl: 100, tierName: '21º ao 100º (R$ 100/mês)', isFree: false };
  }
}

async function seedStaticData() {
  for (const zone of defaultZones) {
    const docRef = db.collection('zones').doc(zone.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      await docRef.set(zone);
    }
  }

  const reqsSnap = await db.collection('requirements').limit(1).get();
  if (reqsSnap.empty) {
    const batch = db.batch();
    for (const req of defaultRequirements) {
      batch.set(db.collection('requirements').doc(req.id), req);
    }
    await batch.commit();
  }

  // Automatic purge of fictitious "Carlos" records and legacy cancelled test rides
  try {
    const driversSnap = await db.collection('drivers').get();
    for (const doc of driversSnap.docs) {
      const data = doc.data() as any;
      if (data?.name && data.name.toLowerCase().includes('carlos')) {
        await doc.ref.delete();
        console.log(`[CLEANUP] Deleted fictitious driver: ${data.name} (${doc.id})`);
      }
    }

    const ridesSnap = await db.collection('rides').get();
    for (const doc of ridesSnap.docs) {
      const data = doc.data() as any;
      if (
        (data?.driverName && data.driverName.toLowerCase().includes('carlos')) ||
        ['CANCELLED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'REJECTED', 'EXPIRED'].includes(data?.status)
      ) {
        await doc.ref.delete();
        console.log(`[CLEANUP] Purged stale ride (${doc.id}) with driver "${data?.driverName || 'unknown'}"`);
      }
    }
  } catch (err: any) {
    console.warn('[CLEANUP] Error during startup cleanup:', err.message);
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
  const rawList = snap.docs.map((doc: any) => doc.data() as Driver);
  return rawList.map((d: Driver, idx: number) => {
    const regIdx = d.registrationIndex && d.registrationIndex > 0 ? d.registrationIndex : (idx + 1);
    const tier = getTierForRegistrationIndex(regIdx);
    const monthlyFee = typeof d.monthlyFeeBrl === 'number' ? d.monthlyFeeBrl : tier.feeBrl;
    const tierName = d.subscriptionTierName || tier.tierName;
    return {
      ...d,
      registrationIndex: regIdx,
      monthlyFeeBrl: monthlyFee,
      subscriptionTierName: tierName,
    };
  });
}

async function getRides(): Promise<Ride[]> {
  const snap = await db.collection('rides').get();
  const list = snap.docs.map((doc: any) => doc.data() as Ride);
  return list.sort((a: Ride, b: Ride) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
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
  const monthlyRevenue = drivers
    .filter((d: Driver) => d.subscriptionStatus === 'ACTIVE')
    .reduce((sum: number, d: Driver) => sum + (typeof d.monthlyFeeBrl === 'number' ? d.monthlyFeeBrl : 100), 0);
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
      subscriptionPlan: {
        ...config.subscriptionPlan,
        ...subscriptionPlan,
        tiers: subscriptionPlan.tiers,
      },
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

// Create/add custom zone (allows drivers to add non-listed neighborhoods e.g. Enseada, Canto do Mar, Morro do Abrigo, etc.)
app.post('/api/v1/zones', async (req, res) => {
  try {
    const { name, slug, lat, lng, distanceFromCenterKm } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome da zona é obrigatório' });
    }
    const cleanName = name.trim();
    const zoneSlug = slug || cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const id = `z-${zoneSlug}`;

    // Check if zone already exists by id
    const docRef = db.collection('zones').doc(id);
    const existing = await docRef.get();
    if (existing.exists) {
      return res.json(existing.data());
    }

    const newZone: Zone = {
      id,
      municipalityId: 'mun-ss',
      name: cleanName,
      slug: zoneSlug,
      lat: typeof lat === 'number' ? lat : -23.8078,
      lng: typeof lng === 'number' ? lng : -45.4058,
      distanceFromCenterKm: typeof distanceFromCenterKm === 'number' ? distanceFromCenterKm : 8.0,
      isActive: true,
    };

    await docRef.set(newZone);
    res.status(201).json(newZone);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao cadastrar zona' });
  }
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

    const currentDriversSnap = await db.collection('drivers').get();
    const registrationIndex = currentDriversSnap.size + 1;
    const tier = getTierForRegistrationIndex(registrationIndex);

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
      subscriptionStatus: registrationIndex === 1 ? 'ACTIVE' : 'TRIAL',
      registrationIndex,
      monthlyFeeBrl: tier.feeBrl,
      subscriptionTierName: tier.tierName,
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
      originLat: originZone ? originZone.lat : -23.8078,
      originLng: originZone ? originZone.lng : -45.4058,
      originLandmark: originLandmark || '',
      originMapsLink: originMapsLink || '',
      destinationZoneId,
      destinationAddress: destinationAddress || destinationZone?.name || 'Destino',
      destinationLat: destinationZone ? destinationZone.lat : -23.8078,
      destinationLng: destinationZone ? destinationZone.lng : -45.4058,
      destinationLandmark: destinationLandmark || '',
      destinationMapsLink: destinationMapsLink || '',
      passengerCount: Number(passengerCount) || 1,
      scheduledTime: scheduledTime || null,
      isImmediate: Boolean(isImmediate),
      estimatedPrice,
      estimatedDistanceKm,
      estimatedDurationMin,
      dynamicMultiplier: dynamic.multiplier,
      isDynamicPricingActive: dynamic.isActive,
      status: 'REQUESTED',
      paymentMethod: paymentMethod as any,
      paymentChangeFor: paymentChangeFor ? Number(paymentChangeFor) : null,
      savedCard: savedCard || null,
      pixKey: driver.pixKey || driver.phone || '',
      paymentStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [{ status: 'REQUESTED', timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), label: 'Solicitação enviada ao motorista' }],
    };

    await db.collection('rides').doc(id).set(newRide);
    broadcastLiveEvent('RIDE_CREATED', newRide);
    res.status(201).json(newRide);
  } catch (err: any) {
    console.error('Error in /api/v1/rides:', err);
    res.status(500).json({ error: 'Ride request failed', details: err?.message || String(err) });
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
    broadcastLiveEvent('DRIVER_UPDATED', { id: req.params.id, ...updates });
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
    broadcastLiveEvent('RIDE_UPDATED', { id: req.params.id, ...updates });
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
  const all = snap.docs.map((doc: any) => doc.data() as Ride);
  all.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  res.json(all);
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
      REQUESTED: ['ACCEPTED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'CANCELLED', 'REJECTED'],
      ACCEPTED: ['DRIVER_ARRIVING', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'CANCELLED'],
      DRIVER_ARRIVING: ['PASSENGER_PICKED_UP', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'CANCELLED'],
      PASSENGER_PICKED_UP: ['IN_PROGRESS', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'CANCELLED'],
    };

    const allowed = validTransitions[ride.status];
    if (!allowed || !allowed.includes(status)) return res.status(400).json({ error: 'Transição inválida' });

    const labels: Record<string, string> = {
      ACCEPTED: 'Motorista aceitou a corrida',
      DRIVER_ARRIVING: 'Motorista a caminho',
      PASSENGER_PICKED_UP: 'Passageiro a bordo',
      IN_PROGRESS: 'Em andamento',
      COMPLETED: 'Finalizada',
      CANCELLED: 'Cancelada',
      CANCELLED_BY_PASSENGER: 'Cancelado pelo passageiro',
      CANCELLED_BY_DRIVER: 'Recusado pelo motorista',
      REJECTED: 'Recusada',
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
    const updatedRide = { ...ride, ...updates };
    broadcastLiveEvent('RIDE_UPDATED', updatedRide);
    res.json(updatedRide);
  } catch (err) {
    res.status(500).json({ error: 'Update status failed' });
  }
});

// Delete or Cleanup Rides
app.post('/api/v1/rides/cleanup', async (req, res) => {
  try {
    const snap = await db.collection('rides').get();
    const batch = db.batch();
    let count = 0;
    for (const doc of snap.docs) {
      const data = doc.data() as Ride;
      if (['COMPLETED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(data.status)) {
        batch.delete(doc.ref);
        count++;
      }
    }
    if (count > 0) {
      await batch.commit();
      broadcastLiveEvent('RIDE_DELETED', { count });
    }
    res.json({ success: true, deleted: count });
  } catch (err: any) {
    res.status(500).json({ error: 'Cleanup failed: ' + err.message });
  }
});

app.delete('/api/v1/rides/:id', async (req, res) => {
  try {
    const docRef = db.collection('rides').doc(req.params.id);
    await docRef.delete();
    broadcastLiveEvent('RIDE_DELETED', { id: req.params.id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Delete failed: ' + err.message });
  }
});

// Administrative full cleanup of fictitious drivers and test rides
app.post('/api/v1/admin/cleanup-fictitious', async (req, res) => {
  try {
    let removedDrivers = 0;
    let removedRides = 0;
    const batch = db.batch();

    const driversSnap = await db.collection('drivers').get();
    for (const doc of driversSnap.docs) {
      const data = doc.data() as any;
      if (data?.name && data.name.toLowerCase().includes('carlos')) {
        batch.delete(doc.ref);
        removedDrivers++;
      }
    }

    const ridesSnap = await db.collection('rides').get();
    for (const doc of ridesSnap.docs) {
      const data = doc.data() as any;
      if (
        (data?.driverName && data.driverName.toLowerCase().includes('carlos')) ||
        ['CANCELLED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'REJECTED', 'EXPIRED'].includes(data?.status)
      ) {
        batch.delete(doc.ref);
        removedRides++;
      }
    }

    await batch.commit();
    broadcastLiveEvent('RIDE_DELETED', { removedDrivers, removedRides });
    broadcastLiveEvent('DRIVER_UPDATED', { removedDrivers });
    res.json({ success: true, removedDrivers, removedRides });
  } catch (err: any) {
    res.status(500).json({ error: 'Cleanup failed: ' + err.message });
  }
});

app.delete('/api/v1/drivers/:id', async (req, res) => {
  try {
    const docRef = db.collection('drivers').doc(req.params.id);
    await docRef.delete();
    broadcastLiveEvent('DRIVER_UPDATED', { deletedId: req.params.id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Delete driver failed: ' + err.message });
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
  res.json({
    ...config.subscriptionPlan,
    ...subscriptionPlan,
    tiers: subscriptionPlan.tiers,
  });
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

// --- ADMIN SMTP / EMAIL SETTINGS ---
app.get('/api/v1/admin/smtp-settings', async (req, res) => {
  try {
    const snap = await db.collection('platformSettings').doc('smtp').get();
    const data = snap.exists ? snap.data() : {};
    const pass = data?.pass || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
    const user = data?.user || process.env.SMTP_USER || 'vaicar@alansmsolutions.com';
    const appsScriptUrl = data?.appsScriptUrl || process.env.APPS_SCRIPT_URL || process.env.GMAIL_WEBHOOK_URL || '';
    res.json({
      configured: Boolean(appsScriptUrl || pass),
      user,
      hasPass: Boolean(pass),
      appsScriptUrl,
      hasAppsScript: Boolean(appsScriptUrl),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get SMTP settings' });
  }
});

app.post('/api/v1/admin/smtp-settings', async (req, res) => {
  try {
    const { user, pass, appsScriptUrl } = req.body;
    
    const snap = await db.collection('platformSettings').doc('smtp').get();
    const existing = snap.exists ? snap.data() : {};

    const cleanPass = pass !== undefined ? pass.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '') : (existing?.pass || '');
    const cleanUser = (user || existing?.user || 'vaicar@alansmsolutions.com').trim();
    const cleanAppsScriptUrl = appsScriptUrl !== undefined ? appsScriptUrl.trim() : (existing?.appsScriptUrl || '');

    if (!cleanPass && !cleanAppsScriptUrl) {
      return res.status(400).json({ error: 'Informe a URL do Google Apps Script ou a Senha de Aplicativo.' });
    }
    
    await db.collection('platformSettings').doc('smtp').set({
      user: cleanUser,
      pass: cleanPass,
      appsScriptUrl: cleanAppsScriptUrl,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Configurações de e-mail salvas com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao salvar configurações de e-mail' });
  }
});

app.post('/api/v1/admin/test-email', async (req, res) => {
  try {
    const { targetEmail } = req.body;
    const dest = (targetEmail || 'alanpkmorais@gmail.com').trim();
    if (!dest) {
      return res.status(400).json({ error: 'E-mail de destino obrigatório para o teste' });
    }

    const testPin = Math.floor(1000 + Math.random() * 9000).toString();
    const senderUser =
      process.env.SMTP_USER ||
      process.env.EMAIL_USER ||
      process.env.GMAIL_USER ||
      'vaicar@alansmsolutions.com';

    await sendSystemMail({
      from: `"VaiCar São Sebastião" <${senderUser}>`,
      to: dest,
      subject: `🧪 Teste de Conexão VaiCar - Código PIN: ${testPin}`,
      text: `Olá!\n\nEste é um e-mail de teste de envio do sistema VaiCar São Sebastião.\n\nSeu código de teste é: ${testPin}.\n\nSe você recebeu esta mensagem, sua integração com o Gmail está 100% ativa e funcionando perfeitamente!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #020617; color: #f8fafc; padding: 32px; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #10b981; font-size: 28px; margin: 0; font-weight: 900;">VaiCar</h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Transporte Municipal de São Sebastião</p>
          </div>
          <div style="background-color: #0f172a; padding: 24px; border-radius: 12px; text-align: center; border: 1px solid #334155;">
            <div style="display: inline-block; padding: 6px 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 9999px; color: #10b981; font-size: 11px; font-weight: 700; margin-bottom: 16px;">
              ✓ TESTE DE DISPARO SMTP
            </div>
            <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 12px 0;">Seu código de verificação simulado é:</p>
            <div style="font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #10b981; padding: 16px; background: #020617; border-radius: 8px; border: 2px solid #10b981; margin: 8px 0;">
              ${testPin}
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">
              Se você está lendo este e-mail, a conexão com sua conta Google Workspace / Gmail está <strong>ativa e validada</strong>!
            </p>
          </div>
          <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 24px;">
            Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
          </p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: `E-mail de teste com PIN ${testPin} enviado com sucesso para ${dest}!`,
      pin: testPin,
    });
  } catch (err: any) {
    console.error('[MAIL] Test email failed:', err);
    res.status(500).json({
      error: err.message || 'Falha ao enviar e-mail de teste. Verifique sua senha de aplicativo.',
    });
  }
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
    const phoneDigits = cleanPhone.replace(/\D/g, '') || cleanPhone;
    let cleanEmail = (email || '').trim().toLowerCase();

    // Se o email não foi fornecido, tentamos buscar no banco para ver se é login de usuário existente
    if (!cleanEmail) {
      const snap = await db.collection('passengers').where('phone', '==', cleanPhone).get();
      if (!snap.empty) {
        const pData = snap.docs[0].data();
        cleanEmail = (pData?.email || '').trim().toLowerCase();
      } else {
        // Fallback buscando por dígitos apenas
        const snapAll = await db.collection('passengers').get();
        for (const doc of snapAll.docs) {
          const d = doc.data();
          const dp = (d.phone || '').replace(/\D/g, '');
          if (dp === phoneDigits && d.email) {
            cleanEmail = d.email.trim().toLowerCase();
            break;
          }
        }
      }
    }

    if (!cleanEmail && !verificationCode) {
      return res.status(404).json({ error: 'Nenhum cadastro de passageiro encontrado com este telefone. Por favor, faça o cadastro completo com nome, telefone e e-mail.' });
    }

    if (!verificationCode) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      
      const pinPayload = {
        pin,
        phone: cleanPhone,
        phoneDigits,
        email: cleanEmail,
        createdAt: new Date().toISOString(),
      };

      // Store PIN in Firestore pendingPins collection (by phone digits, raw phone, and email)
      await db.collection('pendingPins').doc(phoneDigits).set(pinPayload);
      if (cleanPhone !== phoneDigits) {
        await db.collection('pendingPins').doc(cleanPhone).set(pinPayload);
      }
      if (cleanEmail) {
        await db.collection('pendingPins').doc(cleanEmail).set(pinPayload);
      }

      let emailSent = false;
      let emailErrorReason = '';
      
      if (cleanEmail) {
        try {
          const senderUser =
            process.env.SMTP_USER ||
            process.env.EMAIL_USER ||
            process.env.GMAIL_USER ||
            'vaicar@alansmsolutions.com';
          await sendSystemMail({
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
        } catch (emailError: any) {
          console.warn('[MAIL] Email sending encountered an issue:', emailError?.message || emailError);
          emailErrorReason = emailError?.message || 'Falha de autenticação ou conexão com o Gmail.';
          emailSent = false;
        }
      }

      return res.json({
        codeSent: true,
        emailSent,
        emailErrorReason,
        message: emailSent
          ? `Código PIN enviado para ${cleanEmail}!`
          : `Não foi possível enviar o e-mail. Verifique o endereço digitado.`,
      });
    }
    
    // Verify PIN: strictly accepts ONLY the PIN that was generated and sent to the user's email
    let storedPin: string | null = null;

    // 1. Try phoneDigits
    let pinDoc = await db.collection('pendingPins').doc(phoneDigits).get();
    if (pinDoc.exists) {
      storedPin = pinDoc.data()?.pin;
    }

    // 2. Try email
    if (!storedPin && cleanEmail) {
      pinDoc = await db.collection('pendingPins').doc(cleanEmail).get();
      if (pinDoc.exists) {
        storedPin = pinDoc.data()?.pin;
      }
    }

    // 3. Try cleanPhone raw
    if (!storedPin) {
      pinDoc = await db.collection('pendingPins').doc(cleanPhone).get();
      if (pinDoc.exists) {
        storedPin = pinDoc.data()?.pin;
      }
    }

    const trimmedInputCode = verificationCode.toString().trim();
    const isCodeValid = Boolean(storedPin && trimmedInputCode === storedPin.trim());

    if (!isCodeValid) {
      console.warn('DEBUG: Auth failed, invalid code:', trimmedInputCode, 'expected:', storedPin);
      return res.status(400).json({ error: 'Código incorreto. Digite o código de 4 dígitos recebido no seu e-mail.' });
    }
    
    // Code is valid, remove it from pendingPins
    await Promise.all([
      db.collection('pendingPins').doc(phoneDigits).delete().catch(() => {}),
      db.collection('pendingPins').doc(cleanPhone).delete().catch(() => {}),
      cleanEmail ? db.collection('pendingPins').doc(cleanEmail).delete().catch(() => {}) : Promise.resolve(),
    ]);

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
        email: cleanEmail || email?.trim(),
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
      if (cleanEmail) updates.email = cleanEmail;
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

// --- DRIVER AUTH ---
app.post('/api/v1/drivers/auth', async (req, res) => {
  console.log('DEBUG: Received POST /api/v1/drivers/auth');
  try {
    const { phone, verificationCode } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'WhatsApp/Telefone obrigatório' });
    }

    const cleanPhone = phone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '') || cleanPhone;

    // Buscando motorista cadastrado por telefone
    let driverSnap = await db.collection('drivers').where('phone', '==', cleanPhone).get();
    let targetDriver: any = null;
    if (!driverSnap.empty) {
      targetDriver = driverSnap.docs[0].data();
    } else {
      // Fallback por dígitos apenas
      const allDriversSnap = await db.collection('drivers').get();
      for (const doc of allDriversSnap.docs) {
        const d = doc.data();
        const dp = (d.phone || '').replace(/\D/g, '');
        if (dp === phoneDigits) {
          targetDriver = d;
          break;
        }
      }
    }

    if (!targetDriver) {
      return res.status(404).json({ error: 'Nenhum credenciamento de motorista encontrado com este telefone. Por favor, realize o credenciamento completo.' });
    }

    const cleanEmail = (targetDriver.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Este motorista não possui um e-mail válido cadastrado no sistema. Por favor, contate o administrador.' });
    }

    if (!verificationCode) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      
      const pinPayload = {
        pin,
        phone: cleanPhone,
        phoneDigits,
        email: cleanEmail,
        createdAt: new Date().toISOString(),
      };

      // Store PIN in Firestore pendingPins collection (by phone digits)
      await db.collection('pendingPins').doc(`driver-${phoneDigits}`).set(pinPayload);

      let emailSent = false;
      let emailErrorReason = '';
      
      try {
        const senderUser =
          process.env.SMTP_USER ||
          process.env.EMAIL_USER ||
          process.env.GMAIL_USER ||
          'vaicar@alansmsolutions.com';
        await sendSystemMail({
          from: `"VaiCar São Sebastião" <${senderUser}>`,
          to: cleanEmail,
          subject: `Código de Acesso do Motorista VaiCar: ${pin}`,
          text: `Olá! Seu código de acesso para o painel de motorista do VaiCar São Sebastião é: ${pin}.\n\nSe não solicitou este código, por favor desconsidere este e-mail.`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #020617; color: #f8fafc; padding: 24px; border-radius: 16px; max-width: 480px; margin: 0 auto; border: 1px solid #1e293b;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #10b981; font-size: 24px; margin: 0; font-weight: 900; letter-spacing: -0.5px;">VaiCar Motorista</h1>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Transporte Municipal de São Sebastião</p>
              </div>
              <div style="background-color: #0f172a; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #334155;">
                <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 12px 0;">Seu código de acesso do motorista é:</p>
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #10b981; padding: 12px; background: #020617; border-radius: 8px; border: 1px solid #10b981;">
                  ${pin}
                </div>
              </div>
              <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 20px;">
                Este código é de uso exclusivo para login no aplicativo VaiCar como motorista credenciado.
              </p>
            </div>
          `,
        });
        emailSent = true;
      } catch (emailError: any) {
        console.warn('[MAIL] Driver Email sending encountered an issue:', emailError?.message || emailError);
        emailErrorReason = emailError?.message || 'Falha de autenticação ou conexão com o Gmail.';
        emailSent = false;
      }

      return res.json({
        codeSent: true,
        emailSent,
        emailErrorReason,
        message: emailSent
          ? `Código PIN enviado para o e-mail cadastrado do motorista!`
          : `Não foi possível enviar o e-mail de acesso.`,
      });
    }

    // Verify PIN: strictly accepts ONLY the PIN that was generated and sent
    const pinDoc = await db.collection('pendingPins').doc(`driver-${phoneDigits}`).get();
    if (!pinDoc.exists) {
      return res.status(400).json({ error: 'Nenhum PIN pendente ou código expirado. Solicite o código novamente.' });
    }

    const storedPin = pinDoc.data()?.pin;
    const trimmedInputCode = verificationCode.toString().trim();
    if (!storedPin || trimmedInputCode !== storedPin.trim()) {
      return res.status(400).json({ error: 'Código incorreto. Verifique o e-mail recebido.' });
    }

    // PIN is correct, remove it
    await db.collection('pendingPins').doc(`driver-${phoneDigits}`).delete().catch(() => {});

    res.json({ success: true, driver: targetDriver });
  } catch (err: any) {
    console.error('DEBUG: Driver Auth Failed:', err);
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
