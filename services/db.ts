
import { Treatment, Category, SiteConfig, Advertisement, AdminUser, ChatMessage, ChatSession, CartItem, Announcement, TelegramUser, AnnouncementMedia, Order, ProductCondition, RateLimitState, BotConfig, TelegramMenuCommand, TelegramProfileConfig } from '../types';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_ID } from '../constants';

// --- DB CONFIG ---
export const isCloudConfigured = false;
const DB_NAME = 'stomatologiya_db';
const DB_VERSION = 7;

// --- RATE LIMIT CONFIG ---
const MAX_DAILY_MESSAGES = 20;
const FLOOD_INTERVAL_MS = 2000; // 2 seconds between messages
const SPAM_BLOCK_DURATION = 60 * 60 * 1000; // 1 hour block for spamming

// --- IDB HELPERS ---
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = (event.target as IDBOpenDBRequest).transaction; 
        if (!tx) return;
        const stores = ['treatments', 'categories', 'site_config', 'ads', 'admins', 'announcements', 'tg_users', 'bot_states', 'sessions', 'chat_messages'];
        stores.forEach(store => {
          let os: IDBObjectStore;
          if (!db.objectStoreNames.contains(store)) {
             const keyPath = store === 'bot_states' ? 'chatId' : 'id';
             os = db.createObjectStore(store, { keyPath });
          } else { os = tx.objectStore(store); }
          if (store === 'chat_messages' && !os.indexNames.contains('sessionId')) {
             os.createIndex('sessionId', 'sessionId', { unique: false });
          }
        });
      };
    });
  }
  return dbPromise;
}

export async function initDB() { await getDB(); }

// --- GENERIC CRUD ---
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function get<T>(storeName: string, key: string | number): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put(storeName: string, value: any) {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function remove(storeName: string, key: string) {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- SUBSCRIPTION SYSTEM ---
const listeners: Record<string, Function[]> = {};
function notify(key: string, data: any) { if (listeners[key]) listeners[key].forEach(cb => cb(data)); }
function subscribe(key: string, callback: Function) {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(callback);
    if (key === 'treatments') getAll('treatments').then(data => callback(data));
    if (key === 'categories') getAll('categories').then(data => callback(data));
    if (key === 'site_config') get('site_config', 'hero_config').then(data => callback(data));
    if (key === 'ads') getAll('ads').then(data => callback(data));
    if (key === 'announcements') getAll('announcements').then(data => callback(data));
    if (key === 'sessions') getAll('sessions').then(data => callback(data));
    if (key === 'tg_users') getAll('tg_users').then(data => callback(data));
    return () => { listeners[key] = listeners[key].filter(cb => cb !== callback); };
}

// --- EXPORTS FOR APP ---
export const subscribeToTreatments = (cb: (data: Treatment[]) => void, errCb?: (err: any) => void) => subscribe('treatments', cb);
export const saveTreatment = async (item: Treatment) => { await put('treatments', item); notify('treatments', await getAll('treatments')); };
export const deleteTreatment = async (id: string) => { await remove('treatments', id); notify('treatments', await getAll('treatments')); };
export const subscribeToCategories = (cb: (data: Category[]) => void) => subscribe('categories', cb);
export const saveCategory = async (item: Category) => { await put('categories', item); notify('categories', await getAll('categories')); };
export const deleteCategory = async (id: string) => { await remove('categories', id); notify('categories', await getAll('categories')); };
export const subscribeToSiteConfig = (cb: (data: SiteConfig) => void) => subscribe('site_config', cb);
export const saveSiteConfig = async (config: SiteConfig) => { await put('site_config', config); notify('site_config', config); };
export const subscribeToAds = (cb: (data: Advertisement[]) => void) => subscribe('ads', cb);
export const saveAd = async (item: Advertisement) => { await put('ads', item); notify('ads', await getAll('ads')); };
export const deleteAd = async (id: string) => { await remove('ads', id); notify('ads', await getAll('ads')); };
export const subscribeToAnnouncements = (cb: (data: Announcement[]) => void) => subscribe('announcements', cb);
export const saveAnnouncement = async (item: Announcement) => { await put('announcements', item); notify('announcements', await getAll('announcements')); };
export const deleteAnnouncement = async (id: string) => { await remove('announcements', id); notify('announcements', await getAll('announcements')); };

// --- USER MANAGEMENT EXPORTS ---
export const subscribeToTelegramUsers = (cb: (data: TelegramUser[]) => void) => subscribe('tg_users', cb);
export const updateTelegramUser = async (user: TelegramUser) => { await put('tg_users', user); notify('tg_users', await getAll('tg_users')); };
export const deleteTelegramUser = async (id: string) => { await remove('tg_users', id); notify('tg_users', await getAll('tg_users')); };

export const authenticateAdmin = async (email: string, pass: string): Promise<AdminUser | null> => {
    const admins = await getAll<AdminUser>('admins');
    if (admins.length === 0 && email === 'admin@admin' && pass === 'admin') {
         return { id: 'default', email, password: pass, name: 'Admin', role: 'super_admin', isTwoFactorEnabled: false, permissions: { products: true, content: true, chat: true, settings: true, admins: true } };
    }
    const found = admins.find(a => a.email === email && a.password === pass);
    return found || null;
};
export const getAllAdmins = async () => getAll<AdminUser>('admins');
export const saveAdmin = async (user: AdminUser) => { await put('admins', user); };

export const subscribeToAllSessions = (cb: (data: ChatSession[]) => void) => subscribe('sessions', cb);
export const subscribeToSession = (sessionId: string, cb: (data: ChatSession | undefined) => void) => {
    const check = async () => cb(await get<ChatSession>('sessions', sessionId));
    check();
    if (!listeners['session_update']) listeners['session_update'] = [];
    listeners['session_update'].push(check);
    return () => { if (listeners['session_update']) listeners['session_update'] = listeners['session_update'].filter(c => c !== check); };
};
export const subscribeToChatMessages = (sessionId: string, cb: (data: ChatMessage[]) => void) => {
    const load = async () => {
        const db = await getDB();
        const tx = db.transaction('chat_messages', 'readonly');
        const index = tx.objectStore('chat_messages').index('sessionId');
        const req = index.getAll(sessionId);
        req.onsuccess = () => cb(req.result);
    };
    load();
    if (!listeners['messages_update']) listeners['messages_update'] = [];
    listeners['messages_update'].push(load);
    return () => { if (listeners['messages_update']) listeners['messages_update'] = listeners['messages_update'].filter(l => l !== load); };
};

// Helper to get messages directly (for Bot)
async function getMessagesBySessionId(sessionId: string): Promise<ChatMessage[]> {
    const db = await getDB();
    return new Promise((resolve) => {
        const tx = db.transaction('chat_messages', 'readonly');
        const index = tx.objectStore('chat_messages').index('sessionId');
        const req = index.getAll(sessionId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
    });
}

// --- RATE LIMIT HELPER ---
const checkRateLimit = (currentText: string, rateLimitState: RateLimitState | undefined): { allowed: boolean, reason?: string, newState?: RateLimitState, blockUntil?: number } => {
    const now = Date.now();
    const state = rateLimitState || { dailyCount: 0, lastResetTime: now, lastMessageTime: 0, lastMessageText: '', spamScore: 0 };
    
    // 1. Reset Daily Quota if needed
    if (now - state.lastResetTime > 24 * 60 * 60 * 1000) {
        state.dailyCount = 0;
        state.lastResetTime = now;
        state.spamScore = 0; // Reset spam score daily too
    }

    // 2. Check Flood (Rapid Fire)
    if (now - state.lastMessageTime < FLOOD_INTERVAL_MS) {
        // Too fast
        state.spamScore += 1;
        if (state.spamScore >= 3) {
             // Block for 1 hour
             return { allowed: false, reason: 'SPAM_FLOOD', blockUntil: now + SPAM_BLOCK_DURATION };
        }
        return { allowed: false, reason: 'TOO_FAST' };
    }

    // 3. Check Repetition
    if (currentText === state.lastMessageText && currentText.length > 0) {
        state.spamScore += 1;
        if (state.spamScore >= 3) {
            return { allowed: false, reason: 'SPAM_REPEAT', blockUntil: now + SPAM_BLOCK_DURATION };
        }
    } else {
        // Decrease spam score on good behavior, but min 0
        state.spamScore = Math.max(0, state.spamScore - 1);
    }

    // 4. Check Daily Limit
    if (state.dailyCount >= MAX_DAILY_MESSAGES) {
        return { allowed: false, reason: 'DAILY_LIMIT' };
    }

    // 5. Update State
    state.dailyCount += 1;
    state.lastMessageTime = now;
    state.lastMessageText = currentText;

    return { allowed: true, newState: state };
};

export const sendMessage = async (
    sessionId: string, 
    text: string, 
    sender: 'user' | 'admin', 
    telegramMessageId?: number, 
    mediaUrl?: string, 
    mediaType?: ChatMessage['mediaType'],
    userName?: string // New optional param to set session name
) => {
    // 1. Check for Block Status First
    let session = await get<ChatSession>('sessions', sessionId);
    
    // Auto-create session if missing (e.g., direct message)
    if (!session) { 
        session = { 
            id: sessionId, 
            lastMessage: text || (mediaType ? `[${mediaType}]` : 'Media'), 
            lastMessageTime: Date.now(), 
            unreadCount: 0, 
            blocked: false,
            userName: userName // Set name if provided
        }; 
        await put('sessions', session);
    } else if (userName && !session.userName) {
        // Update name if it wasn't set before
        session.userName = userName;
        await put('sessions', session);
    }

    // --- RATE LIMIT CHECK FOR WEB USERS ---
    if (sender === 'user') {
        if (session.blocked) {
            throw new Error('BLOCKED');
        }
        
        // Check temporary spam block
        if (session.spamBlockUntil && session.spamBlockUntil > Date.now()) {
            throw new Error(`SPAM_LIMIT:${session.spamBlockUntil}`);
        }

        // Apply Rate Logic
        const check = checkRateLimit(text, session.rateLimit);
        
        if (!check.allowed) {
            if (check.blockUntil) {
                // Apply temporary block
                session.spamBlockUntil = check.blockUntil;
                await put('sessions', session);
                throw new Error(`SPAM_LIMIT:${check.blockUntil}`);
            }
            if (check.reason === 'DAILY_LIMIT') throw new Error('DAILY_LIMIT');
            if (check.reason === 'TOO_FAST') throw new Error('TOO_FAST');
            throw new Error('BLOCKED');
        }

        // Save new rate limit state
        session.rateLimit = check.newState;
        await put('sessions', session);
    }

    const msg: ChatMessage = { id: `msg-${Date.now()}-${Math.random()}`, text, sender, timestamp: Date.now(), read: sender === 'admin', sessionId, telegramMessageId, mediaUrl, mediaType };
    await put('chat_messages', msg);
    
    session.lastMessage = text || (mediaType ? `[${mediaType}]` : 'Media');
    session.lastMessageTime = Date.now();
    if (sender === 'user') session.unreadCount += 1;
    await put('sessions', session);
    notify('sessions', await getAll('sessions'));
    if(listeners['messages_update']) listeners['messages_update'].forEach(cb => cb());
    if(listeners['session_update']) listeners['session_update'].forEach(cb => cb());
    return msg;
};
export const markSessionRead = async (sessionId: string) => {
    let session = await get<ChatSession>('sessions', sessionId);
    if (session && session.unreadCount > 0) { session.unreadCount = 0; await put('sessions', session); notify('sessions', await getAll('sessions')); }
};
export const deleteMessage = async (sessionId: string, msgId: string) => { await remove('chat_messages', msgId); if(listeners['messages_update']) listeners['messages_update'].forEach(cb => cb()); };
export const deleteChatSession = async (sessionId: string) => { await remove('sessions', sessionId); notify('sessions', await getAll('sessions')); };

// UPDATED: Delete Session, Messages, AND User Details
export const deleteFullChatHistory = async (sessionId: string) => {
    const db = await getDB();
    return new Promise<void>((resolve) => {
        // Transaction includes tg_users now
        const tx = db.transaction(['chat_messages', 'sessions', 'tg_users'], 'readwrite');
        const msgStore = tx.objectStore('chat_messages');
        const sessionStore = tx.objectStore('sessions');
        const userStore = tx.objectStore('tg_users');
        
        const index = msgStore.index('sessionId');
        const req = index.getAllKeys(sessionId);
        
        req.onsuccess = () => {
            const keys = req.result;
            keys.forEach(k => msgStore.delete(k));
        };
        
        sessionStore.delete(sessionId);
        
        // Also delete from tg_users (Using sessionId as key since web-users use session ID as ID)
        userStore.delete(sessionId);
        
        tx.oncomplete = async () => {
            notify('sessions', await getAll('sessions'));
            notify('tg_users', await getAll('tg_users')); // Notify that user list changed
            if(listeners['messages_update']) listeners['messages_update'].forEach(cb => cb());
            resolve();
        };
    });
};

export const editMessage = async (msgId: string, newText: string) => { const msg = await get<ChatMessage>('chat_messages', msgId); if (msg) { msg.text = newText; await put('chat_messages', msg); if(listeners['messages_update']) listeners['messages_update'].forEach(cb => cb()); } };
export const updateMessageTelegramId = async (msgId: string, tgId: number) => { const msg = await get<ChatMessage>('chat_messages', msgId); if (msg) { msg.telegramMessageId = tgId; await put('chat_messages', msg); } };

export const toggleSessionBlock = async (sessionId: string) => { 
    let isNowBlocked = false;
    let sessionFound = false;

    // 1. Update Session if exists
    const session = await get<ChatSession>('sessions', sessionId); 
    if (session) { 
        session.blocked = !session.blocked; 
        await put('sessions', session); 
        isNowBlocked = session.blocked;
        sessionFound = true;
        notify('sessions', await getAll('sessions')); 
        if(listeners['session_update']) listeners['session_update'].forEach(cb => cb()); 
    }

    // 2. Update Telegram User if exists (Handles cases where session might not exist yet)
    const userId = sessionId.startsWith('tg-') ? sessionId.replace('tg-', '') : sessionId;
    const user = await get<TelegramUser>('tg_users', userId);
    
    if (user) {
        if (sessionFound) {
            // Sync with session state
            user.isBlocked = isNowBlocked;
        } else {
            // Toggle directly on user if no session exists
            user.isBlocked = !user.isBlocked;
            isNowBlocked = user.isBlocked;
        }
        await put('tg_users', user);
        notify('tg_users', await getAll('tg_users'));
        return isNowBlocked;
    }

    return isNowBlocked; 
};

export const deleteTelegramMessage = async (botToken: string, chatId: string | number, messageId: number) => {
    try {
        await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
        });
    } catch (e) {
        console.error('Error deleting Telegram message:', e);
    }
};

// --- TELEGRAM INTEGRATION ---
// Dynamic Keyboard Generators (Replacing Constants)
const getMenu = (isAdmin: boolean, isSuperAdmin: boolean, state: any, config: BotConfig) => {
    const customCommandButtons = config.customCommands
        ?.filter(cmd => cmd.showInMenu !== false) // Filter based on visibility
        .map(cmd => ({ text: cmd.command })) || [];
    
    if (!isAdmin) {
        // Integrate custom commands into menu
        const keyboard = [
            [{ text: config.menuButtons.products }, { text: config.menuButtons.cart }], 
            [{ text: config.menuButtons.announcements }, { text: config.menuButtons.contactAdmin }]
        ];
        
        // Add custom commands as new rows (2 per row if possible)
        for (let i = 0; i < customCommandButtons.length; i += 2) {
            keyboard.push(customCommandButtons.slice(i, i + 2));
        }

        return { 
            keyboard, 
            resize_keyboard: true 
        };
    }
    if (state?.mode === 'client') {
        const keyboard = [
            [{ text: config.menuButtons.products }, { text: config.menuButtons.cart }], 
            [{ text: config.menuButtons.announcements }, { text: config.menuButtons.contactAdmin }],
            [{ text: config.menuButtons.adminPanel }]
        ];
        
        for (let i = 0; i < customCommandButtons.length; i += 2) {
            keyboard.push(customCommandButtons.slice(i, i + 2));
        }

        return { 
            keyboard, 
            resize_keyboard: true 
        };
    }
    // Admin Menu (Kept hardcoded as it is internal tool)
    const adminRows = [
        [{ text: "➕ Yangi mahsulot" }, { text: "✏️ Tahrirlash" }], 
        [{ text: "📂 Yangi bo'lim" }, { text: "💬 Chatlar" }], 
        [{ text: "📢 E'lonlar" }, { text: "📊 Statistika" }], 
        [{ text: "👤 Client Mode" }]
    ];

    // Removed "👮‍♂️ Adminlar" button as requested - restricted to Web Panel

    return { 
        keyboard: adminRows, 
        resize_keyboard: true 
    };
};

export const sendTelegramMessage = async (botToken: string, chatId: string | number, text: string, options: any = {}) => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, ...options }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return null;
  }
};

