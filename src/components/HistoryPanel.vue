<script setup lang="ts">
import FilmCard from './FilmCard.vue'
import type { HistoryEntry } from '../types'

defineProps<{ history: HistoryEntry[]; colorOf: (listName: string) => string }>()
const emit = defineEmits<{ clear: [] }>()

function clear() {
  if (confirm('Сбросить всю историю выпадений?')) emit('clear')
}
</script>

<template>
  <section class="history panel">
    <header>
      <h2 class="neon-title">📜 История</h2>
      <button class="btn small danger" :disabled="!history.length" @click="clear">Сбросить историю</button>
    </header>

    <ol v-if="history.length" class="entries">
      <li v-for="(h, i) in history" :key="h.date + i" class="entry" :style="{ '--accent': colorOf(h.listName) }">
        <span class="num">#{{ history.length - i }}</span>
        <div class="thumb"><FilmCard :title="h.title" :image="h.image" :color="colorOf(h.listName)" /></div>
        <div class="info">
          <div class="title">{{ h.title }}</div>
          <div class="meta">
            <span class="chip">{{ h.listName }}</span>
            <span class="date">🕒 {{ h.date }}</span>
          </div>
        </div>
      </li>
    </ol>
    <div v-else class="empty">Пока ничего не выпадало. Потяни рычаг! 🎰</div>
  </section>
</template>

<style scoped>
.history {
  padding: 16px;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

h2 {
  margin: 0;
  font-size: 22px;
}

.entries {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 560px;
  overflow-y: auto;
}

.entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-left: 4px solid var(--accent);
}

.entry:first-child {
  background: linear-gradient(90deg, rgba(255, 210, 63, 0.25), rgba(0, 0, 0, 0.3));
}

.num {
  font-family: var(--font-display);
  color: var(--gold);
  width: 40px;
  flex: none;
}

.thumb {
  width: 44px;
  height: 66px;
  flex: none;
  font-size: 7px;
}

.info {
  min-width: 0;
}

.title {
  font-weight: 800;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
  font-size: 13px;
  color: var(--muted);
}

.chip {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent);
  color: #12001f;
  font-weight: 800;
  font-size: 12px;
}

.empty {
  padding: 30px 8px;
  text-align: center;
  color: var(--muted);
}
</style>
