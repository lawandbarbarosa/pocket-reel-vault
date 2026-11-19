// Videos saved on this device (IndexedDB), so they play without internet.
export type SavedVideo = {
  id: string;
  title: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  blob: Blob;
};

const DB = "reel-offline";
const STORE = "videos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const r = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(r.result);
        t.onerror = () => reject(t.error);
      }),
  );
}

export const offlineStore = {
  all: () => tx<SavedVideo[]>("readonly", (s) => s.getAll() as IDBRequest<SavedVideo[]>),
  put: (v: SavedVideo) => tx("readwrite", (s) => s.put(v)),
  remove: (id: string) => tx("readwrite", (s) => s.delete(id)),
};