export const sendTelegramPhoto = async (botToken: string, chatId: string | number, photo: string, caption: string = '', options: any = {}) => {
  try {
      const formData = new FormData();
      formData.append('chat_id', String(chatId));
      if (caption) formData.append('caption', caption);
      if (options.parse_mode) formData.append('parse_mode', options.parse_mode);
      if (options.reply_markup) formData.append('reply_markup', JSON.stringify(options.reply_markup));

      // Handle both "data:image/..." prefixed strings AND raw base64 (which is common in legacy data)
      let photoData = photo;
      if (!photoData.startsWith('http') && !photoData.startsWith('data:') && photoData.length > 200) {
          // It's likely a raw base64 string from DB
          photoData = `data:image/jpeg;base64,${photoData}`;
      }

      if (photoData.startsWith('data:')) {
           // Basic regex to strip prefix
           const cleanBase64 = photoData.split(',')[1];
           const byteCharacters = atob(cleanBase64);
           const byteNumbers = new Array(byteCharacters.length);
           for (let i = 0; i < byteCharacters.length; i++) {
               byteNumbers[i] = byteCharacters.charCodeAt(i);
           }
           const byteArray = new Uint8Array(byteNumbers);
           const blob = new Blob([byteArray], { type: 'image/jpeg' });
           formData.append('photo', blob, 'photo.jpg');
      } else {
           formData.append('photo', photoData);
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          body: formData
      });
      return await response.json();
  } catch (error) {
      console.error('Error sending Telegram photo:', error);
      return null;
  }
};

export const sendTelegramVideo = async (botToken: string, chatId: string | number, video: string, caption: string = '', options: any = {}) => {
  try {
      const formData = new FormData();
      formData.append('chat_id', String(chatId));
      if (caption) formData.append('caption', caption);
      if (options.parse_mode) formData.append('parse_mode', options.parse_mode);
      if (options.reply_markup) formData.append('reply_markup', JSON.stringify(options.reply_markup));

      let videoData = video;
      if (!videoData.startsWith('http') && !videoData.startsWith('data:') && videoData.length > 200) {
          videoData = `data:video/mp4;base64,${videoData}`;
      }

      if (videoData.startsWith('data:')) {
           const cleanBase64 = videoData.split(',')[1];
           const byteCharacters = atob(cleanBase64);
           const byteNumbers = new Array(byteCharacters.length);
           for (let i = 0; i < byteCharacters.length; i++) {
               byteNumbers[i] = byteCharacters.charCodeAt(i);
           }
           const byteArray = new Uint8Array(byteNumbers);
           const blob = new Blob([byteArray], { type: 'video/mp4' });
           formData.append('video', blob, 'video.mp4');
      } else {
           formData.append('video', videoData);
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
          method: 'POST',
          body: formData
      });
      return await response.json();
  } catch (error) {
      console.error('Error sending Telegram video:', error);
      return null;
  }
};

export const sendTelegramMediaGroup = async (botToken: string, chatId: string | number, mediaItems: { type: 'photo' | 'video', url: string }[], caption: string = '', options: any = {}) => {
    try {
        const formData = new FormData();
        formData.append('chat_id', String(chatId));
        
        const mediaArr = mediaItems.map((item, index) => {
            const isPhoto = item.type === 'photo';
            
            if (!item.url.startsWith('data:') && !(!item.url.startsWith('http') && item.url.length > 200)) {
                return {
                    type: item.type,
                    media: item.url,
                    caption: index === 0 ? caption : '',
                    parse_mode: index === 0 ? options.parse_mode : undefined
                };
            } 
            
            // Handle base64
            let dataUrl = item.url;
            if (!dataUrl.startsWith('data:') && dataUrl.length > 200) {
                const mime = isPhoto ? 'image/jpeg' : 'video/mp4';
                dataUrl = `data:${mime};base64,${dataUrl}`;
            }

            const filename = `file${index}.${isPhoto ? 'jpg' : 'mp4'}`;
            const attachName = `attach://${filename}`;
            const cleanBase64 = dataUrl.split(',')[1];
            const byteCharacters = atob(cleanBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: isPhoto ? 'image/jpeg' : 'video/mp4' });
            formData.append(filename, blob, filename);
            
            return {
                type: item.type,
                media: attachName,
                caption: index === 0 ? caption : '',
                parse_mode: index === 0 ? options.parse_mode : undefined
            };
        });

        formData.append('media', JSON.stringify(mediaArr));

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    } catch (error) {
        console.error('Error sending Telegram media group:', error);
        return null;
    }
};

export const downloadTelegramFile = async (fileId: string, botToken: string, mimeType?: string): Promise<string | null> => {
    const fetchWithTimeout = async (url: string, options: any = {}, timeout = 25000) => { // Increased timeout
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    };

    try {
        let fileData;
        const fileInfoUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
        
        try {
            // Direct attempt
            const res = await fetchWithTimeout(fileInfoUrl);
            if (res.ok) fileData = await res.json();
        } catch (e) {}

        // Fallback Proxy 1
        if (!fileData || !fileData.ok) {
            try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fileInfoUrl)}`;
                const res = await fetchWithTimeout(proxyUrl);
                if (res.ok) fileData = await res.json();
            } catch (e) {}
        }

        // Fallback Proxy 2
        if (!fileData || !fileData.ok) {
            try {
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(fileInfoUrl)}`;
                const res = await fetchWithTimeout(proxyUrl);
                if (res.ok) fileData = await res.json();
            } catch (e) {}
        }
        
        if (fileData && fileData.ok) {
            const filePath = fileData.result.file_path;
            const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
            
            const processResponse = async (res: Response) => {
                const arrayBuffer = await res.arrayBuffer();
                const type = mimeType || res.headers.get('content-type') || 'image/jpeg';
                const blob = new Blob([arrayBuffer], { type });
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            };

            // Attempt download with retries and proxies
            try {
                const res = await fetchWithTimeout(downloadUrl);
                if (res.ok) return await processResponse(res);
            } catch (e) {}

            try {
                 const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(downloadUrl)}`;
                 const res = await fetchWithTimeout(proxyUrl);
                 if (res.ok) return await processResponse(res);
            } catch (err) {}
            
            try {
                 const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(downloadUrl)}`;
                 const res = await fetchWithTimeout(proxyUrl);
                 if (res.ok) return await processResponse(res);
            } catch (err) {}
        }
    } catch (e) {
        console.error('Error downloading file info:', e);
    }
    return null;
};

export const editTelegramMessageRaw = async (botToken: string, chatId: string | number, messageId: number, text: string, options: any = {}) => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        ...options
      })
    });
    return await response.json();
  } catch (e) {
    console.error(e);
    return null;
  }
};

// Robust HTML Escaping
export const escapeHTML = (str: string | undefined | null) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

export const entitiesToHTML = (text: string, entities: any[]) => {
    if (!entities || entities.length === 0) return text;
    let html = "";
    let lastIndex = 0;
    entities.sort((a, b) => a.offset - b.offset);
    for (const entity of entities) {
        const { offset, length, type } = entity;
        html += escapeHTML(text.slice(lastIndex, offset));
        const chunk = escapeHTML(text.slice(offset, offset + length));
        switch (type) {
            case 'bold': html += `<b>${chunk}</b>`; break;
            case 'italic': html += `<i>${chunk}</i>`; break;
            case 'underline': html += `<u>${chunk}</u>`; break;
            case 'strikethrough': html += `<s>${chunk}</s>`; break;
            case 'code': html += `<code>${chunk}</code>`; break;
            case 'pre': html += `<pre>${chunk}</pre>`; break;
            case 'text_link': html += `<a href="${entity.url}">${chunk}</a>`; break;
            case 'spoiler': html += `<tg-spoiler>${chunk}</tg-spoiler>`; break;
            case 'blockquote': html += `<blockquote>${chunk}</blockquote>`; break;
            default: html += chunk;
        }
        lastIndex = offset + length;
    }
    html += escapeHTML(text.slice(lastIndex));
    return html;
};

export const renderTelegramCart = async (botToken: string, chatId: number, cart: any[], botConfig: BotConfig) => {
    if (!cart || cart.length === 0) {
        await sendTelegramMessage(botToken, chatId, botConfig.messages.cartEmpty);
        return;
    }
    let totalUZS = 0;
    let totalUSD = 0;
    let msg = botConfig.messages.cartHeader;
    cart.forEach((item, idx) => {
        const itemTotal = item.price * item.quantity;
        if (item.currency === 'USD') totalUSD += itemTotal;
        else totalUZS += itemTotal;
        const priceStr = item.currency === 'USD' ? `$${item.price}` : `${item.price.toLocaleString()} UZS`;
        msg += `${idx + 1}. <b>${escapeHTML(item.name)}</b>\n   ${item.quantity} x ${priceStr} = ${item.currency === 'USD' ? `$${itemTotal}` : `${itemTotal.toLocaleString()} UZS`}\n`;
    });
    let totalStr = "";
    if (totalUZS > 0) totalStr += `${totalUZS.toLocaleString()} UZS`;
    if (totalUSD > 0) {
        if (totalStr) totalStr += " + ";
        totalStr += `$${totalUSD.toLocaleString()}`;
    }
    msg += `\n💰 <b>JAMI: ${totalStr}</b>`;
    const kb = {
        inline_keyboard: [
            [{ text: botConfig.inlineButtons.checkout, callback_data: "checkout_start" }],
            [{ text: botConfig.inlineButtons.clearCart, callback_data: "cart_clear" }]
        ]
    };
    await sendTelegramMessage(botToken, chatId, msg, { parse_mode: 'HTML', reply_markup: kb });
};

// Helper to format messages for Admin History View
const formatHistoryPage = (messages: ChatMessage[], page: number, totalPages: number, userName: string) => {
    if (messages.length === 0) return `📭 <b>${userName}</b> bilan yozishmalar yo'q.`;
    
    let text = `💬 <b>${userName} bilan yozishmalar</b> (${page + 1}/${totalPages}):\n\n`;
    messages.forEach(m => {
        const date = new Date(m.timestamp + UZB_OFFSET);
        const time = `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
        const icon = m.sender === 'admin' ? '👨‍⚕️' : '👤';
        const content = m.text || (m.mediaUrl ? `[Media: ${m.mediaType || 'file'}]` : '[Xabar]');
        const shortContent = content.length > 200 ? content.substring(0, 200) + '...' : content;
        text += `${icon} <code>${time}</code>: ${escapeHTML(shortContent)}\n\n`;
    });
    return text;
};

// Helper function to render Admin Chat History
const renderAdminChatHistory = async (botToken: string, chatId: number | string, messageId: number, targetId: string, page: number) => {
    const messages = await getMessagesBySessionId(targetId);
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    const PAGE_SIZE = 5;
    const totalPages = Math.ceil(messages.length / PAGE_SIZE) || 1;
    // Ensure valid page
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    
    const start = safePage * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageMessages = messages.slice(start, end);
    
    // Get user info for title and blocked status
    let userName = targetId;
    let isBlocked = false;
    const user = await get<TelegramUser>('tg_users', targetId);
    if (user) {
        userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.username ? `@${user.username}` : targetId);
        isBlocked = !!user.isBlocked;
    }

    const text = formatHistoryPage(pageMessages, safePage, totalPages, escapeHTML(userName));
    
    // Build Navigation Keyboard
    const kb: any = { inline_keyboard: [] };
    const navRow = [];
    
    if (safePage > 0) {
        navRow.push({ text: "⬅️ Oldingi", callback_data: `hist_${targetId}_${safePage - 1}` });
    }
    
    navRow.push({ text: `${safePage + 1}/${totalPages}`, callback_data: 'noop' });
    
    if (safePage < totalPages - 1) {
        navRow.push({ text: "Keyingi ➡️", callback_data: `hist_${targetId}_${safePage + 1}` });
    }
    
    kb.inline_keyboard.push(navRow);
    // Actions Row
    kb.inline_keyboard.push([
        { text: "✍️ Javob yozish", callback_data: `reply_${targetId}` },
        { text: isBlocked ? "✅ Blokdan chiqarish" : "🚫 Bloklash", callback_data: `admin_block_${targetId}` }
    ]);
    kb.inline_keyboard.push([
        { text: "🗑 Tarixni o'chirish", callback_data: `admin_clear_${targetId}` }
    ]);
    kb.inline_keyboard.push([{ text: "🔙 Ortga (User List)", callback_data: "admin_users_page_0" }]);

    await editTelegramMessageRaw(botToken, chatId, messageId, text, { parse_mode: 'HTML', reply_markup: kb });
};

export const notifyAdminsOfWebMessage = async (msgId: string, text: string, sessionId: string) => {
    const config = await get<SiteConfig>('site_config', 'hero_config');
    const token = config?.telegram?.botToken || TELEGRAM_BOT_TOKEN;
    const rawAdminIds = config?.telegram?.adminId || TELEGRAM_ADMIN_ID;
    
    if (!token || !rawAdminIds) return;
    
    // Ensure user exists in tg_users for Admin List visibility
    let user = await get<TelegramUser>('tg_users', sessionId);
    if (!user) {
        // Create basic user record for web visitor
        const session = await get<ChatSession>('sessions', sessionId);
        const name = session?.userName || 'Veb-sayt Mehmoni';
        // Auto-register to tg_users so it shows in Admin Panel list
        await trackTgUser(sessionId, {
            id: sessionId,
            firstName: name,
            source: 'website',
            lastActive: Date.now(),
            createdAt: Date.now()
        });
    } else {
        // Update last active
        await trackTgUser(sessionId, { lastActive: Date.now() });
    }
    
    // Refresh user info after possible creation
    user = await get<TelegramUser>('tg_users', sessionId);
    let userInfo = '';
    
    if (user) {
        const name = user.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Foydalanuvchi';
        const phone = user.phone ? `\n📞 ${user.phone}` : '';
        userInfo = `👤 <b>${escapeHTML(name)}</b>${escapeHTML(phone)}\nID: <code>${sessionId}</code>`;
    } else {
        // Fallback (should normally be covered by above create logic)
        userInfo = `👤 <b>Web Mehmon</b>\nID: <code>${sessionId}</code>`;
    }

    const adminIds = rawAdminIds.split(',').map(id => id.trim());
    
    for (const adminId of adminIds) {
        await sendTelegramMessage(
            token, 
            adminId, 
            `📩 <b>Yangi xabar (Web Chat):</b>\n\n${userInfo}\n\n💬: ${escapeHTML(text)}\n\n👇 Javob yozish uchun "Reply" qiling (Quote) yoki pastdagi ID ni ishlating.\nSession: ${sessionId}`, 
            { parse_mode: 'HTML' }
        );
    }
};

export const replyToTelegramUser = async (tgChatId: string, text: string, file?: File) => {
    const config = await get<SiteConfig>('site_config', 'hero_config');
    const token = config?.telegram?.botToken || TELEGRAM_BOT_TOKEN;
    if (!token) return { ok: false, description: "Token missing" };
    if (file) {
        const reader = new FileReader();
        return new Promise<any>((resolve) => {
             reader.onload = async (e) => {
                 const base64 = (e.target?.result as string);
                 if (file.type.startsWith('image/')) {
                     resolve(await sendTelegramPhoto(token, tgChatId, base64, text));
                 } else if (file.type.startsWith('video/')) {
                     resolve(await sendTelegramVideo(token, tgChatId, base64, text));
                 } else {
                      const formData = new FormData();
                      formData.append('chat_id', tgChatId);
                      if (text) formData.append('caption', text);
                      formData.append('document', file);
                      try {
                          const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: formData });
                          resolve(await res.json());
                      } catch(e) { resolve(null); }
                 }
             };
             reader.readAsDataURL(file);
        });
    } else {
        return await sendTelegramMessage(token, tgChatId, text);
    }
};

export const editTelegramMessage = async (tgChatId: string, messageId: number, nText: string, isCaption: boolean = false) => {
    const config = await get<SiteConfig>('site_config', 'hero_config');
    const token = config?.telegram?.botToken || TELEGRAM_BOT_TOKEN;
    if (!token) return;
    if (isCaption) {
        await fetch(`https://api.telegram.org/bot${token}/editMessageCaption`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: tgChatId, message_id: messageId, caption: nText })
        });
    } else {
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: tgChatId, message_id: messageId, text: nText })
        });
    }
};

