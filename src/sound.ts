// Все звуки синтезируются через Web Audio — никаких файлов не нужно.
let ctx: AudioContext | null = null
let muted = false

function audio() {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'square', volume = 0.08) {
  if (muted) return
  const ac = audio()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = ac.currentTime + start
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration)
}

export const sound = {
  setMuted(v: boolean) {
    muted = v
  },
  lever() {
    tone(180, 0, 0.12, 'sawtooth', 0.1)
    tone(90, 0.08, 0.2, 'sawtooth', 0.1)
  },
  tick() {
    tone(900 + Math.random() * 300, 0, 0.03, 'square', 0.03)
  },
  reelStop() {
    tone(220, 0, 0.15, 'triangle', 0.18)
    tone(110, 0, 0.2, 'sine', 0.2)
  },
  jackpot() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568]
    notes.forEach((f, i) => tone(f, i * 0.11, 0.18, 'square', 0.07))
    // «звон монет»
    for (let i = 0; i < 18; i++) tone(2000 + Math.random() * 2500, 0.9 + i * 0.05, 0.06, 'triangle', 0.04)
  },
}
