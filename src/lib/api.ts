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
  PlatformFareSettings,
} from '../types.ts';

export interface MetaResponse {
  municipality: Municipality;
  zones: Zone[];
  requirements: RegulatoryRequirement[];
  subscriptionPlan: SubscriptionPlan;
  metrics: PlatformMetrics;
  fareSettings?: PlatformFareSettings;
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

async function safeFetchJson<T>(
  url: string,
  options?: RequestInit,
  fallbackMsg: string = 'Erro de comunicação',
): Promise<T> {
  const res = await fetch(url, options);
  const text = await res.text();
  
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${fallbackMsg}: serviço temporariamente indisponível ou rota não encontrada`);
  }

  if (!res.ok) {
    throw new Error(data.error || `${fallbackMsg} (${res.status})`);
  }
  return data as T;
}

export async function fetchMeta(): Promise<MetaResponse> {
  return safeFetchJson<MetaResponse>('/api/v1/meta', undefined, 'Falha ao carregar dados do sistema');
}

export async function fetchZones(): Promise<Zone[]> {
  const meta = await fetchMeta();
  return meta.zones;
}

export async function fetchRegulatoryRequirements(): Promise<RegulatoryRequirement[]> {
  const meta = await fetchMeta();
  return meta.requirements;
}

export async function fetchSubscriptionPlan(): Promise<SubscriptionPlan> {
  const meta = await fetchMeta();
  return meta.subscriptionPlan;
}

export async function fetchAdminMetrics(): Promise<PlatformMetrics> {
  try {
    return await safeFetchJson<PlatformMetrics>('/api/v1/admin/metrics', undefined, 'Falha ao buscar métricas');
  } catch {
    const meta = await fetchMeta();
    return meta.metrics;
  }
}

export async function fetchRides(): Promise<Ride[]> {
  return safeFetchJson<Ride[]>('/api/v1/rides', undefined, 'Falha ao buscar corridas');
}

export async function searchDrivers(
  originZoneId: string,
  destinationZoneId: string,
  passengerCount: number = 1,
): Promise<SearchDriversResponse> {
  return safeFetchJson<SearchDriversResponse>('/api/v1/search/drivers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originZoneId, destinationZoneId, passengerCount }),
  }, 'Erro na busca de motoristas');
}

export async function fetchDrivers(status?: string, onlyOnline?: boolean): Promise<Driver[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (onlyOnline) params.append('onlyOnline', 'true');
  return safeFetchJson<Driver[]>(`/api/v1/drivers?${params.toString()}`, undefined, 'Falha ao carregar motoristas');
}

export async function fetchDriverById(id: string): Promise<Driver> {
  return safeFetchJson<Driver>(`/api/v1/drivers/${id}`, undefined, 'Motorista não encontrado');
}

export async function registerDriver(data: any): Promise<Driver> {
  const res = await fetch('/api/v1/drivers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao registrar motorista');
  }
  return res.json();
}

export async function updateDriverAvailability(
  id: string,
  isOnline: boolean,
  operatingZones?: string[],
): Promise<Driver> {
  const res = await fetch(`/api/v1/drivers/${id}/availability`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isOnline, operatingZones }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao atualizar disponibilidade');
  }
  return res.json();
}

export async function updateDriverPricing(id: string, pricing: any): Promise<any> {
  const res = await fetch(`/api/v1/drivers/${id}/pricing`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pricing),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao atualizar preços');
  }
  return res.json();
}

export async function submitDriverDocument(id: string, docData: any): Promise<any> {
  const res = await fetch(`/api/v1/drivers/${id}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(docData),
  });
  if (!res.ok) throw new Error('Falha ao enviar documento');
  return res.json();
}

export async function createRide(rideData: any): Promise<Ride> {
  return safeFetchJson<Ride>('/api/v1/rides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rideData),
  }, 'Falha ao solicitar corrida');
}

export async function fetchRide(id: string): Promise<Ride> {
  const res = await fetch(`/api/v1/rides/${id}`);
  if (!res.ok) throw new Error('Corrida não encontrada');
  return res.json();
}

