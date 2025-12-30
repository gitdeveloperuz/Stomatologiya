
import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Send, MessageSquare, Trash2 } from 'lucide-react';
import { ChatSession, ChatMessage } from '../types';
import { subscribeToAllSessions, subscribeToChatMessages, sendMessage, markSessionRead, deleteMessage, deleteChatSession } from '../services/db';
import { ConfirmModal } from './ConfirmModal';

export const AdminChat: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Modal State
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'message' | 'session', id?: string } | null>(null);

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

  const handleDeleteMessage = (msgId: string) => {
     if (!selectedSessionId) return;
     setDeleteTarget({ type: 'message', id: msgId });
  };

  const handleDeleteSession = () => {
      if (!selectedSessionId) return;
      setDeleteTarget({ type: 'session' });
  };

  const confirmDelete = async () => {
    if (!selectedSessionId || !deleteTarget) return;

    if (deleteTarget.type === 'message' && deleteTarget.id) {
        await deleteMessage(selectedSessionId, deleteTarget.id);
    } else if (deleteTarget.type === 'session') {
        await deleteChatSession(selectedSessionId);
        setSelectedSessionId(null);
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row h-[600px] animate-fade-in relative z-0 transition-colors duration-300">
        
        {/* Sidebar List */}
        <div className={`w-full md:w-80 border-r border-slate-100 dark:border-slate-800 flex flex-col ${selectedSessionId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
              <h2 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Mijozlar Xabarlari
              </h2>
              <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input 
                      type="text" 
                      placeholder="Qidirish..."
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
              </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
              {sessions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                      Xabarlar yo'q
                  </div>
              ) : (
                  sessions.map(session => (
                      <div 
                          key={session.id}
                          onClick={() => setSelectedSessionId(session.id)}
                          className={`p-4 border-b border-slate-50 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedSessionId === session.id ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' : ''}`}
                      >
                          <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate pr-2">
                                  {session.userName || `Mijoz (${session.id.slice(-4)})`}
                              </span>
                              {session.unreadCount > 0 && (
                                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                      {session.unreadCount}
                                  </span>
                              )}
                          </div>
                          <p className={`text-xs truncate ${session.unreadCount > 0 ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
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
        <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 ${!selectedSessionId ? 'hidden md:flex' : 'flex'}`}>
          {!selectedSessionId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                  <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                  <p>Chatni tanlang</p>
              </div>
          ) : (
              <>
                  {/* Header */}
                  <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <button onClick={() => setSelectedSessionId(null)} className="md:hidden text-slate-500">
                              Back
                          </button>
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 dark:text-white">Mijoz suhbati</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">ID: {selectedSessionId}</p>
                          </div>
                      </div>
                      <button 
                          onClick={handleDeleteSession}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                          title="Chatni butunlay o'chirish"
                      >
                          <Trash2 className="h-5 w-5" />
                      </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4">
                      {messages.map(msg => (
                          <div key={msg.id} className={`group flex items-end gap-2 mb-4 ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                              
                              {/* Delete Button for Admin Messages (Left Side) */}
                              {msg.sender === 'admin' && (
                                  <button 
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                      title="O'chirish"
                                      type="button"
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </button>
                              )}

                              <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${
                                  msg.sender === 'admin' 
                                  ? 'bg-slate-800 dark:bg-slate-700 text-white rounded-br-none' 
                                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                              }`}>
                                  {msg.text}
                              </div>

                              {/* Delete Button for User Messages (Right Side) */}
                              {msg.sender === 'user' && (
                                  <button 
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                      title="O'chirish"
                                      type="button"
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </button>
                              )}
                          </div>
                      ))}
                      <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form onSubmit={handleReply} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                      <input 
                          type="text" 
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Javob yozing..."
                          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
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

      {/* Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={deleteTarget?.type === 'session' ? "Suhbatni o'chirish" : "Xabarni o'chirish"}
        message={deleteTarget?.type === 'session' 
            ? "Siz rostdan ham ushbu suhbat tarixini butunlay o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi." 
            : "Siz rostdan ham ushbu xabarni o'chirmoqchimisiz?"
        }
      />
    </>
  );
};
