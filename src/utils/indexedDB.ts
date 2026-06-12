import { Book, JournalPage } from '../types';

const DB_NAME = 'mels_library_db';
const DB_VERSION = 3;
const STORE_BOOKS = 'books';
const STORE_PAGES_LEGACY = 'pages_legacy'; // preserve old store for migration
const STORE_METADATA = 'metadata';

let dbInstance: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store books which hold page records
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
      }

      // Legacy support check
      if (!db.objectStoreNames.contains(STORE_PAGES_LEGACY)) {
        db.createObjectStore(STORE_PAGES_LEGACY, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA);
      }
    };
  });
}

// 1. Get all Books (includes autodetect migration wrapper)
export async function getBooks(): Promise<Book[]> {
  const db = await getDB();
  
  // First, get all saved books
  const books: Book[] = await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BOOKS, 'readonly');
    const store = transaction.objectStore(STORE_BOOKS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  // If we have books, return them sorted by last modified (newest last) or custom rules
  if (books.length > 0) {
    return books.sort((a, b) => b.lastModified - a.lastModified);
  }

  // If absolutely NO books exist:
  // Let's seed a warm default welcome book for Mel, so the shelf is immediately cozy
  const defaultWelcomeBook: Book = {
    id: 'first_sketchbook',
    title: "Mel's Warm Musings",
    description: "A space to draw, reflect, and keep small quiet drawings.",
    createdAt: Date.now(),
    lastModified: Date.now(),
    theme: {
      color: '#6E8875', // Calm deep Sage
      texture: 'paper',
      styleId: 'sakura'
    },
    pages: []
  };

  await saveBook(defaultWelcomeBook);
  return [defaultWelcomeBook];
}

// 2. Put / update full Book record
export async function saveBook(book: Book): Promise<void> {
  const db = await getDB();
  book.lastModified = Date.now();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BOOKS, 'readwrite');
    const store = transaction.objectStore(STORE_BOOKS);
    const request = store.put(book);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 3. Delete full Book record
export async function deleteBook(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BOOKS, 'readwrite');
    const store = transaction.objectStore(STORE_BOOKS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Helper: Get single Book by key
export async function getBookById(id: string): Promise<Book | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BOOKS, 'readonly');
    const store = transaction.objectStore(STORE_BOOKS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getMetadata(key: string): Promise<any> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_METADATA, 'readonly');
    const store = transaction.objectStore(STORE_METADATA);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMetadata(key: string, value: any): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_METADATA, 'readwrite');
    const store = transaction.objectStore(STORE_METADATA);
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
