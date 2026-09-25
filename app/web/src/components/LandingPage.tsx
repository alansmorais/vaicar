import React, { useEffect, useState } from 'react';
import { 
  Car, 
  Bike, 
  MapPin, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  TrendingUp, 
  CheckCircle2, 
  Package, 
  Clock, 
  Users, 
  Shield, 
  Eye, 
  HeartHandshake, 
  Sparkles,
  ChevronRight,
  Send,
  Navigation,
  Check
} from 'lucide-react';
import { UserRole } from '../types.ts';
import { FaqSection, FAQ_ITEMS } from './FaqSection.tsx';

interface LandingPageProps {
  onSelectRole: (role: UserRole, extra?: { mode?: string }) => void;
  onOpenLegal?: (tab: 'termos' | 'privacidade' | 'regulacao' | 'seguranca') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole, onOpenLegal }) => {
  // Navigation path based on URL pathname for SEO landing subpages
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  // Handle SPA routing on window state push/pop
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // SEO configuration mapping
  let seoTitle = 'VaiCar — A sua alternativa local para corridas e entregas em São Sebastião';
  let seoDescription = 'O VaiCar é uma plataforma tecnológica de intermediação que conecta passageiros, motoristas e entregadores parceiros em São Sebastião.';
  let h1Text = 'A sua alternativa local para corridas e entregas em São Sebastião';

  if (currentPath === '/uber-alternativa-sao-sebastiao') {
    seoTitle = 'Alternativa à Uber em São Sebastião | Aplicativo Local VaiCar';
    seoDescription = 'Procurando uma alternativa à Uber em São Sebastião SP? Conheça o VaiCar. Conexão direta entre passageiros e motoristas da região.';
    h1Text = 'A sua alternativa à Uber em São Sebastião';
  } else if (currentPath === '/99-alternativa-sao-sebastiao') {
    seoTitle = 'Alternativa à 99 em São Sebastião | VaiCar';
    seoDescription = 'Conheça o VaiCar em São Sebastião. Aplicativo local que conecta motoristas e passageiros com transparência e segurança.';
    h1Text = 'A sua alternativa à 99 em São Sebastião';
  } else if (currentPath === '/entregas-sao-sebastiao') {
    seoTitle = 'Serviço de Entregas São Sebastião | VaiCar';
    seoDescription = 'Solicite entregas expressas em São Sebastião. Envio exclusivo por motocicletas e bicicletas.';
    h1Text = 'Serviço local de entregas expressas em São Sebastião';
  } else if (currentPath === '/entrega-moto-sao-sebastiao') {
    seoTitle = 'Entrega de Moto em São Sebastião | VaiCar';
    seoDescription = 'Precisa de entrega rápida por moto em São Sebastião SP? Conecte-se a entregadores de moto pelo VaiCar.';
    h1Text = 'Entrega de Moto em São Sebastião';
  } else if (currentPath === '/entrega-bike-sao-sebastiao') {
    seoTitle = 'Entrega de Bicicleta em São Sebastião | VaiCar';
    seoDescription = 'Envios de pequenas encomendas e documentos por bicicleta em São Sebastião.';
    h1Text = 'Entrega de Bicicleta em São Sebastião';
  } else if (currentPath === '/motorista-sao-sebastiao') {
    seoTitle = 'Cadastro de Motoristas e Entregadores em São Sebastião | VaiCar';
    seoDescription = 'Trabalhe com transporte ou entregas em São Sebastião. Escolha seu modelo: 10% por corrida ou R$100 por mês.';
    h1Text = 'Cadastro de Motoristas e Entregadores em São Sebastião';
  }

  // Update Document Head
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = seoTitle;
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) {
        descMeta.setAttribute('content', seoDescription);
      }
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', `https://vaicar-sao-sebastiao.com.br${currentPath}`);
    }
  }, [currentPath, seoTitle, seoDescription]);

  // JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TaxiService",
        "name": "VaiCar São Sebastião",
        "description": seoDescription,
        "provider": {
          "@type": "LocalBusiness",
          "name": "VaiCar",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "São Sebastião",
            "addressRegion": "SP",
            "addressCountry": "BR"
          },
          "telephone": "+55-12-99999-9999",
          "priceRange": "R$"
        },
        "areaServed": {
          "@type": "AdministrativeArea",
          "name": "São Sebastião, São Paulo, Brasil"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": Array.isArray(item.answer) ? item.answer.join("\n\n") : item.answer
          }
        }))
      }
    ]
  };

  return (
    <div className="w-full bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>

      {/* SUBPAGE BACK BUTTON */}
      {currentPath !== '/' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <button 
            onClick={() => navigateTo('/')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-slate-850 px-4 py-2.5 rounded-xl border border-slate-800 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Página Inicial</span>
          </button>
        </div>
      )}

      {/* MAIN HOMEPAGE CONTENT */}
      {currentPath === '/' ? (
        <div className="space-y-14 sm:space-y-20 pb-20">
          
          {/* ======================================================
              1. HERO SECTION
          ====================================================== */}
          <section id="inicio" className="relative pt-6 sm:pt-10 pb-2 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[400px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
              {/* Left Column: Headline, Description, Trust Row, CTAs */}
              <div className="lg:col-span-7 text-left space-y-5 sm:space-y-6">
                {/* Category & Region Kicker */}
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Mobilidade Urbana & Entregas</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400">São Sebastião, SP</span>
                </div>

                {/* Exact Requested Headline */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15] text-balance">
                  A sua alternativa local para corridas e entregas em <span className="text-emerald-400">São Sebastião</span>
                </h1>

                {/* Exact Requested Supporting Text */}
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl text-balance">
                  O VaiCar é uma plataforma tecnológica de intermediação que conecta passageiros, motoristas e entregadores parceiros em São Sebastião.
                </p>

                {/* Compact Factual Trust Row */}
                <div className="pt-1 pb-1">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-x-4 sm:gap-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Motoristas com cadastro e documentação exigida</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Identificação prévia do motorista</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Atendimento e suporte da plataforma</span>
                    </div>
                  </div>
                </div>

                {/* Hero Primary and Secondary CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 max-w-lg">
                  {/* Primary Hero CTA: Filled Green */}
                  <button
                    onClick={() => onSelectRole('PASSENGER', { mode: 'ride' })}
                    className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-black rounded-lg shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 transition-all cursor-pointer text-sm group"
                  >
                    <Car className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>Quero pedir uma corrida</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Secondary Hero CTA: Outline Ghost */}
                  <button
                    onClick={() => onSelectRole('PASSENGER', { mode: 'delivery' })}
                    className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-slate-900/90 hover:bg-slate-850 active:scale-[0.99] border border-slate-700 hover:border-emerald-500/60 text-slate-100 font-bold rounded-lg transition-all cursor-pointer text-sm group"
                  >
                    <Package className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Quero enviar uma entrega</span>
                    <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Right Column: Native VaiCar App Phone Mockup Visual */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-full max-w-[320px] sm:max-w-[340px] bg-slate-900/90 rounded-[24px] border border-slate-800 shadow-2xl p-3.5 space-y-3 backdrop-blur-sm hover:border-slate-700 transition-all">
                  {/* Phone Top Notch / Header */}
                  <div className="flex items-center justify-between px-1.5 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-[10px] font-bold text-slate-300">VaiCar App</span>
                    </div>
                    <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
                    <span className="text-[10px] font-mono text-slate-400">São Sebastião</span>
                  </div>

                  {/* Simulated App Map & Route Interface */}
                  <div className="relative h-44 rounded-xl bg-slate-950 border border-slate-800/90 overflow-hidden flex flex-col justify-between p-3">
                    <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:14px_14px] opacity-15"></div>
                    <div className="absolute -right-6 top-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>

                    {/* Route Addresses */}
                    <div className="relative z-10 space-y-1.5">
                      <div className="flex items-center gap-2 bg-slate-900/95 border border-slate-800 px-2.5 py-1.5 rounded-lg shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] text-slate-400 block leading-tight">Origem</span>
                          <span className="text-[11px] font-bold text-white truncate block">Centro Histórico · São Sebastião</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900/95 border border-slate-800 px-2.5 py-1.5 rounded-lg shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] text-slate-400 block leading-tight">Destino</span>
                          <span className="text-[11px] font-bold text-white truncate block">Praia de Maresias</span>
                        </div>
                      </div>
                    </div>

                    {/* Mode selector strip inside mockup */}
                    <div className="relative z-10 flex items-center justify-between text-[10px] bg-slate-900/95 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-emerald-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Car className="w-3.5 h-3.5 text-emerald-400" /> Corrida Direta
                      </span>
                      <span className="font-mono text-[10px] text-slate-300">Preço transparente</span>
                    </div>
                  </div>

                  {/* Simulated Driver & Ride Details Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src="https://raw.githubusercontent.com/alansmorais/vaicar/refs/heads/main/images/vaicar_logo.png"
                          alt="VaiCar"
                          className="w-7 h-7 rounded-md object-cover border border-emerald-500/40 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">Motorista Cadastrado</span>
                          <span className="text-[10px] text-slate-400 block">Veículo identificado · Suporte local</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/90 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        Ativo
                      </span>
                    </div>

                    {/* Interactive Button in Mockup */}
                    <button
                      onClick={() => onSelectRole('PASSENGER', { mode: 'ride' })}
                      className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Solicitar Viagem</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ======================================================
              2. USER JOURNEYS (The 4 Audiences with Enhanced Hierarchy)
          ====================================================== */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Audience 1: Passageiro (Primary Audience) */}
              <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-emerald-500/60 shadow-lg shadow-emerald-500/5 transition-all">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <Car className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Passageiro</div>
                  </div>
                  <h3 className="text-base font-bold text-white">Precisa de transporte?</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Solicite viagens individuais com transparência e identificação prévia do veículo.
                  </p>
                </div>
                <button
                  onClick={() => onSelectRole('PASSENGER', { mode: 'ride' })}
                  className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors shadow-sm"
                >
                  <span>Quero pedir uma corrida</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Audience 2: Cliente de Entrega (Secondary Audience) */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-800/80 text-emerald-400 rounded-lg">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cliente de Entrega</div>
                  </div>
                  <h3 className="text-base font-bold text-white">Precisa enviar algo?</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Envie encomendas leves e documentos de moto ou bike em São Sebastião.
                  </p>
                </div>
                <button
                  onClick={() => onSelectRole('PASSENGER', { mode: 'delivery' })}
                  className="w-full py-2.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-emerald-400 font-bold rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>Quero enviar uma entrega</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Audience 3: Motorista (Primary Audience) */}
              <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-emerald-500/60 shadow-lg shadow-emerald-500/5 transition-all">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <Car className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Motorista</div>
                  </div>
                  <h3 className="text-base font-bold text-white">Tem veículo próprio?</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Trabalhe com transporte de passageiros escolhendo 10% por corrida ou R$100/mês.
                  </p>
                </div>
                <button
                  onClick={() => onSelectRole('DRIVER')}
                  className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors shadow-sm"
                >
                  <span>Quero dirigir com o VaiCar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Audience 4: Entregador (Secondary Audience) */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-800/80 text-emerald-400 rounded-lg">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Entregador</div>
                  </div>
                  <h3 className="text-base font-bold text-white">Tem moto ou bicicleta?</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Faça entregas expressas com planos transparentes para bike (R$49/mês) ou moto (R$79/mês).
                  </p>
                </div>
                <button
                  onClick={() => onSelectRole('DRIVER')}
                  className="w-full py-2.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-emerald-400 font-bold rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>Quero fazer entregas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>

          {/* ======================================================
              3. CORRIDAS (Passenger Rides) & 4. ENTREGAS (Deliveries)
          ====================================================== */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Nossos Serviços
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                Soluções transparentes para transporte de pessoas e envio de encomendas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* 3. CORRIDAS */}
              <div id="corridas" className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl w-fit">
                      <Car className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-slate-400">Passageiros</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-black text-white">Corridas de Passageiros</h3>
                    <p className="text-xs text-slate-400">
                      Transporte individual de passageiros em São Sebastião.
                    </p>
                  </div>

                  {/* Concise Benefits */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3 text-xs text-slate-200">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Informações do motorista e veículo antes da viagem</span>
                    </div>
                    <div className="flex items-start gap-3 text-xs text-slate-200">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Verificação cadastral conforme os requisitos da plataforma</span>
                    </div>
                    <div className="flex items-start gap-3 text-xs text-slate-200">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Regras de segurança para passageiros e motoristas</span>
                    </div>
                  </div>

                  {/* Pricing Box */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                    <span className="text-[11px] text-slate-400 block font-medium">Modelo para motoristas:</span>
                    <div className="flex items-baseline gap-2 text-sm font-bold text-white">
                      <span className="text-emerald-400">10% por corrida</span>
                      <span className="text-slate-500 text-xs font-normal">OU</span>
                      <span className="text-emerald-400">R$100/mês</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectRole('PASSENGER', { mode: 'ride' })}
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10 transition-all"
                >
                  <span>Quero pedir uma corrida</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 4. ENTREGAS (Deliveries) */}
              <div id="entregas" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                      <Bike className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-slate-400">Exclusivo Moto & Bike</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-black text-white">Serviço de Entregas</h3>
                    <p className="text-xs text-slate-400">
                      Envie produtos, documentos e outros itens permitidos em São Sebastião.
                    </p>
                  </div>

                  {/* Pricing Structure for Deliveries */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <span className="text-base">🚲</span>
                        <span>Bicicleta</span>
                      </div>
                      <div className="text-xs text-slate-300 font-semibold space-y-0.5">
                        <p>10% por entrega</p>
                        <p className="text-[11px] text-slate-500">OU</p>
                        <p className="text-emerald-400 font-bold">R$49/mês</p>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <span className="text-base">🏍️</span>
                        <span>Motocicleta</span>
                      </div>
                      <div className="text-xs text-slate-300 font-semibold space-y-0.5">
                        <p>10% por entrega</p>
                        <p className="text-[11px] text-slate-500">OU</p>
                        <p className="text-emerald-400 font-bold">R$79/mês</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <span className="font-semibold text-slate-300">Atenção:</span> Entregas realizadas exclusivamente por bicicletas e motocicletas (sem transporte de carga pesada ou carro).
                  </div>
                </div>

                <button
                  onClick={() => onSelectRole('PASSENGER', { mode: 'delivery' })}
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-emerald-500/50 text-white font-black rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Quero enviar uma entrega</span>
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>
          </section>

          {/* ======================================================
              5. HOW IT WORKS ("Como funciona" - 4 Steps)
          ====================================================== */}
          <section id="como-funciona" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Como funciona
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Simples, direto e transparente em 4 passos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Step 01 */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3 relative hover:border-slate-700 transition-all">
                <div className="text-2xl font-black text-emerald-400 tabular-nums">01</div>
                <h3 className="text-base font-bold text-white">Escolha</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Corrida de passageiros ou envio de entrega expressa.
                </p>
              </div>

              {/* Step 02 */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3 relative hover:border-slate-700 transition-all">
                <div className="text-2xl font-black text-emerald-400 tabular-nums">02</div>
                <h3 className="text-base font-bold text-white">Informe</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Origem, destino e informações necessárias da viagem ou item.
                </p>
              </div>

              {/* Step 03 */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3 relative hover:border-slate-700 transition-all">
                <div className="text-2xl font-black text-emerald-400 tabular-nums">03</div>
                <h3 className="text-base font-bold text-white">Conecte</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O VaiCar conecta você ao motorista ou entregador parceiro.
                </p>
              </div>

              {/* Step 04 */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3 relative hover:border-slate-700 transition-all">
                <div className="text-2xl font-black text-emerald-400 tabular-nums">04</div>
                <h3 className="text-base font-bold text-white">Finalize</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Acompanhe o serviço até a conclusão e pague com transparência.
                </p>
              </div>
            </div>
          </section>

          {/* ======================================================
              6. FOR DRIVERS AND COURIERS ("Trabalhe com o VaiCar")
          ====================================================== */}
          <section id="motoristas" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Trabalhe com o VaiCar
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                Autonomia e modelos comerciais justos para motoristas e entregadores em São Sebastião.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Motorista */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                    <Car className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide">Motorista</h3>
                  <p className="text-xs text-slate-400">Transporte individual de passageiros</p>
                  
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <div className="text-sm font-bold text-white">10% por corrida</div>
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">ou</div>
                    <div className="text-xl font-black text-emerald-400">R$100<span className="text-xs font-normal text-slate-400">/mês</span></div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectRole('DRIVER')}
                  className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Cadastrar como Motorista</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              </div>

              {/* Card 2: Entregador de Bicicleta */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                    <Bike className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide">Entregador de Bicicleta</h3>
                  <p className="text-xs text-slate-400">Envios locais e pequenas encomendas</p>
                  
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <div className="text-sm font-bold text-white">10% por entrega</div>
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">ou</div>
                    <div className="text-xl font-black text-emerald-400">R$49<span className="text-xs font-normal text-slate-400">/mês</span></div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectRole('DRIVER')}
                  className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Cadastrar como Bike</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              </div>

              {/* Card 3: Entregador de Motocicleta */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                    <Navigation className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide">Entregador de Motocicleta</h3>
                  <p className="text-xs text-slate-400">Agilidade e maior cobertura entre bairros</p>
                  
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <div className="text-sm font-bold text-white">10% por entrega</div>
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">ou</div>
                    <div className="text-xl font-black text-emerald-400">R$79<span className="text-xs font-normal text-slate-400">/mês</span></div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectRole('DRIVER')}
                  className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Cadastrar como Moto</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              </div>
            </div>

            {/* Primary CTA for Work Section */}
            <div className="text-center pt-2">
              <button
                onClick={() => onSelectRole('DRIVER')}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-sm sm:text-base cursor-pointer shadow-lg shadow-emerald-500/15 transition-all"
              >
                Quero trabalhar com o VaiCar
              </button>
            </div>
          </section>

          {/* ======================================================
              7. SAFETY ("Segurança em primeiro lugar")
          ====================================================== */}
          <section id="seguranca" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Segurança em primeiro lugar
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Diretrizes claras de conduta e transparência em todas as viagens.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Card 1: Identificação */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-all">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                  <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Identificação</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Confira as informações do motorista e veículo antes de embarcar.
                </p>
              </div>

              {/* Card 2: Transparência */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-all">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Transparência</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  As informações relevantes da viagem ficam disponíveis na plataforma.
                </p>
              </div>

              {/* Card 3: Respeito */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-all">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Respeito</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Motoristas e passageiros devem seguir as regras de segurança e convivência.
                </p>
              </div>

              {/* Card 4: Entregas */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-all">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Entregas</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  O entregador visualiza as informações necessárias da entrega antes de aceitar.
                </p>
              </div>
            </div>
          </section>

          {/* ======================================================
              13. LOCAL MOBILITY GUIDE & COVERAGE (SEO Links & Locations)
          ====================================================== */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Guia de Mobilidade e Cobertura Local</h3>
                  <p className="text-xs text-slate-400">Atendimento e conexões em todo o município de São Sebastião</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                  <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">Centro</span>
                  <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">Maresias</span>
                  <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">Boiçucanga</span>
                  <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">Juquehy</span>
                  <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">Cambury</span>
                  <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">Topolândia</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                <button 
                  onClick={() => navigateTo('/uber-alternativa-sao-sebastiao')}
                  className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
                >
                  <span className="font-bold text-white">Alternativa à Uber</span>
                  <span className="text-[11px] text-slate-500">Conexão direta entre passageiros e motoristas locais</span>
                </button>
                <button 
                  onClick={() => navigateTo('/99-alternativa-sao-sebastiao')}
                  className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
                >
                  <span className="font-bold text-white">Alternativa à 99</span>
                  <span className="text-[11px] text-slate-500">Segurança, regras claras e transparência</span>
                </button>
                <button 
                  onClick={() => navigateTo('/entregas-sao-sebastiao')}
                  className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
                >
                  <span className="font-bold text-white">Entregas em São Sebastião</span>
                  <span className="text-[11px] text-slate-500">Serviço exclusivo de moto e bicicleta</span>
                </button>
                <button 
                  onClick={() => navigateTo('/entrega-moto-sao-sebastiao')}
                  className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
                >
                  <span className="font-bold text-white">Entrega de Moto (Motocicleta)</span>
                  <span className="text-[11px] text-slate-500">10% por entrega ou R$79/mês</span>
                </button>
                <button 
                  onClick={() => navigateTo('/entrega-bike-sao-sebastiao')}
                  className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
                >
                  <span className="font-bold text-white">Entrega de Bicicleta (Bike)</span>
                  <span className="text-[11px] text-slate-500">10% por entrega ou R$49/mês</span>
                </button>
                <button 
                  onClick={() => navigateTo('/motorista-sao-sebastiao')}
                  className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
                >
                  <span className="font-bold text-white">Seja Motorista ou Entregador</span>
                  <span className="text-[11px] text-slate-500">10% por serviço ou plano mensal</span>
                </button>
              </div>
            </div>
          </section>

          {/* ======================================================
              14. DÚVIDAS FREQUENTES (FAQ SECTION)
          ====================================================== */}
          <FaqSection />

        </div>
      ) : (
        /* ======================================================
            SEO SUBPAGES (Preserving Content with Redesigned Presentation)
        ====================================================== */
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <article className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-6">
            {currentPath === '/uber-alternativa-sao-sebastiao' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Mobilidade Local</span>
                  <h1 className="text-2xl sm:text-4xl font-black text-white">A sua alternativa à Uber em São Sebastião</h1>
                </div>

                <div className="text-sm text-slate-300 space-y-4 leading-relaxed">
                  <p>
                    Para moradores e visitantes no município de São Sebastião, o VaiCar conecta diretamente passageiros e motoristas locais através de uma plataforma simples e transparente.
                  </p>
                  <p>
                    Oferecemos aos motoristas parceiros um modelo claro e acessível: <strong>10% por corrida ou plano mensal de R$100</strong>. Isso permite que o motorista trabalhe com previsibilidade e que o passageiro conte com um serviço focado na realidade local da cidade.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                    <h2 className="font-bold text-white text-sm">Para o Passageiro</h2>
                    <ul className="text-xs text-slate-400 space-y-1.5">
                      <li>• Identificação do motorista e veículo antes de embarcar</li>
                      <li>• Pagamento direto ao motorista via PIX, Cartão ou Dinheiro</li>
                      <li>• Comunicação direta e suporte para ocorrências</li>
                    </ul>
                  </div>
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                    <h2 className="font-bold text-white text-sm">Para o Motorista</h2>
                    <ul className="text-xs text-slate-400 space-y-1.5">
                      <li>• Escolha entre 10% por corrida ou R$100/mês</li>
                      <li>• Autonomia nos seus trajetos e horários</li>
                      <li>• Cumprimento das regras de segurança e trânsito</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => onSelectRole('PASSENGER', { mode: 'ride' })}
                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs sm:text-sm text-center cursor-pointer transition-all"
                  >
                    Quero pedir uma corrida
                  </button>
                  <button
                    onClick={() => onSelectRole('DRIVER')}
                    className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-bold rounded-lg text-xs sm:text-sm text-center cursor-pointer transition-all"
                  >
                    Quero ser motorista parceiro
                  </button>
                </div>
              </div>
            )}

            {currentPath === '/99-alternativa-sao-sebastiao' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Transporte Local</span>
                  <h1 className="text-2xl sm:text-4xl font-black text-white">A sua alternativa à 99 em São Sebastião</h1>
                </div>
                
                <div className="text-sm text-slate-300 space-y-4 leading-relaxed">
                  <p>
                    O VaiCar é uma plataforma pensada para a mobilidade urbana de São Sebastião, conectando os bairros da região central, Costa Sul e Costa Norte.
                  </p>
                  <p>
                    A plataforma solicita aos motoristas as informações cadastrais necessárias e orienta passageiros e motoristas quanto às normas de conduta e segurança antes e durante a viagem.
                  </p>
                </div>

                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="font-bold text-white text-sm">Precisa se deslocar pela cidade?</h2>
                    <p className="text-xs text-slate-400">Consulte viagens e motoristas disponíveis pelo app.</p>
                  </div>
                  <button
                    onClick={() => onSelectRole('PASSENGER', { mode: 'ride' })}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-3 rounded-lg text-xs shrink-0 cursor-pointer transition-colors"
                  >
                    Quero pedir uma corrida
                  </button>
                </div>
              </div>
            )}

            {currentPath === '/entregas-sao-sebastiao' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Logística Expressa</span>
                  <h1 className="text-2xl sm:text-4xl font-black text-white">Serviço de Entregas em São Sebastião</h1>
                </div>
                
                <div className="text-sm text-slate-300 space-y-4 leading-relaxed">
                  <p>
                    Envie produtos, encomendas leves, documentos e refeições pelas ruas de São Sebastião através de entregadores de bicicleta ou motocicleta.
                  </p>
                  <p className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/20 text-emerald-300">
                    <strong>As entregas do VaiCar são realizadas exclusivamente por bicicletas e motocicletas (não oferecemos entrega por carro).</strong>
                  </p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                  <h2 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Regras de Segurança para Envio de Itens
                  </h2>
                  <ul className="text-xs text-slate-400 space-y-2">
                    <li>• <strong>Itens Proibidos:</strong> É estritamente proibido o envio de substâncias ilícitas, armas, produtos químicos perigosos ou inflamáveis.</li>
                    <li>• <strong>Declaração de Conteúdo:</strong> O remetente deve informar categoria, descrição e dimensões reais do item.</li>
                    <li>• <strong>Direito de Recusa:</strong> O entregador pode recusar a entrega caso o item não corresponda ao declarado ou apresente risco.</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onSelectRole('PASSENGER', { mode: 'delivery' })}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs sm:text-sm cursor-pointer transition-all"
                  >
                    Quero enviar uma entrega
                  </button>
                </div>
              </div>
            )}

            {currentPath === '/entrega-moto-sao-sebastiao' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Entregas de Moto</span>
                  <h1 className="text-2xl sm:text-4xl font-black text-white">Entrega de Moto em São Sebastião</h1>
                </div>
                
                <div className="text-sm text-slate-300 space-y-4 leading-relaxed">
                  <p>
                    Para envios mais rápidos ou trajetos entre bairros distantes no município, a entrega por motocicleta oferece agilidade e praticidade.
                  </p>
                  <p>
                    Modelos para entregadores de moto: <strong>10% por entrega ou R$79 por mês</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => onSelectRole('PASSENGER', { mode: 'delivery' })}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-4 rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    Quero enviar uma entrega 🏍️
                  </button>
                  <button
                    onClick={() => onSelectRole('DRIVER')}
                    className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold p-4 rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    Quero ser entregador de moto
                  </button>
                </div>
              </div>
            )}

            {currentPath === '/entrega-bike-sao-sebastiao' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Entregas de Bike</span>
                  <h1 className="text-2xl sm:text-4xl font-black text-white">Entrega de Bicicleta em São Sebastião</h1>
                </div>
                
                <div className="text-sm text-slate-300 space-y-4 leading-relaxed">
                  <p>
                    Para pequenas encomendas, documentos e refeições em trajetos curtos no mesmo bairro, a entrega por bicicleta é uma opção prática e sustentável.
                  </p>
                  <p>
                    Modelos para entregadores de bicicleta: <strong>10% por entrega ou R$49 por mês</strong>.
                  </p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                  <h2 className="font-bold text-white text-xs">Limites sugeridos para entregas de bicicleta</h2>
                  <ul className="text-xs text-slate-400 space-y-1.5">
                    <li>• Peso máximo recomendado: 5 kg</li>
                    <li>• Dimensões: O item deve caber confortavelmente em mochila térmica ou bag térmico padrão</li>
                    <li>• Distância ideal: Trajetos locais no bairro</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onSelectRole('PASSENGER', { mode: 'delivery' })}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs sm:text-sm cursor-pointer transition-all"
                  >
                    Quero enviar uma entrega de bike
                  </button>
                </div>
              </div>
            )}

            {currentPath === '/motorista-sao-sebastiao' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Parceiros</span>
                  <h1 className="text-2xl sm:text-4xl font-black text-white">Cadastro de Motoristas e Entregadores em São Sebastião</h1>
                </div>
                
                <div className="text-sm text-slate-300 space-y-4 leading-relaxed">
                  <p>
                    Se você deseja realizar viagens ou entregas através da plataforma VaiCar em São Sebastião, realize seu cadastro informando seus dados e a documentação exigida.
                  </p>
                  <p>
                    Modelos comerciais disponíveis:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                    <li><strong>Motoristas de carro (passageiros):</strong> 10% por corrida ou R$100/mês</li>
                    <li><strong>Entregadores de motocicleta:</strong> 10% por entrega ou R$79/mês</li>
                    <li><strong>Entregadores de bicicleta:</strong> 10% por entrega ou R$49/mês</li>
                  </ul>
                </div>

                <button
                  onClick={() => onSelectRole('DRIVER')}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 px-4 rounded-lg text-xs sm:text-sm cursor-pointer transition-all"
                >
                  Quero trabalhar com o VaiCar
                </button>
              </div>
            )}
          </article>
        </div>
      )}

      {/* ======================================================
          QUIET FOOTER (Brand, Coverage & Legal Notices)
      ====================================================== */}
      <footer className="border-t border-slate-900 bg-slate-950 pt-12 pb-16 text-slate-400 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Col 1: Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <img
                  src="https://raw.githubusercontent.com/alansmorais/vaicar/refs/heads/main/images/vaicar_logo.png"
                  alt="VaiCar Logo"
                  className="w-7 h-7 rounded-full object-cover border border-emerald-500/60"
                  referrerPolicy="no-referrer"
                />
                <span className="font-black text-base text-white">
                  Vai<span className="text-emerald-400">Car</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Plataforma tecnológica de intermediação que conecta passageiros, motoristas e entregadores parceiros em São Sebastião.
              </p>
            </div>

            {/* Col 2: Serviços */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Serviços</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li>
                  <button onClick={() => onSelectRole('PASSENGER', { mode: 'ride' })} className="hover:text-emerald-400 cursor-pointer">
                    Corridas de Passageiros
                  </button>
                </li>
                <li>
                  <button onClick={() => onSelectRole('PASSENGER', { mode: 'delivery' })} className="hover:text-emerald-400 cursor-pointer">
                    Entregas por Motocicleta
                  </button>
                </li>
                <li>
                  <button onClick={() => onSelectRole('PASSENGER', { mode: 'delivery' })} className="hover:text-emerald-400 cursor-pointer">
                    Entregas por Bicicleta
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Parceiros */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Parceiros</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li>
                  <button onClick={() => onSelectRole('DRIVER')} className="hover:text-emerald-400 cursor-pointer">
                    Quero ser Motorista
                  </button>
                </li>
                <li>
                  <button onClick={() => onSelectRole('DRIVER')} className="hover:text-emerald-400 cursor-pointer">
                    Quero ser Entregador
                  </button>
                </li>
                <li>
                  <button onClick={() => onSelectRole('ADMIN')} className="hover:text-slate-200 cursor-pointer">
                    Painel Administrativo
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Legal & Segurança */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Segurança & Legal</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li>
                  <a
                    href="#duvidas-frequentes"
                    onClick={(e) => {
                      if (currentPath !== '/') {
                        navigateTo('/');
                      }
                    }}
                    className="hover:text-emerald-400 cursor-pointer block"
                  >
                    Dúvidas Frequentes (FAQ)
                  </a>
                </li>
                {onOpenLegal && (
                  <>
                    <li>
                      <button onClick={() => onOpenLegal('seguranca')} className="hover:text-emerald-400 cursor-pointer">
                        Regras de Segurança
                      </button>
                    </li>
                    <li>
                      <button onClick={() => onOpenLegal('termos')} className="hover:text-emerald-400 cursor-pointer">
                        Termos de Uso
                      </button>
                    </li>
                    <li>
                      <button onClick={() => onOpenLegal('privacidade')} className="hover:text-emerald-400 cursor-pointer">
                        Privacidade & LGPD
                      </button>
                    </li>
                  </>
                )}
                <li>
                  <span className="text-slate-500">São Sebastião - SP</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} VaiCar Tecnologia. Todos os direitos reservados.</p>
            <p>Mobilidade e intermediação responsável em São Sebastião.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
