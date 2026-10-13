export type { Film, FilmList, HistoryEntry, PosterCandidate } from '../shared/types'
import type { Film } from '../shared/types'

/** Фильм в пуле розыгрыша — с информацией, из какого он списка */
export interface PoolFilm extends Film {
  listId: string
  listName: string
  color: string
}
