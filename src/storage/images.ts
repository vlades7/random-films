import { ref, watchEffect, type Ref } from 'vue'
import { idbGet, idbSet } from './idb'

// Картинки, загруженные с компьютера, лежат в IndexedDB.
// В данных фильма они записаны как «idb:<id>», внешние постеры — обычной https-ссылкой.
const PREFIX = 'idb:'
const objectUrls = new Map<string, Promise<string | null>>()

export const isLocalImage = (src?: string | null) => !!src?.startsWith(PREFIX)
export const localImageId = (src: string) => src.slice(PREFIX.length)

export async function saveLocalImage(blob: Blob): Promise<string> {
  const id = crypto.randomUUID()
  await idbSet('images', id, blob)
  return PREFIX + id
}

/** «idb:…» → blob: URL для <img>; внешние ссылки возвращаются как есть */
export function resolveImage(src: string): Promise<string | null> {
  if (!isLocalImage(src)) return Promise.resolve(src)
  let p = objectUrls.get(src)
  if (!p) {
    p = idbGet<Blob>('images', localImageId(src)).then((b) => (b ? URL.createObjectURL(b) : null))
    objectUrls.set(src, p)
  }
  return p
}

/** Реактивный URL картинки для шаблона */
export function useImageUrl(src: () => string | null | undefined): Ref<string | null> {
  const url = ref<string | null>(null)
  watchEffect((onCleanup) => {
    const s = src()
    let cancelled = false
    onCleanup(() => (cancelled = true))
    if (!s) {
      url.value = null
      return
    }
    if (!isLocalImage(s)) {
      url.value = s
      return
    }
    url.value = null
    void resolveImage(s).then((u) => {
      if (!cancelled) url.value = u
    })
  })
  return url
}
