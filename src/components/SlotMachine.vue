<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Reel from './Reel.vue'
import { sound } from '../sound'
import type { PoolFilm } from '../types'

const props = defineProps<{
  /** Непросмотренные фильмы из включённых списков */
  pool: PoolFilm[]
  /** Всего фильмов во включённых списках */
  total: number
}>()
const emit = defineEmits<{ win: [film: PoolFilm] }>()

const reels = ref<InstanceType<typeof Reel>[]>([])
const spinning = ref(false)
const party = ref(false)
const lastWin = ref<PoolFilm | null>(null)

const canSpin = computed(() => !spinning.value && props.pool.length > 0)

const status = computed(() => {
  if (spinning.value) return 'Крутим барабаны…'
  if (!props.pool.length && props.total) return 'Всё просмотрено — разыгрывать нечего'
  if (!props.pool.length) return 'Барабаны пусты — добавь фильмы или включи список'
  if (lastWin.value) return `★ ${lastWin.value.title} ★`
  return 'Потяни рычаг!'
})

async function spin() {
  if (!canSpin.value) return
  spinning.value = true
  party.value = false
  lastWin.value = null

  const winner = props.pool[Math.floor(Math.random() * props.pool.length)]
  const ticker = setInterval(() => sound.tick(), 75)

  await Promise.all(
    reels.value.map((reel, i) => reel.spin(winner, 2200 + i * 800, 18 + i * 7).then(() => sound.reelStop())),
  )

  clearInterval(ticker)
  sound.jackpot()
  lastWin.value = winner
  spinning.value = false
  party.value = true
  setTimeout(() => (party.value = false), 4500)
  emit('win', winner)
}

/* ---------------- Рычаг ---------------- */
const ROD = 120 // длина рукояти, px
const pull = ref(0) // 0 — поднят, 1 — опущен до конца
const leverAnimated = ref(false)
let drag: { startY: number; startPull: number; moved: number; scale: number } | null = null

const rodStyle = computed(() => ({ transform: `scaleY(${1 - 2 * pull.value})` }))
const knobStyle = computed(() => ({
  transform: `translateY(${2 * pull.value * ROD}px) scale(${1 + 0.35 * Math.sin(Math.PI * pull.value)})`,
}))

function animateLever(to: number, ms: number) {
  leverAnimated.value = true
  pull.value = to
  return new Promise<void>((r) => setTimeout(r, ms))
}

async function autoPull() {
  if (!canSpin.value || drag) return
  sound.lever()
  await animateLever(1, 220)
  void spin()
  await animateLever(0, 450)
}

function onPointerDown(e: PointerEvent) {
  if (!canSpin.value) return
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  leverAnimated.value = false
  // на телефоне рычаг уменьшен через transform — пересчитываем ход пальца в «пиксели рычага»
  const lever = (e.currentTarget as HTMLElement).closest<HTMLElement>('.lever')
  const scale = lever ? lever.getBoundingClientRect().height / lever.offsetHeight || 1 : 1
  drag = { startY: e.clientY, startPull: pull.value, moved: 0, scale }
}

function onPointerMove(e: PointerEvent) {
  if (!drag) return
  const dy = e.clientY - drag.startY
  drag.moved = Math.max(drag.moved, Math.abs(dy))
  pull.value = Math.min(1, Math.max(0, drag.startPull + dy / drag.scale / (2 * ROD)))
}

function onPointerUp() {
  if (!drag) return
  const { moved } = drag
  drag = null
  if (moved < 6) {
    // простой клик по рычагу
    pull.value = 0
    void autoPull()
  } else if (pull.value > 0.65) {
    sound.lever()
    void spin()
    void animateLever(0, 450)
  } else {
    void animateLever(0, 300)
  }
}

function onKey(e: KeyboardEvent) {
  if (e.code !== 'Space' && e.code !== 'Enter') return
  const tag = (e.target as HTMLElement)?.tagName
  if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tag)) return
  if (document.querySelector('.modal-backdrop')) return
  e.preventDefault()
  void autoPull()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const bulbs = (n: number) => Array.from({ length: n }, (_, i) => i)
</script>

