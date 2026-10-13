import type { FilmList, HistoryEntry } from '../types'
import { idbClear, idbGet, idbSet } from './idb'
import { isLocalImage, localImageId } from './images'

// Резервная копия всех данных в одном JSON-файле.
// Картинки из IndexedDB встраиваются как data URL, внешние постеры остаются ссылками.

export interface Backup {
  app: 'random-films'
  version: 1
  lists: FilmList[]
  history: HistoryEntry[]
  /** id картинки → data URL */
  images: Record<string, string>
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

export async function exportBackup(lists: FilmList[], history: HistoryEntry[]): Promise<Blob> {
  const ids = new Set<string>()
  for (const src of [...lists.flatMap((l) => l.films.map((f) => f.image)), ...history.map((h) => h.image)])
    if (src && isLocalImage(src)) ids.add(localImageId(src))

  const images: Record<string, string> = {}
  for (const id of ids) {
    const blob = await idbGet<Blob>('images', id)
    if (blob) images[id] = await blobToDataUrl(blob)
  }
  const backup: Backup = { app: 'random-films', version: 1, lists, history, images }
  return new Blob([JSON.stringify(backup)], { type: 'application/json' })
}

/** Полностью заменяет данные в браузере содержимым бэкапа */
export async function importBackup(file: File): Promise<{ lists: FilmList[]; history: HistoryEntry[] }> {
  let backup: Backup
  try {
    backup = JSON.parse(await file.text())
  } catch {
    throw new Error('Файл не похож на резервную копию (не JSON)')
  }
  if (backup?.app !== 'random-films' || !Array.isArray(backup.lists))
    throw new Error('Это не резервная копия «Кино-Джекпота»')

  await idbClear('images')
  for (const [id, dataUrl] of Object.entries(backup.images ?? {})) {
    await idbSet('images', id, await (await fetch(dataUrl)).blob())
  }
  const history = backup.history ?? []
  await idbSet('data', 'lists', backup.lists)
  await idbSet('data', 'history', history)
  return { lists: backup.lists, history }
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
