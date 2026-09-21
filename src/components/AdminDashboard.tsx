import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Car,
  DollarSign,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Plus,
  RefreshCw,
  Award,
  Search,
  Lock,
  Eye,
  Trash2,
  Send,
  CreditCard,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  KeyRound,
  Key,
  Scale,
} from 'lucide-react';
import {
  verifyAdminPassword,
  setAdminPassword,
  isAdminPasswordChanged,
} from '../lib/authSecurity.ts';
import {
  Driver,
  Zone,
  PlatformMetrics,
  SubscriptionPlan,
  RegulatoryRequirement,
  Report,
  Ride,
  PlatformCost,
  PlatformFareSettings,
} from '../types.ts';
import {
  adminApproveDriver,
  adminRejectDriver,
  adminSuspendDriver,
  adminBlockDriver,
  adminRequestDriverDoc,
  adminMarkSubscriptionPaid,
  adminVerifyDocument,
  adminUpdateSubscriptionPlan,
  adminAddZone,
  adminUpdateReport,
  fetchPlatformCosts,
  addPlatformCost,
  deletePlatformCost,
  fetchFareSettings,
  updateAdminFareSettings,
} from '../lib/api.ts';

interface AdminDashboardProps {
  metrics: PlatformMetrics;
  drivers: Driver[];
  zones: Zone[];
  plan: SubscriptionPlan;
  requirements: RegulatoryRequirement[];
  reports: Report[];
  rides: Ride[];
  onRefreshAll: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  metrics,
  drivers,
  zones,
  plan,
  requirements,
  reports,
  rides,
  onRefreshAll,
}) => {
  // Login Gate (Section 11)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('vaicar_admin_auth') === 'true';
  });
  const [adminPin, setAdminPin] = useState('');
  const [authError, setAuthError] = useState('');

  // Password change states (Mandatory on first access or on demand)
  const [isMandatoryFirstChange, setIsMandatoryFirstChange] = useState<boolean>(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdChangeError, setPwdChangeError] = useState('');
  const [pwdChangeSuccess, setPwdChangeSuccess] = useState('');

  // Dashboard Tabs
  const [tab, setTab] = useState<'METRICS' | 'DRIVERS' | 'RIDES' | 'FINANCES' | 'FARES' | 'ZONES' | 'REPORTS'>('METRICS');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Driver action modal states
  const [actionModalDriver, setActionModalDriver] = useState<Driver | null>(null);
  const [actionModalType, setActionModalType] = useState<'REJECT' | 'SUSPEND' | 'BLOCK' | 'REQUEST_DOC' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [selectedReqDoc, setSelectedReqDoc] = useState('Alvará de Licença Municipal');

  // Plan & Zones
  const [newPlanPrice, setNewPlanPrice] = useState<number>(plan.priceBrl);
  const [newZoneName, setNewZoneName] = useState<string>('');
  const [newZoneDistance, setNewZoneDistance] = useState<number>(15);

  // Platform Costs State (Section 15)
  const [costs, setCosts] = useState<PlatformCost[]>([]);
  const [costCategory, setCostCategory] = useState('HOSTING');
  const [costDescription, setCostDescription] = useState('');
  const [costAmount, setCostAmount] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Platform Fare Floors State
  const [fareSettings, setFareSettings] = useState<PlatformFareSettings>({
    minBaseFare: 15.0,
    minRatePerKm: 3.0,
    minFixedRoutePrice: 25.0,
    isEnforced: true,
  });
  const [formBaseFare, setFormBaseFare] = useState<number>(15.0);
  const [formRatePerKm, setFormRatePerKm] = useState<number>(3.0);
  const [formFixedRoutePrice, setFormFixedRoutePrice] = useState<number>(25.0);
  const [formIsEnforced, setFormIsEnforced] = useState<boolean>(true);
  const [applyToDrivers, setApplyToDrivers] = useState<boolean>(false);
  const [fareUpdateSuccess, setFareUpdateSuccess] = useState<string>('');
  const [fareUpdateError, setFareUpdateError] = useState<string>('');

  useEffect(() => {
    loadCosts();
    loadFareSettings();
  }, []);

  const loadCosts = async () => {
    try {
      const data = await fetchPlatformCosts();
      setCosts(data);
    } catch {
      // safe fallback
    }
  };

  const loadFareSettings = async () => {
    try {
      const fs = await fetchFareSettings();
      if (fs) {
        setFareSettings(fs);
        setFormBaseFare(fs.minBaseFare);
        setFormRatePerKm(fs.minRatePerKm);
        setFormFixedRoutePrice(fs.minFixedRoutePrice);
        setFormIsEnforced(fs.isEnforced);
      }
    } catch {
      // safe fallback
    }
  };

  const handleSaveFareSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setFareUpdateError('');
    setFareUpdateSuccess('');
    try {
      setIsUpdating(true);
      const res = await updateAdminFareSettings({
        minBaseFare: Number(formBaseFare),
        minRatePerKm: Number(formRatePerKm),
        minFixedRoutePrice: Number(formFixedRoutePrice),
        isEnforced: formIsEnforced,
        applyToAllDrivers: applyToDrivers,
      });
      setFareSettings(res.fareSettings);
      let msg = 'Pisos regulatórios da plataforma atualizados com sucesso!';
      if (res.driversAdjusted > 0) {
        msg += ` (${res.driversAdjusted} motoristas com tarifas abaixo do piso foram ajustados).`;
        onRefreshAll();
      }
      setFareUpdateSuccess(msg);
      setTimeout(() => setFareUpdateSuccess(''), 6000);
    } catch (err: any) {
      setFareUpdateError(err.message || 'Erro ao salvar pisos tarifários');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const res = verifyAdminPassword(adminPin);
    if (!res.success) {
      setAuthError(res.errorMessage || 'Senha administrativa incorreta.');
      return;
    }

    if (res.needsPasswordChange) {
      // First access: force setting a new custom password
      setIsMandatoryFirstChange(true);
      setAuthError('');
      return;
    }

    setIsAuthenticated(true);
    localStorage.setItem('vaicar_admin_auth', 'true');
    setAuthError('');
  };

  const handleSaveNewPassword = (e: React.FormEvent, isFirstTime: boolean) => {
    e.preventDefault();
    setPwdChangeError('');
    setPwdChangeSuccess('');

    if (newPassword.length < 6) {
      setPwdChangeError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdChangeError('A confirmação de senha não confere.');
      return;
    }

    const result = setAdminPassword(newPassword);
    if (!result.success) {
      setPwdChangeError(result.message || 'Erro ao definir senha.');
      return;
    }

    setNewPassword('');
    setConfirmPassword('');

    if (isFirstTime) {
      setIsMandatoryFirstChange(false);
      setIsAuthenticated(true);
      localStorage.setItem('vaicar_admin_auth', 'true');
      alert('✅ Nova senha de Administrador salva com sucesso! Guarde-a em local seguro.');
    } else {
      setPwdChangeSuccess('✅ Senha alterada com sucesso!');
      setTimeout(() => {
        setShowPasswordChangeModal(false);
        setPwdChangeSuccess('');
      }, 1500);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('vaicar_admin_auth');
    setAdminPin('');
    setIsMandatoryFirstChange(false);
  };

  const filteredDrivers = drivers.filter((d) => {
    const matchesStatus = filterStatus === 'ALL' || d.regulatoryStatus === filterStatus;
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Driver Actions Handlers
  const handleApproveDriver = async (driverId: string) => {
    try {
      setIsUpdating(true);
      await adminApproveDriver(driverId);
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao aprovar motorista');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenActionModal = (driver: Driver, type: 'REJECT' | 'SUSPEND' | 'BLOCK' | 'REQUEST_DOC') => {
    setActionModalDriver(driver);
    setActionModalType(type);
    setActionReason('');
  };

  const handleConfirmActionModal = async () => {
    if (!actionModalDriver || !actionModalType) return;
    if (actionModalType !== 'REQUEST_DOC' && !actionReason.trim()) {
      alert('O motivo é obrigatório conforme regulamento municipal.');
      return;
    }

    try {
      setIsUpdating(true);
      if (actionModalType === 'REJECT') {
        await adminRejectDriver(actionModalDriver.id, actionReason);
      } else if (actionModalType === 'SUSPEND') {
        await adminSuspendDriver(actionModalDriver.id, actionReason);
      } else if (actionModalType === 'BLOCK') {
        await adminBlockDriver(actionModalDriver.id, actionReason);
      } else if (actionModalType === 'REQUEST_DOC') {
        await adminRequestDriverDoc(actionModalDriver.id, selectedReqDoc, actionReason || 'Reenvio solicitado');
      }

      setActionModalDriver(null);
      setActionModalType(null);
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao executar ação');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkSubscriptionPaid = async (driverId: string) => {
    try {
      setIsUpdating(true);
      await adminMarkSubscriptionPaid(driverId);
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao marcar assinatura');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerifyDocument = async (docId: string, status: any) => {
    try {
      setIsUpdating(true);
      await adminVerifyDocument(docId, status);
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao verificar documento');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePlanPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      await adminUpdateSubscriptionPlan(Number(newPlanPrice));
      onRefreshAll();
      alert(`Novo valor da assinatura salvo: R$ ${newPlanPrice}/mês!`);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar plano');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;
    try {
      setIsUpdating(true);
      await adminAddZone(newZoneName, Number(newZoneDistance));
      setNewZoneName('');
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar zona');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costDescription.trim() || !costAmount) return;
    try {
      setIsUpdating(true);
      await addPlatformCost({
        category: costCategory,
        description: costDescription,
        amountBrl: Number(costAmount),
      });
      setCostDescription('');
      setCostAmount(0);
      await loadCosts();
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar custo');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCost = async (id: string) => {
    try {
      await deletePlatformCost(id);
      await loadCosts();
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao remover custo');
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: any) => {
    try {
      setIsUpdating(true);
      await adminUpdateReport(reportId, status, 'Tratado pela moderação administrativa');
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar denúncia');
    } finally {
      setIsUpdating(false);
    }
  };

  // Login Gate View
  if (!isAuthenticated) {
    if (isMandatoryFirstChange) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-white">Primeiro Acesso: Troca Obrigatória</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Por segurança da plataforma municipal, cadastre sua <strong>senha pessoal definitiva</strong> de Administrador. O acesso por senhas genéricas ou <span className="text-rose-400">"demo"</span> foi bloqueado.
              </p>
            </div>

            <form onSubmit={(e) => handleSaveNewPassword(e, true)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Nova Senha de Administrador</label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full bg-slate-950 text-white text-sm px-4 py-3 rounded-xl border border-slate-700 outline-none focus:border-amber-500"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Confirmar Nova Senha</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                    className="w-full bg-slate-950 text-white text-sm px-4 py-3 rounded-xl border border-slate-700 outline-none focus:border-amber-500"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                </div>
              </div>

              {pwdChangeError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pwdChangeError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 rounded-xl text-xs transition-all cursor-pointer shadow-lg"
              >
                Definir Senha e Entrar
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMandatoryFirstChange(false);
                  setAdminPin('');
                  setPwdChangeError('');
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-white py-1 cursor-pointer"
              >
                Voltar
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white">Acesso Administrativo</h2>
            <p className="text-xs text-slate-400">
              Gestão restrita de credenciamento municipal, auditoria e finanças do VaiCar.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <Lock className="w-3.5 h-3.5" />
              <span>Autenticação Segura</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Chave inicial de primeiro acesso: <code className="text-emerald-400 font-mono font-bold bg-slate-900 px-1 py-0.5 rounded">admin2025</code>
            </p>
            <p className="text-[10px] text-amber-400/90 font-medium">
              * A troca para sua senha pessoal será exigida na primeira ação.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Senha / PIN de Acesso</label>
              <div className="relative">
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Digite sua senha de administrador"
                  required
                  className="w-full bg-slate-950 text-white font-mono text-sm px-4 py-3 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer shadow-md"
            >
              Acessar Painel
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-500 font-medium">
              Acessos de teste "demo" foram desativados para segurança dos dados municipais.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Finances
  const totalOperationalCosts = costs.reduce((acc, c) => acc + c.amountBrl, 0);
  const netIncome = metrics.monthlyRecurringRevenue - totalOperationalCosts;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Password Change Modal (Inside Dashboard) */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <span>Alterar Senha do Administrador</span>
              </div>
              <button
                onClick={() => {
                  setShowPasswordChangeModal(false);
                  setPwdChangeError('');
                  setPwdChangeSuccess('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Defina uma nova senha para proteger o acesso às aprovações de motoristas e aos relatórios financeiros.
            </p>

            <form onSubmit={(e) => handleSaveNewPassword(e, false)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-amber-500"
                />
              </div>

              {pwdChangeError && (
                <p className="text-xs text-rose-400 font-semibold">{pwdChangeError}</p>
              )}
              {pwdChangeSuccess && (
                <p className="text-xs text-emerald-400 font-semibold">{pwdChangeSuccess}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordChangeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h1 className="text-2xl font-black text-white">Painel Administrativo</h1>
            <span className="text-xs bg-slate-800 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
              São Sebastião • SP
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Auditoria regulatória, aprovação de motoristas e controle financeiro de assinaturas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setShowPasswordChangeModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
            title="Alterar senha do administrador"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Trocar Senha</span>
          </button>
          <button
            onClick={onRefreshAll}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
          <button
            onClick={handleLogout}
            className="bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs scrollbar-none">
        <button
          onClick={() => setTab('METRICS')}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all whitespace-nowrap ${
            tab === 'METRICS' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Métricas & Indicadores
        </button>

        <button
          onClick={() => setTab('DRIVERS')}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all whitespace-nowrap ${
            tab === 'DRIVERS' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Motoristas ({drivers.length})
        </button>

        <button
          onClick={() => setTab('RIDES')}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all whitespace-nowrap ${
            tab === 'RIDES' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Corridas ({rides.length})
        </button>

        <button
          onClick={() => setTab('FINANCES')}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all whitespace-nowrap ${
            tab === 'FINANCES' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Financeiro & Custos
        </button>

        <button
          onClick={() => setTab('FARES')}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
            tab === 'FARES' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Pisos & Tarifas</span>
        </button>

        <button
          onClick={() => setTab('ZONES')}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all whitespace-nowrap ${
            tab === 'ZONES' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Zonas & Bairros ({zones.length})
        </button>

        <button
          onClick={() => setTab('REPORTS')}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all whitespace-nowrap ${
            tab === 'REPORTS' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Denúncias ({reports.filter((r) => r.status === 'OPEN').length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: METRICS */}
      {/* ========================================================================= */}
      {tab === 'METRICS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total de Motoristas</span>
              <div className="text-3xl font-black text-white">{metrics.totalDrivers}</div>
              <span className="text-[10px] text-emerald-400 font-semibold">{metrics.approvedDrivers} aprovados</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Online Agora</span>
              <div className="text-3xl font-black text-emerald-400">{metrics.onlineDrivers}</div>
              <span className="text-[10px] text-slate-400">Atendendo no município</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Receita Mensal (MRR)</span>
              <div className="text-3xl font-black text-white">R$ {metrics.monthlyRecurringRevenue}</div>
              <span className="text-[10px] text-emerald-400 font-semibold">
                {metrics.activeSubscriptions} assinantes x R$ {metrics.subscriptionPriceBrl}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Corridas Realizadas</span>
              <div className="text-3xl font-black text-cyan-400">{metrics.totalRides}</div>
              <span className="text-[10px] text-slate-400">{metrics.completedRides} concluídas com sucesso</span>
            </div>
          </div>

          {/* Granular Driver Statuses */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Status Regulatório dos Motoristas</h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Pendentes</span>
                <span className="text-lg font-black text-amber-400">{metrics.pendingDrivers || 0}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Em Análise</span>
                <span className="text-lg font-black text-amber-300">{metrics.inReviewDrivers || 0}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Aprovados</span>
                <span className="text-lg font-black text-emerald-400">{metrics.approvedDrivers}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Rejeitados</span>
                <span className="text-lg font-black text-rose-400">{metrics.rejectedDrivers || 0}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Suspensos</span>
                <span className="text-lg font-black text-orange-400">{metrics.suspendedDrivers || 0}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Bloqueados</span>
                <span className="text-lg font-black text-red-500">{metrics.blockedDrivers || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DRIVERS & AUDIT */}
      {/* ========================================================================= */}
      {tab === 'DRIVERS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 outline-none"
              >
                <option value="ALL">Todos os status ({drivers.length})</option>
                <option value="PENDING">Pendentes</option>
                <option value="IN_REVIEW">Em análise</option>
                <option value="APPROVED">🟢 Aprovados</option>
                <option value="INCOMPLETE">Incompletos</option>
                <option value="SUSPENDED">Suspensos</option>
                <option value="BLOCKED">Bloqueados</option>
                <option value="REJECTED">Rejeitados</option>
              </select>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, modelo ou placa..."
                className="bg-slate-900 text-white text-xs pl-8 pr-4 py-2 rounded-xl border border-slate-700 outline-none w-full sm:w-64"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {filteredDrivers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <p className="text-sm font-bold text-white">Nenhum motorista cadastrado ainda.</p>
              <p className="text-xs text-slate-400">
                Não há registros com o filtro atual. Você pode carregar o motorista DEMO ou criar um novo cadastro.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDrivers.map((d) => (
                <div
                  key={d.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <img
                        src={d.avatarUrl}
                        alt={d.name}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-white text-base">{d.name}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              d.regulatoryStatus === 'APPROVED'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                                : d.regulatoryStatus === 'PENDING' || d.regulatoryStatus === 'IN_REVIEW'
                                ? 'bg-amber-950 text-amber-400 border-amber-500/40'
                                : 'bg-rose-950 text-rose-400 border-rose-500/40'
                            }`}
                          >
                            {d.regulatoryStatus}
                          </span>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                            Assinatura: {d.subscriptionStatus}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400">
                          CPF: {d.cpf} • Tel: {d.phone} • Alvará: {d.licenseNumber || 'Pendente'}
                        </p>
                        <p className="text-xs text-slate-300">
                          Veículo: {d.vehicle.brand} {d.vehicle.model} ({d.vehicle.year}) • Placa: {d.vehicle.licensePlate} • Cor: {d.vehicle.color}
                        </p>

                        {d.rejectionReason && (
                          <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-500/30">
                            <strong>Motivo da Rejeição:</strong> {d.rejectionReason}
                          </p>
                        )}
                        {d.suspensionReason && (
                          <p className="text-xs text-orange-400 bg-orange-950/40 p-2 rounded-lg border border-orange-500/30">
                            <strong>Motivo da Suspensão:</strong> {d.suspensionReason}
                          </p>
                        )}
                        {d.blockingReason && (
                          <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-500/30">
                            <strong>Motivo do Bloqueio:</strong> {d.blockingReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Operational Action Buttons (Section 12) */}
                    <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto text-xs">
                      {d.regulatoryStatus !== 'APPROVED' && (
                        <button
                          onClick={() => handleApproveDriver(d.id)}
                          disabled={isUpdating}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm"
                        >
                          Aprovar
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenActionModal(d, 'REJECT')}
                        className="bg-slate-800 hover:bg-rose-950 text-rose-300 font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        Rejeitar
                      </button>

                      <button
                        onClick={() => handleOpenActionModal(d, 'SUSPEND')}
                        className="bg-slate-800 hover:bg-amber-950 text-amber-300 font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        Suspender
                      </button>

                      <button
                        onClick={() => handleOpenActionModal(d, 'BLOCK')}
                        className="bg-slate-800 hover:bg-red-950 text-red-300 font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        Bloquear
                      </button>

                      <button
                        onClick={() => handleOpenActionModal(d, 'REQUEST_DOC')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        Solicitar Doc
                      </button>

                      {d.subscriptionStatus !== 'ACTIVE' && (
                        <button
                          onClick={() => handleMarkSubscriptionPaid(d.id)}
                          className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/30 font-bold px-2.5 py-1.5 rounded-lg cursor-pointer"
                          title="Marca a assinatura como paga (exclusivo para testes de MVP)"
                        >
                          [Teste] Ativar Assinatura
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Documents Inspection List */}
                  <div className="border-t border-slate-800 pt-3 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Auditoria de Documentos Exigidos por São Sebastião:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {d.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-200 block">{doc.requirementName}</span>
                            <span className="text-[10px] text-slate-500">
                              Status: <strong className="text-slate-300">{doc.status}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {doc.status !== 'APPROVED' && (
                              <button
                                onClick={() => handleVerifyDocument(doc.id, 'APPROVED')}
                                className="text-[10px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2 py-1 rounded cursor-pointer font-bold"
                              >
                                Validar
                              </button>
                            )}
                            {doc.status !== 'REJECTED' && (
                              <button
                                onClick={() => handleVerifyDocument(doc.id, 'REJECTED')}
                                className="text-[10px] bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 px-2 py-1 rounded cursor-pointer font-bold"
                              >
                                Recusar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Modal (Reject, Suspend, Block, Request Doc) */}
          {actionModalDriver && actionModalType && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base">
                    {actionModalType === 'REJECT' && 'Rejeitar Motorista'}
                    {actionModalType === 'SUSPEND' && 'Suspender Temporariamente'}
                    {actionModalType === 'BLOCK' && 'Bloquear Permanentemente'}
                    {actionModalType === 'REQUEST_DOC' && 'Solicitar Novo Documento'}
                  </h3>
                  <button
                    onClick={() => {
                      setActionModalDriver(null);
                      setActionModalType(null);
                    }}
                    className="text-slate-400 hover:text-white cursor-pointer text-xs"
                  >
                    Fechar
                  </button>
                </div>

                <p className="text-xs text-slate-300">
                  Ação destinada ao motorista <strong>{actionModalDriver.name}</strong>.
                </p>

                {actionModalType === 'REQUEST_DOC' && (
                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-300">Documento a Solicitar:</label>
                    <select
                      value={selectedReqDoc}
                      onChange={(e) => setSelectedReqDoc(e.target.value)}
                      className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-700 outline-none"
                    >
                      <option value="Alvará de Licença Municipal">Alvará de Licença Municipal (São Sebastião)</option>
                      <option value="CNH com EAR">CNH Definitiva com EAR</option>
                      <option value="Seguro APP Passageiros">Apólice de Seguro APP Passageiros</option>
                      <option value="Laudo de Vistoria Veicular">Laudo de Vistoria Veicular Atualizado</option>
                      <option value="Certidão Negativa de Antecedentes">Certidão Negativa de Antecedentes</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1 text-xs">
                  <label className="font-bold text-slate-300">
                    {actionModalType === 'REQUEST_DOC' ? 'Instruções para o Motorista:' : 'Motivo Obrigatório da Decisão:'}
                  </label>
                  <textarea
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Especifique a justificativa técnica / regulamentar..."
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setActionModalDriver(null);
                      setActionModalType(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmActionModal}
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    Confirmar Ação
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RIDES MONITORING (Section 13) */}
      {/* ========================================================================= */}
      {tab === 'RIDES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Car className="w-5 h-5 text-emerald-400" />
              Monitoramento Operacional de Corridas
            </h3>
            <span className="text-xs text-slate-400">Total: {rides.length}</span>
          </div>

          {rides.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-bold text-white">Nenhuma corrida encontrada.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Assim que passageiros solicitarem corridas a motoristas, os registros em tempo real estarão disponíveis para auditoria aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rides.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">#{r.id}</span>
                      <span className="text-emerald-400 font-semibold">{r.driverName}</span>
                      <span className="text-slate-500">atendendo</span>
                      <span className="text-cyan-300 font-semibold">{r.passengerName}</span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">
                        {r.status}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      Rota: {r.originAddress} ➔ {r.destinationAddress}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Distância: {r.estimatedDistanceKm} km • Criada em: {new Date(r.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-emerald-400 block">
                      R$ {r.estimatedPrice.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Forma: {r.paymentMethod} • Status: {r.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FINANCES & COSTS (Section 15) */}
      {/* ========================================================================= */}
      {tab === 'FINANCES' && (
        <div className="space-y-6">
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Receita de Assinaturas (MRR)</span>
              <div className="text-3xl font-black text-emerald-400">R$ {metrics.monthlyRecurringRevenue}</div>
              <span className="text-[10px] text-slate-400">
                {metrics.activeSubscriptions} motoristas assinantes x R$ {plan.priceBrl}/mês
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Custos Operacionais</span>
              <div className="text-3xl font-black text-rose-400">R$ {totalOperationalCosts.toFixed(2)}</div>
              <span className="text-[10px] text-slate-400">{costs.length} despesas registradas</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Resultado Líquido</span>
              <div className={`text-3xl font-black ${netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                R$ {netIncome.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400">Receita de Assinaturas - Custos</span>
            </div>
          </div>

          {/* Pricing Config Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Parâmetro de Cobrança: Assinatura VaiCar Pro</h3>
            <form onSubmit={handleUpdatePlanPrice} className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-700">
                <span className="text-slate-400 font-bold text-xs">R$</span>
                <input
                  type="number"
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                  className="bg-transparent text-white font-black text-sm outline-none w-28"
                />
                <span className="text-xs text-slate-400">/mês</span>
              </div>
              <button
                type="submit"
                disabled={isUpdating}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
              >
                Salvar Novo Preço da Mensalidade
              </button>
            </form>
          </div>

          {/* Platform Costs Management Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-rose-400" />
              Lançar Custos da Plataforma
            </h3>

            <form onSubmit={handleAddCost} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Categoria</label>
                <select
                  value={costCategory}
                  onChange={(e) => setCostCategory(e.target.value)}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-700 outline-none"
                >
                  <option value="GATEWAY">Taxa de Gateway de Pagamento</option>
                  <option value="HOSTING">Hospedagem & Servidores</option>
                  <option value="MAPS">Serviço de Mapas & Rotas</option>
                  <option value="WHATSAPP_SMS">WhatsApp & SMS de Verificação</option>
                  <option value="EXTERNAL_SERVICES">Serviços Externos de Dados</option>
                  <option value="OTHER">Outros Custos Operacionais</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-300">Descrição do Custo</label>
                <input
                  type="text"
                  placeholder="Ex: Servidor Cloud Run e Banco de Dados"
                  value={costDescription}
                  onChange={(e) => setCostDescription(e.target.value)}
                  required
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-700 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Valor (R$)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={costAmount || ''}
                    onChange={(e) => setCostAmount(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-700 outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </form>

            {/* List of Costs */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-300 block mb-2">Despesas Registradas:</span>
              {costs.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">Nenhum custo registrado.</p>
              ) : (
                <div className="space-y-2">
                  {costs.map((cost) => (
                    <div
                      key={cost.id}
                      className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-200">{cost.description}</span>
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                          {cost.categoryLabel || cost.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-rose-400">R$ {cost.amountBrl.toFixed(2)}</span>
                        <button
                          onClick={() => handleDeleteCost(cost.id)}
                          className="text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: FARES & FAIR BASE FLOORS */}
      {/* ========================================================================= */}
      {tab === 'FARES' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">
                    Pisos Mínimos da Plataforma (Fair Base)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Evite a concorrência predatória e mantenha uma remuneração digna e sustentável para motoristas e taxistas de São Sebastião.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${
                    fareSettings.isEnforced
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {fareSettings.isEnforced ? '🛡️ Fiscalização Ativa' : '⚠️ Piso Facultativo'}
                </span>
              </div>
            </div>

            {fareUpdateSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{fareUpdateSuccess}</span>
              </div>
            )}

            {fareUpdateError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{fareUpdateError}</span>
              </div>
            )}
          </div>

          {/* Configuration Form & Live Simulation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
                Ajuste dos Parâmetros Regulatórios
              </h3>

              <form onSubmit={handleSaveFareSettings} className="space-y-5">
                <div className="space-y-4">
                  {/* Min Base Fare */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Bandeirada / Corrida Mínima</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Atual: R$ {fareSettings.minBaseFare.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700">
                      <span className="text-slate-400 font-bold text-xs">R$</span>
                      <input
                        type="number"
                        step="0.50"
                        min="1.00"
                        required
                        value={formBaseFare}
                        onChange={(e) => setFormBaseFare(Number(e.target.value))}
                        className="bg-transparent text-white font-black text-sm outline-none w-full"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Nenhum motorista poderá configurar bandeirada inicial inferior a este valor.
                    </p>
                  </div>

                  {/* Min Rate Per KM */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Piso por Km Rodado</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Atual: R$ {fareSettings.minRatePerKm.toFixed(2)}/km
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700">
                      <span className="text-slate-400 font-bold text-xs">R$</span>
                      <input
                        type="number"
                        step="0.10"
                        min="0.50"
                        required
                        value={formRatePerKm}
                        onChange={(e) => setFormRatePerKm(Number(e.target.value))}
                        className="bg-transparent text-white font-black text-sm outline-none w-full"
                      />
                      <span className="text-xs text-slate-400 whitespace-nowrap">/ km</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Taxa quilométrica mínima para corridas calculadas por distância na SP-055 / Rio-Santos.
                    </p>
                  </div>

                  {/* Min Fixed Route Price */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Piso para Rotas Fixas entre Bairros</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Atual: R$ {fareSettings.minFixedRoutePrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700">
                      <span className="text-slate-400 font-bold text-xs">R$</span>
                      <input
                        type="number"
                        step="1.00"
                        min="5.00"
                        required
                        value={formFixedRoutePrice}
                        onChange={(e) => setFormFixedRoutePrice(Number(e.target.value))}
                        className="bg-transparent text-white font-black text-sm outline-none w-full"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Nenhuma rota fixa praia-a-praia poderá ser cadastrada por valor inferior a este piso.
                    </p>
                  </div>

                  {/* Enforcement Toggle */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsEnforced}
                        onChange={(e) => setFormIsEnforced(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Ativar Bloqueio Automático na Plataforma
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Quando ativado, o sistema rejeita qualquer tentativa do motorista de salvar tarifas abaixo desses pisos e garante que a estimativa da corrida nunca fique inferior ao piso municipal.
                        </span>
                      </div>
                    </label>

                    {/* Auto sync drivers */}
                    <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-slate-800">
                      <input
                        type="checkbox"
                        checked={applyToDrivers}
                        onChange={(e) => setApplyToDrivers(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-cyan-300 block">
                          Atualizar e elevar motoristas atuais abaixo do piso
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Se houver motoristas com valores antigos inferiores ao novo piso, atualiza-os automaticamente para o piso mínimo estabelecido.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Scale className="w-4 h-4" />
                  <span>Salvar Pisos Tarifários da Plataforma</span>
                </button>
              </form>
            </div>

            {/* Simulation & Education Panel */}
            <div className="lg:col-span-5 space-y-6">
              {/* Simulator Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Simulador de Piso por Trajetos Típicos</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Valores mínimos absolutos que um passageiro pagará considerando a fórmula da plataforma:
                  <strong className="text-slate-200 block mt-1 font-mono">
                    Valor Mínimo = R$ {formBaseFare.toFixed(2)} + (Distância × R$ {formRatePerKm.toFixed(2)}/km)
                  </strong>
                </p>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Trajeto Curto / No Bairro</span>
                      <span className="text-[10px] text-slate-500">Estimativa: 3 km</span>
                    </div>
                    <span className="font-black text-emerald-400 text-sm">
                      R$ {(formBaseFare + 3 * formRatePerKm).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Centro ➔ São Francisco / Enseada</span>
                      <span className="text-[10px] text-slate-500">Estimativa: 8 km</span>
                    </div>
                    <span className="font-black text-emerald-400 text-sm">
                      R$ {(formBaseFare + 8 * formRatePerKm).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Centro ➔ Maresias</span>
                      <span className="text-[10px] text-slate-500">Estimativa: 27 km (Serra do Mar)</span>
                    </div>
                    <span className="font-black text-emerald-400 text-sm">
                      R$ {(formBaseFare + 27 * formRatePerKm).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Centro ➔ Boiçucanga</span>
                      <span className="text-[10px] text-slate-500">Estimativa: 35 km</span>
                    </div>
                    <span className="font-black text-emerald-400 text-sm">
                      R$ {(formBaseFare + 35 * formRatePerKm).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Centro ➔ Juquehy / Barra do Una</span>
                      <span className="text-[10px] text-slate-500">Estimativa: 52 km</span>
                    </div>
                    <span className="font-black text-emerald-400 text-sm">
                      R$ {(formBaseFare + 52 * formRatePerKm).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Justification & Regulatory Card */}
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-3xl p-5 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Shield className="w-4 h-4" />
                  <span>Por que o Piso de Preço é Essencial?</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Em cidades de litoral extenso como São Sebastião, o custo de combustível, pneus e manutenção na serra é elevado. 
                  Sem um piso regulatório, alguns motoristas praticam preços que não cobrem os custos operacionais (dumping), deteriorando a renda de toda a categoria e a segurança dos passageiros.
                </p>
                <div className="text-[10px] text-slate-500 pt-1">
                  Última atualização: {fareSettings.updatedAt ? new Date(fareSettings.updatedAt).toLocaleString('pt-BR') : 'Configuração inicial padrão'}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Table of Drivers Pricing Compliance */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Auditoria de Preços dos Motoristas</h3>
                <p className="text-xs text-slate-400">
                  Verifique como cada motorista cadastrado está cobrando em relação aos pisos da plataforma.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">Total: {drivers.length}</span>
            </div>

            {drivers.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhum motorista cadastrado ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Motorista</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3">Bandeirada</th>
                      <th className="p-3">Preço / Km</th>
                      <th className="p-3">Rotas Fixas</th>
                      <th className="p-3">Conformidade com o Piso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium">
                    {drivers.map((d) => {
                      const isBaseOk = (d.pricing?.minimumFare || 0) >= fareSettings.minBaseFare;
                      const isRateOk = (d.pricing?.ratePerKm || 0) >= fareSettings.minRatePerKm;
                      const isCompliant = isBaseOk && isRateOk;

                      return (
                        <tr key={d.id} className="hover:bg-slate-950/40 transition-colors">
                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            <span>{d.name}</span>
                          </td>
                          <td className="p-3 text-slate-400">{d.professionalCategory}</td>
                          <td className="p-3 font-mono">
                            R$ {(d.pricing?.minimumFare || 0).toFixed(2)}
                            {!isBaseOk && (
                              <span className="text-[10px] text-rose-400 block">
                                Abaixo de R$ {fareSettings.minBaseFare.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono">
                            R$ {(d.pricing?.ratePerKm || 0).toFixed(2)}/km
                            {!isRateOk && (
                              <span className="text-[10px] text-rose-400 block">
                                Abaixo de R$ {fareSettings.minRatePerKm.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400">
                            {d.pricing?.fixedRoutes?.length || 0} cadastradas
                          </td>
                          <td className="p-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                                isCompliant
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {isCompliant ? '✓ Em Conformidade' : '⚠ Abaixo do Piso'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ZONES */}
      {/* ========================================================================= */}
      {tab === 'ZONES' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Adicionar Nova Localidade / Praia</h3>
            <form onSubmit={handleAddZone} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="Ex: Praia da Baleia, Toque-Toque..."
                className="flex-1 bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-xs focus:border-emerald-500 outline-none"
              />
              <input
                type="number"
                value={newZoneDistance}
                onChange={(e) => setNewZoneDistance(Number(e.target.value))}
                placeholder="Distância do Centro (km)"
                className="w-full sm:w-48 bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-xs focus:border-emerald-500 outline-none"
              />
              <button
                type="submit"
                disabled={isUpdating}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                + Adicionar Localidade
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {zones.map((z) => (
              <div
                key={z.id}
                className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1 text-xs"
              >
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{z.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  ~{z.distanceFromCenterKm} km do Centro Histórico
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold block">🟢 Ativa</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REPORTS */}
      {/* ========================================================================= */}
      {tab === 'REPORTS' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Denúncias & Incidentes</h3>
            <span className="text-xs text-slate-400">{reports.length} registradas</span>
          </div>

          {reports.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
              Nenhuma denúncia pendente de moderação.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase">
                        {rep.category}
                      </span>
                      <h4 className="font-bold text-white text-sm mt-1">
                        Alvo: {rep.targetName} • Relatado por: {rep.reporterName}
                      </h4>
                    </div>
                    <span className="font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                      Status: {rep.status}
                    </span>
                  </div>

                  <p className="text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    "{rep.description}"
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {rep.status === 'OPEN' && (
                      <>
                        <button
                          onClick={() => handleUpdateReportStatus(rep.id, 'RESOLVED')}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer"
                        >
                          Marcar como Resolvido
                        </button>
                        <button
                          onClick={() => handleUpdateReportStatus(rep.id, 'DISMISSED')}
                          className="bg-slate-800 text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                          Descartar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
