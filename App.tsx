import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CartDrawer } from './components/CartDrawer';
import { TreatmentCard } from './components/TreatmentCard';
import { AdminLogin } from './components/AdminLogin';
import { ProductEntry } from './components/ProductEntry';
import { STATIC_SERVICES } from './constants';
import { Treatment, CartItem } from './types';
import { Stethoscope } from 'lucide-react';
import { initDB, getAllTreatments, saveTreatment, deleteTreatment } from './services/db';

const App: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // Services State
  const [services, setServices] = useState<Treatment[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await initDB();
      let storedServices = await getAllTreatments();
      
      // CLEANUP: If there are any old static services in the DB from previous runs, remove them
      // so the app is truly empty until the Admin uploads something.
      const staticItems = storedServices.filter(s => s.id.startsWith('static-'));
      if (staticItems.length > 0) {
        console.log("Cleaning up old static services...");
        for (const item of staticItems) {
            await deleteTreatment(item.id);
        }
        // Refresh list after deletion
        storedServices = await getAllTreatments();
      }

      // Sort by newest first (using ID timestamp convention custom-TIMESTAMP)
      const sorted = storedServices.sort((a, b) => {
         // Simple string comparison works for "custom-TIMESTAMP" to put newest (larger timestamp) first
         // because "custom-" is constant. 
         // Actually string compare might be tricky with variable lengths, let's parse.
         const timeA = parseInt(a.id.replace('custom-', '')) || 0;
         const timeB = parseInt(b.id.replace('custom-', '')) || 0;
         return timeB - timeA;
      });
      
      setServices(sorted);
    } catch (error) {
      console.error("Failed to load services from DB:", error);
    } finally {
      setIsLoadingServices(false);
    }
  }, []);

  // Initialize DB, load services, and setup sync listener
  useEffect(() => {
    loadData();

    // Listen for updates from other tabs (e.g., Admin tab updates, User tab refreshes)
    const channel = new BroadcastChannel('stomatologiya_updates');
    channel.onmessage = (event) => {
        if (event.data === 'db_update') {
            loadData();
        }
    };

    return () => {
        channel.close();
    };
  }, [loadData]);

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

  const notifyUpdates = () => {
      const channel = new BroadcastChannel('stomatologiya_updates');
      channel.postMessage('db_update');
      channel.close();
  };

  const handleAddService = async (data: Omit<Treatment, 'id'> & { imageUrl: string }) => {
    const newService: Treatment = {
      id: `custom-${Date.now()}`,
      ...data,
      recommended: false
    };
    
    // Optimistic Update
    setServices(prev => [newService, ...prev]);
    
    // Clear upload state
    setUploadedImage(null);

    // Persist to DB and Notify
    try {
        await saveTreatment(newService);
        notifyUpdates();
    } catch (error) {
        console.error("Failed to save to DB:", error);
        alert("Xatolik: Ma'lumotni saqlab bo'lmadi. Iltimos qayta urinib ko'ring.");
    }
  };

  const handleRemoveService = async (id: string) => {
    if (window.confirm("Rostdan ham ushbu xizmatni o'chirmoqchimisiz?")) {
        // Optimistic Update
        setServices(prev => prev.filter(service => service.id !== id));
        
        // Remove from DB and Notify
        try {
            await deleteTreatment(id);
            notifyUpdates();
        } catch (error) {
            console.error("Failed to delete from DB:", error);
        }
    }
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
            {!isAdmin && services.length > 0 && (
                <div className="hidden sm:block text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    Barcha xizmatlar litsenziyalangan
                </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {isLoadingServices ? (
                 <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p className="text-slate-500">Yuklanmoqda...</p>
                 </div>
            ) : services.length === 0 ? (
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