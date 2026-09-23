import React, { useState } from 'react';
import { Star, X, Check } from 'lucide-react';
import { Ride } from '../types.ts';
import { submitReview } from '../lib/api.ts';

interface ReviewModalProps {
  ride: Ride;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  ride,
  onClose,
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Direção Segura', 'Pontual']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableTags = [
    'Pontual',
    'Veículo Limpo',
    'Direção Segura',
    'Muito Educado',
    'Preço Justo',
    'Conhece bem São Sebastião',
  ];

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await submitReview({
        rideId: ride.id,
        driverId: ride.driverId,
        passengerName: ride.passengerName,
        rating,
        comment: comment.trim()
          ? `${comment} [Destaques: ${selectedTags.join(', ')}]`
          : selectedTags.join(', '),
      });
      alert('Obrigado pela sua avaliação! Sua opinião ajuda a manter a qualidade dos motoristas em São Sebastião.');
      onReviewSubmitted();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar avaliação');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-950 px-2 py-0.5 rounded-full">
            Viagem Concluída
          </span>
          <h2 className="text-xl font-black text-white">Como foi sua corrida?</h2>
          <p className="text-xs text-slate-400">
            Avalie o motorista <strong>{ride.driverName}</strong>
          </p>
        </div>

        {/* Star Selection */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="p-1.5 transition-transform hover:scale-110 cursor-pointer"
            >
              <Star
                className={`w-9 h-9 ${
                  star <= rating
                    ? 'fill-amber-400 text-amber-400 drop-shadow'
                    : 'text-slate-700 hover:text-amber-300'
                }`}
              />
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick compliment tags */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Destaques da experiência:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Comentário (opcional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ex: Motorista muito simpático, carro impecável e viagem tranquila na Rio-Santos."
              className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-xs focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3.5 rounded-xl shadow-lg transition-all cursor-pointer"
          >
            {isSubmitting ? 'Enviando avaliação...' : 'ENVIAR AVALIAÇÃO'}
          </button>
        </form>
      </div>
    </div>
  );
};
