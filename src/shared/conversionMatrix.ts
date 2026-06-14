import type { ConversionFamily, OutputOption } from './types'

export interface ConversionRule {
  inputExt: string
  family: ConversionFamily
  outputs: OutputOption[]
}

const imageOutputs = (...extensions: string[]): OutputOption[] =>
  extensions.map((ext) => ({
    ext,
    family: 'image',
    label:
      ext === 'ico'
        ? 'Shortcut Sigil'
        : ext === 'webp'
          ? 'Essence of WebP'
          : `${ext.toUpperCase()} Phial`,
    description: `Distill this image into .${ext}.`,
  }))

const audioOutputs = (...extensions: string[]): OutputOption[] =>
  extensions.map((ext) => ({
    ext,
    family: 'audio',
    label: `${ext.toUpperCase()} Echo`,
    description: `Bottle the sound as .${ext}.`,
  }))

const videoOutputs = (...extensions: string[]): OutputOption[] =>
  extensions.map((ext) => ({
    ext,
    family: 'video',
    label: `${ext.toUpperCase()} Moving Rune`,
    description: `Reforge the moving picture as .${ext}.`,
  }))

const documentOutput = (
  ext: string,
  label: string,
  description: string,
  family: ConversionFamily = 'document',
): OutputOption => ({ ext, label, description, family })

export const CONVERSION_MATRIX: ConversionRule[] = [
  { inputExt: 'png', family: 'image', outputs: imageOutputs('jpg', 'webp', 'avif', 'tiff') },
  { inputExt: 'jpg', family: 'image', outputs: imageOutputs('png', 'webp', 'avif', 'tiff') },
  { inputExt: 'jpeg', family: 'image', outputs: imageOutputs('png', 'webp', 'avif', 'tiff') },
  { inputExt: 'webp', family: 'image', outputs: imageOutputs('png', 'jpg', 'avif', 'tiff') },
  { inputExt: 'avif', family: 'image', outputs: imageOutputs('png', 'jpg', 'webp') },
  { inputExt: 'tiff', family: 'image', outputs: imageOutputs('png', 'jpg', 'webp') },
  {
    inputExt: 'mp4',
    family: 'video',
    outputs: [...videoOutputs('webm', 'mov', 'mkv'), ...audioOutputs('mp3', 'wav', 'm4a')],
  },
  {
    inputExt: 'mov',
    family: 'video',
    outputs: [...videoOutputs('mp4', 'webm', 'mkv'), ...audioOutputs('mp3', 'wav', 'm4a')],
  },
  {
    inputExt: 'mkv',
    family: 'video',
    outputs: [...videoOutputs('mp4', 'webm'), ...audioOutputs('mp3', 'wav', 'm4a')],
  },
  {
    inputExt: 'webm',
    family: 'video',
    outputs: [...videoOutputs('mp4', 'mkv'), ...audioOutputs('mp3', 'wav', 'm4a')],
  },
  { inputExt: 'mp3', family: 'audio', outputs: audioOutputs('wav', 'm4a', 'flac', 'ogg') },
  { inputExt: 'wav', family: 'audio', outputs: audioOutputs('mp3', 'm4a', 'flac', 'ogg') },
  { inputExt: 'm4a', family: 'audio', outputs: audioOutputs('mp3', 'wav', 'flac', 'ogg') },
  { inputExt: 'flac', family: 'audio', outputs: audioOutputs('mp3', 'wav', 'm4a', 'ogg') },
  { inputExt: 'ogg', family: 'audio', outputs: audioOutputs('mp3', 'wav', 'm4a', 'flac') },
  {
    inputExt: 'txt',
    family: 'document',
    outputs: [
      documentOutput('md', 'Markdown Draught', 'Wrap plain text in a markdown vial.'),
      documentOutput('html', 'HTML Scroll', 'Set the text into a simple web scroll.'),
    ],
  },
  {
    inputExt: 'md',
    family: 'document',
    outputs: [
      documentOutput('html', 'HTML Scroll', 'Render markdown into an HTML scroll.'),
      documentOutput('txt', 'Plaintext Dust', 'Strip the markdown sigils down to text.'),
    ],
  },
  {
    inputExt: 'html',
    family: 'document',
    outputs: [documentOutput('txt', 'Plaintext Dust', 'Extract readable text from HTML.')],
  },
  {
    inputExt: 'csv',
    family: 'document',
    outputs: [
      documentOutput('json', 'JSON Crystal', 'Turn rows and columns into structured crystals.'),
      documentOutput('txt', 'Plaintext Dust', 'Flatten table rows into readable text.'),
    ],
  },
  {
    inputExt: 'json',
    family: 'document',
    outputs: [
      documentOutput('txt', 'Plaintext Dust', 'Pretty-print structured data for mortals.'),
      documentOutput('html', 'HTML Scroll', 'Display JSON in a simple web scroll.'),
    ],
  },
  {
    inputExt: 'pdf',
    family: 'pdf',
    outputs: [documentOutput('txt', 'Extracted Ink', 'Pull selectable text from the PDF.', 'pdf')],
  },
]

export const ALLOWED_INPUT_EXTENSIONS = CONVERSION_MATRIX.map((rule) => rule.inputExt).sort()

const OUTPUT_FAMILY_BY_EXT = new Map<string, ConversionFamily>()
for (const rule of CONVERSION_MATRIX) {
  for (const output of rule.outputs) {
    if (!OUTPUT_FAMILY_BY_EXT.has(output.ext)) {
      OUTPUT_FAMILY_BY_EXT.set(output.ext, output.family)
    }
  }
}

export function normalizeExtension(extension: string): string {
  return extension.trim().replace(/^\./, '').toLowerCase()
}

export function getRuleForExtension(extension: string): ConversionRule | undefined {
  const normalized = normalizeExtension(extension)
  return CONVERSION_MATRIX.find((rule) => rule.inputExt === normalized)
}

export function getAllowedOutputs(extension: string): OutputOption[] {
  return getRuleForExtension(extension)?.outputs ?? []
}

export function isAllowedInputExtension(extension: string): boolean {
  return Boolean(getRuleForExtension(extension))
}

export function getOutputFamily(extension: string): ConversionFamily {
  return OUTPUT_FAMILY_BY_EXT.get(normalizeExtension(extension)) ?? 'document'
}
