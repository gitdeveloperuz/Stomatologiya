
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CartDrawer } from './components/CartDrawer';
import { TreatmentCard } from './components/TreatmentCard';
import { AdminLogin } from './components/AdminLogin';
import { ProductEntry } from './components/ProductEntry';
import { ConfirmModal } from './components/ConfirmModal';
import { ChatWidget } from './components/ChatWidget';
import { AdminChat } from './components/AdminChat';
import { AdminSettings } from './components/AdminSettings';
import { AdminCustomers } from './components/AdminCustomers'; 
import { ImageViewer } from './components/ImageViewer';
import { AdBanner } from './components/AdBanner';
import { FaqSection } from './components/FaqSection';
import { FeatureSection } from './components/FeatureSection';
import { ImageDiffSection } from './components/ImageDiffSection';
import { Footer } from './components/Footer';
import { TestimonialsSection } from './components/TestimonialsSection';
import { Pagination } from './components/Pagination';
import { DynamicPage } from './components/DynamicPage';
import { TableSection } from './components/TableSection';
import { Treatment, CartItem, Category, SiteConfig, Advertisement, AdminUser, Page, NavLink, SectionType, TelegramUser, BotConfig } from './types';
import { Stethoscope, CloudOff, Cloud, LayoutGrid, MessageSquare, Plus, Trash2, Settings, Users, Move, X, ChevronDown, ChevronRight, Filter, Search, ArrowUp, ArrowDown, Heart, DollarSign, Coins, Upload } from 'lucide-react';
import { initDB, saveTreatment, deleteTreatment, subscribeToTreatments, isCloudConfigured, subscribeToCategories, saveCategory, deleteCategory, subscribeToSiteConfig, saveSiteConfig, trackTgUser, subscribeToTelegramUsers } from './services/db';
import { TELEGRAM_ADMIN_ID, TELEGRAM_BOT_TOKEN } from './constants';

const DEFAULT_BOT_CONFIG: BotConfig = {
    welcomeMessage: "👋 <b>Assalomu alaykum!</b>\n\nBizning botimizga xush kelibsiz. Quyidagi menyudan kerakli bo'limni tanlang:",
    menuButtons: {
        products: "🦷 Mahsulotlar",
        cart: "🛒 Savatcha",
        announcements: "📢 E'lonlar",
        contactAdmin: "✍️ Adminga yozish",
        adminPanel: "👨‍⚕️ Admin Panel"
    },
    messages: {
        cartEmpty: "🛒 Savatchangiz bo'sh.",
        cartHeader: "🛒 <b>Sizning savatchangiz:</b>\n\n",
        checkoutPrompt: "📞 <b>Siz bilan bog'lanishimiz uchun telefon raqamingizni yuboring:</b>",
        orderSuccess: "✅ Buyurtmangiz qabul qilindi! Tez orada aloqaga chiqamiz.",
        contactPrompt: "📝 <b>Admin bilan aloqa rejimi.</b>\n\nSavolingizni yozib qoldiring. \nSuhbatni tugatish uchun '❌ Bekor qilish' tugmasini bosing.",
        supportResponse: "✅ <b>Xabaringiz yuborildi.</b>\nTez orada admin javob beradi.",
        locationPrompt: "📍 <b>Yetkazib berish manzilini yuboring (yoki lokatsiya tashlang):</b>\n\nAgar manzil kerak bo'lmasa, 'O'tkazib yuborish' tugmasini bosing."
    },
    inlineButtons: {
        addToCart: "🛒 Savatchaga qo'shish",
        checkout: "✅ Rasmiylashtirish",
        clearCart: "🗑 Tozalash",
        sendLocation: "📍 Lokatsiya yuborish",
        sendContact: "📞 Raqamni yuborish",
        cancel: "❌ Bekor qilish",
        skip: "O'tkazib yuborish ➡️",
        back: "🔙 Ortga"
    }
};

