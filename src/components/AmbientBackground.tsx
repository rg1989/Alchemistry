import type { CSSProperties } from 'react'

interface Mote {
  id: number
  left: number
  size: number
  delay: number
  duration: number
  drift: number
  opacity: number
}

const MOTE_COUNT = 26

function createRng(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MOTES: Mote[] = (() => {
  const rng = createRng(0x9e3779b9)
  return Array.from({ length: MOTE_COUNT }, (_, id) => ({
    id,
    left: rng() * 100,
    size: 2 + rng() * 5,
    delay: -rng() * 20,
    duration: 15 + rng() * 18,
    drift: (rng() - 0.5) * 90,
    opacity: 0.18 + rng() * 0.5,
  }))
})()

export function AmbientBackground() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient-aurora ambient-aurora-1" />
      <div className="ambient-aurora ambient-aurora-2" />
      <div className="ambient-motes">
        {MOTES.map((mote) => (
          <span
            key={mote.id}
            className="mote"
            style={
              {
                left: `${mote.left}%`,
                width: `${mote.size}px`,
                height: `${mote.size}px`,
                opacity: mote.opacity,
                animationDelay: `${mote.delay}s`,
                animationDuration: `${mote.duration}s`,
                '--drift': `${mote.drift}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="ambient-vignette" />
    </div>
  )
}
