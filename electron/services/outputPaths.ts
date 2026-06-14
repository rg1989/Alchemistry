import os from 'node:os'
import path from 'node:path'

interface CreateUniqueOutputPathOptions {
  sourcePath: string
  targetExt: string
  outputDir: string
  exists: (candidate: string) => boolean
}

export function getAlchemyOutputDir(homeDir = os.homedir()): string {
  return path.join(homeDir, 'Downloads', 'alchemy')
}

export function createUniqueOutputPath({
  sourcePath,
  targetExt,
  outputDir,
  exists,
}: CreateUniqueOutputPathOptions): string {
  const parsed = path.parse(sourcePath)
  const normalizedExt = targetExt.startsWith('.') ? targetExt : `.${targetExt}`
  const firstCandidate = path.join(outputDir, `${parsed.name}${normalizedExt}`)

  if (!exists(firstCandidate)) {
    return firstCandidate
  }

  let suffix = 2
  let candidate = path.join(outputDir, `${parsed.name} ${suffix}${normalizedExt}`)

  while (exists(candidate)) {
    suffix += 1
    candidate = path.join(outputDir, `${parsed.name} ${suffix}${normalizedExt}`)
  }

  return candidate
}
