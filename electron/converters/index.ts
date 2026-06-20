import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { marked } from 'marked'
import { PDFParse } from 'pdf-parse'

import { getAllowedOutputs, getRuleForExtension } from '../../src/shared/conversionMatrix'
import { getImageRefinement, resolveRefinementOutputExt } from '../../src/shared/imageRefinements'
import type { ImageRefinementId } from '../../src/shared/imageRefinements'
import { processImage } from './image'

const require = createRequire(import.meta.url)
const rawFfmpegPath = require('ffmpeg-static') as string | null
// In a packaged build the binary is unpacked from app.asar -> app.asar.unpacked.
const ffmpegPath = rawFfmpegPath
  ? rawFfmpegPath.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep)
  : null

interface ConvertFileOptions {
  sourcePath: string
  outputPath: string
  outputExt: string
  refinement?: ImageRefinementId
}

export async function convertFile({
  sourcePath,
  outputPath,
  outputExt,
  refinement,
}: ConvertFileOptions): Promise<void> {
  const sourceExt = path.extname(sourcePath).replace(/^\./, '').toLowerCase()
  const normalizedOutputExt = outputExt.replace(/^\./, '').toLowerCase()
  const rule = getRuleForExtension(sourceExt)

  if (!rule) {
    throw new Error('This reagent has no known transmutations.')
  }

  if (refinement) {
    if (rule.family !== 'image') {
      throw new Error('Only image reagents can be refined.')
    }

    const refinementOption = getImageRefinement(refinement)

    if (!refinementOption) {
      throw new Error('That refinement is not in the grimoire yet.')
    }

    const expectedExt = resolveRefinementOutputExt(sourceExt, refinement)

    if (normalizedOutputExt !== expectedExt) {
      throw new Error(`Refinement .${refinement} expects a .${expectedExt} artifact.`)
    }

    await processImage({
      sourcePath,
      outputPath,
      outputExt: normalizedOutputExt,
      sourceExt,
      refinement,
    })
    return
  }

  const isOutputAllowed = getAllowedOutputs(sourceExt).some(
    (output) => output.ext === normalizedOutputExt,
  )

  if (!isOutputAllowed) {
    throw new Error(`.${sourceExt} cannot be transmuted into .${normalizedOutputExt}.`)
  }

  if (rule.family === 'image') {
    await processImage({
      sourcePath,
      outputPath,
      outputExt: normalizedOutputExt,
      sourceExt,
    })
    return
  }

  if (rule.family === 'audio' || rule.family === 'video') {
    await convertMedia(sourcePath, outputPath)
    return
  }

  if (rule.family === 'pdf') {
    await convertPdf(sourcePath, outputPath)
    return
  }

  await convertDocument(sourcePath, outputPath, sourceExt, normalizedOutputExt)
}

async function convertMedia(sourcePath: string, outputPath: string): Promise<void> {
  if (!ffmpegPath) {
    throw new Error('The media crucible is missing its FFmpeg catalyst.')
  }

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, ['-y', '-i', sourcePath, outputPath])
    let stderr = ''

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })

    ffmpeg.on('error', reject)
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}.`))
      }
    })
  })
}

async function convertPdf(sourcePath: string, outputPath: string): Promise<void> {
  const parser = new PDFParse({ data: await readFile(sourcePath) })
  const result = await parser.getText()
  await writeFile(outputPath, result.text.trimEnd(), 'utf8')
  await parser.destroy()
}

async function convertDocument(
  sourcePath: string,
  outputPath: string,
  sourceExt: string,
  outputExt: string,
): Promise<void> {
  const content = await readFile(sourcePath, 'utf8')
  const converted = await transformDocument(content, sourceExt, outputExt)
  await writeFile(outputPath, converted, 'utf8')
}

async function transformDocument(
  content: string,
  sourceExt: string,
  outputExt: string,
): Promise<string> {
  if (sourceExt === 'md' && outputExt === 'html') {
    return wrapHtml(await marked.parse(content))
  }

  if (sourceExt === 'txt' && outputExt === 'html') {
    return wrapHtml(`<pre>${escapeHtml(content)}</pre>`)
  }

  if (sourceExt === 'txt' && outputExt === 'md') {
    return content
  }

  if (sourceExt === 'md' && outputExt === 'txt') {
    return stripMarkdown(content)
  }

  if (sourceExt === 'html' && outputExt === 'txt') {
    return stripHtml(content)
  }

  if (sourceExt === 'csv' && outputExt === 'json') {
    return JSON.stringify(csvToJson(content), null, 2)
  }

  if (sourceExt === 'csv' && outputExt === 'txt') {
    return content
  }

  if (sourceExt === 'json' && outputExt === 'txt') {
    return JSON.stringify(JSON.parse(content), null, 2)
  }

  if (sourceExt === 'json' && outputExt === 'html') {
    return wrapHtml(`<pre>${escapeHtml(JSON.stringify(JSON.parse(content), null, 2))}</pre>`)
  }

  throw new Error(`The ${sourceExt} to ${outputExt} recipe is not in the grimoire yet.`)
}

function csvToJson(content: string): Record<string, string>[] {
  const rows = parseCsv(content).filter((row) => row.some((cell) => cell.length > 0))
  const headers = rows.shift()

  if (!headers) {
    return []
  }

  return rows.map((row) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header || `column_${index + 1}`] = row[index] ?? ''
      return record
    }, {}),
  )
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const nextChar = content[index + 1]

    if (char === '"' && nextChar === '"') {
      cell += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(cell.trim())
      cell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }

      row.push(cell.trim())
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell.trim())
  rows.push(row)
  return rows
}

function wrapHtml(body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Alchemistry Artifact</title>
  </head>
  <body>
${body}
  </body>
</html>
`
}

function stripHtml(content: string): string {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>#-]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function escapeHtml(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
