import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CartDrawer } from './components/CartDrawer';
import { TreatmentCard } from './components/TreatmentCard';
import { analyzeDentalImage } from './services/geminiService';
import { STATIC_SERVICES } from './constants';
import { Treatment, CartItem, AnalysisStatus } from './types';
import { Stethoscope, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [aiTreatments, setAiTreatments] = useState<Treatment[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageAnalysis = async (base64Data: string) => {
    setAnalysisStatus(AnalysisStatus.ANALYZING);
    setErrorMsg(null);
    try {
      const results = await analyzeDentalImage(base64Data);
      setAiTreatments(results);
      setAnalysisStatus(AnalysisStatus.COMPLETE);
      // Scroll to results
      const element = document.getElementById('results-section');
      element?.scrollIntoView({ behavior: 'smooth' });
    } catch (error: any) {
      setAnalysisStatus(AnalysisStatus.ERROR);
      setErrorMsg(error.message || "Xatolik yuz berdi");
    }
  };

  const addToCart = (treatment: Treatment) => {
    const newItem: CartItem = {
      ...treatment,
      cartId: Math.random().toString(36).substr(2, 9)
    };
    setCartItems(prev => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const removeFromCart = (cartId: string) => {
    setCartItems(prev => prev.filter(item => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar 
        cartCount={cartItems.length} 
        onCartClick={() => setIsCartOpen(true)} 
      />

      <HeroSection 
        onImageSelected={handleImageAnalysis} 
        isAnalyzing={analysisStatus === AnalysisStatus.ANALYZING} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        
        {/* Error Message */}
        {analysisStatus === AnalysisStatus.ERROR && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-8 flex items-center justify-center">
            {errorMsg}
          </div>
        )}

        {/* AI Results Section */}
        {analysisStatus === AnalysisStatus.COMPLETE && aiTreatments.length > 0 && (
          <div id="results-section" className="mb-16 animate-fade-in">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-primary to-purple-500 rounded-lg text-white">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">AI Tahlil Natijalari</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {aiTreatments.map(treatment => (
                 <TreatmentCard 
                   key={treatment.id} 
                   treatment={treatment} 
                   onAdd={addToCart} 
                 />
               ))}
             </div>
          </div>
        )}

        {/* Static Services Section */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
              <Stethoscope className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Barcha Xizmatlar</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {STATIC_SERVICES.map(service => (
              <TreatmentCard 
                key={service.id} 
                treatment={service} 
                onAdd={addToCart} 
              />
            ))}
          </div>
        </div>

      </main>

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cartItems} 
        onRemove={removeFromCart}
        onClear={clearCart}
      />
    </div>
  );
};

export default App;