<template>
  <div class="machine-wrap">
    <div class="machine" :class="{ party, spinning }">
      <!-- Вывеска -->
      <div class="marquee">
        <div class="bulbs top"><span v-for="i in bulbs(22)" :key="i" class="bulb" :style="{ '--i': i }" /></div>
        <h1 class="logo">
          <span class="logo-small">🎬 Кино</span>
          <span class="logo-big">ДЖЕКПОТ</span>
        </h1>
        <div class="bulbs bottom"><span v-for="i in bulbs(22)" :key="i" class="bulb" :style="{ '--i': i + 1 }" /></div>
      </div>

      <!-- Окно барабанов -->
      <div class="window">
        <div class="side-bulbs left"><span v-for="i in bulbs(7)" :key="i" class="bulb" :style="{ '--i': i }" /></div>
        <div class="reels">
          <Reel v-for="i in 3" :key="i" ref="reels" :pool="pool" />
          <div class="payline">
            <span class="arrow left">▶</span>
            <span class="arrow right">◀</span>
          </div>
        </div>
        <div class="side-bulbs right"><span v-for="i in bulbs(7)" :key="i" class="bulb" :style="{ '--i': i + 1 }" /></div>
      </div>

      <!-- Табло -->
      <div class="display">
        <div class="led" :class="{ win: party }">{{ status }}</div>
        <div class="credits" :title="`Не просмотрено ${pool.length} из ${total}`">
          <span>ОСТАЛОСЬ</span>
          <span><b>{{ pool.length }}</b>/{{ total }}</span>
        </div>
      </div>

      <button class="spin-btn" :disabled="!canSpin" @click="autoPull">
        {{ spinning ? '...' : 'КРУТИТЬ!' }}
      </button>

      <div class="coin-tray" />
    </div>

    <!-- Рычаг -->
    <div class="lever" :class="{ animated: leverAnimated, disabled: !canSpin }">
      <div class="lever-mount" />
      <div class="lever-track">
        <div class="rod" :style="rodStyle" />
        <div
          class="knob"
          :style="knobStyle"
          title="Потяни вниз!"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.machine-wrap {
  position: relative;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
  /* место под рычаг справа и такое же пустое слева — чтобы по центру стоял сам корпус, а не корпус с рычагом */
  padding: 0 62px;
}

.machine {
  position: relative;
  width: 680px;
  max-width: 100%;
  padding: 18px 26px 26px;
  border-radius: 36px 36px 22px 22px;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.35), transparent 50%),
    linear-gradient(180deg, #ff2e55 0%, var(--red) 40%, var(--red-dark) 100%);
  border: 6px solid var(--gold);
  box-shadow:
    0 0 0 4px #7a5200,
    0 0 40px rgba(255, 210, 63, 0.6),
    0 0 90px rgba(255, 79, 216, 0.5),
    0 30px 60px rgba(0, 0, 0, 0.6),
    inset 0 -20px 40px rgba(0, 0, 0, 0.35);
  transition: box-shadow 0.3s;
}

.machine.party {
  animation: shake 0.5s ease-in-out 2;
  box-shadow:
    0 0 0 4px #7a5200,
    0 0 60px var(--gold),
    0 0 140px var(--pink),
    0 30px 60px rgba(0, 0, 0, 0.6);
}

@keyframes shake {
  0%, 100% { transform: translateX(0) rotate(0); }
  20% { transform: translateX(-6px) rotate(-0.6deg); }
  40% { transform: translateX(6px) rotate(0.6deg); }
  60% { transform: translateX(-4px) rotate(-0.3deg); }
  80% { transform: translateX(4px) rotate(0.3deg); }
}

/* ---------- Вывеска ---------- */
.marquee {
  position: relative;
  margin: -6px -8px 18px;
  padding: 10px 14px;
  border-radius: 26px 26px 12px 12px;
  background: linear-gradient(180deg, #2a0045, #12001f);
  border: 4px solid var(--gold);
  box-shadow: inset 0 0 30px rgba(255, 79, 216, 0.5);
  text-align: center;
}

.logo {
  margin: 4px 0;
  line-height: 1;
}

.logo-small {
  display: block;
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--cyan);
  letter-spacing: 4px;
  text-shadow: 0 0 6px var(--cyan), 0 0 16px var(--cyan);
}

