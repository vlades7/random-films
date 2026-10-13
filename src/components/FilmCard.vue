<script setup lang="ts">
import { ref, watch } from 'vue'
import { useImageUrl } from '../storage/images'

const props = defineProps<{
  title: string
  image?: string | null
  color?: string
  /** Просмотрен — постер чёрно-белый со штампом */
  watched?: boolean
}>()

// Загруженные с компьютера картинки лежат в IndexedDB («idb:…») — превращаем в blob: URL
const src = useImageUrl(() => props.image)

// Если картинка не загрузилась — показываем название
const broken = ref(false)
watch(
  () => props.image,
  () => (broken.value = false),
)
</script>

<template>
  <div class="film-card" :class="{ watched }" :style="{ '--accent': color ?? 'var(--gold)' }">
    <img v-if="src && !broken" :src="src" :alt="title" draggable="false" @error="broken = true" />
    <div v-else class="title-only">
      <span class="star">★</span>
      <span class="text">{{ title }}</span>
      <span class="star">★</span>
    </div>
    <span v-if="watched" class="stamp">Просмотрено</span>
  </div>
</template>

<style scoped>
/* Просмотренный фильм: чёрно-белый постер + красный «штамп» наискосок */
.watched img,
.watched .title-only {
  filter: grayscale(1) brightness(0.6);
}

.stamp {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(-28deg);
  padding: 0.15em 0.5em;
  border: 0.18em solid #ff3355;
  border-radius: 0.3em;
  color: #ff3355;
  background: rgba(20, 0, 10, 0.55);
  font-family: var(--font-display);
  font-size: max(9px, 0.85em);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 0 6px rgba(255, 51, 85, 0.7);
  box-shadow: 0 0 10px rgba(255, 51, 85, 0.5);
  pointer-events: none;
}

.film-card {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 10px;
  background: #120020;
}

img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
}

.title-only {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 70%),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0 8px, transparent 8px 16px),
    linear-gradient(160deg, #3a0857, #12001f);
  border: 3px solid var(--accent);
  border-radius: 10px;
}

.text {
  font-family: var(--font-display);
  font-size: clamp(11px, 1.1em, 22px);
  line-height: 1.15;
  color: #fff;
  text-shadow: 0 0 8px var(--accent), 0 2px 0 #000;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.star {
  color: var(--gold);
  font-size: 0.9em;
  text-shadow: 0 0 6px var(--gold);
}
</style>
