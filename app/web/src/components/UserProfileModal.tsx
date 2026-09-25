import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Camera,
  Upload,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Clock,
  MapPin,
  Car,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X,
  RefreshCw,
  Send,
  Lock,
  ChevronRight,
  ExternalLink,
  Edit2,
  Download,
  HelpCircle,
  Eye,
  Sparkles,
} from 'lucide-react';
import { Ride, Report, Driver, Passenger, UserRole } from '../types.ts';
import {
  requestPhoneChangePin,
  verifyPhoneChange,
  requestEmailChangePin,
  verifyEmailChange,
  updatePassengerProfile,
  updateDriverPhoto,
  fetchUserReports,
} from '../lib/api.ts';
import { RideReceiptModal } from './RideReceiptModal.tsx';
import { ReportModal } from './ReportModal.tsx';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'PASSENGER' | 'DRIVER';
  userId?: string;
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  driverData?: Driver;
  rides?: Ride[];
  onProfileUpdated: (data: { name: string; phone: string; email?: string; avatarUrl?: string }) => void;
  onDeleteAccount?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  role,
  userId,
  name,
  phone,
  email,
  avatarUrl,
  driverData,
  rides = [],
  onProfileUpdated,
  onDeleteAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'DADOS' | 'FOTO' | 'HISTORICO' | 'OCORRENCIAS' | 'SEGURANCA'>('DADOS');

  // User state
  const [currentName, setCurrentName] = useState(name);
  const [currentPhone, setCurrentPhone] = useState(phone);
  const [currentEmail, setCurrentEmail] = useState(email || '');
  const [currentAvatar, setCurrentAvatar] = useState(
    avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
  );

  // Edit Name
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(name);
  const [isSavingName, setIsSavingName] = useState(false);

  // Phone Change Flow
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [phonePinInput, setPhonePinInput] = useState('');
  const [phoneStep, setPhoneStep] = useState<'INPUT' | 'VERIFY'>('INPUT');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email Change Flow
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailPinInput, setEmailPinInput] = useState('');
  const [emailStep, setEmailStep] = useState<'INPUT' | 'VERIFY'>('INPUT');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Photo Capture Flow
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);

  // Receipts and Reports Viewers
  const [selectedReceiptRideId, setSelectedReceiptRideId] = useState<string | null>(null);
  const [selectedReportRide, setSelectedReportRide] = useState<Ride | null>(null);
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isCreatingReport, setIsCreatingReport] = useState(false);

  // Account Deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  useEffect(() => {
    setCurrentName(name);
    setTempName(name);
    setCurrentPhone(phone);
    setCurrentEmail(email || '');
    if (avatarUrl) setCurrentAvatar(avatarUrl);
  }, [name, phone, email, avatarUrl]);

  // Load User Reports
  useEffect(() => {
    if (isOpen && (activeTab === 'OCORRENCIAS' || activeTab === 'DADOS')) {
      setIsLoadingReports(true);
      fetchUserReports(currentPhone || currentName)
        .then((reps) => setUserReports(reps))
        .catch(() => {})
        .finally(() => setIsLoadingReports(false));
    }
  }, [isOpen, activeTab, currentPhone, currentName]);

  // Handle Camera Start / Stop
  const startCamera = async () => {
    try {
      setPhotoFeedback(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setPhotoFeedback('Não foi possível acessar a câmera do dispositivo. Verifique as permissões.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isCameraActive, cameraStream]);

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    const size = Math.min(videoRef.current.videoWidth || 480, videoRef.current.videoHeight || 480);
    canvas.width = 360;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw centered square
      const sx = ((videoRef.current.videoWidth || 480) - size) / 2;
      const sy = ((videoRef.current.videoHeight || 480) - size) / 2;
      ctx.drawImage(videoRef.current, sx, sy, size, size, 0, 0, 360, 360);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      stopCamera();
      saveNewPhoto(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 360;
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
          saveNewPhoto(compressed);
        } else {
          saveNewPhoto(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveNewPhoto = async (photoDataUrl: string) => {
    try {
      setIsUploadingPhoto(true);
      setPhotoFeedback(null);

      if (role === 'PASSENGER') {
        const targetId = userId || currentPhone;
        await updatePassengerProfile(targetId, { avatarUrl: photoDataUrl });
        localStorage.setItem('vaicar_passenger_avatar', photoDataUrl);
      } else {
        const targetId = userId || driverData?.id;
        if (targetId) {
          await updateDriverPhoto(targetId, photoDataUrl);
        }
      }

      setCurrentAvatar(photoDataUrl);
      onProfileUpdated({
        name: currentName,
        phone: currentPhone,
        email: currentEmail,
        avatarUrl: photoDataUrl,
      });
      setPhotoFeedback('Foto de perfil salva com sucesso! Visível aos condutores e passageiros.');
    } catch (err: any) {
      setPhotoFeedback(err.message || 'Erro ao salvar nova foto de perfil.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    try {
      setIsSavingName(true);
      if (role === 'PASSENGER') {
        await updatePassengerProfile(userId || currentPhone, { name: tempName.trim() });
        localStorage.setItem('vaicar_passenger_name', tempName.trim());
      }
      setCurrentName(tempName.trim());
      setIsEditingName(false);
      onProfileUpdated({
        name: tempName.trim(),
        phone: currentPhone,
        email: currentEmail,
        avatarUrl: currentAvatar,
      });
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar nome');
    } finally {
      setIsSavingName(false);
    }
  };

  // Phone Change Logic
  const handleRequestPhonePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneMsg(null);
    if (!newPhoneInput || newPhoneInput.replace(/\D/g, '').length < 10) {
      setPhoneMsg({ type: 'error', text: 'Informe um número de telefone válido com DDD.' });
      return;
    }
    try {
      setPhoneLoading(true);
      const res = await requestPhoneChangePin({
        userId: userId || (role === 'PASSENGER' ? currentPhone : driverData?.id || ''),
        userRole: role,
        currentPhone,
        newPhone: newPhoneInput.trim(),
      });
      setPhoneMsg({ type: 'success', text: res.message });
      setPhoneStep('VERIFY');
    } catch (err: any) {
      setPhoneMsg({ type: 'error', text: err.message || 'Falha ao enviar código.' });
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhonePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneMsg(null);
    if (!phonePinInput.trim()) {
      setPhoneMsg({ type: 'error', text: 'Digite o código PIN recebido.' });
      return;
    }
    try {
      setPhoneLoading(true);
      const res = await verifyPhoneChange({
        userId: userId || (role === 'PASSENGER' ? currentPhone : driverData?.id || ''),
        userRole: role,
        newPhone: newPhoneInput.trim(),
        verificationCode: phonePinInput.trim(),
      });
      setCurrentPhone(res.updatedPhone);
      if (role === 'PASSENGER') {
        localStorage.setItem('vaicar_passenger_phone', res.updatedPhone);
      }
      onProfileUpdated({
        name: currentName,
        phone: res.updatedPhone,
        email: currentEmail,
        avatarUrl: currentAvatar,
      });
      setShowPhoneModal(false);
      setPhoneStep('INPUT');
      setNewPhoneInput('');
      setPhonePinInput('');
      alert('Número de telefone atualizado com sucesso!');
    } catch (err: any) {
      setPhoneMsg({ type: 'error', text: err.message || 'Código inválido.' });
    } finally {
      setPhoneLoading(false);
    }
  };

  // Email Change Logic
  const handleRequestEmailPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);
    if (!newEmailInput || !newEmailInput.includes('@')) {
      setEmailMsg({ type: 'error', text: 'Informe um endereço de e-mail válido.' });
      return;
    }
    try {
      setEmailLoading(true);
      const res = await requestEmailChangePin({
        userId: userId || (role === 'PASSENGER' ? currentPhone : driverData?.id || ''),
        userRole: role,
        newEmail: newEmailInput.trim(),
      });
      setEmailMsg({ type: 'success', text: res.message });
      setEmailStep('VERIFY');
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err.message || 'Falha ao enviar código.' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmailPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);
    if (!emailPinInput.trim()) {
      setEmailMsg({ type: 'error', text: 'Digite o código PIN recebido no novo e-mail.' });
      return;
    }
    try {
      setEmailLoading(true);
      const res = await verifyEmailChange({
        userId: userId || (role === 'PASSENGER' ? currentPhone : driverData?.id || ''),
        userRole: role,
        newEmail: newEmailInput.trim(),
        verificationCode: emailPinInput.trim(),
      });
      setCurrentEmail(res.updatedEmail);
      if (role === 'PASSENGER') {
        localStorage.setItem('vaicar_passenger_email', res.updatedEmail);
      }
      onProfileUpdated({
        name: currentName,
        phone: currentPhone,
        email: res.updatedEmail,
        avatarUrl: currentAvatar,
      });
      setShowEmailModal(false);
      setEmailStep('INPUT');
      setNewEmailInput('');
      setEmailPinInput('');
      alert('Endereço de e-mail atualizado com sucesso!');
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err.message || 'Código inválido.' });
    } finally {
      setEmailLoading(false);
    }
  };

  if (!isOpen) return null;

  const userRides = rides.filter((r) => {
    if (role === 'PASSENGER') {
      const cleanPhone = currentPhone.replace(/\D/g, '');
      const ridePhone = (r.passengerPhone || '').replace(/\D/g, '');
      return (cleanPhone && ridePhone && (cleanPhone.includes(ridePhone) || ridePhone.includes(cleanPhone))) || r.passengerName === currentName;
    } else {
      return r.driverId === (userId || driverData?.id) || r.driverName === currentName;
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative text-slate-100 my-6">
        {/* Header Strip */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={currentAvatar}
                alt={currentName}
                className="w-11 h-11 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-[9px] text-slate-950 font-black">
                ✓
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white leading-tight">{currentName}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {role === 'PASSENGER' ? 'Passageiro' : 'Motorista Credenciado'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Meu Perfil • VaiCar São Sebastião</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('DADOS')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'DADOS' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Dados Pessoais
          </button>
          <button
            onClick={() => setActiveTab('FOTO')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'FOTO' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Foto & Selfie</span>
          </button>
          <button
            onClick={() => setActiveTab('HISTORICO')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'HISTORICO' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Viagens & Comprovantes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {userRides.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('OCORRENCIAS')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'OCORRENCIAS' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Ocorrências</span>
            {userReports.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
                {userReports.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('SEGURANCA')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'SEGURANCA' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Privacidade & Conta
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* TAB 1: DADOS PESSOAIS */}
          {activeTab === 'DADOS' && (
            <div className="space-y-5">
              {/* Photo & Identity Separation Banner */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-200 block">Identificação para Reconhecimento</span>
                  <span className="text-slate-400 text-[11px]">
                    Sua foto de perfil é exibida exclusivamente durante corridas ativas para que motorista e passageiro se reconheçam no ponto de embarque.
                  </span>
                </div>
              </div>

              {/* Personal Data Fields */}
              <div className="space-y-3">
                {/* Name Row */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nome Completo</span>
                    {isEditingName ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="bg-slate-900 text-white font-bold text-sm px-3 py-1.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500 w-full"
                        />
                        <button
                          onClick={handleSaveName}
                          disabled={isSavingName}
                          className="px-3 py-1.5 bg-emerald-500 text-slate-950 text-xs font-black rounded-xl hover:bg-emerald-400 cursor-pointer"
                        >
                          {isSavingName ? '...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => {
                            setTempName(currentName);
                            setIsEditingName(false);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <strong className="text-sm font-black text-white">{currentName}</strong>
                    )}
                  </div>
                  {!isEditingName && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-emerald-500/30"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>

                {/* Phone Row */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Telefone / WhatsApp</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <strong className="text-sm font-black text-white">{currentPhone || 'Não informado'}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setNewPhoneInput('');
                      setPhonePinInput('');
                      setPhoneStep('INPUT');
                      setPhoneMsg(null);
                      setShowPhoneModal(true);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-emerald-500/30"
                  >
                    <span>Alterar Número</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Email Row */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">E-mail de Acesso e Comprovantes</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      <strong className="text-sm font-black text-white">{currentEmail || 'Não informado'}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setNewEmailInput('');
                      setEmailPinInput('');
                      setEmailStep('INPUT');
                      setEmailMsg(null);
                      setShowEmailModal(true);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-emerald-500/30"
                  >
                    <span>Alterar E-mail</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status Section */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-300">Status da Conta</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Foto de Perfil</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cadastrada
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Verificação de Acesso</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Validada por PIN
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FOTO & SELFIE */}
          {activeTab === 'FOTO' && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <h3 className="text-base font-black text-white">Foto de Perfil / Selfie para Reconhecimento</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {role === 'PASSENGER'
                    ? 'Adicione uma foto nítida do seu rosto para que o motorista possa reconhecer você com facilidade ao chegar no ponto de embarque.'
                    : 'Adicione sua selfie profissional para que os passageiros saibam quem é o motorista parceiro credenciado.'}
                </p>
              </div>

              {/* Photo Display / Camera Stream */}
              <div className="flex flex-col items-center justify-center gap-4">
                {isCameraActive ? (
                  <div className="relative w-64 h-64 rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover mirror"
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-emerald-400/40 rounded-3xl pointer-events-none" />
                  </div>
                ) : (
                  <div className="relative group">
                    <img
                      src={currentAvatar}
                      alt="Selfie de Perfil"
                      className="w-44 h-44 rounded-3xl object-cover border-4 border-emerald-500/80 shadow-2xl mx-auto"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 p-2 rounded-2xl shadow-lg font-bold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ativa</span>
                    </div>
                  </div>
                )}

                {photoFeedback && (
                  <p className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-2 rounded-xl max-w-sm">
                    {photoFeedback}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {isCameraActive ? (
                  <>
                    <button
                      onClick={captureCameraPhoto}
                      className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Tirar Foto Agora</span>
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar Câmera
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={startCamera}
                      className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Tirar Foto com Câmera</span>
                    </button>

                    <label className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 border border-slate-700">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Escolher do Aparelho</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </>
                )}
              </div>

              {/* Rule Note */}
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-[11px] text-slate-400 max-w-md mx-auto text-left space-y-1">
                <span className="font-bold text-slate-300 block">Dicas para uma boa foto:</span>
                <p>• Rosto bem iluminado, sem óculos escuros ou bonés tapando a face.</p>
                <p>• A foto será exibida com segurança apenas para o condutor designado durante a viagem.</p>
              </div>
            </div>
          )}

          {/* TAB 3: VIAGENS & COMPROVANTES */}
          {activeTab === 'HISTORICO' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Histórico de Corridas e Comprovantes</h3>
                  <p className="text-xs text-slate-400">Acesse e emita os recibos oficiais em PDF das suas viagens</p>
                </div>
              </div>

              {userRides.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <Car className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">Nenhuma corrida registrada para este perfil até o momento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userRides.map((ride) => (
                    <div
                      key={ride.id}
                      className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                            {ride.status === 'COMPLETED' ? 'Finalizada' : ride.status}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            {new Date(ride.createdAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <span className="text-sm font-black text-emerald-400">
                          R$ {(ride.fareBrl || ride.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      {/* Origin & Destination */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-emerald-400 font-bold block">Origem</span>
                          <span className="text-slate-200 truncate block">{ride.originAddress}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-sky-400 font-bold block">Destino</span>
                          <span className="text-slate-200 truncate block">{ride.destinationAddress}</span>
                        </div>
                      </div>

                      {/* Driver & Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900">
                        <span className="text-xs text-slate-400">
                          {role === 'PASSENGER' ? `Motorista: ${ride.driverName}` : `Passageiro: ${ride.passengerName}`}
                        </span>

                        <div className="flex items-center gap-2">
                          {ride.status === 'COMPLETED' && (
                            <button
                              onClick={() => setSelectedReceiptRideId(ride.id)}
                              className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Ver Comprovante</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedReportRide(ride);
                              setIsCreatingReport(true);
                            }}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs rounded-xl border border-slate-800 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Reportar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: OCORRÊNCIAS & SUPORTE */}
          {activeTab === 'OCORRENCIAS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Minhas Ocorrências e Denúncias</h3>
                  <p className="text-xs text-slate-400">Acompanhe o andamento dos chamados e auditorias</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedReportRide(null);
                    setIsCreatingReport(true);
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Nova Ocorrência</span>
                </button>
              </div>

              {isLoadingReports ? (
                <div className="py-8 text-center text-xs text-slate-400">Carregando ocorrências registradas...</div>
              ) : userReports.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs text-slate-300 font-bold">Nenhuma ocorrência pendente.</p>
                  <p className="text-[11px] text-slate-400">
                    Se você teve algum problema com veículo, conduta ou cobrança, use o botão "Nova Ocorrência".
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                            report.status === 'RESOLVED'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                              : report.status === 'INVESTIGATING'
                              ? 'bg-amber-950 text-amber-400 border-amber-500/30'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          {report.status === 'RESOLVED'
                            ? 'Resolvido'
                            : report.status === 'INVESTIGATING'
                            ? 'Em Análise'
                            : 'Aberto'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(report.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-white block">{report.category}</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-900/70 p-2.5 rounded-xl border border-slate-850">
                          {report.description}
                        </p>
                      </div>

                      {report.resolutionNotes && (
                        <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-xs space-y-1">
                          <span className="font-bold text-emerald-300 block">Resposta da Moderação:</span>
                          <p className="text-slate-300 text-[11px]">{report.resolutionNotes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PRIVACIDADE & CONTA */}
          {activeTab === 'SEGURANCA' && (
            <div className="space-y-6">
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
                <span className="font-bold text-white block">LGPD e Privacidade dos Dados</span>
                <p>
                  A plataforma VaiCar preserva suas informações em servidores seguros. O telefone e a foto de perfil são
                  utilizados estritamente para a finalidade de transporte e segurança operacional.
                </p>
              </div>

              {/* Danger Zone: Account Deletion */}
              <div className="bg-rose-950/30 border border-rose-500/30 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-rose-300">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                  <h4 className="text-sm font-black text-white">Exclusão de Conta e Dados</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Caso deseje encerrar definitivamente seu cadastro no VaiCar e apagar seus dados pessoais, você pode
                  solicitar a exclusão imediata. Esta ação é irreversível.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Excluir Minha Conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ALTERAR TELEFONE COM OTP */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <Phone className="w-5 h-5" />
                <h3 className="text-base font-black text-white">Alterar Telefone</h3>
              </div>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {phoneStep === 'INPUT' ? (
              <form onSubmit={handleRequestPhonePin} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Informe o seu novo número de telefone com DDD. Um código de segurança PIN será enviado para o seu e-mail cadastrado.
                </p>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Novo Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="(12) 99876-5432"
                    value={newPhoneInput}
                    onChange={(e) => setNewPhoneInput(e.target.value)}
                    required
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                {phoneMsg && (
                  <p className={`text-xs ${phoneMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {phoneMsg.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={phoneLoading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {phoneLoading ? 'Enviando código...' : 'Continuar e Enviar Código PIN'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhonePin} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Digite o código PIN de 4 dígitos enviado para o seu e-mail cadastrado.
                </p>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Código PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="0000"
                    value={phonePinInput}
                    onChange={(e) => setPhonePinInput(e.target.value)}
                    required
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-center text-xl tracking-widest font-black outline-none focus:border-emerald-500"
                  />
                </div>
                {phoneMsg && (
                  <p className={`text-xs ${phoneMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {phoneMsg.text}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPhoneStep('INPUT')}
                    className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={phoneLoading}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {phoneLoading ? 'Validando...' : 'Confirmar Alteração'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ALTERAR EMAIL COM OTP */}
      {showEmailModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <Mail className="w-5 h-5" />
                <h3 className="text-base font-black text-white">Alterar E-mail</h3>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {emailStep === 'INPUT' ? (
              <form onSubmit={handleRequestEmailPin} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Informe o seu novo endereço de e-mail. Um código de confirmação será enviado diretamente para a nova caixa de entrada.
                </p>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Novo E-mail</label>
                  <input
                    type="email"
                    placeholder="novo.email@exemplo.com"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    required
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                {emailMsg && (
                  <p className={`text-xs ${emailMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {emailMsg.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {emailLoading ? 'Enviando código...' : 'Continuar e Enviar Código'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailPin} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Digite o código PIN enviado para <strong className="text-white">{newEmailInput}</strong>.
                </p>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Código PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="0000"
                    value={emailPinInput}
                    onChange={(e) => setEmailPinInput(e.target.value)}
                    required
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-center text-xl tracking-widest font-black outline-none focus:border-emerald-500"
                  />
                </div>
                {emailMsg && (
                  <p className={`text-xs ${emailMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {emailMsg.text}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEmailStep('INPUT')}
                    className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {emailLoading ? 'Validando...' : 'Confirmar E-mail'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO DE CONTA */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-black text-white">Confirmar Exclusão de Conta</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta ação excluirá permanentemente o seu cadastro, histórico de corridas e preferências. Digite{' '}
              <strong className="text-rose-400">EXCLUIR</strong> para confirmar:
            </p>
            <input
              type="text"
              placeholder="Digite EXCLUIR"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-xs outline-none focus:border-rose-500"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmationText.trim() === 'EXCLUIR') {
                    if (onDeleteAccount) onDeleteAccount();
                    setShowDeleteModal(false);
                  } else {
                    alert('Digite a palavra EXCLUIR para confirmar.');
                  }
                }}
                disabled={deleteConfirmationText.trim() !== 'EXCLUIR'}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-black text-xs rounded-xl cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {selectedReceiptRideId && (
        <RideReceiptModal
          rideId={selectedReceiptRideId}
          onClose={() => setSelectedReceiptRideId(null)}
        />
      )}

      {/* REPORT MODAL */}
      {isCreatingReport && (
        <ReportModal
          ride={selectedReportRide}
          onClose={() => {
            setIsCreatingReport(false);
            setSelectedReportRide(null);
            fetchUserReports(currentPhone || currentName).then(setUserReports).catch(() => {});
          }}
        />
      )}
    </div>
  );
};
