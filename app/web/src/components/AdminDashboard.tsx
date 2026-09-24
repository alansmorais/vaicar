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
  Mail,
  Code,
  Copy,
  Check,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { RideReceiptModal } from './RideReceiptModal.tsx';
import { VaiCarMobilityMap } from './VaiCarMobilityMap.tsx';
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
  fetchDynamicPricingSettings,
  updateDynamicPricingSettings,
  fetchSurgeAnalysis,
  fetchSmtpSettings,
  saveSmtpSettings,
  sendTestEmail,
  cleanupFictitious,
  deleteDriver,
  fetchPassengers,
  togglePassengerBlock,
  updatePassengerProfile,
} from '../lib/api.ts';
import { DynamicPricingSettings } from '../types.ts';

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
  // Subscription metrics based on registration index tiers (0, 60, 80, 100 BRL)
  const activeDrivers = drivers.filter(d => d.subscriptionStatus === 'ACTIVE');
  const activeCount = activeDrivers.length;
  const freeCount = activeDrivers.filter(d => d.monthlyFeeBrl === 0).length;
  const sixtyCount = activeDrivers.filter(d => d.monthlyFeeBrl === 60).length;
  const eightyCount = activeDrivers.filter(d => d.monthlyFeeBrl === 80).length;
  const hundredCount = activeDrivers.filter(d => d.monthlyFeeBrl === 100 || (typeof d.monthlyFeeBrl === 'number' && d.monthlyFeeBrl !== 0 && d.monthlyFeeBrl !== 60 && d.monthlyFeeBrl !== 80)).length;

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
  const [tab, setTab] = useState<'METRICS' | 'MAPA' | 'DRIVERS' | 'PASSENGERS' | 'RIDES' | 'FINANCES' | 'FARES' | 'DINAMICA' | 'ZONES' | 'REPORTS'>('METRICS');
  const [selectedReceiptRideId, setSelectedReceiptRideId] = useState<string | null>(null);

  // Dynamic Pricing State
  const [dynamicSettings, setDynamicSettings] = useState<DynamicPricingSettings>({
    isEnabled: true,
    minMultiplier: 0.8,
    maxMultiplier: 2.5,
    idealDriverPassengerRatio: 3.0,
    minDriversThreshold: 2,
    activeZoneIds: [],
    surgeIcon: '⚡',
  });
  const [surgeAnalysis, setSurgeAnalysis] = useState<any[]>([]);
  const [dynamicUpdateSuccess, setDynamicUpdateSuccess] = useState('');
  const [dynamicUpdateError, setDynamicUpdateError] = useState('');
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

  // SMTP & Apps Script Email Settings State
  const [smtpConfigured, setSmtpConfigured] = useState<boolean>(false);
  const [hasAppsScript, setHasAppsScript] = useState<boolean>(false);
  const [hasPass, setHasPass] = useState<boolean>(false);
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState<string>('');
  const [smtpUser, setSmtpUser] = useState<string>('vaicar@alansmsolutions.com');
  const [smtpPassInput, setSmtpPassInput] = useState<string>('');
  const [emailSaveMsg, setEmailSaveMsg] = useState<string>('');
  const [emailSaveError, setEmailSaveError] = useState<string>('');
  const [isSavingEmail, setIsSavingEmail] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Test Email State
  const [testEmailTarget, setTestEmailTarget] = useState<string>('alanpkmorais@gmail.com');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [testEmailResult, setTestEmailResult] = useState<string>('');
  const [testEmailError, setTestEmailError] = useState<string>('');

  // Passenger Management State
  const [passengers, setPassengers] = useState<any[]>([]);
  const [passengerSearch, setPassengerSearch] = useState<string>('');
  const [isPassengerLoading, setIsPassengerLoading] = useState<boolean>(false);

  // Passenger Editing State
  const [editingPassenger, setEditingPassenger] = useState<any | null>(null);
  const [editPassengerName, setEditPassengerName] = useState<string>('');
  const [editPassengerEmail, setEditPassengerEmail] = useState<string>('');
  const [editPassengerPhone, setEditPassengerPhone] = useState<string>('');
  const [editPassengerError, setEditPassengerError] = useState<string>('');
  const [isSavingPassenger, setIsSavingPassenger] = useState<boolean>(false);

  useEffect(() => {
    loadCosts();
    loadFareSettings();
    loadDynamicSettings();
    loadSurgeAnalysis();
    loadSmtpSettings();
    loadPassengersList();
  }, []);

  const loadPassengersList = async () => {
    try {
      setIsPassengerLoading(true);
      const data = await fetchPassengers();
      setPassengers(data || []);
    } catch (err) {
      console.error('Failed to load passengers', err);
    } finally {
      setIsPassengerLoading(false);
    }
  };

  const handleTogglePassengerBlock = async (pId: string, currentBlocked: boolean) => {
    try {
      await togglePassengerBlock(pId, !currentBlocked);
      setPassengers(prev => prev.map(p => p.id === pId ? { ...p, isBlocked: !currentBlocked } : p));
    } catch (err: any) {
      console.error('Error toggling passenger block:', err);
    }
  };

  const handleStartEditPassenger = (p: any) => {
    setEditingPassenger(p);
    setEditPassengerName(p.name || '');
    setEditPassengerEmail(p.email || '');
    setEditPassengerPhone(p.phone || '');
    setEditPassengerError('');
  };

  const handleSavePassengerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPassenger) return;
    if (!editPassengerName.trim() || !editPassengerPhone.trim()) {
      setEditPassengerError('Nome e WhatsApp são obrigatórios.');
      return;
    }
    try {
      setIsSavingPassenger(true);
      setEditPassengerError('');
      await updatePassengerProfile(editingPassenger.id, {
        name: editPassengerName,
        email: editPassengerEmail,
        phone: editPassengerPhone,
      });
      setPassengers(prev => prev.map(p => p.id === editingPassenger.id ? {
        ...p,
        name: editPassengerName.trim(),
        email: editPassengerEmail.trim().toLowerCase(),
        phone: editPassengerPhone.trim(),
      } : p));
      setEditingPassenger(null);
    } catch (err: any) {
      setEditPassengerError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setIsSavingPassenger(false);
    }
  };

  const loadSmtpSettings = async () => {
    try {
      const data = await fetchSmtpSettings();
      setSmtpConfigured(data.configured);
      setHasAppsScript(Boolean(data.hasAppsScript));
      setHasPass(Boolean(data.hasPass));
      if (data.appsScriptUrl) setAppsScriptUrlInput(data.appsScriptUrl);
      if (data.user) setSmtpUser(data.user);
    } catch { }
  };

  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEmail(true);
    setEmailSaveMsg('');
    setEmailSaveError('');
    try {
      const res = await saveSmtpSettings({
        user: smtpUser,
        pass: smtpPassInput ? smtpPassInput : undefined,
        appsScriptUrl: appsScriptUrlInput,
      });
      setEmailSaveMsg(res.message || 'Configurações de e-mail salvas com sucesso!');
      setSmtpConfigured(true);
      if (appsScriptUrlInput.trim()) setHasAppsScript(true);
      if (smtpPassInput.trim()) {
        setHasPass(true);
        setSmtpPassInput('');
      }
      setTimeout(() => setEmailSaveMsg(''), 4000);
    } catch (err: any) {
      setEmailSaveError(err.message || 'Erro ao salvar configurações de e-mail');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleCopyAppsScriptCode = () => {
    const code = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    MailApp.sendEmail({
      to: data.to,
      subject: data.subject,
      htmlBody: data.html,
      name: "VaiCar São Sebastião"
    });
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTarget.trim()) return;
    setIsSendingTestEmail(true);
    setTestEmailResult('');
    setTestEmailError('');
    try {
      const res = await sendTestEmail(testEmailTarget);
      setTestEmailResult(`✓ ${res.message}`);
    } catch (err: any) {
      setTestEmailError(`⚠ ${err.message || 'Falha ao enviar e-mail de teste'}`);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const loadDynamicSettings = async () => {
    try {
      const data = await fetchDynamicPricingSettings();
      setDynamicSettings(data);
    } catch { }
  };

  const loadSurgeAnalysis = async () => {
    try {
      const data = await fetchSurgeAnalysis();
      setSurgeAnalysis(data);
    } catch { }
  };

  const handleUpdateDynamicPricing = async () => {
    setIsUpdating(true);
    setDynamicUpdateSuccess('');
    setDynamicUpdateError('');
    try {
      await updateDynamicPricingSettings(dynamicSettings);
      setDynamicUpdateSuccess('Configurações de tarifa dinâmica atualizadas com sucesso!');
      loadSurgeAnalysis();
      setTimeout(() => setDynamicUpdateSuccess(''), 3000);
    } catch (err: any) {
      setDynamicUpdateError(err.message || 'Falha ao atualizar tarifa dinâmica');
    } finally {
      setIsUpdating(false);
    }
  };

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

  // Filter passengers
  const filteredPassengers = passengers.filter((p: any) => {
    const q = passengerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.phone || '').includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  });

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
            onClick={async () => {
              if (window.confirm('Executar limpeza de motoristas fictícios e corridas canceladas/antigas?')) {
                try {
                  setIsUpdating(true);
                  const res = await cleanupFictitious();
                  alert(`Limpeza concluída! Removidos: ${res.removedDrivers} motoristas e ${res.removedRides} corridas residuais.`);
                  onRefreshAll();
                } catch (err: any) {
                  alert(err.message || 'Erro na limpeza');
                } finally {
                  setIsUpdating(false);
                }
              }
            }}
            disabled={isUpdating}
            className="bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Remove perfis de teste e corridas canceladas/órfãs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Testes</span>
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
          onClick={() => setTab('MAPA')}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
            tab === 'MAPA' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Mapa de Operações</span>
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
          onClick={() => setTab('DINAMICA')}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
            tab === 'DINAMICA' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Tarifa Dinâmica</span>
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
          onClick={() => setTab('PASSENGERS')}
          className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
            tab === 'PASSENGERS' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Passageiros ({passengers.length})</span>
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
      {/* TAB: MOBILITY & DEMAND MAP (ADMIN OPERATIONS MAP) */}
      {/* ========================================================================= */}
      {tab === 'MAPA' && (
        <div className="space-y-4">
          <VaiCarMobilityMap
            mode="ADMIN"
            zones={zones}
          />
        </div>
      )}

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
                {activeCount} ativos ({freeCount} grátis • {sixtyCount} de R$60 • {eightyCount} de R$80 • {hundredCount} de R$100)
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

                      <button
                        onClick={async () => {
                          if (window.confirm(`Excluir permanentemente o motorista ${d.name}? Esta ação não pode ser desfeita.`)) {
                            try {
                              setIsUpdating(true);
                              await deleteDriver(d.id);
                              onRefreshAll();
                            } catch (err: any) {
                              alert(err.message || 'Erro ao excluir motorista');
                            } finally {
                              setIsUpdating(false);
                            }
                          }
                        }}
                        className="bg-slate-800 hover:bg-rose-950 text-rose-400 p-2 rounded-lg cursor-pointer transition-colors"
                        title="Excluir motorista permanentemente do sistema"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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

                  <div className="text-right space-y-1">
                    <span className="text-base font-black text-emerald-400 block">
                      R$ {r.estimatedPrice.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Forma: {r.paymentMethod} • Status: {r.paymentStatus}
                    </span>
                    {r.status === 'COMPLETED' && (
                      <button
                        onClick={() => setSelectedReceiptRideId(r.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 transition-all cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-emerald-400" />
                        <span>Comprovante PDF</span>
                      </button>
                    )}
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
                {activeCount} ativos ({freeCount} grátis • {sixtyCount} de R$60 • {eightyCount} de R$80 • {hundredCount} de R$100)
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

          {/* ========================================================================= */}
          {/* EMAIL DISPATCH CONFIGURATION (APPS SCRIPT & SMTP) */}
          {/* ========================================================================= */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-400" />
                  <span>Serviço de Envio de E-mails & Códigos PIN</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Configure o envio automático de códigos PIN via <strong>Google Apps Script (Recomendado)</strong> ou <strong>SMTP Direto</strong>.
                </p>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 self-start sm:self-auto ${
                  hasAppsScript
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : hasPass
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {hasAppsScript
                  ? '🟢 Apps Script Ativo'
                  : hasPass
                  ? '🔵 SMTP Ativo'
                  : '🟡 Configuração Pendente'}
              </span>
            </div>

            <form onSubmit={handleSaveEmailConfig} className="space-y-6">
              {/* Option 1: Google Apps Script Webhook (Recommended) */}
              <div className="bg-slate-950/70 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md uppercase">
                      Recomendado
                    </span>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-emerald-400" />
                      <span>Opção 1: Webhook do Google Apps Script (100% Confiável)</span>
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAppsScriptCode}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Código Copiado!' : 'Copiar Código Apps Script'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  O Google Apps Script roda diretamente nos servidores do Google, sem bloqueios de portas SMTP ou problemas de rede.
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200">
                    URL do App da Web (Google Apps Script)
                  </label>
                  <input
                    type="url"
                    value={appsScriptUrlInput}
                    onChange={(e) => setAppsScriptUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full bg-slate-900 text-white text-xs px-4 py-3 rounded-xl border border-slate-700 focus:border-emerald-500 outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-400">
                    Cole o link gerado após clicar em <em>Implantar &gt; Nova implantação &gt; App da Web (Qualquer pessoa)</em>.
                  </p>
                </div>

                {/* Instructions Accordion / Card */}
                <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                  <p className="font-bold text-emerald-400">Como criar seu Apps Script em 3 passos:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>Acesse <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">script.google.com <ExternalLink className="w-2.5 h-2.5 inline" /></a> e clique em <strong>Novo projeto</strong>.</li>
                    <li>Clique no botão <strong>"Copiar Código Apps Script"</strong> acima e cole no editor.</li>
                    <li>Clique em <strong>Implantar &gt; Nova implantação &gt; App da Web</strong> (defina "Quem tem acesso" como <em>Qualquer pessoa</em>) e cole a URL gerada no campo acima.</li>
                  </ol>
                </div>
              </div>

              {/* Option 2: Direct SMTP */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>Opção 2: SMTP Direto (Senha de Aplicativo)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">E-mail Remetente</label>
                    <input
                      type="email"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="vaicar@alansmsolutions.com"
                      className="w-full bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Senha de Aplicativo (16 dígitos)</label>
                    <input
                      type="password"
                      value={smtpPassInput}
                      onChange={(e) => setSmtpPassInput(e.target.value)}
                      placeholder={hasPass ? '•••• •••• •••• •••• (Configurada)' : 'Cole o código de 16 letras'}
                      className="w-full bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {emailSaveMsg && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold p-3 rounded-xl animate-in fade-in">
                  ✓ {emailSaveMsg}
                </div>
              )}

              {emailSaveError && (
                <div className="bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs font-semibold p-3 rounded-xl animate-in fade-in">
                  ⚠ {emailSaveError}
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-2 border-b border-slate-800/80 pb-5">
                <p className="text-[11px] text-slate-400">
                  Salve para persistir a URL do Apps Script ou a Senha SMTP.
                </p>
                <button
                  type="submit"
                  disabled={isSavingEmail}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-emerald-500/20"
                >
                  {isSavingEmail ? 'Salvando...' : 'Salvar Configurações de E-mail'}
                </button>
              </div>
            </form>

            {/* Test Email Trigger Section */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enviar E-mail de Teste com Código PIN</span>
                </label>
                <span className="text-[10px] text-slate-400">Disparo real em tempo real</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="email"
                  value={testEmailTarget}
                  onChange={(e) => setTestEmailTarget(e.target.value)}
                  placeholder="Seu e-mail de teste (ex: alanpkmorais@gmail.com)"
                  className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail || !testEmailTarget.trim()}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-300 font-bold text-xs px-5 py-2.5 rounded-xl border border-emerald-500/30 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Send className="w-3 h-3" />
                  <span>{isSendingTestEmail ? 'Disparando...' : 'Disparar Teste'}</span>
                </button>
              </div>

              {testEmailResult && (
                <div className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-semibold p-3 rounded-xl animate-in fade-in">
                  {testEmailResult}
                </div>
              )}

              {testEmailError && (
                <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-semibold p-3 rounded-xl animate-in fade-in">
                  {testEmailError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: DINAMICA (Tarifa Dinâmica) */}
      {/* ========================================================================= */}
      {tab === 'DINAMICA' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
                <span>Gestão de Tarifa Dinâmica</span>
              </h2>
              <p className="text-xs text-slate-400">
                Ajuste automático de preços por oferta e demanda local.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadSurgeAnalysis}
                className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 shadow-sm"
                title="Atualizar Análise"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Settings Form */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Parâmetros do Multiplicador</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={dynamicSettings.isEnabled}
                    onChange={(e) => setDynamicSettings({...dynamicSettings, isEnabled: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ml-3 text-xs font-bold text-slate-300">{dynamicSettings.isEnabled ? 'ATIVADO' : 'DESATIVADO'}</span>
                </label>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Multiplicador Mínimo</label>
                    <input 
                      type="number" step="0.1" min="0.1" max="1.0"
                      className="w-full bg-transparent text-white font-black text-xl outline-none"
                      value={dynamicSettings.minMultiplier}
                      onChange={(e) => setDynamicSettings({...dynamicSettings, minMultiplier: Number(e.target.value)})}
                    />
                    <span className="text-[9px] text-slate-500">Padrão: 0.8 (Desconto)</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Multiplicador Máximo</label>
                    <input 
                      type="number" step="0.1" min="1.0" max="5.0"
                      className="w-full bg-transparent text-white font-black text-xl outline-none"
                      value={dynamicSettings.maxMultiplier}
                      onChange={(e) => setDynamicSettings({...dynamicSettings, maxMultiplier: Number(e.target.value)})}
                    />
                    <span className="text-[9px] text-slate-500">Padrão: 2.5 (Surge)</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white">Relação Ideal (Motorista/Solicitação)</label>
                    <span className="text-xs font-black text-emerald-400">{dynamicSettings.idealDriverPassengerRatio}x</span>
                  </div>
                  <input 
                    type="range" min="1.0" max="5.0" step="0.5"
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    value={dynamicSettings.idealDriverPassengerRatio}
                    onChange={(e) => setDynamicSettings({...dynamicSettings, idealDriverPassengerRatio: Number(e.target.value)})}
                  />
                  <p className="text-[10px] text-slate-500">
                    Define o equilíbrio. Se houver menos que {dynamicSettings.idealDriverPassengerRatio} motoristas por passageiro solicitando, o preço sobe.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-white block">Ativar apenas se houver pelo menos:</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" min="1" max="10"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold w-20 outline-none"
                      value={dynamicSettings.minDriversThreshold}
                      onChange={(e) => setDynamicSettings({...dynamicSettings, minDriversThreshold: Number(e.target.value)})}
                    />
                    <span className="text-xs text-slate-400">motoristas online na região</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-white block">Ícone de Identificação</label>
                  <input 
                    type="text"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold w-20 outline-none text-center"
                    value={dynamicSettings.surgeIcon}
                    onChange={(e) => setDynamicSettings({...dynamicSettings, surgeIcon: e.target.value})}
                  />
                  <span className="text-[10px] text-slate-500">Será exibido ao lado do preço quando a tarifa dinâmica estiver ativa.</span>
                </div>
              </div>

              {dynamicUpdateSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
                  {dynamicUpdateSuccess}
                </div>
              )}
              {dynamicUpdateError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300">
                  {dynamicUpdateError}
                </div>
              )}

              <button
                onClick={handleUpdateDynamicPricing}
                disabled={isUpdating}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                <span>Salvar Configurações Dinâmicas</span>
              </button>
            </div>

            {/* Live Analysis Sidebar */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Análise de Demanda em Tempo Real</span>
                </h3>
                
                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
                  {surgeAnalysis.map((item) => (
                    <div 
                      key={item.zoneId}
                      className={`p-4 rounded-2xl border transition-all ${
                        item.isActive 
                          ? (item.multiplier > 1.0 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-emerald-950/20 border-emerald-500/30')
                          : 'bg-slate-950 border-slate-800 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{item.zoneName}</span>
                          {item.isActive && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                              item.multiplier > 1.0 ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                            }`}>
                              {item.multiplier}x
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block uppercase">Oferta</span>
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              <Car className="w-3 h-3" /> {item.onlineDrivers}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block uppercase">Demanda</span>
                            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                              <Users className="w-3 h-3" /> {item.activeRequests}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Micro Progress Bar for Supply/Demand Health */}
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-emerald-500 transition-all" 
                          style={{ width: `${Math.min(100, (item.onlineDrivers / (item.activeRequests || 1)) * 20)}%` }}
                        />
                        <div 
                          className="h-full bg-rose-500 transition-all opacity-50" 
                          style={{ width: `${Math.min(100, (item.activeRequests / (item.onlineDrivers || 1)) * 20)}%` }}
                        />
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Ratio Real: {item.ratio}x</span>
                        <span className={item.isActive ? 'text-white font-bold' : 'text-slate-600'}>
                          {item.multiplier > 1.0 ? 'Alta Demanda Detectada' : (item.multiplier < 1.0 ? 'Excesso de Oferta' : 'Equilíbrio')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
      {/* TAB: PASSENGERS */}
      {/* ========================================================================= */}
      {tab === 'PASSENGERS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Gestão de Passageiros</h3>
              <p className="text-xs text-slate-400">Gerencie contas, consulte cadastros e bloqueie ou bana passageiros infratores.</p>
            </div>
            <button
              onClick={loadPassengersList}
              disabled={isPassengerLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPassengerLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar Lista</span>
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, WhatsApp ou e-mail..."
              value={passengerSearch}
              onChange={(e) => setPassengerSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {isPassengerLoading ? (
            <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Carregando passageiros...</p>
            </div>
          ) : filteredPassengers.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800 text-slate-500 text-xs">
              Nenhum passageiro encontrado.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="p-4">Passageiro</th>
                      <th className="p-4">WhatsApp / E-mail</th>
                      <th className="p-4">Cadastro em</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPassengers.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-950/20 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <img
                            src={p.avatarUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"}
                            alt={p.name}
                            className={`w-9 h-9 rounded-full object-cover border-2 ${p.isBlocked ? 'border-rose-500/50' : 'border-slate-800'}`}
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              {p.name}
                              {p.isDemo && (
                                <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1 rounded font-bold">
                                  Demo
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">ID: {p.id}</span>
                          </div>
                        </td>
                        <td className="p-4 space-y-0.5">
                          <div className="text-white font-medium">{p.phone}</div>
                          {p.email && <div className="text-[10px] text-slate-400">{p.email}</div>}
                        </td>
                        <td className="p-4 text-slate-400">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-4">
                          {p.isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Banido / Bloqueado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Ativo</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStartEditPassenger(p)}
                              className="px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer border border-slate-700"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleTogglePassengerBlock(p.id, !!p.isBlocked)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                p.isBlocked
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow shadow-emerald-500/10'
                                  : 'bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/25 hover:border-transparent'
                              }`}
                            >
                              {p.isBlocked ? 'Desbloquear Acesso' : 'Bloquear / Banir'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Edit Passenger Modal */}
          {editingPassenger && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
                <div>
                  <h4 className="text-base font-bold text-white">Editar Passageiro</h4>
                  <p className="text-xs text-slate-400">ID: {editingPassenger.id}</p>
                </div>

                <form onSubmit={handleSavePassengerEdit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nome Completo</label>
                    <input
                      type="text"
                      value={editPassengerName}
                      onChange={(e) => setEditPassengerName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp (Formato completo)</label>
                    <input
                      type="text"
                      value={editPassengerPhone}
                      onChange={(e) => setEditPassengerPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">E-mail</label>
                    <input
                      type="email"
                      value={editPassengerEmail}
                      onChange={(e) => setEditPassengerEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {editPassengerError && (
                    <p className="text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-500/25 p-3 rounded-xl">
                      {editPassengerError}
                    </p>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingPassenger(null)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingPassenger}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {isSavingPassenger ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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

      {/* Ride Receipt Modal for Admin Inspection */}
      {selectedReceiptRideId && (
        <RideReceiptModal
          rideId={selectedReceiptRideId}
          onClose={() => setSelectedReceiptRideId(null)}
        />
      )}
    </div>
  );
};
