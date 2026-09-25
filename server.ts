import 'dotenv/config';
import dns from 'dns';
import fs from 'fs';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { db } from './src/lib/firebaseAdmin.ts';
import admin from 'firebase-admin';

// Initialize firebase-admin for FCM if not already initialized
try {
  if ((admin as any).apps?.length === 0) {
    (admin as any).initializeApp?.();
  }
} catch (err) {
  console.error('[FCM Admin Init] Error initializing firebase-admin:', err);
}

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
  RideReceipt,
} from './src/types.ts';
import { generateRideReceiptPdf } from './src/lib/receiptGenerator.ts';

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
      const webhookBody: any = {
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
      };
      if (Array.isArray(mailOptions.attachments) && mailOptions.attachments.length > 0) {
        webhookBody.attachments = mailOptions.attachments.map((att: any) => ({
          filename: att.filename,
          contentType: att.contentType || 'application/pdf',
          contentBase64: Buffer.isBuffer(att.content) ? att.content.toString('base64') : (typeof att.content === 'string' ? att.content : ''),
        }));
      }

      console.log('[MAIL] Sending via Google Apps Script Webhook:', appsScriptUrl);
      const webhookRes = await fetch(appsScriptUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(webhookBody),
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
  | 'PASSENGER_DELETED'
  | 'PASSENGER_UPDATED'
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
    id: 'req-cnh-frente',
    municipalityId: 'mun-ss',
    name: "CNH - Frente (Carteira Nacional de Habilitação)",
    code: 'CNH_FRENTE',
    description: 'Foto nítida da frente da CNH aberta ou em formato digital oficial com EAR.',
    isMandatory: true,
    requiresExpiryDate: true,
  },
  {
    id: 'req-cnh-verso',
    municipalityId: 'mun-ss',
    name: "CNH - Verso (Carteira Nacional de Habilitação)",
    code: 'CNH_VERSO',
    description: 'Foto nítida do verso da CNH contendo as observações e QR code.',
    isMandatory: true,
    requiresExpiryDate: true,
  },
  {
    id: 'req-crlv',
    municipalityId: 'mun-ss',
    name: 'Certificado de Registro e Licenciamento do Veículo (CRLV)',
    code: 'CRLV_VEICULO',
    description: 'Documento CRLV do veículo cadastrado atualizado e quitado.',
    isMandatory: true,
    requiresExpiryDate: true,
  },
  {
    id: 'req-seguro-app',
    municipalityId: 'mun-ss',
    name: 'Apólice de Seguro de Acidentes Pessoais a Passageiros (APP)',
    code: 'SEGURO_APP',
    description: 'Comprovante vigente de apólice de seguro APP com cobertura aos passageiros transportados.',
    isMandatory: true,
    requiresExpiryDate: true,
  },
  {
    id: 'req-selfie-cnh',
    municipalityId: 'mun-ss',
    name: 'Selfie do Motorista Segurando a CNH',
    code: 'SELFIE_CNH',
    description: 'Foto do rosto do condutor segurando o documento de habilitação legível ao lado do rosto para validação biométrica.',
    isMandatory: true,
    requiresExpiryDate: false,
  },
  {
    id: 'req-alvara',
    municipalityId: 'mun-ss',
    name: 'Alvará Municipal de Transporte Remunerado / Vistoria',
    code: 'ALVARA_TRANSPORTE',
    description: 'Inscrição municipal regular ou laudo de vistoria mecânica de São Sebastião.',
    isMandatory: false,
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

  for (const req of defaultRequirements) {
    const docRef = db.collection('requirements').doc(req.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      await docRef.set(req);
    }
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

  const fixedRoutes = driver.pricing?.fixedRoutes || [];
  const fixedRoute = fixedRoutes.find(
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
    ? Math.max(driver.pricing?.minimumFare || 20.0, fareSettings.minBaseFare)
    : (driver.pricing?.minimumFare || 20.0);
  const rateKm = fareSettings.isEnforced
    ? Math.max(driver.pricing?.ratePerKm || 3.5, fareSettings.minRatePerKm)
    : (driver.pricing?.ratePerKm || 3.5);

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
    const originZoneId = req.body.originZoneId || req.body.originId;
    const destinationZoneId = req.body.destinationZoneId || req.body.destId;
    const passengerCount = req.body.passengerCount || 1;
    if (!originZoneId || !destinationZoneId) return res.status(400).json({ error: 'Origem e destino são obrigatórios.' });

    const distanceKm = await calculateDistanceKm(originZoneId, destinationZoneId);
    const estimatedDurationMin = Math.max(5, Math.round(distanceKm * 1.4));
    const drivers = await getDrivers();
    const config = await ensureConfig();

    const matchingDrivers = drivers.filter((driver) => {
      const isApproved = driver.regulatoryStatus === 'APPROVED';
      const isSubscribed = driver.subscriptionStatus === 'ACTIVE' || driver.subscriptionStatus === 'TRIAL';
      const coversZone = !driver.operatingZones || 
                         driver.operatingZones.length === 0 || 
                         driver.operatingZones.includes('ALL') || 
                         driver.operatingZones.includes(originZoneId);
      const hasCapacity = (driver.vehicle?.passengerCapacity || 4) >= Number(passengerCount);
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
        pricingType: driver.pricing?.pricingType || 'KM_ONLY',
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
const handleDriverAvailability = async (req: express.Request, res: express.Response) => {
  try {
    const doc = await db.collection('drivers').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Motorista não encontrado' });
    const driver = doc.data() as Driver;

    const { isOnline, operatingZones } = req.body;
    if (isOnline === true && driver.regulatoryStatus !== 'APPROVED') {
      return res.status(403).json({ error: 'Não é possível ficar online sem aprovação do cadastro.' });
    }

    const updates: any = {};
    if (typeof isOnline === 'boolean') updates.isOnline = isOnline;
    if (Array.isArray(operatingZones)) updates.operatingZones = operatingZones;

    await db.collection('drivers').doc(req.params.id).update(updates);
    res.json({ ...driver, ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
};

app.patch('/api/v1/drivers/:id/availability', handleDriverAvailability);
app.put('/api/v1/drivers/:id/availability', handleDriverAvailability);
app.put('/api/v1/drivers/:id/online', handleDriverAvailability);
app.patch('/api/v1/drivers/:id/online', handleDriverAvailability);

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
    delete doc.rejectionReason;

    const updates: any = { documents: driver.documents };
    if (driver.regulatoryStatus !== 'APPROVED') {
      updates.regulatoryStatus = 'IN_REVIEW';
    }

    if (fileUrl) {
      if (requirementId === 'req-cnh-frente' || requirementId.includes('frente')) {
        updates.cnhFrontUrl = fileUrl;
      } else if (requirementId === 'req-cnh-verso' || requirementId.includes('verso')) {
        updates.cnhBackUrl = fileUrl;
      } else if (requirementId === 'req-crlv' || requirementId.includes('crlv')) {
        updates.crlvDocumentUrl = fileUrl;
      } else if (requirementId === 'req-seguro-app' || requirementId.includes('seguro')) {
        updates.insuranceDocumentUrl = fileUrl;
      } else if (requirementId === 'req-selfie-cnh' || requirementId.includes('selfie')) {
        updates.selfieCnhUrl = fileUrl;
      }
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
    const { 
      passengerAvatarUrl, 
      originAddress, 
      originLandmark, 
      originMapsLink, 
      destinationAddress, 
      destinationLandmark, 
      destinationMapsLink, 
      passengerCount = 1, 
      scheduledTime, 
      isImmediate = true, 
      paymentMethod = 'PIX', 
      paymentChangeFor, 
      savedCard 
    } = req.body;

    const passengerName = req.body.passengerName || req.body.name || 'Passageiro';
    const passengerPhone = req.body.passengerPhone || req.body.phone || '+551299999999';
    const driverId = req.body.driverId || req.body.requestedDriverId;
    const originZoneId = req.body.originZoneId || req.body.originId || 'z-centro';
    const destinationZoneId = req.body.destinationZoneId || req.body.destId || 'z-maresias';

    if (!passengerName || !passengerPhone || !driverId) {
      return res.status(400).json({ error: 'Dados incompletos para solicitação de corrida (Nome, telefone e motorista são obrigatórios).' });
    }

    // Verify if passenger is blocked
    const passengerSnap = await db.collection('passengers').where('phone', '==', passengerPhone).get();
    if (!passengerSnap.empty) {
      const pData = passengerSnap.docs[0].data();
      if (pData?.isBlocked) {
        return res.status(403).json({ error: 'Sua conta de passageiro foi bloqueada temporariamente pela moderação.' });
      }
    }

    // Verify if passenger has any unresolved pending payment (PAYMENT_PENDING or PAYMENT_CONTESTED)
    const cleanPhone = passengerPhone.replace(/\D/g, '');
    const completedRidesSnap = await db.collection('rides').where('status', '==', 'COMPLETED').get();
    const pendingUnpaidRide = completedRidesSnap.docs
      .map((d: any) => d.data() as Ride)
      .find((r: any) => {
        const rPhoneClean = (r.passengerPhone || '').replace(/\D/g, '');
        const isSamePassenger =
          (cleanPhone && rPhoneClean && (cleanPhone === rPhoneClean || cleanPhone.endsWith(rPhoneClean) || rPhoneClean.endsWith(cleanPhone))) ||
          r.passengerPhone === passengerPhone;
        const isUnpaid = r.paymentStatus === 'PAYMENT_PENDING' || r.paymentStatus === 'PAYMENT_CONTESTED';
        return isSamePassenger && isUnpaid;
      });

    if (pendingUnpaidRide) {
      const amountDue = pendingUnpaidRide.fareBrl !== undefined ? pendingUnpaidRide.fareBrl : (pendingUnpaidRide.estimatedPrice ?? 0);
      return res.status(403).json({
        error: `Você possui um pagamento pendente de uma corrida anterior (R$ ${amountDue.toFixed(2).replace('.', ',')}). Regularize o pagamento com o motorista ou entre em contato com o suporte para solicitar novas viagens.`,
        code: 'PAYMENT_PENDING',
        pendingRideId: pendingUnpaidRide.id,
        amountDue,
        driverName: pendingUnpaidRide.driverName,
        driverPhone: pendingUnpaidRide.driverPhone,
        paymentStatus: pendingUnpaidRide.paymentStatus,
        createdAt: pendingUnpaidRide.createdAt,
      });
    }

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
    const originAddressResolved = originAddress || req.body.originAddress || originZone?.name || 'Origem';
    const destAddressResolved = destinationAddress || req.body.destAddress || req.body.destinationAddress || destinationZone?.name || 'Destino';
    const cleanOriginForMaps = originAddressResolved.includes('São Sebastião') ? originAddressResolved : `${originAddressResolved}, São Sebastião - SP`;
    const cleanDestForMaps = destAddressResolved.includes('São Sebastião') ? destAddressResolved : `${destAddressResolved}, São Sebastião - SP`;
    const directRouteMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(cleanOriginForMaps)}&destination=${encodeURIComponent(cleanDestForMaps)}&travelmode=driving`;

    const newRide: any = {
      id,
      passengerName,
      passengerPhone,
      passengerAvatarUrl: passengerAvatarUrl || `https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80`,
      driverId: driver.id,
      requestedDriverId: driver.id,
      matchedDriverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      driverVehicle: `${driver.vehicle.brand} ${driver.vehicle.model} - ${driver.vehicle.color}`,
      driverAvatar: driver.avatarUrl,
      originZoneId,
      originAddress: originAddressResolved,
      originLat: req.body.originLat !== undefined && req.body.originLat !== null ? Number(req.body.originLat) : (originZone ? originZone.lat : -23.8078),
      originLng: req.body.originLng !== undefined && req.body.originLng !== null ? Number(req.body.originLng) : (originZone ? originZone.lng : -45.4058),
      originLandmark: originLandmark || '',
      originMapsLink: originMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanOriginForMaps)}`,
      destinationZoneId,
      destinationAddress: destAddressResolved,
      destinationLat: req.body.destinationLat !== undefined && req.body.destinationLat !== null ? Number(req.body.destinationLat) : (destinationZone ? destinationZone.lat : -23.8078),
      destinationLng: req.body.destinationLng !== undefined && req.body.destinationLng !== null ? Number(req.body.destinationLng) : (destinationZone ? destinationZone.lng : -45.4058),
      destinationLandmark: destinationLandmark || '',
      destinationMapsLink: destinationMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanDestForMaps)}`,
      mapsUrl: directRouteMapsUrl,
      passengerCount: Number(passengerCount) || 1,
      scheduledTime: scheduledTime || null,
      isImmediate: Boolean(isImmediate),
      estimatedPrice,
      fareBrl: estimatedPrice,
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
    
    // Send FCM push notification to target driver
    if (newRide.driverId) {
      sendFcmNotification(newRide.driverId, {
        rideId: id,
        passengerName: newRide.passengerName,
        passengerPhone: newRide.passengerPhone,
        originAddress: newRide.originAddress,
        destAddress: newRide.destinationAddress,
        fare: String(newRide.fareBrl || newRide.estimatedPrice),
        notes: newRide.originLandmark || '',
      });
    }

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

function calculateRideWaitingFee(ride: any): { waitingMinutes: number; waitingFee: number; fareBrl: number } {
  let waitingMinutes = ride.waitingMinutes || 0;
  let waitingFee = ride.waitingFee || 0;
  let fareBrl = ride.fareBrl !== undefined ? ride.fareBrl : (ride.estimatedPrice || 0);

  // If the ride is currently in arrival status and arrivedAt is set, calculate the live accrued fee
  if (ride.status === 'DRIVER_ARRIVING' && ride.arrivedAt) {
    const arrivedTime = new Date(ride.arrivedAt).getTime();
    const nowTime = Date.now();
    const elapsedMinutes = Math.max(0, Math.floor((nowTime - arrivedTime) / 60000));
    const chargedMinutes = Math.max(0, elapsedMinutes - 4);
    waitingMinutes = elapsedMinutes;
    waitingFee = Number((chargedMinutes * 0.50).toFixed(2));
    const baseFare = ride.estimatedPrice || 0;
    fareBrl = Number((baseFare + waitingFee).toFixed(2));
  }

  return { waitingMinutes, waitingFee, fareBrl };
}

async function sendFcmNotification(driverId: string, payload: {
  rideId: string;
  passengerName: string;
  passengerPhone: string;
  originAddress: string;
  destAddress: string;
  fare: string;
  notes: string;
}) {
  try {
    const driverDoc = await db.collection('drivers').doc(driverId).get();
    if (!driverDoc.exists) {
      console.log(`[FCM] Driver ${driverId} not found in database.`);
      return;
    }
    const driver = driverDoc.data();
    const token = driver?.fcmToken;
    if (!token) {
      console.log(`[FCM] Driver ${driverId} does not have an FCM token registered.`);
      return;
    }

    console.log(`[FCM] Sending push notification to driver ${driverId} (${driver.name}) at token: ${token}`);

    const message: any = {
      token: token,
      android: {
        priority: 'high',
        ttl: 24 * 60 * 60 * 1000,
      },
      data: {
        rideId: payload.rideId,
        passengerName: payload.passengerName,
        passengerPhone: payload.passengerPhone,
        originAddress: payload.originAddress,
        destAddress: payload.destAddress,
        fare: String(payload.fare),
        notes: payload.notes || '',
      },
    };

    const response = await (admin as any).messaging().send(message);
    console.log('[FCM] Push notification sent successfully. Message ID:', response);
  } catch (err: any) {
    console.error('[FCM Error] Failed to send push notification:', err);
  }
}

// Update Driver FCM Token Endpoint
app.post('/api/v1/drivers/:id/fcm-token', async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ error: 'fcmToken is required' });
    }
    await db.collection('drivers').doc(req.params.id).update({ fcmToken });
    res.json({ success: true, fcmToken });
  } catch (err: any) {
    res.status(500).json({ error: 'Update FCM Token failed: ' + err.message });
  }
});

// Get All Rides
app.get('/api/v1/rides', async (req, res) => {
  const driverId = req.query.driverId as string | undefined;
  let query: any = db.collection('rides');
  if (driverId) query = query.where('driverId', '==', driverId);
  const snap = await query.get();
  const all = snap.docs.map((doc: any) => {
    const data = doc.data();
    const waitCalc = calculateRideWaitingFee(data);
    return {
      ...data,
      driverId: data.driverId || data.requestedDriverId || data.matchedDriverId,
      requestedDriverId: data.requestedDriverId || data.driverId,
      matchedDriverId: data.matchedDriverId || data.driverId,
      waitingMinutes: waitCalc.waitingMinutes,
      waitingFee: waitCalc.waitingFee,
      fareBrl: waitCalc.fareBrl,
      estimatedPrice: waitCalc.fareBrl,
    };
  });
  all.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  res.json(all);
});

// Get Ride Details
app.get('/api/v1/rides/:id', async (req, res) => {
  const doc = await db.collection('rides').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Corrida não encontrada' });
  const data = doc.data();
  const waitCalc = calculateRideWaitingFee(data);
  res.json({
    ...data,
    waitingMinutes: waitCalc.waitingMinutes,
    waitingFee: waitCalc.waitingFee,
    fareBrl: waitCalc.fareBrl,
    estimatedPrice: waitCalc.fareBrl,
  });
});

// Helper to generate and store authoritative PDF ride receipt and dispatch email
async function processCompletedRideReceipt(
  ride: any,
  isManualResend: boolean = false,
  overrideEmail?: string
): Promise<{ receipt: RideReceipt; pdfBuffer: Buffer; alreadyExisted: boolean }> {
  const receiptId = `rec-${ride.id}`;
  const receiptDocRef = db.collection('receipts').doc(receiptId);
  const existingReceiptDoc = await receiptDocRef.get();

  if (existingReceiptDoc.exists && !isManualResend && !overrideEmail) {
    const existingData = existingReceiptDoc.data() as RideReceipt;
    let existingBuffer: Buffer;
    if (existingData.pdfBase64) {
      existingBuffer = Buffer.from(existingData.pdfBase64, 'base64');
    } else {
      existingBuffer = await generateRideReceiptPdf(existingData);
      await receiptDocRef.update({ pdfBase64: existingBuffer.toString('base64') }).catch(() => {});
    }
    return { receipt: existingData, pdfBuffer: existingBuffer, alreadyExisted: true };
  }

  const waitCalc = calculateRideWaitingFee(ride);
  const fare = Number((ride.fareBrl !== undefined ? ride.fareBrl : (ride.estimatedPrice ?? 0)).toFixed(2));
  const waitingMinutes = waitCalc.waitingMinutes || 0;
  const waitingFee = waitCalc.waitingFee || 0;
  const baseFare = Number(Math.max(0, fare - waitingFee).toFixed(2));
  const finalTotal = fare;

  // Resolve passenger email
  let passengerEmail = (overrideEmail || ride.passengerEmail || '').trim().toLowerCase();
  if (!passengerEmail && ride.passengerPhone) {
    try {
      const pSnap = await db.collection('passengers').where('phone', '==', ride.passengerPhone.trim()).get();
      if (!pSnap.empty) {
        passengerEmail = (pSnap.docs[0].data()?.email || '').trim().toLowerCase();
      }
    } catch (e) {
      console.warn('[RECEIPT] Error looking up passenger email:', e);
    }
  }

  // Resolve zones names
  const zones = await getZones();
  const originZone = zones.find((z) => z.id === ride.originZoneId);
  const destZone = zones.find((z) => z.id === ride.destinationZoneId);

  // Driver details
  let driverLicensePlate = ride.driverLicensePlate || '';
  if (!driverLicensePlate && ride.driverId) {
    try {
      const dDoc = await db.collection('drivers').doc(ride.driverId).get();
      if (dDoc.exists) {
        const dData = dDoc.data() as Driver;
        driverLicensePlate = dData.vehicle?.licensePlate || '';
      }
    } catch (e) {}
  }

  const receiptCode = `RCP-${ride.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
  const completedAt = ride.completedAt || new Date().toISOString();
  const startedAt = ride.timeline?.find((t: any) => t.status === 'IN_PROGRESS')?.timestamp || ride.createdAt || completedAt;

  const receiptData: RideReceipt = {
    id: receiptId,
    receiptCode,
    rideId: ride.id,
    passengerName: ride.passengerName || 'Passageiro(a)',
    passengerPhone: ride.passengerPhone || '',
    passengerEmail: passengerEmail || undefined,
    driverName: ride.driverName || 'Motorista Parceiro(a)',
    driverPhone: ride.driverPhone || '',
    driverVehicle: ride.driverVehicle || 'Veículo Cadastrado',
    driverLicensePlate: driverLicensePlate || undefined,
    originAddress: ride.originAddress || originZone?.name || 'Origem',
    originZoneName: originZone?.name,
    destinationAddress: ride.destinationAddress || destZone?.name || 'Destino',
    destinationZoneName: destZone?.name,
    tripStartTime: startedAt,
    tripEndTime: completedAt,
    durationMinutes: ride.estimatedDurationMin || 15,
    distanceKm: ride.estimatedDistanceKm || 5.0,
    baseFare: baseFare > 0 ? baseFare : fare,
    dynamicMultiplier: ride.dynamicMultiplier || 1.0,
    waitingMinutes,
    waitingFee,
    finalTotal,
    paymentMethod: ride.paymentMethod || 'PIX',
    paymentStatus: ride.paymentStatus || 'CONFIRMED_BY_DRIVER',
    createdAt: completedAt,
  };

  const pdfBuffer = await generateRideReceiptPdf(receiptData);
  receiptData.pdfBase64 = pdfBuffer.toString('base64');

  if (passengerEmail) {
    try {
      const senderUser =
        process.env.SMTP_USER ||
        process.env.EMAIL_USER ||
        process.env.GMAIL_USER ||
        'vaicar@alansmsolutions.com';
      await sendSystemMail({
        from: `"VaiCar São Sebastião" <${senderUser}>`,
        to: passengerEmail,
        subject: `🧾 Comprovante da Corrida #${receiptCode} - VaiCar São Sebastião`,
        text: `Olá ${receiptData.passengerName}!\n\nSegue em anexo o Comprovante da sua Corrida realizada com o VaiCar em São Sebastião.\n\nCódigo do Comprovante: ${receiptCode}\nTotal: R$ ${finalTotal.toFixed(2).replace('.', ',')}\nOrigem: ${receiptData.originAddress}\nDestino: ${receiptData.destinationAddress}\n\nObrigado por utilizar o VaiCar!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #020617; color: #f8fafc; padding: 28px; border-radius: 16px; max-width: 540px; margin: 0 auto; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #10b981; font-size: 26px; margin: 0; font-weight: 900; letter-spacing: -0.5px;">VaiCar</h1>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Transporte Municipal de São Sebastião • Comprovante de Viagem</p>
            </div>
            <div style="background-color: #0f172a; padding: 20px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px;">
              <div style="margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
                <span style="color: #94a3b8; font-size: 13px;">Comprovante: </span>
                <strong style="color: #10b981; font-size: 14px;">#${receiptCode}</strong>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="color: #94a3b8; font-size: 12px;">Passageiro(a): </span>
                <strong style="color: #f1f5f9; font-size: 13px;">${receiptData.passengerName}</strong>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="color: #94a3b8; font-size: 12px;">Motorista: </span>
                <strong style="color: #f1f5f9; font-size: 13px;">${receiptData.driverName}</strong>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="color: #94a3b8; font-size: 12px;">Origem: </span>
                <span style="color: #cbd5e1; font-size: 12px;">${receiptData.originAddress}</span>
              </div>
              <div style="margin-bottom: 12px;">
                <span style="color: #94a3b8; font-size: 12px;">Destino: </span>
                <span style="color: #cbd5e1; font-size: 12px;">${receiptData.destinationAddress}</span>
              </div>
              <div style="background-color: #022c22; padding: 14px; border-radius: 8px; text-align: center; border: 1px solid #059669;">
                <span style="color: #a7f3d0; font-size: 12px; font-weight: 600; text-transform: uppercase;">Valor Total da Corrida</span>
                <div style="font-size: 28px; font-weight: 900; color: #34d399; margin-top: 4px;">
                  R$ ${finalTotal.toFixed(2).replace('.', ',')}
                </div>
              </div>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              O arquivo em formato PDF com o comprovante detalhado está anexado a este e-mail.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `comprovante-corrida-${receiptCode}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      receiptData.emailDispatchedAt = new Date().toISOString();
      receiptData.emailRecipient = passengerEmail;
      console.log(`[RECEIPT] PDF receipt dispatched to ${passengerEmail}`);
    } catch (mailErr: any) {
      console.warn('[RECEIPT] Email dispatch failed:', mailErr?.message || mailErr);
    }
  }

  await receiptDocRef.set(receiptData);
  await db.collection('rides').doc(ride.id).update({
    receiptId: receiptId,
    receiptGeneratedAt: completedAt,
  }).catch(() => {});

  return { receipt: receiptData, pdfBuffer, alreadyExisted: false };
}

// Update Ride Status (State Machine with Race Condition Prevention)
const handleRideStatusUpdate = async (req: express.Request, res: express.Response) => {
  try {
    const docRef = db.collection('rides').doc(req.params.id);
    const rideDoc = await docRef.get();
    if (!rideDoc.exists) return res.status(404).json({ error: 'Corrida não encontrada' });
    const ride = rideDoc.data() as Ride;

    const { status, cancellationReason, driverId } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status obrigatório' });
    }

    const validTransitions: Record<string, string[]> = {
      REQUESTED: ['ACCEPTED', 'QUEUED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'CANCELLED', 'REJECTED'],
      ACCEPTED: ['QUEUED', 'DRIVER_ARRIVING', 'PASSENGER_PICKED_UP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'CANCELLED'],
      QUEUED: ['ACCEPTED', 'DRIVER_ARRIVING', 'PASSENGER_PICKED_UP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'CANCELLED', 'REJECTED'],
      DRIVER_ARRIVING: ['PASSENGER_PICKED_UP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'CANCELLED'],
      PASSENGER_PICKED_UP: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      CANCELLED_BY_PASSENGER: [],
      CANCELLED_BY_DRIVER: [],
      REJECTED: [],
    };

    // Race condition checks for ACCEPTED & QUEUED
    if (status === 'ACCEPTED' || status === 'QUEUED') {
      if (ride.status === 'ACCEPTED' || ride.status === 'QUEUED' || ride.status === 'DRIVER_ARRIVING' || ride.status === 'IN_PROGRESS' || ride.status === 'COMPLETED') {
        if (driverId && ride.driverId && ride.driverId !== driverId) {
          return res.status(409).json({
            error: 'Esta corrida já foi aceita por outro motorista.',
            code: 'RIDE_ALREADY_ACCEPTED'
          });
        }
      }
      if (ride.status.startsWith('CANCELLED') || ride.status === 'REJECTED') {
        return res.status(409).json({
          error: 'Esta corrida foi cancelada e não está mais disponível.',
          code: 'RIDE_CANCELLED'
        });
      }
    }

    const allowed = validTransitions[ride.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        error: `Transição inválida de ${ride.status} para ${status}`,
        currentStatus: ride.status,
        requestedStatus: status
      });
    }

    const labels: Record<string, string> = {
      ACCEPTED: 'Motorista aceitou a corrida',
      QUEUED: 'Corrida agendada como próxima viagem do motorista (Em fila)',
      DRIVER_ARRIVING: 'Motorista a caminho',
      PASSENGER_PICKED_UP: 'Passageiro a bordo',
      IN_PROGRESS: 'Em andamento',
      COMPLETED: 'Finalizada',
      CANCELLED: 'Cancelada',
      CANCELLED_BY_PASSENGER: 'Cancelado pelo passageiro',
      CANCELLED_BY_DRIVER: 'Recusado pelo motorista',
      REJECTED: 'Recusada pelo motorista',
    };

    const updates: any = {
      status,
      updatedAt: new Date().toISOString(),
      timeline: [...(ride.timeline || []), {
        status,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        label: labels[status] || status,
      }]
    };

    if (status === 'DRIVER_ARRIVING') {
      updates.arrivedAt = new Date().toISOString();
      updates.waitFreeMinutes = 4;
      updates.waitPricePerMinute = 0.50;
    }

    if (ride.status === 'DRIVER_ARRIVING' && status !== 'DRIVER_ARRIVING') {
      const finalCalc = calculateRideWaitingFee(ride);
      updates.waitingMinutes = finalCalc.waitingMinutes;
      updates.waitingFee = finalCalc.waitingFee;
      updates.fareBrl = finalCalc.fareBrl;
    }

    if (driverId) {
      updates.driverId = driverId;
      updates.requestedDriverId = driverId;
      updates.matchedDriverId = driverId;
      const drvDoc = await db.collection('drivers').doc(driverId).get();
      if (drvDoc.exists) {
        const d = drvDoc.data() as Driver;
        updates.driverName = d.name;
        updates.driverPhone = d.phone;
        updates.driverVehicle = `${d.vehicle?.brand || ''} ${d.vehicle?.model || ''} - ${d.vehicle?.color || ''}`.trim();
        updates.driverAvatar = d.avatarUrl;
      }
    }

    if (status === 'COMPLETED') {
      updates.completedAt = new Date().toISOString();
      const targetDriverId = updates.driverId || ride.driverId;
      if (targetDriverId) {
        const drvRef = db.collection('drivers').doc(targetDriverId);
        const drvDoc = await drvRef.get();
        if (drvDoc.exists) {
          const d = drvDoc.data() as Driver;
          await drvRef.update({ ridesCompleted: (d.ridesCompleted || 0) + 1 });
        }
      }

      // Calculate final authoritative ride total (including waiting fees)
      const waitCalc = calculateRideWaitingFee({ ...ride, ...updates });
      const finalTotal = Number((waitCalc.fareBrl !== undefined ? waitCalc.fareBrl : (ride.fareBrl || ride.estimatedPrice || 0)).toFixed(2));
      updates.fareBrl = finalTotal;
      updates.estimatedPrice = finalTotal;

      // Handle driver payment confirmation
      const isPaymentNotReceived =
        req.body.paymentReceived === false ||
        req.body.paymentStatus === 'PAYMENT_PENDING' ||
        req.body.paymentReceived === 'false';

      if (isPaymentNotReceived) {
        updates.paymentStatus = 'PAYMENT_PENDING';
        updates.amountDue = finalTotal;
        updates.paymentPendingReason =
          req.body.paymentPendingReason || req.body.reason || 'Pagamento não recebido pelo motorista ao término da viagem';
        updates.unpaidReportedAt = new Date().toISOString();
        updates.unpaidReportedBy = targetDriverId || ride.driverId;
      } else {
        updates.paymentStatus = 'PAID';
        if (req.body.paymentMethod) {
          updates.paymentMethod = req.body.paymentMethod;
        }
        updates.paidAt = new Date().toISOString();
        updates.paymentResolvedBy = 'DRIVER';
      }
    }
    if (cancellationReason) updates.cancellationReason = cancellationReason;

    await docRef.update(updates);
    const updatedRide = {
      ...ride,
      ...updates,
      fareBrl: ride.fareBrl !== undefined ? ride.fareBrl : (ride.estimatedPrice ?? 0),
      driverId: updates.driverId || ride.driverId,
      requestedDriverId: updates.requestedDriverId || ride.requestedDriverId || ride.driverId,
      matchedDriverId: updates.matchedDriverId || ride.matchedDriverId || ride.driverId,
    };

    // Automatic Ride Receipt (Comprovante da Corrida) generation on COMPLETED status
    if (status === 'COMPLETED') {
      try {
        const receiptResult = await processCompletedRideReceipt(updatedRide);
        updatedRide.receiptId = receiptResult.receipt.id;
        updatedRide.receiptGeneratedAt = receiptResult.receipt.createdAt;
      } catch (receiptErr: any) {
        console.error('[RECEIPT] Error generating receipt for completed ride:', receiptErr);
      }

      // Automatic Sequential Ride promotion: if driver has a queued ride, promote it to active (DRIVER_ARRIVING)
      const activeDriverId = updates.driverId || ride.driverId;
      if (activeDriverId) {
        try {
          const queuedSnap = await db.collection('rides')
            .where('driverId', '==', activeDriverId)
            .where('status', '==', 'QUEUED')
            .get();

          if (!queuedSnap.empty) {
            const queuedDocs = queuedSnap.docs.map((d: any) => ({ ...d.data() as Ride, id: d.id }));
            queuedDocs.sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
            const nextRideToActivate = queuedDocs[0];

            const nextRideRef = db.collection('rides').doc(nextRideToActivate.id);
            const nextUpdates: any = {
              status: 'DRIVER_ARRIVING',
              updatedAt: new Date().toISOString(),
              arrivedAt: new Date().toISOString(),
              timeline: [
                ...(nextRideToActivate.timeline || []),
                {
                  status: 'DRIVER_ARRIVING',
                  timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                  label: 'O motorista finalizou a corrida anterior e agora está a caminho da sua localização!'
                }
              ]
            };
            await nextRideRef.update(nextUpdates);
            const updatedNextRide = { ...nextRideToActivate, ...nextUpdates };
            broadcastLiveEvent('RIDE_UPDATED', updatedNextRide);
            sendFcmNotification(activeDriverId, {
              rideId: nextRideToActivate.id,
              passengerName: nextRideToActivate.passengerName,
              passengerPhone: nextRideToActivate.passengerPhone,
              originAddress: nextRideToActivate.originAddress,
              destAddress: nextRideToActivate.destinationAddress,
              fare: String(nextRideToActivate.fareBrl || nextRideToActivate.estimatedPrice),
              notes: 'Sua próxima corrida em fila começou! Dirija-se até o passageiro.',
            });
            console.log(`[SEQUENTIAL RIDE] Promoted queued ride ${nextRideToActivate.id} to DRIVER_ARRIVING for driver ${activeDriverId}`);
          }
        } catch (seqErr) {
          console.error('[SEQUENTIAL RIDE] Error promoting next queued ride:', seqErr);
        }
      }
    }

    broadcastLiveEvent('RIDE_UPDATED', updatedRide);
    res.json(updatedRide);
  } catch (err: any) {
    console.error('Error in /api/v1/rides/:id/status:', err);
    res.status(500).json({ error: 'Update status failed', details: err?.message || String(err) });
  }
};

app.patch('/api/v1/rides/:id/status', handleRideStatusUpdate);
app.put('/api/v1/rides/:id/status', handleRideStatusUpdate);
app.post('/api/v1/rides/:id/status', handleRideStatusUpdate);

// --- PAYMENT RESOLUTION & UNPAID RIDE ENDPOINTS ---

// Get Unpaid Rides (all or filtered by passenger phone)
app.get('/api/v1/rides/unpaid', async (req, res) => {
  try {
    const passengerPhone = req.query.passengerPhone as string | undefined;
    const snap = await db.collection('rides').where('status', '==', 'COMPLETED').get();
    let unpaid = snap.docs
      .map((doc: any) => doc.data() as Ride)
      .filter((r: any) => r.paymentStatus === 'PAYMENT_PENDING' || r.paymentStatus === 'PAYMENT_CONTESTED');

    if (passengerPhone) {
      const cleanTarget = passengerPhone.replace(/\D/g, '');
      unpaid = unpaid.filter((r: any) => {
        const clean = (r.passengerPhone || '').replace(/\D/g, '');
        return clean === cleanTarget || (cleanTarget && clean.endsWith(cleanTarget)) || (clean && cleanTarget.endsWith(clean));
      });
    }

    unpaid.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json(unpaid);
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao buscar corridas pendentes: ' + err.message });
  }
});

// Driver or Admin confirms payment received
app.post('/api/v1/rides/:id/confirm-payment', async (req, res) => {
  try {
    const rideRef = db.collection('rides').doc(req.params.id);
    const rideDoc = await rideRef.get();
    if (!rideDoc.exists) return res.status(404).json({ error: 'Corrida não encontrada' });
    const ride = rideDoc.data() as Ride;

    const { paymentMethod = 'PIX', driverId, notes } = req.body;

    const updates: any = {
      paymentStatus: 'PAID',
      paymentMethod: paymentMethod || ride.paymentMethod || 'PIX',
      paidAt: new Date().toISOString(),
      paymentResolvedBy: driverId ? 'DRIVER' : 'ADMIN',
      paymentResolutionNotes: notes || 'Pagamento confirmado pelo motorista',
      updatedAt: new Date().toISOString(),
    };

    await rideRef.update(updates);
    const updatedRide = { ...ride, ...updates };
    broadcastLiveEvent('RIDE_UPDATED', updatedRide);
    res.json({ success: true, ride: updatedRide });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao confirmar pagamento: ' + err.message });
  }
});

// Passenger contests unpaid payment charge
app.post('/api/v1/rides/:id/contest-payment', async (req, res) => {
  try {
    const rideRef = db.collection('rides').doc(req.params.id);
    const rideDoc = await rideRef.get();
    if (!rideDoc.exists) return res.status(404).json({ error: 'Corrida não encontrada' });
    const ride = rideDoc.data() as Ride;

    const { reason, proofUrl } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Informe a justificativa ou detalhes do pagamento efetuado.' });
    }

    const updates: any = {
      paymentStatus: 'PAYMENT_CONTESTED',
      contestReason: reason.trim(),
      contestProofUrl: proofUrl || null,
      contestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await rideRef.update(updates);
    const updatedRide = { ...ride, ...updates };
    broadcastLiveEvent('RIDE_UPDATED', updatedRide);
    res.json({ success: true, ride: updatedRide });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao contestar pagamento: ' + err.message });
  }
});

// Admin resolves payment dispute (PAID, WAIVED, PAYMENT_PENDING)
app.post('/api/v1/rides/:id/resolve-payment', async (req, res) => {
  try {
    const rideRef = db.collection('rides').doc(req.params.id);
    const rideDoc = await rideRef.get();
    if (!rideDoc.exists) return res.status(404).json({ error: 'Corrida não encontrada' });
    const ride = rideDoc.data() as Ride;

    const { resolution, notes, adminEmail } = req.body;
    if (!['PAID', 'WAIVED', 'PAYMENT_PENDING'].includes(resolution)) {
      return res.status(400).json({ error: 'Resolução inválida. Permitido: PAID, WAIVED ou PAYMENT_PENDING.' });
    }

    const updates: any = {
      paymentStatus: resolution,
      paymentResolutionNotes: notes || '',
      paymentResolvedAt: new Date().toISOString(),
      paymentResolvedBy: `ADMIN (${adminEmail || 'admin'})`,
      updatedAt: new Date().toISOString(),
    };

    if (resolution === 'PAID') {
      updates.paidAt = new Date().toISOString();
    }

    await rideRef.update(updates);
    const updatedRide = { ...ride, ...updates };
    broadcastLiveEvent('RIDE_UPDATED', updatedRide);
    res.json({ success: true, ride: updatedRide });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao resolver pagamento: ' + err.message });
  }
});

// =========================================================================
// REAL-TIME DRIVER LOCATION TRACKING (PASSENGER MAP & GPS INTEGRATION)
// =========================================================================

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Update driver real-time GPS location (called by Driver Android App)
app.post(['/api/v1/drivers/:id/location', '/api/v1/rides/:rideId/driver-location'], async (req, res) => {
  try {
    const driverId = req.params.id || req.body.driverId;
    const rideId = req.params.rideId || req.body.rideId;
    const { lat, lng, heading, speed, accuracy } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Coordenadas de latitude e longitude inválidas.' });
    }

    const timestamp = new Date().toISOString();
    const locationData: any = {
      lat: Number(lat),
      lng: Number(lng),
      heading: typeof heading === 'number' ? heading : 0,
      speed: typeof speed === 'number' ? speed : 0,
      accuracy: typeof accuracy === 'number' ? accuracy : 0,
      updatedAt: timestamp,
      isStale: false,
    };

    // 1. Update driver's last known location in database
    if (driverId) {
      try {
        await db.collection('drivers').doc(driverId).update({
          lastLocation: {
            lat: locationData.lat,
            lng: locationData.lng,
            heading: locationData.heading,
            updatedAt: timestamp,
          },
        });
      } catch (dErr) {
        // Driver doc might not exist yet or update might fail, non-fatal
      }
    }

    // 2. If an active ride is associated, compute real distance and ETA to pickup / destination
    if (rideId) {
      const rideRef = db.collection('rides').doc(rideId);
      const rideDoc = await rideRef.get();
      if (rideDoc.exists) {
        const ride = rideDoc.data() as Ride;

        // Security check: Only update if driver matches the assigned ride
        if (driverId && ride.driverId && ride.driverId !== driverId && ride.requestedDriverId !== driverId) {
          return res.status(403).json({ error: 'Motorista não autorizado para esta corrida.' });
        }

        // Determine target destination based on ride status:
        // Before pickup (ACCEPTED, EN_ROUTE, ARRIVED) -> target is origin pickup
        // During trip (IN_PROGRESS) -> target is destination
        let targetLat = ride.originLat;
        let targetLng = ride.originLng;

        if (ride.status === 'IN_PROGRESS' && ride.destinationLat && ride.destinationLng) {
          targetLat = ride.destinationLat;
          targetLng = ride.destinationLng;
        }

        if (targetLat && targetLng) {
          const distKm = calculateHaversineDistanceKm(locationData.lat, locationData.lng, targetLat, targetLng);
          locationData.distanceKm = distKm;
          // Calculate realistic arrival time in minutes (average urban speed in São Sebastião ~30 km/h = 0.5 km/min)
          locationData.etaMinutes = Math.max(1, Math.round(distKm / 0.5));
        }

        const rideUpdates: any = {
          driverLocation: locationData,
          updatedAt: timestamp,
        };

        // Proximity arrival check: if driver is within 50m of pickup and still in ACCEPTED / DRIVER_ARRIVING
        if (
          ((ride.status as string) === 'ACCEPTED' || (ride.status as string) === 'DRIVER_ARRIVING' || (ride.status as string) === 'EN_ROUTE') &&
          locationData.distanceKm !== undefined &&
          locationData.distanceKm <= 0.05
        ) {
          rideUpdates.driverNearby = true;
        }

        await rideRef.update(rideUpdates);

        const updatedRide = { ...ride, ...rideUpdates };
        // Broadcast location update over real-time SSE stream
        broadcastLiveEvent('RIDE_UPDATED', updatedRide);
      }
    }

    res.json({ success: true, driverLocation: locationData });
  } catch (err: any) {
    console.error('Error in driver location update:', err);
    res.status(500).json({ error: 'Falha ao atualizar localização do motorista: ' + err.message });
  }
});

// Authoritative retrieval of driver's real-time location for an active ride (Passenger Map)
app.get('/api/v1/rides/:id/driver-location', async (req, res) => {
  try {
    const rideId = req.params.id;
    const passengerPhone = req.query.passengerPhone as string | undefined;
    const driverId = req.query.driverId as string | undefined;

    const rideDoc = await db.collection('rides').doc(rideId).get();
    if (!rideDoc.exists) {
      return res.status(404).json({ error: 'Corrida não encontrada.' });
    }

    const ride = rideDoc.data() as Ride;

    // Privacy & Authorization verification:
    // Only the passenger belonging to this ride, the assigned driver, or an admin can access this location
    if (passengerPhone) {
      const cleanReq = passengerPhone.replace(/\D/g, '');
      const cleanRide = (ride.passengerPhone || '').replace(/\D/g, '');
      if (cleanReq && cleanRide && !cleanRide.endsWith(cleanReq) && !cleanReq.endsWith(cleanRide)) {
        return res.status(403).json({ error: 'Acesso não autorizado aos dados de localização desta corrida.' });
      }
    } else if (driverId) {
      if (ride.driverId && ride.driverId !== driverId && ride.requestedDriverId !== driverId) {
        return res.status(403).json({ error: 'Acesso não autorizado aos dados de localização desta corrida.' });
      }
    }

    // Only active rides expose live driver tracking (before acceptance, exact location is private)
    const isActive = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'DRIVER_ARRIVING', 'IN_PROGRESS'].includes(ride.status as string);
    if (!isActive) {
      return res.json({
        rideId: ride.id,
        status: ride.status,
        hasLiveLocation: false,
        message: 'Rastreamento em tempo real disponível apenas para corridas aceitas e ativas.',
      });
    }

    let loc = (ride as any).driverLocation;

    // If ride doesn't have a direct driverLocation yet, look up driver's last known location
    if (!loc && ride.driverId) {
      const drvDoc = await db.collection('drivers').doc(ride.driverId).get();
      if (drvDoc.exists) {
        const drvData = drvDoc.data();
        if (drvData?.lastLocation) {
          loc = {
            lat: drvData.lastLocation.lat,
            lng: drvData.lastLocation.lng,
            heading: drvData.lastLocation.heading || 0,
            updatedAt: drvData.lastLocation.updatedAt || new Date().toISOString(),
          };

          if (ride.originLat && ride.originLng) {
            const dist = calculateHaversineDistanceKm(loc.lat, loc.lng, ride.originLat, ride.originLng);
            loc.distanceKm = dist;
            loc.etaMinutes = Math.max(1, Math.round(dist / 0.5));
          }
        }
      }
    }

    if (!loc) {
      return res.json({
        rideId: ride.id,
        status: ride.status,
        hasLiveLocation: false,
        message: 'Aguardando o primeiro sinal GPS do motorista...',
      });
    }

    // Check for stale location (last update > 45 seconds ago)
    const lastUpdateMs = loc.updatedAt ? new Date(loc.updatedAt).getTime() : 0;
    const isStale = Date.now() - lastUpdateMs > 45000;
    const secondsAgo = Math.max(0, Math.floor((Date.now() - lastUpdateMs) / 1000));

    res.json({
      rideId: ride.id,
      driverId: ride.driverId,
      driverName: ride.driverName,
      driverVehicle: ride.driverVehicle,
      driverLicensePlate: (ride as any).driverLicensePlate,
      status: ride.status,
      arrivedAt: (ride as any).arrivedAt || null,
      hasLiveLocation: true,
      driverLocation: {
        ...loc,
        isStale,
        secondsAgo,
      },
    });
  } catch (err: any) {
    console.error('Error fetching driver location:', err);
    res.status(500).json({ error: 'Falha ao obter localização do motorista: ' + err.message });
  }
});

// --- GOOGLE MAPS PROXY ENDPOINTS (Reverse Geocode & Directions) ---

// Public maps configuration (API key)
app.get('/api/v1/maps/config', (_req, res) => {
  const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAqF4zL02-t-Im_cItTvUj-gPeDs4mmGK4';
  res.json({ apiKey: mapsKey });
});

// Reverse geocoding endpoint for passenger & driver pickup positioning
app.get('/api/v1/maps/reverse-geocode', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Parâmetros lat e lng são obrigatórios.' });
    }

    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (mapsKey) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&key=${mapsKey}`
        );
        if (response.ok) {
          const data: any = await response.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const first = data.results[0];
            const neighborhood = first.address_components?.find((c: any) =>
              c.types.includes('sublocality') || c.types.includes('neighborhood')
            )?.long_name || '';
            return res.json({
              address: first.formatted_address,
              neighborhood,
              placeId: first.place_id
            });
          }
        }
      } catch (apiErr) {
        console.warn('Google Maps reverse geocoding API error:', apiErr);
      }
    }

    // Geographic fallback for São Sebastião based on nearest zone
    const zones = await getZones();
    let closestZone = zones[0];
    let minDistance = Infinity;
    for (const z of zones) {
      const d = Math.hypot(z.lat - lat, z.lng - lng);
      if (d < minDistance) {
        minDistance = d;
        closestZone = z;
      }
    }
    const zoneName = closestZone ? closestZone.name : 'São Sebastião';
    return res.json({
      address: `${zoneName}, São Sebastião - SP`,
      neighborhood: zoneName,
      fallback: true
    });
  } catch (err: any) {
    console.error('Reverse geocode handler error:', err);
    res.status(500).json({ error: 'Erro no serviço de geocodificação' });
  }
});

// Address and Places Search Endpoint
app.get('/api/v1/maps/places-search', async (req, res) => {
  try {
    const rawQuery = (req.query.query as string || '').trim();
    if (!rawQuery) {
      return res.json({ results: [] });
    }

    const cleanQuery = rawQuery.toLowerCase();
    const zones = await getZones();
    const results: Array<{
      title: string;
      subtitle: string;
      lat: number;
      lng: number;
      placeId?: string;
      isZone?: boolean;
    }> = [];

    // 1. Check official São Sebastião zones & beaches matching query
    zones.filter(z => 
      z.name.toLowerCase().includes(cleanQuery) || 
      z.slug.toLowerCase().includes(cleanQuery)
    ).forEach(z => {
      results.push({
        title: z.name,
        subtitle: 'Bairro / Praia de São Sebastião • SP',
        lat: z.lat,
        lng: z.lng,
        isZone: true
      });
    });

    // 2. Query Google Geocoding API if key available
    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (mapsKey) {
      try {
        const fullQuery = (!cleanQuery.includes('são sebastião') && !cleanQuery.includes('sao sebastiao'))
          ? `${rawQuery}, São Sebastião, SP`
          : rawQuery;
        
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullQuery)}&language=pt-BR&key=${mapsKey}`
        );
        if (response.ok) {
          const data: any = await response.json();
          if (data.status === 'OK' && data.results) {
            data.results.slice(0, 6).forEach((r: any) => {
              const rLat = r.geometry?.location?.lat;
              const rLng = r.geometry?.location?.lng;
              if (rLat && rLng && !results.some(existing => Math.abs(existing.lat - rLat) < 0.001 && Math.abs(existing.lng - rLng) < 0.001)) {
                const formatted = r.formatted_address || '';
                const mainName = r.address_components?.[0]?.long_name || formatted.split(',')[0];
                results.push({
                  title: mainName,
                  subtitle: formatted || 'São Sebastião - SP',
                  lat: rLat,
                  lng: rLng,
                  placeId: r.place_id,
                  isZone: false
                });
              }
            });
          }
        }
      } catch (geoErr) {
        console.warn('Geocoding search API error:', geoErr);
      }
    }

    res.json({ results });
  } catch (err: any) {
    console.error('Places search handler error:', err);
    res.status(500).json({ error: 'Erro na busca de locais' });
  }
});

// Directions / Route calculation endpoint
app.get('/api/v1/maps/directions', async (req, res) => {
  try {
    const originLat = parseFloat(req.query.originLat as string);
    const originLng = parseFloat(req.query.originLng as string);
    const destLat = parseFloat(req.query.destLat as string);
    const destLng = parseFloat(req.query.destLng as string);

    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      return res.status(400).json({ error: 'Coordenadas de origem e destino são obrigatórias.' });
    }

    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (mapsKey) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&language=pt-BR&key=${mapsKey}`
        );
        if (response.ok) {
          const data: any = await response.json();
          if (data.status === 'OK' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const leg = route.legs?.[0];
            const distanceKm = leg?.distance?.value ? Number((leg.distance.value / 1000).toFixed(1)) : 5.0;
            const durationMin = leg?.duration?.value ? Math.round(leg.duration.value / 60) : 10;
            const points = route.overview_polyline?.points || '';
            return res.json({
              distanceKm,
              durationMin,
              encodedPolyline: points,
              summary: route.summary || 'SP-055 Rodovia Rio-Santos'
            });
          }
        }
      } catch (routeErr) {
        console.warn('Google Maps directions API error:', routeErr);
      }
    }

    // Fallback: Haversine distance along coastal highway (multiplier ~1.35 for winding coastal roads)
    const directKm = calculateHaversineDistanceKm(originLat, originLng, destLat, destLng);
    const distanceKm = Number((Math.max(1.5, directKm * 1.35)).toFixed(1));
    const durationMin = Math.max(4, Math.round(distanceKm * 1.5));
    return res.json({
      distanceKm,
      durationMin,
      encodedPolyline: '',
      fallback: true
    });
  } catch (err: any) {
    console.error('Directions handler error:', err);
    res.status(500).json({ error: 'Erro no cálculo de rota' });
  }
});

// --- RIDE RECEIPT ENDPOINTS (COMPROVANTE DA CORRIDA) ---

// Get Receipt JSON for a Ride
app.get('/api/v1/rides/:id/receipt', async (req, res) => {
  try {
    const rideId = req.params.id;
    const receiptId = `rec-${rideId}`;
    const rSnap = await db.collection('receipts').doc(receiptId).get();

    if (rSnap.exists) {
      return res.json(rSnap.data());
    }

    // If not found in receipts collection, check if ride exists and is completed
    const rideDoc = await db.collection('rides').doc(rideId).get();
    if (!rideDoc.exists) {
      return res.status(404).json({ error: 'Corrida não encontrada' });
    }

    const ride = rideDoc.data() as Ride;
    if (ride.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Comprovante disponível apenas para corridas finalizadas (COMPLETED)' });
    }

    const receiptResult = await processCompletedRideReceipt(ride);
    res.json(receiptResult.receipt);
  } catch (err: any) {
    console.error('[RECEIPT API ERROR]', err);
    res.status(500).json({ error: 'Falha ao recuperar comprovante: ' + err.message });
  }
});

// Download / View Receipt PDF for a Ride
app.get(['/api/v1/rides/:id/receipt/pdf', '/api/v1/receipts/:id/pdf', '/api/v1/receipts/:id'], async (req, res) => {
  try {
    const rawId = req.params.id;
    const receiptId = rawId.startsWith('rec-') ? rawId : `rec-${rawId}`;
    const rSnap = await db.collection('receipts').doc(receiptId).get();

    let receipt: RideReceipt | null = null;
    let pdfBuffer: Buffer | null = null;

    if (rSnap.exists) {
      receipt = rSnap.data() as RideReceipt;
      if (receipt.pdfBase64) {
        pdfBuffer = Buffer.from(receipt.pdfBase64, 'base64');
      } else {
        pdfBuffer = await generateRideReceiptPdf(receipt);
        await db.collection('receipts').doc(receiptId).update({ pdfBase64: pdfBuffer.toString('base64') }).catch(() => {});
      }
    } else {
      // Check if rawId corresponds to a rideId
      const rideId = rawId.replace(/^rec-/, '');
      const rideDoc = await db.collection('rides').doc(rideId).get();
      if (!rideDoc.exists) {
        return res.status(404).json({ error: 'Comprovante não encontrado' });
      }
      const ride = rideDoc.data() as Ride;
      const result = await processCompletedRideReceipt(ride);
      receipt = result.receipt;
      pdfBuffer = result.pdfBuffer;
    }

    if (!pdfBuffer || !receipt) {
      return res.status(500).json({ error: 'Falha ao renderizar PDF do comprovante' });
    }

    // Check if client expects JSON or PDF binary
    const acceptHeader = req.headers['accept'] || '';
    if (req.path.endsWith('/pdf') || acceptHeader.includes('application/pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="comprovante-vaicar-${receipt.receiptCode}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    }

    res.json(receipt);
  } catch (err: any) {
    console.error('[RECEIPT PDF API ERROR]', err);
    res.status(500).json({ error: 'Erro ao gerar PDF do comprovante: ' + err.message });
  }
});

// Resend Receipt to Email
app.post('/api/v1/rides/:id/resend-receipt', async (req, res) => {
  try {
    const rideId = req.params.id;
    const { email } = req.body;
    const rideDoc = await db.collection('rides').doc(rideId).get();
    if (!rideDoc.exists) {
      return res.status(404).json({ error: 'Corrida não encontrada' });
    }
    const ride = rideDoc.data() as Ride;
    if (ride.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Comprovante só pode ser emitido para corridas finalizadas' });
    }

    const result = await processCompletedRideReceipt(ride, true, email);
    res.json({
      success: true,
      message: `Comprovante ${result.receipt.receiptCode} reenviado com sucesso!`,
      receipt: result.receipt,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao reenviar comprovante: ' + err.message });
  }
});

// List Receipts (Admin / Audit)
app.get('/api/v1/receipts', async (req, res) => {
  try {
    const snap = await db.collection('receipts').get();
    const receipts = snap.docs.map((doc: any) => {
      const data = doc.data();
      // Omit bulky base64 in list view
      const { pdfBase64, ...rest } = data;
      return rest;
    });
    res.json(receipts);
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao listar comprovantes' });
  }
});

// --- DRIVER PROFILE MANAGEMENT ---
app.patch('/api/v1/drivers/:id', async (req, res) => {
  try {
    const driverId = req.params.id;
    const docRef = db.collection('drivers').doc(driverId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Motorista não encontrado' });
    }
    const existing = doc.data() as Driver;

    const {
      name,
      phone,
      email,
      avatarUrl,
      removeAvatar,
      whatsappDirectNumber,
      vehicle,
      operatingZones,
      pixKey,
      pixKeyType,
      acceptsCardMachine,
      acceptedPaymentMethods,
      customZones,
    } = req.body;

    const updates: any = {};

    // Validate email format and prevent duplicates
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          return res.status(400).json({ error: 'Formato de e-mail inválido.' });
        }
        const dupSnap = await db.collection('drivers').where('email', '==', cleanEmail).get();
        const otherDoc = dupSnap.docs.find((d: any) => d.id !== doc.id);
        if (otherDoc) {
          return res.status(409).json({ error: 'Este e-mail já está em uso por outro motorista cadastrado.' });
        }
        updates.email = cleanEmail;
      } else {
        updates.email = '';
      }
    }

    // Validate phone and prevent duplicates
    if (phone !== undefined) {
      const cleanPhone = phone.trim();
      const phoneDigits = cleanPhone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        return res.status(400).json({ error: 'Telefone inválido. Informe o DDD e o número completo.' });
      }
      const dupPhoneSnap = await db.collection('drivers').where('phone', '==', cleanPhone).get();
      const otherDoc = dupPhoneSnap.docs.find((d: any) => d.id !== doc.id);
      if (otherDoc) {
        return res.status(409).json({ error: 'Este número de telefone já está cadastrado para outro motorista.' });
      }
      updates.phone = cleanPhone;
    }

    if (name !== undefined) {
      const cleanName = name.trim();
      if (!cleanName) {
        return res.status(400).json({ error: 'O nome não pode ficar vazio.' });
      }
      updates.name = cleanName;
    }

    if (removeAvatar) {
      updates.avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
    } else if (avatarUrl !== undefined) {
      if (avatarUrl && typeof avatarUrl === 'string') {
        if (avatarUrl.length > 5 * 1024 * 1024) {
          return res.status(400).json({ error: 'A imagem de perfil não pode ultrapassar 5MB.' });
        }
        updates.avatarUrl = avatarUrl;
      }
    }

    if (whatsappDirectNumber !== undefined) updates.whatsappDirectNumber = whatsappDirectNumber.trim();
    if (operatingZones !== undefined && Array.isArray(operatingZones)) updates.operatingZones = operatingZones;
    if (customZones !== undefined && Array.isArray(customZones)) updates.customZones = customZones;
    if (pixKey !== undefined) updates.pixKey = pixKey.trim();
    if (pixKeyType !== undefined) updates.pixKeyType = pixKeyType;
    if (acceptsCardMachine !== undefined) updates.acceptsCardMachine = Boolean(acceptsCardMachine);
    if (Array.isArray(acceptedPaymentMethods)) updates.acceptedPaymentMethods = acceptedPaymentMethods;

    // Guard vehicle information: Plate and verification docs cannot be modified via profile update
    if (vehicle && typeof vehicle === 'object') {
      const currentPlate = (existing.vehicle as any)?.licensePlate || (existing.vehicle as any)?.plate || (vehicle as any).licensePlate || (vehicle as any).plate;
      updates.vehicle = {
        ...existing.vehicle,
        model: vehicle.model ? vehicle.model.trim() : existing.vehicle?.model,
        color: vehicle.color ? vehicle.color.trim() : existing.vehicle?.color,
        year: vehicle.year ? vehicle.year : existing.vehicle?.year,
        // Plate remains protected under verification workflow
        licensePlate: currentPlate,
        plate: currentPlate,
        driverId: existing.id,
        isApproved: existing.vehicle?.isApproved ?? false,
      };
    }

    await docRef.update(updates);
    const updated = { ...existing, ...updates };
    broadcastLiveEvent('DRIVER_UPDATED', updated);
    res.json({ success: true, driver: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao atualizar perfil do motorista: ' + err.message });
  }
});

// --- REAL-TIME MOBILITY MAP AGGREGATE ENDPOINT ---
app.get('/api/v1/mobility/map-data', async (req, res) => {
  try {
    const [zones, drivers, rides, config] = await Promise.all([
      getZones(),
      getDrivers(),
      getRides(),
      ensureConfig(),
    ]);

    const activeZones = zones.filter((z) => z.isActive);

    // Online approved drivers with zone coverage
    const onlineDrivers = drivers
      .filter((d) => d.isOnline && d.regulatoryStatus === 'APPROVED')
      .map((d) => {
        const assignedZone = activeZones.find((z) => d.operatingZones?.includes(z.id)) || activeZones[0];
        return {
          id: d.id,
          name: d.name,
          avatarUrl: d.avatarUrl,
          phone: d.phone,
          vehicle: d.vehicle,
          ratingAverage: d.ratingAverage,
          ratingCount: d.ratingCount,
          operatingZones: d.operatingZones || [],
          currentLat: d.currentLat || assignedZone?.lat || -23.8078,
          currentLng: d.currentLng || assignedZone?.lng || -45.4058,
          zoneName: assignedZone?.name || 'São Sebastião',
        };
      });

    // Active in-flight rides
    const activeRides = rides
      .filter((r) => !['COMPLETED', 'CANCELLED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'EXPIRED', 'REJECTED'].includes(r.status))
      .map((r) => ({
        id: r.id,
        status: r.status,
        passengerName: r.passengerName,
        driverName: r.driverName,
        originAddress: r.originAddress,
        originLat: r.originLat || -23.8078,
        originLng: r.originLng || -45.4058,
        destinationAddress: r.destinationAddress,
        destinationLat: r.destinationLat || -23.8078,
        destinationLng: r.destinationLng || -45.4058,
        fareBrl: r.fareBrl || r.estimatedPrice || 0,
        estimatedDurationMin: r.estimatedDurationMin || 15,
        estimatedDistanceKm: r.estimatedDistanceKm || 5,
        dynamicMultiplier: r.dynamicMultiplier || 1.0,
      }));

    // Demand calculation per zone
    const zoneDemand = await Promise.all(
      activeZones.map(async (zone) => {
        const dynamic = await calculateCurrentDynamicMultiplier(zone.id);
        const onlineCount = drivers.filter(
          (d) => d.isOnline && d.regulatoryStatus === 'APPROVED' && (d.operatingZones.includes(zone.id) || d.operatingZones.includes('ALL'))
        ).length;
        const activeRequestsCount = rides.filter(
          (r) => ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING'].includes(r.status) && r.originZoneId === zone.id
        ).length;

        return {
          zoneId: zone.id,
          zoneName: zone.name,
          lat: zone.lat,
          lng: zone.lng,
          distanceFromCenterKm: zone.distanceFromCenterKm,
          onlineDrivers: onlineCount,
          activeRequests: activeRequestsCount,
          multiplier: dynamic.multiplier,
          isSurgeActive: dynamic.isActive,
          estimatedPickupMin: Math.max(3, Math.round((zone.distanceFromCenterKm || 0) * 0.8) + (onlineCount > 0 ? 3 : 12)),
        };
      })
    );

    res.json({
      zones: activeZones,
      onlineDrivers,
      activeRides,
      zoneDemand,
      dynamicPricingSettings: config.dynamicPricingSettings,
      fareSettings: config.platformFareSettings,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[MOBILITY MAP ERROR]', err);
    res.status(500).json({ error: 'Falha ao gerar dados do mapa: ' + err.message });
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

    // Check if passenger is blocked
    const passengerSnap = await db.collection('passengers').where('phone', '==', cleanPhone).get();
    if (!passengerSnap.empty) {
      const pData = passengerSnap.docs[0].data();
      if (pData?.isBlocked) {
        return res.status(403).json({ error: 'Seu acesso como passageiro foi bloqueado temporária ou permanentemente pela moderação da plataforma.' });
      }
    }

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
    const verificationCode = req.body.verificationCode || req.body.pin || req.body.code;
    const { phone, email } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'WhatsApp/Telefone obrigatório' });
    }

    const cleanPhone = phone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '') || cleanPhone;

    // Buscando motorista cadastrado por telefone
    let driverSnap = await db.collection('drivers').where('phone', '==', cleanPhone).get();
    let targetDriver: any = null;
    let targetDocRef: any = null;
    if (!driverSnap.empty) {
      targetDriver = driverSnap.docs[0].data();
      targetDocRef = driverSnap.docs[0].ref;
    } else {
      // Fallback por dígitos apenas
      const allDriversSnap = await db.collection('drivers').get();
      for (const doc of allDriversSnap.docs) {
        const d = doc.data();
        const dp = (d.phone || '').replace(/\D/g, '');
        if (dp === phoneDigits) {
          targetDriver = d;
          targetDocRef = doc.ref;
          break;
        }
      }
    }

    if (!targetDriver) {
      return res.status(404).json({ error: 'Nenhum credenciamento de motorista encontrado com este telefone. Por favor, realize o credenciamento completo.' });
    }

    let cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      cleanEmail = (targetDriver.email || '').trim().toLowerCase();
    } else if (targetDocRef && (!targetDriver.email || targetDriver.email.endsWith('@vaicar.local') || targetDriver.email !== cleanEmail)) {
      // Update target driver with the specified email
      await targetDocRef.update({ email: cleanEmail }).catch(() => {});
      targetDriver.email = cleanEmail;
    }

    if (!cleanEmail || cleanEmail.endsWith('@vaicar.local')) {
      return res.status(400).json({ error: 'Por favor, informe seu e-mail para receber o código PIN.' });
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

app.patch('/api/v1/admin/passengers/:id/block', async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const id = req.params.id;
    const docRef = db.collection('passengers').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Passageiro não encontrado' });
    }
    await docRef.update({ isBlocked: !!isBlocked });
    res.json({ success: true, isBlocked: !!isBlocked });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao alterar status do passageiro', details: err.message });
  }
});

app.patch('/api/v1/admin/passengers/:id', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const id = req.params.id;
    const docRef = db.collection('passengers').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Passageiro não encontrado' });
    }
    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (phone !== undefined) updates.phone = phone.trim();

    await docRef.update(updates);
    res.json({ success: true, passenger: { ...doc.data(), ...updates } });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao editar passageiro', details: err.message });
  }
});

app.delete('/api/v1/admin/passengers/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'ID do passageiro é obrigatório' });
    }
    
    // Check if passenger exists
    let docRef = db.collection('passengers').doc(id);
    let doc = await docRef.get();
    if (!doc.exists) {
      const snap = await db.collection('passengers').where('phone', '==', id).get();
      if (!snap.empty) {
        doc = snap.docs[0];
        docRef = snap.docs[0].ref;
      } else {
        return res.status(404).json({ error: 'Passageiro não encontrado no banco de dados' });
      }
    }

    const pData = doc.data() || {};
    const passengerName = pData.name || 'Passageiro';
    const passengerPhone = (pData.phone || '').trim();
    const phoneDigits = passengerPhone.replace(/\D/g, '');
    const passengerEmail = (pData.email || '').trim().toLowerCase();

    // Delete ONLY that selected passenger account document
    await docRef.delete();

    // Clean up any pending authentication PINs for this passenger
    const pinDeletions: Promise<any>[] = [];
    if (phoneDigits) pinDeletions.push(db.collection('pendingPins').doc(phoneDigits).delete().catch(() => {}));
    if (passengerPhone && passengerPhone !== phoneDigits) pinDeletions.push(db.collection('pendingPins').doc(passengerPhone).delete().catch(() => {}));
    if (passengerEmail) pinDeletions.push(db.collection('pendingPins').doc(passengerEmail).delete().catch(() => {}));
    await Promise.all(pinDeletions);

    // If Firebase Auth is used, safely delete the auth user record if it exists
    if ((admin as any).apps?.length > 0) {
      try {
        if (pData.firebaseUid) {
          await (admin as any).auth().deleteUser(pData.firebaseUid);
        } else if (passengerEmail) {
          const authUser = await (admin as any).auth().getUserByEmail(passengerEmail).catch(() => null);
          if (authUser?.uid) {
            await (admin as any).auth().deleteUser(authUser.uid);
          }
        }
      } catch (authErr) {
        console.warn('Firebase Auth cleanup notice:', authErr);
      }
    }

    broadcastLiveEvent('PASSENGER_DELETED', { deletedId: id, passengerPhone });

    res.json({
      success: true,
      message: `Passageiro ${passengerName} excluído com sucesso do banco de dados`,
      deletedId: id
    });
  } catch (err: any) {
    console.error('Falha ao excluir passageiro:', err);
    res.status(500).json({ error: 'Falha ao excluir passageiro: ' + err.message });
  }
});

// Passenger Self-Deletion (Account deletion in profile / settings)
app.delete('/api/v1/passengers/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let docRef = db.collection('passengers').doc(id);
    let doc = await docRef.get();
    if (!doc.exists) {
      const snap = await db.collection('passengers').where('phone', '==', id).get();
      if (!snap.empty) {
        doc = snap.docs[0];
        docRef = snap.docs[0].ref;
      } else {
        return res.status(404).json({ error: 'Passageiro não encontrado' });
      }
    }
    const pData = doc.data() || {};
    const passengerPhone = (pData.phone || '').trim();
    const phoneDigits = passengerPhone.replace(/\D/g, '');
    const passengerEmail = (pData.email || '').trim().toLowerCase();

    await docRef.delete();

    const pinDeletions: Promise<any>[] = [];
    if (phoneDigits) pinDeletions.push(db.collection('pendingPins').doc(phoneDigits).delete().catch(() => {}));
    if (passengerPhone && passengerPhone !== phoneDigits) pinDeletions.push(db.collection('pendingPins').doc(passengerPhone).delete().catch(() => {}));
    if (passengerEmail) pinDeletions.push(db.collection('pendingPins').doc(passengerEmail).delete().catch(() => {}));
    await Promise.all(pinDeletions);

    res.json({ success: true, message: 'Conta de passageiro excluída com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao excluir conta: ' + err.message });
  }
});

// Passenger Profile Self-Update
app.patch('/api/v1/passengers/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const { name, email, phone, avatarUrl, removeAvatar } = req.body;

    let docRef = db.collection('passengers').doc(rawId);
    let doc = await docRef.get();
    if (!doc.exists) {
      const snap = await db.collection('passengers').where('phone', '==', rawId).get();
      if (!snap.empty) {
        doc = snap.docs[0];
        docRef = snap.docs[0].ref;
      } else {
        return res.status(404).json({ error: 'Passageiro não encontrado' });
      }
    }

    const currentData = doc.data() as Passenger;
    const updates: any = {};

    // Validate email format and prevent duplicates
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          return res.status(400).json({ error: 'Formato de e-mail inválido.' });
        }
        const dupSnap = await db.collection('passengers').where('email', '==', cleanEmail).get();
        const otherDoc = dupSnap.docs.find((d: any) => d.id !== doc.id);
        if (otherDoc) {
          return res.status(409).json({ error: 'Este e-mail já está associado a outra conta.' });
        }
        updates.email = cleanEmail;
      } else {
        updates.email = '';
      }
    }

    // Validate phone and prevent duplicates
    if (phone !== undefined) {
      const cleanPhone = phone.trim();
      const phoneDigits = cleanPhone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        return res.status(400).json({ error: 'Telefone inválido. Informe o DDD e o número completo.' });
      }
      const dupPhoneSnap = await db.collection('passengers').where('phone', '==', cleanPhone).get();
      const otherDoc = dupPhoneSnap.docs.find((d: any) => d.id !== doc.id);
      if (otherDoc) {
        return res.status(409).json({ error: 'Este telefone já está associado a outra conta.' });
      }
      updates.phone = cleanPhone;
    }

    if (name !== undefined) {
      const cleanName = name.trim();
      if (!cleanName) {
        return res.status(400).json({ error: 'O nome não pode ficar vazio.' });
      }
      updates.name = cleanName;
    }

    if (removeAvatar) {
      updates.avatarUrl = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80';
    } else if (avatarUrl !== undefined) {
      if (avatarUrl && typeof avatarUrl === 'string') {
        if (avatarUrl.length > 5 * 1024 * 1024) {
          return res.status(400).json({ error: 'A foto excede o limite máximo permitido de 5MB.' });
        }
        updates.avatarUrl = avatarUrl;
      }
    }

    await docRef.update(updates);
    const updated = { ...currentData, ...updates };
    res.json({ success: true, passenger: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao atualizar perfil do passageiro: ' + err.message });
  }
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
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'manifest.json'));
});

app.get('/.well-known/assetlinks.json', (req, res) => {
  const assetlinksPath = path.join(process.cwd(), 'public', '.well-known', 'assetlinks.json');
  if (fs.existsSync(assetlinksPath)) {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(assetlinksPath);
  } else {
    res.status(404).json({ error: 'assetlinks.json not found' });
  }
});

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
