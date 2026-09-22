import React, { useState, useEffect } from 'react';
import { ShieldCheck, Car, User, CheckCircle2, ArrowRight, MapPin, Plus, Sparkles } from 'lucide-react';
import { Zone, Driver, VAICAR_SUBSCRIPTION_TIERS } from '../types.ts';
import { registerDriver, createZone } from '../lib/api.ts';

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

  // Zones & Custom Zones
  const [allZonesList, setAllZonesList] = useState<Zone[]>(zones);
  const [customZoneInput, setCustomZoneInput] = useState('');
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [zoneMessage, setZoneMessage] = useState<string | null>(null);

  useEffect(() => {
    setAllZonesList((prev) => {
      const map = new Map<string, Zone>();
      zones.forEach((z) => map.set(z.id, z));
      prev.forEach((z) => map.set(z.id, z));
      return Array.from(map.values());
    });
  }, [zones]);

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

  const handleAddCustomZone = async (nameToAdd?: string) => {
    const targetName = (nameToAdd || customZoneInput).trim();
    if (!targetName) return;

    try {
      setIsAddingZone(true);
      setZoneMessage(null);
      const created = await createZone({ name: targetName });

      setAllZonesList((prev) => {
        const exists = prev.some((z) => z.id === created.id || z.name.toLowerCase() === created.name.toLowerCase());
        return exists ? prev : [...prev, created];
      });

      if (!selectedZones.includes(created.id)) {
        setSelectedZones((prev) => [...prev, created.id]);
      }

      setCustomZoneInput('');
      setZoneMessage(`Zona "${created.name}" adicionada e selecionada!`);
      setTimeout(() => setZoneMessage(null), 5000);
    } catch (err: any) {
      setZoneMessage(err.message || 'Erro ao cadastrar zona');
    } finally {
      setIsAddingZone(false);
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
        status: 'PENDING',
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
                Selecione as praias e bairros onde você aceita receber chamadas. Você também pode cadastrar novos bairros.
              </p>
            </div>

            {/* Add Custom Zone Form */}
            <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white">Não encontrou seu bairro ou praia no menu?</h4>
              </div>
              <p className="text-[11px] text-slate-400">
                Você pode adicionar qualquer localidade de São Sebastião (ex: Enseada, Canto do Mar, Morro do Abrigo, etc.):
              </p>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5">
                {['Enseada', 'Canto do Mar', 'Morro do Abrigo', 'Topolândia', 'Jaraguá', 'Cigarras'].map((sug) => {
                  const isSelected = allZonesList.some(
                    (z) => z.name.toLowerCase() === sug.toLowerCase() && selectedZones.includes(z.id)
                  );
                  return (
                    <button
                      key={sug}
                      type="button"
                      disabled={isAddingZone}
                      onClick={() => handleAddCustomZone(sug)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{sug}</span>
                      {isSelected && <span className="text-[9px] font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Manual input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customZoneInput}
                    onChange={(e) => setCustomZoneInput(e.target.value)}
                    placeholder="Digite o nome da sua zona/praia..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={isAddingZone || !customZoneInput.trim()}
                  onClick={() => handleAddCustomZone()}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>

              {zoneMessage && (
                <p className="text-[11px] font-bold text-emerald-400">{zoneMessage}</p>
              )}
            </div>

            {/* Zones Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
              {allZonesList.map((zone) => {
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
                    <span className="truncate pr-1">{zone.name}</span>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {}}
                      className="accent-emerald-500 pointer-events-none shrink-0"
                    />
                  </div>
                );
              })}
            </div>

            {/* Tiered Subscription Breakdown Banner */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl space-y-2 text-xs text-emerald-300">
              <div className="font-bold flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-white">Mensalidade Escalonada VaiCar:</span>
                </div>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                  0% de Comissão
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[11px]">
                <div className="bg-slate-900/90 p-2 rounded-lg border border-emerald-500/40 text-center">
                  <span className="block text-slate-400 text-[10px]">1º Registro</span>
                  <span className="font-black text-emerald-400">R$ 0 / mês</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-center">
                  <span className="block text-slate-400 text-[10px]">Próximos 9 (2º-10º)</span>
                  <span className="font-black text-white">R$ 60 / mês</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-center">
                  <span className="block text-slate-400 text-[10px]">11º ao 20º</span>
                  <span className="font-black text-white">R$ 80 / mês</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-center">
                  <span className="block text-slate-400 text-[10px]">21º ao 100º</span>
                  <span className="font-black text-white">R$ 100 / mês</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Você ganha 100% do valor de cada corrida. Fique com todo o rendimento das suas viagens.
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
