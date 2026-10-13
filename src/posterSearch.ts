import type { PosterCandidate } from './types'

// Поиск постеров в Википедии прямо из браузера: статья о фильме -> картинка из инфобокса.
// Википедия ограничивает частоту запросов, поэтому все вызовы идут через очередь.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Не используем \b: без флага u он не видит границ кириллических слов
const WIKI = {
  ru: {
    suffix: 'фильм',
    infobox: /\{\{\s*Фильм\s*[|\n}]/i,
    poster: /\|\s*(?:Постер|Изображение)\s*=\s*([^|\n}]+)/i,
  },
  en: { suffix: 'film', infobox: /\{\{\s*Infobox film\s*[|\n}]/i, poster: /\|\s*image\s*=\s*([^|\n}]+)/i },
} as const
type Lang = keyof typeof WIKI

let chain: Promise<unknown> = Promise.resolve()
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(fn)
  chain = p.catch(() => {}).then(() => sleep(500))
  return p
}

async function wikiApi(lang: Lang, params: Record<string, string>) {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`)
  // origin=* — разрешает анонимные запросы к API с любого сайта (CORS)
  for (const [k, v] of Object.entries({ format: 'json', formatversion: '2', origin: '*', ...params }))
    u.searchParams.set(k, v)
  for (let attempt = 0; ; attempt++) {
    const res = await throttled(() => fetch(u))
    const text = await res.text()
    try {
      if (res.ok) return JSON.parse(text)
    } catch {
      /* rate limit отдаёт текст вместо JSON */
    }
    if (attempt >= 3) throw new Error(`Википедия не ответила (${res.status}), попробуйте через минуту`)
    const retryAfter = Number(res.headers.get('retry-after'))
    await sleep(retryAfter > 0 ? Math.min(retryAfter, 30) * 1000 : 2000 * 2 ** attempt)
  }
}

function posterFile(wikitext: string, lang: Lang) {
  const m = WIKI[lang].poster.exec(wikitext)
  if (!m) return null
  const name = m[1]
    .trim()
    .replace(/^\[\[/, '')
    .replace(/^(Файл|File|Image|Изображение):/i, '')
    .split('|')[0]
    .replace(/\]\]$/, '')
    .trim()
  return /\.(jpe?g|png|webp|gif)$/i.test(name) ? name : null
}

async function searchLang(query: string, lang: Lang): Promise<PosterCandidate[]> {
  // 1 запрос: поиск + вводная секция статей (там инфобокс) + краткие описания
  const data = await wikiApi(lang, {
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} ${WIKI[lang].suffix}`,
    gsrlimit: '10',
    prop: 'revisions|description',
    rvprop: 'content',
    rvslots: 'main',
    rvsection: '0',
  })
  const pages: any[] = (data.query?.pages ?? []).sort((a: any, b: any) => a.index - b.index)

  const films = pages
    .map((p) => {
      const wt: string = p.revisions?.[0]?.slots?.main?.content ?? ''
      return { title: p.title as string, description: (p.description ?? '') as string, wt }
    })
    .filter((p) => WIKI[lang].infobox.test(p.wt))
    .map((p) => ({ ...p, file: posterFile(p.wt, lang) }))
    .filter((p): p is typeof p & { file: string } => !!p.file)

  if (!films.length) return []

  // 2 запрос: URL всех картинок разом
  const info = await wikiApi(lang, {
    action: 'query',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '500',
    titles: films.map((f) => `File:${f.file}`).join('|'),
  })
  const urlByFile = new Map<string, string>()
  for (const p of info.query?.pages ?? []) {
    const ii = p.imageinfo?.[0]
    const url = ii?.thumburl ?? ii?.url
    if (url) urlByFile.set(normalizeFile(p.title), stripTracking(url))
  }
  // запрос мог нормализовать имена файлов — сопоставляем через normalized
  for (const n of info.query?.normalized ?? []) {
    const url = urlByFile.get(normalizeFile(n.to))
    if (url) urlByFile.set(normalizeFile(n.from), url)
  }

  return films.flatMap((f) => {
    const image = urlByFile.get(normalizeFile(`File:${f.file}`))
    if (!image) return []
    const year = /\b(19|20)\d{2}\b/.exec(`${f.title} ${f.description}`)?.[0]
    return [
      {
        title: f.title,
        description: f.description,
        year,
        image,
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(f.title.replace(/ /g, '_'))}`,
      },
    ]
  })
}

function normalizeFile(t: string) {
  return t.replace(/^[^:]+:/, '').replace(/_/g, ' ').toLowerCase()
}

/** API добавляет к ссылкам utm-метки — убираем, чтобы в данных были чистые URL */
function stripTracking(url: string) {
  const u = new URL(url)
  for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k)
  return u.toString()
}

const cache = new Map<string, PosterCandidate[]>()

export async function searchPosters(rawQuery: string): Promise<PosterCandidate[]> {
  const query = rawQuery.replace(/\(\s*\d{4}\s*\)/, '').trim()
  const key = query.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  // латиница — сразу английская Википедия, иначе русская с запасным вариантом на английской
  const langs: Lang[] = /[a-z]/i.test(query) && !/[а-яё]/i.test(query) ? ['en'] : ['ru', 'en']
  let result: PosterCandidate[] = []
  for (const lang of langs) {
    result = await searchLang(query, lang)
    if (result.length) break
  }
  cache.set(key, result)
  return result
}
