import os from 'node:os'
import path from 'node:path'

interface CreateUniqueOutputPathOptions {
  sourcePath: string
  targetExt: string
  outputDir: string
  exists: (candidate: string) => boolean
  nameSuffix?: string
}

export function getAlchemyOutputDir(homeDir = os.homedir()): string {
  return path.join(homeDir, 'Downloads', 'alchemy')
}

export function createUniqueOutputPath({
  sourcePath,
  targetExt,
  outputDir,
  exists,
  nameSuffix,
}: CreateUniqueOutputPathOptions): string {
  const parsed = path.parse(sourcePath)
  const normalizedExt = targetExt.startsWith('.') ? targetExt : `.${targetExt}`
  const baseName = nameSuffix ? `${parsed.name} ${nameSuffix}` : parsed.name
  const firstCandidate = path.join(outputDir, `${baseName}${normalizedExt}`)

  if (!exists(firstCandidate)) {
    return firstCandidate
  }

  let suffix = 2
  let candidate = path.join(outputDir, `${baseName} ${suffix}${normalizedExt}`)

  while (exists(candidate)) {
    suffix += 1
    candidate = path.join(outputDir, `${baseName} ${suffix}${normalizedExt}`)
  }

  return candidate
}