let lastUpdateId = 0;

// Commands that should NOT be saved to chat history to keep admin view clean
const getIgnoredCommands = (config: BotConfig) => [
    config.menuButtons.products,
    config.menuButtons.cart, 
    config.menuButtons.announcements,
    config.inlineButtons.cancel,
    "/start",
    "/cancel",
    config.inlineButtons.sendContact,
    config.inlineButtons.sendLocation,
    config.inlineButtons.skip,
    config.menuButtons.adminPanel,
    "Rasmlarni tozalash",
    "✅ Tayyor",
    config.menuButtons.contactAdmin,
    ...(config.customCommands?.map(c => c.command) || [])
];

export const UZB_OFFSET = 5 * 60 * 60 * 1000;
export function getUzbNow() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + UZB_OFFSET);
}

export function createUzbDate(year: number, month: number, day: number, hour: number, minute: number): number {
    const date = new Date(Date.UTC(year, month, day, hour, minute));
    return date.getTime() - UZB_OFFSET;
}

export function calculateNextSchedule(frequency: 'daily' | 'weekly' | 'monthly', targetHour: number, targetMinute: number, targetDayVal?: number, targetWeek?: number): number {
    const UZB_OFFSET_MS = 5 * 60 * 60 * 1000;
    const now = Date.now();
    const buffer = 60 * 1000; 
    const nowUzb = new Date(now + UZB_OFFSET_MS);
    nowUzb.setUTCHours(targetHour, targetMinute, 0, 0);
    let candidate = nowUzb.getTime() - UZB_OFFSET_MS;

    if (frequency === 'daily') {
        while (candidate <= now + buffer) { candidate += 24 * 60 * 60 * 1000; }
    } else if (frequency === 'weekly') {
        const d = new Date(candidate + UZB_OFFSET_MS);
        const currentDay = d.getUTCDay();
        const target = targetDayVal !== undefined ? targetDayVal : currentDay;
        const daysToAdd = (target - currentDay + 7) % 7;
        d.setUTCDate(d.getUTCDate() + daysToAdd);
        candidate = d.getTime() - UZB_OFFSET_MS;
        while (candidate <= now + buffer) { candidate += 7 * 24 * 60 * 60 * 1000; }
    } else if (frequency === 'monthly') {
        let attempts = 0;
        const maxAttempts = 24;
        const getCandidateForDate = (baseDate: Date) => {
            const temp = new Date(baseDate);
            if (targetWeek && targetDayVal !== undefined) {
                temp.setUTCDate(1);
                const firstDay = temp.getUTCDay();
                const diff = (targetDayVal - firstDay + 7) % 7;
                const nthOcc = (1 + diff) + (targetWeek - 1) * 7;
                temp.setUTCDate(nthOcc);
            } else {
                temp.setUTCDate(targetDayVal || 1);
            }
            temp.setUTCHours(targetHour, targetMinute, 0, 0);
            return temp.getTime() - UZB_OFFSET_MS;
        };
        let checkDate = new Date(now + UZB_OFFSET_MS);
        candidate = getCandidateForDate(checkDate);
        while (candidate <= now + buffer && attempts < maxAttempts) {
            checkDate = new Date(checkDate);
            checkDate.setUTCDate(1);
            checkDate.setUTCMonth(checkDate.getUTCMonth() + 1);
            candidate = getCandidateForDate(checkDate);
            attempts++;
        }
    }
    return candidate;
}

async function getBotState(chatId: number): Promise<any> { const state = await get<any>('bot_states', chatId); return state?.data || { step: 'IDLE' }; }
async function saveBotState(chatId: number, data: any) { await put('bot_states', { chatId, data }); }

export async function trackTgUser(chatId: string, data: Partial<TelegramUser>) {
    let user = await get<TelegramUser>('tg_users', chatId);
    if (!user) { 
        user = { id: chatId, isBlocked: false, hasOrdered: false, announcementsSeen: [], lastActive: Date.now(), createdAt: Date.now(), cartAddCount: 0, buttonClickCount: 0, orders: [] }; 
    }
    user = { 
        ...user, 
        ...data, 
        orders: data.orders ? [...(user.orders || []), ...data.orders] : (user.orders || []),
        lastActive: Date.now(),
        cartAddCount: (user.cartAddCount || 0) + (data.cartAddCount || 0),
        buttonClickCount: (user.buttonClickCount || 0) + (data.buttonClickCount || 0)
    };
    await put('tg_users', user);
    notify('tg_users', await getAll('tg_users')); 
}

const INSTANCE_ID = Math.random().toString(36).substring(2);
const LOCK_KEY = 'announcement_processor_lock';
const HEARTBEAT_KEY = 'announcement_processor_heartbeat';

function isLeader() {
    const currentLeader = localStorage.getItem(LOCK_KEY);
    const lastHeartbeat = parseInt(localStorage.getItem(HEARTBEAT_KEY) || '0');
    const now = Date.now();
    if (!currentLeader || (now - lastHeartbeat > 10000)) {
        localStorage.setItem(LOCK_KEY, INSTANCE_ID);
        localStorage.setItem(HEARTBEAT_KEY, now.toString());
        return true;
    }
    if (currentLeader === INSTANCE_ID) {
        localStorage.setItem(HEARTBEAT_KEY, now.toString());
        return true;
    }
    return false;
}

let isBroadcasting = false;
export const processAnnouncements = async (mainBotToken: string) => { 
    if (isBroadcasting || !mainBotToken || !isLeader()) return; 
    isBroadcasting = true; 
    try { 
        const config = await get<SiteConfig>('site_config', 'hero_config'); 
        const broadcastToken = config?.telegram?.broadcastBotToken || mainBotToken; 
        const announcements = await getAll<Announcement>('announcements'); 
        const now = Date.now(); 
        const pending = announcements.filter(a => (a.status === 'pending' || a.status === 'sending') && a.scheduledTime <= now); 
        
        if (pending.length === 0) { isBroadcasting = false; return; } 
        
        const users = await getAll<TelegramUser>('tg_users'); 
        const activeUsers = users.filter(u => !u.isBlocked); 
        
        for (const currentAnno of pending) { 
            const recipients = activeUsers.filter(u => !currentAnno.sentTo.includes(u.id)); 
            if (recipients.length === 0) { 
                if (currentAnno.frequency === 'once') { 
                    currentAnno.status = 'sent'; 
                } else { 
                    currentAnno.currentRepeatCount += 1; 
                    if (currentAnno.maxRepeats && currentAnno.currentRepeatCount >= currentAnno.maxRepeats && currentAnno.maxRepeats > 0) { 
                        currentAnno.status = 'sent'; 
                    } else { 
                        currentAnno.sentTo = []; 
                        currentAnno.status = 'pending'; 
                        const nextTs = calculateNextSchedule(currentAnno.frequency, new Date(currentAnno.scheduledTime + UZB_OFFSET).getUTCHours(), new Date(currentAnno.scheduledTime + UZB_OFFSET).getUTCMinutes(), currentAnno.targetDay, currentAnno.targetWeek);
                        if (nextTs <= Date.now()) { currentAnno.scheduledTime = Date.now() + 86400000; } else { currentAnno.scheduledTime = nextTs; }
                    } 
                } 
                await saveAnnouncement(currentAnno); 
                continue; 
            } 
            
            if (currentAnno.status !== 'sending') { 
                currentAnno.status = 'sending'; 
                currentAnno.totalUsersCount = activeUsers.length; 
                await saveAnnouncement(currentAnno); 
            } 
            
            for (const user of recipients) { 
                const options: any = { parse_mode: 'HTML' }; 
                if (currentAnno.inlineButtons && currentAnno.inlineButtons.length > 0) { 
                    const keyboard = currentAnno.inlineButtons.map((btn) => [{ text: btn.text, url: btn.url }]); 
                    options.reply_markup = { inline_keyboard: keyboard }; 
                } 
                
                const isLongCaption = currentAnno.caption.length > 1024;
                try {
                    if (currentAnno.mediaItems && currentAnno.mediaItems.length > 0) { 
                        const mediaToSend = currentAnno.mediaItems.slice(0, 10); 
                        if (mediaToSend.length > 1) { 
                            if (options.reply_markup || isLongCaption) { 
                                await sendTelegramMediaGroup(broadcastToken, user.id, mediaToSend, '', {}); 
                                await sendTelegramMessage(broadcastToken, user.id, currentAnno.caption, options); 
                            } else { 
                                await sendTelegramMediaGroup(broadcastToken, user.id, mediaToSend, currentAnno.caption, options); 
                            } 
                        } else { 
                            const item = mediaToSend[0]; 
                            if (isLongCaption) { 
                                if (item.type === 'photo') await sendTelegramPhoto(broadcastToken, user.id, item.url, '', {}); 
                                else await sendTelegramVideo(broadcastToken, user.id, item.url, '', {}); 
                                await sendTelegramMessage(broadcastToken, user.id, currentAnno.caption, options); 
                            } else { 
                                let res; 
                                if (item.type === 'photo') res = await sendTelegramPhoto(broadcastToken, user.id, item.url, currentAnno.caption, options); 
                                else res = await sendTelegramVideo(broadcastToken, user.id, item.url, currentAnno.caption, options); 
                                if (!res || !res.ok) { 
                                    const plainOptions = { ...options }; delete plainOptions.parse_mode; 
                                    if (item.type === 'photo') await sendTelegramPhoto(broadcastToken, user.id, item.url, currentAnno.caption, plainOptions); 
                                    else await sendTelegramVideo(broadcastToken, user.id, item.url, currentAnno.caption, plainOptions); 
                                } 
                            } 
                        } 
                    } else { 
                        let res = await sendTelegramMessage(broadcastToken, user.id, currentAnno.caption, options); 
                        if (!res || !res.ok) { 
                            const plainOptions = { ...options }; delete plainOptions.parse_mode; 
                            await sendTelegramMessage(broadcastToken, user.id, currentAnno.caption, plainOptions); 
                        } 
                    }
                } catch(e) { console.error('Failed to send to ' + user.id, e); }

                currentAnno.sentTo.push(user.id);
                await new Promise(r => setTimeout(r, 40)); 
            } 
            await saveAnnouncement(currentAnno); 
        } 
    } catch (e) { console.error(e); } finally { isBroadcasting = false; } 
};

const sendAnnouncementView = async (botToken: string, chatId: string | number, ann: Announcement, index: number, total: number, isAdmin: boolean) => {
    const kb: any = { inline_keyboard: [] };
    const navRow = [];
    if (index > 0) navRow.push({ text: "⬅️ Oldingi", callback_data: `ann_view_${index - 1}` });
    navRow.push({ text: `${index + 1}/${total}`, callback_data: 'noop' });
    if (index < total - 1) navRow.push({ text: "Keyingi ➡️", callback_data: `ann_view_${index + 1}` });
    if (navRow.length > 0) kb.inline_keyboard.push(navRow);
    
    // Admin Actions Row (New)
    if (isAdmin) {
        kb.inline_keyboard.push([{ text: "🗑 O'chirish", callback_data: `ann_delete_${ann.id}` }]);
    }

    if (ann.inlineButtons && ann.inlineButtons.length > 0) {
        ann.inlineButtons.forEach(btn => kb.inline_keyboard.push([{ text: btn.text, url: btn.url }]));
    }
    if (ann.mediaItems && ann.mediaItems.length > 0) {
        if (ann.mediaItems.length > 1) {
            await sendTelegramMediaGroup(botToken, chatId, ann.mediaItems, ann.caption, { parse_mode: 'HTML' });
            await sendTelegramMessage(botToken, chatId, "Navigatsiya va Boshqaruv:", { reply_markup: kb });
        } else {
            const item = ann.mediaItems[0];
            const mediaType = item.type === 'video' ? sendTelegramVideo : sendTelegramPhoto;
            await mediaType(botToken, chatId, item.url, ann.caption, { parse_mode: 'HTML', reply_markup: kb });
        }
    } else {
        await sendTelegramMessage(botToken, chatId, ann.caption, { parse_mode: 'HTML', reply_markup: kb });
    }
};

// --- PAGINATION HELPER ---
const PAGE_SIZE = 5;
const generateUserListKeyboard = (users: TelegramUser[], page: number) => {
    const totalPages = Math.ceil(users.length / PAGE_SIZE);
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const currentUsers = users.slice(start, end);
    
    const keyboard = currentUsers.map(u => {
        const label = `${u.isBlocked ? '🚫 ' : ''}${u.firstName || 'User'} ${u.lastName || ''} (ID: ${u.id})`;
        return [{ text: label, callback_data: `admin_chat_${u.id}` }];
    });

    const navRow = [];
    if (page > 0) navRow.push({ text: "⬅️ Oldingi", callback_data: `admin_users_page_${page - 1}` });
    navRow.push({ text: `${page + 1}/${totalPages || 1}`, callback_data: 'noop' });
    if (page < totalPages - 1) navRow.push({ text: "Keyingi ➡️", callback_data: `admin_users_page_${page + 1}` });
    
    if (navRow.length > 0) keyboard.push(navRow);
    
    return { inline_keyboard: keyboard };
};

