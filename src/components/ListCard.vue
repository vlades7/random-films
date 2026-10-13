<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FilmCard from './FilmCard.vue'
import FilmEditor from './FilmEditor.vue'
import { uid } from '../api'
import { findPosters } from '../posterAuto'
import { dragFilm } from '../dragFilm'
import type { Film, FilmList } from '../types'

// Список — реактивный объект из App, правим его поля напрямую
// allLists — все списки, чтобы в редакторе фильма можно было выбрать, куда его перенести
const props = defineProps<{ list: FilmList; allLists: FilmList[] }>()
const emit = defineEmits<{
  delete: []
  /** сюда перетащили фильм из другого списка */
  moveFilm: [filmId: string, fromListId: string]
  /** фильм из этого списка перенесли в другой через редактор */
  moveTo: [filmId: string, toListId: string]
}>()

/* ---------- Перетаскивание фильма в другой список ---------- */
const DRAG_TYPE = 'application/x-random-films'

/** Сюда можно бросить фильм, который тащат из другого списка */
const isDropTarget = computed(() => !!dragFilm.fromListId && dragFilm.fromListId !== props.list.id)
// dragenter/dragleave срабатывают и на дочерних элементах — считаем вложенность
const dragDepth = ref(0)
// перетаскивание закончилось (в т.ч. бросили мимо) — сбрасываем подсветку
watch(isDropTarget, (v) => {
  if (!v) dragDepth.value = 0
})

function onDragStart(e: DragEvent, film: Film) {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ filmId: film.id, fromListId: props.list.id }))
  dragFilm.filmId = film.id
  dragFilm.fromListId = props.list.id
}

function onDragEnd() {
  dragFilm.filmId = null
  dragFilm.fromListId = null
}

function onDragEnter() {
  if (isDropTarget.value) dragDepth.value++
}

function onDragLeave() {
  if (isDropTarget.value) dragDepth.value = Math.max(0, dragDepth.value - 1)
}

function onDragOver(e: DragEvent) {
  if (!isDropTarget.value || !e.dataTransfer) return
  e.preventDefault() // разрешаем бросок
  e.dataTransfer.dropEffect = 'move'
}

function onDrop(e: DragEvent) {
  dragDepth.value = 0
  const raw = e.dataTransfer?.getData(DRAG_TYPE)
  if (!raw || !isDropTarget.value) return
  e.preventDefault()
  const { filmId, fromListId } = JSON.parse(raw) as { filmId: string; fromListId: string }
  emit('moveFilm', filmId, fromListId)
  onDragEnd()
}

const search = ref('')
const importOpen = ref(false)
const importText = ref('')
const importResult = ref('')
const editing = ref<{ film: Film | null } | null>(null)

// Непросмотренные — первыми, просмотренные — в конце (порядок внутри групп сохраняется)
const visibleFilms = computed(() => {
  const q = search.value.trim().toLowerCase()
  const films = q ? props.list.films.filter((f) => f.title.toLowerCase().includes(q)) : props.list.films
  return [...films.filter((f) => !f.watched), ...films.filter((f) => f.watched)]
})

const watchedCount = computed(() => props.list.films.filter((f) => f.watched).length)

function onSave({ listId, ...data }: { title: string; image?: string; watched: boolean; listId: string }) {
  const film = editing.value?.film
  if (film) {
    film.title = data.title
    film.image = data.image
    film.watched = data.watched
    // перенос в другой список из редактора — замена перетаскиванию на телефонах
    if (listId !== props.list.id) emit('moveTo', film.id, listId)
  } else {
    props.list.films.unshift({ id: uid(), ...data })
    // берём реактивный объект из массива, чтобы картинка потом сохранилась
    if (!data.image) findPosters([props.list.films[0]], props.list.color)
  }
  editing.value = null
}

const withoutImage = computed(() => props.list.films.filter((f) => !f.image))

function removeFilm(film: Film) {
  if (!confirm(`Удалить «${film.title}» из списка?`)) return
  props.list.films = props.list.films.filter((f) => f.id !== film.id)
}

/** Импорт из текста: по фильму на строку, нумерация и маркеры отрезаются */
function runImport() {
  const existing = new Set(props.list.films.map((f) => f.title.toLowerCase()))
  const start = props.list.films.length
  let added = 0
  let skipped = 0
  for (const line of importText.value.split(/\r?\n/)) {
    const title = line.replace(/^\s*(\d+[.)]|[-*•–—])\s*/, '').trim()
    if (!title) continue
    if (existing.has(title.toLowerCase())) {
      skipped++
      continue
    }
    existing.add(title.toLowerCase())
    props.list.films.push({ id: uid(), title, watched: false })
    added++
  }
  importResult.value = `Добавлено: ${added}${skipped ? `, пропущено дублей: ${skipped}` : ''}`
  importText.value = ''
  if (added) {
    importResult.value += ' — ищу постеры…'
    findPosters(props.list.films.slice(start), props.list.color)
  }
}

