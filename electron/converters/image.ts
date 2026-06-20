import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { removeBackground } from '@imgly/background-removal-node'
import sharp from 'sharp'

import { resolveRefinementOutputExt } from '../../src/shared/imageRefinements'
import type { ImageRefinementId } from '../../src/shared/imageRefinements'

const require = createRequire(import.meta.url)

const MAX_DIMENSION = 1920
const COMPRESS_QUALITY = 80

interface ProcessImageOptions {
  sourcePath: string
  outputPath: string
  outputExt: string
  sourceExt: string
  refinement?: ImageRefinementId
}

export async function processImage({
  sourcePath,
  outputPath,
  outputExt,
  sourceExt,
  refinement,
}: ProcessImageOptions): Promise<void> {
  if (!refinement) {
    await convertImageFormat(sourcePath, outputPath, outputExt)
    return
  }

  const resolvedExt = resolveRefinementOutputExt(sourceExt, refinement)

  switch (refinement) {
    case 'remove-background':
      await removeImageBackground(sourcePath, outputPath)
      return
    case 'resize-max':
      await saveImage(
        sharp(sourcePath).rotate().resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        }),
        outputPath,
        resolvedExt,
      )
      return
    case 'compress':
      await saveImage(sharp(sourcePath).rotate(), outputPath, resolvedExt, {
        aggressive: true,
      })
      return
    case 'strip-metadata':
      await saveImage(sharp(sourcePath).rotate(), outputPath, resolvedExt)
      return
    case 'auto-orient':
      await saveImage(sharp(sourcePath).rotate(), outputPath, resolvedExt)
      return
    case 'trim-borders':
      await saveImage(sharp(sourcePath).rotate().trim(), outputPath, resolvedExt)
      return
    case 'grayscale':
      await saveImage(sharp(sourcePath).rotate().grayscale(), outputPath, resolvedExt)
      return
    default:
      throw new Error('That refinement is not in the grimoire yet.')
  }
}

async function convertImageFormat(
  sourcePath: string,
  outputPath: string,
  outputExt: string,
): Promise<void> {
  await saveImage(sharp(sourcePath), outputPath, outputExt)
}

async function removeImageBackground(sourcePath: string, outputPath: string): Promise<void> {
  const blob = await removeBackground(sourcePath, {
    publicPath: getBackgroundRemovalPublicPath(),
    model: 'medium',
    output: {
      format: 'image/png',
      quality: 0.9,
    },
  })

  await writeFile(outputPath, Buffer.from(await blob.arrayBuffer()))
}

function getBackgroundRemovalPublicPath(): string {
  const entryPath = require.resolve('@imgly/background-removal-node')
  const distPath = path.dirname(unpackAsarPath(entryPath))
  return pathToFileURL(`${distPath}${path.sep}`).href
}

function unpackAsarPath(filePath: string): string {
  return filePath.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`)
}

interface SaveImageOptions {
  aggressive?: boolean
}

async function saveImage(
  pipeline: sharp.Sharp,
  outputPath: string,
  outputExt: string,
  options: SaveImageOptions = {},
): Promise<void> {
  const format = outputExt === 'jpg' ? 'jpeg' : outputExt
  const quality = options.aggressive ? COMPRESS_QUALITY : undefined

  await pipeline
    .toFormat(format as keyof sharp.FormatEnum, getFormatOptions(format, quality))
    .toFile(outputPath)
}

function getFormatOptions(
  format: string,
  quality = COMPRESS_QUALITY,
): sharp.JpegOptions | sharp.WebpOptions | sharp.PngOptions | sharp.AvifOptions | sharp.TiffOptions | sharp.HeifOptions {
  if (format === 'jpeg') {
    return { quality, mozjpeg: true }
  }

  if (format === 'webp') {
    return { quality }
  }

  if (format === 'png') {
    return { compressionLevel: 9, adaptiveFiltering: true }
  }

  if (format === 'avif') {
    return { quality }
  }

  if (format === 'tiff') {
    return { quality }
  }

  return {}
}
