import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Car,
  Phone,
  AlertTriangle,
  AlertCircle,
  History,
  Star,
  User,
  HelpCircle,
  MessageSquare,
  Copy,
  Check,
  Banknote,
  CreditCard,
  QrCode,
  Lock,
  PhoneCall,
  Send,
  LogOut,
  Navigation,
  XCircle,
  X,
  Package,
  FileText,
  Download,
  Compass,
  Trash2,
  Flag,
  RefreshCw,
} from 'lucide-react';
import { Zone, Ride, Driver, PaymentMethod, SearchDriversResponse } from '../types.ts';
import {
  searchDrivers,
  createRide,
  fetchRide,
  updateRideStatus,
  updateRidePaymentStatus,
  submitReview,
  passengerAuth,
  fetchPassengerRides,
  fetchPassengerReviews,
  getWhatsAppContact,
  fetchUnpaidRides,
  contestRidePayment,
  deleteOwnPassengerAccount,
  searchPlaces,
  PlaceSearchResult,
  reverseGeocode,
  computeRouteDirections,
} from '../lib/api.ts';
import { LiveRideTracker } from './LiveRideTracker.tsx';
import { ReportModal } from './ReportModal.tsx';
import { RideReceiptModal } from './RideReceiptModal.tsx';
import { VaiCarMobilityMap } from './VaiCarMobilityMap.tsx';
import { PassengerInteractiveMap } from './PassengerInteractiveMap.tsx';
import { realtimeSync, broadcastLocalRideCreated, broadcastLocalRideUpdate } from '../lib/realtimeSync.ts';

function findNearestZone(lat: number, lng: number, zoneList: Zone[]): Zone | null {
  if (!zoneList || zoneList.length === 0) return null;
  let closest = zoneList[0];
  let minDistance = Infinity;
  for (const z of zoneList) {
    const d = Math.hypot(z.lat - lat, z.lng - lng);
    if (d < minDistance) {
      minDistance = d;
      closest = z;
    }
  }
  return closest;
}

export function parseDeliveryDetails(originLandmark?: string) {
  if (!originLandmark || !originLandmark.startsWith('📦 [DELIVERY')) {
    return null;
  }
  const isMoto = originLandmark.includes('DELIVERY - MOTO');
  const isBike = originLandmark.includes('DELIVERY - BIKE');
  
  const extractField = (fieldName: string) => {
    const regex = new RegExp(`${fieldName}:\\s*([^|]+)`);
    const match = originLandmark.match(regex);
    return match ? match[1].trim() : '';
  };

  return {
    vehicleType: isMoto ? 'Motocicleta 🏍️' : (isBike ? 'Bicicleta 🚲' : 'Entrega Expressa 📦'),
    category: extractField('Categoria'),
    description: extractField('Descrição'),
    weight: extractField('Peso'),
    size: extractField('Tamanho'),
    declaredValue: extractField('Valor Decl'),
    fullString: originLandmark
  };
}

interface PassengerDashboardProps {
  zones: Zone[];
  allRides: Ride[];
  onRefreshRides: () => void;
  onGoToDriverSignup: () => void;
  initialTrackedRide?: Ride | null;
  onOpenLegal: (tab: 'termos' | 'privacidade' | 'regulacao' | 'seguranca') => void;
  onLogout?: () => void;
}

