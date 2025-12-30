import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CartDrawer } from './components/CartDrawer';
import { TreatmentCard } from './components/TreatmentCard';
import { AdminLogin } from './components/AdminLogin';
import { ProductEntry } from './components/ProductEntry';
import { STATIC_SERVICES } from './constants';
import { Treatment, CartItem } from './types';
import { Stethoscope } from 'lucide-react';

const App: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // Services State - initialized with static data (now empty)
  const [services, setServices] = useState<Treatment[]>(STATIC_SERVICES);
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const handleAdminLogin = (password: string) => {
    if (password === 'admin123') { // Simple hardcoded password
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const handleImageSelected = (base64Data: string) => {
    if (!isAdmin) return;
    
    setUploadedImage(base64Data);
    
    // Scroll to form immediately
    setTimeout(() => {
        const element = document.getElementById('product-entry-section');
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const addToCart = (treatment: Treatment, quantity: number) => {
    setCartItems(prev => {
      // Check if item already exists to group them
      const existingItem = prev.find(item => item.id === treatment.id);
      
      if (existingItem) {
        return prev.map(item => 
          item.id === treatment.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      const newItem: CartItem = {
        ...treatment,
        cartId: Math.random().toString(36).substr(2, 9),
        quantity: quantity
      };
      return [...prev, newItem];
    });
    setIsCartOpen(true);
  };

  const handleAddService = (data: Omit<Treatment, 'id'> & { imageUrl: string }) => {
    const newService: Treatment = {
      id: `custom-${Date.now()}`,
      ...data,
      recommended: false
    };
    
    // Add to the beginning of the list so it's visible immediately
    setServices(prev => [newService, ...prev]);
    
    // Clear upload state after adding
    setUploadedImage(null);
  };

  const handleRemoveService = (id: string) => {
    setServices(prev => prev.filter(service => service.id !== id));
  };

  const removeFromCart = (cartId: string) => {
    setCartItems(prev => prev.filter(item => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <Navbar 
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)} 
        onCartClick={() => setIsCartOpen(true)} 
        onAdminClick={() => setIsAdminModalOpen(true)}
        isAdmin={isAdmin}
        onLogout={() => {
          setIsAdmin(false);
          setUploadedImage(null);
        }}
      />

      <HeroSection 
        onImageSelected={handleImageSelected} 
        isAnalyzing={false} 
        isAdmin={isAdmin}
        onAdminLoginClick={() => setIsAdminModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 relative z-10">
        
        {/* Product Entry Section (Admin Only, Image Uploaded) */}
        {uploadedImage && isAdmin && (
          <div id="product-entry-section" className="mb-20 scroll-mt-24">
             <ProductEntry 
                image={uploadedImage}
                onSave={handleAddService}
             />
          </div>
        )}

        {/* Services List Section */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white border border-slate-100 shadow-sm rounded-2xl text-slate-700">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Xizmatlar</h2>
                <p className="text-slate-500 text-sm">Barcha stomatologiya xizmatlari</p>
              </div>
            </div>
            {/* Can add filters here later */}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {services.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center text-slate-400 bg-white rounded-[2rem] border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Stethoscope className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-lg font-medium text-slate-600">Hozircha xizmatlar mavjud emas.</p>
                    {isAdmin && <p className="text-sm mt-2 text-primary bg-primary/5 px-4 py-2 rounded-full">Yuqoridagi rasm yuklash tugmasi orqali xizmat qo'shing.</p>}
                </div>
            ) : (
                services.map(service => (
                <TreatmentCard 
                    key={service.id} 
                    treatment={service} 
                    onAdd={addToCart} 
                    isAdmin={isAdmin}
                    onRemove={() => handleRemoveService(service.id)}
                />
                ))
            )}
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

      <AdminLogin 
        isOpen={isAdminModalOpen} 
        onClose={() => setIsAdminModalOpen(false)} 
        onLogin={handleAdminLogin}
      />
    </div>
  );
};

export default App;