import type { ImageRefinementId } from './imageRefinements'

export type { ImageRefinementId } from './imageRefinements'

export type ConversionFamily = 'image' | 'video' | 'audio' | 'document' | 'pdf'

export type TransmutationCategory = 'distill' | 'refine'

export type TransmutationStatus = 'success' | 'failed'

export type ForgeStatus = 'idle' | 'transmuting' | 'success' | 'error'

export interface OutputOption {
  id: string
  ext: string
  label: string
  description: string
  family: ConversionFamily
  category: TransmutationCategory
  refinement?: ImageRefinementId
}

export interface SourceFile {
  path: string
  name: string
  ext: string
  size: number
  family: ConversionFamily
}

export interface TransmuteRequest {
  sourcePath: string
  outputExt: string
  refinement?: ImageRefinementId
}

export interface GrimoireEntry {
  id: string
  sourcePath: string
  sourceName: string
  outputPath: string
  outputExt: string
  createdAt: number
  status: TransmutationStatus
  error?: string
}

export interface GrimoireEntryWithExistence extends GrimoireEntry {
  outputExists: boolean
  canOpenOutput: boolean
  canRevealOutput: boolean
}

export interface AlchemistryApi {
  pickSource: () => Promise<SourceFile | null>
  inspectDroppedFile: (filePath: string) => Promise<SourceFile | null>
  getPathForFile: (file: File) => string
  transmute: (request: TransmuteRequest) => Promise<GrimoireEntry>
  getGrimoire: () => Promise<GrimoireEntryWithExistence[]>
  openPath: (filePath: string) => Promise<void>
  revealInFolder: (filePath: string) => Promise<void>
}
