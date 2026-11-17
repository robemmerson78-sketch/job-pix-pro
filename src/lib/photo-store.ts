/**
 * Job display photos, kept in IndexedDB (much more room than localStorage).
 * A job stores a short reference ("idb:<id>") in place of the photo text.
 * Older jobs that still hold the photo itself ("data:...") keep working unchanged.
 * This store is separate from the sharper analysis copies ("Don't keep" never touches it).
 */
import { useEffect, useState } from "react";
import { isPhotoRef, refId } from "./photo-store-refs";

export { REF_PREFIX, isPhotoRef, refId, toRef } from "./photo-store-refs";

const DB_NAME = "jobpix-photos";
const STORE = "display";

let dbPromise: Promise<IDBDatabase | null> | null = null;
function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  void dbPromise.then((db) => {
    if (!db) dbPromise = null; // allow a later retry
  });
  return dbPromise;
}

/** Stores a photo and reads it back. True only when the copy is confirmed saved. */
export async function putPhoto(id: string, dataUrl: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  const wrote = await new Promise<boolean>((resolve) => {
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
  if (!wrote) return false;
  const back = await getPhotos([id]);
  return back[id] === dataUrl;
}

export async function getPhotos(ids: string[]): Promise<Record<string, string>> {
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

export async function deletePhotos(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite");
    ids.forEach((id) => tx.objectStore(STORE).delete(id));
  } catch {
    /* nothing to clean up */
  }
}

/** Turns job photo entries into displayable/sendable image text. Missing photos become "". */
export async function resolvePhotos(photos: string[]): Promise<string[]> {
  const ids = photos.filter(isPhotoRef).map(refId);
  const found = await getPhotos(ids);
  return photos.map((p) => (isPhotoRef(p) ? (found[refId(p)] ?? "") : p));
}

/** Resolved photo sources for display; inline photos show immediately. */
export function usePhotoSrcs(photos: string[]): string[] {
  const key = photos.map((p) => (isPhotoRef(p) ? p : p.slice(-32))).join("|");
  const [srcs, setSrcs] = useState<string[]>(() => photos.map((p) => (isPhotoRef(p) ? "" : p)));
  useEffect(() => {
    let live = true;
    void resolvePhotos(photos).then((r) => live && setSrcs(r));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return srcs;
}
