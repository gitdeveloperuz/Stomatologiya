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
    // 1. Create a new workbook
    const wb = XLSX.utils.book_new();

    // 2. Sheet 1: Order Info
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

    // 3. Sheet 2: Services
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

    // 4. Generate Blob
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
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
      console.warn("Telegram Token not configured. Skipping upload.");
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
        console.error("Telegram API Response Error:", result);
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
      // 1. Create Excel File
      const { blob, fileName } = createExcelBlob();

      // 2. Send to Telegram
      const telegramSuccess = await sendToTelegram(blob, fileName);

      // 3. Fallback: Download locally if Telegram fails or just to be safe
      if (!telegramSuccess) {
         console.log("Telegram upload failed, falling back to local download");
         downloadLocally(blob, fileName);
         alert("Telegramga yuborishda xatolik bo'ldi, lekin fayl qurilmangizga yuklandi.");
      }

      setStep('success');
    } catch (err) {
      console.error("Process failed", err);
      alert("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 pointer-events-none">
        <div className="w-screen max-w-md pointer-events-auto bg-white flex flex-col shadow-xl">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-6 bg-slate-50 border-b border-slate-100 sm:px-6">
            <div className="flex items-center gap-2">
              {step === 'checkout' && (
                <button 
                  onClick={() => !isSubmitting && setStep('cart')}
                  className="p-1 -ml-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors"
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              <h2 className="text-lg font-medium text-slate-900">
                {step === 'cart' && 'Sizning Savatchangiz'}
                {step === 'checkout' && 'Buyurtmani Rasmiylashtirish'}
                {step === 'success' && 'Muvaffaqiyatli'}
              </h2>
            </div>
            <button onClick={handleClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-500 disabled:opacity-50">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
            
            {/* STEP: CART */}
            {step === 'cart' && (
              items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
                  <CalendarCheck className="h-12 w-12 opacity-20" />
                  <p>Savatcha bo'sh. Xizmatlarni tanlang.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li key={item.cartId} className="flex py-4 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                      <div className="flex flex-1 flex-col">
                        <div>
                          <div className="flex justify-between text-base font-medium text-slate-900">
                            <h3>{item.name}</h3>
                            <p className="ml-4">{CURRENCY_FORMATTER.format(item.price)}</p>
                          </div>
                          <p className="mt-1 text-sm text-slate-500 line-clamp-2">{item.description}</p>
                        </div>
                        <div className="flex flex-1 items-end justify-between text-sm">
                          <p className="text-primary font-medium">{item.recommended ? 'AI Tavsiyasi' : 'Standard'}</p>
                          <button
                            type="button"
                            onClick={() => onRemove(item.cartId)}
                            className="font-medium text-red-500 hover:text-red-600 flex items-center gap-1"
                          >
                            <Trash2 className="h-4 w-4" /> O'chirish
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}

            {/* STEP: CHECKOUT */}
            {step === 'checkout' && (
              <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Personal Info */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-medium pb-2 border-b border-slate-50">
                    <User className="h-4 w-4 text-primary" />
                    <h3>Shaxsiy ma'lumotlar</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Ism</label>
                      <input 
                        required
                        type="text" 
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                        placeholder="Ismingiz"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Familiya</label>
                      <input 
                        required
                        type="text" 
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                        placeholder="Familiyangiz"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Telefon</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        required
                        type="tel" 
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                        placeholder="+998 90 123 45 67"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Method */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-medium pb-2 border-b border-slate-50">
                    <Truck className="h-4 w-4 text-primary" />
                    <h3>Yetkazib berish usuli</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={`relative flex items-center p-3 rounded-lg border cursor-pointer transition-all ${formData.deliveryMethod === 'delivery' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input 
                        type="radio" 
                        name="deliveryMethod" 
                        value="delivery"
                        checked={formData.deliveryMethod === 'delivery'}
                        onChange={() => setFormData(prev => ({ ...prev, deliveryMethod: 'delivery' }))}
                        className="h-4 w-4 text-primary border-slate-300 focus:ring-primary"
                        disabled={isSubmitting}
                      />
                      <span className="ml-3 flex flex-1 items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">Yetkazib berish</span>
                        <Truck className="h-4 w-4 text-slate-400" />
                      </span>
                    </label>
                    
                    <label className={`relative flex items-center p-3 rounded-lg border cursor-pointer transition-all ${formData.deliveryMethod === 'pickup' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input 
                        type="radio" 
                        name="deliveryMethod" 
                        value="pickup"
                        checked={formData.deliveryMethod === 'pickup'}
                        onChange={() => setFormData(prev => ({ ...prev, deliveryMethod: 'pickup' }))}
                        className="h-4 w-4 text-primary border-slate-300 focus:ring-primary"
                        disabled={isSubmitting}
                      />
                      <span className="ml-3 flex flex-1 items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">O'zi olib kelish</span>
                        <Store className="h-4 w-4 text-slate-400" />
                      </span>
                    </label>
                  </div>

                  {formData.deliveryMethod === 'delivery' && (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-xs font-medium text-slate-500">Manzil (Adres)</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input 
                          required
                          type="text" 
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                          placeholder="Toshkent sh., Chilonzor tumani..."
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
                   <div className="flex items-center gap-2 text-slate-800 font-medium pb-2 border-b border-slate-50">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <h3>To'lov usuli</h3>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">Kuryerga naqd pul bilan</span>
                  </div>
                </div>

                {/* Comments */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-medium pb-2 border-b border-slate-50">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h3>Kommentariya (Izoh)</h3>
                  </div>
                  <textarea 
                    name="comment"
                    value={formData.comment}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
                    placeholder="Qo'shimcha izoh qoldiring..."
                    disabled={isSubmitting}
                  />
                </div>

              </form>
            )}

            {/* STEP: SUCCESS */}
            {step === 'success' && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce-short">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">Buyurtma Qabul Qilindi!</h3>
                  <p className="text-slate-500 max-w-xs mx-auto text-sm">
                    Buyurtmangiz muvaffaqiyatli rasmiylashtirildi va Telegram orqali yuborildi.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3 text-left w-full">
                  <Send className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Telegramga Yuborildi</p>
                    <p className="text-xs text-slate-500">Menejer tez orada aloqaga chiqadi.</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm w-full max-w-sm text-left">
                   <h4 className="font-semibold text-slate-900 mb-2 border-b pb-2">Buyurtma ma'lumotlari:</h4>
                   <div className="space-y-1 text-sm text-slate-600">
                      <p><span className="text-slate-400">Mijoz:</span> {formData.firstName} {formData.lastName}</p>
                      <p><span className="text-slate-400">Yetkazib berish:</span> {formData.deliveryMethod === 'delivery' ? 'Kuryer orqali' : "O'zi olib ketish"}</p>
                      <p><span className="text-slate-400">To'lov:</span> Naqd pul</p>
                      <p className="font-bold text-primary mt-2">Jami: {CURRENCY_FORMATTER.format(total)}</p>
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && step !== 'success' && (
            <div className="border-t border-slate-200 px-4 py-6 sm:px-6 bg-slate-50">
              <div className="flex justify-between text-base font-medium text-slate-900 mb-4">
                <p>Jami</p>
                <p>{CURRENCY_FORMATTER.format(total)}</p>
              </div>
              
              {step === 'cart' ? (
                <>
                  <p className="mt-0.5 text-sm text-slate-500 mb-6">
                    Narxlar taxminiy bo'lib, klinikada o'zgarishi mumkin.
                  </p>
                  <button
                    onClick={() => setStep('checkout')}
                    className="w-full flex items-center justify-center rounded-xl border border-transparent bg-primary px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-sky-600 transition-colors"
                  >
                    Buyurtma berish (Band qilish)
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-transparent bg-primary px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-sky-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Yuborilmoqda...
                    </>
                  ) : (
                    'Buyurtmani Tasdiqlash'
                  )}
                </button>
              )}
            </div>
          )}

          {step === 'success' && (
             <div className="border-t border-slate-200 px-4 py-6 sm:px-6 bg-slate-50">
                <button
                  onClick={handleClose}
                  className="w-full flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
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