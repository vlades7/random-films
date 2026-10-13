<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FilmCard from './FilmCard.vue'
import type { PoolFilm } from '../types'

// Ширину барабана задаёт CSS (на телефоне она меньше), высоты считаем от неё
// в тех же пропорциях, что и у исходного барабана 170 × 330 с ячейкой 240.
const ITEM_RATIO = 240 / 170
const WINDOW_RATIO = 330 / 240
const reelEl = ref<HTMLElement>()
const reelWidth = ref(170)
const ITEM_H = computed(() => Math.round(reelWidth.value * ITEM_RATIO))
const WINDOW_H = computed(() => Math.round(ITEM_H.value * WINDOW_RATIO))

let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => (reelWidth.value = entry.contentRect.width || 170))
  if (reelEl.value) resizeObserver.observe(reelEl.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())

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

const offsetPx = computed(() => -(offsetIndex.value * ITEM_H.value) + (WINDOW_H.value - ITEM_H.value) / 2)

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
  <div ref="reelEl" class="reel" :class="{ spinning }" :style="{ height: WINDOW_H + 'px' }">
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
  /* ширину задаёт автомат через --reel-w; высоты Reel считает сам */
  width: var(--reel-w, 170px);
  /* текст «названия вместо постера» масштабируется вместе с барабаном (16px при 170px) */
  font-size: calc(var(--reel-w, 170px) / 10.6);
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

/* проценты в padding считаются от ширины барабана: 8px 12px при 170px */
.cell {
  padding: 4.7% 7%;
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
