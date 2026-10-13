import type { FilmList, HistoryEntry } from './types'
import { idbGet, idbSet } from './storage/idb'
import { saveLocalImage } from './storage/images'
import { searchPosters } from './posterSearch'
import { demoLists } from './seed'

// Все данные живут в браузере (IndexedDB) — сервер не нужен.

/** Vue-прокси нельзя положить в IndexedDB как есть — делаем простую копию */
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v))

export const api = {
  /** При первом запуске — демо-списки */
  getLists: async () => (await idbGet<FilmList[]>('data', 'lists')) ?? demoLists(),
  saveLists: (lists: FilmList[]) => idbSet('data', 'lists', plain(lists)),
  getHistory: async () => (await idbGet<HistoryEntry[]>('data', 'history')) ?? [],
  addHistory: async (entry: HistoryEntry) => {
    const history = [plain(entry), ...((await idbGet<HistoryEntry[]>('data', 'history')) ?? [])]
    await idbSet('data', 'history', history)
    return history
  },
  clearHistory: () => idbSet('data', 'history', []),
  /** Картинка с компьютера → IndexedDB; возвращает «idb:<id>» */
  uploadImage: (file: File) => saveLocalImage(file),
  searchPosters,
}

export function uid() {
  return crypto.randomUUID()
}

/** ДД.ММ.ГГГГ, ЧЧ:ММ:СС */
export function formatDate(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
