import { motion } from 'motion/react'

const SPARKS = Array.from({ length: 16 }, (_, index) => index)

export function SuccessBurst() {
  return (
    <div className="success-burst" aria-hidden="true">
      <motion.span
        className="success-ring"
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 2.4, opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      {SPARKS.map((spark) => {
        const angle = (spark / SPARKS.length) * Math.PI * 2
        const distance = 64 + (spark % 3) * 30
        return (
          <motion.span
            key={spark}
            className="spark"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: 0,
              scale: 0.3,
            }}
            transition={{ duration: 0.95, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}