export const PassengerDashboard: React.FC<PassengerDashboardProps> = ({
  zones,
  allRides,
  onRefreshRides,
  onGoToDriverSignup,
  initialTrackedRide,
  onOpenLegal,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'SOLICITAR' | 'MAPA' | 'ATUAL' | 'HISTORICO' | 'AVALIACOES' | 'PERFIL' | 'AJUDA'>('SOLICITAR');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReceiptRideId, setSelectedReceiptRideId] = useState<string | null>(null);

  // Service Type: Passenger Ride vs Item Delivery
  const [serviceType, setServiceType] = useState<'RIDE' | 'DELIVERY'>(() => {
    const saved = localStorage.getItem('vaicar_passenger_mode');
    if (saved === 'delivery') {
      localStorage.removeItem('vaicar_passenger_mode'); // clear after reading
      return 'DELIVERY';
    }
    return 'RIDE';
  });

  // Delivery-specific inputs
  const [deliveryCategory, setDeliveryCategory] = useState<string>('ALIMENTOS');
  const [deliveryDescription, setDeliveryDescription] = useState<string>('');
  const [deliveryWeight, setDeliveryWeight] = useState<string>('');
  const [deliverySize, setDeliverySize] = useState<string>('PEQUENO');
  const [deliveryDeclaredValue, setDeliveryDeclaredValue] = useState<string>('');
  const [deliveryVehicle, setDeliveryVehicle] = useState<'MOTO' | 'BIKE'>('MOTO');
  const [deliveryRulesAccepted, setDeliveryRulesAccepted] = useState<boolean>(false);

  // Passenger Profile state (persisted locally for direct login retention)
  const [passengerName, setPassengerName] = useState(() => localStorage.getItem('vaicar_passenger_name') || '');
  const [passengerPhone, setPassengerPhone] = useState(() => localStorage.getItem('vaicar_passenger_phone') || '');
  const [passengerEmail, setPassengerEmail] = useState(() => localStorage.getItem('vaicar_passenger_email') || '');
  const [passengerAvatarUrl, setPassengerAvatarUrl] = useState(
    () => localStorage.getItem('vaicar_passenger_avatar') || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
  );

  const [isVerified, setIsVerified] = useState(() => {
    const verified = localStorage.getItem('vaicar_passenger_verified');
    const name = localStorage.getItem('vaicar_passenger_name');
    const phone = localStorage.getItem('vaicar_passenger_phone');
    return verified === 'true' && !!name && !!phone;
  });
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [emailSentSuccessfully, setEmailSentSuccessfully] = useState<boolean>(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const handleDeleteOwnAccount = async () => {
    try {
      setIsDeletingAccount(true);
      setDeleteAccountError(null);
      const identifier = passengerPhone || passengerEmail;
      if (!identifier) {
        throw new Error('Nenhum identificador de passageiro encontrado.');
      }
      await deleteOwnPassengerAccount(identifier);
      localStorage.removeItem('vaicar_passenger_name');
      localStorage.removeItem('vaicar_passenger_phone');
      localStorage.removeItem('vaicar_passenger_email');
      localStorage.removeItem('vaicar_passenger_avatar');
      localStorage.removeItem('vaicar_passenger_verified');
      setIsVerified(false);
      setPassengerName('');
      setPassengerPhone('');
      setPassengerEmail('');
      setIsDeleteAccountModalOpen(false);
      if (onLogout) {
        onLogout();
      }
    } catch (err: any) {
      setDeleteAccountError(err.message || 'Erro ao excluir conta.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handlePassengerAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            setPassengerAvatarUrl(compressed);
          } else {
            setPassengerAvatarUrl(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Search State
  const [originZoneId, setOriginZoneId] = useState<string>(zones[0]?.id || 'z-centro');
  const [destinationZoneId, setDestinationZoneId] = useState<string>(zones[1]?.id || 'z-maresias');

  // Google Maps Coordinates & Addresses (matching native Android)
  const initialOrigin = zones.find((z) => z.id === (zones[0]?.id || 'z-centro')) || zones[0];
  const [pickupLat, setPickupLat] = useState<number>(initialOrigin?.lat || -23.8078);
  const [pickupLng, setPickupLng] = useState<number>(initialOrigin?.lng || -45.4058);
  const [pickupAddress, setPickupAddress] = useState<string>(
    initialOrigin ? `${initialOrigin.name}, São Sebastião - SP` : 'Centro, São Sebastião - SP'
  );
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [destAddress, setDestAddress] = useState<string | null>(null);

  // Address Search State ("Para onde vamos?")
  const [destSearchInput, setDestSearchInput] = useState<string>('');
  const [destSuggestions, setDestSuggestions] = useState<PlaceSearchResult[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState<boolean>(false);
  const [isDestSuggestionsOpen, setIsDestSuggestionsOpen] = useState<boolean>(false);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(null);

  // Real-time Places & Address Search
  useEffect(() => {
    if (!destSearchInput.trim() || destSearchInput.trim().length < 2) {
      setDestSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const results = await searchPlaces(destSearchInput.trim());
        setDestSuggestions(results);
      } catch (err) {
        console.warn('Place search error:', err);
      } finally {
        setIsSearchingDest(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [destSearchInput]);

  // Route calculation when both pickup and destination exist
  useEffect(() => {
    if (pickupLat && pickupLng && destLat && destLng) {
      computeRouteDirections(pickupLat, pickupLng, destLat, destLng)
        .then((res) => {
          setRouteDistanceKm(res.distanceKm);
          setRouteDurationMin(res.durationMin);
        })
        .catch(() => {
          setRouteDistanceKm(null);
          setRouteDurationMin(null);
        });
    } else {
      setRouteDistanceKm(null);
      setRouteDurationMin(null);
    }
  }, [pickupLat, pickupLng, destLat, destLng]);

  const [passengers, setPassengers] = useState<number>(1);
  const [scheduleType, setScheduleType] = useState<'NOW' | 'LATER'>('NOW');
  const [scheduledTime, setScheduledTime] = useState<string>('14:00');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchDriversResponse | null>(null);
  const [searchConcluded, setSearchConcluded] = useState<boolean>(false);

  // Requesting Ride
  const [selectedDriverForRequest, setSelectedDriverForRequest] = useState<any | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentChangeFor, setPaymentChangeFor] = useState<string>('');
  const [pickupLandmark, setPickupLandmark] = useState<string>('');
  const [pickupMapsLink, setPickupMapsLink] = useState<string>('');
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [gpsCaptureSuccess, setGpsCaptureSuccess] = useState<string | null>(null);
  const [isSubmittingRide, setIsSubmittingRide] = useState<boolean>(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(initialTrackedRide || null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Review modal state
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Help / Denúncia Form state
  const [reportCategory, setReportCategory] = useState('INAPPROPRIATE_BEHAVIOR');
  const [reportTargetName, setReportTargetName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSuccessMsg, setReportSuccessMsg] = useState(false);

  // Unpaid Ride & Payment Pending states
  const [unpaidRides, setUnpaidRides] = useState<Ride[]>([]);
  const [showUnpaidModal, setShowUnpaidModal] = useState<boolean>(false);
  const [unpaidContestText, setUnpaidContestText] = useState<string>('');
  const [isSubmittingUnpaidContest, setIsSubmittingUnpaidContest] = useState<boolean>(false);
  const [unpaidContestSuccess, setUnpaidContestSuccess] = useState<string>('');

  // Sync unpaid rides for this passenger
  useEffect(() => {
    if (passengerPhone) {
      fetchUnpaidRides(passengerPhone)
        .then((list) => {
          setUnpaidRides(list || []);
        })
        .catch(() => {});
    }
  }, [passengerPhone, activeRide?.paymentStatus]);

  // Auto-sync active ride from props or from rides list
  useEffect(() => {
    if (initialTrackedRide) {
      setActiveRide(initialTrackedRide);
      setActiveTab('ATUAL');
    }
  }, [initialTrackedRide]);

  // Stable ref to avoid stale closures in event listeners and polling intervals
  const activeRideRef = useRef<Ride | null>(activeRide);
  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  // Real-Time Event Sync via SSE and BroadcastChannel (< 1ms cross-tab, instantaneous from server)
  useEffect(() => {
    const unsubscribe = realtimeSync.subscribe((event) => {
      if (event.type === 'RIDE_UPDATED' || event.type === 'RIDE_CREATED') {
        const payloadRide = event.payload as Ride | undefined;
        // If this event matches our current active ride, update state immediately!
        if (activeRideRef.current && payloadRide && payloadRide.id === activeRideRef.current.id) {
          setActiveRide(payloadRide);
        } else if (activeRideRef.current?.id) {
          // Check if our active ride was updated
          fetchRide(activeRideRef.current.id)
            .then((fresh) => {
              if (fresh) setActiveRide(fresh);
            })
            .catch(() => {});
        }
        // Always trigger parent rides refresh immediately
        onRefreshRides();
      } else if (event.type === 'RIDE_DELETED') {
        if (activeRideRef.current && event.payload?.id === activeRideRef.current.id) {
          setActiveRide(null);
        }
        onRefreshRides();
      }
    });

    return () => unsubscribe();
  }, [onRefreshRides]);

  // Keep active ride synced with updated rides from backend
  useEffect(() => {
    if (activeRide) {
      const refreshed = allRides.find((r) => r.id === activeRide.id);
      if (refreshed) {
        if (
          refreshed.status !== activeRide.status ||
          refreshed.updatedAt !== activeRide.updatedAt ||
          refreshed.paymentStatus !== activeRide.paymentStatus
        ) {
          setActiveRide(refreshed);
        }
      }
    } else {
      // Auto-restore any active in-progress ride belonging to this passenger (newest first)
      const isCandidateMyRide = (r: Ride) => {
        const cleanP1 = (r.passengerPhone || '').replace(/\D/g, '');
        const cleanP2 = (passengerPhone || '').replace(/\D/g, '');
        if (cleanP1 && cleanP2 && (cleanP1 === cleanP2 || cleanP1.endsWith(cleanP2) || cleanP2.endsWith(cleanP1))) {
          return true;
        }
        const n1 = (r.passengerName || '').trim().toLowerCase();
        const n2 = (passengerName || '').trim().toLowerCase();
        if (n1 && n2 && (n1 === n2 || n1.includes(n2) || n2.includes(n1))) {
          return true;
        }
        return false;
      };

      const activeCandidates = allRides
        .filter(
          (r) =>
            isCandidateMyRide(r) &&
            ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'PASSENGER_PICKED_UP', 'IN_PROGRESS'].includes(r.status),
        )
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      if (activeCandidates.length > 0) {
        setActiveRide(activeCandidates[0]);
        setActiveTab('ATUAL');
      }
    }
  }, [allRides, activeRide?.id, activeRide?.status, activeRide?.updatedAt, activeRide?.paymentStatus, passengerPhone, passengerName]);

  // Direct fast polling fallback (every 1s) for active ride: guaranteed sync under all network conditions
  useEffect(() => {
    if (
      !activeRide ||
      ['COMPLETED', 'CANCELLED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'REJECTED', 'EXPIRED'].includes(
        activeRide.status,
      )
    ) {
      return;
    }

    const currentRideId = activeRide.id;
    const interval = setInterval(async () => {
      try {
        const fresh = await fetchRide(currentRideId);
        if (fresh) {
          if (
            fresh.status !== activeRideRef.current?.status ||
            fresh.updatedAt !== activeRideRef.current?.updatedAt ||
            fresh.paymentStatus !== activeRideRef.current?.paymentStatus
          ) {
            setActiveRide(fresh);
            onRefreshRides();
          }
        }
      } catch {
        // ignore background poll error
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRide?.id, activeRide?.status, onRefreshRides]);

  // Ensure default zones if available
  useEffect(() => {
    if (zones.length >= 2 && !originZoneId) {
      setOriginZoneId(zones[0].id);
      setDestinationZoneId(zones[1].id);
    }
  }, [zones]);

  const originZone = zones.find((z) => z.id === originZoneId);
  const destinationZone = zones.find((z) => z.id === destinationZoneId);

  // Filter rides belonging to this passenger
  const myRides = allRides.filter(
    (r) => r.passengerPhone === passengerPhone || r.passengerName === passengerName,
  );

  const handlePerformSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!destAddress || destLat === null || destLng === null) {
      alert('Por favor, defina o local de destino ("Para onde vamos?") antes de buscar motoristas.');
      return;
    }

    if (serviceType === 'DELIVERY' && !deliveryRulesAccepted) {
      alert('Você precisa marcar a caixa confirmando que aceita as Normas de Segurança e regras da plataforma.');
      return;
    }

    const effOriginZone = zones.find((z) => z.id === originZoneId) || findNearestZone(pickupLat, pickupLng, zones) || zones[0];
    const effDestZone = zones.find((z) => z.id === destinationZoneId) || (destLat !== null && destLng !== null ? findNearestZone(destLat, destLng, zones) : null) || zones[1] || zones[0];

    if (!effOriginZone || !effDestZone) {
      alert('Localidades não identificadas.');
      return;
    }

    try {
      setIsSearching(true);
      setSearchConcluded(false);
      const res = await searchDrivers(effOriginZone.id, effDestZone.id, serviceType === 'DELIVERY' ? 1 : passengers);
      
      // If delivery, let's tag and adjust prices (e.g. 25% discount for bike delivery)
      if (serviceType === 'DELIVERY' && res?.results) {
        res.results = res.results.map((driver: any) => {
          const discount = deliveryVehicle === 'BIKE' ? 0.75 : 1.0; // 25% off for bicycle!
          return {
            ...driver,
            fare: Math.max(10, Math.round(driver.fare * discount)),
          };
        });
      }

      setSearchResults(res);
      setSearchConcluded(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao buscar motoristas');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCapturePickupGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu dispositivo.');
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 10);
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        setPickupMapsLink(mapsUrl);
        setPickupLat(lat);
        setPickupLng(lng);
        setGpsCaptureSuccess(`Sinal GPS obtido! Precisão de ~${accuracy}m`);
        
        reverseGeocode(lat, lng)
          .then((geo) => {
            setPickupAddress(geo.address);
            const nearest = findNearestZone(lat, lng, zones);
            if (nearest) setOriginZoneId(nearest.id);
          })
          .catch(() => {
            setPickupAddress(`GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          });

        if (!pickupLandmark) {
          setPickupLandmark(`Localização GPS exata (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        }
        setTimeout(() => setGpsCaptureSuccess(null), 5000);
      },
      (err) => {
        setIsLocatingGps(false);
        alert('Não foi possível obter seu GPS. Por favor, permita o acesso à localização no navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirmRequest = async () => {
    if (!selectedDriverForRequest || !originZone || !destinationZone) return;

    try {
      setIsSubmittingRide(true);
      
      let finalOriginLandmark = pickupLandmark;
      if (serviceType === 'DELIVERY') {
        finalOriginLandmark = `📦 [DELIVERY - ${deliveryVehicle}] Categoria: ${deliveryCategory} | Descrição: ${deliveryDescription || 'Sem descrição'} | Peso: ${deliveryWeight || 'N/A'} kg | Tamanho: ${deliverySize} | Valor Declarado: R$ ${deliveryDeclaredValue || '0,00'} | Instruções: ${pickupLandmark || 'N/A'}`;
      }

      const newRide = await createRide({
        driverId: selectedDriverForRequest.driverId,
        passengerName,
        passengerPhone,
        passengerAvatarUrl, // <--- Pass avatar
        passengerCount: serviceType === 'DELIVERY' ? 1 : passengers,
        originZoneId: originZone.id,
        destinationZoneId: destinationZone.id,
        originAddress: pickupAddress || `${originZone.name}, São Sebastião - SP`,
        destinationAddress: destAddress || `${destinationZone.name}, São Sebastião - SP`,
        originLat: pickupLat,
        originLng: pickupLng,
        destinationLat: destLat ?? undefined,
        destinationLng: destLng ?? undefined,
        originLandmark: finalOriginLandmark, // <--- Pass exact landmark / delivery info
        originMapsLink: pickupMapsLink, // <--- Pass maps link
        estimatedDistanceKm: searchResults?.distanceKm || 12,
        estimatedDurationMin: searchResults?.estimatedDurationMin || 20,
        estimatedPrice: selectedDriverForRequest.fare,
        paymentMethod: selectedPaymentMethod,
        paymentChangeFor: selectedPaymentMethod === 'CASH' && paymentChangeFor ? Number(paymentChangeFor) : undefined,
      });

      // Clear specific pickup inputs
      setPickupLandmark('');
      setPickupMapsLink('');
      setSelectedDriverForRequest(null);
      setActiveRide(newRide);
      setActiveTab('ATUAL');
      broadcastLocalRideCreated(newRide);
      onRefreshRides();
    } catch (err: any) {
      if (err.message && (err.message.includes('pagamento pendente') || err.message.includes('PAYMENT_PENDING') || err.message.includes('pendente de uma corrida'))) {
        fetchUnpaidRides(passengerPhone).then((list) => {
          setUnpaidRides(list || []);
          setShowUnpaidModal(true);
        }).catch(() => {
          setShowUnpaidModal(true);
        });
      } else {
        alert(err.message || 'Erro ao solicitar corrida');
      }
    } finally {
      setIsSubmittingRide(false);
    }
  };

  const handleCancelCurrentRide = async () => {
    if (!activeRide) return;
    if (!window.confirm('Tem certeza de que deseja cancelar esta solicitação de corrida?')) return;

    try {
      const updated = await updateRideStatus(activeRide.id, 'CANCELLED_BY_PASSENGER', 'Cancelado pelo passageiro');
      setActiveRide(updated);
      broadcastLocalRideUpdate(updated);
      onRefreshRides();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar corrida');
    }
  };

  const handleConfirmPaymentDirect = async () => {
    if (!activeRide) return;
    try {
      const updated = await updateRidePaymentStatus(activeRide.id, 'PAID');
      if (updated && (updated as any).id) {
        broadcastLocalRideUpdate(updated as any);
      }
      setActiveRide(updated);
      onRefreshRides();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar pagamento');
    }
  };

  const handleCopyPixKey = () => {
    if (activeRide?.pixKey) {
      navigator.clipboard.writeText(activeRide.pixKey);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    }
  };

  const handleSubmitReview = async () => {
    if (!activeRide) return;
    try {
      await submitReview({
        rideId: activeRide.id,
        reviewerRole: 'PASSENGER',
        reviewerName: passengerName,
        driverId: activeRide.driverId,
        rating: ratingInput,
        comment: reviewComment,
      });
      setReviewSubmitted(true);
      onRefreshRides();
      setTimeout(() => {
        setReviewSubmitted(false);
        setReviewComment('');
      }, 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar avaliação');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await passengerAuth({
        name: isLoginMode ? undefined : passengerName,
        phone: passengerPhone,
        email: isLoginMode ? undefined : passengerEmail,
        verificationCode: verificationCodeInput || undefined,
        avatarUrl: isLoginMode ? undefined : passengerAvatarUrl,
      });
      if (res.codeSent) {
        setCodeRequested(true);
        setEmailSentSuccessfully(!!res.emailSent);
        if (res.emailSent) {
          setAuthMessage(`Código PIN enviado com sucesso para seu e-mail cadastrado! Verifique sua caixa de entrada e pasta de spam.`);
        } else {
          setAuthMessage(`Código PIN enviado para o e-mail cadastrado. Por favor, verifique.`);
        }
      } else if (res.success && res.passenger) {
        setIsVerified(true);
        setCodeRequested(false);
        setVerificationCodeInput('');
        setAuthMessage('Login efetuado com sucesso!');
        setPassengerName(res.passenger.name || '');
        setPassengerPhone(res.passenger.phone || passengerPhone);
        setPassengerEmail(res.passenger.email || '');
        setPassengerAvatarUrl(res.passenger.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80');
        localStorage.setItem('vaicar_passenger_name', res.passenger.name);
        localStorage.setItem('vaicar_passenger_phone', res.passenger.phone);
        if (res.passenger.email) localStorage.setItem('vaicar_passenger_email', res.passenger.email);
        localStorage.setItem('vaicar_passenger_avatar', res.passenger.avatarUrl || '');
        localStorage.setItem('vaicar_passenger_verified', 'true');
        localStorage.setItem('vaicar_user_role', 'PASSENGER');
      } else if (res.success) {
        setIsVerified(true);
        setCodeRequested(false);
        setVerificationCodeInput('');
        setAuthMessage('Perfil verificado e salvo com sucesso!');
        localStorage.setItem('vaicar_passenger_name', passengerName);
        localStorage.setItem('vaicar_passenger_phone', passengerPhone);
        if (passengerEmail) localStorage.setItem('vaicar_passenger_email', passengerEmail);
        localStorage.setItem('vaicar_passenger_avatar', passengerAvatarUrl);
        localStorage.setItem('vaicar_passenger_verified', 'true');
        localStorage.setItem('vaicar_user_role', 'PASSENGER');
      }
    } catch (err: any) {
      setAuthMessage(err.message || 'Erro ao validar perfil');
    }
  };

  const handleSendReport = (e: React.FormEvent) => {
    e.preventDefault();
    setReportSuccessMsg(true);
    setReportDescription('');
    setReportTargetName('');
    setTimeout(() => setReportSuccessMsg(false), 4000);
  };

  // If the passenger is not yet registered or verified, display the simple onboarding gate
  if (!isVerified) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-white">Acessar como Passageiro</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isLoginMode
                ? 'Digite seu número de WhatsApp para receber um PIN de acesso por e-mail e entrar.'
                : 'Faça seu registro simples para ficar conectado diretamente na sua conta e solicitar corridas em São Sebastião.'}
            </p>
          </div>

          {/* Alternador Cadastro vs Login */}
          {!codeRequested && (
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(false);
                  setAuthMessage(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  !isLoginMode
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Novo Cadastro
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(true);
                  setAuthMessage(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  isLoginMode
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Login (Já Cadastrado)
              </button>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Foto de Perfil */}
            {!isLoginMode && (
              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <label className="text-xs font-bold text-slate-300 block">Sua Foto de Perfil (Opcional)</label>
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={passengerAvatarUrl}
                      alt="Sua foto"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePassengerAvatarChange}
                      className="hidden"
                      id="onboarding-passenger-avatar-upload"
                    />
                    <label
                      htmlFor="onboarding-passenger-avatar-upload"
                      className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all border border-slate-700"
                    >
                      Escolher Foto
                    </label>
                    <p className="text-[10px] text-slate-400">Ajuda o motorista a te identificar no local de embarque.</p>
                  </div>
                </div>
              </div>
            )}

            {!isLoginMode && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Nome Completo *</label>
                <input
                  type="text"
                  placeholder="Ex: Alan Morais"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  required={!isLoginMode}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">WhatsApp / Telefone *</label>
              <input
                type="tel"
                placeholder="Ex: (12) 99999-8888"
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                required
                className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
              />
            </div>

            {!isLoginMode && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">E-mail *</label>
                <input
                  type="email"
                  placeholder="Ex: alan@email.com"
                  value={passengerEmail}
                  onChange={(e) => setPassengerEmail(e.target.value)}
                  required={!isLoginMode}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {codeRequested && (
              <div className="space-y-3 bg-emerald-950/30 p-4 rounded-2xl border border-emerald-500/40 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-400">Código PIN de Validação</label>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    ✉️ Enviado ao e-mail
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Digite o código de 4 dígitos"
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value.trim())}
                  required
                  autoFocus
                  maxLength={6}
                  className="w-full bg-slate-950 text-emerald-400 text-center text-xl font-mono tracking-widest px-3.5 py-2.5 rounded-xl border border-emerald-500/60 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                />

                <p className="text-[11px] text-slate-400 text-center">
                  O código confidencial foi enviado para a sua caixa de entrada. Verifique seu e-mail e pasta de spam.
                </p>
              </div>
            )}

            {authMessage && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${authMessage.includes('Erro') || authMessage.includes('incorreto') ? 'bg-rose-950/50 border border-rose-500/30 text-rose-300' : 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'}`}>
                {authMessage}
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-sm cursor-pointer shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {codeRequested ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar PIN e Entrar</span>
                  </>
                ) : (
                  <>
                    <span>{isLoginMode ? 'Solicitar PIN de Acesso →' : 'Continuar e Validar Cadastro →'}</span>
                  </>
                )}
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-xs text-slate-400 hover:text-white py-2 cursor-pointer transition-colors"
                >
                  ← Voltar à seleção de perfil
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Logged in Passenger Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <img
            src={passengerAvatarUrl}
            alt={passengerName}
            className="w-11 h-11 rounded-xl object-cover border border-emerald-500/50"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">Olá, {passengerName || 'Passageiro'}!</h2>
              <span className="bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Verificado</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">{passengerPhone} {passengerEmail ? `• ${passengerEmail}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('PERFIL')}
            className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            Meu Perfil
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-xs font-bold text-slate-400 hover:text-rose-300 bg-slate-800/60 hover:bg-rose-950/40 px-3 py-1.5 rounded-xl border border-slate-700/60 hover:border-rose-500/40 transition-colors cursor-pointer flex items-center gap-1"
              title="Trocar perfil ou sair"
            >
              <LogOut className="w-3 h-3" />
              <span>Sair</span>
            </button>
          )}
        </div>
      </div>

      {/* Unpaid Pending Payment Banner */}
      {unpaidRides.length > 0 && (
        <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/40 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-black text-white block">
                Você possui um pagamento pendente de corrida anterior
              </span>
              <span className="text-[11px] text-rose-300">
                Valor devido: <strong>R$ {(unpaidRides[0].fareBrl !== undefined ? unpaidRides[0].fareBrl : unpaidRides[0].estimatedPrice).toFixed(2).replace('.', ',')}</strong> ({unpaidRides[0].driverName || 'Motorista'}) • {unpaidRides[0].paymentStatus === 'PAYMENT_CONTESTED' ? 'Contestação sob análise' : 'Regularize ou conteste para solicitar novas viagens'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowUnpaidModal(true)}
            className="bg-rose-500 hover:bg-rose-400 text-white font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 shadow text-center"
          >
            Ver Detalhes / Contestar
          </button>
        </div>
      )}

      {/* Passenger Navigation Tabs */}
      <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl scrollbar-none">
        <button
          onClick={() => setActiveTab('SOLICITAR')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'SOLICITAR'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Solicitar Corrida</span>
        </button>

        <button
          onClick={() => setActiveTab('MAPA')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'MAPA'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Mapa da Cidade</span>
        </button>

        <button
          onClick={() => setActiveTab('ATUAL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative ${
            activeTab === 'ATUAL'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Corrida Atual</span>
          {activeRide && !['COMPLETED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'EXPIRED'].includes(activeRide.status) && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('HISTORICO')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'HISTORICO'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico ({myRides.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AVALIACOES')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'AVALIACOES'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Avaliações</span>
        </button>

        <button
          onClick={() => setActiveTab('PERFIL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'PERFIL'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Perfil</span>
        </button>

        <button
          onClick={() => setActiveTab('AJUDA')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'AJUDA'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Ajuda & Denúncia</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: SOLICITAR CORRIDA */}
      {/* ========================================================================= */}
      {activeTab === 'SOLICITAR' && (
        <div className="space-y-6">
          {/* Main Search Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="mb-5 space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Car className="w-6 h-6 text-emerald-400" />
                {serviceType === 'RIDE' ? 'Solicitar Viagem em São Sebastião' : 'Solicitar Entrega em São Sebastião'}
              </h2>
              <p className="text-xs text-slate-400">
                {serviceType === 'RIDE' 
                  ? 'Selecione as zonas de origem e destino para consultar motoristas cadastrados disponíveis.'
                  : 'Preencha os dados do envio e selecione os endereços de coleta e entrega.'}
              </p>
            </div>

            {/* Service Toggle */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => setServiceType('RIDE')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  serviceType === 'RIDE'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Pedir Corrida (Passageiro)</span>
              </button>
              <button
                type="button"
                onClick={() => setServiceType('DELIVERY')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  serviceType === 'DELIVERY'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Solicitar Entrega (Delivery)</span>
              </button>
            </div>

            {/* Mandatory Disclaimers as required by Section 3 & 25 */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Preço Direto:</span>
                  O preço da {serviceType === 'RIDE' ? 'corrida' : 'entrega'} é definido pelo {serviceType === 'RIDE' ? 'motorista' : 'entregador'}.
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5 text-slate-300">
                <Banknote className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Pagamento Direto:</span>
                  O pagamento é realizado diretamente com o {serviceType === 'RIDE' ? 'motorista' : 'entregador'}.
                </div>
              </div>
            </div>

            {/* Split View: Left Column (Map) & Right Column (Android-matched Ride Booking Panel) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6">
              {/* Left Column: Real Interactive Google Map */}
              <div className="lg:col-span-7 xl:col-span-7 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Google Maps Interativo • Embarque & Destino
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Arraste o mapa sob o pino central para definir o embarque
                  </span>
                </div>

                <PassengerInteractiveMap
                  zones={zones}
                  pickupLat={pickupLat}
                  pickupLng={pickupLng}
                  pickupAddress={pickupAddress}
                  destLat={destLat}
                  destLng={destLng}
                  destAddress={destAddress}
                  availableDrivers={searchResults?.results || []}
                  selectedDriver={selectedDriverForRequest}
                  activeRide={activeRide}
                  className="w-full h-[460px] lg:h-[620px] rounded-2xl"
                  onUpdatePickup={(lat, lng, addr) => {
                    setPickupLat(lat);
                    setPickupLng(lng);
                    setPickupAddress(addr);
                    const nearest = findNearestZone(lat, lng, zones);
                    if (nearest) setOriginZoneId(nearest.id);
                  }}
                  onSelectDestination={(lat, lng, addr, zoneId) => {
                    setDestLat(lat);
                    setDestLng(lng);
                    setDestAddress(addr);
                    setDestSearchInput(addr);
                    setIsDestSuggestionsOpen(false);
                    if (zoneId) {
                      setDestinationZoneId(zoneId);
                    } else {
                      const nearest = findNearestZone(lat, lng, zones);
                      if (nearest) setDestinationZoneId(nearest.id);
                    }
                  }}
                />
              </div>

              {/* Right Column: Ride Request Card (Web version of Android Passenger Flow) */}
              <div className="lg:col-span-5 xl:col-span-5 space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Car className="w-4 h-4 text-emerald-400" />
                      <span>{serviceType === 'RIDE' ? 'Solicitar Viagem' : 'Solicitar Envio'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {serviceType === 'RIDE' ? 'Mesmo fluxo e transparência do app VaiCar' : 'Entrega rápida por motocicletas ou bicicletas'}
                    </p>
                  </div>
                  {activeRide && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Corrida Ativa
                    </span>
                  )}
                </div>

                <form onSubmit={handlePerformSearch} className="space-y-4">
                  {/* 1. Local de Embarque Card */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        Local de Embarque
                      </span>
                      <button
                        type="button"
                        onClick={handleCapturePickupGps}
                        disabled={isLocatingGps}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Usar minha localização GPS atual"
                      >
                        <Navigation className={`w-3 h-3 ${isLocatingGps ? 'animate-spin' : ''}`} />
                        <span>{isLocatingGps ? 'Obtendo GPS...' : 'Usar GPS'}</span>
                      </button>
                    </div>

                    <div className="text-xs font-semibold text-white bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 break-words flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1 animate-pulse" />
                      <span>{pickupAddress || 'São Sebastião - SP'}</span>
                    </div>

                    <p className="text-[10px] text-slate-500">
                      💡 O pino de embarque fica fixo no centro do mapa. Arraste o mapa para posicionar com precisão.
                    </p>
                  </div>

                  {/* 2. Destino ("Para onde vamos?") */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5 text-sky-400" />
                        Para onde vamos?
                      </span>
                      {destAddress && (
                        <button
                          type="button"
                          onClick={() => {
                            setDestAddress(null);
                            setDestLat(null);
                            setDestLng(null);
                            setDestSearchInput('');
                          }}
                          className="text-[10px] text-slate-400 hover:text-rose-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>Alterar Destino</span>
                        </button>
                      )}
                    </div>

                    {destAddress ? (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-white bg-slate-900/80 p-2.5 rounded-lg border border-sky-500/40 break-words flex items-start gap-2">
                          <Flag className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="block truncate">{destAddress}</span>
                            {routeDistanceKm !== null && (
                              <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                                Trajeto estimado: {routeDistanceKm} km • ~{routeDurationMin} min de viagem
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            value={destSearchInput}
                            onChange={(e) => {
                              setDestSearchInput(e.target.value);
                              setIsDestSuggestionsOpen(true);
                            }}
                            onFocus={() => setIsDestSuggestionsOpen(true)}
                            placeholder="Digite o endereço, praia ou ponto de interesse..."
                            className="w-full bg-slate-900 text-white text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 outline-none transition-colors"
                          />
                          {isSearchingDest && (
                            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin absolute right-3 top-3" />
                          )}
                        </div>

                        {/* Dropdown Suggestions */}
                        {isDestSuggestionsOpen && (
                          <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-40 max-h-56 overflow-y-auto p-1.5 space-y-1">
                            {destSuggestions.length > 0 ? (
                              destSuggestions.map((place, idx) => (
                                <button
                                  key={`sugg-${idx}-${place.lat}-${place.lng}`}
                                  type="button"
                                  onClick={() => {
                                    setDestLat(place.lat);
                                    setDestLng(place.lng);
                                    setDestAddress(`${place.title} - ${place.subtitle}`);
                                    setDestSearchInput(`${place.title} - ${place.subtitle}`);
                                    setIsDestSuggestionsOpen(false);
                                    const nearest = findNearestZone(place.lat, place.lng, zones);
                                    if (nearest) setDestinationZoneId(nearest.id);
                                  }}
                                  className="w-full text-left p-2 rounded-lg hover:bg-sky-500/20 transition-colors flex items-start gap-2 cursor-pointer"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-bold text-white block truncate">{place.title}</span>
                                    <span className="text-[10px] text-slate-400 block truncate">{place.subtitle}</span>
                                  </div>
                                </button>
                              ))
                            ) : destSearchInput.trim().length >= 2 ? (
                              <div className="p-3 text-center text-xs text-slate-400">
                                Nenhum endereço encontrado para "{destSearchInput}".
                              </div>
                            ) : (
                              <div className="p-2 space-y-1.5">
                                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                  Sugestões Rápidas de Destino:
                                </span>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {zones.slice(0, 6).map((z) => (
                                    <button
                                      key={`quick-zone-${z.id}`}
                                      type="button"
                                      onClick={() => {
                                        setDestLat(z.lat);
                                        setDestLng(z.lng);
                                        setDestAddress(`${z.name}, São Sebastião - SP`);
                                        setDestSearchInput(`${z.name}, São Sebastião - SP`);
                                        setDestinationZoneId(z.id);
                                        setIsDestSuggestionsOpen(false);
                                      }}
                                      className="p-1.5 rounded-lg bg-slate-950 hover:bg-sky-500/20 border border-slate-800 text-left cursor-pointer"
                                    >
                                      <span className="text-[11px] font-bold text-white block truncate">{z.name}</span>
                                      <span className="text-[9px] text-slate-500 block">Praia / Bairro</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Delivery Details (If DELIVERY mode) */}
                  {serviceType === 'DELIVERY' && (
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3 text-xs">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDeliveryVehicle('MOTO')}
                          className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            deliveryVehicle === 'MOTO'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          🏍️ Moto
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryVehicle('BIKE')}
                          className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            deliveryVehicle === 'BIKE'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          🚲 Bicicleta
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Descrição do Pacote</label>
                        <input
                          type="text"
                          placeholder="Ex: Documentos, Pizza, Encomenda..."
                          value={deliveryDescription}
                          onChange={(e) => setDeliveryDescription(e.target.value)}
                          required={serviceType === 'DELIVERY'}
                          className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-800 outline-none text-xs"
                        />
                      </div>

                      <label className="flex items-start gap-2 text-[10px] text-slate-300 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={deliveryRulesAccepted}
                          onChange={(e) => setDeliveryRulesAccepted(e.target.checked)}
                          className="mt-0.5 rounded border-slate-800 text-emerald-500"
                        />
                        <span>Concordo com as regras de segurança e transporte de itens.</span>
                      </label>
                    </div>
                  )}

                  {/* 4. Passengers Quantity (When RIDE) */}
                  {serviceType === 'RIDE' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-400" />
                        Passageiros
                      </label>
                      <div className="grid grid-cols-4 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setPassengers(num)}
                            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              passengers === num
                                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {num} {num === 1 ? 'pessoa' : 'pessoas'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Schedule (Agora vs Agendar) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Horário da Corrida
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setScheduleType('NOW')}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          scheduleType === 'NOW'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        Agora (Imediato)
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduleType('LATER')}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          scheduleType === 'LATER'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        Agendar
                      </button>
                    </div>
                  </div>

                  {/* Map notice */}
                  <div className="text-[11px] text-emerald-400 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Google Maps ativo • Coordenadas GPS em tempo real e cálculo de rotas pela SP-055.</span>
                  </div>

                  {/* Primary Action Button */}
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {isSearching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Buscando motoristas cadastrados...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Pesquisar Motoristas Disponíveis</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Search Results Area */}
          {searchConcluded && searchResults && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Motoristas Disponíveis</span>
                    <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      {searchResults.totalFound} {searchResults.totalFound === 1 ? 'encontrado' : 'encontrados'}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Estimativa de trajeto: {searchResults.distanceKm} km • ~{searchResults.estimatedDurationMin} min
                  </span>
                </div>

                {/* Dynamic Pricing Alert */}
                {searchResults.isDynamicActive && (
                  <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold ${
                    searchResults.dynamicMultiplier > 1.0 
                      ? 'bg-amber-950/40 border-amber-500/30 text-amber-400' 
                      : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  }`}>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {searchResults.dynamicMultiplier > 1.0 
                        ? `Tarifa de Alta Demanda Ativa (${searchResults.dynamicMultiplier}x)` 
                        : `Tarifa com Desconto Promocional (${searchResults.dynamicMultiplier}x)`}
                    </span>
                    <span className="ml-auto opacity-70 font-normal">Ajustado pela oferta/demanda local</span>
                  </div>
                )}
              </div>

              {/* Empty state when 0 drivers available */}
              {searchResults.results.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Car className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white">Nenhum motorista disponível no momento.</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Não há motoristas cadastrados e online para esta rota no momento. Tente novamente em alguns minutos.
                  </p>
                  <button
                    onClick={onGoToDriverSignup}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 cursor-pointer"
                  >
                    + Cadastrar como Motorista
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.results.map((driver) => {
                    const isDelivery = serviceType === 'DELIVERY';
                    const displayVehicleText = isDelivery
                      ? (deliveryVehicle === 'MOTO' ? '🏍️ Motocicleta Honda CG Titan 160 (Preta)' : '🚲 Bicicleta Caloi Vulcan (Vermelha)')
                      : `${driver.vehicle.brand} ${driver.vehicle.model} • ${driver.vehicle.color}`;
                    
                    const labelRoleText = isDelivery ? 'Entregador Verificado' : 'Verificado';
                    const priceLabel = isDelivery ? 'Preço da entrega' : 'Preço do motorista';
                    const selectButtonText = isDelivery ? 'Escolher este Entregador' : 'Escolher este Motorista';
                    const capacityLabel = isDelivery ? `Tipo: Envio por ${deliveryVehicle === 'MOTO' ? 'Moto' : 'Bike'}` : `Capacidade: ${driver.vehicle.capacity} passageiros`;

                    return (
                      <div
                        key={driver.driverId}
                        className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 space-y-4 transition-all shadow-lg relative group"
                      >
                        {/* Driver info header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={driver.avatarUrl}
                              alt={driver.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-md"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-white text-sm">{driver.name}</h4>
                                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-1 rounded font-semibold">
                                  {labelRoleText}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">{displayVehicleText}</p>
                              <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold mt-0.5">
                                <Star className="w-3 h-3 fill-amber-400" />
                                <span>{driver.ratingAverage.toFixed(1)}</span>
                                <span className="text-slate-500 font-normal">({driver.ratingCount} avaliações)</span>
                              </div>
                            </div>
                          </div>

                          {/* Price badge */}
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">{priceLabel}</span>
                            <span className="text-xl font-black text-emerald-400">R$ {driver.fare.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs text-slate-400">
                          <span>Chegada em ~{driver.arrivalTimeMin} min</span>
                          <span className="text-slate-400">{capacityLabel}</span>
                        </div>

                        {/* Select driver for ride button */}
                        <button
                          onClick={() => setSelectedDriverForRequest(driver)}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md"
                        >
                          <span>{selectButtonText}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Modal to Confirm Ride and choose payment method */}
          {selectedDriverForRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    {serviceType === 'RIDE' ? (
                      <>
                        <Car className="w-5 h-5 text-emerald-400" />
                        <span>Confirmar Solicitação de Corrida</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-5 h-5 text-emerald-400" />
                        <span>Confirmar Solicitação de Entrega</span>
                      </>
                    )}
                  </h3>
                  <button
                    onClick={() => setSelectedDriverForRequest(null)}
                    className="text-slate-400 hover:text-white cursor-pointer text-xs"
                  >
                    Fechar
                  </button>
                </div>

                {/* Driver summary */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedDriverForRequest.avatarUrl}
                      alt={selectedDriverForRequest.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-white text-sm">{selectedDriverForRequest.name}</h4>
                      <p className="text-xs text-slate-400">
                        {serviceType === 'DELIVERY'
                          ? (deliveryVehicle === 'MOTO' ? '🏍️ Motocicleta Honda Titan (Preta)' : '🚲 Bicicleta Caloi Vulcan (Vermelha)')
                          : `${selectedDriverForRequest.vehicle.brand} ${selectedDriverForRequest.vehicle.model}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total combinado</span>
                    <span className="text-lg font-black text-emerald-400">
                      R$ {selectedDriverForRequest.fare.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Route Summary */}
                <div className="text-xs space-y-1 text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">{serviceType === 'RIDE' ? 'Origem:' : 'Coleta:'}</span>
                    <span>{originZone?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">{serviceType === 'RIDE' ? 'Destino:' : 'Entrega:'}</span>
                    <span>{destinationZone?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    {serviceType === 'DELIVERY' ? (
                      <span>Modalidade: Envio por {deliveryVehicle === 'MOTO' ? 'MOTO' : 'BIKE'}</span>
                    ) : (
                      <span>Passageiros: {passengers}</span>
                    )}
                    <span>•</span>
                    <span>Distância estimada: {searchResults?.distanceKm || 12} km</span>
                  </div>
                </div>

                {/* Localização Exata para Embarque */}
                <div className="space-y-2.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    {serviceType === 'RIDE' ? 'Localização Exata de Embarque *' : 'Instruções para Retirada / Detalhes de Acesso *'}
                  </label>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                        {serviceType === 'RIDE' 
                          ? 'Ponto de Referência / Número / Instrução específica:' 
                          : 'Ponto de coleta exato, nome do responsável ou número do local:'}
                      </span>
                      <input
                        type="text"
                        placeholder={serviceType === 'RIDE' ? 'Ex: Em frente à Padaria Maresias, portão branco' : 'Ex: Retirar com Maria no Apt 42, Bloco B'}
                        value={pickupLandmark}
                        onChange={(e) => setPickupLandmark(e.target.value)}
                        required
                        className="w-full bg-slate-950 text-white text-xs px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400">Ponto de Localização GPS exato:</span>
                        <button
                          type="button"
                          onClick={handleCapturePickupGps}
                          disabled={isLocatingGps}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/60 border border-emerald-500/30 px-2 py-0.5 rounded transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Navigation className={`w-2.5 h-2.5 ${isLocatingGps ? 'animate-spin' : ''}`} />
                          <span>{isLocatingGps ? 'Obtendo GPS...' : '📍 Usar Meu GPS Atual'}</span>
                        </button>
                      </div>

                      {gpsCaptureSuccess && (
                        <div className="mb-1.5 text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded">
                          {gpsCaptureSuccess}
                        </div>
                      )}

                      <input
                        type="url"
                        placeholder="Ex: https://maps.google.com/?q=-23.79... ou clique em 'Usar Meu GPS'"
                        value={pickupMapsLink}
                        onChange={(e) => setPickupMapsLink(e.target.value)}
                        className="w-full bg-slate-950 text-white text-xs px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method Selector (Direct payment to driver) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Forma de Pagamento Direto com o Motorista:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('PIX')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedPaymentMethod === 'PIX'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <QrCode className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                      <span className="text-xs block">Pix Direto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('CASH')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedPaymentMethod === 'CASH'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Banknote className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                      <span className="text-xs block">Dinheiro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('CARD_DEBIT')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedPaymentMethod === 'CARD_DEBIT' || selectedPaymentMethod === 'CARD_CREDIT'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                      <span className="text-xs block">Maquininha</span>
                    </button>
                  </div>

                  {selectedPaymentMethod === 'CASH' && (
                    <div className="pt-2">
                      <label className="text-[11px] text-slate-400 block mb-1">Precisa de troco para quanto? (Opcional)</label>
                      <input
                        type="number"
                        placeholder="Ex: 50 ou 100"
                        value={paymentChangeFor}
                        onChange={(e) => setPaymentChangeFor(e.target.value)}
                        className="w-full bg-slate-950 text-white text-xs px-3 py-2 rounded-lg border border-slate-700 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDriverForRequest(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRequest}
                    disabled={isSubmittingRide}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs cursor-pointer transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingRide ? (
                      <span>Enviando solicitação...</span>
                    ) : (
                      <span>Confirmar e Chamar</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA: MAPA DE MOBILIDADE */}
      {/* ========================================================================= */}
      {activeTab === 'MAPA' && (
        <div className="space-y-4">
          <VaiCarMobilityMap
            mode="PASSENGER"
            zones={zones}
            selectedOriginId={originZoneId}
            selectedDestId={destinationZoneId}
            onSelectRoute={(origId: string, destId: string) => {
              setOriginZoneId(origId);
              setDestinationZoneId(destId);
              setActiveTab('SOLICITAR');
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CORRIDA ATUAL */}
      {/* ========================================================================= */}
      {activeTab === 'ATUAL' && (
        <div className="space-y-6">
          {!activeRide ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Car className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Nenhuma corrida em andamento no momento.</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Quando você solicitar uma viagem, poderá acompanhar o status em tempo real, os dados do motorista e o pagamento nesta tela.
              </p>
              <button
                onClick={() => setActiveTab('SOLICITAR')}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-emerald-400 transition-all shadow-md"
              >
                Solicitar uma Corrida Agora
              </button>
            </div>
          ) : activeRide.status.startsWith('CANCELLED') || activeRide.status === 'REJECTED' || activeRide.status === 'EXPIRED' ? (
            <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-8 text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-rose-400 bg-rose-950/80 px-2.5 py-1 rounded-full border border-rose-500/20 uppercase tracking-wider">
                  Corrida Cancelada
                </span>
                <h3 className="text-xl font-black text-white pt-2">
                  {activeRide.status === 'CANCELLED_BY_DRIVER'
                    ? `O motorista ${activeRide.driverName} não pôde atender a esta chamada`
                    : 'Esta corrida foi cancelada'}
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  {activeRide.cancellationReason
                    ? `Motivo: "${activeRide.cancellationReason}"`
                    : 'O trajeto foi interrompido e você não foi cobrado por esta viagem.'}
                </p>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-xs text-slate-300 max-w-sm mx-auto space-y-1 text-left">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Origem: <strong className="text-white">{activeRide.originAddress.split(',')[0]}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Destino: <strong className="text-white">{activeRide.destinationAddress.split(',')[0]}</strong></span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setActiveRide(null);
                    setActiveTab('SOLICITAR');
                  }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg transition-all"
                >
                  <Car className="w-4 h-4" />
                  <span>Solicitar Nova Corrida</span>
                </button>
                <button
                  onClick={() => {
                    setActiveRide(null);
                    setActiveTab('HISTORICO');
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
                >
                  <span>Ver Histórico</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-lg font-bold text-white">Acompanhamento da Corrida</h3>
                  </div>
                  <p className="text-xs text-slate-400">Código de controle: #{activeRide.id}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                    {activeRide.status === 'REQUESTED' && 'Aguardando Motorista'}
                    {activeRide.status === 'ACCEPTED' && 'Motorista Aceitou'}
                    {activeRide.status === 'DRIVER_ARRIVING' && 'Motorista Chegando'}
                    {activeRide.status === 'PASSENGER_PICKED_UP' && 'Embarcado'}
                    {activeRide.status === 'IN_PROGRESS' && 'Em Andamento'}
                    {activeRide.status === 'COMPLETED' && 'Corrida Concluída'}
                  </span>
                </div>
              </div>

              {/* Live GPS Map & Progress Simulation Component */}
              <LiveRideTracker
                ride={activeRide}
                onDismiss={() => {
                  setActiveRide(null);
                  setActiveTab('SOLICITAR');
                }}
              />

              {/* Delivery Details parsed block if applicable */}
              {(() => {
                const delivery = parseDeliveryDetails(activeRide.originLandmark);
                if (!delivery) return null;
                return (
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-1">
                      <Package className="w-4.5 h-4.5 text-emerald-400" />
                      <span className="font-bold text-white text-xs uppercase tracking-wider">📦 Informações do Envio (Delivery)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] text-slate-300">
                      <div>
                        <span className="text-slate-500 block">Tipo de Veículo:</span>
                        <span className="text-emerald-400 font-bold">{delivery.vehicleType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Categoria:</span>
                        <span className="text-white font-semibold">{delivery.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Peso Estimado:</span>
                        <span className="text-white font-semibold">{delivery.weight} kg</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Tamanho:</span>
                        <span className="text-white font-semibold">{delivery.size}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Valor Declarado:</span>
                        <span className="text-emerald-400 font-mono font-bold">R$ {delivery.declaredValue}</span>
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-slate-400 text-[11px]">
                      <strong className="text-slate-300">Descrição do Item:</strong> {delivery.description}
                    </div>
                  </div>
                );
              })()}

              {/* Pre-boarding Safety Verification Warning */}
              <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-4 text-xs space-y-3 shadow-md">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-amber-300 text-sm">Conferência Obrigatória Antes do Embarque</h4>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Antes de entrar no veículo, confira se o motorista, a placa e o veículo correspondem às informações exibidas no aplicativo. <strong className="text-amber-200">Não embarque se houver divergência.</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-amber-500/20 text-slate-200">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Motorista</span>
                    <span className="text-xs font-bold text-white">{activeRide.driverName}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Veículo</span>
                    <span className="text-xs font-bold text-emerald-400">{activeRide.driverVehicle}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Placa do Veículo</span>
                    <span className="text-xs font-bold font-mono text-cyan-300">
                      {activeRide.driverLicensePlate || 'Verifique antes de entrar'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenLegal('seguranca')}
                    className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Ver Regras de Segurança do Passageiro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Reportar Divergência / Problema</span>
                  </button>
                </div>
              </div>

              {/* Driver and Vehicle card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={activeRide.driverAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                    alt={activeRide.driverName}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-700"
                  />
                  <div>
                    <h4 className="font-bold text-white text-base">{activeRide.driverName}</h4>
                    <p className="text-xs text-emerald-400 font-semibold">{activeRide.driverVehicle}</p>
                    <p className="text-xs text-slate-400">Tel: {activeRide.driverPhone}</p>
                  </div>
                </div>

                {/* Quick actions: WhatsApp and Call */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const contact = await getWhatsAppContact(activeRide.id);
                        if (contact?.whatsappUrl) {
                          window.open(contact.whatsappUrl, '_blank');
                        }
                      } catch {
                        const cleanPhone = activeRide.driverPhone.replace(/\D/g, '');
                        const msg = encodeURIComponent(
                          `Olá ${activeRide.driverName}! Sou ${activeRide.passengerName}, seu passageiro no VaiCar na corrida #${activeRide.id}.`
                        );
                        window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>

                  {activeRide.status !== 'COMPLETED' && (
                    <button
                      onClick={handleCancelCurrentRide}
                      className="bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {/* Ride Route and Distance details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block font-semibold">Origem:</span>
                      <span className="text-white font-medium">{activeRide.originAddress}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block font-semibold">Destino:</span>
                      <span className="text-white font-medium">{activeRide.destinationAddress}</span>
                    </div>
                  </div>
                </div>

                {/* Direct Payment Box */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Valor da corrida:</span>
                    <span className="text-xl font-black text-emerald-400">
                      R$ {activeRide.estimatedPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-xs flex items-center justify-between text-slate-300">
                    <span>Método combinado:</span>
                    <span className="font-bold text-white uppercase">{activeRide.paymentMethod}</span>
                  </div>

                  {activeRide.pixKey && (
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 block">Chave Pix do Motorista:</span>
                        <span className="font-mono text-xs text-white font-bold">{activeRide.pixKey}</span>
                      </div>
                      <button
                        onClick={handleCopyPixKey}
                        className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer transition-colors"
                        title="Copiar Chave Pix"
                      >
                        {copiedPix ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Status do Pagamento: {activeRide.paymentStatus === 'PAID' || activeRide.paymentStatus === 'CONFIRMED_BY_DRIVER' ? '🟢 Pago' : '🟡 Pendente'}
                    </span>
                    {activeRide.paymentStatus !== 'PAID' && activeRide.paymentStatus !== 'CONFIRMED_BY_DRIVER' && (
                      <button
                        onClick={handleConfirmPaymentDirect}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors"
                      >
                        Marcar como Pago
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Buttons as required by Section 3 */}
              <div className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Em caso de perigo ou emergência durante a corrida:</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="tel:190"
                    className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Ligar 190 (Polícia)</span>
                  </a>
                  <a
                    href="tel:192"
                    className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>192 (SAMU)</span>
                  </a>
                  <a
                    href="tel:153"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
                  >
                    <span>153 (Guarda)</span>
                  </a>
                </div>
              </div>

              {/* Review Section when completed */}
              {activeRide.status === 'COMPLETED' && (
                <div className="bg-emerald-950/30 border border-emerald-500/30 p-5 rounded-xl space-y-3">
                  <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    Avaliar esta Corrida
                  </h4>
                  {reviewSubmitted ? (
                    <div className="text-emerald-400 text-xs font-bold">
                      Obrigado! Sua avaliação foi registrada com sucesso.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRatingInput(star)}
                            className="text-amber-400 cursor-pointer hover:scale-110 transition-transform"
                          >
                            <Star className={`w-6 h-6 ${star <= ratingInput ? 'fill-amber-400' : 'text-slate-600'}`} />
                          </button>
                        ))}
                        <span className="text-xs text-slate-400 ml-2">Nota: {ratingInput} de 5</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Deixe um comentário sobre a viagem..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none"
                      />
                      <button
                        onClick={handleSubmitReview}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer shadow-md"
                      >
                        Enviar Avaliação
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: HISTÓRICO DE CORRIDAS */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORICO' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              Histórico de Viagens
            </h3>
            <span className="text-xs text-slate-400">Total: {myRides.length}</span>
          </div>

          {myRides.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-300">Nenhuma corrida encontrada.</p>
              <p className="text-xs text-slate-500">
                Você ainda não realizou viagens nesta plataforma. Quando solicitar sua primeira corrida, ela aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRides.map((ride) => (
                <div
                  key={ride.id}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{ride.driverName}</span>
                      <span className="text-slate-400">• {ride.driverVehicle}</span>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                        {ride.status}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      {ride.originAddress} ➔ {ride.destinationAddress}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(ride.createdAt).toLocaleString('pt-BR')} • Pagamento: {ride.paymentMethod}
                    </p>
                  </div>

                  <div className="text-right space-y-1.5">
                    <span className="text-base font-black text-emerald-400 block">
                      R$ {ride.estimatedPrice.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {ride.paymentStatus === 'PAID' || ride.paymentStatus === 'CONFIRMED_BY_DRIVER' ? '🟢 Pago' : '🟡 Pendente'}
                    </span>
                    {ride.status === 'COMPLETED' && (
                      <button
                        onClick={() => setSelectedReceiptRideId(ride.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 transition-all cursor-pointer shadow-sm"
                        title="Ver Comprovante da Corrida (PDF)"
                      >
                        <FileText className="w-3 h-3 text-emerald-400" />
                        <span>Comprovante PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: AVALIAÇÕES */}
      {/* ========================================================================= */}
      {activeTab === 'AVALIACOES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              Avaliações do Passageiro
            </h3>
          </div>

          <div className="py-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-300">Ainda não possui avaliações.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Ao concluir viagens, as notas e comentários recebidos dos motoristas e enviados por você serão exibidos nesta aba.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: PERFIL DO PASSAGEIRO */}
      {/* ========================================================================= */}
      {activeTab === 'PERFIL' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" />
              Perfil do Passageiro
            </h3>
            <p className="text-xs text-slate-400">
              Identificação utilizada exclusivamente para que o motorista localize e confirme seu embarque.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
            {/* Foto de Perfil do Passageiro */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 block">Sua Foto de Perfil (Opcional - Recomendado) *</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    src={passengerAvatarUrl}
                    alt="Sua foto"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePassengerAvatarChange}
                      className="hidden"
                      id="passenger-avatar-upload"
                    />
                    <label
                      htmlFor="passenger-avatar-upload"
                      className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-lg cursor-pointer transition-all border border-slate-700"
                    >
                      Selecionar Foto
                    </label>
                    {passengerAvatarUrl && !passengerAvatarUrl.includes('unsplash.com/photo-1494790108377') && (
                      <button
                        type="button"
                        onClick={() => {
                          setPassengerAvatarUrl('https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80');
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 transition-colors cursor-pointer"
                      >
                        Remover Foto
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">Ajuda o motorista a te identificar visualmente no local de embarque.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Nome Completo</label>
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                required
                className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">WhatsApp / Telefone</label>
              <input
                type="text"
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                required
                className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">E-mail Cadastrado</label>
              <input
                type="email"
                value={passengerEmail}
                onChange={(e) => setPassengerEmail(e.target.value)}
                className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
              />
            </div>

            {codeRequested && (
              <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-emerald-500/30">
                <label className="text-xs font-bold text-emerald-400">Código PIN (Recebido por E-mail)</label>
                <input
                  type="text"
                  placeholder="Digite o código de 4 dígitos recebido"
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value.trim())}
                  maxLength={6}
                  className="w-full bg-slate-900 text-white text-sm px-3 py-2 rounded-lg border border-slate-700 outline-none font-mono"
                />
              </div>
            )}

            {authMessage && (
              <p className="text-xs text-emerald-400 font-semibold">{authMessage}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
              >
                {codeRequested ? 'Confirmar Código e Salvar' : 'Salvar Alterações'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPassengerName(localStorage.getItem('vaicar_passenger_name') || '');
                  setPassengerPhone(localStorage.getItem('vaicar_passenger_phone') || '');
                  setPassengerEmail(localStorage.getItem('vaicar_passenger_email') || '');
                  setPassengerAvatarUrl(localStorage.getItem('vaicar_passenger_avatar') || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80');
                  setCodeRequested(false);
                  setAuthMessage('Edição cancelada.');
                  setTimeout(() => setAuthMessage(null), 2500);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>

          {/* Danger Zone: Account Deletion */}
          <div className="pt-6 border-t border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Exclusão Definitiva de Conta
                </h4>
                <p className="text-[11px] text-slate-400">
                  Excluir permanentemente seus dados de cadastro de passageiro do sistema VaiCar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteAccountError(null);
                  setIsDeleteAccountModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Minha Conta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 6: AJUDA E DENÚNCIA */}
      {/* ========================================================================= */}
      {activeTab === 'AJUDA' && (
        <div className="space-y-6">
          {/* FAQ */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
              Perguntas Frequentes & Funcionamento
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <h4 className="font-bold text-white">Como funciona o pagamento da corrida?</h4>
                <p>
                  O pagamento é feito diretamente ao motorista (via Pix direto, dinheiro ou máquina de cartão dele). Os modelos comerciais da plataforma são 10% por corrida ou R$100/mês.
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <h4 className="font-bold text-white">Como funciona a verificação dos motoristas?</h4>
                <p>
                  Verificação cadastral: Os motoristas devem fornecer as informações e documentos exigidos pela plataforma e cumprir os requisitos legais aplicáveis à atividade.
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <h4 className="font-bold text-white">O que fazer se esqueci um objeto no veículo?</h4>
                <p>
                  Você pode entrar em contato diretamente com o motorista pelo histórico de corridas ou registrar o relato no formulário abaixo com os detalhes da corrida.
                </p>
              </div>
            </div>
          </div>

          {/* Form de Denúncia e Item Esquecido */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Canal de Denúncia e Itens Esquecidos
            </h3>

            {reportSuccessMsg ? (
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl text-xs text-emerald-300 font-bold">
                Relato registrado com sucesso! O departamento de auditoria analisará o chamado com prioridade.
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Tipo de Relato</label>
                    <select
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value)}
                      className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                    >
                      <option value="INAPPROPRIATE_BEHAVIOR">Conduta Inadequada do Motorista</option>
                      <option value="DIFFERENT_VEHICLE">Veículo Diferente do Cadastrado</option>
                      <option value="DIFFERENT_FARE">Cobrança Diferente da Combinada</option>
                      <option value="LOST_ITEM">Objeto ou Pertence Esquecido no Carro</option>
                      <option value="SAFETY_ISSUE">Segurança ou Direção Perigosa</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Nome do Motorista ou Código da Corrida</label>
                    <input
                      type="text"
                      placeholder="Ex: João da Silva ou #ride-1"
                      value={reportTargetName}
                      onChange={(e) => setReportTargetName(e.target.value)}
                      required
                      className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Descreva o ocorrido em detalhes</label>
                  <textarea
                    rows={3}
                    placeholder="Relate com clareza a data, local e os fatos..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    required
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Registrar Chamado</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Universal Report Modal */}
      {isReportModalOpen && (
        <ReportModal
          ride={activeRide}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {/* Ride Receipt Modal (Comprovante da Corrida) */}
      {selectedReceiptRideId && (
        <RideReceiptModal
          rideId={selectedReceiptRideId}
          onClose={() => setSelectedReceiptRideId(null)}
        />
      )}

      {/* Unpaid Pending Payment Modal */}
      {showUnpaidModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative my-6">
            <button
              onClick={() => setShowUnpaidModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-rose-400 bg-rose-950/80 border border-rose-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Bloqueio Temporário por Débito
              </span>
              <h3 className="text-xl font-black text-white mt-1">Pagamento Pendente</h3>
              <p className="text-xs text-slate-400">
                Existe uma corrida anterior que não teve o pagamento confirmado pelo motorista.
              </p>
            </div>

            {unpaidRides.length > 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Motorista:</span>
                  <strong className="text-white">{unpaidRides[0].driverName || 'Motorista Parceiro'}</strong>
                </div>
                {unpaidRides[0].driverPhone && (
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Contato do Motorista:</span>
                    <a
                      href={`https://wa.me/${unpaidRides[0].driverPhone.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Gostaria de acertar o pagamento da corrida no VaiCar.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline font-bold"
                    >
                      {unpaidRides[0].driverPhone} (WhatsApp ↗)
                    </a>
                  </div>
                )}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Trajeto:</span>
                  <span className="text-slate-300 text-right">{unpaidRides[0].originAddress} ➔ {unpaidRides[0].destinationAddress}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-300 font-bold">Valor da Corrida:</span>
                  <span className="text-lg font-black text-rose-400">
                    R$ {(unpaidRides[0].fareBrl !== undefined ? unpaidRides[0].fareBrl : unpaidRides[0].estimatedPrice).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                {unpaidRides[0].paymentPendingReason && (
                  <p className="text-[11px] text-rose-400/90 pt-1">
                    Motivo registrado: {unpaidRides[0].paymentPendingReason}
                  </p>
                )}
                {unpaidRides[0].paymentStatus === 'PAYMENT_CONTESTED' && (
                  <div className="bg-amber-950/60 border border-amber-500/40 p-2.5 rounded-xl text-[11px] text-amber-300 mt-2">
                    ⏳ <strong>Sua contestação já foi enviada:</strong> "{unpaidRides[0].contestReason}"
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-center text-slate-400">
                Você possui uma restrição financeira pendente no sistema. Regularize com o motorista ou fale com a administração.
              </div>
            )}

            {/* Contest Form */}
            {unpaidRides.length > 0 && unpaidRides[0].paymentStatus !== 'PAYMENT_CONTESTED' && (
              <div className="space-y-2 text-xs">
                <label className="block font-bold text-slate-300">
                  Já pagou esta corrida? Envie sua justificativa/comprovante:
                </label>
                <textarea
                  value={unpaidContestText}
                  onChange={(e) => setUnpaidContestText(e.target.value)}
                  placeholder="Ex: Realizei o Pix de R$ 35,00 às 15:40 / Paguei em dinheiro trocado no desembarque..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!unpaidContestText.trim()) return alert('Por favor, informe os detalhes de quando e como pagou.');
                    try {
                      setIsSubmittingUnpaidContest(true);
                      await contestRidePayment(unpaidRides[0].id, unpaidContestText.trim(), undefined, passengerPhone);
                      setUnpaidContestSuccess('Contestação enviada com sucesso para a administração!');
                      fetchUnpaidRides(passengerPhone).then(setUnpaidRides).catch(() => {});
                    } catch (err: any) {
                      alert(err.message || 'Erro ao enviar contestação');
                    } finally {
                      setIsSubmittingUnpaidContest(false);
                    }
                  }}
                  disabled={isSubmittingUnpaidContest}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow"
                >
                  {isSubmittingUnpaidContest ? 'Enviando...' : 'Enviar Contestação para Análise'}
                </button>
              </div>
            )}

            {unpaidContestSuccess && (
              <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-300">
                {unpaidContestSuccess}
              </div>
            )}

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowUnpaidModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Own Account Confirmation Modal */}
      {isDeleteAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Excluir Conta de Passageiro</h4>
                <p className="text-[11px] text-slate-400">Esta ação é irreversível</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <p className="font-semibold text-rose-300">
                Are you sure you want to delete this passenger account?
              </p>
              <p className="text-slate-400 text-[11px]">
                Tem certeza que deseja excluir sua conta de passageiro? Todos os seus dados de cadastro serão permanentemente removidos:
              </p>
              <div className="pt-2 border-t border-slate-900 space-y-1">
                <div><span className="text-slate-500 font-bold">Nome:</span> <span className="text-white font-bold">{passengerName || 'Passageiro'}</span></div>
                <div><span className="text-slate-500 font-bold">WhatsApp:</span> <span className="text-emerald-400 font-mono font-bold">{passengerPhone}</span></div>
                {passengerEmail && <div><span className="text-slate-500 font-bold">E-mail:</span> <span className="text-slate-300">{passengerEmail}</span></div>}
              </div>
            </div>

            {deleteAccountError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {deleteAccountError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteAccountModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteOwnAccount}
                disabled={isDeletingAccount}
                className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingAccount ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
