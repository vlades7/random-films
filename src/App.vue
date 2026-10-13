<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import SlotMachine from './components/SlotMachine.vue'
import ListCard from './components/ListCard.vue'
import HistoryPanel from './components/HistoryPanel.vue'
import WinModal from './components/WinModal.vue'
import Confetti from './components/Confetti.vue'
import PosterPicker from './components/PosterPicker.vue'
import Modal from './components/Modal.vue'
import { posterAuto } from './posterAuto'
import { api, formatDate, uid } from './api'
import { downloadBlob, exportBackup, importBackup } from './storage/backup'
import { sound } from './sound'
import type { Film, FilmList, HistoryEntry, PoolFilm } from './types'

const lists = ref<FilmList[]>([])
const history = ref<HistoryEntry[]>([])
const loaded = ref(false)
const error = ref('')
const tab = ref<'lists' | 'history'>('lists')
const winner = ref<PoolFilm | null>(null)
const confetti = ref<InstanceType<typeof Confetti>>()

const muted = ref(localStorageGet('muted') === '1')
watch(muted, (v) => {
  sound.setMuted(v)
  localStorageSet('muted', v ? '1' : '0')
}, { immediate: true })

function localStorageGet(k: string) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function localStorageSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* не критично */
  }
}

onMounted(async () => {
  try {
    ;[lists.value, history.value] = await Promise.all([api.getLists(), api.getHistory()])
    loaded.value = true
    initWatched()
    // просим браузер не удалять наши данные при нехватке места
    void navigator.storage?.persist?.()
  } catch (e) {
    error.value =
      `Не удалось открыть хранилище браузера: ${e instanceof Error ? e.message : e}. ` +
      'Возможно, включён приватный режим или запрещено хранение данных сайтов.'
  }
})

// Автосохранение списков в IndexedDB (с небольшой задержкой, чтобы не писать на каждую букву)
let saveTimer: ReturnType<typeof setTimeout> | undefined
watch(
  lists,
  () => {
    if (!loaded.value) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      api.saveLists(lists.value).catch((e) => (error.value = `Ошибка сохранения: ${e.message}`))
    }, 400)
  },
  { deep: true },
)

/**
 * Фильмам без отметки «просмотрен» (добавленным до её появления) ставим её
 * по истории (по id, иначе по названию и списку) или по старому счётчику views.
 */
function initWatched() {
  for (const l of lists.value) {
    for (const f of l.films as (Film & { views?: number })[]) {
      if (f.watched === undefined) {
        f.watched =
          (f.views ?? 0) > 0 ||
          history.value.some((h) => (h.filmId ? h.filmId === f.id : h.title === f.title && h.listName === l.name))
      }
      delete f.views
    }
  }
}

const enabledFilms = computed(() =>
  lists.value
    .filter((l) => l.enabled)
    .flatMap((l) => l.films.map((f) => ({ ...f, listId: l.id, listName: l.name, color: l.color }))),
)

/** В барабане — только непросмотренные фильмы из включённых списков */
const pool = computed<PoolFilm[]>(() => enabledFilms.value.filter((f) => !f.watched))

/** Только что выпал последний непросмотренный фильм — покажем уведомление */
const allWatched = ref(false)

function colorOf(listName: string) {
  return lists.value.find((l) => l.name === listName)?.color ?? '#ffd23f'
}

async function onWin(film: PoolFilm) {
  confetti.value?.burst()
  setTimeout(() => (winner.value = film), 400)

  const original = lists.value.find((l) => l.id === film.listId)?.films.find((f) => f.id === film.id)
  if (original) original.watched = true
  if (!pool.value.length) allWatched.value = true

  const entry: HistoryEntry = {
    title: film.title,
    image: film.image ?? null,
    date: formatDate(),
    listName: film.listName,
    filmId: film.id,
    listId: film.listId,
  }
  try {
    history.value = await api.addHistory(entry)
  } catch (e) {
    error.value = `Не удалось записать историю: ${e instanceof Error ? e.message : e}`
  }
}

/* ---------- Резервная копия ---------- */
const backupInput = ref<HTMLInputElement>()

async function doExport() {
  try {
    const blob = await exportBackup(lists.value, history.value)
    const date = formatDate().slice(0, 10).split('.').reverse().join('-')
    downloadBlob(blob, `kino-jackpot-${date}.json`)
  } catch (e) {
    error.value = `Не удалось сохранить копию: ${e instanceof Error ? e.message : e}`
  }
}

