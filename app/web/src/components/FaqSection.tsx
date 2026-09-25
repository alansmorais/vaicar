import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';

export interface FaqItem {
  id: string;
  question: string;
  answer: string | string[];
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'O que é o VaiCar?',
    answer: [
      'O VaiCar é uma plataforma criada para conectar passageiros a motoristas em São Sebastião, facilitando a solicitação de corridas de forma simples e transparente.',
      'A proposta é oferecer uma alternativa local, conectando quem precisa se deslocar com motoristas cadastrados na plataforma.'
    ]
  },
  {
    id: 'faq-2',
    question: 'Como funciona uma corrida?',
    answer: [
      'É simples:',
      '1. O passageiro informa onde está e para onde quer ir.',
      '2. O sistema calcula as informações da viagem, incluindo o valor aplicável.',
      '3. O passageiro visualiza as condições da corrida antes de confirmar.',
      '4. Motoristas disponíveis recebem a solicitação.',
      '5. Um motorista aceita a corrida.',
      '6. O passageiro acompanha a chegada do motorista pelo mapa.',
      '7. A viagem começa e termina normalmente.',
      '8. Após a conclusão, o passageiro recebe o comprovante da corrida por e-mail.'
    ]
  },
  {
    id: 'faq-3',
    question: 'O valor de deslocamento está incluído?',
    answer: [
      'Quando houver um valor de deslocamento aplicável, ele faz parte do cálculo apresentado para a corrida.',
      'O objetivo é que o passageiro saiba quanto pagará antes de confirmar, evitando surpresas.',
      'O valor depende das regras de preço configuradas na plataforma e das características da viagem.'
    ]
  },
  {
    id: 'faq-4',
    question: 'A corrida pode ficar muito cara por causa do deslocamento?',
    answer: [
      'A proposta do VaiCar é manter o cálculo claro e previsível para o passageiro.',
      'O sistema não deve adicionar valores escondidos. Quando o preço for apresentado antes da confirmação, o passageiro poderá avaliar o valor da viagem antes de solicitar.',
      'O valor pode variar de acordo com distância, deslocamento até o passageiro, demanda e outras regras efetivamente utilizadas pela plataforma.'
    ]
  },
  {
    id: 'faq-5',
    question: 'O que acontece quando há muita demanda?',
    answer: [
      'Quando existem muitos passageiros solicitando corridas e poucos motoristas disponíveis, o sistema pode identificar uma região como uma área de alta demanda.',
      'O mapa poderá indicar diferentes níveis de atividade e disponibilidade.',
      'Qualquer alteração dinâmica de preço deve ser calculada pelo sistema de preços da plataforma e apresentada de forma transparente.'
    ]
  },
  {
    id: 'faq-6',
    question: 'O que é o mapa do VaiCar?',
    answer: [
      'O mapa é uma das principais funcionalidades da plataforma.',
      'O passageiro poderá visualizar a disponibilidade de motoristas e ter uma estimativa de chegada.',
      'O motorista poderá visualizar áreas com maior atividade e solicitações.',
      'A administração poderá acompanhar a operação através do VaiCar Operations Map.',
      'Conforme o VaiCar acumula dados reais de viagens em São Sebastião, o mapa poderá oferecer informações cada vez mais úteis sobre disponibilidade, demanda e tempo de chegada.'
    ]
  },
  {
    id: 'faq-7',
    question: 'Como funciona a verificação dos motoristas?',
    answer: [
      'Os motoristas precisam realizar o cadastro e enviar os documentos necessários para verificação.',
      'Os documentos podem passar por etapas como:',
      'Pendente → Em análise → Aprovado → Rejeitado.',
      'Quando um documento for rejeitado, o motorista poderá receber o motivo e enviar uma nova versão.'
    ]
  },
  {
    id: 'faq-8',
    question: 'Posso alterar meus dados depois do cadastro?',
    answer: [
      'Sim.',
      'Passageiros e motoristas terão uma área de perfil para atualizar informações permitidas, como foto, telefone, e-mail e senha.',
      'Alterações de documentos de motorista sujeitos à verificação seguem um processo específico.'
    ]
  },
  {
    id: 'faq-9',
    question: 'Vou receber um comprovante da corrida?',
    answer: [
      'Sim.',
      'Depois que uma corrida for concluída, o sistema poderá gerar automaticamente um Comprovante da Corrida.',
      'O comprovante poderá conter informações como data, origem, destino, motorista, veículo, distância, duração, valor da corrida, eventual tempo de espera e valor total.',
      'O comprovante será enviado para o e-mail cadastrado do passageiro.'
    ]
  },
  {
    id: 'faq-10',
    question: 'Como funciona o pagamento da corrida?',
    answer: [
      'O pagamento da corrida é feito diretamente ao motorista.',
      'As formas de pagamento disponíveis podem incluir:',
      '💵 Dinheiro\nPIX\n💳 Cartão através da maquininha do motorista',
      'Depois de receber o pagamento, o motorista confirma no aplicativo a forma utilizada.',
      'Se o pagamento não for confirmado, a corrida poderá ficar com pagamento pendente até que a situação seja resolvida.'
    ]
  },
  {
    id: 'faq-11',
    question: 'O que acontece se eu não pagar uma corrida?',
    answer: [
      'Quando uma corrida permanece com pagamento pendente, o passageiro poderá ficar temporariamente impedido de solicitar uma nova corrida até que o pagamento seja resolvido.',
      'Caso exista algum problema ou divergência, o passageiro poderá entrar em contato com o suporte para análise da situação.'
    ]
  },
  {
    id: 'faq-12',
    question: 'Existe tempo de espera?',
    answer: [
      'Sim.',
      'Depois que o motorista chegar ao ponto de embarque, existe um período inicial de espera previsto pela plataforma.',
      'A configuração planejada atualmente é de 4 minutos gratuitos.',
      'Depois desse período, poderá existir cobrança por minuto adicional conforme a tarifa configurada.'
    ]
  },
  {
    id: 'faq-13',
    question: 'Como funciona para o motorista?',
    answer: [
      'O motorista poderá escolher entre os modelos de cobrança definidos pela plataforma:',
      '10% por corrida\n\nou\n\nR$100 por mês.',
      'A disponibilidade desses modelos depende das condições comerciais vigentes da plataforma.'
    ]
  },
  {
    id: 'faq-14',
    question: 'Como funcionam as entregas?',
    answer: [
      'O VaiCar também poderá conectar clientes a entregadores.',
      'As entregas serão realizadas por bicicleta ou motocicleta.',
      'Antes de aceitar uma entrega, o entregador poderá visualizar informações como categoria, descrição, peso aproximado, dimensões, valor declarado, local de retirada, destino e valor da entrega.'
    ]
  },
  {
    id: 'faq-15',
    question: 'E quanto custa para o entregador?',
    answer: [
      'Bicicleta:\n10% por entrega ou R$49 por mês.\n\nMotocicleta:\n10% por entrega ou R$79 por mês.',
      'Os valores apresentados no site devem sempre corresponder às condições comerciais atualmente vigentes.'
    ]
  },
  {
    id: 'faq-16',
    question: 'Onde o VaiCar vai funcionar?',
    answer: [
      'O projeto inicial é voltado para São Sebastião, no Litoral Norte de São Paulo.',
      'A disponibilidade de motoristas e corridas dependerá da quantidade de usuários e motoristas cadastrados na região.'
    ]
  },
  {
    id: 'faq-17',
    question: 'O VaiCar é regulamentado pela Prefeitura?',
    answer: [
      'O VaiCar é uma plataforma tecnológica de conexão entre passageiros e motoristas.',
      'Os motoristas devem cumprir os requisitos legais, de habilitação e as exigências aplicáveis à atividade.',
      'A plataforma não deve afirmar que possui autorização, credenciamento ou aprovação municipal sem documentação oficial que comprove essa condição.'
    ]
  },
  {
    id: 'faq-18',
    question: 'Por que usar o VaiCar?',
    answer: [
      'A proposta do VaiCar é criar uma plataforma voltada para a realidade local.',
      'Conforme mais passageiros, motoristas e entregadores utilizarem a plataforma, o sistema poderá acumular dados reais da operação em São Sebastião e melhorar informações como disponibilidade, demanda e estimativas de chegada.'
    ]
  }
];

