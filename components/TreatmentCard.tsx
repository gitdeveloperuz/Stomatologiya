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
    <div className={`relative flex flex-col p-6 bg-white rounded-2xl border transition-all duration-300 hover:shadow-lg ${treatment.recommended ? 'border-primary/50 shadow-md shadow-primary/5' : 'border-slate-100'}`}>
      {treatment.recommended && (
        <div className="absolute -top-3 left-6 bg-gradient-to-r from-primary to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
          AI TAVSIYASI
        </div>
      )}
      
      <div className="flex-1">
        <h3 className="text-xl font-bold text-slate-900 mb-2">{treatment.name}</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-4 min-h-[3rem]">
          {treatment.description}
        </p>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-lg font-bold text-slate-900">
          {CURRENCY_FORMATTER.format(treatment.price)}
        </span>
        
        <button
          onClick={handleAdd}
          disabled={added}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            added 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" /> Qo'shildi
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Savatchaga
            </>
          )}
        </button>
      </div>
    </div>
  );
};