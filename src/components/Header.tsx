import React, { useState } from 'react';
import { Car, Shield, User, Compass, Sparkles, RotateCcw, CheckCircle2, AlertTriangle, Code2 } from 'lucide-react';
import { UserRole } from '../types.ts';

interface HeaderProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  activeDriverId: string;
  onSelectDriverId: (id: string) => void;
  availableDrivers: { id: string; name: string; regulatoryStatus: string }[];
  onOpenLegal: (tab: 'termos' | 'privacidade' | 'regulacao') => void;
  onLoadDemo: (approved?: boolean) => void;
  onResetData: () => void;
  onToggleDemoApproval?: () => void;
  hasDemoDriver?: boolean;
  demoDriverApproved?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onSelectRole,
  activeDriverId,
  onSelectDriverId,
  availableDrivers,
  onOpenLegal,
  onLoadDemo,
  onResetData,
  onToggleDemoApproval,
  hasDemoDriver,
  demoDriverApproved,
}) => {
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      {/* Top Notification / Regulatory Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-3 py-1 text-xs text-center font-medium text-emerald-50 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <span className="bg-emerald-950/70 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border border-emerald-400/30">
          São Sebastião • SP
        </span>
        <span className="hidden sm:inline">Marketplace Municipal de Transporte Remunerado • 0% de comissão sobre corridas</span>
        <button
          onClick={() => onOpenLegal('regulacao')}
          className="underline hover:text-white cursor-pointer"
        >
          Regulação Municipal
        </button>

        {/* Demo Mode Action Pill in Header Bar */}
        <div className="flex items-center gap-1.5 ml-1 sm:ml-4 bg-slate-900/80 px-2 py-0.5 rounded-full border border-emerald-400/30 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-200 font-semibold">Modo de Teste:</span>
          {!hasDemoDriver ? (
            <button
              onClick={() => onLoadDemo(true)}
              className="text-emerald-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
              title="Carrega conta de motorista e passageiro DEMO para testar o sistema"
            >
              <Sparkles className="w-3 h-3" />
              Carregar DEMO
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-medium">Conta DEMO Ativa</span>
              {onToggleDemoApproval && (
                <button
                  onClick={onToggleDemoApproval}
                  className="text-xs bg-emerald-700/60 hover:bg-emerald-700 px-1.5 py-0.2 rounded text-emerald-100 cursor-pointer"
                  title="Alterna entre motorista aprovado e motorista pendente de análise"
                >
                  {demoDriverApproved ? 'Tornar Pendente' : 'Aprovar Motorista'}
                </button>
              )}
              <button
                onClick={onResetData}
                className="text-slate-400 hover:text-rose-300 transition-colors cursor-pointer flex items-center gap-0.5"
                title="Limpar tudo e voltar ao estado vazio com 0 registros"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Limpar (0)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & City Identity */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onSelectRole('PASSENGER')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Car className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Vai<span className="text-emerald-400">Car</span>
                </span>
                <span className="text-[10px] bg-slate-800 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                  MVP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">São Sebastião • Litoral Norte</p>
            </div>
          </div>
        </div>

        {/* Role Switcher Pills */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 shadow-inner">
          <button
            id="role-passenger-btn"
            onClick={() => onSelectRole('PASSENGER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentRole === 'PASSENGER'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Passageiro</span>
          </button>

          <button
            id="role-driver-btn"
            onClick={() => onSelectRole('DRIVER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentRole === 'DRIVER'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Motorista</span>
          </button>

          <button
            id="role-admin-btn"
            onClick={() => onSelectRole('ADMIN')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentRole === 'ADMIN'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>

          <button
            id="role-dev-btn"
            onClick={() => onSelectRole('DEV')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentRole === 'DEV'
                ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
            title="Painel de Auditoria e Testes do Desenvolvedor"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dev</span>
          </button>
        </div>

        {/* Driver Quick Selector when in Driver Role */}
        {currentRole === 'DRIVER' && availableDrivers.length > 0 && (
          <div className="hidden md:flex items-center gap-2 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
            <span className="text-slate-400">Conta:</span>
            <select
              value={activeDriverId}
              onChange={(e) => onSelectDriverId(e.target.value)}
              className="bg-slate-900 text-white rounded px-2 py-1 border border-slate-700 text-xs outline-none focus:border-emerald-500 cursor-pointer"
            >
              {availableDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.regulatoryStatus === 'APPROVED' ? '🟢 Aprovado' : '🟡 ' + d.regulatoryStatus}
                </option>
              ))}
              <option value="new">+ Cadastrar Novo Motorista</option>
            </select>
          </div>
        )}

        {/* Legal & Info Links */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400">
          <button
            onClick={() => onOpenLegal('termos')}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Termos
          </button>
          <span>•</span>
          <button
            onClick={() => onOpenLegal('privacidade')}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Privacidade LGPD
          </button>
        </div>
      </div>
    </header>
  );
};
