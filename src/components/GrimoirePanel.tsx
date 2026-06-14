import { AnimatePresence, motion } from 'motion/react'
import { GiSpellBook } from 'react-icons/gi'
import { CheckCircle2, ExternalLink, FolderOpen, Sparkles, XCircle } from 'lucide-react'

import { getFamilyVisual } from '../lib/familyVisuals'
import { getOutputFamily } from '../shared/conversionMatrix'
import type { GrimoireEntryWithExistence } from '../shared/types'

interface GrimoirePanelProps {
  entries: GrimoireEntryWithExistence[]
  onOpen: (filePath: string) => void
  onReveal: (filePath: string) => void
}

export function GrimoirePanel({ entries, onOpen, onReveal }: GrimoirePanelProps) {
  return (
    <aside className="grimoire-card">
      <header className="grimoire-head">
        <span className="grimoire-glyph">
          <GiSpellBook />
        </span>
        <div>
          <p className="eyebrow">Recent transmutations</p>
          <h2 className="shine-text shine-delay">Grimoire</h2>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="empty-grimoire">
          <Sparkles size={26} />
          <strong>Your grimoire is blank.</strong>
          <span>Transmute something and the tale will be inscribed here.</span>
        </div>
      ) : (
        <ol className="grimoire-list">
          <AnimatePresence initial={false}>
            {entries.map((entry, index) => {
              const visual = getFamilyVisual(getOutputFamily(entry.outputExt))
              const succeeded = entry.status === 'success'

              return (
                <motion.li
                  key={entry.id}
                  className="grimoire-entry"
                  layout
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ delay: Math.min(index, 8) * 0.04, type: 'spring', stiffness: 260, damping: 24 }}
                >
                  <div className="entry-top">
                    <span
                      className="entry-icon"
                      style={{ color: succeeded ? visual.hue : 'var(--error)' }}
                    >
                      {succeeded ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    </span>
                    <div className="entry-text">
                      <strong>{entry.sourceName}</strong>
                      <span>
                        {succeeded ? 'crafted into' : 'failed brewing'}{' '}
                        <em style={{ color: succeeded ? visual.hue : undefined }}>.{entry.outputExt}</em>
                        {' - '}
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                    </div>
                  </div>

                  {entry.status === 'failed' && entry.error ? (
                    <p className="entry-error">{entry.error}</p>
                  ) : null}

                  {entry.canOpenOutput || entry.canRevealOutput ? (
                    <div className="entry-actions">
                      {entry.canOpenOutput ? (
                        <motion.button
                          type="button"
                          onClick={() => onOpen(entry.outputPath)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ExternalLink size={15} />
                          Open
                        </motion.button>
                      ) : null}
                      {entry.canRevealOutput ? (
                        <motion.button
                          type="button"
                          onClick={() => onReveal(entry.outputPath)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <FolderOpen size={15} />
                          Reveal
                        </motion.button>
                      ) : null}
                    </div>
                  ) : succeeded ? (
                    <span className="vanished-note">Artifact has wandered off.</span>
                  ) : null}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
      )}
    </aside>
  )
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000))

  if (seconds < 60) {
    return `${seconds}s ago`
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  return new Date(timestamp).toLocaleDateString()
}
