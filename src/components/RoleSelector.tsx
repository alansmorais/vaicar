import React from 'react';
import { User, Car, ShieldCheck, Shield } from 'lucide-react';
import { UserRole } from '../types.ts';

interface RoleSelectorProps {
  onSelect: (role: UserRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelect }) => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-8 max-w-2xl mx-auto">
      <div className="space-y-4 flex flex-col items-center">
        <img
          src="https://raw.githubusercontent.com/alansmorais/vaicar/refs/heads/main/images/vaicar_logo.png"
          alt="VaiCar Logo"
          className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500/80 shadow-xl"
          referrerPolicy="no-referrer"
        />
        <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Transporte Legalizado • São Sebastião SP</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Como deseja acessar o <span className="text-emerald-400">VaiCar</span>?
        </h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Selecione seu perfil para entrar diretamente na sua conta e salvar suas preferências no seu dispositivo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <button
          id="btn-select-passenger"
          onClick={() => onSelect('PASSENGER')}
          className="bg-slate-900 hover:bg-emerald-950/40 border-2 border-slate-800 hover:border-emerald-500 p-6 sm:p-8 rounded-3xl transition-all flex flex-col items-center gap-4 text-center cursor-pointer group shadow-lg hover:shadow-emerald-500/10"
        >
          <div className="p-4 bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 rounded-2xl transition-all group-hover:scale-110">
            <User className="w-9 h-9" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors">
              Passageiro
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Solicitar viagens com motoristas legalizados, preço justo e sem taxas abusivas.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-xl">
            Acessar como Passageiro →
          </span>
        </button>

        <button
          id="btn-select-driver"
          onClick={() => onSelect('DRIVER')}
          className="bg-slate-900 hover:bg-emerald-950/40 border-2 border-slate-800 hover:border-emerald-500 p-6 sm:p-8 rounded-3xl transition-all flex flex-col items-center gap-4 text-center cursor-pointer group shadow-lg hover:shadow-emerald-500/10"
        >
          <div className="p-4 bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 rounded-2xl transition-all group-hover:scale-110">
            <Car className="w-9 h-9" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors">
              Motorista
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Credenciamento municipal, 0% de comissão por viagem e plano fixo mensal.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl group-hover:border-emerald-500/50">
            Painel do Motorista →
          </span>
        </button>
      </div>

      {/* Direct link to Admin Panel */}
      <div className="pt-2">
        <button
          id="btn-select-admin-direct"
          onClick={() => onSelect('ADMIN')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-400 bg-slate-900/80 hover:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all shadow-md"
        >
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Acessar Painel do Administrador (Tarifas, E-mail & Gestão)</span>
        </button>
      </div>
    </div>
  );
};
