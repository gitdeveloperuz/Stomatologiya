import React from 'react';
import { ShoppingCart, Activity, Lock, LogOut, Menu } from 'lucide-react';

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
  onAdminClick: () => void;
  isAdmin: boolean;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount, onCartClick, onAdminClick, isAdmin, onLogout }) => {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-18 items-center py-3">
          <div className="flex items-center gap-2.5 transition-transform active:scale-95 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="bg-gradient-to-tr from-primary to-sky-400 p-2.5 rounded-xl shadow-lg shadow-primary/20 text-white">
              <Activity className="h-6 w-6" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-bold text-slate-800 tracking-tight">
                Stomatologiya<span className="text-primary">.uz</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Dental Clinic
              </span>
            </div>
            {isAdmin && (
              <span className="ml-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-md">
                Admin
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {isAdmin ? (
               <button 
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Chiqish</span>
              </button>
            ) : (
              <button 
                onClick={onAdminClick}
                className="p-2.5 text-slate-500 hover:text-primary hover:bg-slate-50 rounded-xl transition-all active:scale-95"
                title="Admin kirish"
              >
                <Lock className="h-5 w-5" />
              </button>
            )}

            <button 
              onClick={onCartClick}
              className="relative p-2.5 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all active:scale-95 border border-slate-100"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold leading-none text-white transform bg-red-500 rounded-full shadow-sm ring-2 ring-white">
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