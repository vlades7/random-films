<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvas = ref<HTMLCanvasElement>()
const COLORS = ['#ffd23f', '#ff4fd8', '#00e5ff', '#39ff88', '#e8173c', '#ffffff', '#ff8c1a']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  w: number
  h: number
  color: string
  coin: boolean
  life: number
}

let particles: Particle[] = []
let raf = 0

function resize() {
  if (!canvas.value) return
  canvas.value.width = window.innerWidth * devicePixelRatio
  canvas.value.height = window.innerHeight * devicePixelRatio
}

function burst() {
  const W = window.innerWidth
  const H = window.innerHeight
  // два «залпа» из нижних углов + дождь сверху
  for (let i = 0; i < 260; i++) {
    const fromLeft = i % 3 === 0
    const fromRight = i % 3 === 1
    const coin = Math.random() < 0.25
    particles.push({
      x: fromLeft ? 0 : fromRight ? W : Math.random() * W,
      y: fromLeft || fromRight ? H * 0.85 : -20 - Math.random() * H * 0.5,
      vx: fromLeft ? 6 + Math.random() * 10 : fromRight ? -6 - Math.random() * 10 : (Math.random() - 0.5) * 3,
      vy: fromLeft || fromRight ? -14 - Math.random() * 12 : 2 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      w: coin ? 14 : 7 + Math.random() * 7,
      h: coin ? 14 : 10 + Math.random() * 10,
      color: coin ? '#ffd23f' : COLORS[Math.floor(Math.random() * COLORS.length)],
      coin,
      life: 1,
    })
  }
  if (!raf) raf = requestAnimationFrame(loop)
}

function loop() {
  const c = canvas.value
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  ctx.clearRect(0, 0, c.width, c.height)

  particles = particles.filter((p) => p.y < window.innerHeight + 40 && p.life > 0)
  for (const p of particles) {
    p.vy += 0.35
    p.vx *= 0.99
    p.x += p.vx
    p.y += p.vy
    p.rot += p.vr
    p.life -= 0.002

    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.globalAlpha = Math.min(1, p.life * 2)
    if (p.coin) {
      ctx.scale(Math.abs(Math.cos(p.rot * 2)), 1)
      ctx.fillStyle = '#ffd23f'
      ctx.beginPath()
      ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#b8860b'
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.sin(p.rot)))
    }
    ctx.restore()
  }

  raf = particles.length ? requestAnimationFrame(loop) : 0
}

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  cancelAnimationFrame(raf)
})

defineExpose({ burst })
</script>

<template>
  <canvas ref="canvas" class="confetti" />
</template>

<style scoped>
.confetti {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 100;
}
</style>
