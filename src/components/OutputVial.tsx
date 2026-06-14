import { motion } from 'motion/react'
import { Check } from 'lucide-react'

import { getFamilyVisual } from '../lib/familyVisuals'
import type { OutputOption } from '../shared/types'

interface OutputVialProps {
  option: OutputOption
  selected: boolean
  disabled: boolean
  index: number
  onSelect: (option: OutputOption) => void
}

export function OutputVial({ option, selected, disabled, index, onSelect }: OutputVialProps) {
  const visual = getFamilyVisual(option.family)
  const Icon = visual.icon

  return (
    <motion.button
      type="button"
      className={`output-vial ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect(option)}
      disabled={disabled}
      aria-pressed={selected}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={disabled ? undefined : { y: -3 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      style={selected ? { borderColor: visual.hue } : undefined}
    >
      {selected ? (
        <motion.span
          className="vial-ring"
          layoutId="vial-ring"
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          style={{ boxShadow: `inset 0 0 0 1.5px ${visual.hue}, 0 0 26px ${visual.glow}` }}
        />
      ) : null}

      <span className="vial-icon" style={{ color: visual.hue, background: `radial-gradient(circle at 35% 30%, ${visual.glow}, transparent 70%)` }}>
        <Icon />
      </span>

      <span className="vial-body">
        <span className="vial-ext">.{option.ext}</span>
        <strong>{option.label}</strong>
        <small>{option.description}</small>
      </span>

      {selected ? (
        <motion.span
          className="vial-check"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 18 }}
          style={{ background: visual.hue }}
        >
          <Check size={13} strokeWidth={3.5} />
        </motion.span>
      ) : null}
    </motion.button>
  )
}
