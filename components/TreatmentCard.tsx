import React, { useState, useEffect } from 'react';
import { Plus, Check, Edit2, Save, X, ShoppingCart, Trash2, Minus } from 'lucide-react';
import { Treatment } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface TreatmentCardProps {
  treatment: Treatment;
  onAdd: (treatment: Treatment, quantity: number) => void;
  isAdmin: boolean;
  onRemove?: () => void;
}

export const TreatmentCard: React.FC<TreatmentCardProps> = ({ treatment, onAdd, isAdmin, onRemove }) => {
  const [added, setAdded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Quantity State
  const [isSelectingQuantity, setIsSelectingQuantity] = useState(false);
  const [quantity, setQuantity] = useState(1);
  
  // Local state for editing
  const [name, setName] = useState(treatment.name);
  const [price, setPrice] = useState(treatment.price);
  const [description, setDescription] = useState(treatment.description);

  useEffect(() => {
    setName(treatment.name);
    setPrice(treatment.price);
    setDescription(treatment.description);
  }, [treatment]);

  const handleStartAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelectingQuantity(true);
    setQuantity(1);
  };

  const handleConfirmAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAdd({
      ...treatment,
      name: name,
      price: price
    }, quantity);
    
    setAdded(true);
    setIsSelectingQuantity(false);
    setTimeout(() => setAdded(false), 2000);
  };

  const adjustQuantity = (e: React.MouseEvent, delta: number) => {
      e.preventDefault();
      e.stopPropagation();
      setQuantity(prev => {
          const newValue = prev + delta;
          return newValue < 1 ? 1 : newValue;
      });
  };

  const handleSave = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsEditing(false);
    // In a real app, this would bubble up to save to DB
  };

  const toggleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEditing(!isEditing);
    // Reset quantity state if editing
    setIsSelectingQuantity(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Immediate removal without confirmation to ensure smoother UX in admin panel
    if (onRemove) {
        onRemove();
    }
  };

  return (
    <div className="group flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden h-full relative isolate">
      
      {/* Badge */}
      {treatment.recommended && (
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md text-emerald-600 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-emerald-100 flex items-center gap-1">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
             AI TAVSIYASI
          </div>
        </div>
      )}

      {/* Image Area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {treatment.imageUrl ? (
            <img 
                src={`data:image/jpeg;base64,${treatment.imageUrl}`} 
                alt={name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
               <span className="text-4xl font-light">🦷</span>
            </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col p-5 sm:p-6">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3 mb-4" onClick={(e) => e.stopPropagation()}>
               <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-lg font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Nomi"
              />
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                placeholder="Tavsif"
              />
              <input 
                type="number" 
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Narx"
              />
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">{name}</h3>
              <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-4">
                {description}
              </p>
            </>
          )}
        </div>
        
        {/* Footer Area */}
        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Narxi</span>
            <span className="text-xl font-bold text-slate-900">
              {CURRENCY_FORMATTER.format(price)}
            </span>
          </div>
          
          {!isEditing && (
            <div className="h-[46px] flex items-center">
              {isSelectingQuantity ? (
                  <div className="flex items-center gap-2 bg-slate-900 rounded-2xl p-1 shadow-lg animate-fade-in">
                      <button 
                        onClick={(e) => adjustQuantity(e, -1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors active:scale-95"
                      >
                          <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-white text-sm">{quantity}</span>
                      <button 
                        onClick={(e) => adjustQuantity(e, 1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors active:scale-95"
                      >
                          <Plus className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={handleConfirmAdd}
                        className="ml-1 w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white hover:bg-sky-400 transition-colors active:scale-95 shadow-md shadow-primary/30"
                      >
                          <Check className="h-4 w-4" />
                      </button>
                  </div>
              ) : (
                <button
                  onClick={handleStartAdd}
                  disabled={added}
                  type="button"
                  className={`relative overflow-hidden flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-primary/20 h-full ${
                    added 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-primary text-white hover:bg-sky-500 hover:shadow-primary/30'
                  }`}
                >
                  <div className={`flex items-center gap-2 transition-transform duration-300`}>
                    {added ? (
                      <>
                        <Check className="h-5 w-5" /> 
                        <span className="hidden sm:inline">Qo'shildi</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5" /> 
                        <span>Savatchaga</span>
                      </>
                    )}
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div className="absolute top-4 right-4 z-[100] flex gap-2">
            <button 
                onClick={handleDelete}
                type="button"
                className="p-2 rounded-full backdrop-blur-md bg-white/95 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95 border border-red-100 cursor-pointer"
                title="O'chirish"
            >
                <Trash2 className="h-4 w-4" />
            </button>
            <button 
                onClick={toggleEdit}
                type="button"
                className={`p-2 rounded-full backdrop-blur-md transition-all shadow-lg active:scale-95 border cursor-pointer ${isEditing ? 'bg-primary text-white border-primary' : 'bg-white/95 text-slate-500 hover:text-primary hover:bg-white border-slate-100'}`}
                title="Tahrirlash"
            >
                {isEditing ? <Save className="h-4 w-4" onClick={handleSave} /> : <Edit2 className="h-4 w-4" />}
            </button>
        </div>
      )}
    </div>
  );
};