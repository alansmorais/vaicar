import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { PassengerDashboard } from './components/PassengerDashboard.tsx';
import { DriverCockpit } from './components/DriverCockpit.tsx';
import { DriverOnboarding } from './components/DriverOnboarding.tsx';
import { DriverSubscription } from './components/DriverSubscription.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { DevDashboard } from './components/DevDashboard.tsx';
import { LegalModal } from './components/LegalModal.tsx';
import {
  Zone,
  Driver,
  Ride,
  SubscriptionPlan,
  RegulatoryRequirement,
  PlatformMetrics,
  Report,
  UserRole,
} from './types.ts';
import {
  fetchMeta,
  fetchDrivers,
  fetchRides,
  fetchReports,
  loadDemoData,
  resetDemoData,
  toggleDemoApproval,
} from './lib/api.ts';

export default function App() {
  // Navigation Role
  const [role, setRole] = useState<UserRole>('PASSENGER');
  const [driverSubView, setDriverSubView] = useState<'COCKPIT' | 'ONBOARDING' | 'SUBSCRIPTION'>('COCKPIT');

  // Application Data Stores
  const [zones, setZones] = useState<Zone[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [plan, setPlan] = useState<SubscriptionPlan>({
    id: 'plan-vaicar-pro',
    name: 'VaiCar Pro',
    priceBrl: 49,
    billingPeriod: 'Mês',
    description: 'Acesso total à tecnologia de transporte legalizado',
    commissionPercent: 0,
    isActive: true,
  });
  const [requirements, setRequirements] = useState<RegulatoryRequirement[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalDrivers: 0,
    approvedDrivers: 0,
    onlineDrivers: 0,
    pendingDrivers: 0,
    suspendedDrivers: 0,
    blockedDrivers: 0,
    totalPassengers: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    cancelledSubscriptions: 0,
    pendingSubscriptions: 0,
    subscriptionPriceBrl: 49,
    monthlyRecurringRevenue: 0,
    totalSubscriptionRevenueMonth: 0,
    totalSubscriptionRevenueYear: 0,
    totalPlatformCosts: 0,
    netEstimatedIncome: 0,
    totalRides: 0,
    completedRides: 0,
    activeRides: 0,
    whatsappContactEvents: 0,
    topZones: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Driver state
  const [currentDriverId, setCurrentDriverId] = useState<string>('drv-demo-joao');

  // Legal Modal
  const [legalModalOpen, setLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<'termos' | 'privacidade' | 'regulacao'>('regulacao');

  // Load Initial Data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [meta, d, r, rep] = await Promise.all([
        fetchMeta().catch(() => null),
        fetchDrivers().catch(() => []),
        fetchRides().catch(() => []),
        fetchReports().catch(() => []),
      ]);

      if (meta) {
        setZones(meta.zones || []);
        setRequirements(meta.requirements || []);
        setPlan(meta.subscriptionPlan || plan);
        setMetrics(meta.metrics || metrics);
      }
      setDrivers(d);
      setRides(r);
      setReports(rep);

      if (d.length > 0) {
        const found = d.find((item) => item.id === currentDriverId);
        if (!found) {
          setCurrentDriverId(d[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error loading initial data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Poll rides and drivers every 2 seconds for live real-time updates
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const [d, r] = await Promise.all([
          fetchDrivers().catch(() => null),
          fetchRides().catch(() => null),
        ]);
        if (!active) return;
        if (d) setDrivers(d);
        if (r) setRides(r);
      } catch (err) {
        console.error('Error in background update poll:', err);
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleOpenLegal = (tab: any) => {
    const normalized: 'termos' | 'privacidade' | 'regulacao' =
      tab === 'termos' || tab === 'TERMS'
        ? 'termos'
        : tab === 'privacidade' || tab === 'PRIVACY'
        ? 'privacidade'
        : 'regulacao';
    setLegalModalTab(normalized);
    setLegalModalOpen(true);
  };

  // Demo actions
  const handleLoadDemo = async (approved: boolean = true) => {
    try {
      setIsLoading(true);
      await loadDemoData(approved);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar DEMO');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetData = async () => {
    try {
      setIsLoading(true);
      await resetDemoData();
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao resetar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDemoApproval = async () => {
    try {
      setIsLoading(true);
      await toggleDemoApproval();
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao alternar aprovação');
    } finally {
      setIsLoading(false);
    }
  };

  const currentDriver = drivers.find((d) => d.id === currentDriverId) || drivers[0];
  const demoDriver = drivers.find((d) => d.id === 'drv-demo-joao');
  const hasDemoDriver = !!demoDriver;
  const demoDriverApproved = demoDriver?.regulatoryStatus === 'APPROVED';

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Universal Top Navigation Header */}
      <Header
        currentRole={role}
        onSelectRole={(r) => {
          setRole(r);
          if (r === 'DRIVER') {
            setDriverSubView('COCKPIT');
          }
        }}
        activeDriverId={currentDriverId}
        onSelectDriverId={(id) => {
          if (id === 'new') {
            setRole('DRIVER');
            setDriverSubView('ONBOARDING');
          } else {
            setCurrentDriverId(id);
          }
        }}
        availableDrivers={drivers.map((d) => ({
          id: d.id,
          name: d.name,
          regulatoryStatus: d.regulatoryStatus,
        }))}
        onOpenLegal={handleOpenLegal}
        onLoadDemo={handleLoadDemo}
        onResetData={handleResetData}
        onToggleDemoApproval={handleToggleDemoApproval}
        hasDemoDriver={hasDemoDriver}
        demoDriverApproved={demoDriverApproved}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-bold tracking-wider uppercase">
                Carregando VaiCar São Sebastião...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 1. PASSENGER VIEW */}
            {role === 'PASSENGER' && (
              <PassengerDashboard
                zones={zones}
                allRides={rides}
                onRefreshRides={async () => {
                  const r = await fetchRides();
                  setRides(r);
                }}
                onGoToDriverSignup={() => {
                  setRole('DRIVER');
                  setDriverSubView('ONBOARDING');
                }}
                onOpenLegal={handleOpenLegal}
              />
            )}

            {/* 2. DRIVER VIEW */}
            {role === 'DRIVER' && (
              <div className="space-y-4">
                {/* Driver Selector Helper for testing */}
                {drivers.length > 0 && (
                  <div className="max-w-5xl mx-auto px-4 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>Simulando motorista:</span>
                      <select
                        value={currentDriverId}
                        onChange={(e) => setCurrentDriverId(e.target.value)}
                        className="bg-slate-900 text-white font-bold px-2 py-1 rounded border border-slate-700 outline-none"
                      >
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.regulatoryStatus === 'APPROVED' ? '🟢 Aprovado' : '🟡 ' + d.regulatoryStatus})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => setDriverSubView('ONBOARDING')}
                      className="text-emerald-400 hover:underline font-bold"
                    >
                      + Novo Credenciamento
                    </button>
                  </div>
                )}

                {driverSubView === 'COCKPIT' && currentDriver && (
                  <DriverCockpit
                    driver={currentDriver}
                    allZones={zones}
                    requirements={requirements}
                    rides={rides}
                    monthlyPlanPrice={plan.priceBrl}
                    onRefreshDriver={(updated) => {
                      setDrivers(drivers.map((d) => (d.id === updated.id ? updated : d)));
                    }}
                    onRefreshRides={async () => {
                      const r = await fetchRides();
                      setRides(r);
                    }}
                    onGoToSubscription={() => setDriverSubView('SUBSCRIPTION')}
                  />
                )}

                {driverSubView === 'COCKPIT' && !currentDriver && (
                  <div className="max-w-lg mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
                    <h3 className="text-xl font-black text-white">Nenhum motorista selecionado</h3>
                    <p className="text-xs text-slate-400">
                      Você pode realizar um novo credenciamento municipal ou carregar o motorista DEMO no cabeçalho.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleLoadDemo(true)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
                      >
                        Carregar Motorista DEMO
                      </button>
                      <button
                        onClick={() => setDriverSubView('ONBOARDING')}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer"
                      >
                        Iniciar Credenciamento
                      </button>
                    </div>
                  </div>
                )}

                {driverSubView === 'ONBOARDING' && (
                  <DriverOnboarding
                    zones={zones}
                    onDriverRegistered={(newDriver) => {
                      setDrivers([newDriver, ...drivers]);
                      setCurrentDriverId(newDriver.id);
                      setDriverSubView('COCKPIT');
                    }}
                    onCancel={() => setDriverSubView('COCKPIT')}
                  />
                )}

                {driverSubView === 'SUBSCRIPTION' && currentDriver && (
                  <DriverSubscription
                    driver={currentDriver}
                    plan={plan}
                    onBackToCockpit={() => setDriverSubView('COCKPIT')}
                    onRefreshDriver={(updated) => {
                      setDrivers(drivers.map((d) => (d.id === updated.id ? updated : d)));
                    }}
                  />
                )}
              </div>
            )}

            {/* 3. ADMIN VIEW */}
            {role === 'ADMIN' && (
              <AdminDashboard
                metrics={metrics}
                drivers={drivers}
                zones={zones}
                plan={plan}
                requirements={requirements}
                reports={reports}
                rides={rides}
                onRefreshAll={loadData}
              />
            )}

            {/* 4. DEV / AUDITOR VIEW */}
            {role === 'DEV' && (
              <DevDashboard
                metrics={metrics}
                drivers={drivers}
                rides={rides}
                plan={plan}
                onLoadDemo={handleLoadDemo}
                onResetData={handleResetData}
                onToggleDemoApproval={handleToggleDemoApproval}
                onRefreshAll={loadData}
              />
            )}
          </>
        )}
      </main>

      {/* Universal Legal & Regulatory Modal */}
      {legalModalOpen && (
        <LegalModal
          isOpen={legalModalOpen}
          onClose={() => setLegalModalOpen(false)}
          initialTab={legalModalTab}
        />
      )}

      {/* Bottom Legal Disclaimer Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 space-y-1 px-4">
        <p className="font-bold text-slate-400">
          VaiCar • Plataforma Tecnológica de Intermediação de Transporte Remunerado Legalizado
        </p>
        <p>
          Operação inicial: <strong>Município de São Sebastião / SP</strong> (Centro, Maresias, Juquehy, Boiçucanga, Cambury e demais bairros).
        </p>
        <p className="text-[11px] text-slate-600">
          O VaiCar não retém comissão sobre as corridas (0% de taxa por viagem). Os motoristas operam com alvará municipal sob plano de assinatura tecnológica.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3 text-[11px] text-slate-400">
          <button onClick={() => handleOpenLegal('termos')} className="hover:text-emerald-400 cursor-pointer">
            Termos de Uso
          </button>
          <span>•</span>
          <button onClick={() => handleOpenLegal('privacidade')} className="hover:text-emerald-400 cursor-pointer">
            Privacidade LGPD
          </button>
          <span>•</span>
          <button onClick={() => handleOpenLegal('regulacao')} className="hover:text-emerald-400 cursor-pointer">
            Regulamento Municipal
          </button>
        </div>
      </footer>
    </div>
  );
}
