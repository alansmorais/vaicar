import React from 'react';
import { X, ShieldCheck, FileText, Lock, Scale, AlertTriangle, PhoneCall, CheckCircle2, UserCheck, AlertOctagon, Car, ShieldAlert } from 'lucide-react';

export type LegalTabType = 'termos' | 'privacidade' | 'regulacao' | 'seguranca';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTabType;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'seguranca',
}) => {
  const [tab, setTab] = React.useState<LegalTabType>(initialTab);

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl h-[88vh] sm:h-[84vh] max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Segurança, Termos e Marco Legal</h2>
              <p className="text-xs text-slate-400">VaiCar — Plataforma de Mobilidade em São Sebastião • SP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950 px-3 sm:px-5 py-2.5 gap-2 text-xs font-semibold overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setTab('seguranca')}
            className={`py-2 px-3.5 rounded-xl cursor-pointer transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
              tab === 'seguranca'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Regras de Segurança</span>
          </button>
          <button
            onClick={() => setTab('termos')}
            className={`py-2 px-3.5 rounded-xl cursor-pointer transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
              tab === 'termos'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Termos de Uso</span>
          </button>
          <button
            onClick={() => setTab('privacidade')}
            className={`py-2 px-3.5 rounded-xl cursor-pointer transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
              tab === 'privacidade'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Privacidade (LGPD)</span>
          </button>
          <button
            onClick={() => setTab('regulacao')}
            className={`py-2 px-3.5 rounded-xl cursor-pointer transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
              tab === 'regulacao'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Regulação Municipal</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs sm:text-sm leading-relaxed text-slate-300 overscroll-contain">
          {/* TAB 1: REGRAS DE SEGURANÇA */}
          {tab === 'seguranca' && (
            <div className="space-y-5">
              <div className="bg-emerald-950/40 border border-emerald-500/20 p-4 rounded-2xl text-xs space-y-1.5 text-emerald-200">
                <p className="font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Princípio de Segurança e Intermediação Tecnológica:
                </p>
                <p>
                  O VaiCar atua como plataforma tecnológica de intermediação conectando passageiros e motoristas autônomos. A plataforma disponibiliza a infraestrutura digital para cadastros, solicitações de viagem, conexão, informações em tempo real, comunicação, histórico e suporte.
                </p>
                <p>
                  A execução material do transporte é realizada pelo motorista parceiro, que deve cumprir todas as exigências legais e normas de trânsito. O passageiro é responsável por sua conduta e ambos devem seguir rigorosamente as regras de segurança abaixo.
                </p>
              </div>

              {/* Regras para Passageiros */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span>1. Regras e Cuidados para o Passageiro</span>
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-300">
                  <li>
                    <strong className="text-white">Conferência obrigatória antes do embarque:</strong> Antes de entrar no veículo, confira se o nome do motorista, a foto, o modelo do veículo e a placa correspondem exatamente às informações exibidas no aplicativo. <em>Não embarque se houver divergência.</em>
                  </li>
                  <li>
                    <strong className="text-white">Uso do cinto de segurança:</strong> É obrigatório o uso do cinto de segurança durante todo o trajeto para todos os ocupantes.
                  </li>
                  <li>
                    <strong className="text-white">Respeito e civilidade:</strong> Tratar o motorista com cordialidade e respeito mútuo. Não praticar ameaça, violência, assédio, coerção ou discriminação.
                  </li>
                  <li>
                    <strong className="text-white">Preservação do veículo:</strong> Não danificar intencionalmente nem sujar o veículo do motorista parceiro.
                  </li>
                  <li>
                    <strong className="text-white">Itens proibidos:</strong> É expressamente proibido transportar substâncias ilícitas, armas não autorizadas, materiais inflamáveis, tóxicos ou perigosos.
                  </li>
                  <li>
                    <strong className="text-white">Respeito às leis de trânsito:</strong> Não solicitar nem exigir que o motorista exceda limites de velocidade, execute paradas proibidas ou desobedeça a sinalização.
                  </li>
                  <li>
                    <strong className="text-white">Precisão dos dados:</strong> Informar com exatidão os pontos de embarque e desembarque no aplicativo.
                  </li>
                </ul>
              </div>

              {/* Regras para Motoristas */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-400" />
                  <span>2. Regras e Obrigações para o Motorista</span>
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-300">
                  <li>
                    <strong className="text-white">Habilitação e documentação regular:</strong> Possuir CNH válida com observação "Exerce Atividade Remunerada" (EAR), CRLV em dia, seguro APP e certidões exigidas.
                  </li>
                  <li>
                    <strong className="text-white">Conferência do passageiro:</strong> Antes de iniciar a viagem, confirme que a pessoa a embarcar corresponde à solicitação apresentada no aplicativo.
                  </li>
                  <li>
                    <strong className="text-white">Cumprimento das leis de trânsito:</strong> Obedecer rigorosamente ao Código de Trânsito Brasileiro (CTB), limites de velocidade e sinalização.
                  </li>
                  <li>
                    <strong className="text-white">Capacidade e lotação:</strong> Respeitar a lotação máxima de passageiros do veículo.
                  </li>
                  <li>
                    <strong className="text-white">Tolerância zero a álcool e drogas:</strong> Jamais dirigir sob influência de álcool, entorpecentes ou medicamentos que alterem reflexos.
                  </li>
                  <li>
                    <strong className="text-white">Uso seguro do celular:</strong> Utilizar suporte veicular fixo; proibido digitar ou manusear o celular enquanto o veículo estiver em movimento.
                  </li>
                  <li>
                    <strong className="text-white">Urbanidade e não-discriminação:</strong> Tratar todos os passageiros com respeito e dignidade. Proibido qualquer ato de assédio, violência ou discriminação.
                  </li>
                  <li>
                    <strong className="text-white">Direito de recusa por segurança:</strong> O motorista pode recusar ou interromper uma viagem caso identifique uma situação concreta de risco à segurança pessoal ou descumprimento das regras.
                  </li>
                </ul>
              </div>

              {/* Condutas Proibidas */}
              <div className="bg-rose-950/30 border border-rose-500/30 p-4 sm:p-5 rounded-2xl space-y-3 text-rose-100">
                <h3 className="text-sm sm:text-base font-bold text-rose-300 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  <span>3. Condutas Expressamente Proibidas na Plataforma</span>
                </h3>
                <p className="text-xs text-slate-300">
                  O descumprimento das regras abaixo sujeita o infrator à suspensão temporária ou desativação definitiva da conta, sem prejuízo da apuração de responsabilidades cíveis e criminais:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-rose-200">
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>Qualquer violência física ou ameaça verbal</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>Assédio moral, sexual ou invasão de privacidade</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>Discriminação de gênero, raça, credo ou orientação</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>Fraude financeira ou dados falsos de corrida</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>Transporte de itens ilícitos ou perigosos</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>Danos deliberados a veículos ou bens de terceiros</span>
                  </div>
                </div>
              </div>

              {/* Emergência Real */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Em Situações de Perigo Imediato ou Emergência:</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Acione os serviços públicos competentes</span>
                </div>
                <p className="text-xs text-slate-300">
                  O VaiCar é uma plataforma de tecnologia e não substitui os órgãos públicos de socorro e segurança. Em caso de acidente de trânsito, urgência médica ou risco policial iminente, entre em contato imediatamente com os números de emergência oficiais:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <a
                    href="tel:190"
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-center text-xs font-bold text-rose-400 block transition-colors"
                  >
                    190 • Polícia Militar
                  </a>
                  <a
                    href="tel:192"
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-center text-xs font-bold text-amber-400 block transition-colors"
                  >
                    192 • SAMU Resgate
                  </a>
                  <a
                    href="tel:193"
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-center text-xs font-bold text-orange-400 block transition-colors"
                  >
                    193 • Bombeiros
                  </a>
                  <a
                    href="tel:153"
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-center text-xs font-bold text-cyan-400 block transition-colors"
                  >
                    153 • Guarda Municipal
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TERMOS DE USO */}
          {tab === 'termos' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl text-xs space-y-1.5 text-slate-200">
                <p className="font-bold uppercase tracking-wider text-emerald-400">
                  Estrutura e Relação Jurídica dos Usuários:
                </p>
                <p>
                  O VaiCar é uma plataforma tecnológica de intermediação que viabiliza o contato entre passageiros e motoristas profissionais autônomos credenciados na cidade de São Sebastião/SP.
                </p>
                <p>
                  A plataforma não é proprietária dos veículos utilizados, não presta serviço direto de transporte rodoviário e não estabelece vínculo de subordinação ou emprego com os motoristas parceiros, atuando nos termos da Lei Federal nº 13.640/2018 e Marco Civil da Internet (Lei nº 12.965/2014).
                </p>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-white">1. Natureza da Plataforma e Objeto</h3>
              <p>
                O VaiCar fornece serviços digitais de software, licenciamento de aplicativo e tecnologia para facilitação de solicitações de transporte privado individual e entregas urbanas (por bicicleta e motocicleta). As informações de viagem e conexão são providas com integridade para ambas as partes.
              </p>

              <h3 className="text-sm sm:text-base font-bold text-white">2. Autonomia do Motorista e Cumprimento Legal</h3>
              <p>
                Os motoristas cadastrados exercem atividade econômica de forma independente e autônoma, cabendo-lhes a posse de CNH com EAR, licenciamento veicular atualizado, seguro de acidentes para passageiros (APP) e cumprimento das normas de circulação e segurança viária.
              </p>

              <h3 className="text-sm sm:text-base font-bold text-white">3. Responsabilidades das Partes</h3>
              <p>
                O motorista parceiro é responsável pela execução material do transporte, manutenção das condições de segurança do seu veículo e atendimento à legislação. O passageiro é responsável por sua conduta e integridade das informações fornecidas. O VaiCar mantém canais de suporte, moderação e registro para auxílio na resolução de incidentes e aprimoramento contínuo da segurança.
              </p>

              <h3 className="text-sm sm:text-base font-bold text-white">4. Transparência nos Pagamentos e Planos</h3>
              <p>
                Para corridas de passageiros, motoristas contam com modelos de cobrança transparentes (10% por corrida ou assinatura fixa de R$100/mês). Para entregas por moto (10% ou R$79/mês) e bicicleta (10% ou R$49/mês). Os pagamentos de transporte de passageiros ocorrem de forma direta entre usuário e prestador através de Pix, dinheiro ou cartão conforme opções disponibilizadas.
              </p>

              <h3 className="text-sm sm:text-base font-bold text-white">5. Canal de Atendimento e Reporte de Incidentes</h3>
              <p>
                A plataforma disponibiliza funcionalidade de suporte e reporte de problemas (comportamento inadequado, divergência cadastral de veículo, cobrança indevida, acidentes ou objetos esquecidos), comprometendo-se a auditar os casos reportados.
              </p>
            </div>
          )}

          {/* TAB 3: PRIVACIDADE */}
          {tab === 'privacidade' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl text-xs space-y-1.5 text-slate-200">
                <p className="font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  Conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)
                </p>
                <p>
                  O tratamento de dados pessoais no VaiCar é regido pelos princípios de finalidade, necessidade, transparência e segurança.
                </p>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-white">1. Dados Coletados</h3>
              <p>
                Para passageiros: nome completo, telefone com WhatsApp para viabilizar o contato da corrida, pontos de geolocalização e histórico de viagens. Para motoristas: CNH com EAR, documento do veículo (CRLV), comprovante de seguro APP, dados de contato e chave Pix para recebimento.
              </p>

              <h3 className="text-sm sm:text-base font-bold text-white">2. Finalidade e Compartilhamento Estrito</h3>
              <p>
                Os dados de contato e localização são compartilhados estritamente entre o passageiro e o motorista vinculado à solicitação aceita, visando viabilizar o embarque, a comunicação e o desembarque seguro. Nenhum dado é comercializado com terceiros.
              </p>

              <h3 className="text-sm sm:text-base font-bold text-white">3. Direitos do Titular</h3>
              <p>
                Nos termos da LGPD, os usuários podem solicitar a qualquer momento a confirmação de existência de tratamento, correção de dados incompletos ou a exclusão de suas informações da base através do suporte do aplicativo.
              </p>
            </div>
          )}

          {/* TAB 4: REGULAÇÃO MUNICIPAL */}
          {tab === 'regulacao' && (
            <div className="space-y-4">
              <div className="bg-amber-950/40 border border-amber-500/30 p-4 rounded-2xl text-xs space-y-1.5 text-amber-200">
                <p className="font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Transporte Remunerado Privado Individual de Passageiros — São Sebastião/SP
                </p>
                <p>
                  Regulamentado em consonância com a Lei Federal nº 13.640/2018 e normativas municipais de trânsito da Estância Balneária de São Sebastião.
                </p>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-white">Requisitos Obrigatórios para Atuação:</h3>
              <ul className="list-disc pl-5 space-y-2 text-xs text-slate-300">
                <li>
                  <strong className="text-white">CNH Categoria B ou Superior:</strong> Com anotação explícita de "Exerce Atividade Remunerada" (EAR).
                </li>
                <li>
                  <strong className="text-white">Seguro APP:</strong> Apólice vigente de Seguro de Acidentes Pessoais a Passageiros com cobertura por assento.
                </li>
                <li>
                  <strong className="text-white">CRLV e Condições do Veículo:</strong> Veículo devidamente licenciado, com inspeção em dia e dentro dos limites etários regulamentares.
                </li>
                <li>
                  <strong className="text-white">Certidão Negativa de Antecedentes Criminais:</strong> Apresentação na admissão e renovação periódica.
                </li>
              </ul>

              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
                <p>Órgão fiscalizador: Secretaria Municipal de Segurança Urbana e Trânsito de São Sebastião • Rua Prefeito João Cupertino dos Santos, 249 - Centro.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            A utilização da plataforma pressupõe o conhecimento e a concordância com estas diretrizes.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition-all shadow-md ml-auto"
          >
            Entendido e Ciente
          </button>
        </div>
      </div>
    </div>
  );
};
