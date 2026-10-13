<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{ title?: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const backdrop = ref<HTMLElement>()

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  // закрываем только верхнее окно, если их открыто несколько
  const all = document.querySelectorAll('.modal-backdrop')
  if (all[all.length - 1] === backdrop.value) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div ref="backdrop" class="modal-backdrop" @mousedown.self="emit('close')">
      <div class="modal panel" :class="{ wide }">
        <header v-if="title">
          <h2 class="neon-title">{{ title }}</h2>
          <button class="icon-btn" title="Закрыть" @click="emit('close')">✕</button>
        </header>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  /* колонка не шире экрана — иначе max-width: 100% у окна считается от его же ширины */
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  padding: 16px;
  background: rgba(8, 0, 16, 0.75);
  backdrop-filter: blur(4px);
  animation: fade 0.2s ease-out;
}

.modal {
  width: 440px;
  max-width: 100%;
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 20px;
  background: linear-gradient(180deg, #2a0045, #14001f);
  animation: pop 0.25s cubic-bezier(0.3, 1.5, 0.6, 1);
}

.modal.wide {
  width: 560px;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

h2 {
  margin: 0;
  font-size: 22px;
}

@media (max-width: 600px) {
  .modal-backdrop {
    padding: 10px;
  }

  .modal {
    padding: 14px;
    /* dvh — с учётом адресной строки мобильного браузера */
    max-height: calc(100dvh - 20px);
  }

  h2 {
    font-size: 18px;
  }
}

@keyframes fade {
  from { opacity: 0; }
}

@keyframes pop {
  from { transform: scale(0.85); opacity: 0; }
}
</style>
