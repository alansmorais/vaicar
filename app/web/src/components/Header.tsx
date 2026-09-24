import React, { useState } from 'react';
import { 
  Car, 
  Bike, 
  ShieldCheck, 
  User, 
  Compass, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  Sparkles,
  Shield,
  Code2,
  HelpCircle,
  LogIn,
  UserPlus
} from 'lucide-react';
import { UserRole } from '../types.ts';

interface HeaderProps {
  currentRole: UserRole | null;
  onSelectRole: (role: UserRole | null, extra?: { mode?: string }) => void;
  onLogout?: () => void;
  passengerName?: string;
  passengerAvatar?: string;
  activeDriverId?: string;
  onSelectDriverId?: (id: string) => void;
  availableDrivers?: { id: string; name: string; regulatoryStatus: string }[];
  onOpenLegal?: (tab: 'termos' | 'privacidade' | 'regulacao' | 'seguranca') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onSelectRole,
  onLogout,
  passengerName,
  passengerAvatar,
  activeDriverId,
  onSelectDriverId,
  availableDrivers = [],
  onOpenLegal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState<'LOGIN' | 'REGISTER' | null>(null);

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        setTimeout(() => {
          const el = document.getElementById(sectionId);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else if (sectionId === 'inicio') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }
  };

  const handleAuthAction = (role: UserRole, mode?: string) => {
    setAuthModalOpen(null);
    setMobileMenuOpen(false);
    onSelectRole(role, mode ? { mode } : undefined);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 text-white">
        {/* Top Mini Strip for City & Trust Context */}
        <div className="bg-slate-900 border-b border-slate-800/60 px-4 py-1 text-[11px] text-slate-400">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-300">São Sebastião • SP</span>
              <span className="text-slate-600 hidden sm:inline">|</span>
              <span className="hidden sm:inline text-slate-400">Plataforma local de intermediação de corridas e entregas</span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              {onOpenLegal && (
                <>
                  <button
                    onClick={() => onOpenLegal('seguranca')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Segurança
                  </button>
                  <span className="text-slate-700">•</span>
                  <button
                    onClick={() => onOpenLegal('termos')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer hidden sm:inline"
                  >
                    Termos
                  </button>
                </>
              )}
              {currentRole && onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold bg-slate-800/60 hover:bg-slate-800 px-2 py-0.5 rounded transition-all cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sair do Painel</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (currentRole) onSelectRole(null);
                scrollToSection('inicio');
              }}
              className="flex items-center gap-2.5 text-left group bg-transparent border-0 p-0 cursor-pointer"
              title="VaiCar São Sebastião - Início"
            >
              <img
                src="https://raw.githubusercontent.com/alansmorais/vaicar/refs/heads/main/images/vaicar_logo.png"
                alt="Logo VaiCar"
                className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500/80 shadow-md group-hover:scale-105 transition-transform shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="font-black text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  Vai<span className="text-emerald-400">Car</span>
                </span>
                <span className="text-[10px] text-slate-400 block -mt-1 font-medium">São Sebastião</span>
              </div>
            </button>
          </div>

          {/* Zone 2: Desktop Navigation Links (Landing Page Mode) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300" aria-label="Navegação principal">
            <button
              onClick={() => scrollToSection('inicio')}
              className="hover:text-white transition-colors cursor-pointer py-1"
            >
              Início
            </button>
            <button
              onClick={() => scrollToSection('corridas')}
              className="hover:text-white transition-colors cursor-pointer py-1"
            >
              Corridas
            </button>
            <button
              onClick={() => scrollToSection('entregas')}
              className="hover:text-white transition-colors cursor-pointer py-1"
            >
              Entregas
            </button>
            <button
              onClick={() => scrollToSection('motoristas')}
              className="hover:text-white transition-colors cursor-pointer py-1"
            >
              Motoristas
            </button>
            <button
              onClick={() => scrollToSection('seguranca')}
              className="hover:text-white transition-colors cursor-pointer py-1"
            >
              Segurança
            </button>
            <button
              onClick={() => scrollToSection('como-funciona')}
              className="hover:text-white transition-colors cursor-pointer py-1"
            >
              Como funciona
            </button>
          </nav>

          {/* Zone 3: Actions / Role Status */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* If Logged In as Passenger or Driver */}
            {currentRole === 'PASSENGER' && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                {passengerAvatar ? (
                  <img
                    src={passengerAvatar}
                    alt={passengerName || 'Passageiro'}
                    className="w-6 h-6 rounded-lg object-cover border border-emerald-500/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
                <span className="text-xs font-bold text-white max-w-[120px] truncate hidden sm:inline">
                  {passengerName || 'Passageiro'}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">Online</span>
              </div>
            )}

            {currentRole === 'DRIVER' && availableDrivers.length > 0 && onSelectDriverId && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400">Conta:</span>
                <select
                  value={activeDriverId}
                  onChange={(e) => onSelectDriverId(e.target.value)}
                  aria-label="Selecionar conta de motorista"
                  className="bg-slate-950 text-white rounded px-2 py-0.5 border border-slate-700 text-xs outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.regulatoryStatus === 'APPROVED' ? '🟢' : '🟡'}
                    </option>
                  ))}
                  <option value="new">+ Cadastrar Novo</option>
                </select>
              </div>
            )}

            {/* If no role is active (Public Landing Mode) */}
            {!currentRole && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuthModalOpen('LOGIN')}
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  Entrar
                </button>
                <button
                  onClick={() => setAuthModalOpen('REGISTER')}
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
                >
                  Cadastrar
                </button>
              </div>
            )}

            {/* Quick Demo Access Pills (Admin / Dev) */}
            <div className="hidden xl:flex items-center gap-1 border-l border-slate-800 pl-2">
              <button
                onClick={() => onSelectRole('ADMIN')}
                className={`p-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  currentRole === 'ADMIN' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Painel Administrativo"
              >
                <Shield className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onSelectRole('DEV')}
                className={`p-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  currentRole === 'DEV' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Auditoria e Logs Técnicos"
              >
                <Code2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile Burger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu de navegação'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 py-6 space-y-4 animate-fade-in shadow-2xl">
            <div className="grid grid-cols-2 gap-2 text-sm font-medium">
              <button
                onClick={() => scrollToSection('inicio')}
                className="p-3 bg-slate-900/90 rounded-xl text-left text-slate-200 hover:text-emerald-400 border border-slate-800"
              >
                Início
              </button>
              <button
                onClick={() => scrollToSection('corridas')}
                className="p-3 bg-slate-900/90 rounded-xl text-left text-slate-200 hover:text-emerald-400 border border-slate-800"
              >
                Corridas
              </button>
              <button
                onClick={() => scrollToSection('entregas')}
                className="p-3 bg-slate-900/90 rounded-xl text-left text-slate-200 hover:text-emerald-400 border border-slate-800"
              >
                Entregas
              </button>
              <button
                onClick={() => scrollToSection('motoristas')}
                className="p-3 bg-slate-900/90 rounded-xl text-left text-slate-200 hover:text-emerald-400 border border-slate-800"
              >
                Motoristas
              </button>
              <button
                onClick={() => scrollToSection('seguranca')}
                className="p-3 bg-slate-900/90 rounded-xl text-left text-slate-200 hover:text-emerald-400 border border-slate-800"
              >
                Segurança
              </button>
              <button
                onClick={() => scrollToSection('como-funciona')}
                className="p-3 bg-slate-900/90 rounded-xl text-left text-slate-200 hover:text-emerald-400 border border-slate-800"
              >
                Como funciona
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAuthModalOpen('LOGIN');
                }}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl border border-slate-700 text-sm flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>Entrar no VaiCar</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAuthModalOpen('REGISTER');
                }}
                className="w-full py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                <UserPlus className="w-4 h-4" />
                <span>Cadastre-se Grátis</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 px-1">
              <button onClick={() => onSelectRole('ADMIN')} className="hover:text-emerald-400">
                Painel Admin
              </button>
              <span>•</span>
              <button onClick={() => onSelectRole('DEV')} className="hover:text-amber-400">
                Painel Dev
              </button>
              <span>•</span>
              {onOpenLegal && (
                <button onClick={() => onOpenLegal('seguranca')} className="hover:text-white">
                  Regras de Segurança
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Auth / Role Switch Quick Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setAuthModalOpen(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-950 rounded-full border border-slate-800 cursor-pointer"
              aria-label="Fechar janela"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2 text-center">
              <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl mb-1">
                {authModalOpen === 'LOGIN' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
              </div>
              <h3 className="text-xl font-black text-white">
                {authModalOpen === 'LOGIN' ? 'Como deseja acessar o VaiCar?' : 'Cadastre-se no VaiCar'}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Escolha o seu perfil para acessar a plataforma em São Sebastião.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleAuthAction('PASSENGER', 'ride')}
                className="w-full p-4 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-2xl text-left flex items-center justify-between group cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500/20">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Passageiro / Envio</h4>
                    <p className="text-[11px] text-slate-400">Pedir corridas ou solicitar entregas locais</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => handleAuthAction('DRIVER')}
                className="w-full p-4 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-2xl text-left flex items-center justify-between group cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500/20">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Motorista / Entregador</h4>
                    <p className="text-[11px] text-slate-400">Trabalhar com 10% por serviço ou plano mensal</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-500">
              Ambiente seguro em conformidade com as regras da plataforma VaiCar.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
