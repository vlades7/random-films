<script setup lang="ts">
import Modal from './Modal.vue'
import FilmCard from './FilmCard.vue'
import type { PoolFilm } from '../types'

defineProps<{ film: PoolFilm }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Modal wide @close="emit('close')">
    <div class="win">
      <div class="rays" />
      <div class="jackpot">ДЖЕКПОТ!</div>
      <div class="sub">Сегодня смотрим:</div>
      <div class="poster" :style="{ '--accent': film.color }">
        <FilmCard :title="film.title" :image="film.image" :color="film.color" />
      </div>
      <div class="title">{{ film.title }}</div>
      <div class="from" :style="{ background: film.color }">из списка «{{ film.listName }}»</div>
      <button class="btn" @click="emit('close')">🍿 Ура, смотрим!</button>
    </div>
  </Modal>
</template>

<style scoped>
.win {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 10px 0 6px;
  text-align: center;
  overflow: hidden;
}

.rays {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 900px;
  height: 900px;
  margin: -450px 0 0 -450px;
  background: repeating-conic-gradient(rgba(255, 210, 63, 0.18) 0 10deg, transparent 10deg 20deg);
  animation: spin 12s linear infinite;
  pointer-events: none;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.jackpot {
  position: relative;
  font-family: 'Bungee Shade', var(--font-display);
  font-size: 54px;
  color: var(--gold);
  text-shadow: 0 0 12px #ff8c1a, 0 0 34px var(--pink);
  animation: bounce 0.8s ease-in-out infinite alternate;
}

@keyframes bounce {
  to { transform: scale(1.08) rotate(-2deg); }
}

.sub {
  position: relative;
  color: var(--muted);
  font-weight: 600;
}

.poster {
  position: relative;
  width: 220px;
  height: 330px;
  border-radius: 14px;
  padding: 6px;
  background: linear-gradient(135deg, var(--gold), #fff3b0, var(--gold-dark));
  box-shadow: 0 0 30px var(--accent), 0 0 60px var(--gold);
  font-size: 22px;
}

.title {
  position: relative;
  font-family: var(--font-display);
  font-size: 26px;
  color: #fff;
  text-shadow: 0 0 10px var(--pink);
  max-width: 100%;
  word-break: break-word;
}

.from {
  position: relative;
  padding: 4px 12px;
  border-radius: 999px;
  color: #12001f;
  font-weight: 800;
  font-size: 13px;
}

.btn {
  position: relative;
  margin-top: 8px;
  font-size: 16px;
  padding: 10px 22px;
}
</style>
