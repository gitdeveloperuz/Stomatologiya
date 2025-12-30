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
        // Remove data url prefix for API if needed, but SDK handles raw often. 
        // For Gemini SDK via @google/genai, we usually pass base64 data without prefix in 'inlineData', 
        // but here we will pass the clean base64 string to the parent.
        const base64Data = base64String.split(',')[1];
        onImageSelected(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative bg-secondary overflow-hidden">
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=2600&auto=format&fit=crop" 
          alt="Dental Background" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/80 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6">
          Mukammal Tabassum <br />
          <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-emerald-400">
            AI Yordamida
          </span>
        </h1>
        
        <p className="mt-4 max-w-2xl text-xl text-slate-300 mb-10">
          Tishingiz rasmini yuklang va sun'iy intellekt yordamida dastlabki tashxis va narxlarni oling.
        </p>

        <div className="w-full max-w-md">
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
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-sky-600 text-white rounded-2xl font-semibold shadow-lg shadow-primary/30 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="animate-spin h-5 w-5" />
                  Tahlil qilinmoqda...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Rasm Yuklash
                </>
              )}
            </button>
          </div>
          
          <p className="mt-4 text-sm text-slate-400">
            *AI xulosasi tibbiy tashxis emas. Aniq tashxis uchun shifokor ko'rigi zarur.
          </p>
        </div>
      </div>
    </div>
  );
};