// Videos saved on this device (IndexedDB), so they play without internet.
// Large videos are stored as small pieces so the phone never holds a whole movie in memory
// (that made the browser crash/reload mid-download) and an interrupted download can resume.
export type SavedVideo = {
  id: string;
  title: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  blob: Blob;
};

type Meta = Omit<SavedVideo, "blob"> & { blob?: Blob; parts?: number; complete?: boolean };

const DB = "reel-offline";
const STORE = "videos";
const CHUNKS = "chunks";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(CHUNKS)) db.createObjectStore(CHUNKS, { keyPath: ["id", "i"] });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(stores: string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => IDBRequest<T> | void): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(stores, mode);
        const r = fn(t);
        t.oncomplete = () => resolve(r ? r.result : (undefined as T));
        t.onerror = () => reject(t.error);
      }),
  );
}

const range = (id: string) => IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);

async function chunksOf(id: string): Promise<{ i: number; blob: Blob }[]> {
  return run([CHUNKS], "readonly", (t) => t.objectStore(CHUNKS).getAll(range(id)));
}

export const offlineStore = {
  all: async (): Promise<SavedVideo[]> => {
    const metas = await run<Meta[]>([STORE], "readonly", (t) => t.objectStore(STORE).getAll());
    const out: SavedVideo[] = [];
    for (const m of metas) {
      if (m.blob) out.push(m as SavedVideo);
      else if (m.complete) {
        const parts = (await chunksOf(m.id)).sort((a, b) => a.i - b.i).map((c) => c.blob);
        out.push({ ...m, blob: new Blob(parts, { type: m.mime_type }) });
      }
    }
    return out;
  },
  // Bytes already downloaded for an unfinished video (to resume).
  progress: async (id: string) => {
    const c = await chunksOf(id);
    return { next: c.length, bytes: c.reduce((n, x) => n + x.blob.size, 0) };
  },
  putChunk: (id: string, i: number, blob: Blob) =>
    run([CHUNKS], "readwrite", (t) => t.objectStore(CHUNKS).put({ id, i, blob })),
  putMeta: (m: Meta) => run([STORE], "readwrite", (t) => t.objectStore(STORE).put(m)),
  remove: (id: string) =>
    run([STORE, CHUNKS], "readwrite", (t) => {
      t.objectStore(STORE).delete(id);
      t.objectStore(CHUNKS).delete(range(id));
    }),
};