const DEFAULT_CONFIG: SiteConfig = {
  id: 'hero_config',
  headline: 'Mukammal Tabassum Biz Bilan Boshlanadi',
  subheadline: 'Eng zamonaviy uskunalar va tajribali shifokorlar xizmatidan foydalaning. Biz sizning tabassumingiz haqida qayg\'uramiz.',
  gradientStart: '#38bdf8', 
  gradientEnd: '#34d399',   
  subheadlineFont: "'Inter', sans-serif",
  logoText: 'StomShop',
  darkModeColor: '#020617', 
  showHomeLink: false,
  itemsPerPage: 50,
  customItems: [],
  customCardsPosition: 'left', 
  featureCards: [],
  imageDiffs: [],
  pages: [], 
  navLinks: [
      { id: 'home-link', text: 'Bosh Sahifa', url: '#', type: 'internal', pageId: 'home' }
  ],
  diffSectionConfig: {
      isVisible: true,
      title: "Bizning Natijalar",
      subtitle: "Davolanishdan oldingi va keyingi holatlar",
      bgColor: "",
      textColor: ""
  },
  faqItems: [
    {
        id: 'faq-1',
        question: 'Klinikangiz ish vaqti qanday?',
        answer: 'Bizning klinikamiz har kuni soat 09:00 dan 18:00 gacha ishlaydi. Yakshanba kuni dam olish kuni.',
        isVisible: true
    },
    {
        id: 'faq-2',
        question: 'Qabulga oldindan yozilish shartmi?',
        answer: 'Ha, navbat kutmaslik va shifokorimiz vaqtini rejalashtirish uchun oldindan telefon orqali yoki sayt orqali yozilishni tavsiya qilamiz.',
        isVisible: true
    },
    {
        id: 'faq-3',
        question: 'To\'lov turlari qanaqa?',
        answer: 'Siz naqd pul, plastik karta (UzCard, Humo) yoki o\'tkazma yo\'li bilan to\'lov qilishingiz mumkin.',
        isVisible: true
    }
  ],
  adConfig: {
      autoplay: true,
      interval: 5,
      showControls: true
  },
  telegram: {
      botToken: TELEGRAM_BOT_TOKEN,
      adminId: TELEGRAM_ADMIN_ID
  },
  footer: {
      description: "Bizning klinikamizda yuqori malakali shifokorlar sizning tabassumingiz uchun g'amxo'rlik qiladi. Eng so'nggi texnologiyalar va qulay muhit.",
      copyright: `© ${new Date().getFullYear()} StomShop. Barcha huquqlar himoyalangan.`,
      poweredBy: 'StomShop',
      links: [
          { id: 'l1', text: 'Bosh Sahifa', url: '#' },
          { id: 'l2', text: 'Xizmatlar', url: '#' },
          { id: 'l3', text: 'Biz haqimizda', url: '#' }
      ],
      socials: []
  },
  style: {
      navAlignment: 'center'
  },
  botConfig: DEFAULT_BOT_CONFIG
};

const SESSION_KEY = 'stomatologiya_admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; 

const DEFAULT_HOME_SECTIONS: SectionType[] = ['hero', 'banner', 'products', 'features', 'diff', 'testimonials'];

