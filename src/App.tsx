import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { GiMagicSwirl } from 'react-icons/gi'
import { FaGithub, FaLinkedinIn } from 'react-icons/fa6'
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'

import './App.css'
import emblemUrl from './assets/icon.png'
import { AmbientBackground } from './components/AmbientBackground'
import { ArcaneLoader } from './components/ArcaneLoader'
import { ForgeDropzone } from './components/ForgeDropzone'
import { GrimoirePanel } from './components/GrimoirePanel'
import { OutputVial } from './components/OutputVial'
import { SuccessBurst } from './components/SuccessBurst'
import { ALLOWED_INPUT_EXTENSIONS, getRecipeOptions } from './shared/conversionMatrix'
import { resolveRefinementOutputExt } from './shared/imageRefinements'
import type {
  ForgeStatus,
  GrimoireEntryWithExistence,
  OutputOption,
  SourceFile,
} from './shared/types'

function App() {
  const [source, setSource] = useState<SourceFile | null>(null)
  const [selectedOutput, setSelectedOutput] = useState<OutputOption | null>(null)
  const [status, setStatus] = useState<ForgeStatus>('idle')
  const [message, setMessage] = useState('The forge is warm. Bring a reagent.')
  const [grimoire, setGrimoire] = useState<GrimoireEntryWithExistence[]>([])
  const [celebrate, setCelebrate] = useState(false)
  const [booting, setBooting] = useState(true)
  const celebrateTimer = useRef<number | undefined>(undefined)
  const bootTimer = useRef<number | undefined>(undefined)

  const recipeOptions = useMemo(() => getRecipeOptions(source?.ext ?? ''), [source])
  const allOutputOptions = useMemo(
    () => [...recipeOptions.distill, ...recipeOptions.refine],
    [recipeOptions],
  )
  const isTransmuting = status === 'transmuting'

  useEffect(() => {
    const start = Date.now()
    void (async () => {
      await refreshGrimoire()
      const remaining = Math.max(0, 1200 - (Date.now() - start))
      bootTimer.current = window.setTimeout(() => setBooting(false), remaining)
    })()
    return () => {
      window.clearTimeout(celebrateTimer.current)
      window.clearTimeout(bootTimer.current)
    }
  }, [])

  async function refreshGrimoire() {
    setGrimoire(await window.alchemistry.getGrimoire())
  }

  async function pickSource() {
    setStatus('idle')
    setMessage('Opening the reagent stash...')

    const picked = await window.alchemistry.pickSource()

    if (!picked) {
      setMessage('No reagent chosen. The cauldron waits.')
      return
    }

    setSource(picked)
    setSelectedOutput(getRecipeOptions(picked.ext).distill[0] ?? getRecipeOptions(picked.ext).refine[0] ?? null)
    setMessage(`${picked.name} is ready. Choose an elixir.`)
  }

  function handleDroppedFile(file: File) {
    const filePath = window.alchemistry.getPathForFile(file)

    if (!filePath) {
      setStatus('error')
      setMessage('The portal could not trace that file. Try "Choose reagent".')
      return
    }

    void inspectDroppedPath(filePath)
  }

  async function inspectDroppedPath(filePath: string) {
    const inspected = await window.alchemistry.inspectDroppedFile(filePath)

    if (!inspected) {
      setStatus('error')
      setMessage('This reagent has no known transmutations.')
      return
    }

    setStatus('idle')
    setSource(inspected)
    setSelectedOutput(getRecipeOptions(inspected.ext).distill[0] ?? getRecipeOptions(inspected.ext).refine[0] ?? null)
    setMessage(`${inspected.name} landed in the forge.`)
  }

  async function transmute() {
    if (!source || !selectedOutput) {
      return
    }

    setStatus('transmuting')
    setMessage('Brewing the mixture...')

    try {
      const outputExt = selectedOutput.refinement
        ? resolveRefinementOutputExt(source.ext, selectedOutput.refinement)
        : selectedOutput.ext

      const entry = await window.alchemistry.transmute({
        sourcePath: source.path,
        outputExt,
        refinement: selectedOutput.refinement,
      })

      setStatus('success')
      setMessage(
        selectedOutput.refinement
          ? `${entry.sourceName} was refined into ${selectedOutput.label.toLowerCase()}.`
          : `Transmutation complete. ${entry.sourceName} became .${entry.outputExt}.`,
      )
      setCelebrate(true)
      window.clearTimeout(celebrateTimer.current)
      celebrateTimer.current = window.setTimeout(() => setCelebrate(false), 1300)
      await refreshGrimoire()
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'The mixture failed. Try again.')
      await refreshGrimoire()
    }
  }

  function clearSource() {
    setSource(null)
    setSelectedOutput(null)
    setStatus('idle')
    setMessage('The forge is warm. Bring a reagent.')
  }

  async function openArtifact(filePath: string) {
    await window.alchemistry.openPath(filePath)
    await refreshGrimoire()
  }

  async function revealArtifact(filePath: string) {
    await window.alchemistry.revealInFolder(filePath)
    await refreshGrimoire()
  }

  return (
    <>
      <AmbientBackground />

      <main className="app-shell">
        <motion.header
          className="hero-panel"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="hero-text">
            <p className="eyebrow">Arcane utility guild</p>
            <h1 className="hero-title">Alchemistry</h1>
            <p className="hero-sub">
              Transmute documents, images, audio, and video into fresh artifacts. Refine images
              with background removal, compression, and more. Every successful craft settles into{' '}
              <code>~/Downloads/alchemy</code>.
            </p>
          </div>
          <motion.div
            className="hero-sigil"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img src={emblemUrl} alt="Alchemistry emblem" className="hero-emblem" />
          </motion.div>
        </motion.header>

        <div className="workspace-grid">
          <motion.div
            className="forge-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.08 }}
          >
            <AnimatePresence>
              {isTransmuting ? (
                <motion.div
                  key="forge-loading"
                  className="forge-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                >
                  <ArcaneLoader size={96} label="Transmuting" />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <ForgeDropzone
              source={source}
              status={status}
              allowedExtensions={ALLOWED_INPUT_EXTENSIONS}
              disabled={isTransmuting}
              onPick={pickSource}
              onDropFile={handleDroppedFile}
              onUnsupportedDrop={(dropMessage) => {
                setStatus('error')
                setMessage(dropMessage)
              }}
              onClear={clearSource}
            />

            <section className="transmutation-panel">
              <div className="panel-head">
                <span className="panel-glyph">
                  <GiMagicSwirl />
                </span>
                <div>
                  <p className="eyebrow">Recipe circle</p>
                  <h2 className="shine-text">Choose your elixir</h2>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!source ? (
                  <motion.p
                    key="hint"
                    className="muted panel-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Select a reagent and the valid elixirs will reveal themselves.
                  </motion.p>
                ) : allOutputOptions.length === 0 ? (
                  <motion.p
                    key="none"
                    className="muted panel-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    This reagent has no known transmutations.
                  </motion.p>
                ) : (
                  <motion.div
                    key={source.ext}
                    className="recipe-sections"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {recipeOptions.distill.length > 0 ? (
                      <section className="recipe-section">
                        <p className="recipe-section-label">Distill</p>
                        <div className="vial-grid">
                          {recipeOptions.distill.map((option, index) => (
                            <OutputVial
                              key={option.id}
                              option={option}
                              sourceExt={source.ext}
                              index={index}
                              selected={selectedOutput?.id === option.id}
                              disabled={isTransmuting}
                              onSelect={setSelectedOutput}
                            />
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {recipeOptions.refine.length > 0 ? (
                      <section className="recipe-section">
                        <p className="recipe-section-label">Refine</p>
                        <div className="vial-grid">
                          {recipeOptions.refine.map((option, index) => (
                            <OutputVial
                              key={option.id}
                              option={option}
                              sourceExt={source.ext}
                              index={index + recipeOptions.distill.length}
                              selected={selectedOutput?.id === option.id}
                              disabled={isTransmuting}
                              onSelect={setSelectedOutput}
                            />
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`status-rune ${status}`}>
                <span className="status-icon">
                  <StatusIcon status={status} />
                </span>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={message}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                  >
                    {message}
                  </motion.p>
                </AnimatePresence>
              </div>

              <div className="transmute-wrap">
                <motion.button
                  type="button"
                  className="transmute-button"
                  onClick={transmute}
                  disabled={!source || !selectedOutput || isTransmuting}
                  whileHover={!source || !selectedOutput || isTransmuting ? undefined : { scale: 1.03 }}
                  whileTap={!source || !selectedOutput || isTransmuting ? undefined : { scale: 0.97 }}
                >
                  <span className="transmute-shimmer" aria-hidden="true" />
                  {isTransmuting ? (
                    <>
                      <Loader2 size={20} className="spin" />
                      Brewing...
                    </>
                  ) : (
                    <>
                      <GiMagicSwirl size={20} />
                      Transmute
                    </>
                  )}
                </motion.button>

                <AnimatePresence>{celebrate ? <SuccessBurst /> : null}</AnimatePresence>
              </div>
            </section>
          </motion.div>

          <motion.div
            className="grimoire-col"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.16 }}
          >
            <GrimoirePanel entries={grimoire} onOpen={openArtifact} onReveal={revealArtifact} />
          </motion.div>
        </div>

        <footer className="app-footer">
          <span>
            Crafted by <strong>Roman Grinevich</strong>
          </span>
          <span className="footer-social">
            <a
              href="https://www.linkedin.com/in/roman-grinevich-03b13bab/"
              target="_blank"
              rel="noreferrer"
              aria-label="Roman Grinevich on LinkedIn"
              title="LinkedIn"
            >
              <FaLinkedinIn />
            </a>
            <a
              href="https://github.com/rg1989"
              target="_blank"
              rel="noreferrer"
              aria-label="Roman Grinevich on GitHub"
              title="GitHub"
            >
              <FaGithub />
            </a>
          </span>
        </footer>
      </main>

      <AnimatePresence>
        {booting ? (
          <motion.div
            key="boot-splash"
            className="boot-splash"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <ArcaneLoader size={116} label="Awakening the forge" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

function StatusIcon({ status }: { status: ForgeStatus }) {
  if (status === 'transmuting') {
    return <Loader2 size={16} className="spin" />
  }
  if (status === 'success') {
    return <CheckCircle2 size={16} />
  }
  if (status === 'error') {
    return <AlertTriangle size={16} />
  }
  return <Sparkles size={16} />
}

export default App
