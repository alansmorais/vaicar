import React, { useEffect, useState } from 'react';
import { 
  Car, 
  Bike, 
  MapPin, 
  ShieldCheck, 
  Banknote, 
  Clock, 
  Users, 
  ChevronRight, 
  ArrowLeft, 
  TrendingUp, 
  CheckCircle,
  Package,
  FileText,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { UserRole } from '../types.ts';

interface LandingPageProps {
  onSelectRole: (role: UserRole, extra?: { mode?: string }) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  // Navigation path based on URL pathname
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
  let seoTitle = 'VaiCar — Mobilidade Urbana e Entregas em São Sebastião SP';
  let seoDescription = 'Alternativa local para corridas e entregas em São Sebastião - SP. Corridas de passageiros e entregas expressas de bicicleta ou motocicleta.';
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
      // Set Canonical Link
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
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-12 animate-fade-in">
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>

      {/* Header back button for subpages */}
      {currentPath !== '/' && (
        <button 
          onClick={() => navigateTo('/')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-400 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Página Inicial</span>
        </button>
      )}

      {/* Main Presentation / Hero Section */}
      <section className="text-center space-y-6 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Mobilidade Urbana e Entregas • São Sebastião SP</span>
        </div>
        
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          {h1Text.split('São Sebastião')[0]}
          <span className="text-emerald-400">São Sebastião</span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          O <strong>VaiCar</strong> é uma plataforma tecnológica de intermediação que conecta você a motoristas e entregadores parceiros em São Sebastião, oferecendo uma alternativa simples e transparente para mobilidade e entregas.
        </p>

        {/* CTA Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-4">
          <button
            onClick={() => onSelectRole('PASSENGER', { mode: 'ride' })}
            className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black rounded-2xl cursor-pointer shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all text-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-950/10 rounded-xl">
                <Car className="w-5 h-5 text-slate-950" />
              </div>
              <span className="text-left font-black leading-tight block">
                Quero pedir uma corrida
                <span className="text-[10px] opacity-75 font-bold block">Transporte individual de passageiros</span>
              </span>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onSelectRole('PASSENGER', { mode: 'delivery' })}
            className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-900 to-slate-900 hover:from-slate-850 hover:to-slate-850 border border-slate-700/80 hover:border-emerald-500/50 text-white font-black rounded-2xl cursor-pointer shadow-md hover:-translate-y-0.5 transition-all text-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500/20">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-left font-bold leading-tight block">
                Quero enviar uma entrega
                <span className="text-[10px] text-slate-400 font-bold block">Bicicleta ou Motocicleta</span>
              </span>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Professional / Drivers & Couriers CTA */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-400">
          <span>Trabalha com transporte ou entregas?</span>
          <button 
            onClick={() => onSelectRole('DRIVER')}
            className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
          >
            Quero ser motorista →
          </button>
          <span className="hidden sm:inline text-slate-700">•</span>
          <button 
            onClick={() => onSelectRole('DRIVER')}
            className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
          >
            Quero ser entregador →
          </button>
        </div>
      </section>

      {/* Main Features Grid: Corridas vs Entregas */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {/* PASSENGER RIDES */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl w-fit">
            <Car className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Corridas de Passageiros</h2>
            <p className="text-xs text-slate-400">
              Transporte individual de passageiros através da plataforma VaiCar em São Sebastião.
            </p>
          </div>

          <div className="space-y-3.5 border-t border-slate-800/80 pt-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Modelo para Motoristas:</strong> Escolha entre 10% por corrida ou R$100/mês.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Transparência Antes do Embarque:</strong> Informações do motorista e veículo disponíveis no app.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Verificação Cadastral:</strong> Os motoristas devem fornecer as informações e documentos exigidos pela plataforma e cumprir os requisitos legais aplicáveis à atividade.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Segurança Compartilhada:</strong> Motorista e passageiro devem cumprir as regras de conduta e segurança da plataforma.</span>
            </div>
          </div>

          <button
            onClick={() => onSelectRole('PASSENGER', { mode: 'ride' })}
            className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>Ver Tarifas e Solicitar Corrida</span>
            <ChevronRight className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        {/* EXPRESS DELIVERIES */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl w-fit">
            <Bike className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Serviço de Entregas</h2>
            <p className="text-xs text-slate-400">
              Envie produtos, documentos e outros itens permitidos através de entregadores de bicicleta ou motocicleta em São Sebastião.
            </p>
          </div>

          <div className="space-y-3.5 border-t border-slate-800/80 pt-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Motocicleta:</strong> 10% por entrega ou R$79/mês.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Bicicleta:</strong> 10% por entrega ou R$49/mês.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Exclusivo Moto e Bike:</strong> As entregas do VaiCar são realizadas exclusivamente por motos e bicicletas (sem entrega por carro).</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Segurança no Envio:</strong> Declaração de categoria, peso e dimensões antes do aceite. Proibição estrita de itens ilícitos.</span>
            </div>
          </div>

          <button
            onClick={() => onSelectRole('PASSENGER', { mode: 'delivery' })}
            className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>Pedir uma Entrega</span>
            <ChevronRight className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </section>

      {/* Main Landing Page / Dynamic Subpage Content rendering */}
      {currentPath === '/' ? (
        <>
          {/* SEO Local Quick Navigation Section */}
          <section className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span>Guia de Mobilidade e Transporte de São Sebastião</span>
            </h3>
            <p className="text-xs text-slate-400">
              Conheça opções de mobilidade e serviços de transporte disponíveis na região:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              <button 
                onClick={() => navigateTo('/uber-alternativa-sao-sebastiao')}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <span className="font-bold text-white">Alternativa à Uber</span>
                <span className="text-[11px] text-slate-500">Conexão direta entre passageiros e motoristas locais</span>
              </button>
              <button 
                onClick={() => navigateTo('/99-alternativa-sao-sebastiao')}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <span className="font-bold text-white">Alternativa à 99</span>
                <span className="text-[11px] text-slate-500">Segurança, regras claras e transparência</span>
              </button>
              <button 
                onClick={() => navigateTo('/entregas-sao-sebastiao')}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <span className="font-bold text-white">Entregas em São Sebastião</span>
                <span className="text-[11px] text-slate-500">Serviço exclusivo de moto e bicicleta</span>
              </button>
              <button 
                onClick={() => navigateTo('/entrega-moto-sao-sebastiao')}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <span className="font-bold text-white">Entrega de Moto (Motocicleta)</span>
                <span className="text-[11px] text-slate-500">10% por entrega ou R$79/mês</span>
              </button>
              <button 
                onClick={() => navigateTo('/entrega-bike-sao-sebastiao')}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <span className="font-bold text-white">Entrega de Bicicleta (Bike)</span>
                <span className="text-[11px] text-slate-500">10% por entrega ou R$49/mês</span>
              </button>
              <button 
                onClick={() => navigateTo('/motorista-sao-sebastiao')}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <span className="font-bold text-white">Seja Motorista ou Entregador</span>
                <span className="text-[11px] text-slate-500">10% por serviço ou plano mensal</span>
              </button>
            </div>
          </section>

          {/* Platform Values / Local Coverage Section */}
          <section className="bg-gradient-to-br from-emerald-950/20 to-slate-950 border border-emerald-500/10 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Atendimento no Município de São Sebastião</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              O <strong>VaiCar</strong> foi concebido para atender às demandas de mobilidade e entregas no município de São Sebastião, conectando os bairros da região central, Costa Norte e Costa Sul através de uma interface simples e transparente.
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-semibold pt-2">
              <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">📍 Centro</span>
              <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">📍 Maresias</span>
              <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">📍 Boiçucanga</span>
              <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">📍 Juquehy</span>
              <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">📍 Cambury</span>
              <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">📍 Topolândia</span>
            </div>
          </section>
        </>
      ) : (
        /* SEO Subpage Rich Content */
        <article className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 prose prose-invert max-w-none">
          {currentPath === '/uber-alternativa-sao-sebastiao' && (
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Alternativa local para mobilidade em São Sebastião</h2>
              
              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                <p>
                  Para moradores e visitantes no município de São Sebastião, o VaiCar conecta diretamente passageiros e motoristas locais através de uma plataforma simples e transparente.
                </p>
                <p>
                  Oferecemos aos motoristas parceiros um modelo claro e acessível: <strong>10% por corrida ou plano mensal de R$100</strong>. Isso permite que o motorista trabalhe com previsibilidade e que o passageiro conte com um serviço focado na realidade local da cidade.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-white text-xs mb-2">Para o Passageiro</h4>
                  <ul className="text-[11px] text-slate-400 space-y-2">
                    <li>• Identificação do motorista e veículo antes de embarcar</li>
                    <li>• Pagamento direto ao motorista via PIX, Cartão ou Dinheiro</li>
                    <li>• Comunicação direta e suporte para ocorrências</li>
                  </ul>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-white text-xs mb-2">Para o Motorista</h4>
                  <ul className="text-[11px] text-slate-400 space-y-2">
                    <li>• Escolha entre 10% por corrida ou R$100/mês</li>
                    <li>• Autonomia nos seus trajetos e horários</li>
                    <li>• Cumprimento das regras de segurança e trânsito</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {currentPath === '/99-alternativa-sao-sebastiao' && (
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Alternativa local à 99 em São Sebastião</h2>
              
              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                <p>
                  O VaiCar é uma plataforma pensada para a mobilidade urbana de São Sebastião, conectando os bairros da região central, Costa Sul e Costa Norte.
                </p>
                <p>
                  A plataforma solicita aos motoristas a documentação exigida (como CNH com EAR e dados do veículo) e orienta passageiros e motoristas quanto às normas de conduta e segurança antes e durante a viagem.
                </p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-xs">Precisa se deslocar pela cidade?</h4>
                  <p className="text-[11px] text-slate-400">Consulte viagens e motoristas disponíveis pelo app.</p>
                </div>
                <button
                  onClick={() => onSelectRole('PASSENGER', { mode: 'ride' })}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shrink-0 cursor-pointer transition-colors"
                >
                  Solicitar Corrida
                </button>
              </div>
            </div>
          )}

          {currentPath === '/entregas-sao-sebastiao' && (
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Serviço de Entregas por Bicicleta e Motocicleta em São Sebastião</h2>
              
              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                <p>
                  Envie produtos, encomendas leves, documentos e refeições pelas ruas de São Sebastião através de entregadores de bicicleta ou motocicleta.
                </p>
                <p>
                  <strong>As entregas do VaiCar são realizadas exclusivamente por bicicletas e motocicletas (não oferecemos entrega por carro).</strong>
                </p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
                  Regras de Segurança para Envio de Itens
                </h4>
                <ul className="text-[11px] text-slate-400 space-y-2">
                  <li>• <strong>Itens Proibidos:</strong> É estritamente proibido o envio de substâncias ilícitas, armas, produtos químicos perigosos ou inflamáveis.</li>
                  <li>• <strong>Declaração de Conteúdo:</strong> O remetente deve informar categoria, descrição e dimensões reais do item.</li>
                  <li>• <strong>Direito de Recusa:</strong> O entregador pode recusar a entrega caso o item não corresponda ao declarado ou apresente risco.</li>
                </ul>
              </div>
            </div>
          )}

          {currentPath === '/entrega-moto-sao-sebastiao' && (
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Entrega de Moto em São Sebastião</h2>
              
              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
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
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-4 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Solicitar Envio de Moto 🏍️
                </button>
                <button
                  onClick={() => onSelectRole('DRIVER')}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold p-4 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Quero ser Entregador de Moto
                </button>
              </div>
            </div>
          )}

          {currentPath === '/entrega-bike-sao-sebastiao' && (
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Entrega de Bicicleta em São Sebastião</h2>
              
              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                <p>
                  Para pequenas encomendas, documentos e refeições em trajetos curtos no mesmo bairro, a entrega por bicicleta é uma opção prática e sustentável.
                </p>
                <p>
                  Modelos para entregadores de bicicleta: <strong>10% por entrega ou R$49 por mês</strong>.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-white text-xs mb-2">Limites sugeridos para entregas de bicicleta</h4>
                <ul className="text-[11px] text-slate-400 space-y-1.5">
                  <li>• Peso máximo recomendado: 5 kg</li>
                  <li>• Dimensões: O item deve caber confortavelmente em mochila térmica ou bag térmico padrão</li>
                  <li>• Distância ideal: Trajetos locais</li>
                </ul>
              </div>
            </div>
          )}

          {currentPath === '/motorista-sao-sebastiao' && (
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Cadastro de Motoristas e Entregadores em São Sebastião</h2>
              
              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                <p>
                  Se você deseja realizar viagens ou entregas através da plataforma VaiCar em São Sebastião, realize seu cadastro informando seus dados e a documentação exigida.
                </p>
                <p>
                  Modelos comerciais disponíveis:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-300">
                  <li><strong>Motoristas de carro (passageiros):</strong> 10% por corrida ou R$100/mês</li>
                  <li><strong>Entregadores de motocicleta:</strong> 10% por entrega ou R$79/mês</li>
                  <li><strong>Entregadores de bicicleta:</strong> 10% por entrega ou R$49/mês</li>
                </ul>
              </div>

              <button
                onClick={() => onSelectRole('DRIVER')}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 px-4 rounded-xl text-xs cursor-pointer transition-all"
              >
                Cadastrar-se na Plataforma
              </button>
            </div>
          )}
        </article>
      )}
    </div>
  );
};