const processGreeting = (text: string, user: any) => {
    if (!text) return "";
    let processed = text;
    const username = user.username ? `@${user.username}` : (user.first_name || 'Mijoz');
    const firstName = user.first_name || 'Mijoz';
    const lastName = user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    processed = processed.replace(/\$username/g, escapeHTML(username));
    processed = processed.replace(/\$first_name/g, escapeHTML(firstName));
    processed = processed.replace(/\$fullname/g, escapeHTML(fullName));
    return processed;
};

export const checkTelegramReplies = async (botToken: string, adminIds: string[]) => {
    if (!botToken) return;
    await processAnnouncements(botToken);
    
    // FETCH CONFIG FOR DYNAMIC STRINGS
    const siteConfig = await get<SiteConfig>('site_config', 'hero_config');
    
    // Robust Fallback Defaults
    const defaults = { 
        welcomeMessage: "👋 <b>Assalomu alaykum!</b>\n\nBizning botimizga xush kelibsiz. Quyidagi menyudan kerakli bo'limni tanlang:",
        menuButtons: { products: "🦷 Mahsulotlar", cart: "🛒 Savatcha", announcements: "📢 E'lonlar", contactAdmin: "✍️ Adminga yozish", adminPanel: "👨‍⚕️ Admin Panel" },
        messages: { cartEmpty: "🛒 Savatchangiz bo'sh.", cartHeader: "🛒 <b>Sizning savatchangiz:</b>\n\n", checkoutPrompt: "📞 <b>Siz bilan bog'lanishimiz uchun telefon raqamingizni yuboring:</b>", orderSuccess: "✅ Buyurtmangiz qabul qilindi! Tez orada aloqaga chiqamiz.", contactPrompt: "📝 <b>Admin bilan aloqa rejimi.</b>\n\nSavolingizni yozib qoldiring. \nSuhbatni tugatish uchun '❌ Bekor qilish' tugmasini bosing.", supportResponse: "✅ <b>Xabaringiz yuborildi.</b>\nTez orada admin javob beradi.", locationPrompt: "📍 <b>Yetkazib berish manzilini yuboring (yoki lokatsiya tashlang):</b>\n\nAgar manzil kerak bo'lmasa, 'O'tkazib yuborish' tugmasini bosing." },
        inlineButtons: { addToCart: "🛒 Savatchaga qo'shish", checkout: "✅ Rasmiylashtirish", clearCart: "🗑 Tozalash", sendLocation: "📍 Lokatsiya yuborish", sendContact: "📞 Raqamni yuborish", cancel: "❌ Bekor qilish", skip: "O'tkazib yuborish ➡️", back: "🔙 Ortga" },
        customCommands: []
    };

    const loadedBotConfig = siteConfig?.botConfig;

    // Deep merge to ensure no undefined properties
    const botConfig: BotConfig = {
        welcomeMessage: loadedBotConfig?.welcomeMessage || defaults.welcomeMessage,
        welcomeButtons: loadedBotConfig?.welcomeButtons || [],
        menuButtons: { ...defaults.menuButtons, ...(loadedBotConfig?.menuButtons || {}) },
        messages: { ...defaults.messages, ...(loadedBotConfig?.messages || {}) },
        inlineButtons: { ...defaults.inlineButtons, ...(loadedBotConfig?.inlineButtons || {}) },
        customCommands: loadedBotConfig?.customCommands || []
    };

    // --- KEYBOARD CONSTANTS DEFINED HERE ---
    const CANCEL_BACK_KEYBOARD = {
        keyboard: [[{ text: botConfig.inlineButtons.cancel }]],
        resize_keyboard: true
    };

    const LOCATION_KEYBOARD = {
        keyboard: [
            [{ text: botConfig.inlineButtons.sendLocation, request_location: true }],
            [{ text: botConfig.inlineButtons.skip }],
            [{ text: botConfig.inlineButtons.cancel }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
    };

    const CLIENT_MODE_MENU = {
        keyboard: [
            [{ text: botConfig.menuButtons.products }, { text: botConfig.menuButtons.cart }],
            [{ text: botConfig.menuButtons.announcements }, { text: botConfig.menuButtons.contactAdmin }],
            [{ text: botConfig.menuButtons.adminPanel }]
        ],
        resize_keyboard: true
    };

    const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=1`);
    const data = await response.json();
    if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
            lastUpdateId = update.update_id;
            const message = update.message;
            const callbackQuery = update.callback_query;
            
            if (message) {
                const chatId = message.chat.id;
                const text = message.text || message.caption || '';
                const isAdmin = adminIds.includes(String(chatId));
                // Super Admin Check - STRICT: Only the TELEGRAM_ADMIN_ID constant
                const isSuperAdmin = String(chatId) === TELEGRAM_ADMIN_ID; 
                let state = await getBotState(chatId);

                // Detect if this is a trailing message of an album allowed by a previous interaction
                const isTrailingMediaGroup = state.step === 'IDLE' && 
                                             message.media_group_id && 
                                             state.lastAllowedMediaGroupId === message.media_group_id;

                // --- BLOCK CHECK FOR REGULAR USERS (Prevent Sending) ---
                if (!isAdmin) {
                    const user = await get<TelegramUser>('tg_users', String(chatId));
                    if (user && user.isBlocked) {
                        await sendTelegramMessage(botToken, chatId, "⛔️ <b>Siz admin tomonidan bloklangansiz.</b>\nXabar yuborish imkoniyati cheklangan.", { parse_mode: 'HTML' });
                        continue; 
                    }
                }

                // --- CUSTOM COMMAND CHECK ---
                if (state.step === 'IDLE') {
                    const customCmd = botConfig.customCommands?.find(c => c.command === text);
                    if (customCmd) {
                        const options: any = { parse_mode: 'HTML' };
                        // Inline Buttons
                        if (customCmd.buttons && customCmd.buttons.length > 0) {
                            options.reply_markup = { 
                                inline_keyboard: customCmd.buttons.map(b => [{ text: b.text, url: b.url }]) 
                            };
                        }

                        // Media Handling
                        if (customCmd.media && customCmd.media.length > 0) {
                            if (customCmd.media.length > 1) {
                                // Multiple media: Send as album
                                const mediaItems = customCmd.media.map(m => ({ type: m.type as 'photo' | 'video', url: m.url }));
                                const caption = customCmd.response;
                                
                                // Send album (caption on first item)
                                await sendTelegramMediaGroup(botToken, chatId, mediaItems, caption, { parse_mode: 'HTML' });
                                
                                // If buttons exist, send them in a separate message because albums can't have inline keyboards
                                if (options.reply_markup) {
                                    await sendTelegramMessage(botToken, chatId, "🔗 Havolalar:", options);
                                }
                            } else {
                                // Single media: Send with caption and buttons attached
                                const item = customCmd.media[0];
                                if (item.type === 'video') {
                                    await sendTelegramVideo(botToken, chatId, item.url, customCmd.response, options);
                                } else {
                                    await sendTelegramPhoto(botToken, chatId, item.url, customCmd.response, options);
                                }
                            }
                        } else {
                            // Text only
                            await sendTelegramMessage(botToken, chatId, customCmd.response, options);
                        }
                        continue;
                    }
                }

                // --- FILTER RANDOM MESSAGES FROM REGULAR USERS ---
                if (!isAdmin) {
                    const ALLOWED_IDLE_COMMANDS = [
                        botConfig.menuButtons.products,
                        botConfig.menuButtons.cart, 
                        botConfig.menuButtons.announcements,
                        botConfig.menuButtons.contactAdmin,
                        "/start",
                        "/cancel",
                        botConfig.menuButtons.adminPanel,
                        ...(botConfig.customCommands?.map(c => c.command) || [])
                    ];

                    if (state.step === 'IDLE' && !message.web_app_data && !ALLOWED_IDLE_COMMANDS.includes(text) && !isTrailingMediaGroup) {
                        await deleteTelegramMessage(botToken, chatId, message.message_id);
                        await sendTelegramMessage(botToken, chatId, `⚠️ <b>Iltimos, botdan foydalanish uchun quyidagi tugmalardan birini tanlang:</b>\n\n🔹 /start - Botni qayta ishga tushirish\n🔹 ${botConfig.menuButtons.contactAdmin} - Admin bilan bog'lanish`, { 
                            parse_mode: 'HTML', 
                            reply_markup: getMenu(false, false, state, botConfig) 
                        });
                        continue;
                    }
                }

                // --- FILTER STICKERS AND GIFS FROM REGULAR USERS ---
                if (!isAdmin && (message.sticker || message.animation || message.video_note)) {
                    await deleteTelegramMessage(botToken, chatId, message.message_id);
                    await sendTelegramMessage(botToken, chatId, "⚠️ Kechirasiz, ushbu formatdagi xabarlar (Stiker, GIF, Dumaloq video) qabul qilinmaydi. Iltimos, matn, rasm yoki video yuboring.");
                    continue; 
                }

                // --- SAVE USER MESSAGE TO DB (HISTORY) ---
                if (!isAdmin && !message.web_app_data) {
                    const isIgnoredCommand = getIgnoredCommands(botConfig).includes(text);
                    const shouldSave = !isIgnoredCommand || isTrailingMediaGroup;

                    if (shouldSave) {
                        let tgUser = await get<TelegramUser>('tg_users', String(chatId));
                        if (tgUser?.spamBlockUntil && tgUser.spamBlockUntil > Date.now()) {
                            await deleteTelegramMessage(botToken, chatId, message.message_id);
                            continue;
                        }
                        const check = checkRateLimit(text, tgUser?.rateLimit);
                        if (!check.allowed) {
                            if (check.blockUntil) {
                                if (tgUser) { tgUser.spamBlockUntil = check.blockUntil; await put('tg_users', tgUser); }
                                await sendTelegramMessage(botToken, chatId, `⛔️ <b>Spam aniqlandi!</b>\nSiz 1 soatga bloklandingiz. Iltimos, xabarlarni qayta-qayta yubormang.`, { parse_mode: 'HTML' });
                            } else if (check.reason === 'DAILY_LIMIT') {
                                await sendTelegramMessage(botToken, chatId, "⚠️ <b>Kunlik limit tugadi.</b>\nBugungi kunda boshqa xabar yubora olmaysiz.", { parse_mode: 'HTML' });
                            }
                            continue;
                        }
                        if (tgUser) { tgUser.rateLimit = check.newState; await put('tg_users', tgUser); }

                        // Proceed to save message...
                        let mediaUrl: string | undefined;
                        let mediaType: ChatMessage['mediaType'] = undefined;
                        const msgText = message.text || message.caption || '';

                        try {
                            if (message.photo) { const fileId = message.photo[message.photo.length - 1].file_id; mediaUrl = await downloadTelegramFile(fileId, botToken, 'image/jpeg'); mediaType = 'photo'; } 
                            else if (message.voice) { const fileId = message.voice.file_id; mediaUrl = await downloadTelegramFile(fileId, botToken, 'audio/ogg'); mediaType = 'audio'; } 
                            else if (message.video) { const fileId = message.video.file_id; mediaUrl = await downloadTelegramFile(fileId, botToken, 'video/mp4'); mediaType = 'video'; } 
                            else if (message.document) { const fileId = message.document.file_id; mediaUrl = await downloadTelegramFile(fileId, botToken); mediaType = 'document'; }

                            if (msgText || mediaUrl) {
                                await sendMessage(String(chatId), msgText, 'user', message.message_id, mediaUrl, mediaType, message.from?.first_name);
                            }
                        } catch (e) { console.error("Error saving TG message to DB history:", e); }
                    }
                }

                if (message.web_app_data) {
                    try {
                        const data = JSON.parse(message.web_app_data.data);
                        if (data.type === 'ORDER') {
                            const newOrder: Order = { id: data.orderId, date: Date.now(), itemsSummary: data.itemsSummary, totalAmount: data.totalAmount, source: 'website', status: 'new', userId: String(chatId), userPhone: data.phone };
                            await trackTgUser(String(chatId), { username: message.from?.username, firstName: message.from?.first_name, lastName: message.from?.last_name, phone: data.phone, hasOrdered: true, orders: [newOrder] });
                            const adminMsg = `🆕 <b>WEB BUYURTMA</b> #${data.orderId}\n\n👤 ${escapeHTML(message.from?.first_name)} (@${message.from?.username || '-'})\n📞 ${data.phone}\n\n🛒 <b>Buyurtma:</b>\n${escapeHTML(data.itemsSummary)}\n\n💰 Jami: ${data.totalAmount}`;
                            for (const adminId of adminIds) { await sendTelegramMessage(botToken, adminId, adminMsg, { parse_mode: 'HTML' }); }
                            await sendTelegramMessage(botToken, chatId, botConfig.messages.orderSuccess);
                        }
                    } catch (e) { console.error("Error parsing web_app_data", e); }
                }

                // --- ADMIN REPLY HANDLER (Native Reply) ---
                if (isAdmin && message.reply_to_message) {
                    const originalText = message.reply_to_message.text || message.reply_to_message.caption || '';
                    const sessionMatch = originalText.match(/Session:\s+(.+)/);
                    if (sessionMatch) {
                        const sessionId = sessionMatch[1].trim();
                        let mediaUrl: string | undefined; let mediaType: ChatMessage['mediaType'];
                        if (message.photo) { const fileId = message.photo[message.photo.length - 1].file_id; mediaUrl = await downloadTelegramFile(fileId, botToken, 'image/jpeg'); mediaType = 'photo'; } else if (message.voice) { const fileId = message.voice.file_id; mediaUrl = await downloadTelegramFile(fileId, botToken, 'audio/ogg'); mediaType = 'audio'; } else if (message.video) { const fileId = message.video.file_id; mediaUrl = await downloadTelegramFile(fileId, botToken, 'video/mp4'); mediaType = 'video'; } else if (message.document) { const fileId = message.document.file_id; mediaUrl = await downloadTelegramFile(fileId, botToken); mediaType = 'document'; }
                        if (text || mediaUrl) { await sendMessage(sessionId, text, 'admin', message.message_id, mediaUrl, mediaType); }
                        continue;
                    }
                    const idMatch = originalText.match(/🆔 ID:\s+(\d+)/);
                    if (idMatch) {
                        const targetId = idMatch[1];
                        const isWebUser = false;
                        let success = false;
                        try {
                            if (message.text) { await sendTelegramMessage(botToken, targetId, message.text); success = true; } 
                            else if (message.photo) { await sendTelegramPhoto(botToken, targetId, message.photo[message.photo.length - 1].file_id, message.caption); success = true; } 
                            else if (message.video) { await sendTelegramVideo(botToken, targetId, message.video.file_id, message.caption); success = true; } 
                            else if (message.voice) { await fetch(`https://api.telegram.org/bot${botToken}/copyMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: targetId, from_chat_id: chatId, message_id: message.message_id }) }); success = true; }

                            if (success) {
                                if (!isWebUser) { await sendMessage(targetId, text || (message.caption ?? '[Media]'), 'admin', message.message_id, undefined, undefined); }
                                await sendTelegramMessage(botToken, chatId, "✅ Xabar yuborildi!", { reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) });
                                state.step = 'IDLE'; state.replyTargetId = null; await saveBotState(chatId, state);
                            } else { await sendTelegramMessage(botToken, chatId, "⚠️ Format qo'llab-quvvatlanmaydi. Matn, Rasm, Video yoki Ovozli xabar yuboring."); }
                        } catch (e) {
                            await sendTelegramMessage(botToken, chatId, "❌ Yuborishda xatolik. Foydalanuvchi bloklagan bo'lishi mumkin.");
                            state.step = 'IDLE'; state.replyTargetId = null; await saveBotState(chatId, state);
                        }
                        continue;
                    }
                }

                if (!isAdmin) {
                    await trackTgUser(String(chatId), { username: message.from?.username, firstName: message.from?.first_name, lastName: message.from?.last_name, isBlocked: false, phone: message.contact?.phone_number });
                }
                
                const ADMIN_COMMANDS = ["➕ Yangi mahsulot", "✏️ Tahrirlash", "📂 Yangi bo'lim", "💬 Chatlar", "📢 E'lonlar", "📊 Statistika", "/start", "👤 Client Mode", botConfig.menuButtons.adminPanel];
                if (isAdmin && ADMIN_COMMANDS.includes(text)) {
                        const currentMode = state.mode;
                        state = { step: 'IDLE', cart: state.cart || [], mode: currentMode };
                        await saveBotState(chatId, state);
                }

                if (text === botConfig.inlineButtons.cancel || text === "/cancel") {
                    await saveBotState(chatId, { step: 'IDLE', cart: state.cart || [], mode: state.mode });
                    await sendTelegramMessage(botToken, chatId, "🚫 Bekor qilindi.", { reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) });
                    continue;
                }

                // ... (Keep existing admin command handlers unchanged until needed) ...
                
                if (isAdmin && text === "📊 Statistika") {
                    const users = await getAll<TelegramUser>('tg_users');
                    const totalUsers = users.length;
                    const orderedUsers = users.filter(u => u.hasOrdered || (u.orders && u.orders.length > 0)).length;
                    const active24h = users.filter(u => u.lastActive && (Date.now() - u.lastActive < 24 * 60 * 60 * 1000)).length;
                    const msg = `📊 <b>Bot Statistikasi:</b>\n\n` + `👥 Jami foydalanuvchilar: <b>${totalUsers}</b>\n` + `🛒 Buyurtma berganlar: <b>${orderedUsers}</b>\n` + `🔥 Oxirgi 24 soatda faol: <b>${active24h}</b>`;
                    await sendTelegramMessage(botToken, chatId, msg, { parse_mode: 'HTML', reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) });
                    continue;
                }

                if (isAdmin && text === "💬 Chatlar") {
                    const users = await getAll<TelegramUser>('tg_users');
                    const sessions = await getAll<ChatSession>('sessions');
                    const sessionIds = new Set(sessions.map(s => s.id));

                    const activeUsers = users
                        .filter(u => {
                            const isValidId = /^\d+$/.test(u.id) || u.id.startsWith('web-') || u.id.startsWith('user-');
                            return isValidId && sessionIds.has(u.id);
                        })
                        .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
                    
                    if (activeUsers.length === 0) {
                        await sendTelegramMessage(botToken, chatId, "📭 Hozircha xabar yozganlar yo'q.");
                    } else {
                        const kb = generateUserListKeyboard(activeUsers, 0);
                        await sendTelegramMessage(botToken, chatId, "👥 <b>Xabar yozganlar ro'yxati:</b>\nBatafsil ma'lumot va javob yozish uchun tanlang:", { parse_mode: 'HTML', reply_markup: kb });
                    }
                    continue;
                }

                if (text === botConfig.menuButtons.announcements || text === "📢 E'lonlar") {
                    if (isAdmin && state?.mode !== 'client') {
                        // Admin Menu for Announcements
                        const kb = {
                            inline_keyboard: [
                                [{ text: "➕ Yangi E'lon Yaratish", callback_data: "ann_menu_create" }],
                                [{ text: "📋 E'lonlarni Ko'rish/O'chirish", callback_data: "ann_menu_list" }]
                            ]
                        };
                        await sendTelegramMessage(botToken, chatId, "📢 <b>E'lonlar Bo'limi</b>\n\nTanlang:", { parse_mode: 'HTML', reply_markup: kb });
                    } else {
                        const announcements = await getAll<Announcement>('announcements');
                        const activeAnns = announcements.filter(a => a.status === 'sent' || a.status === 'pending').sort((a,b) => b.createdAt - a.createdAt);
                        if (activeAnns.length === 0) {
                            await sendTelegramMessage(botToken, chatId, "📭 Hozircha e'lonlar yo'q.", { reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) });
                        } else {
                            // Pass isAdmin=true to show delete button
                            await sendAnnouncementView(botToken, chatId, activeAnns[0], 0, activeAnns.length, isAdmin);
                        }
                    }
                    continue;
                }

                if (isAdmin && state.step === 'ANNOUNCE_INPUT') {
                    if (text === botConfig.inlineButtons.cancel) {
                        state.step = 'IDLE'; state.tempAnnouncement = null; await saveBotState(chatId, state); await sendTelegramMessage(botToken, chatId, "Bekor qilindi", { reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) }); continue; }
                    if (text === "✅ Nashr qilish (Publish)") {
                        if (!state.tempAnnouncement || (!state.tempAnnouncement.caption && state.tempAnnouncement.mediaItems.length === 0)) { await sendTelegramMessage(botToken, chatId, "❌ E'lon bo'sh. Iltimos nimadir yuboring."); continue; }
                        state.step = 'ANNOUNCE_CONFIRM'; await saveBotState(chatId, state);
                        const previewCaption = `<b>PREVIEW:</b>\n\n${escapeHTML(state.tempAnnouncement.caption || '')}`;
                        if (state.tempAnnouncement.mediaItems.length > 0) {
                                if (state.tempAnnouncement.mediaItems.length > 1) { await sendTelegramMediaGroup(botToken, chatId, state.tempAnnouncement.mediaItems, previewCaption, { parse_mode: 'HTML' }); } 
                                else { const m = state.tempAnnouncement.mediaItems[0]; if (m.type === 'video') await sendTelegramVideo(botToken, chatId, m.url, previewCaption, { parse_mode: 'HTML' }); else await sendTelegramPhoto(botToken, chatId, m.url, previewCaption, { parse_mode: 'HTML' }); }
                        } else { await sendTelegramMessage(botToken, chatId, previewCaption, { parse_mode: 'HTML' }); }
                        const kb = { inline_keyboard: [[{ text: "✅ Tasdiqlash va Yuborish", callback_data: "ann_confirm" }], [{ text: "❌ Bekor qilish", callback_data: "ann_cancel" }]] };
                        await sendTelegramMessage(botToken, chatId, "Barchaga yuborilsinmi?", { reply_markup: kb }); continue;
                    }
                    if (!state.tempAnnouncement) state.tempAnnouncement = { mediaItems: [], caption: '' };
                    if (message.caption || (text && !message.photo && !message.video)) { state.tempAnnouncement.caption = message.caption || text; }
                    if (message.photo) { const fileId = message.photo[message.photo.length - 1].file_id; state.tempAnnouncement.mediaItems.push({ type: 'photo', url: fileId }); } else if (message.video) { state.tempAnnouncement.mediaItems.push({ type: 'video', url: message.video.file_id }); }
                    await saveBotState(chatId, state);
                    const count = state.tempAnnouncement.mediaItems.length; const hasText = !!state.tempAnnouncement.caption;
                    await sendTelegramMessage(botToken, chatId, `📥 Qabul qilindi.\n📸 Media: ${count} ta\n📝 Matn: ${hasText ? 'Bor' : "Yo'q"}\n\nDavom eting yoki 'Nashr qilish' ni bosing.`); continue;
                }

                if (isAdmin && state.step === 'ADMIN_REPLY_USER' && state.replyTargetId) {
                    const targetId = state.replyTargetId;
                    
                    if (text === botConfig.inlineButtons.cancel || text === "/cancel") {
                            state.step = 'IDLE';
                            state.replyTargetId = null;
                            await saveBotState(chatId, state);
                            await sendTelegramMessage(botToken, chatId, "🚫 Bekor qilindi.", { reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) });
                            continue;
                    }

                    let success = false;
                    const isWebUser = targetId.startsWith('web-') || targetId.startsWith('user-');

                    try {
                        if (isWebUser) {
                            let mediaType: ChatMessage['mediaType'] = undefined;
                            let mediaUrl: string | undefined = undefined;

                            if (message.photo) { const fileId = message.photo[message.photo.length - 1].file_id; mediaUrl = await downloadTelegramFile(fileId, botToken, 'image/jpeg'); mediaType = 'photo'; } 
                            else if (message.video) { const fileId = message.video.file_id; mediaUrl = await downloadTelegramFile(fileId, botToken, 'video/mp4'); mediaType = 'video'; }

                            await sendMessage(targetId, text, 'admin', message.message_id, mediaUrl || undefined, mediaType);
                            success = true;
                        } else {
                            if (message.text) { await sendTelegramMessage(botToken, targetId, message.text); success = true; } 
                            else if (message.photo) { await sendTelegramPhoto(botToken, targetId, message.photo[message.photo.length - 1].file_id, message.caption); success = true; } 
                            else if (message.video) { await sendTelegramVideo(botToken, targetId, message.video.file_id, message.caption); success = true; } 
                            else if (message.voice) { await fetch(`https://api.telegram.org/bot${botToken}/copyMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: targetId, from_chat_id: chatId, message_id: message.message_id }) }); success = true; }
                        }
                        
                        if (success) {
                            if (!isWebUser) { await sendMessage(targetId, text || (message.caption ?? '[Media]'), 'admin', message.message_id, undefined, undefined); }
                            await sendTelegramMessage(botToken, chatId, "✅ Xabar yuborildi!", { reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) });
                            state.step = 'IDLE'; state.replyTargetId = null; await saveBotState(chatId, state);
                        } else { await sendTelegramMessage(botToken, chatId, "⚠️ Format qo'llab-quvvatlanmaydi. Matn, Rasm, Video yoki Ovozli xabar yuboring."); }
                    } catch (e) {
                        await sendTelegramMessage(botToken, chatId, "❌ Yuborishda xatolik. Foydalanuvchi bloklagan bo'lishi mumkin.");
                        state.step = 'IDLE'; state.replyTargetId = null; await saveBotState(chatId, state);
                    }
                    continue;
                }

                if (state.step === 'CHECKOUT_PHONE') {
                    if (message.contact || (text && text.length > 9)) {
                        const phone = message.contact ? message.contact.phone_number : text;
                        state.checkoutData = { ...state.checkoutData, phone };
                        state.step = 'CHECKOUT_LOCATION';
                        await saveBotState(chatId, state);
                        await sendTelegramMessage(botToken, chatId, botConfig.messages.locationPrompt, { parse_mode: 'HTML', reply_markup: LOCATION_KEYBOARD });
                    } else {
                        await sendTelegramMessage(botToken, chatId, "❌ Iltimos telefon raqamingizni to'g'ri kiriting yoki 'Raqamni yuborish' tugmasini bosing.");
                    }
                    continue;
                }

                if (state.step === 'CHECKOUT_LOCATION') {
                    let loc = text;
                    if (text === botConfig.inlineButtons.skip) { loc = "Kiritilmagan"; } else if (message.location) { loc = `Loc: ${message.location.latitude},${message.location.longitude}`; }
                    state.checkoutData = { ...state.checkoutData, location: loc };
                    const cart = state.cart || [];
                    if (cart.length > 0) {
                        const orderId = `ORD-${Date.now().toString().slice(-6)}`;
                        let itemsSummary = "";
                        let totalUZS = 0; let totalUSD = 0;
                        cart.forEach((item: any) => {
                            const itemTotal = item.price * item.quantity;
                            if (item.currency === 'USD') totalUSD += itemTotal; else totalUZS += itemTotal;
                            itemsSummary += `${item.name} (${item.quantity}x)\n`;
                        });
                        let totalStr = "";
                        if(totalUZS > 0) totalStr += `${totalUZS.toLocaleString()} UZS`;
                        if(totalUSD > 0) totalStr += (totalStr ? " + " : "") + `$${totalUSD.toLocaleString()}`;
                        const newOrder: Order = { id: orderId, date: Date.now(), itemsSummary, totalAmount: totalStr, source: 'bot', status: 'new', userId: String(chatId), userPhone: state.checkoutData.phone, location: loc };
                        await trackTgUser(String(chatId), { hasOrdered: true, orders: [newOrder], phone: state.checkoutData.phone });
                        const adminMsg = `🆕 <b>YANGI BUYURTMA (BOT)</b> #${orderId}\n\n👤 ${escapeHTML(message.from?.first_name)} (@${message.from?.username || '-'})\n📞 ${state.checkoutData.phone}\n📍 ${state.checkoutData.location}\n\n🛒 <b>Buyurtma:</b>\n${escapeHTML(itemsSummary)}\n💰 Jami: ${totalStr}`;
                        for (const adminId of adminIds) { await sendTelegramMessage(botToken, adminId, adminMsg, { parse_mode: 'HTML' }); }
                        await sendTelegramMessage(botToken, chatId, `${botConfig.messages.orderSuccess} (#${orderId})`, { reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) });
                        await saveBotState(chatId, { step: 'IDLE', cart: [], mode: state.mode });
                    }
                    continue;
                }

                if (state.step === 'WAITING_EDIT_IMAGE_ADD' && state.editingProductId) {
                    // ... (keep existing image logic) ...
                    let fileId = '';
                    if (message.photo) { fileId = message.photo[message.photo.length - 1].file_id; }
                    else if (message.document && message.document.mime_type?.startsWith('image/')) { fileId = message.document.file_id; }
                    if (fileId) {
                        const product = await get<Treatment>('treatments', state.editingProductId);
                        if (product) {
                            await sendTelegramMessage(botToken, chatId, "⏳ Yuklanmoqda...");
                            const base64 = await downloadTelegramFile(fileId, botToken, 'image/jpeg');
                            if (base64) {
                                const currentImages = product.images || (product.imageUrl ? [product.imageUrl] : []);
                                const updatedImages = [...currentImages, base64];
                                const updatedImageUrl = product.imageUrl || (base64.includes(',') ? base64.split(',')[1] : base64);
                                const updatedProduct = { ...product, images: updatedImages, imageUrl: updatedImageUrl };
                                await saveTreatment(updatedProduct);
                                await sendTelegramMessage(botToken, chatId, `✅ Rasm qo'shildi! Jami: ${updatedImages.length} ta.`);
                                const kb = { inline_keyboard: [
                                    [{ text: "➕ Yana rasm qo'shish", callback_data: `edit_img_add_${product.id}` }], 
                                    [{ text: "👁 Rasmlarni ko'rish/o'chirish", callback_data: `edit_img_list_${product.id}` }],
                                    [{ text: "🗑 Hammasini o'chirish", callback_data: `edit_img_clear_${product.id}` }], 
                                    [{ text: "🔙 Maxsulotga qaytish", callback_data: `edit_prod_${product.id}` }]
                                ]};
                                await sendTelegramMessage(botToken, chatId, "Yana nima qilamiz?", { reply_markup: kb });
                            } else { await sendTelegramMessage(botToken, chatId, "❌ Xatolik. Qayta urining."); }
                        }
                        state.step = 'IDLE'; state.editingProductId = null; await saveBotState(chatId, state);
                    } else { await sendTelegramMessage(botToken, chatId, "❌ Iltimos rasm yuboring.", { reply_markup: CANCEL_BACK_KEYBOARD }); }
                    continue;
                }

                // ... (keep rest of handlers: WAITING_EDIT_PRICE, WAITING_EDIT_VALUE, etc) ...
                if (state.step === 'WAITING_EDIT_PRICE' && state.editingProductId) {
                    const price = parseFloat(text.replace(/,/g, '.').replace(/[^0-9.]/g, ''));
                    if (isNaN(price)) { await sendTelegramMessage(botToken, chatId, "❌ Iltimos, narxni to'g'ri kiriting."); continue; }
                    state.tempEditPrice = price; state.step = 'WAITING_EDIT_CURRENCY'; await saveBotState(chatId, state);
                    const kb = { inline_keyboard: [[{ text: "🇺🇿 UZS", callback_data: "edit_curr_UZS" }, { text: "🇺🇸 USD", callback_data: "edit_curr_USD" }]] };
                    await sendTelegramMessage(botToken, chatId, `💰 Narx: ${price}\nEndi valyutani tanlang:`, { reply_markup: kb }); continue;
                }

                if (state.step === 'WAITING_EDIT_VALUE' && state.editingProductId && state.editingField) {
                    const product = await get<Treatment>('treatments', state.editingProductId);
                    if (product) {
                        const updatedProduct = { ...product, [state.editingField]: text };
                        await saveTreatment(updatedProduct);
                        await sendTelegramMessage(botToken, chatId, `✅ <b>${escapeHTML(updatedProduct.name)}</b> yangilandi!`, { parse_mode: 'HTML' });
                        const kb = { inline_keyboard: [[{ text: `📝 Nomi: ${updatedProduct.name}`, callback_data: `edit_field_name_${updatedProduct.id}` }], [{ text: `💰 Narxi: ${updatedProduct.price} ${updatedProduct.currency || 'UZS'}`, callback_data: `edit_field_price_${updatedProduct.id}` }], [{ text: `🖼 Rasmlar (${updatedProduct.images?.length || (product.imageUrl ? 1 : 0)})`, callback_data: `edit_field_images_${updatedProduct.id}` }], [{ text: `📄 Tavsif`, callback_data: `edit_field_description_${updatedProduct.id}` }], [{ text: `🗑 O'chirish`, callback_data: `edit_delete_${updatedProduct.id}` }], [{ text: "🔙 Ortga", callback_data: `edit_pick_cat` }]]};
                        await sendTelegramMessage(botToken, chatId, "Yana nimani o'zgartiramiz?", { reply_markup: kb });
                        state.step = 'IDLE'; state.editingProductId = null; state.editingField = null; await saveBotState(chatId, state);
                    }
                    continue;
                }

                if (state.step === 'WAITING_QTY_INPUT' && state.tempProductId) {
                    const qty = parseInt(text.replace(/\D/g, ''));
                    if (qty && qty > 0) {
                        const product = await get<Treatment>('treatments', state.tempProductId);
                        if (product) {
                            const currentCart = state.cart || [];
                            const existing = currentCart.find((i:any) => i.id === product.id);
                            if (existing) existing.quantity += qty;
                            else currentCart.push({ ...product, quantity: qty, cartId: `c-${Date.now()}` });
                            state.cart = currentCart;
                            state.step = 'IDLE'; 
                            await saveBotState(chatId, state);
                            await trackTgUser(String(chatId), { cartAddCount: 1 });
                            await sendTelegramMessage(botToken, chatId, `✅ <b>${escapeHTML(product.name)}</b> (${qty} dona) savatchaga qo'shildi!`, { parse_mode: 'HTML', reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) });
                        }
                    } else { await sendTelegramMessage(botToken, chatId, "❌ Iltimos, to'g'ri son kiriting.", { reply_markup: CANCEL_BACK_KEYBOARD }); }
                    continue;
                }

                if (text === botConfig.menuButtons.contactAdmin) { 
                    await saveBotState(chatId, { step: 'WAITING_SUPPORT_MSG', mode: state.mode }); 
                    await sendTelegramMessage(botToken, chatId, botConfig.messages.contactPrompt, { parse_mode: 'HTML', reply_markup: CANCEL_BACK_KEYBOARD }); 
                    continue; 
                }
                
                if (state.step === 'WAITING_SUPPORT_MSG') {
                    if (getIgnoredCommands(botConfig).includes(text)) {
                        state.step = 'IDLE';
                        await saveBotState(chatId, state);
                    } else {
                        if (!isAdmin && (message.photo || message.video || message.voice || message.document || message.sticker)) {
                            await deleteTelegramMessage(botToken, chatId, message.message_id);
                            await sendTelegramMessage(botToken, chatId, "⚠️ <b>Kechirasiz, faqat matnli xabarlar qabul qilinadi.</b>\nIltimos, savolingizni yozma ravishda yuboring.", { parse_mode: 'HTML' });
                            continue;
                        }
                        const userLabel = message.from?.username ? `@${message.from.username}` : `ID: ${chatId}`;
                        for(const adminId of adminIds) {
                            try {
                                await sendTelegramMessage(botToken, adminId, `📨 <b>Xabar (${escapeHTML(userLabel)}):</b>`, { parse_mode: 'HTML' });
                                await fetch(`https://api.telegram.org/bot${botToken}/copyMessage`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ chat_id: adminId, from_chat_id: chatId, message_id: message.message_id })
                                });
                            } catch (e) { console.error("Failed to forward to admin", e); }
                        }
                        state.step = 'IDLE';
                        if (message.media_group_id) { state.lastAllowedMediaGroupId = message.media_group_id; }
                        await saveBotState(chatId, state);
                        await sendTelegramMessage(botToken, chatId, botConfig.messages.supportResponse, { parse_mode: 'HTML', reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) });
                        continue;
                    }
                }

                if (isTrailingMediaGroup) {
                    const userLabel = message.from?.username ? `@${message.from.username}` : `ID: ${chatId}`;
                    for(const adminId of adminIds) {
                        try {
                            await fetch(`https://api.telegram.org/bot${botToken}/copyMessage`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ chat_id: adminId, from_chat_id: chatId, message_id: message.message_id })
                            });
                        } catch (e) {}
                    }
                    continue; 
                }

                if (text === botConfig.menuButtons.products) {
                    const categories = await getAll<Category>('categories');
                    const products = await getAll<Treatment>('treatments');
                    if (categories.length === 0 && products.length === 0) { 
                        await sendTelegramMessage(botToken, chatId, "📭 Hozircha mahsulotlar yo'q."); 
                    } else {
                        const kb = { inline_keyboard: [] as any[] };
                        if (categories.length > 0) {
                            categories.forEach(c => {
                                kb.inline_keyboard.push([{ text: c.name, callback_data: `client_pick_cat_${c.id}_page_0` }]);
                            });
                        }
                        kb.inline_keyboard.push([{ text: "📋 Barchasi", callback_data: "client_pick_cat_all_page_0" }]);
                        await sendTelegramMessage(botToken, chatId, "📂 <b>Bo'limni tanlang:</b>", { parse_mode: 'HTML', reply_markup: kb });
                    }
                    continue;
                }

                if (text === botConfig.menuButtons.cart) { await renderTelegramCart(botToken, chatId, state.cart || [], botConfig); continue; }

                if (isAdmin) {
                    if (text === "✏️ Tahrirlash") {
                        const products = await getAll<Treatment>('treatments');
                        const categories = await getAll<Category>('categories');
                        if (products.length === 0) { await sendTelegramMessage(botToken, chatId, "📭 Hozircha mahsulotlar yo'q."); } 
                        else {
                            const kb = { inline_keyboard: [] as any[] };
                            categories.forEach(c => { kb.inline_keyboard.push([{ text: c.name, callback_data: `edit_pick_cat_${c.id}` }]); });
                            const hasUncategorized = products.some(p => !p.category);
                            if (hasUncategorized) { kb.inline_keyboard.push([{ text: "📂 Kategoriyasiz", callback_data: `edit_pick_cat_uncategorized` }]); }
                            kb.inline_keyboard.push([{ text: "📋 Barchasi", callback_data: "edit_pick_cat_all" }]);
                            state.editingProductId = null;
                            await saveBotState(chatId, state);
                            await sendTelegramMessage(botToken, chatId, "✏️ <b>Qaysi bo'limdan mahsulotni tahrirlaysiz?</b>", { parse_mode: 'HTML', reply_markup: kb });
                        }
                        continue;
                    }
                    if (text === "👤 Client Mode") { state.mode = 'client'; await saveBotState(chatId, state); await sendTelegramMessage(botToken, chatId, "👁 <b>Mijoz ko'rinishiga o'tildi.</b>\nSiz hozir mijoz menyusidasiz. Admin panelga qaytish uchun pastdagi tugmani bosing.", { parse_mode: 'HTML', reply_markup: CLIENT_MODE_MENU }); continue; }
                    if (text === botConfig.menuButtons.adminPanel) { state.mode = 'admin'; await saveBotState(chatId, state); await sendTelegramMessage(botToken, chatId, "👨‍⚕️ <b>Admin paneliga qaytildi.</b>", { parse_mode: 'HTML', reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) }); continue; }
                    if (text === "📂 Yangi bo'lim") { await saveBotState(chatId, { step: 'ADD_CATEGORY_NAME', mode: state.mode }); await sendTelegramMessage(botToken, chatId, "📂 <b>Yangi bo'lim nomini yozing:</b>", { parse_mode: 'HTML', reply_markup: CANCEL_BACK_KEYBOARD }); continue; }
                    if (state.step === 'ADD_CATEGORY_NAME') { const newCat: Category = { id: `cat-${Date.now()}`, name: text }; await saveCategory(newCat); await sendTelegramMessage(botToken, chatId, `✅ <b>"${escapeHTML(text)}"</b> bo'limi yaratildi!`, { parse_mode: 'HTML', reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) }); await saveBotState(chatId, { step: 'IDLE', mode: state.mode }); }
                    else if (state.step === 'ADD_NAME') { state.tempProduct.name = text; state.step = 'ADD_PRICE'; await saveBotState(chatId, state); await sendTelegramMessage(botToken, chatId, "💰 <b>Narxi (Masalan: 120.50):</b>", { parse_mode: 'HTML', reply_markup: CANCEL_BACK_KEYBOARD }); }
                    else if (state.step === 'ADD_PRICE') { let rawPrice = text.replace(/,/g, '.').replace(/\s/g, ''); const price = parseFloat(rawPrice.replace(/[^0-9.]/g, '')); if (!isNaN(price)) { state.tempProduct.price = price; state.step = 'ADD_CURRENCY'; await saveBotState(chatId, state); const kb = { keyboard: [[{ text: "🇺🇿 UZS" }, { text: "🇺🇸 USD" }], [{ text: botConfig.inlineButtons.cancel }]], resize_keyboard: true, one_time_keyboard: true }; await sendTelegramMessage(botToken, chatId, "💵 <b>Valyutani tanlang:</b>", { parse_mode: 'HTML', reply_markup: kb }); } else { await sendTelegramMessage(botToken, chatId, "❌ Iltimos to'g'ri son kiriting."); } }
                    else if (state.step === 'ADD_CURRENCY') { if (text === "🇺🇿 UZS" || text === "🇺🇸 USD") { const curr = text === "🇺🇿 UZS" ? "UZS" : "USD"; state.tempProduct.currency = curr; state.step = 'ADD_DESC'; await saveBotState(chatId, state); await sendTelegramMessage(botToken, chatId, `💵 Valyuta: ${curr}\n\n📝 <b>Mahsulot haqida ma'lumot (tavsif) yozing:</b>`, { parse_mode: 'HTML', reply_markup: CANCEL_BACK_KEYBOARD }); } else { await sendTelegramMessage(botToken, chatId, "❌ Iltimos tugmalardan foydalaning.", { reply_markup: { keyboard: [[{ text: "🇺🇿 UZS" }, { text: "🇺🇸 USD" }], [{ text: botConfig.inlineButtons.cancel }]], resize_keyboard: true, one_time_keyboard: true } }); } }
                    else if (state.step === 'ADD_DESC') { state.tempProduct.description = text; state.step = 'ADD_IMAGES'; state.tempProduct.images = []; await saveBotState(chatId, state); await sendTelegramMessage(botToken, chatId, "📸 <b>Mahsulot rasmini yoki videosini yuboring.</b>\n(Bir nechta bo'lishi mumkin). Tugatgach 'Tayyor' bosing:\n\n🔄 Rasmlarni tozalash: 'Rasmlarni tozalash' deb yozing", { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: "✅ Tayyor", callback_data: "prod_img_done" }], [{ text: "🔄 Rasmlarni tozalash", callback_data: "prod_img_clear" }]] } }); }
                    else if (state.step === 'ADD_IMAGES') { 
                        if (text === "Rasmlarni tozalash") { state.tempProduct.images = []; await saveBotState(chatId, state); await sendTelegramMessage(botToken, chatId, "🗑 Rasmlar tozalandi. Yangi rasm yuboring:", { reply_markup: { inline_keyboard: [[{ text: "✅ Tayyor", callback_data: "prod_img_done" }], [{ text: "🔄 Rasmlarni tozalash", callback_data: "prod_img_clear" }]] } }); continue; }
                        let fileId = ''; let type: 'photo' | 'video' = 'photo';
                        if (message.photo) { fileId = message.photo[message.photo.length - 1].file_id; type = 'photo'; } else if (message.video) { fileId = message.video.file_id; type = 'video'; } else if (message.document) { const mime = message.document.mime_type || ''; if (mime.startsWith('image/')) { fileId = message.document.file_id; type = 'photo'; } else if (mime.startsWith('video/')) { fileId = message.document.file_id; type = 'video'; } }
                        if (fileId) { await sendTelegramMessage(botToken, chatId, "⏳ Yuklanmoqda..."); const targetMime = type === 'video' ? 'video/mp4' : 'image/jpeg'; let b64 = await downloadTelegramFile(fileId, botToken, targetMime); if(!b64) b64 = await downloadTelegramFile(fileId, botToken, targetMime); if (b64) { state.tempProduct.images = state.tempProduct.images || []; state.tempProduct.images.push(b64); await saveBotState(chatId, state); await sendTelegramMessage(botToken, chatId, `📥 Media qabul qilindi (${state.tempProduct.images.length} ta). Yana yuboring yoki 'Tayyor' ni bosing:`, { reply_markup: { inline_keyboard: [[{ text: "✅ Tayyor", callback_data: "prod_img_done" }], [{ text: "🔄 Rasmlarni tozalash", callback_data: "prod_img_clear" }]] } }); } else { await sendTelegramMessage(botToken, chatId, "⚠️ Rasm yuklashda xatolik (Proxy limit). Iltimos, qayta urinib ko'ring yoki 'Tayyor' tugmasini bosing (rasmsiz saqlanadi).", { reply_markup: { inline_keyboard: [[{ text: "✅ Tayyor", callback_data: "prod_img_done" }], [{ text: "🔄 Rasmlarni tozalash", callback_data: "prod_img_clear" }]] } }); } } 
                    }
                    else if (text === '/start') { await saveBotState(chatId, { step: 'IDLE', mode: state.mode }); await sendTelegramMessage(botToken, chatId, `👨‍⚕️ <b>Assalomu alaykum, Admin ${escapeHTML(message.from?.first_name)}!</b>`, { parse_mode: 'HTML', reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) }); }
                    else if (text === "➕ Yangi mahsulot") { const categories = await getAll<Category>('categories'); const catButtons = categories.map(c => [{ text: c.name, callback_data: `prod_cat_${c.id}` }]); catButtons.push([{ text: "📂 Kategoriyasiz (Umumiy)", callback_data: "prod_cat_uncategorized" }]); await saveBotState(chatId, { step: 'ADD_CATEGORY', tempProduct: {}, mode: state.mode }); await sendTelegramMessage(botToken, chatId, "📂 <b>Mahsulot kategoriyasini tanlang:</b>", { parse_mode: 'HTML', reply_markup: { inline_keyboard: catButtons } }); }
                } else {
                    if (text === '/start') { 
                        await saveBotState(chatId, { step: 'IDLE', cart: [] }); 
                        const user = message.from;
                        const greetingText = processGreeting(botConfig.welcomeMessage, user);
                        const inlineKeyboard = [];
                        if (botConfig.welcomeButtons && botConfig.welcomeButtons.length > 0) {
                            botConfig.welcomeButtons.forEach(btn => {
                                inlineKeyboard.push([{ text: btn.text, url: btn.url }]);
                            });
                        }
                        await sendTelegramMessage(botToken, chatId, greetingText, { parse_mode: 'HTML', reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined }); 
                        await sendTelegramMessage(botToken, chatId, "👇 Quyidagi menyudan kerakli bo'limni tanlang:", { parse_mode: 'HTML', reply_markup: getMenu(isAdmin, isSuperAdmin, state, botConfig) });
                    }
                }
            }
            
            if (callbackQuery) {
                    const chatId = callbackQuery.message.chat.id;
                    const cbData = callbackQuery.data;
                    const isAdmin = adminIds.includes(String(chatId));
                    const isSuperAdmin = String(chatId) === TELEGRAM_ADMIN_ID;
                    const state = await getBotState(chatId);
                    const answerCb = async (text?: string, showAlert = false) => { try { await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ callback_query_id: callbackQuery.id, text, show_alert: showAlert }) }); } catch (e) {} };

                    // ... (keep existing callback handling) ...
                    if (cbData.startsWith('ann_view_')) { await answerCb(); const index = parseInt(cbData.replace('ann_view_', '')); const announcements = await getAll<Announcement>('announcements'); const activeAnns = announcements.filter(a => a.status === 'sent' || a.status === 'pending').sort((a,b) => b.createdAt - a.createdAt); if (index >= 0 && index < activeAnns.length) { const ann = activeAnns[index]; await sendAnnouncementView(botToken, chatId, ann, index, activeAnns.length, isAdmin); } }
                    else if (cbData.startsWith('ann_delete_')) {
                        if (!isAdmin) return;
                        const annId = cbData.replace('ann_delete_', '');
                        await deleteAnnouncement(annId);
                        await answerCb("E'lon o'chirildi", true);
                        await editTelegramMessageRaw(botToken, chatId, callbackQuery.message.message_id, "🗑 E'lon muvaffaqiyatli o'chirildi.");
                    }
                    else if (cbData === 'ann_menu_create') {
                        await answerCb();
                        state.tempAnnouncement = { mediaItems: [], caption: '' };
                        state.step = 'ANNOUNCE_INPUT';
                        await saveBotState(chatId, state);
                        const kb = { keyboard: [[{ text: "✅ Nashr qilish (Publish)" }], [{ text: botConfig.inlineButtons.cancel }]], resize_keyboard: true };
                        await sendTelegramMessage(botToken, chatId, "📢 <b>Yangi e'lon yaratish</b>\n\nMatn yozing yoki Rasm/Video yuboring.\nBir nechta fayl yuborishingiz mumkin.\n\nTayyor bo'lgach '✅ Nashr qilish' tugmasini bosing.", { parse_mode: 'HTML', reply_markup: kb });
                    }
                    else if (cbData === 'ann_menu_list') {
                        await answerCb();
                        const announcements = await getAll<Announcement>('announcements');
                        const activeAnns = announcements.filter(a => a.status === 'sent' || a.status === 'pending').sort((a,b) => b.createdAt - a.createdAt);
                        if (activeAnns.length === 0) {
                            await sendTelegramMessage(botToken, chatId, "📭 Hozircha e'lonlar yo'q.");
                        } else {
                            await sendAnnouncementView(botToken, chatId, activeAnns[0], 0, activeAnns.length, isAdmin);
                        }
                    }
                    else if (cbData === 'cart_clear') { await answerCb("Savatcha tozalandi"); state.cart = []; await saveBotState(chatId, state); await editTelegramMessageRaw(botToken, chatId, callbackQuery.message.message_id, "🗑 Savatcha tozalandi."); }
                    else if (cbData === 'checkout_start') { await answerCb(); state.step = 'CHECKOUT_PHONE'; state.checkoutData = {}; await saveBotState(chatId, state); const kb = { keyboard: [[{ text: botConfig.inlineButtons.sendContact, request_contact: true }], [{ text: botConfig.inlineButtons.cancel }]], resize_keyboard: true, one_time_keyboard: true }; await sendTelegramMessage(botToken, chatId, botConfig.messages.checkoutPrompt, { parse_mode: 'HTML', reply_markup: kb }); }
                    
                    else if (cbData.startsWith('admin_chat_')) {
                        const targetId = cbData.replace('admin_chat_', '');
                        await answerCb();
                        await renderAdminChatHistory(botToken, chatId, callbackQuery.message.message_id, targetId, -1);
                    }
                    else if (cbData.startsWith('hist_')) {
                        const parts = cbData.split('_');
                        const targetId = parts[1];
                        const page = parseInt(parts[2]);
                        await answerCb();
                        await renderAdminChatHistory(botToken, chatId, callbackQuery.message.message_id, targetId, page);
                    }
                    else if (cbData.startsWith('reply_')) {
                        const targetId = cbData.replace('reply_', '');
                        await answerCb();
                        state.step = 'ADMIN_REPLY_USER';
                        state.replyTargetId = targetId;
                        await saveBotState(chatId, state);
                        
                        const user = await get<TelegramUser>('tg_users', targetId);
                        const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : targetId;
                        
                        await sendTelegramMessage(botToken, chatId, `📝 <b>${escapeHTML(name)}</b> ga javob yozish:\n\nXabaringizni yozing yoki rasm/video yuboring.`, { parse_mode: 'HTML', reply_markup: CANCEL_BACK_KEYBOARD });
                    }
                    else if (cbData.startsWith('admin_block_')) {
                        const targetId = cbData.replace('admin_block_', '');
                        const isNowBlocked = await toggleSessionBlock(targetId);
                        await answerCb(isNowBlocked ? "Foydalanuvchi bloklandi" : "Foydalanuvchi blokdan chiqarildi", true);
                        await renderAdminChatHistory(botToken, chatId, callbackQuery.message.message_id, targetId, -1);
                    }
                    else if (cbData.startsWith('admin_clear_')) {
                        const targetId = cbData.replace('admin_clear_', '');
                        await deleteFullChatHistory(targetId);
                        await answerCb("Tarix o'chirildi", true);
                        await renderAdminChatHistory(botToken, chatId, callbackQuery.message.message_id, targetId, -1);
                    }
                    else if (cbData.startsWith('admin_users_page_')) {
                        const page = parseInt(cbData.replace('admin_users_page_', ''));
                        const users = await getAll<TelegramUser>('tg_users');
                        const sessions = await getAll<ChatSession>('sessions');
                        const sessionIds = new Set(sessions.map(s => s.id));

                        const activeUsers = users
                        .filter(u => {
                             const isValidId = /^\d+$/.test(u.id) || u.id.startsWith('web-') || u.id.startsWith('user-');
                             return isValidId && sessionIds.has(u.id);
                        })
                        .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
                        const kb = generateUserListKeyboard(activeUsers, page);
                        await editTelegramMessageRaw(botToken, chatId, callbackQuery.message.message_id, "👥 <b>Xabar yozganlar ro'yxati:</b>", { parse_mode: 'HTML', reply_markup: kb });
                    }
                    else if (cbData === 'ann_confirm') {
                        if (state.tempAnnouncement) {
                            state.tempAnnouncement.status = 'pending';
                            state.tempAnnouncement.createdAt = Date.now();
                            state.tempAnnouncement.scheduledTime = Date.now();
                            state.tempAnnouncement.sentTo = [];
                            state.tempAnnouncement.id = `ann-${Date.now()}`;
                            state.tempAnnouncement.frequency = 'once';
                            state.tempAnnouncement.currentRepeatCount = 0;
                            await saveAnnouncement(state.tempAnnouncement);
                            await answerCb("E'lon rejalashtirildi!", true);
                            state.tempAnnouncement = null;
                            state.step = 'IDLE';
                            await saveBotState(chatId, state);
                            await editTelegramMessageRaw(botToken, chatId, callbackQuery.message.message_id, "✅ E'lon yuborish uchun navbatga qo'yildi.");
                        }
                    }
                    else if (cbData === 'ann_cancel') {
                        state.tempAnnouncement = null;
                        state.step = 'IDLE';
                        await saveBotState(chatId, state);
                        await answerCb("Bekor qilindi");
                        await editTelegramMessageRaw(botToken, chatId, callbackQuery.message.message_id, "🚫 Bekor qilindi.");
                    }
                    else if (cbData.startsWith('prod_cat_')) {
                        const catId = cbData.replace('prod_cat_', '');
                        const categories = await getAll<Category>('categories');
                        const cat = categories.find(c => c.id === catId);
                        state.tempProduct = state.tempProduct || {};
                        state.tempProduct.category = cat ? cat.name : ''; 
                        state.step = 'ADD_NAME';
                        await saveBotState(chatId, state);
                        await answerCb();
                        await sendTelegramMessage(botToken, chatId, `📂 Kategoriya: ${cat ? cat.name : 'Umumiy'}\n\n📝 <b>Mahsulot nomini yozing:</b>`, { parse_mode: 'HTML', reply_markup: CANCEL_BACK_KEYBOARD });
                    }
                    else if (cbData === 'prod_img_done') {
                        if (!state.tempProduct || !state.tempProduct.name) { await sendTelegramMessage(botToken, chatId, "❌ Xatolik: Mahsulot ma'lumotlari yo'qolgan. Iltimos boshidan boshlang."); state.step = 'IDLE'; await saveBotState(chatId, state); return; }
                        const newProduct: Treatment = {
                            id: `t-${Date.now()}`,
                            name: state.tempProduct.name,
                            price: state.tempProduct.price,
                            currency: state.tempProduct.currency,
                            description: state.tempProduct.description,
                            category: state.tempProduct.category,
                            images: state.tempProduct.images || [],
                            imageUrl: state.tempProduct.images && state.tempProduct.images.length > 0 ? (state.tempProduct.images[0].includes(',') ? state.tempProduct.images[0].split(',')[1] : state.tempProduct.images[0]) : undefined
                        };
                        await saveTreatment(newProduct);
                        await answerCb("Mahsulot qo'shildi!", true);
                        await sendTelegramMessage(botToken, chatId, `✅ <b>${escapeHTML(newProduct.name)}</b> muvaffaqiyatli qo'shildi!`, { parse_mode: 'HTML', reply_markup: getMenu(true, isSuperAdmin, state, botConfig) });
                        state.step = 'IDLE'; state.tempProduct = null; await saveBotState(chatId, state);
                    }
                    else if (cbData === 'prod_img_clear') {
                        state.tempProduct.images = [];
                        await saveBotState(chatId, state);
                        await answerCb("Rasmlar tozalandi");
                        await sendTelegramMessage(botToken, chatId, "🗑 Rasmlar o'chirildi. Yangi rasm yuboring yoki 'Tayyor' tugmasini bosing.", { reply_markup: { inline_keyboard: [[{ text: "✅ Tayyor", callback_data: "prod_img_done" }]] } });
                    }
                    else if (cbData.startsWith('client_pick_cat_')) {
                        let catId = cbData.replace('client_pick_cat_', '');
                        let page = 0;
                        if (catId.includes('_page_')) {
                            const parts = catId.split('_page_');
                            catId = parts[0];
                            page = parseInt(parts[1]);
                        }

                        const products = await getAll<Treatment>('treatments');
                        const categories = await getAll<Category>('categories');
                        let filtered = products;
                        
                        if (catId !== 'all') {
                            const cat = categories.find(c => c.id === catId);
                            if (cat) {
                                filtered = products.filter(p => p.category === cat.name);
                            } else {
                                // Fallback for legacy categories
                                filtered = products.filter(p => p.category === catId);
                            }
                        }
                        
                        // Sort by newest first
                        filtered.sort((a, b) => {
                            const timeA = parseInt(a.id.split('-')[1]) || 0;
                            const timeB = parseInt(b.id.split('-')[1]) || 0;
                            return timeB - timeA;
                        });

                        if (filtered.length === 0) {
                            await answerCb("Bu bo'limda mahsulot yo'q");
                        } else {
                            await answerCb();
                            const ITEMS_PER_PAGE = 5;
                            const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                            const start = page * ITEMS_PER_PAGE;
                            const end = start + ITEMS_PER_PAGE;
                            const currentItems = filtered.slice(start, end);

                            for (const p of currentItems) {
                                const priceStr = p.currency === 'USD' ? `$${p.price}` : `${p.price.toLocaleString()} UZS`;
                                const cleanDesc = p.description ? p.description.replace(/<[^>]*>?/gm, '') : '';
                                const caption = `<b>${escapeHTML(p.name)}</b>\n\n${escapeHTML(cleanDesc)}\n\n💰 <b>Narxi:</b> ${priceStr}`;
                                const kb = { inline_keyboard: [[{ text: botConfig.inlineButtons.addToCart, callback_data: `add_cart_${p.id}` }]] };
                                
                                const images = p.images && p.images.length > 0 ? p.images : (p.imageUrl ? [p.imageUrl] : []);
                                
                                if (images.length > 1) {
                                    const mediaGroup: AnnouncementMedia[] = images.slice(0, 10).map((img) => {
                                        let url = img;
                                        if (url.startsWith('data:')) url = url.split(',')[1];
                                        if (!url.startsWith('data:') && !url.startsWith('http')) url = `data:image/jpeg;base64,${url}`;
                                        return { type: 'photo', url: url };
                                    });
                                    try {
                                        await sendTelegramMediaGroup(botToken, chatId, mediaGroup, '', {}); 
                                        await sendTelegramMessage(botToken, chatId, caption, { parse_mode: 'HTML', reply_markup: kb });
                                    } catch (e) {
                                        await sendTelegramMessage(botToken, chatId, caption, { parse_mode: 'HTML', reply_markup: kb });
                                    }
                                } else if (images.length === 1) {
                                    let img = images[0];
                                    if (img.startsWith('data:')) img = img.split(',')[1];
                                    try {
                                        await sendTelegramPhoto(botToken, chatId, img, caption, { parse_mode: 'HTML', reply_markup: kb });
                                    } catch (e) {
                                        await sendTelegramMessage(botToken, chatId, caption, { parse_mode: 'HTML', reply_markup: kb });
                                    }
                                } else {
                                    await sendTelegramMessage(botToken, chatId, caption, { parse_mode: 'HTML', reply_markup: kb });
                                }
                                await new Promise(r => setTimeout(r, 200)); 
                            }

                            if (totalPages > 1) {
                                const navRow = [];
                                if (page > 0) {
                                    navRow.push({ text: "⬅️ Oldingi", callback_data: `client_pick_cat_${catId}_page_${page - 1}` });
                                }
                                navRow.push({ text: `${page + 1} / ${totalPages}`, callback_data: 'noop' });
                                if (page < totalPages - 1) {
                                    navRow.push({ text: "Keyingi ➡️", callback_data: `client_pick_cat_${catId}_page_${page + 1}` });
                                }
                                const navKb = { inline_keyboard: [navRow] };
                                await sendTelegramMessage(botToken, chatId, "📄 <b>Sahifalar:</b>", { parse_mode: 'HTML', reply_markup: navKb });
                            }
                        }
                    }
                    else if (cbData.startsWith('add_cart_')) {
                        const prodId = cbData.replace('add_cart_', '');
                        state.tempProductId = prodId;
                        state.step = 'WAITING_QTY_INPUT';
                        await saveBotState(chatId, state);
                        await answerCb();
                        await sendTelegramMessage(botToken, chatId, "🔢 Nechta buyurtma qilmoqchisiz? Sonini yozing (masalan: 1, 2, 5):", { reply_markup: CANCEL_BACK_KEYBOARD });
                    }
                    else if (cbData.startsWith('edit_curr_')) {
                        const currency = cbData.replace('edit_curr_', '');
                        if (state.editingProductId && state.tempEditPrice !== undefined) {
                            const product = await get<Treatment>('treatments', state.editingProductId);
                            if (product) {
                                const updatedProduct = { ...product, price: state.tempEditPrice, currency: currency as 'UZS'|'USD' };
                                await saveTreatment(updatedProduct);
                                await answerCb("Narx yangilandi!", true);
                                await sendTelegramMessage(botToken, chatId, `✅ <b>${escapeHTML(updatedProduct.name)}</b> narxi yangilandi: ${updatedProduct.price} ${updatedProduct.currency}`, { parse_mode: 'HTML' });
                                const kb = { inline_keyboard: [[{ text: `📝 Nomi: ${updatedProduct.name}`, callback_data: `edit_field_name_${updatedProduct.id}` }], [{ text: `💰 Narxi: ${updatedProduct.price} ${updatedProduct.currency || 'UZS'}`, callback_data: `edit_field_price_${updatedProduct.id}` }], [{ text: `🖼 Rasmlar`, callback_data: `edit_field_images_${updatedProduct.id}` }], [{ text: `📄 Tavsif`, callback_data: `edit_field_description_${updatedProduct.id}` }], [{ text: `🗑 O'chirish`, callback_data: `edit_delete_${updatedProduct.id}` }], [{ text: "🔙 Ortga", callback_data: `edit_pick_cat` }]]};
                                await sendTelegramMessage(botToken, chatId, "Yana nimani o'zgartiramiz?", { reply_markup: kb });
                            }
                        }
                        state.step = 'IDLE'; state.editingProductId = null; state.tempEditPrice = undefined; await saveBotState(chatId, state);
                    }
                    else if (cbData.startsWith('edit_pick_cat_')) {
                        const catId = cbData.replace('edit_pick_cat_', '');
                        const products = await getAll<Treatment>('treatments');
                        const categories = await getAll<Category>('categories');
                        let filtered = products;
                        if (catId === 'uncategorized') filtered = products.filter(p => !p.category);
                        else if (catId !== 'all') {
                            const cat = categories.find(c => c.id === catId);
                            if (cat) filtered = products.filter(p => p.category === cat.name);
                        }
                        
                        if (filtered.length === 0) { await answerCb("Mahsulotlar yo'q"); return; }
                        await answerCb();
                        const kb = { inline_keyboard: filtered.map(p => [{ text: p.name, callback_data: `edit_prod_${p.id}` }]) };
                        kb.inline_keyboard.push([{ text: "🔙 Ortga", callback_data: "edit_pick_cat" }]);
                        await editTelegramMessageRaw(botToken, chatId, callbackQuery.message.message_id, "✏️ <b>Mahsulotni tanlang:</b>", { parse_mode: 'HTML', reply_markup: kb });
                    }
                    else if (cbData === 'edit_pick_cat') {
                        state.editingProductId = null;
                        await saveBotState(chatId, state);
                        
                        const categories = await getAll<Category>('categories');
                        const kb = { inline_keyboard: [] as any[] };
                        categories.forEach(c => { kb.inline_keyboard.push([{ text: c.name, callback_data: `edit_pick_cat_${c.id}` }]); });
                        kb.inline_keyboard.push([{ text: "📂 Kategoriyasiz", callback_data: `edit_pick_cat_uncategorized` }]);
                        kb.inline_keyboard.push([{ text: "📋 Barchasi", callback_data: "edit_pick_cat_all" }]);
                        await editTelegramMessageRaw(botToken, chatId, callbackQuery.message.message_id, "✏️ <b>Qaysi bo'limdan mahsulotni tahrirlaysiz?</b>", { parse_mode: 'HTML', reply_markup: kb });
                    }
                    else if (cbData.startsWith('edit_prod_')) {
                        const prodId = cbData.replace('edit_prod_', '');
                        const product = await get<Treatment>('treatments', prodId);
                        if (product) {
                            const safeDesc = escapeHTML(product.description || '-');
                            const truncatedDesc = safeDesc.length > 800 ? safeDesc.substring(0, 800) + '...' : safeDesc;
                            const info = `📝 <b>${escapeHTML(product.name)}</b>\n💰 ${product.price} ${product.currency || 'UZS'}\n📂 ${escapeHTML(product.category || '-')}\n📄 ${truncatedDesc}`;
                            const kb = { inline_keyboard: [
                                [{ text: "📝 Nomini o'zgartirish", callback_data: `edit_field_name_${prodId}` }],
                                [{ text: "💰 Narxini o'zgartirish", callback_data: `edit_field_price_${prodId}` }],
                                [{ text: "📄 Tavsifni o'zgartirish", callback_data: `edit_field_description_${prodId}` }],
                                [{ text: "🖼 Rasmlarni boshqarish", callback_data: `edit_field_images_${prodId}` }],
                                [{ text: "🗑 O'chirish", callback_data: `edit_delete_${prodId}` }],
                                [{ text: "🔙 Ortga", callback_data: `edit_pick_cat` }]
                            ]};
                            let img = product.imageUrl;
                            if (img && !img.startsWith('http') && !img.startsWith('data:')) {
                                img = `data:image/jpeg;base64,${img}`;
                            }
                            if (img) {
                                await sendTelegramPhoto(botToken, chatId, img, info, { parse_mode: 'HTML', reply_markup: kb });
                            } else {
                                await sendTelegramMessage(botToken, chatId, info, { parse_mode: 'HTML', reply_markup: kb });
                            }
                            await answerCb();
                        } else {
                            await answerCb("Mahsulot topilmadi");
                        }
                    }
                    else if (cbData.startsWith('edit_field_')) {
                        const parts = cbData.replace('edit_field_', '').split('_');
                        const field = parts[0];
                        const prodId = parts.slice(1).join('_');
                        if (field === 'images') {
                            const product = await get<Treatment>('treatments', prodId);
                            if (product) {
                                state.editingProductId = prodId;
                                await saveBotState(chatId, state);
                                
                                const count = product.images?.length || (product.imageUrl ? 1 : 0);
                                const kb = { inline_keyboard: [
                                    [{ text: "➕ Rasm qo'shish", callback_data: `edit_img_add_${prodId}` }], 
                                    [{ text: "👁 Rasmlarni ko'rish/o'chirish", callback_data: `edit_img_list_${prodId}` }],
                                    [{ text: "🗑 Hammasini o'chirish", callback_data: `edit_img_clear_${prodId}` }], 
                                    [{ text: "🔙 Qaytish", callback_data: `edit_prod_${prodId}` }]
                                ]};
                                await sendTelegramMessage(botToken, chatId, `🖼 <b>Rasmlar boshqaruvi</b>\nJami rasmlar: ${count} ta`, { parse_mode: 'HTML', reply_markup: kb });
                            }
                        } else {
                            state.step = field === 'price' ? 'WAITING_EDIT_PRICE' : 'WAITING_EDIT_VALUE';
                            state.editingProductId = prodId;
                            state.editingField = field;
                            await saveBotState(chatId, state);
                            await sendTelegramMessage(botToken, chatId, `✏️ Yangi ${field} ni kiriting:`, { reply_markup: CANCEL_BACK_KEYBOARD });
                        }
                        await answerCb();
                    }
                    else if (cbData.startsWith('edit_img_list_')) {
                        const prodId = cbData.replace('edit_img_list_', '');
                        const product = await get<Treatment>('treatments', prodId);
                        if (product) {
                            const images = product.images && product.images.length > 0 ? product.images : (product.imageUrl ? [product.imageUrl] : []);
                            if (images.length === 0) {
                                await answerCb("Rasmlar yo'q");
                            } else {
                                await answerCb();
                                await sendTelegramMessage(botToken, chatId, "🖼 <b>Rasmlar ro'yxati:</b>\nO'chirish uchun pastdagi tugmani bosing.", { parse_mode: 'HTML' });
                                for (let i = 0; i < images.length; i++) {
                                    let img = images[i];
                                    if (!img.startsWith('http') && !img.startsWith('data:')) {
                                        img = `data:image/jpeg;base64,${img}`;
                                    }
                                    const kb = { inline_keyboard: [[{ text: "🗑 O'chirish", callback_data: `edit_img_del_${prodId}_${i}` }]] };
                                    await sendTelegramPhoto(botToken, chatId, img, `Rasm #${i + 1}`, { reply_markup: kb });
                                    await new Promise(r => setTimeout(r, 100)); // Delay to prevent flood
                                }
                                const backKb = { inline_keyboard: [[{ text: "🔙 Boshqaruvga qaytish", callback_data: `edit_field_images_${prodId}` }]] };
                                await sendTelegramMessage(botToken, chatId, "Tugatgach qaytish:", { reply_markup: backKb });
                            }
                        }
                    }
                    else if (cbData.startsWith('edit_img_del_')) {
                        const parts = cbData.replace('edit_img_del_', '').split('_');
                        const prodId = parts[0];
                        const imgIndex = parseInt(parts[1]);
                        
                        const product = await get<Treatment>('treatments', prodId);
                        if (product) {
                            let images = product.images && product.images.length > 0 ? [...product.images] : (product.imageUrl ? [product.imageUrl] : []);
                            
                            if (imgIndex >= 0 && imgIndex < images.length) {
                                images.splice(imgIndex, 1);
                                product.images = images;
                                product.imageUrl = images.length > 0 ? (images[0].includes(',') ? images[0].split(',')[1] : images[0]) : undefined;
                                
                                await saveTreatment(product);
                                await answerCb("Rasm o'chirildi");
                                await deleteTelegramMessage(botToken, chatId, callbackQuery.message.message_id);
                            } else {
                                await answerCb("Rasm topilmadi yoki allaqachon o'chirilgan");
                            }
                        }
                    }
                    else if (cbData.startsWith('edit_img_add_')) {
                        const prodId = cbData.replace('edit_img_add_', '');
                        state.step = 'WAITING_EDIT_IMAGE_ADD';
                        state.editingProductId = prodId;
                        await saveBotState(chatId, state);
                        await sendTelegramMessage(botToken, chatId, "📸 Yangi rasmni yuboring:", { reply_markup: CANCEL_BACK_KEYBOARD });
                        await answerCb();
                    }
                    else if (cbData.startsWith('edit_img_clear_')) {
                        const prodId = cbData.replace('edit_img_clear_', '');
                        const product = await get<Treatment>('treatments', prodId);
                        if (product) {
                            product.images = [];
                            product.imageUrl = undefined;
                            await saveTreatment(product);
                            await answerCb("Rasmlar o'chirildi", true);
                            await sendTelegramMessage(botToken, chatId, "🗑 Barcha rasmlar o'chirildi.");
                        }
                    }
                    else if (cbData.startsWith('edit_delete_')) { const prodId = cbData.replace('edit_delete_', ''); await deleteTreatment(prodId); await answerCb("Mahsulot o'chirildi", true); await editTelegramMessageRaw(botToken, chatId, callbackQuery.message.message_id, "🗑 Mahsulot o'chirildi.", { reply_markup: { inline_keyboard: [[{ text: "🔙 Ortga", callback_data: "edit_pick_cat" }]] } }); }
            }
        }
    }
    } catch (e) { }
};

