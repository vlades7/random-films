<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api'
import type { PosterCandidate } from '../types'

const props = defineProps<{
  query: string
  /** Уже найденные варианты — тогда при открытии не ищем повторно */
  candidates?: PosterCandidate[]
}>()
const emit = defineEmits<{ pick: [candidate: PosterCandidate] }>()

const q = ref(props.query)
const results = ref<PosterCandidate[]>(props.candidates ?? [])
const loading = ref(false)
const error = ref('')
const searched = ref(!!props.candidates)

async function search() {
  const text = q.value.trim()
  if (!text) return
  loading.value = true
  error.value = ''
  try {
    results.value = await api.searchPosters(text)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    results.value = []
  } finally {
    loading.value = false
    searched.value = true
  }
}

onMounted(() => {
  if (!props.candidates) void search()
})
</script>

<template>
  <div class="choices">
    <form class="search" @submit.prevent="search">
      <input v-model="q" placeholder="Название фильма, можно с годом" />
      <button class="btn small" type="submit" :disabled="loading">🔍 Искать</button>
    </form>

    <div v-if="loading" class="state">🎰 Ищу в Википедии…</div>
    <div v-else-if="error" class="state err">⚠️ {{ error }}</div>
    <div v-else-if="searched && !results.length" class="state">
      Ничего не нашлось. Попробуйте уточнить название (или оригинальное на английском).
    </div>

    <div v-if="!loading && results.length" class="grid">
      <button
        v-for="c in results"
        :key="c.image"
        type="button"
        class="cand"
        :title="c.description"
        @click="emit('pick', c)"
      >
        <img :src="c.image" :alt="c.title" loading="lazy" />
        <span class="t">{{ c.title }}</span>
        <span class="d">{{ c.description }}</span>
        <a class="wiki" :href="c.url" target="_blank" rel="noopener" title="Открыть статью" @click.stop>↗</a>
      </button>
    </div>
  </div>
</template>

<style scoped>
.choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search {
  display: flex;
  gap: 8px;
}

.search input {
  flex: 1;
  min-width: 0;
}

.state {
  padding: 16px 8px;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}

.state.err {
  color: #ff6b81;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
  padding: 4px;
}

.cand {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px;
  border-radius: 12px;
  border: 2px solid rgba(255, 210, 63, 0.3);
  background: rgba(0, 0, 0, 0.35);
  color: var(--text);
  text-align: left;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.cand:hover:not(:disabled) {
  transform: translateY(-3px);
  border-color: var(--gold);
  box-shadow: 0 0 16px rgba(255, 210, 63, 0.5);
}

.cand img {
  width: 100%;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: 8px;
  background: #12001f;
}

.t {
  font-weight: 800;
  font-size: 12px;
  line-height: 1.2;
}

.d {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wiki {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  text-decoration: none;
  font-size: 13px;
}
</style>