export async function updateRideStatus(
  id: string,
  status: string,
  cancellationReason?: string,
): Promise<Ride> {
  const res = await fetch(`/api/v1/rides/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, cancellationReason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao atualizar status da corrida');
  }
  return res.json();
}

export async function getWhatsAppContact(id: string): Promise<{
  whatsappUrl: string;
  whatsappDirectNumber: string;
  totalEvents: number;
}> {
  const res = await fetch(`/api/v1/rides/${id}/whatsapp`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Falha ao gerar link do WhatsApp');
  return res.json();
}

export async function submitReview(reviewData: any): Promise<Review> {
  const res = await fetch('/api/v1/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewData),
  });
  if (!res.ok) throw new Error('Falha ao enviar avaliação');
  return res.json();
}

export async function submitReport(reportData: any): Promise<Report> {
  const res = await fetch('/api/v1/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!res.ok) throw new Error('Falha ao enviar denúncia');
  return res.json();
}

export async function fetchReports(): Promise<Report[]> {
  return safeFetchJson<Report[]>('/api/v1/reports', undefined, 'Falha ao buscar denúncias');
}

export async function adminUpdateDriverStatus(id: string, status: string): Promise<Driver> {
  const res = await fetch(`/api/v1/admin/drivers/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Falha ao atualizar status do motorista');
  return res.json();
}

export async function adminVerifyDocument(
  docId: string,
  status: string,
  rejectionReason?: string,
): Promise<any> {
  const res = await fetch(`/api/v1/admin/documents/${docId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, rejectionReason }),
  });
  if (!res.ok) throw new Error('Falha ao verificar documento');
  return res.json();
}

export async function adminUpdateSubscriptionPlan(priceBrl: number, name?: string): Promise<SubscriptionPlan> {
  const res = await fetch('/api/v1/admin/subscription-plan', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceBrl, name }),
  });
  if (!res.ok) throw new Error('Falha ao atualizar valor da assinatura');
  return res.json();
}

export async function adminAddZone(name: string, distanceFromCenterKm: number): Promise<Zone> {
  const res = await fetch('/api/v1/admin/zones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, distanceFromCenterKm }),
  });
  if (!res.ok) throw new Error('Falha ao adicionar zona');
  return res.json();
}

export async function adminUpdateReport(id: string, status: string, resolutionNotes?: string): Promise<Report> {
  const res = await fetch(`/api/v1/admin/reports/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, resolutionNotes }),
  });
  if (!res.ok) throw new Error('Falha ao atualizar denúncia');
  return res.json();
}

export async function updateDriverPaymentSettings(id: string, settings: {
  pixKey?: string;
  pixKeyType?: string;
  acceptsCardMachine?: boolean;
  acceptedPaymentMethods?: string[];
}): Promise<any> {
  const res = await fetch(`/api/v1/drivers/${id}/payment-settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Falha ao atualizar configurações de pagamento');
  return res.json();
}

export async function updateRidePaymentStatus(id: string, paymentStatus: string): Promise<Ride> {
  const res = await fetch(`/api/v1/rides/${id}/payment-status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentStatus }),
  });
  if (!res.ok) throw new Error('Falha ao atualizar status do pagamento');
  return res.json();
}

