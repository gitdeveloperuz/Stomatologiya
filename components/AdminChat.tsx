
import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Circle, Send, MessageSquare } from 'lucide-react';
import { ChatSession, ChatMessage } from '../types';
import { subscribeToAllSessions, subscribeToChatMessages, sendMessage, markSessionRead } from '../services/db';

export const AdminChat: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Session List
  useEffect(() => {
    const unsubscribe = subscribeToAllSessions((data) => {
        setSessions(data);
    });
    return () => unsubscribe();
  }, []);

  // Load Messages when session selected
  useEffect(() => {
    if (!selectedSessionId) return;
    
    // Mark as read immediately
    markSessionRead(selectedSessionId);

    const unsubscribe = subscribeToChatMessages(selectedSessionId, (msgs) => {
        setMessages(msgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [selectedSessionId]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !replyText.trim()) return;

    await sendMessage(selectedSessionId, replyText.trim(), 'admin');
    setReplyText('');
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[600px] animate-fade-in">
      
      {/* Sidebar List */}
      <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col ${selectedSessionId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Mijozlar Xabarlari
            </h2>
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Qidirish..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>
        </div>
        <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                    Xabarlar yo'q
                </div>
            ) : (
                sessions.map(session => (
                    <div 
                        key={session.id}
                        onClick={() => setSelectedSessionId(session.id)}
                        className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${selectedSessionId === session.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-slate-800 text-sm truncate pr-2">
                                {session.userName || `Mijoz (${session.id.slice(-4)})`}
                            </span>
                            {session.unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {session.unreadCount}
                                </span>
                            )}
                        </div>
                        <p className={`text-xs truncate ${session.unreadCount > 0 ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                            {session.lastMessage}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 text-right">
                            {new Date(session.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-slate-50 ${!selectedSessionId ? 'hidden md:flex' : 'flex'}`}>
        {!selectedSessionId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                <p>Chatni tanlang</p>
            </div>
        ) : (
            <>
                {/* Header */}
                <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3">
                    <button onClick={() => setSelectedSessionId(null)} className="md:hidden text-slate-500">
                        Back
                    </button>
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Mijoz suhbati</h3>
                        <p className="text-xs text-slate-500">ID: {selectedSessionId}</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${
                                msg.sender === 'admin' 
                                ? 'bg-slate-800 text-white rounded-br-none' 
                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleReply} className="p-4 bg-white border-t border-slate-200 flex gap-2">
                    <input 
                        type="text" 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Javob yozing..."
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button 
                        type="submit"
                        disabled={!replyText.trim()}
                        className="bg-primary hover:bg-sky-600 text-white px-6 rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </form>
            </>
        )}
      </div>
    </div>
  );
};