function clearFilms() {
  if (confirm(`Удалить ВСЕ фильмы из «${props.list.name}»?`)) props.list.films = []
}

function deleteList() {
  if (confirm(`Удалить список «${props.list.name}» целиком?`)) emit('delete')
}
</script>

<template>
  <section
    class="list panel"
    :class="{ off: !list.enabled, 'drop-target': isDropTarget, 'drop-over': isDropTarget && dragDepth > 0 }"
    :style="{ '--accent': list.color }"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <div v-if="isDropTarget" class="drop-hint">⬇ Перенести в «{{ list.name }}»</div>
    <header>
      <input v-model="list.color" type="color" class="color" title="Цвет списка" />
      <input v-model="list.name" class="name" maxlength="40" />
      <label class="toggle" :title="list.enabled ? 'Участвует в розыгрыше' : 'Не участвует'">
        <input v-model="list.enabled" type="checkbox" />
        <span class="track"><span class="thumb" /></span>
        <span class="toggle-label">{{ list.enabled ? 'В игре' : 'Выкл' }}</span>
      </label>
    </header>

    <div class="toolbar">
      <span class="count" title="Всего фильмов">🎞 {{ list.films.length }}</span>
      <span v-if="watchedCount" class="count watched-count" title="Просмотрено">✓ {{ watchedCount }}</span>
      <input v-if="list.films.length > 6" v-model="search" class="search" placeholder="🔍 Поиск" />
      <div class="spacer" />
      <button class="btn small" @click="editing = { film: null }">➕ Фильм</button>
      <button class="btn small ghost" @click="importOpen = !importOpen">📋 Импорт</button>
      <button
        v-if="withoutImage.length"
        class="btn small ghost"
        :title="`Найти постеры для фильмов без картинки (${withoutImage.length})`"
        @click="findPosters(withoutImage, list.color)"
      >
        🖼 Постеры ({{ withoutImage.length }})
      </button>
      <button class="btn small ghost" :disabled="!list.films.length" title="Очистить список" @click="clearFilms">🧹</button>
      <button class="btn small danger" title="Удалить список" @click="deleteList">🗑</button>
    </div>

    <div v-if="importOpen" class="import">
      <textarea
        v-model="importText"
        rows="6"
        placeholder="Вставьте список фильмов — по одному на строку.&#10;1. Начало&#10;2. Интерстеллар&#10;- Матрица"
      />
      <div class="import-row">
        <span class="import-result">{{ importResult }}</span>
        <button class="btn small" :disabled="!importText.trim()" @click="runImport">Добавить</button>
      </div>
    </div>

    <div v-if="visibleFilms.length" class="films">
      <div
        v-for="film in visibleFilms"
        :key="film.id"
        class="film"
        :class="{ watched: film.watched, dragging: dragFilm.filmId === film.id }"
        draggable="true"
        title="Перетащите в другой список, чтобы перенести"
        @click="editing = { film }"
        @dragstart="onDragStart($event, film)"
        @dragend="onDragEnd"
      >
        <div class="thumb-wrap">
          <FilmCard :title="film.title" :image="film.image" :color="list.color" :watched="film.watched" />
          <button
            class="icon-btn eye"
            :class="{ on: film.watched }"
            :title="film.watched ? 'Снять отметку «просмотрен»' : 'Отметить как просмотренный'"
            @click.stop="film.watched = !film.watched"
          >
            {{ film.watched ? '↺' : '✓' }}
          </button>
          <button class="icon-btn del" title="Удалить" @click.stop="removeFilm(film)">✕</button>
        </div>
        <div class="film-title" :title="film.title">{{ film.title }}</div>
      </div>
    </div>
    <div v-else class="empty">{{ search ? 'Ничего не найдено' : 'Пусто. Добавьте фильмы ➕ или импортируйте списком 📋' }}</div>

    <FilmEditor
      v-if="editing"
      :film="editing.film"
      :color="list.color"
      :list-id="list.id"
      :lists="allLists"
      @save="onSave"
      @close="editing = null"
    />
  </section>
</template>

