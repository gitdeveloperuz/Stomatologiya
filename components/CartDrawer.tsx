import React, { useState, useEffect } from 'react';
import { X, Trash2, CalendarCheck, ChevronLeft, User, Phone, MapPin, MessageSquare, CreditCard, Truck, Store, CheckCircle, FileSpreadsheet, Send, Loader2 } from 'lucide-react';
import { CartItem } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import * as XLSX from 'xlsx';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
// 1. Get a Token from @BotFather on Telegram
// 2. If sending to a channel, add the bot as Admin to the channel
// 3. If sending to a user, the user must /start the bot first
const TELEGRAM_BOT_TOKEN: string = '8204799466:AAHvhm6ymD9NyJ77KCCdZgt9Ba2ZJBpE94I'; 
const TELEGRAM_CHAT_ID: string = '@dfvbdfvfg'; // Your channel
// ------------------------------------------------------------------

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

type CheckoutStep = 'cart' | 'checkout' | 'success';
type DeliveryMethod = 'delivery' | 'pickup';

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, items, onRemove, onClear }) => {
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    comment: '',
    deliveryMethod: 'delivery' as DeliveryMethod
  });

  const total = items.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    if (isOpen) {
      setStep('cart');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createExcelBlob = (): { blob: Blob, fileName: string } => {
    const wb = XLSX.utils.book_new();
    const orderInfoData = [
      ["BUYURTMA MA'LUMOTLARI"],
      ["Vaqt", new Date().toLocaleString('uz-UZ')],
      ["Buyurtma ID", `ORD-${Date.now()}`],
      [""],
      ["MIJOZ"],
      ["Ism", formData.firstName],
      ["Familiya", formData.lastName],
      ["Telefon", formData.phone],
      [""],
      ["YETKAZIB BERISH VA TO'LOV"],
      ["Usul", formData.deliveryMethod === 'delivery' ? "Yetkazib berish" : "O'zi olib ketish"],
      ["Manzil", formData.deliveryMethod === 'delivery' ? formData.address : "-"],
      ["To'lov Turi", "Kuryerga naqd pul"],
      ["Izoh", formData.comment || "-"],
      [""],
      ["MOLIYA"],
      ["Jami Summa", total],
      ["Valyuta", "UZS"]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(orderInfoData);
    ws1['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Buyurtma");

    const itemsHeader = ["Xizmat Nomi", "Narxi (so'm)", "Turi", "Tavsif"];
    const itemsData = items.map(item => [
      item.name,
      item.price,
      item.recommended ? "AI Tavsiyasi" : "Standard",
      item.description
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([itemsHeader, ...itemsData]);
    ws2['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Xizmatlar");

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Buyurtma_${formData.firstName}_${formData.lastName}_${new Date().toISOString().slice(0,10)}.xlsx`;

    return { blob, fileName };
  };

  const downloadLocally = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sendToTelegram = async (blob: Blob, fileName: string) => {
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN.includes('YOUR_TELEGRAM_BOT_TOKEN')) {
      console.warn("Telegram Token not configured.");
      return false;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('chat_id', TELEGRAM_CHAT_ID);
    formDataUpload.append('document', blob, fileName);
    formDataUpload.append('caption', `🦷 *Yangi Buyurtma*\n\n👤 ${formData.firstName} ${formData.lastName}\n📞 ${formData.phone}\n💰 ${CURRENCY_FORMATTER.format(total)}`);
    formDataUpload.append('parse_mode', 'Markdown');

    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: formDataUpload
      });
      
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.description || "Telegram API Error");
      }
      return true;
    } catch (error) {
      console.error("Telegram Upload Failed:", error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { blob, fileName } = createExcelBlob();
      const telegramSuccess = await sendToTelegram(blob, fileName);

      if (!telegramSuccess) {
         downloadLocally(blob, fileName);
      }

      setStep('success');
    } catch (err) {
      console.error("Process failed", err);
      alert("Xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onClear();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={handleClose} />
      
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 pointer-events-none">
        {/* Changed width to w-full for mobile */}
        <div className="w-full sm:w-screen sm:max-w-md pointer-events-auto bg-white flex flex-col shadow-2xl h-full">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-slate-100 sm:px-6 z-10">
            <div className="flex items-center gap-2">
              {step === 'checkout' && (
                <button 
                  onClick={() => !isSubmitting && setStep('cart')}
                  className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              <h2 className="text-lg font-bold text-slate-900">
                {step === 'cart' && 'Savatcha'}
                {step === 'checkout' && 'Rasmiylashtirish'}
                {step === 'success' && 'Muvaffaqiyatli'}
              </h2>
            </div>
            <button 
              onClick={handleClose} 
              disabled={isSubmitting} 
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all active:scale-95"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-slate-50 scroll-smooth">
            <div className="p-4 sm:p-6 space-y-6">
              
              {/* STEP: CART */}
              {step === 'cart' && (
                items.length === 0 ? (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                      <CalendarCheck className="h-10 w-10 opacity-30" />
                    </div>
                    <div>
                       <p className="font-medium text-lg text-slate-900">Savatcha bo'sh</p>
                       <p className="text-sm mt-1">Xizmatlarni tanlash uchun ortga qayting.</p>
                    </div>
                    <button onClick={onClose} className="mt-4 text-primary font-medium hover:underline">
                      Xizmatlarni ko'rish
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-4 pb-20">
                    {items.map((item) => (
                      <li key={item.cartId} className="flex flex-col bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="font-semibold text-slate-900 line-clamp-2 pr-2">{item.name}</h3>
                           <span className="font-bold text-slate-900 whitespace-nowrap">{CURRENCY_FORMATTER.format(item.price)}</span>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">{item.description}</p>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto">
                          <span className={`text-xs px-2 py-1 rounded-md font-medium ${item.recommended ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {item.recommended ? 'AI Tavsiyasi' : 'Standard'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemove(item.cartId)}
                            className="text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <Trash2 className="h-4 w-4" /> O'chirish
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {/* STEP: CHECKOUT */}
              {step === 'checkout' && (
                <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6 pb-20">
                  
                  {/* Personal Info */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold pb-3 border-b border-slate-100">
                      <User className="h-5 w-5 text-primary" />
                      <h3>Shaxsiy ma'lumotlar</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Ism</label>
                          <input 
                            required
                            type="text" 
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
                            placeholder="Ism"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Familiya</label>
                          <input 
                            required
                            type="text" 
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
                            placeholder="Familiya"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Telefon</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                          <input 
                            required
                            type="tel" 
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
                            placeholder="+998 90 123 45 67"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Method */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold pb-3 border-b border-slate-100">
                      <Truck className="h-5 w-5 text-primary" />
                      <h3>Yetkazib berish</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className={`relative flex items-center p-4 rounded-xl border cursor-pointer transition-all ${formData.deliveryMethod === 'delivery' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input 
                          type="radio" 
                          name="deliveryMethod" 
                          value="delivery"
                          checked={formData.deliveryMethod === 'delivery'}
                          onChange={() => setFormData(prev => ({ ...prev, deliveryMethod: 'delivery' }))}
                          className="h-5 w-5 text-primary border-slate-300 focus:ring-primary"
                          disabled={isSubmitting}
                        />
                        <span className="ml-3 flex flex-1 items-center justify-between">
                          <span className="text-base font-medium text-slate-900">Yetkazib berish</span>
                          <Truck className="h-5 w-5 text-slate-500" />
                        </span>
                      </label>
                      
                      <label className={`relative flex items-center p-4 rounded-xl border cursor-pointer transition-all ${formData.deliveryMethod === 'pickup' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input 
                          type="radio" 
                          name="deliveryMethod" 
                          value="pickup"
                          checked={formData.deliveryMethod === 'pickup'}
                          onChange={() => setFormData(prev => ({ ...prev, deliveryMethod: 'pickup' }))}
                          className="h-5 w-5 text-primary border-slate-300 focus:ring-primary"
                          disabled={isSubmitting}
                        />
                        <span className="ml-3 flex flex-1 items-center justify-between">
                          <span className="text-base font-medium text-slate-900">O'zi olib kelish</span>
                          <Store className="h-5 w-5 text-slate-500" />
                        </span>
                      </label>
                    </div>

                    {formData.deliveryMethod === 'delivery' && (
                      <div className="space-y-1.5 animate-slide-up">
                        <label className="text-sm font-medium text-slate-700">Manzil (Adres)</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                          <input 
                            required
                            type="text" 
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
                            placeholder="Manzilingizni kiriting..."
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold pb-3 border-b border-slate-100">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <h3>Izoh</h3>
                    </div>
                    <textarea 
                      name="comment"
                      value={formData.comment}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base resize-none"
                      placeholder="Qo'shimcha izoh..."
                      disabled={isSubmitting}
                    />
                  </div>

                </form>
              )}

              {/* STEP: SUCCESS */}
              {step === 'success' && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-fade-in">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-slate-900">Qabul Qilindi!</h3>
                    <p className="text-slate-500 max-w-xs mx-auto text-base">
                      Buyurtmangiz menejerga yuborildi. Tez orada aloqaga chiqamiz.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center gap-4 text-left w-full shadow-sm">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Send className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">Telegramga Yuborildi</p>
                      <p className="text-sm text-slate-600">Buyurtma fayli tayyor.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {items.length > 0 && step !== 'success' && (
            <div className="border-t border-slate-200 bg-white p-4 sm:p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
              <div className="flex justify-between items-end mb-4">
                <p className="text-slate-500 text-sm">Jami summa:</p>
                <p className="text-2xl font-bold text-slate-900">{CURRENCY_FORMATTER.format(total)}</p>
              </div>
              
              {step === 'cart' ? (
                <button
                  onClick={() => setStep('checkout')}
                  className="w-full flex items-center justify-center rounded-xl bg-primary px-6 py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 hover:bg-sky-600 active:scale-[0.98] transition-all"
                >
                  Buyurtma berish
                </button>
              ) : (
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 hover:bg-sky-600 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" /> Yuborilmoqda...
                    </>
                  ) : (
                    'Tasdiqlash'
                  )}
                </button>
              )}
            </div>
          )}

          {step === 'success' && (
             <div className="border-t border-slate-200 p-4 sm:p-6 bg-white z-20">
                <button
                  onClick={handleClose}
                  className="w-full flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-6 py-4 text-lg font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  Yopish
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};