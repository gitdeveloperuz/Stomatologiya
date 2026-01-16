
import React from 'react';
import { X, ShoppingCart, AlertTriangle, Loader2 } from 'lucide-react';
import { Treatment } from '../types';
import { formatPrice } from '../constants';

interface AIResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string | null;
  results: Treatment[];
  onAddToCart: (item: Treatment, qty: number) => void;
  isLoading: boolean;
}

export const AIResultModal: React.FC<AIResultModalProps> = ({ isOpen, onClose, image, results, onAddToCart, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-slide-up">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md">
            <X className="h-5 w-5" />
        </button>

        {/* Image Side */}
        <div className="md:w-5/12 relative flex items-center justify-center bg-slate-100 dark:bg-slate-800 shrink-0 min-h-[250px] md:min-h-full">
            {image && (
                <img 
                    src={image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`} 
                    alt="Analyzed Smile" 
                    className="w-full h-full object-cover"
                />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-24 pointer-events-none">
                <h3 className="text-white text-xl font-bold mb-1 drop-shadow-md">AI Tahlili</h3>
                <p className="text-white/90 text-sm drop-shadow-sm">Sizning tabassumingiz tahlil qilindi</p>
            </div>
        </div>

        {/* Results Side */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 custom-scrollbar flex flex-col">
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-primary animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg">🦷</span>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white animate-pulse">Tahlil qilinmoqda...</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sun'iy intellekt rasmni o'rganib chiqmoqda</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
                            Ushbu narxlar va tashxislar sun'iy intellekt tomonidan taxminiy hisoblangan. Aniq tashxis va narx shifokor ko'rigidan so'ng belgilanadi.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-dashed border-slate-200 dark:border-slate-800 pb-2 mb-4">
                            Tavsiya etilgan xizmatlar
                        </h3>

                        <div className="space-y-3">
                            {results.map((item, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-all hover:shadow-md hover:border-primary/30 group">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1 truncate pr-2 group-hover:text-primary transition-colors">{item.name}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                                    </div>
                                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-1 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                                        <span className="font-mono font-bold text-slate-900 dark:text-white text-lg">{formatPrice(item.price, 'UZS')}</span>
                                        <button 
                                            onClick={() => onAddToCart(item, 1)}
                                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary dark:hover:bg-primary hover:text-white dark:hover:text-white active:scale-95 transition-all shadow-lg shadow-slate-900/10"
                                        >
                                            <ShoppingCart className="h-3.5 w-3.5" /> Qo'shish
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
