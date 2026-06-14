import { useState, type DragEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { GiScrollUnfurled } from 'react-icons/gi'
import { FolderSearch, X } from 'lucide-react'

import { getFamilyVisual } from '../lib/familyVisuals'
import { LottieCauldron } from './LottieCauldron'
import type { ForgeStatus, SourceFile } from '../shared/types'

interface ForgeDropzoneProps {
  source: SourceFile | null
  status: ForgeStatus
  allowedExtensions: string[]
  disabled: boolean
  onPick: () => void
  onDropFile: (file: File) => void
  onUnsupportedDrop: (message: string) => void
  onClear: () => void
}

export function ForgeDropzone({
  source,
  status,
  allowedExtensions,
  disabled,
  onPick,
  onDropFile,
  onUnsupportedDrop,
  onClear,
}: ForgeDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files[0]

    if (!file) {
      onUnsupportedDrop('No reagent was detected in that drop.')
      return
    }

    onDropFile(file)
  }

  const visual = source ? getFamilyVisual(source.family) : null
  const SourceIcon = visual?.icon ?? GiScrollUnfurled
  const isBrewing = status === 'transmuting'

  return (
    <section
      className={[
        'forge-dropzone',
        isDragging ? 'is-dragging' : '',
        source ? 'has-source' : '',
        isBrewing ? 'is-brewing' : '',
        status === 'success' ? 'is-success' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      aria-label="File reagent dropzone"
    >
      <div className="cauldron-stage">
        <div className="cauldron-halo" style={visual ? { background: `radial-gradient(circle, ${visual.glow}, transparent 70%)` } : undefined} />

        <motion.div
          className="cauldron"
          animate={
            isBrewing
              ? { rotate: [-1.5, 1.5, -1.5], y: [0, -3, 0] }
              : isDragging
                ? { scale: 1.08, y: -6 }
                : { scale: 1, y: [0, -5, 0] }
          }
          transition={
            isBrewing
              ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
              : isDragging
                ? { type: 'spring', stiffness: 240, damping: 16 }
                : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          <LottieCauldron isBrewing={isBrewing} />
        </motion.div>

        <AnimatePresence mode="popLayout">
          {visual ? (
            <motion.div
              key={source?.path}
              className="reagent-orb"
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              style={{ color: visual.hue, boxShadow: `0 0 32px ${visual.glow}` }}
            >
              <SourceIcon />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="cauldron-fade" aria-hidden="true" />

      <p className="eyebrow">Forge intake</p>

      <AnimatePresence mode="wait">
        {source ? (
          <motion.div
            key="source"
            className="source-sigil"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span className="sigil-mark" style={{ color: visual?.hue }}>
              {source.ext.toUpperCase()}
            </span>
            <div className="sigil-meta">
              <strong>{source.name}</strong>
              <span>
                {formatBytes(source.size)} - bound to the forge
              </span>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onClear}
              disabled={disabled}
              aria-label="Discard reagent"
              title="Discard reagent"
            >
              <X size={18} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className="dropzone-copy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h2>Drop a reagent into the cauldron</h2>
            <p className="muted">or summon one from your stash</p>
            <p className="allowed">{allowedExtensions.join('  -  ')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dropzone-actions">
        <motion.button
          type="button"
          className="secondary-button"
          onClick={onPick}
          disabled={disabled}
          whileHover={disabled ? undefined : { scale: 1.03 }}
          whileTap={disabled ? undefined : { scale: 0.97 }}
        >
          <span className="transmute-shimmer" aria-hidden="true" />
          <FolderSearch size={18} />
          {source ? 'Swap reagent' : 'Choose reagent'}
        </motion.button>
      </div>
    </section>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}
