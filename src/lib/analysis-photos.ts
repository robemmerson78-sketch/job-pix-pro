/**
 * Sharper analysis-only photo copies, kept in their own IndexedDB store so a
 * storage failure here can never affect saved jobs (which stay in localStorage).
 */

const DB_NAME = "jobpix-analysis";
const STORE = "photos";

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Returns true when the sharper copy was stored; false means "fall back to the display photo". */
export async function putAnalysisPhoto(id: string, dataUrl: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(dataUrl, id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/** Sharper copies for the given ids; missing ids are simply absent. */
export async function getAnalysisPhotos(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!ids.length) return out;
  const db = await openDb();
  if (!db) return out;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      ids.forEach((id) => {
        const req = store.get(id);
        req.onsuccess = () => {
          if (typeof req.result === "string") out[id] = req.result;
        };
      });
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => resolve(out);
      tx.onabort = () => resolve(out);
    } catch {
      resolve(out);
    }
  });
}

export async function deleteAnalysisPhotos(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    ids.forEach((id) => store.delete(id));
  } catch {
    /* nothing to clean up */
  }
}

/** Removes every sharper analysis copy. Only this store is touched — never job data. */
export async function clearAnalysisPhotos(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(STORE, "readwrite").objectStore(STORE).clear();
  } catch {
    /* nothing to clear */
  }
}