const App: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const productUploadRef = useRef<HTMLInputElement>(null);
  
  // Navigation State
  const [currentRoute, setCurrentRoute] = useState<string>('home'); 

  // Services & Categories State
  const [services, setServices] = useState<Treatment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'liked'>('default');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'UZS' | 'USD'>('all'); // New Currency Filter
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false); // Mobile Drawer
  const [showAllCategories, setShowAllCategories] = useState(false); // Desktop expansion
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Site Config State
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [tempDarkModeColor, setTempDarkModeColor] = useState<string | null>(null);

  // Admin State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'products' | 'chat' | 'settings' | 'customers'>('products');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewImages, setViewImages] = useState<string[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // User Session / Likes
  const [clientSessionId, setClientSessionId] = useState<string>('');
  const [likedProductIds, setLikedProductIds] = useState<string[]>([]);

  const effectiveDarkModeColor = tempDarkModeColor || siteConfig.darkModeColor;
  const isAdmin = !!currentUser;

  // Initialize Client ID
  useEffect(() => {
      let storedId = localStorage.getItem('stomatologiya_chat_id');
      if (!storedId) {
          storedId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          localStorage.setItem('stomatologiya_chat_id', storedId);
      }
      setClientSessionId(storedId);
  }, []);

  // Load User Data (Likes)
  useEffect(() => {
      if (!clientSessionId) return;
      const unsub = subscribeToTelegramUsers((users) => {
          const user = users.find(u => u.id === clientSessionId);
          if (user && user.likedProducts) {
              setLikedProductIds(user.likedProducts);
          }
      });
      return () => unsub();
  }, [clientSessionId]);

  // Apply Global Styles based on Config
  useEffect(() => {
      const root = document.documentElement;
      const s = siteConfig.style;
      if (s) {
          root.style.setProperty('--btn-radius', `${s.buttonRadius}px`);
          root.style.setProperty('--btn-px', `${s.buttonPaddingX}px`);
          root.style.setProperty('--btn-py', `${s.buttonPaddingY}px`);
          root.style.setProperty('--icon-color', s.iconColor);
          root.style.setProperty('--primary-color', s.primaryColor);
          root.style.setProperty('--logo-height', `${s.logoHeight || 40}px`);
          root.style.setProperty('--footer-link-color', s.footerLinkColor || '#64748b');
          root.style.setProperty('--card-hover-color', s.cardHoverColor || s.primaryColor || '#0ea5e9');
          root.style.setProperty('--chat-blur-color', s.chatBlurColor || s.primaryColor || '#0ea5e9');
          root.style.setProperty('--product-blur-color', s.productCardHoverColor || s.cardHoverColor || s.primaryColor || '#0ea5e9');

          // Category Button CSS variables
          if (s.categoryBtnColor) root.style.setProperty('--cat-btn-bg', s.categoryBtnColor);
          if (s.categoryBtnActiveColor) root.style.setProperty('--cat-btn-active-bg', s.categoryBtnActiveColor);
          if (s.categoryBtnText) root.style.setProperty('--cat-btn-text', s.categoryBtnText);
          if (s.categoryBtnActiveText) root.style.setProperty('--cat-btn-active-text', s.categoryBtnActiveText);

          const styleTag = document.createElement('style');
          styleTag.id = 'dynamic-theme';
          styleTag.innerHTML = `
            .dynamic-btn { border-radius: var(--btn-radius); padding: var(--btn-py) var(--btn-px); }
            .dynamic-icon { color: var(--icon-color); }
            .bg-primary { background-color: var(--primary-color) !important; }
            .text-primary { color: var(--primary-color) !important; }
            .border-primary { border-color: var(--primary-color) !important; }
            .ring-primary { --tw-ring-color: var(--primary-color) !important; }
            .dynamic-footer-link { color: var(--footer-link-color); }
            .dynamic-card:hover { box-shadow: 0 20px 25px -5px var(--card-hover-color) !important; border-color: var(--card-hover-color) !important; }
            .dynamic-chat-btn { box-shadow: 0 10px 15px -3px var(--chat-blur-color) !important; }
            html { scroll-behavior: smooth; }
          `;
          const existing = document.getElementById('dynamic-theme');
          if (existing) existing.remove();
          document.head.appendChild(styleTag);
      }
  }, [siteConfig.style]);

  // Theme & Dark Mode Color Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      if (effectiveDarkModeColor) {
          document.body.style.backgroundColor = effectiveDarkModeColor;
      }
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      document.body.style.backgroundColor = '';
    }
  }, [isDarkMode, effectiveDarkModeColor]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
      setCurrentPage(1);
  }, [activeCategory, searchQuery, sortBy, currencyFilter]);

  useEffect(() => {
    const loadData = async () => {
        try {
            await initDB();
            
            const unsubTreatments = subscribeToTreatments(
                (data) => {
                    setServices(data);
                    setIsLoadingServices(false);
                },
                (err) => setDbError("Ma'lumotlar bazasi bilan aloqa yo'q")
            );

            const unsubCategories = subscribeToCategories(setCategories);
            const unsubConfig = subscribeToSiteConfig((data) => {
                if (data) {
                    setSiteConfig(prev => ({
                        ...prev,
                        ...data,
                        showHomeLink: data.showHomeLink !== undefined ? data.showHomeLink : false,
                        pages: data.pages || [], 
                        navLinks: (data.navLinks && data.navLinks.length > 0) ? data.navLinks : DEFAULT_CONFIG.navLinks,
                        itemsPerPage: data.itemsPerPage || DEFAULT_CONFIG.itemsPerPage,
                        telegram: {
                            botToken: data.telegram?.botToken || prev.telegram?.botToken || '',
                            adminId: data.telegram?.adminId || prev.telegram?.adminId || ''
                        },
                        style: { ...DEFAULT_CONFIG.style, ...data.style },
                        conditionConfig: { ...DEFAULT_CONFIG.conditionConfig, ...data.conditionConfig },
                        diffSectionConfig: { ...DEFAULT_CONFIG.diffSectionConfig, ...data.diffSectionConfig },
                        faqConfig: data.faqConfig,
                        bannerAds: data.bannerAds || [],
                        botConfig: { 
                            ...DEFAULT_BOT_CONFIG, 
                            ...(data.botConfig || {}),
                            menuButtons: { ...DEFAULT_BOT_CONFIG.menuButtons, ...(data.botConfig?.menuButtons || {}) },
                            messages: { ...DEFAULT_BOT_CONFIG.messages, ...(data.botConfig?.messages || {}) },
                            inlineButtons: { ...DEFAULT_BOT_CONFIG.inlineButtons, ...(data.botConfig?.inlineButtons || {}) }
                        }
                    }));
                }
                setIsConfigLoaded(true);
            });

            const sessionStr = localStorage.getItem(SESSION_KEY);
            if (sessionStr) {
                try {
                    const session = JSON.parse(sessionStr);
                    const isValid = (Date.now() - session.timestamp) < SESSION_DURATION;
                    if (isValid && session.user) setCurrentUser(session.user);
                    else localStorage.removeItem(SESSION_KEY);
                } catch (e) {
                    localStorage.removeItem(SESSION_KEY);
                }
            }

            return () => {
                unsubTreatments();
                unsubCategories();
                unsubConfig();
            };
        } catch (e) {
            console.error("Init failed", e);
            setDbError("Tizimda xatolik");
        }
    };
    loadData();
  }, []);

  // Telegram Mini App
  useEffect(() => {
     // @ts-ignore
     const tg = window.Telegram?.WebApp;
     if (tg) {
         tg.ready();
         tg.expand();
         if (tg.colorScheme === 'dark') setIsDarkMode(true);
         else setIsDarkMode(false);

         const user = tg.initDataUnsafe?.user;
         const configuredId = siteConfig.telegram?.adminId || TELEGRAM_ADMIN_ID;
         
         if (user && String(user.id) === String(configuredId)) {
             const superAdmin: AdminUser = {
                 id: 'tg-admin',
                 email: 'telegram@admin',
                 name: 'Telegram Admin',
                 password: '',
                 role: 'super_admin',
                 isTwoFactorEnabled: false,
                 permissions: { products: true, content: true, chat: true, settings: true, admins: true }
             };
             setCurrentUser(superAdmin);
             localStorage.setItem(SESSION_KEY, JSON.stringify({ user: superAdmin, timestamp: Date.now() }));
         }
         
         if (user && user.id) {
             setClientSessionId(String(user.id));
         }
     }
  }, [siteConfig, isConfigLoaded]);

  // Main Button Logic
  useEffect(() => {
     // @ts-ignore
     const tg = window.Telegram?.WebApp;
     if (!tg) return;
     const mainButton = tg.MainButton;
     const handleMainBtnClick = () => setIsCartOpen(true);

     if (isCartOpen) {
         mainButton.hide(); 
     } else {
         if (cartItems.length > 0) {
             mainButton.setText(`SAVATCHA (${cartItems.length})`);
             mainButton.show();
             mainButton.onClick(handleMainBtnClick);
         } else {
             mainButton.hide();
             mainButton.offClick(handleMainBtnClick);
         }
     }
     return () => mainButton.offClick(handleMainBtnClick);
  }, [cartItems, isCartOpen]);


  const handleAddToCart = (treatment: Treatment, qty: number) => {
    setCartItems(prev => {
        const existing = prev.find(item => item.id === treatment.id);
        if (existing) return prev.map(item => item.id === treatment.id ? { ...item, quantity: item.quantity + qty } : item);
        return [...prev, { ...treatment, cartId: `cart-${Date.now()}`, quantity: qty }];
    });
  };

  const handleUpdateQuantity = (cartId: string, newQty: number) => {
    setCartItems(prev => prev.map(item => item.cartId === cartId ? { ...item, quantity: newQty } : item));
  };

  const handleRemoveFromCart = (cartId: string) => setCartItems(prev => prev.filter(item => item.cartId !== cartId));
  const handleClearCart = () => setCartItems([]);

  const handleHeroImageSelect = async (base64: string) => {
      if (isAdmin && currentUser?.permissions.products) {
          setUploadedImage(base64); 
      } else {
          // User Flow: Direct to Cart with image
          const newItem: CartItem = {
              id: `req-${Date.now()}`,
              cartId: `cart-req-${Date.now()}`,
              name: "Rasm Orqali So'rov",
              price: 0,
              currency: 'UZS',
              quantity: 1,
              category: "Konsultatsiya",
              description: "Iltimos, ushbu rasm bo'yicha tashxis va narxni ma'lum qiling.",
              imageUrl: base64,
              images: [base64]
          };
          setCartItems(prev => [...prev, newItem]);
          setIsCartOpen(true);
      }
  };

  const handleAdminLogin = (user: AdminUser) => {
    setCurrentUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: user, timestamp: Date.now() }));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    setIsAdminModalOpen(false);
  };

  const handleUpdateUser = (user: AdminUser) => {
    setCurrentUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: user, timestamp: Date.now() }));
  };

  const handleSaveProduct = async (data: any) => {
      const newTreatment: Treatment = { id: `t-${Date.now()}`, ...data };
      await saveTreatment(newTreatment);
      setUploadedImage(null);
  };

  const handleDeleteProduct = async (id: string) => await deleteTreatment(id);
  const handleUpdateProduct = async (treatment: Treatment) => await saveTreatment(treatment);

  const handleImageView = (images: string[], index: number) => {
      setViewImages(images);
      setViewIndex(index);
      setIsImageViewerOpen(true);
  };

  const [newCategoryName, setNewCategoryName] = useState('');
  const handleAddCategory = async () => {
      if (!newCategoryName.trim()) return;
      const newCat: Category = { id: `cat-${Date.now()}`, name: newCategoryName.trim() };
      await saveCategory(newCat);
      setNewCategoryName('');
  };
  const handleDeleteCategory = async (id: string) => await deleteCategory(id);

  const handleToggleProductLike = (productId: string) => {
      if (!clientSessionId) return;
      const newLikes = likedProductIds.includes(productId) 
          ? likedProductIds.filter(id => id !== productId)
          : [...likedProductIds, productId];
      setLikedProductIds(newLikes);
      trackTgUser(clientSessionId, { likedProducts: newLikes });
  };

  const filteredAndSortedServices = useMemo(() => {
      let result = services;
      const EXCHANGE_RATE = 12800; // Approximate rate for sorting logic

      const getNormalizedPrice = (item: Treatment) => {
          if (item.currency === 'USD') return item.price * EXCHANGE_RATE;
          return item.price;
      };

      // 1. Category Filter
      if (activeCategory !== 'all') {
          result = result.filter(s => s.category === activeCategory);
      }

      // 2. Currency Filter
      if (currencyFilter !== 'all') {
          result = result.filter(s => s.currency === currencyFilter);
      }

      // 3. Search Query
      if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          result = result.filter(s => 
              s.name.toLowerCase().includes(q) || 
              (s.description && s.description.toLowerCase().includes(q))
          );
      }

      // 4. Sort
      if (sortBy === 'price-asc') {
          result = [...result].sort((a, b) => getNormalizedPrice(a) - getNormalizedPrice(b));
      } else if (sortBy === 'price-desc') {
          result = [...result].sort((a, b) => getNormalizedPrice(b) - getNormalizedPrice(a));
      } else if (sortBy === 'liked') {
          // Show liked items first
          result = [...result].sort((a, b) => {
              const aLiked = likedProductIds.includes(a.id) ? 1 : 0;
              const bLiked = likedProductIds.includes(b.id) ? 1 : 0;
              return bLiked - aLiked; // Higher value first
          });
      }

      return result;
  }, [services, activeCategory, searchQuery, sortBy, likedProductIds, currencyFilter]);

  const itemsPerPage = siteConfig.itemsPerPage || 50;
  const totalPages = Math.ceil(filteredAndSortedServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentServices = filteredAndSortedServices.slice(startIndex, startIndex + itemsPerPage);

  const productLayout = siteConfig.style?.productLayout || 'masonry';
  let gridClasses = '';
  
  if (productLayout === 'masonry') {
      gridClasses = 'columns-2 lg:columns-3 gap-4 space-y-4';
  } else if (productLayout === 'grid') {
      gridClasses = 'grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4';
  } else if (productLayout === 'list') {
      gridClasses = 'flex flex-col gap-4 max-w-3xl mx-auto';
  }

  const blurColor = siteConfig.style?.productCardHoverColor || siteConfig.style?.cardHoverColor || siteConfig.style?.primaryColor || '#0ea5e9';

  const activePageData = siteConfig.pages?.find(p => p.id === currentRoute);

  const dynamicNavLinks: NavLink[] = [
      (siteConfig.showHomeLink 
          ? (siteConfig.navLinks?.find(l => l.pageId === 'home') || { id: 'home-link', text: 'Bosh Sahifa', url: '#', type: 'internal', pageId: 'home' })
          : { id: 'hidden-home', text: '', url: '', type: 'internal', pageId: 'hidden' }), // Dummy hidden link
      ...(siteConfig.pages || []).map(page => ({
          id: page.id,
          text: page.title,
          url: `#${page.slug}`,
          type: 'internal' as const,
          pageId: page.id
      }))
  ].filter(l => l.text !== ''); // Filter out dummy if needed or just handle empty text in Navbar

  // Helper for category button styles
  const getCatBtnStyle = (isActive: boolean) => {
      const s = siteConfig.style;
      if (isActive) {
          return {
              backgroundColor: s?.categoryBtnActiveColor || s?.primaryColor || '#0ea5e9',
              color: s?.categoryBtnActiveText || '#ffffff',
              border: `1px solid ${s?.categoryBtnActiveColor || s?.primaryColor || '#0ea5e9'}`
          };
      }
      return {
          backgroundColor: s?.categoryBtnColor || 'transparent',
          color: s?.categoryBtnText, // Will fall back to class based text color if undefined
          border: s?.categoryBtnColor ? `1px solid ${s.categoryBtnColor}` : undefined
      };
  };

  const renderCategoryList = () => {
      const displayCategories = showAllCategories ? categories : categories.slice(0, 8);
      return (
          <div className="space-y-1">
              <button 
                  onClick={() => { setActiveCategory('all'); setShowCategoryDrawer(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'all' ? '' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  style={getCatBtnStyle(activeCategory === 'all')}
              >
                  Barchasi
              </button>
              {displayCategories.map(cat => (
                  <div key={cat.id} className="relative group">
                      <button 
                          onClick={() => { setActiveCategory(cat.name); setShowCategoryDrawer(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat.name ? '' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          style={getCatBtnStyle(activeCategory === cat.name)}
                      >
                          {cat.name}
                      </button>
                      {isAdmin && currentUser?.permissions.products && <button onClick={() => handleDeleteCategory(cat.id)} className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"><Trash2 className="h-3 w-3" /></button>}
                  </div>
              ))}
              {!showAllCategories && categories.length > 8 && (
                  <button onClick={() => setShowAllCategories(true)} className="w-full text-left px-3 py-2 text-xs font-bold text-primary hover:underline">
                      Ko'proq ko'rsatish ({categories.length - 8})
                  </button>
              )}
              {showAllCategories && categories.length > 8 && (
                  <button onClick={() => setShowAllCategories(false)} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-400 hover:underline">
                      Kamroq
                  </button>
              )}
          </div>
      );
  };

  const renderHomeSection = (type: SectionType, index: number) => {
      switch (type) {
          case 'hero':
              return (
                  <HeroSection 
                      key={`home-${type}-${index}`}
                      onImageSelected={handleHeroImageSelect} 
                      isAdmin={isAdmin}
                      onAdminLoginClick={() => setIsAdminModalOpen(true)}
                      config={siteConfig}
                      isEditing={false}
                  />
              );
          case 'banner':
              return <AdBanner key={`home-${type}-${index}`} ads={siteConfig.bannerAds || []} config={siteConfig.adConfig} />;
          case 'features':
              return (
                  <FeatureSection 
                      key={`home-${type}-${index}`}
                      cards={siteConfig.featureCards || []} 
                      style={siteConfig.style} 
                      config={siteConfig.featureSectionConfig} 
                  />
              );
          case 'products':
              return (
                <div key={`home-${type}-${index}`} id="services" className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 scroll-mt-24 pb-12 relative group/prod-section">
                    
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Desktop Sidebar */}
                        <aside className="hidden lg:block w-64 shrink-0">
                            <div className="sticky top-24 space-y-6">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <LayoutGrid className="h-4 w-4 text-primary" /> Kategoriyalar
                                    </h3>
                                    {renderCategoryList()}
                                    
                                    {isAdmin && currentUser?.permissions.products && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex gap-1">
                                                <input 
                                                    value={newCategoryName}
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                    placeholder="Yangi..."
                                                    className="w-full text-xs p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-700"
                                                />
                                                <button onClick={handleAddCategory} className="p-2 bg-primary text-white rounded-lg"><Plus className="h-3 w-3" /></button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                        {isCloudConfigured ? <Cloud className="h-3 w-3 text-emerald-500" /> : <CloudOff className="h-3 w-3" />}
                                        <span>DB Status: {isCloudConfigured ? 'Online' : 'Local'}</span>
                                    </div>
                                    {isLoadingServices && <span className="text-xs text-primary animate-pulse block mt-1">Yangilanmoqda...</span>}
                                </div>
                            </div>
                        </aside>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                            {/* Toolbar: Search & Filter & Mobile Cat Button */}
                            <div className="mb-6 sticky top-[72px] z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-2 -mx-4 px-4 border-b border-slate-200 dark:border-slate-800">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {/* Mobile Category Toggle */}
                                    <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                                        <button 
                                            onClick={() => setShowCategoryDrawer(true)}
                                            className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm whitespace-nowrap"
                                        >
                                            <Filter className="h-4 w-4" /> Kategoriyalar
                                        </button>
                                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 shrink-0"></div>
                                        {categories.slice(0, 5).map(cat => (
                                            <button key={cat.id} onClick={() => setActiveCategory(cat.name)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${activeCategory === cat.name ? 'border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`} style={getCatBtnStyle(activeCategory === cat.name)}>{cat.name}</button>
                                        ))}
                                    </div>

                                    {/* Search & Sort */}
                                    <div className="flex-1 flex gap-2 w-full">
                                        {/* Admin Add Product Button in Toolbar */}
                                        {isAdmin && currentUser?.permissions.products && (
                                            <>
                                                <button 
                                                    onClick={() => productUploadRef.current?.click()}
                                                    className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/30 hover:bg-sky-600 transition-all active:scale-95 whitespace-nowrap"
                                                >
                                                    <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Mahsulot Qo'shish</span>
                                                </button>
                                                <input 
                                                    type="file" 
                                                    ref={productUploadRef} 
                                                    className="hidden" 
                                                    accept="image/*" 
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => {
                                                                const res = ev.target?.result as string;
                                                                const base64 = res.split(',')[1];
                                                                handleHeroImageSelect(base64);
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                        if (productUploadRef.current) productUploadRef.current.value = '';
                                                    }}
                                                />
                                            </>
                                        )}

                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input 
                                                type="text" 
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Qidirish..."
                                                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            />
                                            {searchQuery && (
                                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Currency Filter */}
                                        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shrink-0">
                                            <button 
                                                onClick={() => setCurrencyFilter('all')} 
                                                className={`p-2 rounded-lg transition-colors text-xs font-bold ${currencyFilter === 'all' ? 'bg-slate-100 dark:bg-slate-800 text-primary' : 'text-slate-400'}`}
                                            >
                                                All
                                            </button>
                                            <button 
                                                onClick={() => setCurrencyFilter('UZS')} 
                                                className={`p-2 rounded-lg transition-colors text-xs font-bold ${currencyFilter === 'UZS' ? 'bg-slate-100 dark:bg-slate-800 text-primary' : 'text-slate-400'}`}
                                            >
                                                UZS
                                            </button>
                                            <button 
                                                onClick={() => setCurrencyFilter('USD')} 
                                                className={`p-2 rounded-lg transition-colors text-xs font-bold ${currencyFilter === 'USD' ? 'bg-slate-100 dark:bg-slate-800 text-primary' : 'text-slate-400'}`}
                                            >
                                                $
                                            </button>
                                        </div>

                                        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shrink-0">
                                            <button 
                                                onClick={() => setSortBy('price-asc')} 
                                                className={`p-2 rounded-lg transition-colors ${sortBy === 'price-asc' ? 'bg-slate-100 dark:bg-slate-800 text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                                title="Arzonroq"
                                            >
                                                <div className="flex items-center">
                                                    <ArrowDown className="h-4 w-4" />
                                                    <span className="text-[10px] font-bold ml-0.5 hidden sm:inline">$</span>
                                                </div>
                                            </button>
                                            <button 
                                                onClick={() => setSortBy('price-desc')} 
                                                className={`p-2 rounded-lg transition-colors ${sortBy === 'price-desc' ? 'bg-slate-100 dark:bg-slate-800 text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                                title="Qimmatroq"
                                            >
                                                <div className="flex items-center">
                                                    <ArrowUp className="h-4 w-4" />
                                                    <span className="text-[10px] font-bold ml-0.5 hidden sm:inline">$</span>
                                                </div>
                                            </button>
                                            <button 
                                                onClick={() => setSortBy(sortBy === 'liked' ? 'default' : 'liked')} 
                                                className={`p-2 rounded-lg transition-colors ${sortBy === 'liked' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                                title="Sevimlilar"
                                            >
                                                <Heart className={`h-4 w-4 ${sortBy === 'liked' ? 'fill-current' : ''}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {uploadedImage && isAdmin && currentUser?.permissions.products && (
                                <div className="mb-8 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-bold">Yangi Mahsulot</h2>
                                        <button onClick={() => setUploadedImage(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="h-5 w-5" /></button>
                                    </div>
                                    <ProductEntry image={uploadedImage} onSave={handleSaveProduct} categories={categories} />
                                </div>
                            )}

                            {filteredAndSortedServices.length === 0 ? (
                                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"><Stethoscope className="h-10 w-10 text-slate-400" /></div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Xizmatlar topilmadi</h3>
                                    <p className="text-slate-500 dark:text-slate-400 mt-2">So'rovingiz bo'yicha hech narsa topilmadi.</p>
                                    {searchQuery && <button onClick={() => setSearchQuery('')} className="mt-4 text-primary font-bold hover:underline">Qidiruvni tozalash</button>}
                                </div>
                            ) : (
                                <>
                                    <div className={gridClasses}>
                                        {currentServices.map((treatment) => (
                                            <TreatmentCard 
                                                key={treatment.id} 
                                                treatment={treatment} 
                                                onAdd={handleAddToCart} 
                                                isAdmin={isAdmin && !!currentUser?.permissions.products} 
                                                onRemove={() => handleDeleteProduct(treatment.id)} 
                                                onImageClick={handleImageView} 
                                                categories={categories} 
                                                onUpdate={handleUpdateProduct} 
                                                config={siteConfig}
                                                layout={productLayout}
                                                hoverColor={blurColor}
                                                isLiked={likedProductIds.includes(treatment.id)}
                                                onToggleLike={handleToggleProductLike}
                                            />
                                        ))}
                                    </div>
                                    
                                    <Pagination 
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={(page) => {
                                            setCurrentPage(page);
                                            document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        primaryColor={siteConfig.style?.primaryColor}
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile Category Drawer */}
                    {showCategoryDrawer && createPortal(
                        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCategoryDrawer(false)} />
                            <div className="relative w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-lg">Kategoriyalar</h3>
                                    <button onClick={() => setShowCategoryDrawer(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="h-5 w-5" /></button>
                                </div>
                                <div className="space-y-1">
                                    {renderCategoryList()}
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>
              );
          case 'diff':
              return <ImageDiffSection key={`home-${type}-${index}`} items={siteConfig.imageDiffs || []} config={siteConfig.diffSectionConfig} style={siteConfig.style} />;
          case 'faq':
              return (
                  <div key={`home-${type}-${index}`} id="about" className="scroll-mt-24">
                      <FaqSection 
                          items={siteConfig.faqItems || []} 
                          title={siteConfig.faqTitle}
                          subtitle={siteConfig.faqSubtitle}
                          config={siteConfig.faqConfig}
                          style={siteConfig.style}
                      />
                  </div>
              );
          case 'testimonials':
              return <TestimonialsSection key={`home-${type}-${index}`} items={siteConfig.testimonials || []} style={siteConfig.style} />;
          case 'table':
              return (
                  <TableSection 
                      key={`home-${type}-${index}`}
                      config={siteConfig.tableConfig}
                      style={siteConfig.style}
                      isEditing={false}
                      onUpdateConfig={() => {}} 
                  />
              );
          default:
              return null;
      }
  };

  return (
    <div 
        className={`min-h-screen transition-colors duration-300 ${!effectiveDarkModeColor ? 'bg-slate-50 dark:bg-slate-950' : ''}`}
        style={isDarkMode && effectiveDarkModeColor ? { backgroundColor: effectiveDarkModeColor } : undefined}
    >
      <div id="home" className="absolute top-0 w-full h-1" />

      <Navbar 
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)} 
        onCartClick={() => setIsCartOpen(true)}
        onAdminClick={() => setIsAdminModalOpen(true)}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        logoUrl={siteConfig.logoUrl}
        logoText={siteConfig.logoText} 
        style={siteConfig.style}
        navLinks={dynamicNavLinks}
        onNavigate={setCurrentRoute}
        activePageId={currentRoute}
      />

      <main className="pb-20">
        {isAdmin && (
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-[72px] z-40 shadow-sm transition-colors">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center gap-6 overflow-x-auto py-3 no-scrollbar">
                        {currentUser?.permissions.products && <button onClick={() => setAdminTab('products')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${adminTab === 'products' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><LayoutGrid className="h-4 w-4" /> Mahsulotlar</button>}
                        {currentUser?.permissions.chat && <button onClick={() => setAdminTab('chat')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${adminTab === 'chat' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><MessageSquare className="h-4 w-4" /> Chat & Xabarlar</button>}
                        {currentUser?.permissions.products && <button onClick={() => setAdminTab('customers')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${adminTab === 'customers' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Users className="h-4 w-4" /> Mijozlar (CRM)</button>}
                        {(currentUser?.permissions.settings || currentUser?.permissions.content || currentUser?.permissions.admins) && <button onClick={() => setAdminTab('settings')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${adminTab === 'settings' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Settings className="h-4 w-4" /> Sozlamalar</button>}
                    </div>
                </div>
            </div>
        )}

        {isAdmin && adminTab === 'chat' && currentUser?.permissions.chat ? (
            <div className="max-w-6xl mx-auto px-4 mt-8"><AdminChat /></div>
        ) : isAdmin && adminTab === 'customers' && currentUser?.permissions.products ? (
            <div className="max-w-7xl mx-auto px-4 mt-8"><AdminCustomers /></div>
        ) : isAdmin && adminTab === 'settings' && currentUser ? (
            <AdminSettings currentConfig={siteConfig} currentUser={currentUser} onPreviewDarkMode={setTempDarkModeColor} onUpdateUser={handleUpdateUser} />
        ) : currentRoute !== 'home' && activePageData ? (
            <div className="animate-fade-in">
                <DynamicPage 
                    page={activePageData}
                    style={siteConfig.style}
                    isEditing={false} 
                    onUpdatePage={() => {}} 
                />
            </div>
        ) : (
            <>
                {(siteConfig.homeSectionOrder || DEFAULT_HOME_SECTIONS).map((section, idx) => renderHomeSection(section, idx))}
            </>
        )}

      </main>

      <div id="contact"><Footer config={siteConfig.footer} logoUrl={siteConfig.logoUrl} style={siteConfig.style} /></div>
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cartItems} 
        onRemove={handleRemoveFromCart}
        onUpdateQuantity={handleUpdateQuantity}
        onClear={handleClearCart} 
        telegramConfig={siteConfig.telegram} 
      />
      <AdminLogin isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} onLogin={handleAdminLogin} />
      <ChatWidget onSecretCode={(code) => { if (code === 'admin') { setIsAdminModalOpen(true); return true; } return false; }} telegramConfig={siteConfig.telegram} style={siteConfig.style} />
      <ImageViewer isOpen={isImageViewerOpen} onClose={() => setIsImageViewerOpen(false)} images={viewImages} initialIndex={viewIndex} />
    </div>
  );
};

export default App;
