import { describe, expect, it } from 'vitest'

import {
  ALLOWED_INPUT_EXTENSIONS,
  getAllowedOutputs,
  getRecipeOptions,
  isAllowedInputExtension,
} from '../shared/conversionMatrix'
import {
  REFINEMENT_OUTPUT_SUFFIX,
  resolveRefinementOutputExt,
} from '../shared/imageRefinements'

describe('conversion matrix', () => {
  it('offers audio extraction elixirs for video reagents', () => {
    const mp4Outputs = getAllowedOutputs('mp4').map((output) => output.ext)

    expect(mp4Outputs).toContain('webm')
    expect(mp4Outputs).toContain('mp3')
    expect(mp4Outputs).toContain('wav')
    expect(mp4Outputs).toContain('m4a')
  })

  it('keeps document transmutations asymmetric', () => {
    const csvOutputs = getAllowedOutputs('csv').map((output) => output.ext)
    const jsonOutputs = getAllowedOutputs('json').map((output) => output.ext)

    expect(csvOutputs).toContain('json')
    expect(jsonOutputs).not.toContain('csv')
  })

  it('normalizes extension checks for selected files', () => {
    expect(isAllowedInputExtension('.PNG')).toBe(true)
    expect(isAllowedInputExtension('mov')).toBe(true)
    expect(isAllowedInputExtension('exe')).toBe(false)
    expect(ALLOWED_INPUT_EXTENSIONS).toContain('pdf')
  })

  it('offers distill and refine recipes for image reagents', () => {
    const recipes = getRecipeOptions('png')

    expect(recipes.distill.map((option) => option.ext)).toEqual(['jpg', 'webp', 'avif', 'tiff'])
    expect(recipes.refine.map((option) => option.refinement)).toContain('remove-background')
    expect(recipes.refine.map((option) => option.refinement)).toContain('compress')
  })

  it('does not offer refine recipes for non-image reagents', () => {
    expect(getRecipeOptions('mp3').refine).toEqual([])
  })
})

describe('image refinements', () => {
  it('maps background removal to png output', () => {
    expect(resolveRefinementOutputExt('jpg', 'remove-background')).toBe('png')
    expect(resolveRefinementOutputExt('jpeg', 'remove-background')).toBe('png')
  })

  it('preserves source format for same-format refinements', () => {
    expect(resolveRefinementOutputExt('webp', 'compress')).toBe('webp')
    expect(resolveRefinementOutputExt('jpeg', 'trim-borders')).toBe('jpg')
  })

  it('uses readable output suffixes for refined artifacts', () => {
    expect(REFINEMENT_OUTPUT_SUFFIX['remove-background']).toBe('no-bg')
    expect(REFINEMENT_OUTPUT_SUFFIX.compress).toBe('compressed')
  })
})
