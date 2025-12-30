import React, { useRef } from 'react';
import { Upload, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onImageSelected: (base64: string) => void;
  isAnalyzing: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onImageSelected, isAnalyzing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        onImageSelected(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative bg-secondary overflow-hidden min-h-[500px] flex items-center">
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=2600&auto=format&fit=crop" 
          alt="Dental Background" 
          className="w-full h-full object-cover opacity-10 sm:opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/90 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 flex flex-col items-center text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-fade-in">
          <Sparkles className="h-4 w-4" />
          <span>Sun'iy Intellekt Tahlili</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
          Mukammal Tabassum <br />
          <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-emerald-400">
            AI Yordamida
          </span>
        </h1>
        
        <p className="mt-2 max-w-xl text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed">
          Tishingiz rasmini yuklang va sun'iy intellekt yordamida dastlabki tashxis va narxlarni oling.
        </p>

        <div className="w-full max-w-sm sm:max-w-md">
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
          
          <div className="flex justify-center w-full">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="group w-full flex items-center justify-center gap-3 px-8 py-5 bg-primary hover:bg-sky-500 active:bg-sky-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="animate-spin h-6 w-6" />
                  Tahlil qilinmoqda...
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 group-hover:-translate-y-1 transition-transform" />
                  Rasm Yuklash
                </>
              )}
            </button>
          </div>
          
          <p className="mt-6 text-xs sm:text-sm text-slate-500">
            *AI xulosasi tibbiy tashxis emas. Aniq tashxis uchun shifokor ko'rigi zarur.
          </p>
        </div>
      </div>
    </div>
  );
};