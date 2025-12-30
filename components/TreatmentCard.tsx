
import React, { useState, useEffect } from 'react';
import { Plus, Check, Edit2, Save, X, ShoppingCart, Trash2, Minus, ZoomIn } from 'lucide-react';
import { Treatment, Category } from '../types';
import { formatPrice } from '../constants';

interface TreatmentCardProps {
  treatment: Treatment;
  onAdd: (treatment: Treatment, quantity: number) => void;
  isAdmin: boolean;
  onRemove?: () => void;
  onImageClick?: (base64: string) => void;
  categories?: Category[];
  onUpdate?: (treatment: Treatment) => void;
}

export const TreatmentCard: React.FC<TreatmentCardProps> = ({ treatment, onAdd, isAdmin, onRemove, onImageClick, categories, onUpdate }) => {
  const [added, setAdded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Quantity State
  const [isSelectingQuantity, setIsSelectingQuantity] = useState(false);
  const [quantity, setQuantity] = useState(1);
  
  // Local state for editing
  const [name, setName] = useState(treatment.name);
  const [price, setPrice] = useState(treatment.price);
  const [currency, setCurrency] = useState<'UZS'|'USD'>(treatment.currency || 'UZS');
  const [description, setDescription] = useState(treatment.description);
  const [categoryId, setCategoryId] = useState(treatment.category || '');

  useEffect(() => {
    setName(treatment.name);
    setPrice(treatment.price);
    setCurrency(treatment.currency || 'UZS');
    setDescription(treatment.description);
    setCategoryId(treatment.category || '');
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
      name,
      price,
      currency
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
    
    if (onUpdate) {
        onUpdate({
            ...treatment,
            name,
            price,
            currency,
            description,
            category: categoryId
        });
    }
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

  const handleImageClickInternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (treatment.imageUrl && onImageClick) {
        onImageClick(treatment.imageUrl);
    }
  };

  // Determine Image Type based on Base64 signature
  // iVBOR... is PNG, /9j/... is JPEG
  const mimeType = treatment.imageUrl?.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';

  // Calculate dynamic total
  const currentTotal = price * quantity;

  return (
    <div className="group flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-primary/5 dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden relative isolate mb-6 break-inside-avoid">
      
      {/* Badge */}
      {treatment.recommended && (
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-emerald-100 dark:border-emerald-900 flex items-center gap-1">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
             AI TAVSIYASI
          </div>
        </div>
      )}

      {/* Image Area - Removed fixed aspect ratio for Masonry */}
      <div 
        className="relative w-full overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-zoom-in group/image"
        onClick={handleImageClickInternal}
      >
        {treatment.imageUrl ? (
            <>
                <img 
                    src={`data:${mimeType};base64,${treatment.imageUrl}`} 
                    alt={name} 
                    className="w-full h-auto block transition-transform duration-700 group-hover/image:scale-110"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 z-10 bg-black/10">
                   <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                      <ZoomIn className="h-6 w-6" />
                   </div>
                </div>
            </>
        ) : (
            <div className="w-full h-48 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600">
               <span className="text-4xl font-light">🦷</span>
            </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3 mb-4" onClick={(e) => e.stopPropagation()}>
               <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-lg font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Nomi"
              />
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                placeholder="Tavsif"
              />
              <div className="flex gap-2">
                <input 
                    type="number" 
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-2/3 p-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Narx"
                />
                <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'UZS' | 'USD')}
                    className="w-1/3 p-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                    <option value="UZS">UZS</option>
                    <option value="USD">USD</option>
                </select>
              </div>
              <select 
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                  <option value="">Kategoriyasiz</option>
                  {categories?.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
              </select>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 break-words leading-tight">{name}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4 break-words whitespace-pre-wrap">
                {description}
              </p>
            </>
          )}
        </div>
        
        {/* Footer Area */}
        <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className={`text-[10px] font-medium transition-colors duration-300 ${isSelectingQuantity ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
               {isSelectingQuantity ? `Jami (${quantity})` : 'Narxi'}
            </span>
            <span className={`text-base font-bold transition-colors duration-300 ${isSelectingQuantity ? 'text-primary scale-105 origin-left' : 'text-slate-900 dark:text-white'}`}>
              {formatPrice(isSelectingQuantity ? currentTotal : price, currency)}
            </span>
          </div>
          
          {!isEditing && (
            <div className="h-[36px] flex items-center">
              {isSelectingQuantity ? (
                  <div className="flex items-center gap-1 bg-slate-900 dark:bg-slate-800 rounded-lg p-1 shadow-lg animate-fade-in">
                      <button 
                        onClick={(e) => adjustQuantity(e, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors active:scale-95"
                      >
                          <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[32px] text-center font-bold text-white text-xs px-1">
                        {quantity}
                      </span>
                      <button 
                        onClick={(e) => adjustQuantity(e, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors active:scale-95"
                      >
                          <Plus className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={handleConfirmAdd}
                        className="ml-1 w-7 h-7 flex items-center justify-center rounded bg-primary text-white hover:bg-sky-400 transition-colors active:scale-95 shadow-md shadow-primary/30"
                      >
                          <Check className="h-3 w-3" />
                      </button>
                  </div>
              ) : (
                <button
                  onClick={handleStartAdd}
                  disabled={added}
                  type="button"
                  className={`relative overflow-hidden flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-lg shadow-primary/20 h-full ${
                    added 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-primary text-white hover:bg-sky-500 hover:shadow-primary/30'
                  }`}
                >
                  <div className={`flex items-center gap-1.5 transition-transform duration-300`}>
                    {added ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> 
                        <span className="hidden sm:inline">Qo'shildi</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" /> 
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
        <div className="absolute top-2 right-2 z-[100] flex gap-1">
            <button 
                onClick={handleDelete}
                type="button"
                className="p-1.5 rounded-full backdrop-blur-md bg-white/95 dark:bg-slate-900/95 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95 border border-red-100 dark:border-red-900/30 cursor-pointer"
                title="O'chirish"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button 
                onClick={toggleEdit}
                type="button"
                className={`p-1.5 rounded-full backdrop-blur-md transition-all shadow-lg active:scale-95 border cursor-pointer ${isEditing ? 'bg-primary text-white border-primary' : 'bg-white/95 dark:bg-slate-900/95 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800'}`}
                title="Tahrirlash"
            >
                {isEditing ? <Save className="h-3.5 w-3.5" onClick={handleSave} /> : <Edit2 className="h-3.5 w-3.5" />}
            </button>
        </div>
      )}
    </div>
  );
};
