import type { FilmList } from './types'

// Демо-списки для первого запуска — чтобы сразу было что покрутить.
// Постеры — превью из русской Википедии.

const MINE = [
  { title: 'Матрица', image: 'https://thumb.wikimedia.org/wikipedia/ru/thumb/9/9d/Matrix-DVD.jpg/500px-Matrix-DVD.jpg' },
  { title: 'Интерстеллар', image: 'https://upload.wikimedia.org/wikipedia/ru/c/c3/Interstellar_2014.jpg' },
  { title: 'Бойцовский клуб', image: 'https://thumb.wikimedia.org/wikipedia/ru/thumb/8/8a/Fight_club.jpg/500px-Fight_club.jpg' },
  { title: 'Криминальное чтиво', image: 'https://upload.wikimedia.org/wikipedia/ru/9/93/Pulp_Fiction.jpg' },
  { title: 'Остров проклятых', image: 'https://upload.wikimedia.org/wikipedia/ru/2/22/Kinopoisk.ru-Shutter-Island-1094940.jpg' },
  { title: 'Джентльмены', image: 'https://thumb.wikimedia.org/wikipedia/ru/thumb/c/c1/%D0%94%D0%B6%D0%B5%D0%BD%D1%82%D0%BB%D1%8C%D0%BC%D0%B5%D0%BD%D1%8B.jpg/500px-%D0%94%D0%B6%D0%B5%D0%BD%D1%82%D0%BB%D1%8C%D0%BC%D0%B5%D0%BD%D1%8B.jpg' },
]

const PARTNER = [
  { title: 'Амели', image: 'https://upload.wikimedia.org/wikipedia/ru/9/9b/Amelie_DVD_box.jpg' },
  { title: 'Ла-Ла Ленд', image: 'https://upload.wikimedia.org/wikipedia/ru/8/84/%D0%9B%D0%B0-%D0%9B%D0%B0_%D0%9B%D0%B5%D0%BD%D0%B4_%28%D0%BF%D0%BE%D1%81%D1%82%D0%B5%D1%80_%D1%84%D0%B8%D0%BB%D1%8C%D0%BC%D0%B0%29.jpg' },
  { title: 'Дьявол носит Prada', image: 'https://thumb.wikimedia.org/wikipedia/ru/thumb/9/93/The_Devil_Wears_Prada_Poster.jpg/500px-The_Devil_Wears_Prada_Poster.jpg' },
  { title: 'Гордость и предубеждение (2005)', image: 'https://thumb.wikimedia.org/wikipedia/ru/thumb/8/86/Pride_%26_Prejudice_2005.jpg/500px-Pride_%26_Prejudice_2005.jpg' },
  { title: 'Один дома', image: 'https://thumb.wikimedia.org/wikipedia/ru/thumb/0/03/Home_Alone_dvd_rus.jpg/500px-Home_Alone_dvd_rus.jpg' },
  { title: 'Отпуск по обмену', image: 'https://upload.wikimedia.org/wikipedia/ru/b/bf/The-Holiday-poster.jpg' },
]

export function demoLists(): FilmList[] {
  const toFilms = (arr: { title: string; image: string }[]) =>
    arr.map((f) => ({ id: crypto.randomUUID(), ...f, watched: false }))
  return [
    { id: crypto.randomUUID(), name: 'Мой список', enabled: true, color: '#00e5ff', films: toFilms(MINE) },
    { id: crypto.randomUUID(), name: 'Список партнёра', enabled: true, color: '#ff4fd8', films: toFilms(PARTNER) },
  ]
}