export const FaqSection: React.FC = () => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    if (expand) {
      FAQ_ITEMS.forEach((item) => {
        next[item.id] = true;
      });
    }
    setOpenItems(next);
  };

  const allExpanded = FAQ_ITEMS.length > 0 && FAQ_ITEMS.every((item) => openItems[item.id]);

  return (
    <section id="duvidas-frequentes" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8" aria-labelledby="faq-heading">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Central de Informações</span>
        </div>
        
        <h2 id="faq-heading" className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
          Dúvidas Frequentes
        </h2>
        
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          Tire suas principais dúvidas sobre o VaiCar, corridas, pagamentos, motoristas e entregas.
        </p>

        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => toggleAll(!allExpanded)}
            className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            {allExpanded ? 'Recolher todas as respostas' : 'Expandir todas as respostas'}
          </button>
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = !!openItems[item.id];
          const questionNumber = index + 1;
          const headerId = `faq-header-${item.id}`;
          const panelId = `faq-panel-${item.id}`;

          return (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/70'
              }`}
            >
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(item.id)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none transition-colors group"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <span
                    className={`shrink-0 text-xs font-black px-2 py-0.5 rounded-md border tabular-nums transition-colors ${
                      isOpen
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 group-hover:text-emerald-400 group-hover:border-emerald-500/30'
                    }`}
                  >
                    {questionNumber.toString().padStart(2, '0')}
                  </span>
                  <span className="font-bold text-sm sm:text-base text-white group-hover:text-emerald-300 transition-colors">
                    {item.question}
                  </span>
                </div>

                <div
                  className={`shrink-0 p-1.5 rounded-xl transition-all duration-200 ${
                    isOpen ? 'bg-emerald-500/20 text-emerald-400 rotate-180' : 'text-slate-400 group-hover:text-white'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 border-t border-slate-800/60 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  {Array.isArray(item.answer) ? (
                    <div className="space-y-3">
                      {item.answer.map((para, pIdx) => (
                        <p key={pIdx} className="whitespace-pre-line">
                          {para}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="whitespace-pre-line">{item.answer}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ======================================================
          ADDITIONAL HIGHLIGHT CARD ("VaiCar está começando")
      ====================================================== */}
      <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-emerald-950/30 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Início das Operações
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1">
              VaiCar está começando
            </h3>
          </div>
        </div>

        <div className="text-xs sm:text-sm text-slate-300 space-y-2.5 leading-relaxed relative z-10">
          <p>
            O VaiCar está construindo sua rede inicial de passageiros, motoristas e entregadores em São Sebastião.
          </p>
          <p>
            Por isso, a disponibilidade pode variar de acordo com o horário e a região.
          </p>
          <p>
            Conforme mais pessoas utilizarem a plataforma, o sistema terá mais dados reais para melhorar estimativas de disponibilidade, demanda e tempo de chegada.
          </p>
        </div>
      </div>
    </section>
  );
};
