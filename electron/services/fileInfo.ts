import { stat } from 'node:fs/promises'
import path from 'node:path'

import { getRuleForExtension, isAllowedInputExtension } from '../../src/shared/conversionMatrix'
import type { SourceFile } from '../../src/shared/types'

export async function inspectSourceFile(filePath: string): Promise<SourceFile | null> {
  const ext = path.extname(filePath).replace(/^\./, '').toLowerCase()

  if (!isAllowedInputExtension(ext)) {
    return null
  }

  const fileStat = await stat(filePath)

  if (!fileStat.isFile()) {
    return null
  }

  const rule = getRuleForExtension(ext)

  if (!rule) {
    return null
  }

  return {
    path: filePath,
    name: path.basename(filePath),
    ext,
    size: fileStat.size,
    family: rule.family,
  }
}
