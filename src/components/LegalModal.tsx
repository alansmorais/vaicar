import React from 'react';
import { X, ShieldCheck, FileText, Lock, Scale, AlertTriangle, PhoneCall } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'termos' | 'privacidade' | 'regulacao';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'termos',
}) => {
  const [tab, setTab] = React.useState<'termos' | 'privacidade' | 'regulacao'>(initialTab);

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Transparência e Marco Legal</h2>
              <p className="text-xs text-slate-400">VaiCar — São Sebastião • SP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-5 gap-4 text-xs font-semibold">
          <button
            onClick={() => setTab('termos')}
            className={`py-3 border-b-2 cursor-pointer transition-all ${
              tab === 'termos'
                ? 'border-emerald-400 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Termos de Uso
          </button>
          <button
            onClick={() => setTab('privacidade')}
            className={`py-3 border-b-2 cursor-pointer transition-all ${
              tab === 'privacidade'
                ? 'border-emerald-400 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Política de Privacidade (LGPD)
          </button>
          <button
            onClick={() => setTab('regulacao')}
            className={`py-3 border-b-2 cursor-pointer transition-all ${
              tab === 'regulacao'
                ? 'border-emerald-400 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Regulação Municipal
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-slate-300">
          {tab === 'termos' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-500/20 p-4 rounded-xl text-xs space-y-1 text-emerald-200">
                <p className="font-bold uppercase tracking-wider text-emerald-300">
                  Resumo Fundamental do Modelo VaiCar:
                </p>
                <p>
                  O VaiCar é exclusivamente uma plataforma de tecnologia que conecta passageiros e motoristas autônomos credenciados. O VaiCar <strong>NÃO</strong> é empresa de transporte, não possui frota própria e não emprega motoristas.
                </p>
                <p>
                  O preço da corrida é definido pelo motorista. O pagamento é realizado diretamente com o motorista (via Pix, dinheiro ou cartão). A plataforma <strong>não recebe e não retém</strong> o dinheiro das corridas.
                </p>
              </div>

              <h3 className="text-base font-bold text-white">1. Natureza dos Serviços</h3>
              <p>
                O VaiCar atua estritamente como provedor de software e aplicação tecnológica, permitindo o contato direto entre passageiros que demandam viagens e motoristas autônomos profissionais devidamente cadastrados.
              </p>

              <h3 className="text-base font-bold text-white">2. Autonomia do Motorista e Precificação</h3>
              <p>
                Os motoristas cadastrados atuam em caráter estritamente autônomo, fixando seus próprios parâmetros de preço (taxa por quilômetro, tarifa mínima ou rotas fixas previamente informadas aos passageiros).
              </p>

              <h3 className="text-base font-bold text-white">3. Forma de Pagamento das Corridas</h3>
              <p>
                Todo pagamento referente ao transporte é efetuado diretamente entre o passageiro e o motorista parceiro, sem intermediação financeira da plataforma. O motorista disponibiliza sua chave Pix pessoal, dinheiro em espécie ou máquina de cartão própria.
              </p>

              <h3 className="text-base font-bold text-white">4. Modelo de Monetização da Plataforma</h3>
              <p>
                O VaiCar é remunerado exclusivamente por meio de uma assinatura periódica pré-paga contratada pelos motoristas parceiros para acesso à infraestrutura tecnológica. <strong>0% de comissão é cobrada sobre as corridas realizadas.</strong>
              </p>

              <h3 className="text-base font-bold text-white">5. Responsabilidade e Segurança</h3>
              <p>
                O motorista parceiro é o único responsável pela prestação do serviço de transporte, pela conservação do veículo e pelo cumprimento das normas de trânsito e leis municipais vigentes. Em situações de emergência durante a viagem, os canais policiais (190) e de resgate (192) devem ser acionados imediatamente.
              </p>
            </div>
          )}

          {tab === 'privacidade' && (
            <div className="space-y-4">
              <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl text-xs space-y-1 text-slate-200">
                <p className="font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  Conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)
                </p>
                <p>
                  Seus dados pessoais são tratados com sigilo, transparência e finalidade específica exclusiva para operacionalização e segurança dos contatos de transporte.
                </p>
              </div>

              <h3 className="text-base font-bold text-white">1. Dados Coletados</h3>
              <p>
                Para passageiros: nome, telefone com WhatsApp para contato da corrida, e dados de identificação básica. Para motoristas: CNH profissional com EAR, CRLV do veículo, comprovação de seguro de acidentes para passageiros (APP) e alvará municipal.
              </p>

              <h3 className="text-base font-bold text-white">2. Compartilhamento Estrito</h3>
              <p>
                O número de telefone e nome são compartilhados única e exclusivamente entre o passageiro e o motorista vinculado à corrida confirmada para viabilizar a comunicação e o embarque seguro. Nenhum dado é comercializado com terceiros.
              </p>

              <h3 className="text-base font-bold text-white">3. Direitos do Titular</h3>
              <p>
                A qualquer momento você poderá solicitar a confirmação, correção ou eliminação dos seus dados da nossa base através do canal de suporte municipal.
              </p>
            </div>
          )}

          {tab === 'regulacao' && (
            <div className="space-y-4">
              <div className="bg-amber-950/40 border border-amber-500/30 p-4 rounded-xl text-xs space-y-1 text-amber-200">
                <p className="font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Transporte Remunerado Privado Individual de Passageiros — São Sebastião
                </p>
                <p>
                  Regulamentado em consonância com a Lei Federal nº 13.640/2018 e decretos da Prefeitura Municipal de São Sebastião - SP.
                </p>
              </div>

              <h3 className="text-base font-bold text-white">Exigências Municipais Obrigatórias:</h3>
              <ul className="list-disc pl-5 space-y-2 text-xs text-slate-300">
                <li>
                  <strong>CNH Definitiva:</strong> Habilitação categoria B ou superior, com observação explícita de "Exerce Atividade Remunerada" (EAR).
                </li>
                <li>
                  <strong>Seguro APP:</strong> Apólice de Seguro de Acidentes Pessoais a Passageiros com cobertura mínima regulamentar por assento.
                </li>
                <li>
                  <strong>CRLV e Vistoria Veicular:</strong> Veículo licenciado no Estado de São Paulo, inspecionado e com no máximo 10 anos de fabricação.
                </li>
                <li>
                  <strong>Alvará de Licença Municipal:</strong> Cadastro e regularidade perante a Secretaria Municipal de Segurança Urbana e Trânsito de São Sebastião.
                </li>
                <li>
                  <strong>Certidão Negativa de Antecedentes Criminais:</strong> Apresentação periódica atualizada a cada renovação.
                </li>
              </ul>

              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
                <p>Dúvidas e auditoria: Secretaria de Trânsito de São Sebastião • Rua Prefeito João Cupertino dos Santos, 249 - Centro.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition-all shadow-md"
          >
            Entendido e Ciente
          </button>
        </div>
      </div>
    </div>
  );
};
