
import React, { useRef, useState, useEffect } from 'react';
import { Upload, PhoneCall, MapPin } from 'lucide-react';

interface HeroSectionProps {
  onImageSelected: (base64: string) => void;
  isAnalyzing: boolean;
  isAdmin: boolean;
  onAdminLoginClick: () => void;
}

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2600&auto=format&fit=crop", // Tools close up
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2600&auto=format&fit=crop", // Modern Chair
  "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=2600&auto=format&fit=crop", // Smile/Model
  "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=2600&auto=format&fit=crop"  // Dentist working
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onImageSelected, isAnalyzing, isAdmin, onAdminLoginClick }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPng = file.type === 'image/png';
      const reader = new FileReader();
      reader.onload = (event) => {
        // Compress Image
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Resize logic: Max width 800px to ensure base64 string fits in DB
            const MAX_WIDTH = 800;
            if (width > MAX_WIDTH) {
                height = (height * MAX_WIDTH) / width;
                width = MAX_WIDTH;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                
                // Use PNG if original was PNG (preserves transparency), otherwise JPEG 60%
                let compressedBase64;
                if (isPng) {
                    compressedBase64 = canvas.toDataURL('image/png');
                } else {
                    compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                }
                
                // Remove data:image/xxx;base64, prefix
                const base64Data = compressedBase64.split(',')[1];
                onImageSelected(base64Data);
            }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative bg-secondary overflow-hidden">
      {/* Background Slideshow with overlay */}
      <div className="absolute inset-0 h-[500px] lg:h-[600px] z-0">
        {HERO_IMAGES.map((src, index) => (
            <img 
              key={src}
              src={src} 
              alt={`Slide ${index + 1}`} 
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                  index === currentImageIndex ? 'opacity-30' : 'opacity-0'
              }`}
            />
        ))}
        {/* Gradient overlay - fade to transparent secondary to avoid grey casting when fading to white */}
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/90 via-secondary/95 to-secondary/0" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-20 pb-20 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        
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
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-1.5 shadow-2xl shadow-slate-900/10 transition-colors">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-[20px] border border-slate-100 dark:border-slate-700 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
                 <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                    <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-2xl">
                      <PhoneCall className="h-6 w-6 text-primary dark:text-sky-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Qabulga yozilish</p>
                      <a href="tel:+998901234567" className="text-lg font-bold text-slate-900 dark:text-white hover:text-primary transition-colors">
                        +998 90 123 45 67
                      </a>
                    </div>
                 </div>
                 
                 <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-slate-700"></div>

                 <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                    <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-3 rounded-2xl">
                      <MapPin className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Manzil</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
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
