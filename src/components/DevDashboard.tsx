import React, { useState } from 'react';
import {
  Code2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Database,
  Terminal,
  RefreshCw,
  Play,
  ShieldCheck,
  Cpu,
  Lock,
  KeyRound,
} from 'lucide-react';
import { Driver, Ride, PlatformMetrics, SubscriptionPlan } from '../types.ts';
import {
  verifyDevPassword,
  setDevPassword,
} from '../lib/authSecurity.ts';

interface DevDashboardProps {
  metrics: PlatformMetrics;
  drivers: Driver[];
  rides: Ride[];
  plan: SubscriptionPlan;
  onLoadDemo: (approved?: boolean) => void;
  onResetData: () => void;
  onToggleDemoApproval: () => void;
  onRefreshAll: () => void;
}

export const DevDashboard: React.FC<DevDashboardProps> = ({
  metrics,
  drivers,
  rides,
  plan,
  onLoadDemo,
  onResetData,
  onToggleDemoApproval,
  onRefreshAll,
}) => {
  // Auth Gate
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('vaicar_dev_auth') === 'true';
  });
  const [devPin, setDevPin] = useState('');
  const [authError, setAuthError] = useState('');

  // Password change states (Mandatory on first access or on demand)
  const [isMandatoryFirstChange, setIsMandatoryFirstChange] = useState<boolean>(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdChangeError, setPwdChangeError] = useState('');
  const [pwdChangeSuccess, setPwdChangeSuccess] = useState('');

  const [selectedInspectTab, setSelectedInspectTab] = useState<'METRICS' | 'DRIVERS' | 'RIDES' | 'RAW'>('METRICS');
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);

  const demoDriver = drivers.find((d) => d.id === 'drv-demo-joao');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const res = verifyDevPassword(devPin);
    if (!res.success) {
      setAuthError(res.errorMessage || 'Senha de desenvolvedor incorreta.');
      return;
    }

    if (res.needsPasswordChange) {
      setIsMandatoryFirstChange(true);
      setAuthError('');
      return;
    }

    setIsAuthenticated(true);
    localStorage.setItem('vaicar_dev_auth', 'true');
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

    const result = setDevPassword(newPassword);
    if (!result.success) {
      setPwdChangeError(result.message || 'Erro ao definir senha.');
      return;
    }

    setNewPassword('');
    setConfirmPassword('');

    if (isFirstTime) {
      setIsMandatoryFirstChange(false);
      setIsAuthenticated(true);
      localStorage.setItem('vaicar_dev_auth', 'true');
      alert('✅ Nova senha de Desenvolvedor salva com sucesso!');
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
    localStorage.removeItem('vaicar_dev_auth');
    setDevPin('');
    setIsMandatoryFirstChange(false);
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
              <h2 className="text-xl font-black text-white">Primeiro Acesso: Troca de Senha Dev</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cadastre sua <strong>senha pessoal de Desenvolvedor</strong>. O acesso por senhas genéricas ou <span className="text-rose-400">"demo"</span> foi bloqueado.
              </p>
            </div>

            <form onSubmit={(e) => handleSaveNewPassword(e, true)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Nova Senha de Desenvolvedor</label>
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
                Salvar Senha e Entrar
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMandatoryFirstChange(false);
                  setDevPin('');
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
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <Code2 className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white">Acesso do Desenvolvedor</h2>
            <p className="text-xs text-slate-400">
              Console de auditoria técnica, inspeção de estado e validação de rotas.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
              <Lock className="w-3.5 h-3.5" />
              <span>Proteção de Console Dev</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Chave inicial de primeiro acesso: <code className="text-amber-400 font-mono font-bold bg-slate-900 px-1 py-0.5 rounded">dev2025</code>
            </p>
            <p className="text-[10px] text-amber-400/90 font-medium">
              * A troca para sua senha pessoal será exigida na primeira ação.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Senha / PIN do Desenvolvedor</label>
              <div className="relative">
                <input
                  type="password"
                  value={devPin}
                  onChange={(e) => setDevPin(e.target.value)}
                  placeholder="Digite sua senha de desenvolvedor"
                  required
                  className="w-full bg-slate-950 text-white font-mono text-sm px-4 py-3 rounded-xl border border-slate-700 outline-none focus:border-amber-500"
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
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer shadow-md"
            >
              Acessar Console Dev
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-500 font-medium">
              Credenciais genéricas como "demo" foram desativadas por segurança.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <span>Alterar Senha do Desenvolvedor</span>
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
              Defina uma nova senha para proteger o console técnico e o inspetor de runtime.
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

      {/* Dev Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Painel do Desenvolvedor & Auditoria
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  AUTENTICADO
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ferramentas para validação de fluxos, injeção de dados DEMO controlados e reset de estado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowPasswordChangeModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="Alterar senha de desenvolvedor"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Trocar Senha</span>
            </button>
            <button
              onClick={onRefreshAll}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recarregar Estado</span>
            </button>
            <button
              onClick={handleLogout}
              className="bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Notice strictly about no fake data */}
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl text-xs space-y-1 text-slate-300">
          <p className="font-bold text-amber-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Política Rigorosa de Dados Reais & Teste Controlado:
          </p>
          <p className="text-[11px] text-slate-400">
            A plataforma não utiliza dados falsos ou simuladores externos. Quando não houver cadastros, o sistema exibe o estado vazio correspondente. Apenas contas claramente identificadas como <strong>DEMO / EXEMPLO</strong> são utilizadas para validação técnica de ponta a ponta.
          </p>
        </div>
      </div>

      {/* Quick Action Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Button 1: Load Demo Driver Pending */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>1. Injetar DEMO (Pendente)</span>
          </div>
          <p className="text-xs text-slate-400">
            Carrega João da Silva com status <strong>PENDING</strong> para testar a auditoria municipal de documentos no Painel Admin.
          </p>
          <button
            onClick={() => {
              onLoadDemo(false);
              setTestResultMsg('Motorista DEMO carregado com status PENDENTE!');
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-2.5 px-3 rounded-xl text-xs cursor-pointer border border-slate-700 transition-colors"
          >
            Carregar DEMO Pendente
          </button>
        </div>

        {/* Button 2: Load Demo Driver Approved */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>2. Injetar DEMO (Aprovado)</span>
          </div>
          <p className="text-xs text-slate-400">
            Carrega João da Silva com status <strong>APPROVED</strong> e online para testar busca de viagens e pagamento Pix pelo passageiro.
          </p>
          <button
            onClick={() => {
              onLoadDemo(true);
              setTestResultMsg('Motorista DEMO carregado e APROVADO!');
            }}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs cursor-pointer transition-colors shadow-md"
          >
            Carregar DEMO Aprovado
          </button>
        </div>

        {/* Button 3: Reset to zero */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span>3. Reset Total (0 Dados)</span>
          </div>
          <p className="text-xs text-slate-400">
            Limpa todos os arrays em memória (motoristas, passageiros, corridas, custos) para testar os estados vazios.
          </p>
          <button
            onClick={() => {
              if (window.confirm('Deseja resetar todos os dados para zero?')) {
                onResetData();
                setTestResultMsg('Todos os dados foram resetados para zero!');
              }
            }}
            className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold py-2.5 px-3 rounded-xl text-xs cursor-pointer border border-rose-500/30 transition-colors"
          >
            Zerar Todo o Sistema
          </button>
        </div>
      </div>

      {testResultMsg && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl text-xs text-emerald-300 font-bold flex items-center justify-between">
          <span>{testResultMsg}</span>
          <button onClick={() => setTestResultMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
            Fechar
          </button>
        </div>
      )}

      {/* Demo Driver Status Inspector */}
      {demoDriver && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="font-bold text-white text-sm">Conta DEMO Ativa: {demoDriver.name}</h3>
            </div>
            <span className="text-xs font-mono bg-slate-950 px-2 py-0.5 rounded text-emerald-400">
              {demoDriver.regulatoryStatus} • {demoDriver.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            CPF: {demoDriver.cpf} • Placa: {demoDriver.vehicle.licensePlate} ({demoDriver.vehicle.brand} {demoDriver.vehicle.model}) • Chave Pix: {demoDriver.pixKey}
          </p>

          <div className="pt-1 flex items-center gap-3">
            <button
              onClick={onToggleDemoApproval}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              Alternar Status ({demoDriver.regulatoryStatus === 'APPROVED' ? 'Tornar Pendente' : 'Aprovar Motorista'})
            </button>
          </div>
        </div>
      )}

      {/* State Inspector / Debug Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Inspetor de Estado em Memória (Runtime)
          </h3>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setSelectedInspectTab('METRICS')}
              className={`px-3 py-1 rounded-lg cursor-pointer ${selectedInspectTab === 'METRICS' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Métricas
            </button>
            <button
              onClick={() => setSelectedInspectTab('DRIVERS')}
              className={`px-3 py-1 rounded-lg cursor-pointer ${selectedInspectTab === 'DRIVERS' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Motoristas ({drivers.length})
            </button>
            <button
              onClick={() => setSelectedInspectTab('RIDES')}
              className={`px-3 py-1 rounded-lg cursor-pointer ${selectedInspectTab === 'RIDES' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Corridas ({rides.length})
            </button>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-80 overflow-y-auto">
          <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">
            {selectedInspectTab === 'METRICS' && JSON.stringify(metrics, null, 2)}
            {selectedInspectTab === 'DRIVERS' && JSON.stringify(drivers, null, 2)}
            {selectedInspectTab === 'RIDES' && JSON.stringify(rides, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