.logo-big {
  display: block;
  font-family: 'Bungee Shade', var(--font-display);
  font-size: 58px;
  color: var(--gold);
  text-shadow: 0 0 10px #ff8c1a, 0 0 30px var(--pink);
  animation: flicker 4s infinite;
}

.party .logo-big {
  animation: rainbow 0.6s linear infinite;
}

@keyframes flicker {
  0%, 92%, 100% { opacity: 1; }
  93% { opacity: 0.4; }
  95% { opacity: 1; }
  96% { opacity: 0.6; }
}

@keyframes rainbow {
  0% { color: var(--gold); }
  33% { color: var(--pink); }
  66% { color: var(--cyan); }
  100% { color: var(--gold); }
}

/* ---------- Лампочки ---------- */
.bulbs {
  display: flex;
  justify-content: space-between;
  padding: 0 4px;
}

.bulb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff3b0;
  box-shadow: 0 0 6px #fff, 0 0 12px var(--gold);
  animation: chase 1.2s infinite;
  animation-delay: calc(var(--i) * -0.2s);
}

.spinning .bulb {
  animation-duration: 0.4s;
}

.party .bulb {
  animation: party-bulb 0.3s infinite;
  animation-delay: calc(var(--i) * -0.05s);
}

@keyframes chase {
  0%, 50% { background: #fff3b0; box-shadow: 0 0 6px #fff, 0 0 14px var(--gold); }
  51%, 100% { background: #6b4b00; box-shadow: none; }
}

@keyframes party-bulb {
  0% { background: var(--pink); box-shadow: 0 0 14px var(--pink); }
  33% { background: var(--cyan); box-shadow: 0 0 14px var(--cyan); }
  66% { background: var(--gold); box-shadow: 0 0 14px var(--gold); }
}

/* ---------- Окно барабанов ---------- */
.window {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 10px;
  border-radius: 18px;
  background: linear-gradient(180deg, #7a5200, var(--gold) 15%, #fff3b0 50%, var(--gold) 85%, #7a5200);
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.6);
}

.side-bulbs {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-self: stretch;
  padding: 6px 0;
}

.reels {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: #1a0029;
  box-shadow: inset 0 0 20px #000;
}

.payline {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  background: rgba(255, 30, 60, 0.55);
  box-shadow: 0 0 8px var(--red);
  pointer-events: none;
  transform: translateY(-50%);
}

.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 22px;
  color: var(--red);
  text-shadow: 0 0 6px #fff;
}

.arrow.left { left: -4px; }
.arrow.right { right: -4px; }

/* ---------- Табло ---------- */
.display {
  margin-top: 18px;
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.led {
  flex: 1;
  padding: 10px 14px;
  border-radius: 10px;
  background: #0a0010;
  border: 3px solid #4a2a00;
  color: #ff9f1a;
  font-family: var(--font-display);
  font-size: 17px;
  text-align: center;
  text-shadow: 0 0 6px #ff9f1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.led.win {
  color: var(--green);
  text-shadow: 0 0 8px var(--green);
  animation: blink 0.4s steps(2) infinite;
}

@keyframes blink {
  50% { opacity: 0.55; }
}

.credits {
  padding: 10px 14px;
  border-radius: 10px;
  background: #0a0010;
  border: 3px solid #4a2a00;
  color: var(--cyan);
  font-family: var(--font-display);
  font-size: 13px;
  display: grid;
  place-items: center;
  text-shadow: 0 0 6px var(--cyan);
}

.credits b {
  font-size: 18px;
  color: #fff;
}

/* ---------- Кнопка ---------- */
.spin-btn {
  display: block;
  margin: 18px auto 0;
  padding: 14px 54px;
  border-radius: 999px;
  border: 4px solid #fff3b0;
  background: radial-gradient(circle at 50% 30%, #fff06a, var(--gold) 45%, #d48a00);
  color: var(--red-dark);
  font-family: var(--font-display);
  font-size: 26px;
  letter-spacing: 2px;
  box-shadow: 0 6px 0 #7a4200, 0 0 24px var(--gold);
  transition: transform 0.1s, box-shadow 0.1s;
  animation: pulse 1.6s ease-in-out infinite;
}

.spin-btn:active:not(:disabled) {
  transform: translateY(5px);
  box-shadow: 0 1px 0 #7a4200, 0 0 24px var(--gold);
}

.spin-btn:disabled {
  animation: none;
}

@keyframes pulse {
  50% { box-shadow: 0 6px 0 #7a4200, 0 0 44px var(--gold), 0 0 70px var(--pink); }
}

.coin-tray {
  margin: 18px auto 0;
  width: 60%;
  height: 22px;
  border-radius: 0 0 40px 40px;
  background: linear-gradient(180deg, #1a0000, #4a0010);
  box-shadow: inset 0 6px 10px #000, 0 0 0 4px var(--gold);
}

/* ---------- Рычаг ---------- */
.lever {
  position: absolute;
  right: 4px;
  top: 50%;
  width: 70px;
  height: 300px;
  transform: translateY(-60%);
}

.lever-track {
  position: absolute;
  left: 50%;
  top: 160px; /* точка крепления */
  width: 0;
  height: 0;
}

.rod {
  position: absolute;
  left: -7px;
  bottom: 0;
  width: 14px;
  height: 120px;
  border-radius: 7px;
  background: linear-gradient(90deg, #888, #f5f5f5 40%, #aaa 70%, #555);
  transform-origin: bottom center;
}

.knob {
  position: absolute;
  left: -24px;
  top: -144px; /* -ROD - радиус */
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ff9aa8, var(--red) 45%, #5a0010);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.6), 0 0 18px rgba(232, 23, 60, 0.7);
  cursor: grab;
  touch-action: none;
}

.knob:active {
  cursor: grabbing;
}

.lever.animated .rod,
.lever.animated .knob {
  transition: transform 0.22s cubic-bezier(0.3, 1.4, 0.6, 1);
}

.lever.disabled .knob {
  cursor: not-allowed;
  filter: grayscale(0.6);
}

.lever-mount {
  position: absolute;
  left: 50%;
  top: 160px;
  width: 44px;
  height: 70px;
  transform: translate(-50%, -50%);
  border-radius: 12px;
  background: linear-gradient(90deg, #7a5200, var(--gold) 40%, #fff3b0 55%, #7a5200);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
}

/* ---------- Телефоны и узкие окна ----------
   Полноразмерному автомату с симметричными полями под рычаг нужно ~840px */
@media (max-width: 860px) {
  .machine-wrap {
    padding: 0 40px;
  }

  .machine {
    padding: 10px 10px 16px;
    border-width: 4px;
    border-radius: 26px 26px 16px 16px;
  }

  .marquee {
    margin: -4px -4px 12px;
    padding: 8px 8px;
    border-width: 3px;
    border-radius: 20px 20px 10px 10px;
  }

  .bulb {
    width: 8px;
    height: 8px;
  }

  .logo-small {
    font-size: clamp(13px, 3.6vw, 20px);
    letter-spacing: 2px;
  }

  .logo-big {
    font-size: clamp(30px, 9vw, 58px);
  }

  /* боковые лампочки не помещаются — барабанам нужнее место */
  .side-bulbs {
    display: none;
  }

  .window {
    padding: 6px;
    gap: 0;
    border-radius: 14px;
  }

  .reels {
    /* три барабана на всю ширину: 180px — поля под рычаг с двух сторон, рамки и отступы страницы */
    --reel-w: min(170px, calc((100vw - 180px) / 3));
    gap: 6px;
    padding: 6px;
  }

  .arrow {
    font-size: 14px;
  }

  .display {
    margin-top: 12px;
    gap: 6px;
  }

  .led {
    padding: 8px 10px;
    font-size: clamp(11px, 3.4vw, 17px);
    border-width: 2px;
  }

  .credits {
    padding: 6px 8px;
    font-size: 10px;
    border-width: 2px;
  }

  .credits b {
    font-size: 15px;
  }

  .spin-btn {
    margin-top: 12px;
    padding: 12px 34px;
    font-size: clamp(18px, 5.5vw, 26px);
  }

  .coin-tray {
    margin-top: 12px;
    height: 16px;
  }

  /* рычаг поменьше; ход пальца пересчитывается в onPointerDown */
  .lever {
    right: -6px;
    transform: translateY(-60%) scale(0.72);
  }
}
</style>
