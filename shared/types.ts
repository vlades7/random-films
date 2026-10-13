export interface Film {
  id: string
  title: string
  /** Локальный путь (/images/...) или внешний URL. Пусто — показываем название. */
  image?: string
  /** Просмотрен (выпал в розыгрыше или отмечен вручную) — в розыгрыше не участвует */
  watched?: boolean
}

export interface FilmList {
  id: string
  name: string
  /** Участвует ли список в текущем розыгрыше */
  enabled: boolean
  /** Акцентный цвет списка */
  color: string
  films: Film[]
}

/** Вариант постера из Википедии */
export interface PosterCandidate {
  /** Заголовок статьи, напр. «Авиатор (фильм, 2004)» */
  title: string
  description: string
  year?: string
  /** URL превью постера */
  image: string
  /** Ссылка на статью */
  url: string
}

export interface HistoryEntry {
  title: string
  image: string | null
  /** ДД.ММ.ГГГГ, ЧЧ:ММ:СС */
  date: string
  listName: string
  filmId?: string
  listId?: string
}
