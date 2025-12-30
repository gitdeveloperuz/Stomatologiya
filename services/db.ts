
import { Treatment, ChatMessage, ChatSession, Category } from '../types';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, onSnapshot, query, orderBy, limit, addDoc, updateDoc, increment, where, writeBatch } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// ---------------------------------------------------------------
// CLOUD DATABASE CONFIGURATION (FIREBASE)
// ---------------------------------------------------------------
// Keys provided by user.
// ---------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyD4TgCdJOnDv43XP_iGuuUmMuGP5jaSpIM",
  authDomain: "couz-1d994.firebaseapp.com",
  databaseURL: "https://couz-1d994.firebaseio.com",
  projectId: "couz-1d994",
  storageBucket: "couz-1d994.firebasestorage.app",
  messagingSenderId: "1069146264746",
  appId: "1:1069146264746:web:535f4f360e37ab07362cd3",
  measurementId: "G-Y90B95XKYM"
};

let db: any = null;
let useCloud = false;

// Initialize Cloud DB if keys exist
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        
        // Initialize Analytics if supported (Client side only)
        isSupported().then(yes => {
            if (yes) getAnalytics(app);
        }).catch(() => {});

        useCloud = true;
        console.log("Using Cloud Database (Firebase)");
    } catch (e) {
        console.error("Firebase Init Error:", e);
    }
} else {
    console.warn("No Firebase Keys found. Using Local Database (IndexedDB).");
}

export const isCloudConfigured = useCloud;

// ---------------------------------------------------------------
// LOCAL DATABASE CONFIGURATION (INDEXEDDB)
// ---------------------------------------------------------------
const DB_NAME = 'StomatologiyaDB';
const STORE_NAME = 'treatments';
const CAT_STORE_NAME = 'categories';
const DB_VERSION = 2; // Incremented for Categories

const initLocalDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CAT_STORE_NAME)) {
        db.createObjectStore(CAT_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// ---------------------------------------------------------------
// REAL-TIME DATA SUBSCRIPTION (TREATMENTS)
// ---------------------------------------------------------------

export const subscribeToTreatments = (
    onUpdate: (data: Treatment[]) => void, 
    onError?: (error: any) => void
): () => void => {
    // 1. CLOUD MODE (Real-time Sync across devices)
    if (useCloud && db) {
        const unsubscribe = onSnapshot(collection(db, "treatments"), (snapshot: any) => {
            const items: Treatment[] = [];
            snapshot.forEach((doc: any) => {
                items.push(doc.data() as Treatment);
            });
            onUpdate(items);
        }, (error: any) => {
            console.error("Cloud Sync Error:", error);
            if (onError) onError(error);
        });
        return unsubscribe;
    }

    // 2. LOCAL MODE (Real-time Sync across tabs on same device)
    // Initial fetch
    getAllTreatments()
        .then(onUpdate)
        .catch(err => onError && onError(err));

    // Listen for tab updates
    const channel = new BroadcastChannel('stomatologiya_updates');
    channel.onmessage = (event) => {
        if (event.data === 'db_update') {
            getAllTreatments()
                .then(onUpdate)
                .catch(err => onError && onError(err));
        }
    };

    return () => {
        channel.close();
    };
};

// ---------------------------------------------------------------
// REAL-TIME DATA SUBSCRIPTION (CATEGORIES)
// ---------------------------------------------------------------

export const subscribeToCategories = (
    onUpdate: (data: Category[]) => void
): () => void => {
    // CLOUD
    if (useCloud && db) {
        const unsubscribe = onSnapshot(collection(db, "categories"), (snapshot: any) => {
            const items: Category[] = [];
            snapshot.forEach((doc: any) => items.push(doc.data() as Category));
            onUpdate(items);
        });
        return unsubscribe;
    }

    // LOCAL
    getAllCategories().then(onUpdate);
    const channel = new BroadcastChannel('stomatologiya_updates');
    channel.onmessage = (event) => {
        if (event.data === 'cat_update') {
            getAllCategories().then(onUpdate);
        }
    };
    return () => channel.close();
};

// ---------------------------------------------------------------
// CHAT OPERATIONS (CLOUD ONLY)
// ---------------------------------------------------------------

export const sendMessage = async (sessionId: string, text: string, sender: 'user' | 'admin') => {
    if (!useCloud || !db) return;

    try {
        const messageData: ChatMessage = {
            id: `msg-${Date.now()}`,
            text,
            sender,
            timestamp: Date.now(),
            read: false
        };

        // 1. Add to messages subcollection
        const messagesRef = collection(db, 'chats', sessionId, 'messages');
        await addDoc(messagesRef, messageData);

        // 2. Update session metadata (for Admin List)
        const sessionRef = doc(db, 'chats', sessionId);
        
        // Calculate unread count logic
        await setDoc(sessionRef, {
            id: sessionId,
            lastMessage: text,
            lastMessageTime: Date.now(),
            unreadCount: sender === 'user' ? increment(1) : 0, 
            userName: sender === 'user' ? `Mijoz (ID: ${sessionId.slice(0, 4)})` : undefined
        }, { merge: true });

    } catch (e) {
        console.error("Chat Send Error:", e);
    }
};

export const deleteMessage = async (sessionId: string, messageId: string) => {
    if (!useCloud || !db) return;
    try {
        const messagesRef = collection(db, 'chats', sessionId, 'messages');
        const snapshot = await getDocs(messagesRef);
        snapshot.forEach(async (d) => {
            if (d.data().id === messageId) {
                await deleteDoc(d.ref);
            }
        });

    } catch (e) {
        console.error("Chat Delete Error:", e);
    }
};

export const deleteChatSession = async (sessionId: string) => {
    if (!useCloud || !db) return;
    try {
        const msgsRef = collection(db, 'chats', sessionId, 'messages');
        const snapshot = await getDocs(msgsRef);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        await deleteDoc(doc(db, 'chats', sessionId));
    } catch (e) {
        console.error("Session Delete Error:", e);
    }
};

export const subscribeToChatMessages = (sessionId: string, onUpdate: (msgs: ChatMessage[]) => void) => {
    if (!useCloud || !db) return () => {};

    const messagesRef = collection(db, 'chats', sessionId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot: any) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((doc: any) => msgs.push(doc.data() as ChatMessage));
        onUpdate(msgs);
    });
};