async function doImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // чтобы тот же файл можно было выбрать повторно
  if (!file) return
  if (!confirm('Загрузить копию? Текущие списки и история в этом браузере будут заменены.')) return
  try {
    const data = await importBackup(file)
    loaded.value = false // не пересохранять то, что только что записали
    lists.value = data.lists
    history.value = data.history
    initWatched()
    await nextTick()
    loaded.value = true
  } catch (err) {
    error.value = `Не удалось загрузить копию: ${err instanceof Error ? err.message : err}`
  }
}

async function clearHistory() {
  await api.clearHistory()
  history.value = []
}

const PALETTE = ['#39ff88', '#ffd23f', '#ff8c1a', '#a66bff', '#00e5ff', '#ff4fd8']
function addList() {
  lists.value.push({
    id: uid(),
    name: `Список ${lists.value.length + 1}`,
    enabled: true,
    color: PALETTE[lists.value.length % PALETTE.length],
    films: [],
  })
  tab.value = 'lists'
}

/** Перенос фильма между списками (перетаскиванием) — в начало целевого списка */
function moveFilm(filmId: string, fromListId: string, toListId: string) {
  const from = lists.value.find((l) => l.id === fromListId)
  const to = lists.value.find((l) => l.id === toListId)
  const film = from?.films.find((f) => f.id === filmId)
  if (!from || !to || !film || from === to) return
  const duplicate = to.films.some((f) => f.title.trim().toLowerCase() === film.title.trim().toLowerCase())
  if (duplicate && !confirm(`В «${to.name}» уже есть «${film.title}». Всё равно перенести?`)) return
  from.films = from.films.filter((f) => f.id !== filmId)
  to.films.unshift(film)
}

function deleteList(id: string) {
  lists.value = lists.value.filter((l) => l.id !== id)
}
</script>

<template>
  <Confetti ref="confetti" />

  <div class="app">
    <button class="mute icon-btn" :title="muted ? 'Включить звук' : 'Выключить звук'" @click="muted = !muted">
      {{ muted ? '🔇' : '🔊' }}
    </button>

    <div v-if="error" class="error" @click="error = ''">⚠️ {{ error }} <small>(клик — скрыть)</small></div>

    <!-- Быстрые переключатели списков -->
    <div v-if="lists.length" class="chips">
      <span class="chips-label">Играют:</span>
      <button
        v-for="l in lists"
        :key="l.id"
        class="chip"
        :class="{ on: l.enabled }"
        :style="{ '--accent': l.color }"
        @click="l.enabled = !l.enabled"
      >
        {{ l.enabled ? '✔' : '✖' }} {{ l.name }} <small>({{ l.films.length }})</small>
      </button>
    </div>

    <SlotMachine :pool="pool" :total="enabledFilms.length" @win="onWin" />

    <nav class="tabs">
      <button :class="{ active: tab === 'lists' }" @click="tab = 'lists'">🎞 Списки фильмов</button>
      <button :class="{ active: tab === 'history' }" @click="tab = 'history'">
        📜 История <span class="badge">{{ history.length }}</span>
      </button>
    </nav>

    <div v-show="tab === 'lists'" class="lists">
      <ListCard
        v-for="l in lists"
        :key="l.id"
        :list="l"
        :all-lists="lists"
        @delete="deleteList(l.id)"
        @move-film="(filmId, fromListId) => moveFilm(filmId, fromListId, l.id)"
        @move-to="(filmId, toListId) => moveFilm(filmId, l.id, toListId)"
      />
      <button class="add-list" @click="addList">➕<br />Новый список</button>
    </div>

    <HistoryPanel v-show="tab === 'history'" :history="history" :color-of="colorOf" @clear="clearHistory" />

    <footer class="backup">
      <p>
        🔒 Списки и история хранятся только в этом браузере. Чтобы не потерять их или перенести на другое
        устройство — сохраните резервную копию.
      </p>
      <div class="backup-actions">
        <button class="btn small ghost" :disabled="!loaded" @click="doExport">💾 Сохранить копию</button>
        <button class="btn small ghost" :disabled="!loaded" @click="backupInput?.click()">📂 Загрузить копию</button>
        <input ref="backupInput" type="file" accept=".json,application/json" hidden @change="doImport" />
      </div>
    </footer>
  </div>

  <WinModal v-if="winner" :film="winner" @close="winner = null" />
  <Modal v-if="allWatched && !winner" @close="allWatched = false">
    <div class="all-done">
      <div class="all-title">🏆 Всё просмотрено!</div>
      <p>
        Это был последний фильм — во включённых списках больше нет фильмов для розыгрыша. Добавьте новые
        фильмы или снимите отметку «просмотрен» с каких-нибудь старых.
      </p>
      <button class="btn" @click="allWatched = false">Понятно</button>
    </div>
  </Modal>
  <PosterPicker v-if="!winner && !allWatched" />

  <div v-if="posterAuto.total" class="toast">
    🔎 Ищу постеры: {{ posterAuto.done }} / {{ posterAuto.total }}
    <small v-if="posterAuto.queue.length">· ждут выбора: {{ posterAuto.queue.length }}</small>
  </div>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px 60px;
}

