<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import FilmCard from './FilmCard.vue'
import type { PoolFilm } from '../types'

const ITEM_H = 240
const WINDOW_H = 330

interface ReelItem {
  key: number
  title: string
  image?: string
  color: string
}

const props = defineProps<{ pool: PoolFilm[] }>()

let keySeq = 0
const PLACEHOLDER: Pick<PoolFilm, 'title' | 'image' | 'color'> = { title: '?', color: '#ffd23f' }

function toItem(f: Pick<PoolFilm, 'title' | 'image' | 'color'> | undefined): ReelItem {
  const src = f ?? PLACEHOLDER
  return { key: keySeq++, title: src.title, image: src.image, color: src.color }
}

function randomFilm() {
  return props.pool.length ? props.pool[Math.floor(Math.random() * props.pool.length)] : undefined
}

const items = ref<ReelItem[]>([])
const offsetIndex = ref(1)
const duration = ref(0)
const spinning = ref(false)
const hasResult = ref(false)
const stripEl = ref<HTMLElement>()

const offsetPx = computed(() => -(offsetIndex.value * ITEM_H) + (WINDOW_H - ITEM_H) / 2)

function resetIdle() {
  items.value = [toItem(randomFilm()), toItem(randomFilm()), toItem(randomFilm())]
  duration.value = 0
  offsetIndex.value = 1
}

onMounted(resetIdle)
watch(
  () => props.pool,
  () => {
    if (!spinning.value && !hasResult.value) resetIdle()
  },
)

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/** Прокрутить барабан и остановиться на target */
async function spin(target: PoolFilm, ms: number, extraItems: number) {
  spinning.value = true
  hasResult.value = false

  // Лента: [сосед сверху, текущий, ...случайные, ПОБЕДИТЕЛЬ, сосед снизу]
  const current = items.value.slice(offsetIndex.value - 1, offsetIndex.value + 1)
  const strip = [...current]
  for (let i = 0; i < extraItems; i++) strip.push(toItem(randomFilm()))
  strip.push(toItem(target), toItem(randomFilm()))

  duration.value = 0
  items.value = strip
  offsetIndex.value = 1
  await nextTick()
  await nextFrame()
  await nextFrame()

  duration.value = ms
  offsetIndex.value = strip.length - 2

  await new Promise<void>((resolve) => {
    const done = () => {
      stripEl.value?.removeEventListener('transitionend', done)
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(done, ms + 150)
    stripEl.value?.addEventListener('transitionend', done)
  })

  // Схлопываем ленту до 3 элементов — визуально ничего не меняется
  const n = strip.length
  duration.value = 0
  items.value = [strip[n - 3], strip[n - 2], strip[n - 1]]
  offsetIndex.value = 1
  spinning.value = false
  hasResult.value = true
}

defineExpose({ spin })
</script>

<template>
  <div class="reel" :class="{ spinning }" :style="{ height: WINDOW_H + 'px' }">
    <div
      ref="stripEl"
      class="strip"
      :style="{
        transform: `translateY(${offsetPx}px)`,
        transition: duration ? `transform ${duration}ms cubic-bezier(0.18, 0.72, 0.22, 1.04)` : 'none',
      }"
    >
      <div v-for="it in items" :key="it.key" class="cell" :style="{ height: ITEM_H + 'px' }">
        <FilmCard :title="it.title" :image="it.image" :color="it.color" />
      </div>
    </div>
    <div class="shade" />
  </div>
</template>

<style scoped>
.reel {
  position: relative;
  width: 170px;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(90deg, #d9d9d9, #ffffff 30%, #ffffff 70%, #cfcfcf);
  box-shadow:
    inset 0 0 0 4px #7a5200,
    inset 0 0 0 7px var(--gold),
    inset 0 10px 20px rgba(0, 0, 0, 0.5);
}

.strip {
  will-change: transform;
}

.cell {
  padding: 8px 12px;
}

.spinning .strip {
  filter: blur(1.5px) saturate(1.3);
}

/* затемнение сверху и снизу — эффект цилиндра */
.shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.75) 0%,
    rgba(0, 0, 0, 0.1) 22%,
    transparent 35%,
    transparent 65%,
    rgba(0, 0, 0, 0.1) 78%,
    rgba(0, 0, 0, 0.75) 100%
  );
  border-radius: 12px;
}
</style>
