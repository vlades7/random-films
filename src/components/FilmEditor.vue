<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Modal from './Modal.vue'
import FilmCard from './FilmCard.vue'
import PosterChoices from './PosterChoices.vue'
import { api } from '../api'
import type { Film, PosterCandidate } from '../types'

const props = defineProps<{ film: Film | null; color: string }>()
const emit = defineEmits<{ save: [data: { title: string; image?: string; watched: boolean }]; close: [] }>()

const title = ref(props.film?.title ?? '')
const image = ref(props.film?.image ?? '')
const watched = ref(props.film?.watched ?? false)
const uploading = ref(false)
const error = ref('')
const dragOver = ref(false)
const fileInput = ref<HTMLInputElement>()

async function upload(file: File | undefined | null) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = 'Это не картинка'
    return
  }
  error.value = ''
  uploading.value = true
  try {
    image.value = await api.uploadImage(file)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    uploading.value = false
  }
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  void upload(e.dataTransfer?.files[0])
}

// Ctrl+V картинки из буфера обмена
function onPaste(e: ClipboardEvent) {
  const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
  if (file) {
    e.preventDefault()
    void upload(file)
  }
}
onMounted(() => window.addEventListener('paste', onPaste))
onBeforeUnmount(() => window.removeEventListener('paste', onPaste))

const webOpen = ref(false)

function pickWeb(c: PosterCandidate) {
  image.value = c.image
  webOpen.value = false
}

function save() {
  const t = title.value.trim()
  if (!t) {
    error.value = 'Введите название'
    return
  }
  emit('save', { title: t, image: image.value.trim() || undefined, watched: watched.value })
}
</script>

<template>
  <Modal :title="film ? 'Редактировать фильм' : 'Новый фильм'" :wide="webOpen" @close="emit('close')">
    <form class="editor" @submit.prevent="save">
      <div
        class="drop"
        :class="{ over: dragOver }"
        title="Нажмите, перетащите файл или вставьте Ctrl+V"
        @click="fileInput?.click()"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <FilmCard :title="title || 'Название'" :image="image" :color="color" />
        <div v-if="uploading" class="uploading">Загрузка…</div>
      </div>
      <input ref="fileInput" type="file" accept="image/*" hidden @change="upload(($event.target as HTMLInputElement).files?.[0])" />

      <div class="fields">
        <label>
          Название
          <input v-model="title" autofocus placeholder="Например: Начало" />
        </label>
        <label>
          Картинка (URL)
          <input v-model="image" placeholder="https://… или загрузите файл" />
        </label>
        <div class="hint">🖼 Кликни по постеру, перетащи файл или нажми Ctrl+V</div>
        <label class="watched-field">
          <input v-model="watched" type="checkbox" />
          ✓ Просмотрен — не участвует в розыгрыше
        </label>
        <div class="row">
          <button
            type="button"
            class="btn small"
            :class="{ ghost: !webOpen }"
            :disabled="!title.trim()"
            title="Поиск постера в Википедии"
            @click="webOpen = !webOpen"
          >
            🔍 Найти в интернете
          </button>
          <button type="button" class="btn ghost small" @click="fileInput?.click()">📁 Файл</button>
          <button v-if="image" type="button" class="btn ghost small" @click="image = ''">✕ Убрать картинку</button>
        </div>
        <div v-if="error" class="error">{{ error }}</div>
        <div class="row actions">
          <button type="button" class="btn ghost" @click="emit('close')">Отмена</button>
          <button type="submit" class="btn" :disabled="uploading">💾 Сохранить</button>
        </div>
      </div>
    </form>
    <div v-if="webOpen" class="web">
      <PosterChoices :query="title" @pick="pickWeb" />
    </div>
    <div v-else-if="!film" class="auto-hint">
      💡 Если не выбрать картинку, постер поищется автоматически после сохранения.
    </div>
  </Modal>
</template>

<style scoped>
.editor {
  display: flex;
  gap: 16px;
}

.drop {
  position: relative;
  flex: none;
  width: 140px;
  height: 210px;
  border-radius: 12px;
  outline: 3px dashed rgba(255, 210, 63, 0.5);
  outline-offset: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: outline-color 0.15s, transform 0.15s;
}

.drop:hover,
.drop.over {
  outline-color: var(--gold);
  transform: scale(1.03);
}

.uploading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 10px;
  font-weight: 800;
}

.fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}

.hint {
  font-size: 12px;
  color: var(--muted);
}

.row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.actions {
  margin-top: auto;
  justify-content: flex-end;
}

.error {
  color: #ff6b81;
  font-weight: 600;
  font-size: 13px;
}

.web {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 2px dashed rgba(255, 210, 63, 0.3);
}

.watched-field {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--text);
}

.watched-field input {
  width: 18px;
  height: 18px;
  accent-color: var(--green);
}

.auto-hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 480px) {
  .editor {
    flex-direction: column;
    align-items: center;
  }
}
</style>
