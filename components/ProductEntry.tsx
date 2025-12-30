import React, { useState } from 'react';
import { Plus, Check, ListPlus, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Treatment } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface ProductEntryProps {
  image: string;
  onSave: (data: Omit<Treatment, 'id'> & { imageUrl: string }) => void;
}

export const ProductEntry: React.FC<ProductEntryProps> = ({ image, onSave }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [description, setDescription] = useState('');
  const [added, setAdded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    onSave({
      name,
      price: Number(price),
      description,
      recommended: false,
      imageUrl: image
    });
    
    setAdded(true);
    // Reset form after adding
    setName('');
    setPrice('');
    setDescription('');
    
    setTimeout(() => {
        setAdded(false);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col md:flex-row animate-fade-in ring-1 ring-slate-900/5">
        {/* Image Side */}
        <div className="md:w-5/12 bg-slate-100 relative min-h-[300px] md:min-h-full group overflow-hidden">
            <img 
                src={`data:image/jpeg;base64,${image}`} 
                alt="Yuklangan" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex flex-col justify-end p-8">
                <div className="bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-white">
                   <div className="flex items-center gap-2 mb-1">
                      <ImageIcon className="h-4 w-4 text-sky-300" />
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-200">Yangi Mahsulot</span>
                   </div>
                   <p className="text-sm opacity-90">Ushbu rasm asosida yangi xizmat turini yarating.</p>
                </div>
            </div>
        </div>

        {/* Form Side */}
        <div className="flex-1 p-6 sm:p-8 lg:p-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span className="bg-primary/10 p-2 rounded-xl text-primary">
                  <Sparkles className="h-6 w-6" />
                </span>
                Xizmat Yaratish
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                        Xizmat Nomi
                    </label>
                    <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Masalan: Tish oqartirish Premium"
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all font-semibold text-slate-900 placeholder:text-slate-400"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                        Narxi (so'm)
                    </label>
                    <div className="relative">
                      <input 
                          type="number" 
                          required
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="0"
                          className="w-full pl-5 pr-16 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all font-mono font-bold text-lg text-slate-900 placeholder:text-slate-400"
                      />
                      <span className="absolute right-5 top-4.5 text-slate-400 font-medium">UZS</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                        Tavsif <span className="text-slate-400 font-normal text-xs">(ixtiyoriy)</span>
                    </label>
                    <textarea 
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Mijozlar uchun qisqacha ma'lumot..."
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all resize-none text-slate-600"
                    />
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={added}
                        className={`w-full flex items-center justify-center gap-2 py-4.5 rounded-2xl font-bold text-lg transition-all transform active:scale-[0.99] ${
                            added 
                            ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/25 ring-2 ring-emerald-500 ring-offset-2' 
                            : 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 hover:bg-slate-800 ring-2 ring-transparent ring-offset-2 hover:ring-slate-900'
                        }`}
                    >
                        {added ? (
                            <>
                                <Check className="w-6 h-6" /> Saqlandi
                            </>
                        ) : (
                            <>
                                <ListPlus className="w-6 h-6" /> Ro'yxatga Qo'shish
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};