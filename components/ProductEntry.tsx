
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, ListPlus, Image as ImageIcon, Sparkles, DollarSign, Tag, Info, X, Upload } from 'lucide-react';
import { Treatment, Category, ProductCondition } from '../types';

interface ProductEntryProps {
  image: string;
  categories: Category[];
  onSave: (data: Omit<Treatment, 'id'> & { imageUrl: string, images: string[] }) => void;
}

// Helper to compress image
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1024; 
                const MAX_HEIGHT = 1024;
                
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = Math.round((width * MAX_HEIGHT) / height);
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8)); // 80% quality
                } else {
                    resolve(event.target?.result as string); // Fallback
                }
            };
            img.onerror = () => resolve(event.target?.result as string);
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
};

export const ProductEntry: React.FC<ProductEntryProps> = ({ image, categories, onSave }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [currency, setCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [added, setAdded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Image Management
  const [images, setImages] = useState<string[]>([image]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      // If initial image changes (e.g. re-upload from Hero), reset list
      setImages([image]);
      setPreviewIndex(0);
  }, [image]);

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          setIsProcessing(true);
          const newImages: string[] = [];
          
          try {
              // Process sequentially to avoid freezing UI
              for (let i = 0; i < files.length; i++) {
                  const base64 = await compressImage(files[i]);
                  newImages.push(base64);
              }
              setImages(prev => [...prev, ...newImages]);
          } catch (err) {
              console.error("Image processing error", err);
          } finally {
              setIsProcessing(false);
          }
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (index: number) => {
      if (images.length <= 1) {
          alert("Kamida bitta rasm bo'lishi kerak.");
          return;
      }
      const newImages = images.filter((_, i) => i !== index);
      setImages(newImages);
      setPreviewIndex(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    // Clean up images for storage
    const cleanImages = images.map(img => {
        if (img.includes(',')) return img.split(',')[1];
        return img;
    });

    onSave({
      name,
      price: Number(price),
      currency,
      category: categoryId,
      condition: 'new', // Default to new internally
      description: description.trim(), 
      recommended: false,
      imageUrl: cleanImages[0], // Primary image (Legacy support)
      images: images // Store full Data URIs
    });
    
    setAdded(true);
    setName('');
    setPrice('');
    setCurrency('UZS');
    setCategoryId('');
    setDescription('');
    
    setTimeout(() => {
        setAdded(false);
    }, 2000);
  };

  const currentMedia = images[previewIndex] || images[0];
  const isLegacyBase64 = !currentMedia?.startsWith('data:');
  let renderSrc = currentMedia;
  if (isLegacyBase64) {
      const mime = currentMedia?.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
      renderSrc = `data:${mime};base64,${currentMedia}`;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row animate-fade-in ring-1 ring-slate-900/5 transition-colors">
        {/* Media Side */}
        <div className="md:w-5/12 bg-slate-100 dark:bg-slate-800 relative min-h-[300px] md:min-h-full group flex flex-col">
            <div className="relative flex-1 overflow-hidden flex items-center justify-center bg-black/5 dark:bg-black/20">
                <img 
                    src={renderSrc} 
                    alt="Preview" 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex flex-col justify-end p-8 pointer-events-none">
                    <div className="bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-1">
                        <ImageIcon className="h-4 w-4 text-sky-300" />
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-200">Yangi Mahsulot</span>
                    </div>
                    <p className="text-sm opacity-90">Ushbu rasm va narx mijozlarga ko'rinadi.</p>
                    </div>
                </div>
            </div>
            
            {/* Thumbnails */}
            <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rasmlar ({images.length})</p>
                    {isProcessing && <span className="text-xs text-primary animate-pulse">Yuklanmoqda...</span>}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {images.map((img, idx) => {
                        const isRawBase64 = !img.startsWith('data:');
                        let thumbSrc = img;
                        if (isRawBase64) {
                            const mime = img.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
                            thumbSrc = `data:${mime};base64,${img}`;
                        }
                        
                        return (
                            <div 
                                key={idx} 
                                onClick={() => setPreviewIndex(idx)}
                                className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${idx === previewIndex ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'}`}
                            >
                                <img src={thumbSrc} className="w-full h-full object-cover" alt="" />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        );
                    })}
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="flex-shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary hover:text-primary text-slate-400 flex flex-col items-center justify-center transition-colors bg-slate-50 dark:bg-slate-800 disabled:opacity-50"
                    >
                        <Plus className="h-5 w-5" />
                        <span className="text-[10px] font-bold">Qo'shish</span>
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        multiple
                        onChange={handleAddImage} 
                    />
                </div>
            </div>
        </div>

        {/* Form Side */}
        <div className="flex-1 p-6 sm:p-8 lg:p-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="bg-primary/10 dark:bg-primary/20 p-2 rounded-xl text-primary">
                  <Sparkles className="h-6 w-6" />
                </span>
                Mahsulot Yaratish
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                        Mahsulot Nomi
                    </label>
                    <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Masalan: Tish oqartirish Premium"
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                          Narxi
                      </label>
                      <input 
                          type="number" 
                          step="0.01"
                          required
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="0"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all font-mono font-bold text-lg text-slate-900 dark:text-white placeholder:text-slate-400"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                          Valyuta
                      </label>
                      <div className="relative">
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value as 'UZS' | 'USD')}
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all font-bold text-slate-900 dark:text-white appearance-none"
                        >
                          <option value="UZS">So'm (UZS)</option>
                          <option value="USD">Dollar (USD)</option>
                        </select>
                        <DollarSign className="absolute right-5 top-4.5 h-5 w-5 text-slate-400 pointer-events-none" />
                      </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                            Kategoriya
                        </label>
                        <div className="relative">
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white appearance-none"
                            >
                                <option value="">Kategoriyasiz</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                            <Tag className="absolute right-5 top-4.5 h-5 w-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                        Tavsif <span className="text-slate-400 font-normal text-xs">(ixtiyoriy)</span>
                    </label>
                    <textarea 
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Mijozlar uchun qisqacha ma'lumot..."
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all resize-none text-slate-600 dark:text-slate-300"
                    />
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={added}
                        className={`w-full flex items-center justify-center gap-2 py-4.5 rounded-2xl font-bold text-lg transition-all transform active:scale-[0.99] ${
                            added 
                            ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/25 ring-2 ring-emerald-500 ring-offset-2' 
                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-900/20 hover:bg-slate-800 dark:hover:bg-slate-100 ring-2 ring-transparent ring-offset-2 hover:ring-slate-900 dark:hover:ring-slate-100'
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