export const subscribeToAllSessions = (onUpdate: (sessions: ChatSession[]) => void) => {
    if (!useCloud || !db) return () => {};

    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, orderBy('lastMessageTime', 'desc'));

    return onSnapshot(q, (snapshot: any) => {
        const sessions: ChatSession[] = [];
        snapshot.forEach((doc: any) => {
            const data = doc.data();
            sessions.push({
                id: doc.id,
                ...data
            } as ChatSession);
        });
        onUpdate(sessions);
    });
};

export const markSessionRead = async (sessionId: string) => {
    if (!useCloud || !db) return;
    try {
        const sessionRef = doc(db, 'chats', sessionId);
        const batch = writeBatch(db);
        batch.update(sessionRef, { unreadCount: 0 });
        const messagesRef = collection(db, 'chats', sessionId, 'messages');
        const q = query(messagesRef, where("read", "==", false), where("sender", "==", "user"));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
    } catch (e) {
        console.error("Error marking read:", e);
    }
};

// ---------------------------------------------------------------
// CRUD OPERATIONS (TREATMENTS & CATEGORIES)
// ---------------------------------------------------------------

export const initDB = async (): Promise<void> => {
    if (useCloud) return; 
    await initLocalDB();
};

// Helper for local fetch
const getAllTreatments = (): Promise<Treatment[]> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = () => {
            const dbLocal = request.result;
            try {
                const transaction = dbLocal.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const getAllRequest = store.getAll();
                getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
                getAllRequest.onerror = () => reject(getAllRequest.error);
            } catch (e) {
                resolve([]);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

const getAllCategories = (): Promise<Category[]> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = () => {
            const dbLocal = request.result;
            try {
                const transaction = dbLocal.transaction(CAT_STORE_NAME, 'readonly');
                const store = transaction.objectStore(CAT_STORE_NAME);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
            } catch(e) { resolve([]); }
        };
        request.onerror = () => reject(request.error);
    });
};

export const saveTreatment = async (treatment: Treatment): Promise<void> => {
  if (useCloud && db) {
      await setDoc(doc(db, "treatments", treatment.id), treatment);
      return;
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const dbLocal = request.result;
      const transaction = dbLocal.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(treatment);
      putRequest.onsuccess = () => {
          const channel = new BroadcastChannel('stomatologiya_updates');
          channel.postMessage('db_update');
          channel.close();
          resolve();
      };
      putRequest.onerror = () => reject(putRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteTreatment = async (id: string): Promise<void> => {
   if (useCloud && db) {
       await deleteDoc(doc(db, "treatments", id));
       return;
   }
   return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const dbLocal = request.result;
      const transaction = dbLocal.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const deleteRequest = store.delete(id);
      deleteRequest.onsuccess = () => {
           const channel = new BroadcastChannel('stomatologiya_updates');
           channel.postMessage('db_update');
           channel.close();
           resolve();
      };
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveCategory = async (category: Category): Promise<void> => {
    if (useCloud && db) {
        await setDoc(doc(db, "categories", category.id), category);
        return;
    }
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = () => {
            const dbLocal = request.result;
            const tx = dbLocal.transaction(CAT_STORE_NAME, 'readwrite');
            tx.objectStore(CAT_STORE_NAME).put(category);
            tx.oncomplete = () => {
                const channel = new BroadcastChannel('stomatologiya_updates');
                channel.postMessage('cat_update');
                channel.close();
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        };
    });
};

export const deleteCategory = async (id: string): Promise<void> => {
    if (useCloud && db) {
        await deleteDoc(doc(db, "categories", id));
        return;
    }
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = () => {
            const dbLocal = request.result;
            const tx = dbLocal.transaction(CAT_STORE_NAME, 'readwrite');
            tx.objectStore(CAT_STORE_NAME).delete(id);
            tx.oncomplete = () => {
                const channel = new BroadcastChannel('stomatologiya_updates');
                channel.postMessage('cat_update');
                channel.close();
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        };
    });
};
