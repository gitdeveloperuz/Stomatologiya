import { Treatment } from '../types';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';

// ---------------------------------------------------------------
// CLOUD DATABASE CONFIGURATION (FIREBASE)
// ---------------------------------------------------------------
// To enable Multi-Device Sync (Admin on PC -> User on Phone):
// 1. Go to console.firebase.google.com and create a free project
// 2. Create a Firestore Database (Start in Test Mode)
// 3. Paste the config keys below
// ---------------------------------------------------------------
const firebaseConfig = {
  apiKey: "", // e.g., "AIzaSy..."
  authDomain: "", // e.g., "project-id.firebaseapp.com"
  projectId: "", // e.g., "project-id"
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

let db: any = null;
let useCloud = false;

// Initialize Cloud DB if keys exist
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        useCloud = true;
        console.log("Using Cloud Database (Firebase)");
    } catch (e) {
        console.error("Firebase Init Error:", e);
        console.warn("Falling back to Local Database (IndexedDB)");
    }
} else {
    console.warn("No Firebase Keys found. Using Local Database (IndexedDB). Data will NOT sync across devices.");
}


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
// UNIFIED API
// ---------------------------------------------------------------

export const initDB = async (): Promise<void> => {
    if (useCloud) return; // Firebase auto-initializes
    await initLocalDB();
};

export const getAllTreatments = async (): Promise<Treatment[]> => {
  // CLOUD MODE
  if (useCloud && db) {
      try {
          const querySnapshot = await getDocs(collection(db, "treatments"));
          const items: Treatment[] = [];
          querySnapshot.forEach((doc) => {
              items.push(doc.data() as Treatment);
          });
          return items;
      } catch (e) {
          console.error("Cloud Fetch Error:", e);
          return [];
      }
  }

  // LOCAL MODE
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
  // CLOUD MODE
  if (useCloud && db) {
      // Create a document with the same ID
      await setDoc(doc(db, "treatments", treatment.id), treatment);
      return;
  }

  // LOCAL MODE
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const dbLocal = request.result;
      const transaction = dbLocal.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(treatment);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteTreatment = async (id: string): Promise<void> => {
   // CLOUD MODE
   if (useCloud && db) {
       await deleteDoc(doc(db, "treatments", id));
       return;
   }

   // LOCAL MODE
   return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const dbLocal = request.result;
      const transaction = dbLocal.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const deleteRequest = store.delete(id);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
};