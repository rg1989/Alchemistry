import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { GrimoireEntry } from '../../src/shared/types'

const HISTORY_LIMIT = 24

export function getGrimoirePath(userDataPath: string): string {
  return path.join(userDataPath, 'grimoire.json')
}

export async function loadGrimoire(grimoirePath: string): Promise<GrimoireEntry[]> {
  try {
    const raw = await readFile(grimoirePath, 'utf8')
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isGrimoireEntry)
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return []
    }

    throw error
  }
}

export async function saveGrimoire(
  grimoirePath: string,
  entries: GrimoireEntry[],
): Promise<void> {
  await mkdir(path.dirname(grimoirePath), { recursive: true })
  await writeFile(grimoirePath, JSON.stringify(entries.slice(0, HISTORY_LIMIT), null, 2), 'utf8')
}

export async function appendGrimoireEntry(
  grimoirePath: string,
  entry: GrimoireEntry,
): Promise<GrimoireEntry[]> {
  const entries = await loadGrimoire(grimoirePath)
  const nextEntries = [entry, ...entries].slice(0, HISTORY_LIMIT)
  await saveGrimoire(grimoirePath, nextEntries)
  return nextEntries
}

function isGrimoireEntry(value: unknown): value is GrimoireEntry {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<GrimoireEntry>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.sourcePath === 'string' &&
    typeof candidate.sourceName === 'string' &&
    typeof candidate.outputPath === 'string' &&
    typeof candidate.outputExt === 'string' &&
    typeof candidate.createdAt === 'number' &&
    (candidate.status === 'success' || candidate.status === 'failed')
  )
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
