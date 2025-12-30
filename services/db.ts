import { Treatment } from '../types';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
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
const DB_VERSION = 1;

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
    };
  });
};

// ---------------------------------------------------------------
// REAL-TIME DATA SUBSCRIPTION
// ---------------------------------------------------------------

export const subscribeToTreatments = (
    onUpdate: (data: Treatment[]) => void, 
    onError?: (error: any) => void
): () => void => {
    // 1. CLOUD MODE (Real-time Sync across devices)
    if (useCloud && db) {
        const unsubscribe = onSnapshot(collection(db, "treatments"), (snapshot) => {
            const items: Treatment[] = [];
            snapshot.forEach((doc) => {
                items.push(doc.data() as Treatment);
            });
            onUpdate(items);
        }, (error) => {
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
// CRUD OPERATIONS
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

export const saveTreatment = async (treatment: Treatment): Promise<void> => {
  // CLOUD
  if (useCloud && db) {
      await setDoc(doc(db, "treatments", treatment.id), treatment);
      return;
  }

  // LOCAL
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const dbLocal = request.result;
      const transaction = dbLocal.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(treatment);
      putRequest.onsuccess = () => {
          // Notify other tabs
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
   // CLOUD
   if (useCloud && db) {
       await deleteDoc(doc(db, "treatments", id));
       return;
   }

   // LOCAL
   return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const dbLocal = request.result;
      const transaction = dbLocal.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const deleteRequest = store.delete(id);
      deleteRequest.onsuccess = () => {
           // Notify other tabs
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