.mute {
  position: fixed;
  top: 14px;
  right: 14px;
  width: 42px;
  height: 42px;
  font-size: 20px;
  z-index: 20;
  border: 2px solid var(--gold);
}

.error {
  margin: 0 auto 16px;
  max-width: 680px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--red-dark);
  border: 2px solid #ff6b81;
  cursor: pointer;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-bottom: 22px;
}

.chips-label {
  font-family: var(--font-display);
  color: var(--gold);
}

.chip {
  padding: 6px 14px;
  border-radius: 999px;
  border: 2px solid var(--accent);
  background: rgba(0, 0, 0, 0.4);
  color: var(--muted);
  font-weight: 800;
  font-size: 14px;
  text-decoration: line-through;
  transition: all 0.2s;
}

.chip.on {
  background: var(--accent);
  color: #12001f;
  text-decoration: none;
  box-shadow: 0 0 14px var(--accent);
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 40px 0 18px;
}

.tabs button {
  padding: 10px 22px;
  border-radius: 999px;
  border: 2px solid var(--gold);
  background: rgba(0, 0, 0, 0.35);
  color: var(--gold);
  font-family: var(--font-display);
  font-size: 15px;
  transition: all 0.2s;
}

.tabs button.active {
  background: linear-gradient(180deg, #ffe680, var(--gold) 50%, var(--gold-dark));
  color: #3a1500;
  box-shadow: 0 0 18px var(--gold);
}

.badge {
  display: inline-block;
  min-width: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--red);
  color: #fff;
  font-size: 12px;
}

.lists {
  display: grid;
  /* min(…, 100%) — на узком экране одна колонка на всю ширину без горизонтальной прокрутки */
  grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr));
  gap: 18px;
  align-items: start;
}

.add-list {
  min-height: 140px;
  border-radius: var(--radius);
  border: 3px dashed rgba(255, 210, 63, 0.5);
  background: rgba(0, 0, 0, 0.2);
  color: var(--gold);
  font-family: var(--font-display);
  font-size: 18px;
  transition: all 0.2s;
}

.add-list:hover {
  border-color: var(--gold);
  background: rgba(255, 210, 63, 0.08);
}

.all-done {
  text-align: center;
}

.all-title {
  font-family: var(--font-display);
  font-size: 30px;
  color: var(--gold);
  text-shadow: 0 0 12px #ff8c1a, 0 0 28px var(--pink);
}

.all-done p {
  color: var(--muted);
  line-height: 1.5;
}

.backup {
  margin-top: 40px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  border-radius: var(--radius);
  border: 1px dashed rgba(255, 210, 63, 0.35);
  background: rgba(0, 0, 0, 0.25);
}

.backup p {
  margin: 0;
  flex: 1 1 320px;
  font-size: 13px;
  color: var(--muted);
}

.backup-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 60;
  padding: 10px 18px;
  border-radius: 999px;
  background: #12001f;
  border: 2px solid var(--cyan);
  box-shadow: 0 0 18px rgba(0, 229, 255, 0.5);
  font-weight: 800;
  white-space: nowrap;
  max-width: calc(100vw - 32px);
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---------- Телефоны ---------- */
@media (max-width: 600px) {
  .app {
    /* сверху место под кнопку звука, чтобы она не наезжала на переключатели списков */
    padding: 62px 12px 40px;
  }

  .mute {
    top: 10px;
    right: 10px;
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .chips {
    margin-bottom: 16px;
    gap: 6px;
  }

  .chip {
    padding: 5px 10px;
    font-size: 13px;
  }

  .tabs {
    margin: 28px 0 14px;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tabs button {
    padding: 9px 14px;
    font-size: 13px;
  }

  .add-list {
    min-height: 90px;
  }

  .backup {
    margin-top: 28px;
  }
}
</style>
