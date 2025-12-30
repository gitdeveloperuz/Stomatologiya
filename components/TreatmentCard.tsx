import React from 'react';
import { Plus, Check } from 'lucide-react';
import { Treatment } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface TreatmentCardProps {
  treatment: Treatment;
  onAdd: (treatment: Treatment) => void;
}

export const TreatmentCard: React.FC<TreatmentCardProps> = ({ treatment, onAdd }) => {
  const [added, setAdded] = React.useState(false);

  const handleAdd = () => {
    onAdd(treatment);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className={`relative flex flex-col p-5 sm:p-6 bg-white rounded-2xl border transition-all duration-300 hover:shadow-lg hover:border-slate-300 ${treatment.recommended ? 'border-primary/50 shadow-md shadow-primary/5' : 'border-slate-100'}`}>
      {treatment.recommended && (
        <div className="absolute -top-3 left-4 sm:left-6 bg-gradient-to-r from-primary to-emerald-500 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full shadow-sm tracking-wide">
          AI TAVSIYASI
        </div>
      )}
      
      <div className="flex-1 mt-2">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{treatment.name}</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-4 min-h-[2.5rem] line-clamp-3">
          {treatment.description}
        </p>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-4">
        <span className="text-lg sm:text-xl font-bold text-slate-900 whitespace-nowrap">
          {CURRENCY_FORMATTER.format(treatment.price)}
        </span>
        
        <button
          onClick={handleAdd}
          disabled={added}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
            added 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" /> <span className="hidden sm:inline">Qo'shildi</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> <span className="sm:inline">Savatchaga</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};