// --- ADMIN DRIVER ACTIONS (Section 12) ---
export async function adminApproveDriver(id: string): Promise<Driver> {
  const res = await fetch(`/api/v1/admin/drivers/${id}/approve`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao aprovar motorista');
  return data.driver;
}

export async function adminRejectDriver(id: string, reason: string): Promise<Driver> {
  const res = await fetch(`/api/v1/admin/drivers/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao rejeitar motorista');
  return data.driver;
}

export async function adminSuspendDriver(id: string, reason: string): Promise<Driver> {
  const res = await fetch(`/api/v1/admin/drivers/${id}/suspend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao suspender motorista');
  return data.driver;
}

export async function adminBlockDriver(id: string, reason: string): Promise<Driver> {
  const res = await fetch(`/api/v1/admin/drivers/${id}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao bloquear motorista');
  return data.driver;
}

export async function adminRequestDriverDoc(id: string, requirementName: string, message: string): Promise<Driver> {
  const res = await fetch(`/api/v1/admin/drivers/${id}/request-doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requirementName, message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao solicitar documento');
  return data.driver;
}

export async function adminMarkSubscriptionPaid(id: string): Promise<Driver> {
  const res = await fetch(`/api/v1/admin/drivers/${id}/subscription/mark-paid`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao marcar assinatura como paga');
  return data.driver;
}

// --- PLATFORM COSTS (Section 15) ---
export async function fetchPlatformCosts(): Promise<any[]> {
  const res = await fetch('/api/v1/admin/costs');
  if (!res.ok) return [];
  return res.json();
}

export async function addPlatformCost(cost: { category: string; description: string; amountBrl: number }): Promise<any> {
  const res = await fetch('/api/v1/admin/costs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cost),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao registrar custo');
  return data;
}

export async function deletePlatformCost(id: string): Promise<void> {
  await fetch(`/api/v1/admin/costs/${id}`, { method: 'DELETE' });
}

// --- PLATFORM FARE SETTINGS & REGULATORY FLOORS ---
export async function fetchFareSettings(): Promise<PlatformFareSettings> {
  const res = await fetch('/api/v1/fare-settings');
  if (!res.ok) {
    return {
      minBaseFare: 15.0,
      minRatePerKm: 3.0,
      minFixedRoutePrice: 25.0,
      isEnforced: true,
    };
  }
  return res.json();
}

export async function updateAdminFareSettings(
  settings: Partial<PlatformFareSettings> & { applyToAllDrivers?: boolean },
): Promise<{ fareSettings: PlatformFareSettings; driversAdjusted: number; message: string }> {
  const res = await fetch('/api/v1/admin/fare-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao atualizar parâmetros de piso tarifário');
  return data;
}

// --- PASSENGER AUTH & PROFILE (Section 3) ---
export async function passengerAuth(params: {
  name?: string;
  phone: string;
  email?: string;
  verificationCode?: string;
  avatarUrl?: string;
}): Promise<any> {
  return safeFetchJson<any>('/api/v1/passengers/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }, 'Falha na autenticação');
}

export async function fetchPassenger(id: string): Promise<any> {
  return safeFetchJson<any>(`/api/v1/passengers/${id}`, undefined, 'Passageiro não encontrado');
}

export async function fetchPassengerRides(passengerId: string): Promise<Ride[]> {
  return safeFetchJson<Ride[]>(`/api/v1/passengers/${passengerId}/rides`, undefined, 'Falha ao buscar histórico do passageiro');
}

export async function submitPassengerReview(review: {
  rideId: string;
  passengerId: string;
  driverId: string;
  rating: number;
  comment?: string;
}): Promise<any> {
  const res = await fetch('/api/v1/passenger-reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  });
  if (!res.ok) throw new Error('Falha ao enviar avaliação do passageiro');
  return res.json();
}

export async function fetchPassengerReviews(passengerId?: string, driverId?: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (passengerId) params.append('passengerId', passengerId);
  if (driverId) params.append('driverId', driverId);
  const res = await fetch(`/api/v1/passenger-reviews?${params.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

// --- DYNAMIC PRICING ADMIN FUNCTIONS ---
export async function fetchDynamicPricingSettings(): Promise<any> {
  const res = await fetch('/api/v1/admin/dynamic-pricing');
  if (!res.ok) throw new Error('Falha ao buscar configurações de tarifa dinâmica');
  return res.json();
}

export async function updateDynamicPricingSettings(settings: any): Promise<any> {
  const res = await fetch('/api/v1/admin/dynamic-pricing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Falha ao atualizar configurações de tarifa dinâmica');
  return res.json();
}

export async function fetchSurgeAnalysis(): Promise<any[]> {
  const res = await fetch('/api/v1/admin/surge-analysis');
  if (!res.ok) return [];
  return res.json();
}

// --- ADMIN SMTP / EMAIL SETTINGS ---
export async function fetchSmtpSettings(): Promise<{
  configured: boolean;
  user: string;
  hasPass: boolean;
  appsScriptUrl?: string;
  hasAppsScript?: boolean;
}> {
  const res = await fetch('/api/v1/admin/smtp-settings');
  if (!res.ok) return { configured: false, user: 'vaicar@alansmsolutions.com', hasPass: false };
  return res.json();
}

export async function saveSmtpSettings(settings: {
  user?: string;
  pass?: string;
  appsScriptUrl?: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/v1/admin/smtp-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao salvar configurações de e-mail');
  return data;
}

export async function sendTestEmail(targetEmail?: string): Promise<{ success: boolean; message: string; pin: string }> {
  const res = await fetch('/api/v1/admin/test-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetEmail }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao enviar e-mail de teste');
  return data;
}


