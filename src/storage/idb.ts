// Мини-обёртка над IndexedDB: два хранилища «ключ → значение».
//   data   — списки и история (обычные JSON-объекты)
//   images — загруженные пользователем картинки (Blob)

const DB_NAME = 'random-films'
const DB_VERSION = 1
export type StoreName = 'data' | 'images'

let dbPromise: Promise<IDBDatabase> | null = null

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('data')
      req.result.createObjectStore('images')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const tx = (await db()).transaction(store, mode)
  const req = fn(tx.objectStore(store))
  return new Promise<T>((resolve, reject) => {
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export const idbGet = <T>(store: StoreName, key: string) =>
  run<T | undefined>(store, 'readonly', (s) => s.get(key))

export const idbSet = (store: StoreName, key: string, value: unknown) =>
  run(store, 'readwrite', (s) => s.put(value, key)).then(() => undefined)

export const idbDelete = (store: StoreName, key: string) =>
  run(store, 'readwrite', (s) => s.delete(key)).then(() => undefined)

export const idbClear = (store: StoreName) => run(store, 'readwrite', (s) => s.clear()).then(() => undefined)
