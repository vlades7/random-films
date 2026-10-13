import { reactive } from 'vue'

/** Какой фильм сейчас перетаскивают — чтобы списки могли подсветиться как цели */
export const dragFilm = reactive({
  filmId: null as string | null,
  fromListId: null as string | null,
})
