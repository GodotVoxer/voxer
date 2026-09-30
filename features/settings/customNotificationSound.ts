/**
 * The custom notification sound lives in the device's IndexedDB and is never uploaded: it is the
 * user's file. In exchange it does not travel between devices and disappears with the site data.
 */
const DB_NAME = "voxer-settings";
const DB_VERSION = 1;
const STORE = "sounds";
const KEY = "notification";

/** Enough for a short alert; a big file only adds playback latency. */
export const CUSTOM_SOUND_MAX_BYTES = 2 * 1024 * 1024;

export const CUSTOM_SOUND_TOO_LARGE_ES = "El archivo no puede pesar más de 2 MB.";
export const CUSTOM_SOUND_NOT_AUDIO_ES = "Tiene que ser un archivo de audio.";
export const CUSTOM_SOUND_STORE_FAILED_ES =
  "No se pudo guardar el sonido en este dispositivo. Probá con otro archivo.";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

export const isSupportedCustomSoundFile = (file: File): boolean =>
  file.type.startsWith("audio/") || /\.(mp3|ogg|oga|wav|m4a|aac|flac|opus|weba)$/i.test(file.name);

export const saveCustomNotificationSound = async (file: File): Promise<void> => {
  // The `Blob` is stored as is: IndexedDB keeps binary without converting it to text.
  await withStore("readwrite", (store) => store.put(file, KEY));
};

export const readCustomNotificationSound = async (): Promise<Blob | null> => {
  const value = await withStore<unknown>("readonly", (store) => store.get(KEY) as IDBRequest);
  return value instanceof Blob ? value : null;
};

export const clearCustomNotificationSound = async (): Promise<void> => {
  await withStore("readwrite", (store) => store.delete(KEY));
};
