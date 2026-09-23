import React from 'react';
import { Car, Shield, User, Compass, LogOut, CheckCircle2, Code2 } from 'lucide-react';
import { UserRole } from '../types.ts';

interface HeaderProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onLogout?: () => void;
  passengerName?: string;
  passengerAvatar?: string;
  activeDriverId: string;
  onSelectDriverId: (id: string) => void;
  availableDrivers: { id: string; name: string; regulatoryStatus: string }[];
  onOpenLegal: (tab: 'termos' | 'privacidade' | 'regulacao') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onSelectRole,
  onLogout,
  passengerName,
  passengerAvatar,
  activeDriverId,
  onSelectDriverId,
  availableDrivers,
  onOpenLegal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      {/* Top Notification / Regulatory Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-2 sm:px-3 py-1 text-xs font-medium text-emerald-50 flex items-center justify-between gap-1.5 overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-emerald-950/70 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border border-emerald-400/30">
            São Sebastião • SP
          </span>
          <button
            onClick={() => onOpenLegal('regulacao')}
            className="underline hover:text-white cursor-pointer text-[11px] truncate max-w-[120px] sm:max-w-none"
          >
            Regulação Municipal
          </button>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-[11px] font-bold bg-slate-950/40 hover:bg-slate-950/70 px-2 py-0.5 rounded border border-white/20 hover:text-white cursor-pointer transition-colors"
            title="Sair ou trocar de perfil"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">Trocar Perfil / Sair</span>
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 h-16 flex items-center justify-between gap-1 sm:gap-4 overflow-hidden">
        {/* Logo & City Identity */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            onClick={() => onSelectRole('PASSENGER')}
            className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer group"
          >
            <img
              src="https://raw.githubusercontent.com/alansmorais/vaicar/refs/heads/main/images/vaicar_logo.png"
              alt="VaiCar Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-emerald-500/80 shadow-lg group-hover:scale-105 transition-transform shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-base sm:text-xl tracking-tight text-white">
                  Vai<span className="text-emerald-400">Car</span>
                </span>
                <span className="text-[9px] sm:text-[10px] bg-slate-800 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-bold">
                  MVP
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 leading-none hidden min-[480px]:block">
                São Sebastião • Litoral Norte
              </p>
            </div>
          </div>
        </div>

        {/* Right side controls: Profile Badge + Global Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Passenger Profile Badge (When logged in as Passenger) */}
          {currentRole === 'PASSENGER' && (
            <div className="hidden min-[500px]:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 py-1 px-2.5 rounded-xl">
              {passengerAvatar ? (
                <img
                  src={passengerAvatar}
                  alt={passengerName || 'Passageiro'}
                  className="w-7 h-7 rounded-lg object-cover border border-emerald-500/50"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-bold text-white truncate max-w-[100px] sm:max-w-[140px]">
                  {passengerName || 'Passageiro'}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Conectado</span>
                </div>
              </div>
            </div>
          )}

          {/* Role Switcher Pills - ALWAYS VISIBLE */}
          <div className="flex items-center bg-slate-800/90 p-0.5 sm:p-1 rounded-xl border border-slate-700/60 shadow-inner shrink-0">
            <button
              id="role-passenger-btn"
              onClick={() => onSelectRole('PASSENGER')}
              className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'PASSENGER'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden min-[380px]:inline">Passageiro</span>
            </button>

            <button
              id="role-driver-btn"
              onClick={() => onSelectRole('DRIVER')}
              className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'DRIVER'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden min-[380px]:inline">Motorista</span>
            </button>

            <button
              id="role-admin-btn"
              onClick={() => onSelectRole('ADMIN')}
              className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'ADMIN'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>Admin</span>
            </button>

            <button
              id="role-dev-btn"
              onClick={() => onSelectRole('DEV')}
              className={`flex items-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'DEV'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Painel de Auditoria e Testes do Desenvolvedor"
            >
              <Code2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden sm:inline">Dev</span>
            </button>
          </div>
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
