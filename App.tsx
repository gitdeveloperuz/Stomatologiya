
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CartDrawer } from './components/CartDrawer';
import { TreatmentCard } from './components/TreatmentCard';
import { AdminLogin } from './components/AdminLogin';
import { ProductEntry } from './components/ProductEntry';
import { ConfirmModal } from './components/ConfirmModal';
import { ChatWidget } from './components/ChatWidget';
import { AdminChat } from './components/AdminChat';
import { Treatment, CartItem } from './types';
import { Stethoscope, CloudOff, Cloud, AlertTriangle, LayoutGrid, MessageSquare } from 'lucide-react';
import { initDB, saveTreatment, deleteTreatment, subscribeToTreatments, isCloudConfigured } from './services/db';

const App: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // Services State
  const [services, setServices] = useState<Treatment[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'products' | 'chat'>('products');
  
  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Initialize DB and Real-time Subscription
  useEffect(() => {
    // 1. Init DB (create object store if local)
    initDB();

    // 2. Subscribe to updates (Real-time)
    const unsubscribe = subscribeToTreatments(
      (data) => {
        // Success callback
        setDbError(null); // Clear any previous errors
        
        // Sort by newest first (using ID timestamp convention custom-TIMESTAMP)
        const sorted = data.sort((a, b) => {
            const timeA = parseInt(a.id.replace('custom-', '')) || 0;
            const timeB = parseInt(b.id.replace('custom-', '')) || 0;
            return timeB - timeA;
        });
        
        // Remove any old static services if they exist
        const cleaned = sorted.filter(s => !s.id.startsWith('static-'));
        
        setServices(cleaned);
        setIsLoadingServices(false);
      },
      (error) => {
        // Error callback
        console.error("DB Error:", error);
        if (error?.code === 'permission-denied') {
          setDbError('PERMISSION_DENIED');
        } else {
          setDbError('UNKNOWN');
        }
        setIsLoadingServices(false);
      }
    );

    return () => unsubscribe();
  }, []);

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
    setAdminTab('products'); // Switch to product tab to show entry form
    
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

  const handleAddService = async (data: Omit<Treatment, 'id'> & { imageUrl: string }) => {
    const newService: Treatment = {
      id: `custom-${Date.now()}`,
      ...data,
      recommended: false
    };
    
    // Clear upload state
    setUploadedImage(null);

    // Persist to DB
    try {
        await saveTreatment(newService);
    } catch (error: any) {
        console.error("Failed to save to DB:", error);
        if (error?.code === 'permission-denied') {
          alert("Xatolik: Baza yozishdan himoyalangan (Rules settings). Firebase Console-da ruxsatlarni to'g'irlang.");
          setDbError('PERMISSION_DENIED');
        } else {
          alert("Xatolik: Ma'lumotni saqlab bo'lmadi. Internetni tekshiring.");
        }
    }
  };

  const handleRemoveClick = (id: string) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
        try {
            await deleteTreatment(deleteId);
        } catch (error) {
            console.error("Failed to delete from DB:", error);
        }
        setDeleteId(null);
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

      {/* CLOUD STATUS & ERROR WARNINGS FOR ADMIN */}
      {isAdmin && (
        <div className="relative z-50">
          {!isCloudConfigured && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900 text-sm font-medium text-center">
              <div className="flex items-center justify-center gap-2">
                  <CloudOff className="h-4 w-4" />
                  <span>
                    <strong>DIQQAT:</strong> Bulutli baza ulanmagan. Ma'lumotlar faqat <u>shu telefonda</u> saqlanadi. 
                    Boshqa qurilmalarda ko'rinishi uchun Firebase kalitlarini kodga qo'shing.
                  </span>
              </div>
            </div>
          )}
          
          {isCloudConfigured && dbError === 'PERMISSION_DENIED' && (
             <div className="bg-red-50 border-b border-red-200 px-4 py-4 text-red-900 text-sm font-medium text-center animate-pulse">
                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-2 font-bold text-red-600 text-base">
                        <AlertTriangle className="h-5 w-5" />
                        <span>XATOLIK: Baza Yozishdan Himoyalangan (Production Mode)</span>
                    </div>
                    <p>Firebase Console &gt; Firestore &gt; <strong>Rules</strong> bo'limiga kiring va quyidagini yozing:</p>
                    <code className="bg-white px-3 py-1.5 rounded border border-red-200 text-red-700 font-mono mt-1 text-xs select-all">
                      allow read, write: if true;
                    </code>
                </div>
             </div>
          )}

          {isCloudConfigured && !dbError && (
              <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-emerald-800 text-xs font-bold text-center">
                <div className="flex items-center justify-center gap-2">
                    <Cloud className="h-3 w-3" />
                    <span>ONLINE: Barcha o'zgarishlar mijozlarda avtomatik yangilanadi.</span>
                </div>
              </div>
          )}
        </div>
      )}

      {/* ADMIN NAVIGATION TABS */}
      {isAdmin && (
          <div className="bg-white border-b border-slate-200 sticky top-16 z-40 shadow-sm">
              <div className="max-w-7xl mx-auto px-4 flex gap-6 overflow-x-auto">
                  <button 
                    onClick={() => setAdminTab('products')}
                    className={`py-4 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${adminTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                      <LayoutGrid className="h-4 w-4" /> Mahsulotlar
                  </button>
                  <button 
                    onClick={() => setAdminTab('chat')}
                    className={`py-4 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${adminTab === 'chat' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                      <MessageSquare className="h-4 w-4" /> Xabarlar
                  </button>
              </div>
          </div>
      )}

      {/* Main Content Area */}
      {isAdmin && adminTab === 'chat' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
              <AdminChat />
          </div>
      ) : (
          <>
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
                        <h2 className="text-2xl font-bold text-slate-900">Mahsulotlar</h2>
                        <p className="text-slate-500 text-sm">Barcha mahsulotlarimiz</p>
                    </div>
                    </div>
                    {!isAdmin && services.length > 0 && (
                        <div className="hidden sm:block text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                            Barcha mahsulotlar litsenziyalangan
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
                            {dbError === 'PERMISSION_DENIED' ? (
                                <CloudOff className="h-8 w-8 text-red-300" />
                            ) : (
                                <Stethoscope className="h-8 w-8 text-slate-300" />
                            )}
                            </div>
                            {dbError === 'PERMISSION_DENIED' ? (
                            <p className="text-lg font-medium text-red-500">Baza ruxsatlari sozlanmagan.</p>
                            ) : (
                            <p className="text-lg font-medium text-slate-600">Hozircha mahsulotlar mavjud emas.</p>
                            )}
                            {isAdmin && !dbError && <p className="text-sm mt-2 text-primary bg-primary/5 px-4 py-2 rounded-full">Yuqoridagi rasm yuklash tugmasi orqali mahsulot qo'shing.</p>}
                        </div>
                    ) : (
                        services.map(service => (
                        <TreatmentCard 
                            key={service.id} 
                            treatment={service} 
                            onAdd={addToCart} 
                            isAdmin={isAdmin}
                            onRemove={() => handleRemoveClick(service.id)}
                        />
                        ))
                    )}
                </div>
                </div>

            </main>
          </>
      )}

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

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="O'chirishni tasdiqlang"
        message="Siz rostdan ham ushbu mahsulotni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi."
      />

      {/* Chat for Users */}
      {!isAdmin && <ChatWidget />}
    </div>
  );
};

export default App;
