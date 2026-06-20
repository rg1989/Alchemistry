import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { createUniqueOutputPath, getAlchemyOutputDir } from '../../electron/services/outputPaths'

describe('output path utilities', () => {
  it('points the crucible at the Downloads alchemy folder', () => {
    expect(getAlchemyOutputDir('/Users/mage')).toBe(
      path.join('/Users/mage', 'Downloads', 'alchemy'),
    )
  })

  it('preserves the source basename and target extension', () => {
    const output = createUniqueOutputPath({
      sourcePath: '/tmp/ancient spellbook.final.pdf',
      targetExt: 'txt',
      outputDir: '/tmp/alchemy',
      exists: () => false,
    })

    expect(output).toBe(path.join('/tmp/alchemy', 'ancient spellbook.final.txt'))
  })

  it('adds Finder-style suffixes when a crafted artifact already exists', () => {
    const existing = new Set([
      path.join('/tmp/alchemy', 'rune.webp'),
      path.join('/tmp/alchemy', 'rune 2.webp'),
    ])

    const output = createUniqueOutputPath({
      sourcePath: '/tmp/rune.png',
      targetExt: '.webp',
      outputDir: '/tmp/alchemy',
      exists: (candidate) => existing.has(candidate),
    })

    expect(output).toBe(path.join('/tmp/alchemy', 'rune 3.webp'))
  })

  it('uses refinement suffixes in crafted artifact names', () => {
    const output = createUniqueOutputPath({
      sourcePath: '/tmp/portrait.jpg',
      targetExt: 'png',
      outputDir: '/tmp/alchemy',
      exists: () => false,
      nameSuffix: 'no-bg',
    })

    expect(output).toBe(path.join('/tmp/alchemy', 'portrait no-bg.png'))
  })
})
