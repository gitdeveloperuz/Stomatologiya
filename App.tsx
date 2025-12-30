
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
import { ImageViewer } from './components/ImageViewer';
import { Treatment, CartItem, Category } from './types';
import { Stethoscope, CloudOff, Cloud, AlertTriangle, LayoutGrid, MessageSquare, Tag, Plus, Trash2, HelpCircle } from 'lucide-react';
import { initDB, saveTreatment, deleteTreatment, subscribeToTreatments, isCloudConfigured, subscribeToCategories, saveCategory, deleteCategory } from './services/db';

const App: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // Services & Categories State
  const [services, setServices] = useState<Treatment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'products' | 'chat' | 'categories'>('products');
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  // Image Viewer State
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Theme Init
    const stored = localStorage.getItem('stomatologiya_theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
    } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
    }

    // 1. Init DB
    initDB();

    // 2. Subscribe to treatments
    const unsubscribeTreatments = subscribeToTreatments(
      (data) => {
        setDbError(null);
        // Sort by newest first by default (ID based)
        const sorted = data.sort((a, b) => {
            const timeA = parseInt(a.id.replace('custom-', '')) || 0;
            const timeB = parseInt(b.id.replace('custom-', '')) || 0;
            return timeB - timeA;
        });
        const cleaned = sorted.filter(s => !s.id.startsWith('static-'));
        setServices(cleaned);
        setIsLoadingServices(false);
      },
      (error) => {
        console.error("DB Error:", error);
        if (error?.code === 'permission-denied') {
          setDbError('PERMISSION_DENIED');
        } else {
          setDbError('UNKNOWN');
        }
        setIsLoadingServices(false);
      }
    );

    // 3. Subscribe to categories
    const unsubscribeCategories = subscribeToCategories((data) => {
        setCategories(data);
    });

    return () => {
        unsubscribeTreatments();
        unsubscribeCategories();
    };
  }, []);

  const toggleTheme = () => {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      if (newMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('stomatologiya_theme', 'dark');
      } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('stomatologiya_theme', 'light');
      }
  };

  const handleAdminLogin = (password: string) => {
    if (password === 'Mr_Dilmu111adminmanu_sim_sim_ochil') {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const handleImageSelected = (base64Data: string) => {
    if (!isAdmin) return;
    setUploadedImage(base64Data);
    setAdminTab('products'); 
    setTimeout(() => {
        const element = document.getElementById('product-entry-section');
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const addToCart = (treatment: Treatment, quantity: number) => {
    setCartItems(prev => {
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
    setUploadedImage(null);
    try {
        await saveTreatment(newService);
    } catch (error: any) {
        if (error?.code === 'permission-denied') {
          alert("Xatolik: Baza yozishdan himoyalangan.");
          setDbError('PERMISSION_DENIED');
        } else {
          alert("Xatolik: Ma'lumotni saqlab bo'lmadi.");
        }
    }
  };
  
  const handleUpdateService = async (updatedTreatment: Treatment) => {
      try {
          await saveTreatment(updatedTreatment);
      } catch (error) {
          console.error("Update error:", error);
          alert("Xatolik: O'zgarishlarni saqlab bo'lmadi.");
      }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCategoryName.trim()) return;
      
      const newCat: Category = {
          id: `cat-${Date.now()}`,
          name: newCategoryName.trim()
      };
      
      try {
          await saveCategory(newCat);
          setNewCategoryName('');
      } catch (e) {
          console.error(e);
      }
  };

  const handleDeleteCategory = (id: string) => {
      setDeleteCategoryId(id);
  };

  const handleConfirmCategoryDelete = async () => {
    if (deleteCategoryId) {
        try {
            await deleteCategory(deleteCategoryId);
        } catch (error) {
            console.error("Failed to delete category:", error);
        }
        setDeleteCategoryId(null);
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

  // Filter Services
  const filteredServices = activeCategory === 'all' 
    ? services 
    : services.filter(s => s.category === activeCategory);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-24 transition-colors duration-300">
      <Navbar 
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)} 
        onCartClick={() => setIsCartOpen(true)} 
        onAdminClick={() => setIsAdminModalOpen(true)}
        isAdmin={isAdmin}
        onLogout={() => {
          setIsAdmin(false);
          setUploadedImage(null);
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* CLOUD STATUS */}
      {isAdmin && (
        <div className="relative z-50">
          {!isCloudConfigured && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3 text-amber-900 dark:text-amber-100 text-sm font-medium text-center">
              <div className="flex items-center justify-center gap-2">
                  <CloudOff className="h-4 w-4" />
                  <span><strong>DIQQAT:</strong> Bulutli baza ulanmagan.</span>
              </div>
            </div>
          )}
          {isCloudConfigured && dbError === 'PERMISSION_DENIED' && (
             <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 px-4 py-4 text-red-900 dark:text-red-100 text-sm font-medium text-center animate-pulse">
                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400 text-base">
                        <AlertTriangle className="h-5 w-5" />
                        <span>XATOLIK: Baza Yozishdan Himoyalangan</span>
                    </div>
                </div>
             </div>
          )}
        </div>
      )}

      {/* ADMIN NAVIGATION TABS */}
      {isAdmin && (
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-16 z-40 shadow-sm transition-colors">
              <div className="max-w-7xl mx-auto px-4 flex gap-6 overflow-x-auto">
                  <button onClick={() => setAdminTab('products')} className={`py-4 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${adminTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400'}`}>
                      <LayoutGrid className="h-4 w-4" /> Mahsulotlar
                  </button>
                  <button onClick={() => setAdminTab('categories')} className={`py-4 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${adminTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400'}`}>
                      <Tag className="h-4 w-4" /> Kategoriyalar
                  </button>
                  <button onClick={() => setAdminTab('chat')} className={`py-4 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${adminTab === 'chat' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400'}`}>
                      <MessageSquare className="h-4 w-4" /> Xabarlar
                  </button>
              </div>
          </div>
      )}

      {/* MAIN CONTENT */}
      {isAdmin && adminTab === 'chat' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
              <AdminChat />
          </div>
      ) : isAdmin && adminTab === 'categories' ? (
          <div className="max-w-4xl mx-auto px-4 mt-12">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                  <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
                      <Tag className="h-5 w-5 text-primary" /> Kategoriyalarni Boshqarish
                  </h2>
                  <form onSubmit={handleAddCategory} className="flex gap-3 mb-8">
                      <input 
                          type="text" 
                          value={newCategoryName} 
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Yangi kategoriya nomi" 
                          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                      <button type="submit" className="bg-primary hover:bg-sky-600 text-white px-6 rounded-xl font-bold flex items-center gap-2">
                          <Plus className="h-5 w-5" /> Qo'shish
                      </button>
                  </form>
                  <div className="space-y-2">
                      {categories.map(cat => (
                          <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">{cat.name}</span>
                              <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors">
                                  <Trash2 className="h-4 w-4" />
                              </button>
                          </div>
                      ))}
                      {categories.length === 0 && <p className="text-slate-400 text-center py-4">Kategoriyalar mavjud emas</p>}
                  </div>
              </div>
          </div>
      ) : (
          <>
            <HeroSection 
                onImageSelected={handleImageSelected} 
                isAnalyzing={false} 
                isAdmin={isAdmin}
                onAdminLoginClick={() => setIsAdminModalOpen(true)}
            />

            <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 relative z-10">
                {/* Product Entry */}
                {uploadedImage && isAdmin && (
                <div id="product-entry-section" className="mb-20 scroll-mt-24">
                    <ProductEntry 
                        image={uploadedImage}
                        categories={categories}
                        onSave={handleAddService}
                    />
                </div>
                )}

                {/* Main Grid with Left Sidebar */}
                <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* Left Nav (Categories) - Desktop Sticky / Mobile Scroll */}
                    <aside className="w-full lg:w-64 flex-shrink-0">
                        <div className="sticky top-24">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 px-1">
                                <LayoutGrid className="h-5 w-5 text-primary" /> Kategoriyalar
                            </h3>
                            
                            {/* Mobile/Tablet Horizontal Scroll */}
                            <div className="flex lg:hidden overflow-x-auto gap-2 pb-4 no-scrollbar -mx-4 px-4 snap-x">
                                <button
                                    onClick={() => setActiveCategory('all')}
                                    className={`snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeCategory === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}
                                >
                                    Barchasi
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.name)}
                                        className={`snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeCategory === cat.name ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {/* Desktop Vertical List */}
                            <div className="hidden lg:flex flex-col gap-2">
                                <button
                                    onClick={() => setActiveCategory('all')}
                                    className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex justify-between items-center group ${activeCategory === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    Barchasi
                                    <span className={`text-xs ${activeCategory === 'all' ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-500'}`}>{services.length}</span>
                                </button>

                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.name)}
                                        className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex justify-between items-center group ${activeCategory === cat.name ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                    >
                                        {cat.name}
                                        <span className={`text-xs ${activeCategory === cat.name ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-500'}`}>
                                            {services.filter(s => s.category === cat.name).length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Products Grid */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {activeCategory === 'all' ? 'Barcha Mahsulotlar' : activeCategory}
                            </h2>
                            <span className="text-sm text-slate-500 font-medium">
                                {filteredServices.length} ta mahsulot
                            </span>
                        </div>

                        {isLoadingServices ? (
                            <div className="w-full py-20 flex flex-col items-center justify-center text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                                <p className="text-slate-500 dark:text-slate-400">Yuklanmoqda...</p>
                            </div>
                        ) : filteredServices.length === 0 ? (
                            <div className="w-full py-20 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <Stethoscope className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                </div>
                                <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
                                    {activeCategory === 'all' ? "Hozircha mahsulotlar mavjud emas." : "Ushbu kategoriyada mahsulotlar yo'q."}
                                </p>
                            </div>
                        ) : (
                            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                                {filteredServices.map(service => (
                                    <div key={service.id} className="break-inside-avoid">
                                        <TreatmentCard 
                                            treatment={service} 
                                            onAdd={addToCart} 
                                            isAdmin={isAdmin}
                                            onRemove={() => handleRemoveClick(service.id)}
                                            onImageClick={(base64) => setViewingImage(base64)}
                                            categories={categories}
                                            onUpdate={handleUpdateService}
                                        />
                                    </div>
                                ))}
                            </div>
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

      {/* Confirmation Modal for Product Delete */}
      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="O'chirishni tasdiqlang"
        message="Siz rostdan ham ushbu mahsulotni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi."
      />

      {/* Confirmation Modal for Category Delete */}
      <ConfirmModal 
        isOpen={!!deleteCategoryId}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={handleConfirmCategoryDelete}
        title="Kategoriyani o'chirish"
        message="Siz rostdan ham ushbu kategoriyani o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi."
      />
      
      {/* Image Viewer Modal */}
      <ImageViewer 
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
        imageBase64={viewingImage}
      />

      {!isAdmin && <ChatWidget />}
    </div>
  );
};

export default App;
