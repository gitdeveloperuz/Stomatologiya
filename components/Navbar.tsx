
import React, { useState, useRef } from 'react';
import { ShoppingCart, Activity, LogOut, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
  onAdminClick: () => void;
  isAdmin: boolean;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount, onCartClick, onAdminClick, isAdmin, onLogout, isDarkMode, onToggleTheme }) => {
  const [clickCount, setClickCount] = useState(0);
  const timeoutRef = useRef<any>(null);

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Secret Admin Trigger Logic
    if (!isAdmin) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        setClickCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 5) { // 5 clicks to trigger
                onAdminClick();
                return 0;
            }
            return newCount;
        });

        // Reset if inactive for 1 second
        timeoutRef.current = setTimeout(() => {
            setClickCount(0);
        }, 1000);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-950/60 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-18 items-center py-3">
          <div className="flex items-center gap-2.5 transition-transform active:scale-95 cursor-pointer select-none" onClick={handleLogoClick}>
            <div className="bg-gradient-to-tr from-primary to-sky-400 p-2.5 rounded-xl shadow-lg shadow-primary/20 text-white">
              <Activity className="h-6 w-6" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                Stomatologiya<span className="text-primary">.uz</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase">
                Dental Clinic
              </span>
            </div>
            {isAdmin && (
              <span className="ml-2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-md animate-fade-in">
                Admin
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
             {/* Theme Toggle */}
             <button
              onClick={onToggleTheme}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95"
              title={isDarkMode ? "Kunduzgi rejim" : "Tungi rejim"}
            >
              {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </button>

            {isAdmin && (
               <button 
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Chiqish</span>
              </button>
            )}

            <button 
              onClick={onCartClick}
              className="relative p-2.5 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95 border border-slate-100 dark:border-slate-700"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold leading-none text-white transform bg-red-500 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
