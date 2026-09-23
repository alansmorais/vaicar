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
  let seoDescription = 'A alternativa local perfeita para Uber e 99 em São Sebastião - SP. Corridas de passageiros com taxa zero e entregas seguras de bicicleta ou motocicleta.';
  let h1Text = 'A sua alternativa local para corridas e entregas em São Sebastião';

  if (currentPath === '/uber-alternativa-sao-sebastiao') {
    seoTitle = 'Uber Alternativa São Sebastião | Aplicativo Local VaiCar';
    seoDescription = 'Procurando uma alternativa à Uber em São Sebastião SP? Conheça o VaiCar. Conectamos passageiros e motoristas credenciados com preço justo e taxa zero.';
    h1Text = 'A melhor alternativa à Uber em São Sebastião';
  } else if (currentPath === '/99-alternativa-sao-sebastiao') {
    seoTitle = '99 Alternativa São Sebastião | Viagens sem Taxas Abusivas';
    seoDescription = 'O VaiCar é a melhor alternativa à 99 em São Sebastião. Aplicativo local que valoriza o motorista credenciado e oferece corridas mais baratas e seguras.';
    h1Text = 'A melhor alternativa à 99 em São Sebastião';
  } else if (currentPath === '/entregas-sao-sebastiao') {
    seoTitle = 'Serviço de Entregas São Sebastião | Rápido e Seguro | VaiCar';
    seoDescription = 'Solicite entregas expressas em São Sebastião com entregadores credenciados. Envio exclusivo por motos e bicicletas para garantir agilidade e preço justo.';
    h1Text = 'Serviço local de entregas expressas em São Sebastião';
  } else if (currentPath === '/entrega-moto-sao-sebastiao') {
    seoTitle = 'Entrega de Moto São Sebastião | Motoboys Credenciados VaiCar';
    seoDescription = 'Precisa de motoboy em São Sebastião SP? Chame o serviço de entrega de moto do VaiCar. Rapidez, segurança, rastreamento ao vivo e sem taxas abusivas.';
    h1Text = 'Entrega de Moto rápida e profissional em São Sebastião';
  } else if (currentPath === '/entrega-bike-sao-sebastiao') {
    seoTitle = 'Entrega de Bicicleta São Sebastião | Entregadores de Bike VaiCar';
    seoDescription = 'Envios ecológicos e econômicos com entrega de bicicleta em São Sebastião. Perfeito para pequenas encomendas, documentos e refeições no Centro.';
    h1Text = 'Entrega de Bicicleta ecológica e barata em São Sebastião';
  } else if (currentPath === '/motorista-sao-sebastiao') {
    seoTitle = 'Seja Motorista Credenciado em São Sebastião | VaiCar';
    seoDescription = 'Trabalhe como motorista em São Sebastião com 0% de comissão por corrida. Escolha entre 10% por corrida ou taxa fixa de R$100/mês. Lucro 100% seu.';
    h1Text = 'Seja Motorista ou Entregador Credenciado em São Sebastião';
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
          <span>Mobilidade Urbana Municipal • São Sebastião SP</span>
        </div>
        
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          {h1Text.split('São Sebastião')[0]}
          <span className="text-emerald-400">São Sebastião</span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          O <strong>VaiCar</strong> é a plataforma oficial que conecta você aos melhores motoristas e entregadores credenciados do litoral norte paulista. 
          Uma alternativa justa aos aplicativos corporativos tradicionais, operando sob conformidade legal e com foco absoluto na economia local.
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
                <span className="text-[10px] opacity-75 font-bold block">Viagens com motoristas credenciados</span>
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
                Quero fazer uma entrega
                <span className="text-[10px] text-slate-400 font-bold block">Moto ou Bike (Sem carros)</span>
              </span>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Professional / Drivers & Couriers CTA */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-400">
          <span>Trabalha com transporte?</span>
          <button 
            onClick={() => onSelectRole('DRIVER')}
            className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
          >
            Quero ser motorista credenciado →
          </button>
          <span className="hidden sm:inline text-slate-700">•</span>
          <button 
            onClick={() => onSelectRole('DRIVER')}
            className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
          >
            Quero ser entregador parceiro →
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
              Transporte individual de passageiros regulamentado no município de São Sebastião, do Centro à Costa Sul.
            </p>
          </div>

          <div className="space-y-3.5 border-t border-slate-800/80 pt-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>0% de Comissão Retida:</strong> Os motoristas ficam com 100% das tarifas.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Plano Flexível para Motoristas:</strong> Taxa de 10% por corrida ou assinatura mensal fixa de <strong>R$ 100</strong>.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Alvará Municipal:</strong> Todos os motoristas possuem credenciamento oficial.</span>
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
            <h2 className="text-2xl font-black text-white">Serviço de Entregas (Delivery)</h2>
            <p className="text-xs text-slate-400">
              Coleta e entrega expressa de mercadorias, refeições e documentos em São Sebastião, feita exclusivamente por bicicletas ou motos.
            </p>
          </div>

          <div className="space-y-3.5 border-t border-slate-800/80 pt-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Motocicleta:</strong> Rapidez e flexibilidade de carga. Plano: 10% de taxa ou assinatura fixa de <strong>R$ 79 / mês</strong>.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Bicicleta:</strong> Ecológico e econômico para rotas próximas. Plano: 10% de taxa ou taxa fixa de <strong>R$ 49 / mês</strong>.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span><strong>Sem Entregas por Carro:</strong> Garantia de fluidez no trânsito e agilidade extrema.</span>
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
              Explore canais especializados de transporte legalizado e serviços de motoboy adequados para cada área da nossa cidade:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              <button 
                onClick={() => navigateTo('/uber-alternativa-sao-sebastiao')}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <span className="font-bold text-white">Alternativa à Uber</span>
                <span className="text-[11px] text-slate-500">Compare vantagens e economize em São Sebastião</span>
              </button>
              <button 
                onClick={() => navigateTo('/99-alternativa-sao-sebastiao')}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <span className="font-bold text-white">Alternativa à 99</span>
                <span className="text-[11px] text-slate-500">Segurança, credenciamento local e tarifa justa</span>
              </button>
              <button 
                onClick={() => navigateTo('/entregas-sao-sebastiao')}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <span className="font-bold text-white">Entregas Rápidas</span>
                <span className="text-[11px] text-slate-500">Serviços de motoboys e ciclistas na cidade</span>
              </button>
              <button 
                onClick={() => navigateTo('/entrega-moto-sao-sebastiao')}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <span className="font-bold text-white">Entrega de Moto (Motoboy)</span>
                <span className="text-[11px] text-slate-500">Planos e tarifas de entregadores de moto</span>
              </button>
              <button 
                onClick={() => navigateTo('/entrega-bike-sao-sebastiao')}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <span className="font-bold text-white">Entrega de Bicicleta (Bike)</span>
                <span className="text-[11px] text-slate-500">Ecológico e econômico para pequenas rotas</span>
              </button>
              <button 
                onClick={() => navigateTo('/motorista-sao-sebastiao')}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <span className="font-bold text-white">Seja um Credenciado</span>
                <span className="text-[11px] text-slate-500">Planos fixos ou comissão flexível de 10%</span>
              </button>
            </div>
          </section>

          {/* Platform Values / Local Regulation Disclaimer */}
          <section className="bg-gradient-to-br from-emerald-950/20 to-slate-950 border border-emerald-500/10 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Atendimento em 100% de São Sebastião</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Diferente de outros aplicativos que operam de maneira precária no litoral, o <strong>VaiCar</strong> foi desenhado respeitando as diretrizes de regulação local da prefeitura municipal de São Sebastião.
              Nossos motoristas são moradores locais que conhecem cada centímetro da rodovia Dr. Manoel Hyppolito Rego (SP-055), operando com toda a documentação, seguro veicular e certidões criminais negativas exigidas pela legislação.
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
              <h2 className="text-2xl sm:text-3xl font-black text-white">Por que o VaiCar é a melhor alternativa à Uber em São Sebastião?</h2>
              
              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                <p>
                  Para moradores e turistas que frequentam o município de São Sebastião, conseguir um carro por aplicativos tradicionais como a Uber frequentemente resulta em longas esperas, cancelamentos constantes ou tarifas dinâmicas abusivas. O VaiCar surge como a <strong>alternativa definitiva à Uber em São Sebastião</strong>.
                </p>
                <p>
                  Ao contrário da Uber, que retém até 40% do valor de cada viagem dos motoristas, a plataforma VaiCar opera com <strong>0% de retenção de comissão</strong> nas assinaturas fixas dos parceiros ou comissão mínima de apenas 10%. Isso incentiva o motorista a aceitar sua corrida imediatamente, reduzindo as taxas de cancelamento a praticamente zero.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-white text-xs mb-2">Vantagens para o Passageiro</h4>
                  <ul className="text-[11px] text-slate-400 space-y-2">
                    <li>• Viagens mais rápidas e sem cancelamentos</li>
                    <li>• Pagamento direto ao motorista via PIX, Cartão ou Dinheiro</li>
                    <li>• Suporte humano local direto pelo WhatsApp</li>
                  </ul>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-white text-xs mb-2">Vantagens para o Motorista</h4>
                  <ul className="text-[11px] text-slate-400 space-y-2">
                    <li>• Fique com 100% do valor das suas corridas</li>
                    <li>• Assinatura barata de apenas R$100/mês para uso total</li>
                    <li>• Operação em total conformidade com a regulação de São Sebastião</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {currentPath === '/99-alternativa-sao-sebastiao' && (
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Como o VaiCar oferece uma alternativa mais justa que a 99 em São Sebastião</h2>
              
              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                <p>
                  A segurança e a previsibilidade de tarifas são os principais gargalos dos aplicativos de transporte tradicionais nas rodovias e bairros de São Sebastião. O VaiCar foi construído de baixo para cima para oferecer uma <strong>alternativa inovadora à 99 em São Sebastião</strong>.
                </p>
                <p>
                  Todos os nossos motoristas passam por um rigoroso processo de credenciamento municipal, garantindo que você viaje apenas com profissionais autorizados, cujos veículos atendem às normas locais de segurança. Além disso, as tarifas são calculadas de forma direta, sem taxas embutidas que encarecem a viagem para você e reduzem os ganhos do trabalhador.
                </p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-xs">Precisa ir ao Centro ou à Costa Sul?</h4>
                  <p className="text-[11px] text-slate-400">Consulte motoristas credenciados em tempo real clicando abaixo.</p>
                </div>
                <button
                  onClick={() => onSelectRole('PASSENGER', { mode: 'ride' })}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shrink-0 cursor-pointer transition-colors"
                >
                  Consultar Viagens Now
                </button>
              </div>
            </div>
          )}

          {currentPath === '/entregas-sao-sebastiao' && (
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Serviço de Entregas Inteligente e Exclusivo por Bicicleta e Moto em São Sebastião</h2>
              
              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                <p>
                  Enviar uma encomenda, chave, refeição ou documento importante pelas ruas de São Sebastião não precisa ser demorado ou excessivamente caro. O serviço de <strong>entregas do VaiCar em São Sebastião</strong> foi estruturado especificamente para usar os meios de transporte mais ágeis e econômicos do litoral: **Motocicletas** e **Bicicletas**.
                </p>
                <p>
                  <strong>NÃO oferecemos entrega por carros</strong>. Esta decisão estratégica garante que seus pacotes não fiquem presos nos congestionamentos sazonais da SP-055 e que os entregadores tenham custos operacionais reduzidos, repassando um preço excelente para os clientes da cidade.
                </p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
                  Regras de Segurança para Envio de Itens
                </h4>
                <ul className="text-[11px] text-slate-400 space-y-2">
                  <li>• <strong>Itens Proibidos:</strong> É estritamente proibido o envio de inflamáveis, armas, drogas ilegais, produtos químicos perigosos ou qualquer substância ilegal.</li>
                  <li>• <strong>Fidelidade à Descrição:</strong> O pacote deve conter exatamente o item descrito na solicitação.</li>
                  <li>• <strong>Recusa de Risco:</strong> O entregador parceiro tem o direito de recusar e cancelar a entrega se o item real divergir das especificações informadas ou representar riscos de segurança.</li>
                </ul>
              </div>
            </div>
          )}

          {currentPath === '/entrega-moto-sao-sebastiao' && (
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Motoboy em São Sebastião: Agilidade Extrema com Entrega de Moto</h2>
              
              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                <p>
                  Para entregas de longa distância ou que exigem rapidez máxima entre bairros distantes (como Centro e Maresias), a <strong>entrega de moto em São Sebastião</strong> é a escolha ideal. Nosso ecossistema de motoboys credenciados está pronto para atender suas necessidades comerciais ou particulares.
                </p>
                <p>
                  Apresentamos os planos comerciais mais atrativos para os motoboys parceiros: comissão de 10% por entrega ou um plano de assinatura tecnológica fixa de apenas <strong>R$ 79 / mês</strong>. Isso garante entregadores satisfeitos, motivados e que cuidam com extrema dedicação da sua encomenda.
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
              <h2 className="text-2xl sm:text-3xl font-black text-white">Entrega de Bicicleta em São Sebastião: Econômico, Sustentável e Ágil</h2>
              
              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                <p>
                  Para encomendas compactas, documentos, entregas de farmácia ou refeições no mesmo bairro ou distâncias curtas, a <strong>entrega de bicicleta em São Sebastião</strong> é a opção mais econômica e sustentável da plataforma.
                </p>
                <p>
                  Com taxas de adesão imbatíveis para ciclistas parceiros de apenas 10% por entrega ou <strong>R$ 49 / mês</strong> fixo, incentivamos o uso de transporte ecológico em áreas comerciais planas da cidade (como a região central). O tamanho da encomenda deve caber adequadamente em mochilas de entrega padrão (bag térmico).
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-white text-xs mb-2">Limites sugeridos para entregas de bicicleta</h4>
                <ul className="text-[11px] text-slate-400 space-y-1.5">
                  <li>• Peso máximo recomendado: 5 kg</li>
                  <li>• Dimensões máximas: Item deve caber confortavelmente em uma mochila térmica convencional (tipo iFood/Rappi)</li>
                  <li>• Distância ideal: Até 4 km de raio de atendimento</li>
                </ul>
              </div>
            </div>
          )}

          {currentPath === '/motorista-sao-sebastiao' && (
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Credenciamento de Motoristas e Entregadores em São Sebastião</h2>
              
              <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                <p>
                  Se você possui CNH com observação de Exercício de Atividade Remunerada (EAR), veículo em bom estado de conservação, moto ou bicicleta, a plataforma VaiCar é a sua parceira ideal de trabalho em São Sebastião.
                </p>
                <p>
                  Acreditamos em um trabalho digno. É por isso que você escolhe como prefere contribuir: comissão fixa de apenas <strong>10% por serviço realizado</strong> OU o plano Pro por assinatura fixa de <strong>R$ 100/mês</strong> (motoristas de carro), <strong>R$ 79/mês</strong> (entregadores de moto) ou <strong>R$ 49/mês</strong> (entregadores de bicicleta).
                </p>
              </div>

              <button
                onClick={() => onSelectRole('DRIVER')}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 px-4 rounded-xl text-xs cursor-pointer transition-all"
              >
                Cadastrar-se Agora e Enviar Documentos
              </button>
            </div>
          )}
        </article>
      )}
    </div>
  );
};
