import { reactive } from 'vue'
import { api } from './api'
import type { Film, PosterCandidate } from './types'

/** Убираем «(фильм, 2004)», кавычки, ё и регистр — для сравнения названий */
export function normalizeTitle(s: string) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/ё/g, 'е')
    .replace(/[«»"“”„'’:!?.,—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Можно ли выбрать постер без участия человека:
 * ровно один кандидат с точно совпадающим названием (и годом, если он указан).
 */
export function pickAutomatic(filmTitle: string, candidates: PosterCandidate[]) {
  const year = /\b(19|20)\d{2}\b/.exec(filmTitle)?.[0]
  const name = normalizeTitle(filmTitle)
  let exact = candidates.filter((c) => normalizeTitle(c.title) === name)
  if (year) exact = exact.filter((c) => c.year === year)
  return exact.length === 1 ? exact[0] : null
}

export interface PosterJob {
  film: Film
  color: string
  candidates: PosterCandidate[]
}

/** Общее состояние автоподбора: прогресс и очередь фильмов, где нужен выбор */
export const posterAuto = reactive({
  total: 0,
  done: 0,
  autoApplied: 0,
  queue: [] as PosterJob[],
})

let chain = Promise.resolve()
const inFlight = new Set<string>()

/** Ищет постеры для фильмов (по очереди). Однозначные ставит сам, остальные — в очередь выбора. */
export function findPosters(films: Film[], color: string) {
  const todo = films.filter(
    (f) => !f.image && !inFlight.has(f.id) && !posterAuto.queue.some((j) => j.film.id === f.id),
  )
  posterAuto.total += todo.length
  for (const film of todo) {
    inFlight.add(film.id)
    chain = chain.then(async () => {
      try {
        if (film.image) return // пока ждали — картинку поставили вручную
        const candidates = await api.searchPosters(film.title)
        const auto = pickAutomatic(film.title, candidates)
        if (auto) {
          film.image = auto.image
          posterAuto.autoApplied++
        } else {
          posterAuto.queue.push({ film, color, candidates })
        }
      } catch {
        posterAuto.queue.push({ film, color, candidates: [] })
      } finally {
        inFlight.delete(film.id)
        posterAuto.done++
        if (posterAuto.done >= posterAuto.total) {
          posterAuto.total = 0
          posterAuto.done = 0
        }
      }
    })
  }
}
