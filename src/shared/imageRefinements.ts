import type { OutputOption } from './types'

export type ImageRefinementId =
  | 'remove-background'
  | 'resize-max'
  | 'compress'
  | 'strip-metadata'
  | 'auto-orient'
  | 'trim-borders'
  | 'grayscale'

export const IMAGE_REFINEMENTS: OutputOption[] = [
  {
    id: 'remove-background',
    ext: 'png',
    family: 'image',
    category: 'refine',
    refinement: 'remove-background',
    label: 'Void Background',
    description: 'Banish the backdrop and keep a transparent PNG.',
  },
  {
    id: 'resize-max',
    ext: 'same',
    family: 'image',
    category: 'refine',
    refinement: 'resize-max',
    label: 'Shrink Sigil',
    description: 'Fit within 1920px on the longest edge without upscaling.',
  },
  {
    id: 'compress',
    ext: 'same',
    family: 'image',
    category: 'refine',
    refinement: 'compress',
    label: 'Lighten Vial',
    description: 'Reduce file weight with smart compression.',
  },
  {
    id: 'strip-metadata',
    ext: 'same',
    family: 'image',
    category: 'refine',
    refinement: 'strip-metadata',
    label: 'Scrub Sigils',
    description: 'Remove hidden EXIF and metadata.',
  },
  {
    id: 'auto-orient',
    ext: 'same',
    family: 'image',
    category: 'refine',
    refinement: 'auto-orient',
    label: 'True North',
    description: 'Fix rotation from camera metadata.',
  },
  {
    id: 'trim-borders',
    ext: 'same',
    family: 'image',
    category: 'refine',
    refinement: 'trim-borders',
    label: 'Trim Frame',
    description: 'Crop empty margins around the image.',
  },
  {
    id: 'grayscale',
    ext: 'same',
    family: 'image',
    category: 'refine',
    refinement: 'grayscale',
    label: 'Ash Tint',
    description: 'Bleach color into monochrome.',
  },
]

export const REFINEMENT_OUTPUT_SUFFIX: Record<ImageRefinementId, string> = {
  'remove-background': 'no-bg',
  'resize-max': 'resized',
  compress: 'compressed',
  'strip-metadata': 'clean',
  'auto-orient': 'oriented',
  'trim-borders': 'trimmed',
  grayscale: 'mono',
}

export function resolveRefinementOutputExt(
  sourceExt: string,
  refinement: ImageRefinementId,
): string {
  const rule = IMAGE_REFINEMENTS.find((option) => option.refinement === refinement)

  if (!rule) {
    throw new Error('That refinement is not in the grimoire yet.')
  }

  if (rule.ext === 'same') {
    return sourceExt === 'jpeg' ? 'jpg' : sourceExt
  }

  return rule.ext
}

export function getImageRefinements(): OutputOption[] {
  return IMAGE_REFINEMENTS.map((option) => ({ ...option }))
}

export function getImageRefinement(refinement: ImageRefinementId): OutputOption | undefined {
  return IMAGE_REFINEMENTS.find((option) => option.refinement === refinement)
}
