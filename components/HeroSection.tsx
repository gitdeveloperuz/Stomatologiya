import React, { useRef } from 'react';
import { Upload, Sparkles, Lock, PhoneCall, MapPin } from 'lucide-react';

interface HeroSectionProps {
  onImageSelected: (base64: string) => void;
  isAnalyzing: boolean;
  isAdmin: boolean;
  onAdminLoginClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onImageSelected, isAnalyzing, isAdmin, onAdminLoginClick }) => {
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
    <div className="relative bg-secondary overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0 h-[500px] lg:h-[600px] z-0">
        <img 
          src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2600&auto=format&fit=crop" 
          alt="Dental Background" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/90 via-secondary/95 to-slate-50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-12 pb-20 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm text-sky-400 text-sm font-medium mb-8 animate-fade-in shadow-lg">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Professional Stomatologiya</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6 leading-[1.1]">
          Mukammal Tabassum <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
            Biz Bilan Boshlanadi
          </span>
        </h1>
        
        {/* Subtitle */}
        <p className="max-w-2xl text-lg sm:text-xl text-slate-300/90 mb-10 leading-relaxed font-light">
          {isAdmin 
            ? "Hurmatli Admin, yangi xizmat turini qo'shish uchun pastdagi tugmani bosing va rasm yuklang."
            : "Eng zamonaviy uskunalar va tajribali shifokorlar xizmatidan foydalaning. Biz sizning tabassumingiz haqida qayg'uramiz."}
        </p>

        {/* Actions */}
        <div className="w-full max-w-md mx-auto animate-slide-up">
          {isAdmin ? (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-2 rounded-3xl">
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="group w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-primary to-sky-600 hover:to-sky-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/25 transition-all transform hover:scale-[1.01] active:scale-[0.98]"
              >
                <div className="bg-white/20 p-2 rounded-xl">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <span>Rasm Yuklash va Narxlovchi</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-1.5 shadow-2xl shadow-slate-900/10">
              <div className="bg-slate-50 rounded-[20px] border border-slate-100 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                    <div className="bg-primary/10 p-3 rounded-2xl">
                      <PhoneCall className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Qabulga yozilish</p>
                      <a href="tel:+998901234567" className="text-lg font-bold text-slate-900 hover:text-primary transition-colors">
                        +998 90 123 45 67
                      </a>
                    </div>
                 </div>
                 
                 <div className="hidden sm:block w-px h-10 bg-slate-200"></div>

                 <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                    <div className="bg-emerald-500/10 p-3 rounded-2xl">
                      <MapPin className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Manzil</p>
                      <p className="text-sm font-bold text-slate-900">
                        Toshkent sh., Chilonzor
                      </p>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};