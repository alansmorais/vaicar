import React, { useState } from 'react';
import { ShieldCheck, Car, User, CheckCircle2, ArrowRight } from 'lucide-react';
import { Zone, Driver } from '../types.ts';
import { registerDriver } from '../lib/api.ts';

interface DriverOnboardingProps {
  zones: Zone[];
  onDriverRegistered: (driver: Driver) => void;
  onCancel: () => void;
}

export const DriverOnboarding: React.FC<DriverOnboardingProps> = ({
  zones,
  onDriverRegistered,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('1988-05-14');
  const [phone, setPhone] = useState('(12) 99876-5432');
  const [email, setEmail] = useState('');
  const [professionalCategory, setProfessionalCategory] = useState(
    'Transporte Remunerado Individual',
  );
  const [licenseNumber, setLicenseNumber] = useState('ALV-SS-2026/044');

  // Vehicle
  const [vehicleBrand, setVehicleBrand] = useState('Toyota');
  const [vehicleModel, setVehicleModel] = useState('Yaris Sedan');
  const [vehicleYear, setVehicleYear] = useState(2023);
  const [vehicleColor, setVehicleColor] = useState('Prata');
  const [vehiclePlate, setVehiclePlate] = useState('SSB-4D21');

  // Zones
  const [selectedZones, setSelectedZones] = useState<string[]>([
    'z-centro',
    'z-maresias',
    'z-juquehy',
  ]);

  // Photo Avatar state
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 320;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setAvatarUrl(compressed);
          } else {
            setAvatarUrl(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleZone = (zoneId: string) => {
    if (selectedZones.includes(zoneId)) {
      setSelectedZones(selectedZones.filter((id) => id !== zoneId));
    } else {
      setSelectedZones([...selectedZones, zoneId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cpf || !phone || !vehicleModel || !vehiclePlate) {
      alert('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setIsLoading(true);
      const newDriver = await registerDriver({
        name,
        cpf,
        birthDate,
        phone,
        email: email || `${phone.replace(/\D/g, '')}@vaicar.local`,
        professionalCategory,
        licenseNumber,
        vehicleBrand,
        vehicleModel,
        vehicleYear,
        vehicleColor,
        vehiclePlate,
        operatingZones: selectedZones,
        avatarUrl, // <--- Added!
      });

      alert('Cadastro recebido com sucesso! Sua documentação foi enviada para análise da Prefeitura e Administração.');
      onDriverRegistered(newDriver);
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar motorista');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
          Credenciamento de Motorista
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Seja motorista VaiCar</h1>
        <p className="text-sm text-slate-300">
          Receba novos passageiros em São Sebastião <strong>sem pagar comissão por corrida</strong>. Você define seu preço e fica com 100% do valor.
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-between bg-slate-900 p-3 rounded-2xl border border-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
            step === 1 ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400'
          }`}
        >
          <span>1. Dados Pessoais</span>
        </button>
        <span className="text-slate-600">➔</span>
        <button
          type="button"
          onClick={() => setStep(2)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
            step === 2 ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400'
          }`}
        >
          <span>2. Veículo & Alvará</span>
        </button>
        <span className="text-slate-600">➔</span>
        <button
          type="button"
          onClick={() => setStep(3)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
            step === 3 ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400'
          }`}
        >
          <span>3. Zonas de Atendimento</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
        {/* STEP 1: PERSONAL DATA */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Dados Pessoais & Contato</span>
            </h3>

            {/* Foto de Perfil */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 block">Sua Foto de Perfil (Opcional - mas recomendado para identificação) *</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    src={avatarUrl}
                    alt="Foto de perfil"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="driver-avatar-upload"
                  />
                  <label
                    htmlFor="driver-avatar-upload"
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-lg cursor-pointer transition-all border border-slate-700"
                  >
                    Selecionar Foto do Dispositivo
                  </label>
                  <p className="text-[10px] text-slate-400">Insira uma foto nítida de rosto. Os passageiros verão essa foto ao solicitar viagens.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Marcos Vinicius de Oliveira"
                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">CPF *</label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">WhatsApp / Celular *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(12) 99999-9999"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <span>Próximo: Dados do Veículo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VEHICLE & REGULATORY */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Car className="w-4 h-4 text-emerald-400" />
              <span>Dados do Veículo e Alvará</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Marca *</label>
                <input
                  type="text"
                  required
                  value={vehicleBrand}
                  onChange={(e) => setVehicleBrand(e.target.value)}
                  placeholder="Ex: Toyota"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Modelo *</label>
                <input
                  type="text"
                  required
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Ex: Yaris Sedan"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Ano</label>
                <input
                  type="number"
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(Number(e.target.value))}
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Cor</label>
                <input
                  type="text"
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  placeholder="Prata"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Placa *</label>
                <input
                  type="text"
                  required
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="ABC-1234"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm uppercase focus:border-emerald-500 outline-none font-bold"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-4">
              <label className="text-xs font-bold text-slate-300 block">
                Alvará Municipal / Inscrição na Prefeitura de São Sebastião
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="Ex: ALV-SS-2026/044"
                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
              />
              <p className="text-[11px] text-slate-400">
                Você poderá fazer upload do PDF ou foto do alvará e seguro APP logo após a conclusão deste cadastro.
              </p>
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-slate-800 text-slate-300 font-bold text-xs px-5 py-3 rounded-xl cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <span>Próximo: Escolher Zonas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ZONES */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-white text-base">Onde você deseja atender?</h3>
              <p className="text-xs text-slate-400">
                Selecione as praias e bairros de São Sebastião onde você aceita receber chamadas.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
              {zones.map((zone) => {
                const selected = selectedZones.includes(zone.id);
                return (
                  <div
                    key={zone.id}
                    onClick={() => handleToggleZone(zone.id)}
                    className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-between ${
                      selected
                        ? 'bg-emerald-500/20 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>{zone.name}</span>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {}}
                      className="accent-emerald-500 pointer-events-none"
                    />
                  </div>
                );
              })}
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl space-y-1 text-xs text-emerald-300">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Mensalidade Fixa VaiCar Pro: R$ 49/mês</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Você ganha 100% de cada corrida sem nenhuma taxa percentual. Pague apenas a assinatura mensal da tecnologia.
              </p>
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-slate-800 text-slate-300 font-bold text-xs px-5 py-3 rounded-xl cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm px-8 py-3.5 rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Cadastrando...' : 'CONCLUIR MEU CADASTRO'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
