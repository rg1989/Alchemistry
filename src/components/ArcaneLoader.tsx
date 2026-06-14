import { motion } from 'motion/react'
import { GiPentacle } from 'react-icons/gi'

interface ArcaneLoaderProps {
  size?: number
  label?: string
}

export function ArcaneLoader({ size = 88, label }: ArcaneLoaderProps) {
  return (
    <div className="arcane-loader">
      <div className="arcane-loader-orb" style={{ width: size, height: size }}>
        <span className="arcane-loader-glow" aria-hidden="true" />
        <motion.span
          className="arcane-loader-sigil"
          style={{ fontSize: size * 0.78 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        >
          <GiPentacle />
        </motion.span>
      </div>
      {label ? <p className="arcane-loader-label">{label}</p> : null}
    </div>
  )
}
