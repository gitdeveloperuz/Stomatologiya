
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, ShieldCheck } from 'lucide-react';
import { ChatMessage } from '../types';
import { sendMessage, subscribeToChatMessages, isCloudConfigured } from '../services/db';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_ID } from '../constants';

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Session
  useEffect(() => {
    let storedId = localStorage.getItem('stomatologiya_chat_id');
    if (!storedId) {
      storedId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      localStorage.setItem('stomatologiya_chat_id', storedId);
    }
    setSessionId(storedId);
  }, []);

  // Subscribe to messages
  useEffect(() => {
    if (!sessionId || !isOpen || !isCloudConfigured) return;

    const unsubscribe = subscribeToChatMessages(sessionId, (msgs) => {
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [sessionId, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const notifyAdminOnTelegram = async (text: string) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_ID) return;
    
    try {
        const msg = `📨 *Yangi Xabar*\n\n👤 ID: \`${sessionId}\`\n💬 ${text}\n\n⚠️ Javob berish uchun Admin Panelga kiring.`;
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_ADMIN_ID,
                text: msg,
                parse_mode: 'Markdown'
            })
        });
    } catch (e) {
        console.error("Failed to notify admin via telegram", e);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !sessionId) return;

    const text = inputText.trim();
    setInputText('');
    
    // Optimistic UI update (optional, but subscription handles it fast)
    
    // 1. Send to Firebase
    await sendMessage(sessionId, text, 'user');
    
    // 2. Notify Telegram
    notifyAdminOnTelegram(text);
  };

  if (!isCloudConfigured) return null; // Don't show chat if no DB

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end pointer-events-none">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto w-full max-w-[350px] sm:w-[350px] bg-white rounded-2xl shadow-2xl border border-slate-100 mb-4 overflow-hidden animate-slide-up origin-bottom-right">
          {/* Header */}
          <div className="bg-primary p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Online Yordam</h3>
                <p className="text-xs text-sky-100">Administrator bilan aloqa</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="h-[350px] overflow-y-auto p-4 bg-slate-50 space-y-3">
            {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm mt-10">
                    <p>Savolingizni yozib qoldiring.</p>
                    <p className="text-xs mt-2">Tez orada javob beramiz.</p>
                </div>
            )}
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.sender === 'user' 
                    ? 'bg-primary text-white rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                }`}>
                    {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Xabar yozing..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <button 
                type="submit"
                disabled={!inputText.trim()}
                className="bg-primary text-white p-2.5 rounded-xl hover:bg-sky-600 disabled:opacity-50 transition-colors"
            >
                <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto h-14 w-14 bg-primary hover:bg-sky-600 text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
};
