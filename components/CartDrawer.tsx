import React, { useState, useEffect } from 'react';
import { X, Trash2, CalendarCheck, ChevronLeft, User, Phone, MapPin, MessageSquare, CreditCard, Truck, Store, CheckCircle, Send, Loader2, Banknote, Wallet } from 'lucide-react';
import { CartItem } from '../types';
import { CURRENCY_FORMATTER } from '../constants';
import * as XLSX from 'xlsx';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
const TELEGRAM_BOT_TOKEN: string = '8204799466:AAHvhm6ymD9NyJ77KCCdZgt9Ba2ZJBpE94I'; 
const TELEGRAM_CHAT_ID: string = '@dfvbdfvfg'; 
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
type PaymentMethod = 'cash' | 'transfer';

const INITIAL_FORM_DATA = {
  firstName: '',
  lastName: '',
  phone: '',
  address: '',
  comment: '',
  deliveryMethod: 'delivery' as DeliveryMethod,
  paymentMethod: 'cash' as PaymentMethod
};

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, items, onRemove, onClear }) => {
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Strip non-digits
    const digits = rawValue.replace(/\D/g, '');
    
    // Handle the logic to keep 998 or add it
    let coreDigits = digits;
    if (coreDigits.startsWith('998')) {
        coreDigits = coreDigits.slice(3);
    }
    
    // Limit to 9 digits (Uzbekistan mobile number length without country code)
    coreDigits = coreDigits.slice(0, 9);
    
    // Reconstruct with formatting: +998 XX XXX XX XX
    let formatted = '+998';
    
    if (coreDigits.length > 0) {
        formatted += ' ' + coreDigits.slice(0, 2);
    }
    if (coreDigits.length > 2) {
        formatted += ' ' + coreDigits.slice(2, 5);
    }
    if (coreDigits.length > 5) {
        formatted += ' ' + coreDigits.slice(5, 7);
    }
    if (coreDigits.length > 7) {
        formatted += ' ' + coreDigits.slice(7, 9);
    }
    
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const createExcelBlob = (): { blob: Blob, fileName: string } => {
    const wb = XLSX.utils.book_new();
    
    // Prepare Data Values
    const deliveryText = formData.deliveryMethod === 'delivery' ? "Yetkazib berish" : "O'zi olib ketish";
    const paymentText = formData.paymentMethod === 'cash' ? "Kuryerga naqd pul bilan" : "Onlayn-o'tkazma bilan";
    const addressText = formData.deliveryMethod === 'delivery' ? formData.address : "-";
    const dateText = new Date().toLocaleString('uz-UZ');
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;

    // Invoice-style Layout
    const wsData = [
      ["STOMATOLOGIYA.UZ - BUYURTMA WARAQASI"],
      [""],
      ["BUYURTMA MA'LUMOTLARI"],
      ["Raqam:", orderId],
      ["Sana:", dateText],
      ["Holati:", "Yangi"],
      [""],
      ["MIJOZ"],
      ["Ism:", formData.firstName],
      ["Familiya:", formData.lastName],
      ["Telefon:", formData.phone],
      [""],
      ["YETKAZIB BERISH VA TO'LOV"],
      ["Yetkazib berish:", deliveryText],
      ["Manzil:", addressText],
      ["To'lov turi:", paymentText],
      ["Izoh:", formData.comment || "Yo'q"],
      [""],
      ["TANLANGAN XIZMATLAR VA MAHSULOTLAR"],
      ["№", "Nomi", "Turi", "Soni", "Narxi (dona)", "Jami (UZS)"], // Table Headers
    ];

    // Add Items
    items.forEach((item, index) => {
      wsData.push([
        (index + 1).toString(),
        item.name,
        item.recommended ? "AI Tavsiya" : "Standard",
        item.quantity.toString(),
        item.price.toString(),
        (item.price * item.quantity).toString()
      ]);
    });

    // Add Footer / Total
    wsData.push([""]);
    wsData.push(["", "", "", "", "JAMI SUMMA:", total.toString()]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column Widths
    ws['!cols'] = [
      { wch: 5 },  // No
      { wch: 40 }, // Name
      { wch: 15 }, // Type
      { wch: 10 }, // Quantity
      { wch: 15 }, // Price
      { wch: 20 }  // Total
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Buyurtma");

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Buyurtma_${formData.firstName}_${formData.lastName}.xlsx`;

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
      return false;
    }

    const deliveryText = formData.deliveryMethod === 'delivery' ? "Yetkazib berish" : "O'zi olib ketish";
    const paymentText = formData.paymentMethod === 'cash' ? "Kuryerga naqd pul" : "Onlayn o'tkazma";

    const formDataUpload = new FormData();
    formDataUpload.append('chat_id', TELEGRAM_CHAT_ID);
    formDataUpload.append('document', blob, fileName);
    formDataUpload.append('caption', `🦷 *Yangi Buyurtma*\n\n👤 ${formData.firstName} ${formData.lastName}\n📞 ${formData.phone}\n\n🚚 *${deliveryText}*\n💳 *${paymentText}*\n\n💰 Jami: ${CURRENCY_FORMATTER.format(total)}\n${formData.deliveryMethod === 'delivery' ? `📍 ${formData.address}` : ''}`);
    formDataUpload.append('parse_mode', 'Markdown');

    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: formDataUpload
      });
      
      const result = await response.json();
      return result.ok;
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
      setFormData(INITIAL_FORM_DATA);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={handleClose} />
      
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 pointer-events-none">
        <div className="w-full sm:w-screen sm:max-w-md pointer-events-auto bg-white flex flex-col shadow-2xl h-full sm:rounded-l-[2rem]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-100/50 z-10 sm:rounded-tl-[2rem]">
            <div className="flex items-center gap-2">
              {step === 'checkout' && (
                <button 
                  onClick={() => !isSubmitting && setStep('cart')}
                  className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-colors active:scale-95"
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                {step === 'cart' && 'Savatcha'}
                {step === 'checkout' && 'Rasmiylashtirish'}
                {step === 'success' && 'Muvaffaqiyatli'}
              </h2>
            </div>
            <button 
              onClick={handleClose} 
              disabled={isSubmitting} 
              className="p-2 -mr-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
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
                  <div className="h-[60vh] flex flex-col items-center justify-center text-center text-slate-500 space-y-4 p-8">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg shadow-slate-200/50 mb-2">
                      <CalendarCheck className="h-10 w-10 text-primary/50" />
                    </div>
                    <div>
                       <p className="font-bold text-xl text-slate-900">Savatcha bo'sh</p>
                       <p className="text-sm mt-2 text-slate-400 max-w-[200px] mx-auto">Siz hali hech qanday xizmat tanlamadingiz.</p>
                    </div>
                    <button onClick={onClose} className="mt-4 px-6 py-3 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary hover:text-white transition-all">
                      Xizmatlarni tanlash
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-4 pb-20">
                    {items.map((item) => (
                      <li key={item.cartId} className="flex flex-col bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="font-bold text-slate-900 line-clamp-2 pr-2 leading-snug">
                             {item.name} 
                             <span className="ml-2 inline-flex items-center justify-center bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                               x{item.quantity}
                             </span>
                           </h3>
                           <div className="text-right">
                             <span className="font-bold text-primary whitespace-nowrap block">
                               {CURRENCY_FORMATTER.format(item.price * item.quantity)}
                             </span>
                             {item.quantity > 1 && (
                               <span className="text-[10px] text-slate-400">
                                 {CURRENCY_FORMATTER.format(item.price)} dan
                               </span>
                             )}
                           </div>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3 leading-relaxed">{item.description}</p>
                        <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-auto">
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md tracking-wide ${item.recommended ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {item.recommended ? 'AI Tavsiyasi' : 'Standard'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemove(item.cartId)}
                            className="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> O'chirish
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
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-800 font-bold pb-3 border-b border-slate-50">
                      <div className="bg-primary/10 p-1.5 rounded-lg">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <h3>Shaxsiy ma'lumotlar</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ism</label>
                          <input 
                            required
                            type="text" 
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all text-base font-medium"
                            placeholder="Ism"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Familiya</label>
                          <input 
                            required
                            type="text" 
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all text-base font-medium"
                            placeholder="Familiya"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Telefon</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                          <input 
                            required
                            type="tel" 
                            name="phone"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            maxLength={17}
                            minLength={17}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all text-base font-medium placeholder-slate-400"
                            placeholder="+998 90 123 45 67"
                            disabled={isSubmitting}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 pl-1">Format: +998 XX XXX XX XX</p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Method */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-800 font-bold pb-3 border-b border-slate-50">
                       <div className="bg-primary/10 p-1.5 rounded-lg">
                        <Truck className="h-4 w-4 text-primary" />
                      </div>
                      <h3>Yetkazib berish</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.deliveryMethod === 'delivery' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}>
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
                          <span className="text-base font-bold text-slate-800">Yetkazib berish</span>
                          <Truck className="h-5 w-5 text-slate-400" />
                        </span>
                      </label>
                      
                      <label className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.deliveryMethod === 'pickup' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}>
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
                          <span className="text-base font-bold text-slate-800">O'zi olib kelish</span>
                          <Store className="h-5 w-5 text-slate-400" />
                        </span>
                      </label>
                    </div>

                    {formData.deliveryMethod === 'delivery' && (
                      <div className="space-y-1.5 animate-slide-up">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Manzil</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                          <input 
                            required
                            type="text" 
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all text-base font-medium"
                            placeholder="Toshkent, Yunusobod"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Method - Updated with requested options */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-800 font-bold pb-3 border-b border-slate-50">
                       <div className="bg-primary/10 p-1.5 rounded-lg">
                        <CreditCard className="h-4 w-4 text-primary" />
                      </div>
                      <h3>To'lov usuli</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}>
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="cash"
                          checked={formData.paymentMethod === 'cash'}
                          onChange={() => setFormData(prev => ({ ...prev, paymentMethod: 'cash' }))}
                          className="h-5 w-5 text-primary border-slate-300 focus:ring-primary"
                          disabled={isSubmitting}
                        />
                        <span className="ml-3 flex flex-1 items-center justify-between">
                          <span className="text-base font-bold text-slate-800">Kuryerga naqd pul bilan</span>
                          <div className="bg-emerald-100 p-2 rounded-lg">
                             <Banknote className="h-5 w-5 text-emerald-600" /> 
                          </div>
                        </span>
                      </label>
                      
                      <label className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'transfer' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}>
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="transfer"
                          checked={formData.paymentMethod === 'transfer'}
                          onChange={() => setFormData(prev => ({ ...prev, paymentMethod: 'transfer' }))}
                          className="h-5 w-5 text-primary border-slate-300 focus:ring-primary"
                          disabled={isSubmitting}
                        />
                        <span className="ml-3 flex flex-1 items-center justify-between">
                          <span className="text-base font-bold text-slate-800">Onlayn-o'tkazma bilan</span>
                          <div className="bg-blue-100 p-2 rounded-lg">
                             <Wallet className="h-5 w-5 text-blue-600" />
                          </div>
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-800 font-bold pb-3 border-b border-slate-50">
                       <div className="bg-primary/10 p-1.5 rounded-lg">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <h3>Izoh</h3>
                    </div>
                    <textarea 
                      name="comment"
                      value={formData.comment}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all text-base font-medium resize-none"
                      placeholder="Qo'shimcha izoh..."
                      disabled={isSubmitting}
                    />
                  </div>

                </form>
              )}

              {/* STEP: SUCCESS */}
              {step === 'success' && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-fade-in p-4">
                  <div className="w-28 h-28 bg-emerald-50 rounded-full flex items-center justify-center animate-bounce shadow-xl shadow-emerald-100">
                    <CheckCircle className="h-14 w-14 text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-extrabold text-slate-900">Qabul Qilindi!</h3>
                    <p className="text-slate-500 max-w-xs mx-auto text-base leading-relaxed">
                      Buyurtmangiz menejerga yuborildi. Tez orada siz bilan bog'lanamiz.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center gap-4 text-left w-full shadow-sm">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Send className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">Telegramga Yuborildi</p>
                      <p className="text-sm text-slate-600">Buyurtma fayli tayyorlandi.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {items.length > 0 && step !== 'success' && (
            <div className="border-t border-slate-200 bg-white p-6 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-20">
              <div className="flex justify-between items-end mb-4">
                <p className="text-slate-400 font-medium text-sm uppercase tracking-wide">Jami summa:</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{CURRENCY_FORMATTER.format(total)}</p>
              </div>
              
              {step === 'cart' ? (
                <button
                  onClick={() => setStep('checkout')}
                  className="w-full flex items-center justify-center rounded-xl bg-slate-900 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-slate-900/30 hover:bg-slate-800 active:scale-[0.98] transition-all"
                >
                  Buyurtma berish
                </button>
              ) : (
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 hover:bg-sky-500 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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
             <div className="border-t border-slate-200 p-6 bg-white z-20">
                <button
                  onClick={handleClose}
                  className="w-full flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-6 py-4 text-lg font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
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