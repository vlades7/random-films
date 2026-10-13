<script setup lang="ts">
import { computed } from 'vue'
import Modal from './Modal.vue'
import PosterChoices from './PosterChoices.vue'
import { posterAuto } from '../posterAuto'
import type { PosterCandidate } from '../types'

// Очередь фильмов, для которых постер нельзя выбрать автоматически
const job = computed(() => posterAuto.queue[0])

function pick(c: PosterCandidate) {
  const current = job.value
  if (!current) return
  current.film.image = c.image
  posterAuto.queue.shift()
}

function skip() {
  posterAuto.queue.shift()
}

function skipAll() {
  posterAuto.queue.splice(0)
}
</script>

<template>
  <Modal v-if="job" wide :title="`Постер: «${job.film.title}»`" @close="skip">
    <p class="lead">
      <template v-if="job.candidates.length">Нашлось несколько вариантов — выберите нужный.</template>
      <template v-else>Автоматически найти не удалось. Уточните запрос или пропустите.</template>
    </p>
    <!-- key: заново монтируем при переходе к следующему фильму -->
    <PosterChoices :key="job.film.id" :query="job.film.title" :candidates="job.candidates" @pick="pick" />
    <footer>
      <span class="left">
        <template v-if="posterAuto.queue.length > 1">Ещё ждут выбора: {{ posterAuto.queue.length - 1 }}</template>
      </span>
      <button v-if="posterAuto.queue.length > 1" class="btn ghost small" @click="skipAll">Пропустить все</button>
      <button class="btn small" @click="skip">Пропустить ⏭</button>
    </footer>
  </Modal>
</template>

<style scoped>
.lead {
  margin: -4px 0 12px;
  color: var(--muted);
}

footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.left {
  flex: 1;
  font-size: 13px;
  color: var(--muted);
}
</style>