export const setTelegramMyCommands = async (botToken: string, commands: TelegramMenuCommand[]) => {
    try {
        const validCommands = commands
            .filter(c => c.enabled)
            .map(c => ({
                command: c.command.replace('/', '').trim(), // Telegram API expects command without /
                description: c.description.trim()
            }));

        const response = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commands: validCommands })
        });
        
        return await response.json();
    } catch (e) {
        console.error("Error setting my commands:", e);
        return { ok: false, description: "Network error" };
    }
};

export const syncTelegramProfile = async (botToken: string, profile: TelegramProfileConfig) => {
    const results = [];

    // 1. Set Name
    if (profile.botName) {
        try {
            const res = await fetch(`https://api.telegram.org/bot${botToken}/setMyName`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: profile.botName })
            });
            results.push({ action: 'Name', ...await res.json() });
        } catch (e) { results.push({ action: 'Name', ok: false }); }
    }

    // 2. Set Short Description (About)
    if (profile.shortDescription) {
        try {
            const res = await fetch(`https://api.telegram.org/bot${botToken}/setMyShortDescription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ short_description: profile.shortDescription })
            });
            results.push({ action: 'About', ...await res.json() });
        } catch (e) { results.push({ action: 'About', ok: false }); }
    }

    // 3. Set Description (Intro text)
    if (profile.description) {
        try {
            const res = await fetch(`https://api.telegram.org/bot${botToken}/setMyDescription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: profile.description })
            });
            results.push({ action: 'Description', ...await res.json() });
        } catch (e) { results.push({ action: 'Description', ok: false }); }
    }

    // 4. Set Menu Button (Mini App)
    try {
        const payload: any = {};
        if (profile.useMenuButton && profile.menuButtonUrl) {
            payload.menu_button = {
                type: 'web_app',
                text: profile.menuButtonText || 'Open App',
                web_app: { url: profile.menuButtonUrl }
            };
        } else {
            payload.menu_button = { type: 'default' };
        }

        const res = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        results.push({ action: 'Menu Button', ...await res.json() });
    } catch (e) { results.push({ action: 'Menu Button', ok: false }); }

    return results;
};

export const createBackup = async () => {
  const stores = ['treatments', 'categories', 'site_config', 'ads', 'admins', 'announcements', 'tg_users', 'bot_states', 'sessions', 'chat_messages'];
  const backup: any = { version: 1, timestamp: Date.now(), data: {} };

  for (const storeName of stores) {
    try {
        backup.data[storeName] = await getAll(storeName);
    } catch (e) {
        console.warn(`Failed to backup store ${storeName}`, e);
        backup.data[storeName] = [];
    }
  }
  return backup;
};

export const restoreBackup = async (backupData: any) => {
  const db = await getDB();
  const storeNames = Object.keys(backupData.data);
  const validStores = storeNames.filter(name => db.objectStoreNames.contains(name));
  
  if (validStores.length === 0) throw new Error("No valid stores found in backup");

  return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(validStores, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error("Transaction aborted"));

      validStores.forEach(storeName => {
          const store = tx.objectStore(storeName);
          store.clear();
          const items = backupData.data[storeName];
          if (Array.isArray(items)) {
              items.forEach(item => store.put(item));
          }
      });
  });
};