<style scoped>
.list {
  padding: 14px;
  border-color: var(--accent);
  box-shadow: 0 0 24px color-mix(in srgb, var(--accent) 35%, transparent), 0 10px 40px rgba(0, 0, 0, 0.4);
  transition: opacity 0.2s, filter 0.2s;
  min-width: 0;
}

.list.off {
  opacity: 0.55;
  filter: grayscale(0.6);
}

header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 2px solid var(--accent);
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  flex: none;
}

.color::-webkit-color-swatch-wrapper { padding: 0; }
.color::-webkit-color-swatch { border: none; border-radius: 50%; }

.name {
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-size: 20px;
  background: transparent;
  border-color: transparent;
  color: var(--accent);
  text-shadow: 0 0 8px var(--accent);
}

.name:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

/* переключатель */
.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  flex: none;
}

.toggle input {
  display: none;
}

.track {
  position: relative;
  width: 46px;
  height: 24px;
  border-radius: 12px;
  background: #3a2a4a;
  border: 2px solid #6b5a7a;
  transition: background 0.2s, border-color 0.2s;
}

.thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ccc;
  transition: transform 0.2s, background 0.2s;
}

.toggle input:checked + .track {
  background: color-mix(in srgb, var(--accent) 45%, #000);
  border-color: var(--accent);
}

.toggle input:checked + .track .thumb {
  transform: translateX(22px);
  background: #fff;
  box-shadow: 0 0 8px var(--accent);
}

.toggle-label {
  font-size: 12px;
  font-weight: 800;
  width: 46px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin: 12px 0;
}

.count {
  font-weight: 800;
  color: var(--accent);
}

.search {
  width: 130px;
  padding: 5px 10px;
  font-size: 13px;
}

.spacer {
  flex: 1;
}

.import {
  margin-bottom: 12px;
}

.import textarea {
  width: 100%;
  resize: vertical;
}

.import-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}

.import-result {
  font-size: 13px;
  color: var(--green);
}

.films {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
  gap: 10px;
  max-height: 460px;
  overflow-y: auto;
  padding: 4px;
}

.film {
  cursor: pointer;
  min-width: 0;
}

.thumb-wrap {
  position: relative;
  aspect-ratio: 2 / 3;
  font-size: 11px;
  border-radius: 10px;
  transition: transform 0.15s, box-shadow 0.15s;
}

/* ---------- перетаскивание ---------- */
.film {
  cursor: grab;
}

.film.dragging {
  opacity: 0.35;
}

.list {
  position: relative;
}

.list.drop-target {
  outline: 3px dashed var(--accent);
  outline-offset: 4px;
}

.list.drop-over {
  outline-style: solid;
  transform: scale(1.01);
  box-shadow: 0 0 40px var(--accent), 0 10px 40px rgba(0, 0, 0, 0.4);
}

.drop-hint {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 18%, rgba(18, 0, 31, 0.75));
  color: #fff;
  font-family: var(--font-display);
  font-size: 20px;
  text-align: center;
  padding: 16px;
  text-shadow: 0 0 10px var(--accent);
  pointer-events: none; /* события идут в саму секцию */
}

.list.drop-over .drop-hint {
  background: color-mix(in srgb, var(--accent) 35%, rgba(18, 0, 31, 0.6));
}

.film.watched .film-title {
  color: var(--muted);
  text-decoration: line-through;
  opacity: 0.7;
}

.film:hover .thumb-wrap {
  transform: translateY(-3px) rotate(-1deg);
  box-shadow: 0 0 14px var(--accent);
}

.del {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  font-size: 11px;
  opacity: 0;
}

.film:hover .del,
.film:hover .eye {
  opacity: 1;
}

/* переключатель «просмотрен» — слева вверху */
.eye {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 22px;
  height: 22px;
  font-size: 12px;
  font-weight: 800;
  opacity: 0;
}

.eye:hover {
  background: var(--green);
  color: #12001f;
}

.eye.on:hover {
  background: var(--gold);
}

/* Сенсорные экраны: наведения нет — кнопки на постерах видны всегда, «рука» не нужна */
@media (hover: none) {
  .del,
  .eye {
    opacity: 0.9;
    width: 26px;
    height: 26px;
  }

  .film {
    cursor: pointer;
  }
}

@media (max-width: 600px) {
  .list {
    padding: 12px;
  }

  .name {
    font-size: 17px;
  }

  .films {
    grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
    gap: 8px;
    max-height: none; /* на телефоне прокручивается вся страница, а не список внутри */
  }
}

.watched-count {
  color: var(--muted);
}

.film-title {
  margin-top: 4px;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty {
  padding: 24px 8px;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}
</style>
